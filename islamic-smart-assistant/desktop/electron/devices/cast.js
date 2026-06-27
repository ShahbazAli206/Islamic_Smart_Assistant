// Cast control — actually plays audio on a discovered device.
//
//   • Chromecast / Google Home / Nest → castv2 (Default Media Receiver)
//   • DLNA / UPnP MediaRenderer        → UPnP AVTransport (SetAVTransportURI + Play)
//   • AirPlay / Alexa                  → not supported locally (clear error)
//
// We keep one live session per device so we can stop / change volume later, and
// serialise play/stop/volume per device with a tiny async mutex so two quick
// calls can't leave an orphaned, un-stoppable connection behind.

let Client = null, DefaultMediaReceiver = null, MediaRendererClient = null;
try { ({ Client, DefaultMediaReceiver } = require('castv2-client')); } catch (e) { console.warn('[cast] castv2-client unavailable — Chromecast disabled:', e.message); }
try { MediaRendererClient = require('upnp-mediarenderer-client'); } catch (e) { console.warn('[cast] upnp-mediarenderer-client unavailable — DLNA disabled:', e.message); }

const CONNECT_TIMEOUT_MS = 12_000;

function withTimeout(promise, ms, label) {
  let t;
  const guard = new Promise((_, reject) => { t = setTimeout(() => reject(new Error(label || 'timeout')), ms); });
  return Promise.race([promise, guard]).finally(() => clearTimeout(t));
}

class CastController {
  constructor() {
    this.sessions = new Map(); // deviceId -> { kind, client, player }
    this.locks = new Map();    // deviceId -> tail promise (per-device serialisation)
  }

  /** Run `fn` after any pending op for this device settles (per-device mutex). */
  _chain(id, fn) {
    const prev = this.locks.get(id) || Promise.resolve();
    const run = prev.then(fn, fn); // run regardless of how the previous op settled
    this.locks.set(id, run.then(() => {}, () => {}));
    return run;
  }

  /**
   * Play a media URL on a device.
   * @param {object} device  registry device ({ id, kind, host, location, capabilities })
   * @param {string} url     a URL the DEVICE can fetch (LAN media-server or public CDN)
   * @param {object} meta    { title, contentType }
   */
  async play(device, url, meta = {}) {
    if (!device) throw new Error('Unknown device.');
    if (!device.capabilities || !device.capabilities.cast) {
      throw new Error(
        device.kind === 'airplay'
          ? 'AirPlay devices are shown but casting to them isn’t supported yet (AirPlay 2 needs device pairing). Use a Chromecast/Google Home, a DLNA speaker, or Bluetooth.'
          : device.kind === 'alexa'
          ? 'Amazon Alexa/Echo can’t be played to over the local network — it needs a published Alexa Skill. Use a Chromecast/Google Home, a DLNA speaker, or Bluetooth.'
          : 'This device can’t be cast to.',
      );
    }
    const title = meta.title || 'Noor — Islamic Assistant';
    const contentType = meta.contentType || 'audio/mpeg';
    return this._chain(device.id, () => this._doPlay(device, url, title, contentType));
  }

  async _doPlay(device, url, title, contentType) {
    // Tear down any existing session for this device first (direct, not via the
    // public stop() — we already hold the lock).
    await this._teardown(device.id).catch(() => {});

    if (device.kind === 'chromecast') {
      if (!Client) throw new Error('Chromecast support is unavailable (castv2-client failed to load).');
      const session = await this._chromecastPlay(device.host, url, title, contentType);
      this.sessions.set(device.id, { kind: 'chromecast', ...session });
      return { ok: true };
    }
    if (device.kind === 'dlna') {
      if (!MediaRendererClient) throw new Error('DLNA support is unavailable (upnp-mediarenderer-client failed to load).');
      const client = await this._dlnaPlay(device.location, url, title, contentType);
      this.sessions.set(device.id, { kind: 'dlna', client });
      return { ok: true };
    }
    throw new Error('Unsupported device type.');
  }

