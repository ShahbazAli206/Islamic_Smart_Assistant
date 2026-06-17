import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { DateTime } from 'luxon';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

import { Prayer } from '../../api/endpoints';
import { useTheme } from '../../theme';
import { PrayerCard } from '../../components/PrayerCard';
import { NextPrayerCountdown } from '../../components/NextPrayerCountdown';
import { RootState } from '../../store';

function localPrayerTimes(lat: number, lng: number, timezone: string): any {
  const coords = new Coordinates(lat, lng);
  const params = CalculationMethod.MuslimWorldLeague();
  const date = new Date();
  const times = new PrayerTimes(coords, date, params);
  return {
    date: date.toISOString().split('T')[0],
    timezone,
    fajr: times.fajr.toISOString(),
    sunrise: times.sunrise.toISOString(),
    dhuhr: times.dhuhr.toISOString(),
    asr: times.asr.toISOString(),
    maghrib: times.maghrib.toISOString(),
    isha: times.isha.toISOString(),
  };
}

export function DashboardScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const location = useSelector((s: RootState) => s.user.location);
  const [today, setToday] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const data = await Prayer.today();
      setToday(data);
    } catch {
      if (location) {
        setToday(localPrayerTimes(location.lat, location.lng, location.timezone));
      }
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
