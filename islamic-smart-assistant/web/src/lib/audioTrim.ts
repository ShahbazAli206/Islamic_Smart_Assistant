// Browser-side audio trimming for custom Azan clips. Pure Web Audio API — no
// external encoder dependency. We decode the uploaded file to an AudioBuffer,
// draw a waveform from its peaks, and re-encode the chosen [start,end] slice to
// a self-contained 16-bit PCM WAV Blob (so it plays anywhere via an object URL,
// with no playback-offset logic needed in the scheduler).

/** Decode an uploaded audio file (mp3/wav/m4a/ogg — whatever the browser supports). */
export async function decodeAudioFile(file: File): Promise<AudioBuffer> {
  const arrayBuffer = await file.arrayBuffer();
  const Ctx: typeof AudioContext =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('Web Audio is not supported in this browser.');
  const ctx = new Ctx();
  try {
    // decodeAudioData detaches arrayBuffer; that's fine, we don't reuse it.
    return await ctx.decodeAudioData(arrayBuffer);
  } finally {
    if (ctx.state !== 'closed') ctx.close().catch(() => {});
  }
}

/**
 * Downsample channel 0 into `buckets` peak magnitudes, normalised to 0..1, for
 * rendering the waveform on a canvas. Cheap enough to run once per decode.
 */
export function computePeaks(buffer: AudioBuffer, buckets: number): number[] {
  const data = buffer.getChannelData(0);
  const block = Math.floor(data.length / buckets) || 1;
  const peaks: number[] = [];
  let max = 0;
  for (let i = 0; i < buckets; i++) {
    const start = i * block;
    let peak = 0;
    for (let j = 0; j < block && start + j < data.length; j++) {
      const v = Math.abs(data[start + j]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
    if (peak > max) max = peak;
  }
  return max > 0 ? peaks.map((p) => p / max) : peaks;
}

/**
 * Encode the sample range [startSec, endSec) of `buffer` into a 16-bit PCM WAV
 * Blob (mono/stereo preserved up to 2 channels). Standard 44-byte header.
 */
export function encodeWavClip(buffer: AudioBuffer, startSec: number, endSec: number): Blob {
  const sampleRate = buffer.sampleRate;
  const numChannels = Math.min(buffer.numberOfChannels, 2);
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.floor(endSec * sampleRate));
  const frameCount = Math.max(0, endSample - startSample);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const arrBuf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrBuf);
  const writeStr = (off: number, s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };

  // ── WAV header ──
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);                       // fmt chunk size
  view.setUint16(20, 1, true);                        // audio format: PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);  // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);                       // bits per sample
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  // ── interleaved samples, clamped & converted to signed 16-bit ──
  let offset = 44;
  for (let i = 0; i < frameCount; i++) {
    for (let c = 0; c < numChannels; c++) {
      let sample = channels[c][startSample + i] || 0;
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrBuf], { type: 'audio/wav' });
}

/** Format seconds as "m:ss" (e.g. 83 → "1:23"). */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
