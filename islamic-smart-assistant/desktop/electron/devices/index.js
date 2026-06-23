// Devices orchestrator — wires discovery + LAN media server + cast control and
// exposes a small high-level API the Electron main process bridges over IPC.

const { MediaServer } = require('./mediaServer');
const { DeviceDiscovery } = require('./discovery');
const { CastController } = require('./cast');

const CONTENT_TYPES = {
  mp3: 'audio/mpeg', m4a: 'audio/mp4', mp4: 'audio/mp4', aac: 'audio/aac',
  ogg: 'audio/ogg', oga: 'audio/ogg', wav: 'audio/wav', flac: 'audio/flac', webm: 'audio/webm',
};

function contentTypeFor(url) {
  const clean = String(url || '').split('?')[0].split('#')[0].toLowerCase();
  const ext = clean.slice(clean.lastIndexOf('.') + 1);
  return CONTENT_TYPES[ext] || 'audio/mpeg';
}

class DeviceManager {
  constructor() {
    this.media = new MediaServer();
    this.discovery = new DeviceDiscovery();
    this.cast = new CastController();
    this.started = false;
  }

  /**
   * @param {object} opts
   * @param {string[]} opts.publicDirs Directories the LAN media server may serve (the web `public/`).
   */
  async init(opts = {}) {
    if (this.started) return;
    this.started = true;
    try { await this.media.start(opts.publicDirs || []); } catch { /* server optional; CDN URLs still work */ }
    this.discovery.start();
  }

  onChange(cb) {
    this.discovery.on('change', cb);
    return () => this.discovery.off('change', cb);
  }

  list() { return this.discovery.list(); }

  rescan() { this.discovery.rescan(); return this.list(); }

  mediaBase() { return this.media.baseUrl(); }

  /**
   * Resolve a play `source` into a URL the DEVICE can fetch.
   *   { kind:'lan',  path:'/audio/azan/makkah.mp3' }  → http://<lan-ip-on-device-subnet>:<port>/audio/azan/makkah.mp3
   *   { kind:'url',  url:'https://cdn.islamic.network/...' } → used as-is (already public)
   */
  _resolveUrl(source, device) {
    if (!source) throw new Error('No audio source given.');
    if (source.kind === 'url' && source.url) return source.url;
    if (source.kind === 'lan' && source.path) {
      const url = this.media.urlForDevice(source.path, device && device.host);
      if (!url) throw new Error('The local media server isn’t available, so bundled audio can’t be cast. Restart the app and try again.');
      return url;
    }
    throw new Error('Invalid audio source.');
  }

  async play({ deviceId, source, title }) {
    const device = this.discovery.get(deviceId);
    if (!device) throw new Error('That device is no longer available. Rescan and try again.');
    const url = this._resolveUrl(source, device);
    const t = title || (source && source.title);
    try {
      return await this.cast.play(device, url, { title: t, contentType: contentTypeFor(url) });
    } catch (e) {
      // If a bundled (LAN) file couldn't be reached by the device (firewall, wrong
      // subnet, server down) but the caller gave a public fallback, retry with it.
      if (source && source.fallbackUrl && source.kind === 'lan') {
        return this.cast.play(device, source.fallbackUrl, { title: t, contentType: contentTypeFor(source.fallbackUrl) });
      }
      throw e;
    }
  }

  stop({ deviceId }) { return this.cast.stop(deviceId); }

  setVolume({ deviceId, level }) { return this.cast.setVolume(deviceId, level); }

  isActive(deviceId) { return this.cast.isActive(deviceId); }

  async shutdown() {
    this.started = false;
    try { await this.cast.stopAll(); } catch { /* ignore */ }
    try { this.discovery.stop(); } catch { /* ignore */ }
    try { await this.media.close(); } catch { /* ignore */ }
  }
}

module.exports = { DeviceManager };