  _chromecastPlay(host, url, title, contentType) {
    return new Promise((resolve, reject) => {
      const client = new Client();
      let settled = false;
      let timer = null;
      const fail = (e) => {
        if (settled) return; settled = true;
        if (timer) clearTimeout(timer);
        try { client.close(); } catch { /* ignore */ } // ALWAYS close so the TLS socket + heartbeat don't leak
        reject(e instanceof Error ? e : new Error(String(e)));
      };
      const succeed = (val) => {
        if (settled) return; settled = true;
        if (timer) clearTimeout(timer);
        resolve(val);
      };
      timer = setTimeout(
        () => fail(new Error('Could not connect to the Chromecast (is it on the same Wi-Fi as this computer?).')),
        CONNECT_TIMEOUT_MS,
      );
      client.on('error', fail); // unhandled 'error' would crash the main process — always handled
      client.connect(host, () => {
        client.launch(DefaultMediaReceiver, (err, player) => {
          if (err) return fail(err);
          const media = {
            contentId: url,
            contentType,
            streamType: 'BUFFERED',
            metadata: { type: 0, metadataType: 3, title }, // 3 = MusicTrackMediaMetadata
          };
          player.load(media, { autoplay: true }, (err2) => {
            if (err2) return fail(err2);
            succeed({ client, player });
          });
        });
      });
    });
  }

  _dlnaPlay(location, url, title, contentType) {
    return withTimeout(new Promise((resolve, reject) => {
      let client;
      try { client = new MediaRendererClient(location); } catch (e) { reject(e); return; }
      client.on('error', () => { /* swallow async device errors so they can't crash the main process */ });
      client.load(url, {
        autoplay: true,
        contentType,
        metadata: { title, type: 'audio', creator: 'Noor' },
      }, (err) => {
        if (err) reject(err instanceof Error ? err : new Error(String(err)));
        else resolve(client);
      });
    }), CONNECT_TIMEOUT_MS, 'Could not start playback on the DLNA device.');
  }

  setVolume(deviceId, level) {
    return this._chain(deviceId, () => this._doSetVolume(deviceId, level));
  }

  async _doSetVolume(deviceId, level) {
    const s = this.sessions.get(deviceId);
    if (!s) throw new Error('Not connected to that device.');
    const clamped = Math.max(0, Math.min(1, Number(level) || 0));
    if (s.kind === 'chromecast') {
      await new Promise((resolve, reject) => s.client.setVolume({ level: clamped }, (e) => (e ? reject(e) : resolve())));
    } else if (s.kind === 'dlna') {
      await new Promise((resolve, reject) => s.client.setVolume(Math.round(clamped * 100), (e) => (e ? reject(e) : resolve())));
    }
    return { ok: true };
  }

  stop(deviceId) {
    return this._chain(deviceId, () => this._teardown(deviceId));
  }

  /** Tear down a session WITHOUT taking the lock (callers must hold it). */
  async _teardown(deviceId) {
    const s = this.sessions.get(deviceId);
    if (!s) return { ok: true };
    this.sessions.delete(deviceId);
    try {
      if (s.kind === 'chromecast') {
        await new Promise((resolve) => { try { s.player.stop(() => resolve()); } catch { resolve(); } });
        try { s.client.close(); } catch { /* ignore */ }
      } else if (s.kind === 'dlna') {
        await new Promise((resolve) => { try { s.client.stop(() => resolve()); } catch { resolve(); } });
      }
    } catch { /* ignore */ }
    return { ok: true };
  }

  isActive(deviceId) {
    return this.sessions.has(deviceId);
  }

  stopAll() {
    const ids = [...this.sessions.keys()];
    return Promise.all(ids.map((id) => this._teardown(id).catch(() => {})));
  }
}

module.exports = { CastController };
