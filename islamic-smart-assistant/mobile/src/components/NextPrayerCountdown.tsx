import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DateTime, Duration } from 'luxon';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme';

interface PrayerEntry {
  key: string;
  label: string;
  time: DateTime;
}

export const NextPrayerCountdown: React.FC<{ prayers: PrayerEntry[] }> = ({ prayers }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const [now, setNow] = useState(DateTime.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const next = prayers.find((p) => p.time > now);
  if (!next) return null;
  const remaining = Duration.fromMillis(next.time.toMillis() - now.toMillis()).shiftTo('hours', 'minutes', 'seconds');

  return (
    <View style={[styles.card, { backgroundColor: theme.accent }]}>
      <Text style={styles.label}>{t('prayer.nextPrayer')}: {next.label}</Text>
      <Text style={styles.countdown}>
        {String(Math.floor(remaining.hours)).padStart(2, '0')}:
        {String(Math.floor(remaining.minutes % 60)).padStart(2, '0')}:
        {String(Math.floor(remaining.seconds % 60)).padStart(2, '0')}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { padding: 24, borderRadius: 16, alignItems: 'center' },
  label: { color: '#FFFFFF', fontSize: 14, opacity: 0.9, marginBottom: 6 },
  countdown: { color: '#FFFFFF', fontSize: 40, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
