// LAN device discovery.
//
// Browsers can't scan the local network — but a desktop (Node) process can.
// We discover three families and expose a single deduplicated registry:
//   • Google Cast (Chromecast / Google Home / Nest) — mDNS `_googlecast._tcp`
//   • AirPlay (Apple TV / HomePod / "Siri" speakers)  — mDNS `_airplay._tcp` / `_raop._tcp`
//   • Amazon Alexa / Echo                              — mDNS `_amzn-wplay._tcp` (best-effort)
//   • DLNA / UPnP MediaRenderers (smart TVs, speakers) — SSDP MediaRenderer
//
// `capabilities.cast` marks whether we can actually PLAY audio to the device:
// true for Chromecast and DLNA (we implement those), false for AirPlay/Alexa
// (shown so the user knows they're there, but local control isn't implemented —
// AirPlay 2 needs pairing/encryption, Alexa needs a cloud Skill).

const EventEmitter = require('events');
const http = require('http');
const https = require('https');
const net = require('net');
const { Bonjour } = require('bonjour-service');
const { Client: SsdpClient } = require('node-ssdp');

const SSDP_TARGET = 'urn:schemas-upnp-org:device:MediaRenderer:1';
const SSDP_INTERVAL_MS = 30_000;   // re-search periodically (SSDP is request/response)
const DLNA_TTL_MS = 120_000;       // forget a DLNA renderer not seen for this long
const EMIT_DEBOUNCE_MS = 300;
// bonjour-service never expires mDNS records on its own, so we actively probe
// each device's TCP port and evict ones that stop answering. (A silently-gone
// Chromecast/AirPlay device otherwise lingers in the list until app restart.)
const LIVENESS_INTERVAL_MS = 30_000;
const MDNS_TTL_MS = 95_000;        // ~3 missed probes → forget the device
const PROBE_TIMEOUT_MS = 1_500;

/** Resolve true if a TCP connection to host:port succeeds quickly. */
function tcpPing(host, port, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (ok) => { if (done) return; done = true; try { sock.destroy(); } catch { /* ignore */ } resolve(ok); };
    const sock = net.connect({ host, port });
    sock.setTimeout(timeoutMs, () => finish(false));
    sock.once('connect', () => finish(true));
    sock.once('error', () => finish(false));
  });
}

function firstIpv4(addresses) {
  if (!Array.isArray(addresses)) return null;
  return addresses.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a)) || null;
}

/** Strip the "AABBCCDDEEFF@" hardware-address prefix RAOP names carry. */
function cleanRaopName(name) {
  const at = String(name || '').indexOf('@');
  return at >= 0 ? name.slice(at + 1) : name;
}

function fetchText(url, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    let lib;
    try { lib = url.startsWith('https') ? https : http; } catch { reject(new Error('bad url')); return; }
    const req = lib.get(url, (res) => {
      if (!res.statusCode || res.statusCode >= 400) { res.resume(); reject(new Error('http ' + res.statusCode)); return; }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { body += c; if (body.length > 256 * 1024) req.destroy(); });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error('timeout')));
  });
}

