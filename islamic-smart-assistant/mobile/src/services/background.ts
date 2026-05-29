import BackgroundFetch from 'react-native-background-fetch';
import notifee, { TriggerType, TimestampTrigger, AndroidImportance } from '@notifee/react-native';
import { Prayer } from '../api/endpoints';

/**
 * Background scheduler.
 *
 * Strategy: rather than running a long-running background process (which
 * Android/iOS aggressively kill), we register OS-level alarms (notifee
 * timestamp triggers) for each prayer time over the next 7 days. The OS wakes
 * the app to play Azan even if it's been killed.
 *
 * BackgroundFetch wakes the app daily to refresh the alarm schedule.
 */
export async function initBackgroundScheduler() {
  await notifee.requestPermission();
  const channelId = await notifee.createChannel({ id: 'azan', name: 'Azan', importance: AndroidImportance.HIGH, sound: 'azan' });

  await refreshScheduledAlarms(channelId);

  await BackgroundFetch.configure(
    { minimumFetchInterval: 60 * 6, stopOnTerminate: false, startOnBoot: true },
    async (taskId) => {
      try {
        await refreshScheduledAlarms(channelId);
      } finally {
        BackgroundFetch.finish(taskId);
      }
    },
    (taskId) => BackgroundFetch.finish(taskId),
  );
}

async function refreshScheduledAlarms(channelId: string) {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const range = await Prayer.range(today, 7);
    await notifee.cancelAllNotifications();
    for (const day of range) {
      for (const prayer of ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const) {
        const ts = new Date(day[prayer]).getTime();
        if (ts <= Date.now()) continue;
        const trigger: TimestampTrigger = { type: TriggerType.TIMESTAMP, timestamp: ts, alarmManager: { allowWhileIdle: true } };
        await notifee.createTriggerNotification(
          {
            title: `${prayer.charAt(0).toUpperCase() + prayer.slice(1)} Azan`,
            body: 'It is time for prayer',
            android: { channelId, sound: 'azan', pressAction: { id: 'default' } },
            ios: { sound: 'azan.caf' },
          },
          trigger,
        );
      }
    }
  } catch (err) {
    console.warn('refreshScheduledAlarms failed', err);
  }
}
