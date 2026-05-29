import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';

import { Prayer } from '../../api/endpoints';
import { useTheme } from '../../theme';
import { PrayerCard } from '../../components/PrayerCard';
import { NextPrayerCountdown } from '../../components/NextPrayerCountdown';

export function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [today, setToday] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await Prayer.today();
      setToday(data);
    } catch (err) {
      console.warn('prayer today failed', err);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const prayers = today
    ? (['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const).map((k) => ({
        key: k,
        label: t(`prayer.${k}`),
        time: DateTime.fromISO(today[k]).setZone(today.timezone),
      }))
    : [];

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />}
    >
      <NextPrayerCountdown prayers={prayers} />
      <View style={{ height: 16 }} />
      {prayers.map((p) => (
        <PrayerCard key={p.key} name={p.label} time={p.time.toFormat('HH:mm')} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32 },
});
