import TrackPlayer, { Capability, AppKilledPlaybackBehavior } from 'react-native-track-player';

let initialized = false;

export async function initAudioPlayer() {
  if (initialized) return;
  await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
  await TrackPlayer.updateOptions({
    android: { appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification },
    capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SkipToNext],
    compactCapabilities: [Capability.Play, Capability.Pause],
  });
  initialized = true;
}

/**
 * Schedule playback for a specific epoch ms. All devices in a sync group call
 * this with the same `playAt` so audio starts simultaneously (within ~100ms,
 * limited by network jitter + device clock drift). Pre-cache via prefetch().
 */
export async function playAt(playAt: number, audioUrl: string, meta: { title: string; artist?: string }) {
  const delay = Math.max(0, playAt - Date.now());
  setTimeout(async () => {
    try {
      await TrackPlayer.reset();
      await TrackPlayer.add({ url: audioUrl, title: meta.title, artist: meta.artist ?? 'Islamic Assistant' });
      await TrackPlayer.play();
    } catch (err) {
      console.warn('playAt failed', err);
    }
  }, delay);
}

export async function stop() {
  try { await TrackPlayer.stop(); } catch {}
}

/**
 * Preload an audio URL into the device cache. Called when the user changes
 * Azan voice in settings so the next prayer time has zero buffering.
 *
 * TODO(integration): wire to react-native-blob-util to download + persist
 * audio files keyed by URL hash in app's document directory.
 */
export async function prefetch(_url: string) {
  // no-op stub
}