class DeviceDiscovery extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();      // id -> device
    this.bonjour = null;
    this.browsers = [];
    this.ssdp = null;
    this.ssdpTimer = null;
    this.livenessTimer = null;
    this.emitTimer = null;
    this.seenDlna = new Map();     // location -> lastSeen ts
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._startBonjour();
    this._startSsdp();
    this._startLiveness();
  }

  _startLiveness() {
    this.livenessTimer = setInterval(() => this._sweepLiveness(), LIVENESS_INTERVAL_MS);
    if (this.livenessTimer.unref) this.livenessTimer.unref();
  }

  // Probe each probeable mDNS device; refresh lastSeen on success, evict the
  // ones that have been unreachable past MDNS_TTL_MS.
  _sweepLiveness() {
    const probeable = [...this.devices.values()].filter(
      (d) => (d.kind === 'chromecast' || d.kind === 'airplay') && d.host && d.port,
    );
    Promise.all(
      probeable.map((d) => tcpPing(d.host, d.port, PROBE_TIMEOUT_MS).then((ok) => {
        if (ok) { const cur = this.devices.get(d.id); if (cur) cur.lastSeen = Date.now(); }
      })),
    ).then(() => {
      const now = Date.now();
      let changed = false;
      for (const [id, d] of this.devices) {
        if ((d.kind === 'chromecast' || d.kind === 'airplay') && d.host && d.port) {
          if (now - (d.lastSeen || 0) > MDNS_TTL_MS) { this.devices.delete(id); changed = true; }
        }
      }
      if (changed) this._scheduleEmit();
    }).catch(() => {});
  }

  _startBonjour() {
    try {
      this.bonjour = new Bonjour();
    } catch (e) {
      this.bonjour = null;
      return;
    }
    const browse = (type, handler) => {
      try {
        const b = this.bonjour.find({ type, protocol: 'tcp' });
        b.on('up', (svc) => { try { handler(svc); } catch { /* ignore */ } });
        b.on('down', (svc) => this._onServiceDown(svc));
        this.browsers.push(b);
      } catch { /* ignore unsupported type */ }
    };

    browse('googlecast', (svc) => this._upsertCast(svc));
    browse('airplay', (svc) => this._upsertAirplay(svc, 'airplay'));
    browse('raop', (svc) => this._upsertAirplay(svc, 'raop'));
    // Amazon Echo (best-effort — Echo's mDNS advertising is inconsistent).
    browse('amzn-wplay', (svc) => this._upsertAlexa(svc));
  }

  _startSsdp() {
    try {
      this.ssdp = new SsdpClient();
      this.ssdp.on('response', (headers) => {
        const loc = headers.LOCATION || headers.Location;
        if (loc) this._onSsdpRenderer(loc);
      });
    } catch {
      this.ssdp = null;
      return;
    }
    const search = () => { try { this.ssdp.search(SSDP_TARGET); } catch { /* ignore */ } };
    search();
    this.ssdpTimer = setInterval(() => {
      search();
      this._pruneDlna();
    }, SSDP_INTERVAL_MS);
    if (this.ssdpTimer.unref) this.ssdpTimer.unref();
  }

  // ── Upserts per family ──────────────────────────────────────────────────────

  _upsertCast(svc) {
    const host = firstIpv4(svc.addresses) || svc.host;
    if (!host) return;
    const txt = svc.txt || {};
    const id = `chromecast:${host}`;
    this._set(id, {
      id,
      kind: 'chromecast',
      name: txt.fn || svc.name || 'Chromecast',
      host,
      port: svc.port || 8009,
      model: txt.md || 'Google Cast',
      location: null,
      capabilities: { cast: true },
    });
  }

  _upsertAirplay(svc, sub) {
    const host = firstIpv4(svc.addresses) || svc.host;
    if (!host) return;
    const txt = svc.txt || {};
    const id = `airplay:${host}`; // merge airplay + raop for the same host
    const name = sub === 'raop' ? cleanRaopName(svc.name) : (svc.name || 'AirPlay device');
    const existing = this.devices.get(id);
    this._set(id, {
      id,
      kind: 'airplay',
      name: existing?.name || name || 'AirPlay device',
      host,
      port: svc.port || 7000,
      model: txt.model || existing?.model || 'AirPlay',
      location: null,
      capabilities: { cast: false }, // AirPlay 2 needs pairing/encryption — not implemented
    });
  }

  _upsertAlexa(svc) {
    const host = firstIpv4(svc.addresses) || svc.host;
    if (!host) return;
    const id = `alexa:${host}`;
    this._set(id, {
      id,
      kind: 'alexa',
      name: svc.name || 'Amazon Echo',
      host,
      port: svc.port || 0,
      model: 'Amazon Alexa',
      location: null,
      capabilities: { cast: false }, // needs a published Alexa Skill (AVS) — not local
    });
  }

  async _onSsdpRenderer(location) {
    this.seenDlna.set(location, Date.now());
    const id = `dlna:${location}`;
    if (this.devices.has(id)) { this._touch(id); return; }
    // Fetch the device description to get a friendly name + confirm it's a renderer.
    let name = 'Media Renderer';
    let model = 'DLNA';
    try {
      const xml = await fetchText(location);
      const fn = /<friendlyName>([^<]+)<\/friendlyName>/i.exec(xml);
      const mn = /<modelName>([^<]+)<\/modelName>/i.exec(xml);
      if (fn) name = fn[1].trim();
      if (mn) model = mn[1].trim();
    } catch { /* keep defaults */ }
    let host = null;
    try { host = new URL(location).hostname; } catch { /* ignore */ }
    this._set(id, {
      id,
      kind: 'dlna',
      name,
      host,
      port: null,
      model,
      location,
      capabilities: { cast: true },
    });
  }

  // ── Registry helpers ──────────────────────────────────────────────────────

  _set(id, device) {
    const prev = this.devices.get(id);
    this.devices.set(id, { ...prev, ...device, lastSeen: Date.now() });
    // Only emit when something materially changed (avoid churn from re-announces).
    if (!prev || prev.name !== device.name || prev.host !== device.host) this._scheduleEmit();
  }

  _touch(id) {
    const d = this.devices.get(id);
    if (d) d.lastSeen = Date.now();
  }

  _onServiceDown(svc) {
    const host = firstIpv4(svc.addresses) || svc.host;
    if (!host) return;
    let removed = false;
    for (const key of [`chromecast:${host}`, `airplay:${host}`, `alexa:${host}`]) {
      if (this.devices.delete(key)) removed = true;
    }
    if (removed) this._scheduleEmit();
  }

  _pruneDlna() {
    const now = Date.now();
    let changed = false;
    for (const [id, d] of this.devices) {
      if (d.kind === 'dlna' && now - (d.lastSeen || 0) > DLNA_TTL_MS) {
        this.devices.delete(id);
        changed = true;
      }
    }
    if (changed) this._scheduleEmit();
  }

  _scheduleEmit() {
    if (this.emitTimer) return;
    this.emitTimer = setTimeout(() => {
      this.emitTimer = null;
      this.emit('change', this.list());
    }, EMIT_DEBOUNCE_MS);
    if (this.emitTimer.unref) this.emitTimer.unref();
  }

  /** Trigger a fresh search (mDNS is continuous; this re-pokes SSDP). */
  rescan() {
    try { this.ssdp && this.ssdp.search(SSDP_TARGET); } catch { /* ignore */ }
  }

  list() {
    return [...this.devices.values()]
      .map((d) => ({
        id: d.id, name: d.name, kind: d.kind, host: d.host, port: d.port,
        model: d.model, capabilities: d.capabilities,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  get(id) {
    return this.devices.get(id) || null;
  }

  stop() {
    this.running = false;
    if (this.emitTimer) { clearTimeout(this.emitTimer); this.emitTimer = null; }
    if (this.ssdpTimer) { clearInterval(this.ssdpTimer); this.ssdpTimer = null; }
    if (this.livenessTimer) { clearInterval(this.livenessTimer); this.livenessTimer = null; }
    for (const b of this.browsers) { try { b.stop && b.stop(); } catch { /* ignore */ } }
    this.browsers = [];
    try { this.bonjour && this.bonjour.destroy(); } catch { /* ignore */ }
    this.bonjour = null;
    try { this.ssdp && this.ssdp.stop(); } catch { /* ignore */ }
    this.ssdp = null;
  }
}

module.exports = { DeviceDiscovery };
