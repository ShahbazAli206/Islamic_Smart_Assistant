// LAN media server.
//
// A Cast device (Chromecast / DLNA renderer) fetches and streams the media file
// ITSELF, so it must be able to reach the URL we hand it over the local network.
// The app's bundled azan files live on disk (not on a public URL), so we serve
// them from a tiny HTTP server bound to this machine's LAN IP. The Chromecast on
// the same Wi-Fi then fetches e.g. http://192.168.1.5:<port>/audio/azan/makkah.mp3.
//
// Public CDN recitations (cdn.islamic.network) are already reachable by the
// device, so those are handed over directly and never touch this server.

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');

const MIME = {
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.mp4': 'audio/mp4',
  '.aac': 'audio/aac',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.webm': 'audio/webm',
};

// Interface names that are usually virtual adapters a Cast device can't reach.
const VIRTUAL_IFACE = /(vethernet|vmware|virtualbox|hyper-?v|default switch|wsl|loopback|tailscale|zerotier|tun|tap|docker|bridge)/i;

/**
 * Pick the best LAN IPv4 for this machine. A Cast device must be able to reach
 * it, so we prefer real Wi-Fi/Ethernet adapters on common home subnets and
 * deprioritise virtual adapters (Hyper-V/WSL/VMware/Docker), whose 172.x/etc.
 * addresses a Chromecast on your Wi-Fi can't see.
 */
function listLanIps() {
  const ifaces = os.networkInterfaces();
  const out = [];
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family !== 'IPv4' || ni.internal) continue;
      const ip = ni.address;
      let score = 0;
      if (/^192\.168\./.test(ip)) score += 30;
      else if (/^10\./.test(ip)) score += 20;
      else if (/^172\.(1[6-9]|2\d|3[01])\./.test(ip)) score += 10;
      if (VIRTUAL_IFACE.test(name)) score -= 50;       // strongly avoid virtual adapters
      if (/(wi-?fi|wlan|wireless|ethernet|en0|eth)/i.test(name)) score += 5;
      out.push({ ip, name, score, netmask: ni.netmask || '255.255.255.0' });
    }
  }
  return out.sort((a, b) => b.score - a.score);
}

function getLanIp() {
  const ranked = listLanIps();
  return ranked.length ? ranked[0].ip : '127.0.0.1';
}

function ipToInt(ip) {
  const p = String(ip || '').split('.');
  if (p.length !== 4) return null;
  return ((+p[0] << 24) | (+p[1] << 16) | (+p[2] << 8) | +p[3]) >>> 0;
}

/** Pick the local IP on the same subnet as `deviceHost` (so the device can route
 *  to us), falling back to the best-ranked LAN IP. */
function lanIpForDevice(deviceHost) {
  const ranked = listLanIps();
  const dev = ipToInt(deviceHost);
  if (dev != null) {
    for (const c of ranked) {
      const mask = ipToInt(c.netmask);
      const ip = ipToInt(c.ip);
      if (mask != null && ip != null && (ip & mask) === (dev & mask)) return c.ip;
    }
  }
  return ranked.length ? ranked[0].ip : '127.0.0.1';
}

class MediaServer {
  constructor() {
    this.server = null;
    this.port = 0;
    this.ip = '127.0.0.1';
    this.roots = []; // directories we're allowed to serve from
  }

  /**
   * Start the server.
   * @param {string[]} roots Absolute directories whose files may be served.
   * @returns {Promise<{ip:string, port:number, base:string}>}
   */
  start(roots) {
    this.roots = (roots || []).filter((r) => r && fs.existsSync(r)).map((r) => path.resolve(r));
    return new Promise((resolve, reject) => {
      if (this.server) {
        resolve(this.info());
        return;
      }
      const server = http.createServer((req, res) => this._handle(req, res));
      server.on('error', reject);
      // Bind to all interfaces so LAN devices can reach us; ephemeral port.
      server.listen(0, '0.0.0.0', () => {
        this.server = server;
        this.port = server.address().port;
        this.ip = getLanIp();
        resolve(this.info());
      });
    });
  }

  info() {
    return { ip: this.ip, port: this.port, base: `http://${this.ip}:${this.port}` };
  }

  /** Absolute base URL a LAN device can fetch from, e.g. http://192.168.1.5:51234 */
  baseUrl() {
    return this.server ? `http://${this.ip}:${this.port}` : null;
  }

  _encodePath(relPath) {
    const clean = String(relPath || '').replace(/^\/+/, '');
    return '/' + clean.split('/').map(encodeURIComponent).join('/');
  }

  /** Build a full LAN URL for a public-relative path like '/audio/azan/makkah.mp3'. */
  urlFor(relPath) {
    const base = this.baseUrl();
    if (!base) return null;
    return base + this._encodePath(relPath);
  }

  /** Like urlFor, but choose the local IP on the SAME subnet as `deviceHost` so a
   *  Chromecast on a different NIC/subnet can still reach us. */
  urlForDevice(relPath, deviceHost) {
    if (!this.server) return null;
    const ip = deviceHost ? lanIpForDevice(deviceHost) : this.ip;
    return `http://${ip}:${this.port}` + this._encodePath(relPath);
  }

  /** Resolve a request path to a real file inside one of our roots (or null). */
  _resolve(urlPath) {
    let rel;
    try {
      rel = decodeURIComponent(urlPath.split('?')[0]);
    } catch {
      return null;
    }
    // Normalize and reject path traversal.
    const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, '').replace(/^[/\\]+/, '');
    for (const root of this.roots) {
      const candidate = path.resolve(root, safe);
      if (candidate === root || candidate.startsWith(root + path.sep)) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
      }
    }
    return null;
  }

  _handle(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405); res.end(); return;
    }
    const file = this._resolve(req.url || '/');
    if (!file) { res.writeHead(404); res.end('Not found'); return; }

    const stat = fs.statSync(file);
    const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    const total = stat.size;
    const range = req.headers.range;

    // Range request (seek/partial) — many media receivers require it.
    if (range) {
      const m = /bytes=(\d*)-(\d*)/.exec(range);
      let start = m && m[1] ? parseInt(m[1], 10) : 0;
      let end = m && m[2] ? parseInt(m[2], 10) : total - 1;
      if (Number.isNaN(start) || start < 0) start = 0;
      if (Number.isNaN(end) || end >= total) end = total - 1;
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${total}` }); res.end(); return; }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Cache-Control': 'no-cache',
      });
      if (req.method === 'HEAD') { res.end(); return; }
      const rs = fs.createReadStream(file, { start, end });
      rs.on('error', () => res.destroy()); // a mid-stream read error must not crash the process
      rs.pipe(res);
      return;
    }

    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': total,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-cache',
    });
    if (req.method === 'HEAD') { res.end(); return; }
    const rs = fs.createReadStream(file);
    rs.on('error', () => res.destroy());
    rs.pipe(res);
  }

  close() {
    return new Promise((resolve) => {
      if (!this.server) { resolve(); return; }
      this.server.close(() => { this.server = null; resolve(); });
      this.server = null;
    });
  }
}

module.exports = { MediaServer, getLanIp, listLanIps };
