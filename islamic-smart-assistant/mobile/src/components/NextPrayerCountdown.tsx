import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DateTime, Duration } from 'luxon';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { useTheme } from '../theme';
import { RootState } from '../store';

interface PrayerEntry {
  key: string;
  label: string;
  time: DateTime;
}

const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙',
  sunrise: '🌅',
  dhuhr: '☀️',
  asr: '🌤',
  maghrib: '🌇',
  isha: '🌃',
};

export const NextPrayerCountdown: React.FC<{ prayers: PrayerEntry[] }> = ({ prayers }) => {
  const { t } = useTranslation();
  const theme = useTheme();
  const location = useSelector((s: RootState) => s.user.location);
  const [now, setNow] = useState(DateTime.now());

  useEffect(() => {
    const tick = setInterval(() => setNow(DateTime.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  const nextIndex = prayers.findIndex((p) => p.time > now);
  const next = nextIndex >= 0 ? prayers[nextIndex] : null;

  const remaining = next
    ? Duration.fromMillis(next.time.toMillis() - now.toMillis()).shiftTo('hours', 'minutes', 'seconds')
    : null;

  const cityName = location?.city ?? (location ? `${location.lat.toFixed(1)}°, ${location.lng.toFixed(1)}°` : null);

  const isDark = theme.scheme === 'dark';

  return (
    <View style={[styles.hero, { backgroundColor: isDark ? '#0E1B2A' : theme.card, borderColor: theme.divider }]}>
      {/* Header row: location + date */}
      <View style={styles.heroHeader}>
        {cityName ? (
          <View style={styles.locationChip}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={[styles.locationText, { color: theme.subText }]}>{cityName}</Text>
          </View>
        ) : null}
        <Text style={[styles.dateText, { color: theme.subText }]}>
          {now.toFormat('EEE, dd LLL yyyy')}
        </Text>
      </View>

      {/* Divider */}
      <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />

      {/* Countdown section */}
      {next && remaining ? (
        <View style={styles.countdownSection}>
          <Text style={[styles.nextLabel, { color: theme.subText }]}>
            {t('prayer.nextPrayer')}: {next.label}
          </Text>
          <Text style={[styles.countdown, { color: theme.accent }]}>
            {String(Math.floor(remaining.hours)).padStart(2, '0')}
            <Text style={[styles.countdownSep, { color: theme.subText }]}>:</Text>
            {String(Math.floor(remaining.minutes % 60)).padStart(2, '0')}
            <Text style={[styles.countdownSep, { color: theme.subText }]}>:</Text>
            {String(Math.floor(remaining.seconds % 60)).padStart(2, '0')}
          </Text>
          <Text style={[styles.untilText, { color: theme.subText }]}>
            until {next.time.toFormat('HH:mm')}
          </Text>
        </View>
      ) : (
        <View style={styles.countdownSection}>
          <Text style={[styles.nextLabel, { color: theme.subText }]}>All prayers completed</Text>
          <Text style={[styles.countdown, { color: theme.accent }]}>🌙</Text>
        </View>
      )}

      {/* Divider */}
      <View style={[styles.dividerLine, { backgroundColor: theme.divider }]} />

      {/* Prayer time grid */}
      <View style={styles.prayerGrid}>
        {prayers.map((p, i) => {
          const isPast = p.time < now;
          const isNext = i === nextIndex;
          return (
            <View
              key={p.key}
              style={[
                styles.prayerRow,
                isNext && [styles.prayerRowActive, { backgroundColor: theme.accentSoft, borderColor: theme.accent }],
                !isNext && { borderColor: 'transparent' },
              ]}
            >
              <Text style={styles.prayerIcon}>{PRAYER_ICONS[p.key] ?? '🕌'}</Text>
              <Text
                style={[
                  styles.prayerName,
                  { color: isNext ? theme.accent : isPast ? theme.subText : theme.text },
                  isNext && { fontWeight: '700' },
                ]}
              >
                {p.label}
              </Text>
              <Text
                style={[
                  styles.prayerTime,
                  { color: isNext ? theme.accent : isPast ? theme.subText : theme.emerald },
                  isNext && { fontWeight: '700' },
                ]}
              >
                {p.time.toFormat('HH:mm')}
              </Text>
              {isNext && (
                <View style={[styles.activeDot, { backgroundColor: theme.accent }]} />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationIcon: { fontSize: 12 },
  locationText: { fontSize: 13, fontWeight: '500' },
  dateText: { fontSize: 12 },
  dividerLine: { height: 1, marginHorizontal: 18 },

  countdownSection: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 18,
  },
  nextLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8, letterSpacing: 0.5 },
  countdown: {
    fontSize: 52,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 2,
    lineHeight: 60,
  },
  countdownSep: { fontSize: 44, fontWeight: '300' },
  untilText: { fontSize: 12, marginTop: 6 },

  prayerGrid: {
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 12,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 2,
    gap: 8,
  },
  prayerRowActive: {
    borderWidth: 1,
  },
  prayerIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  prayerName: { flex: 1, fontSize: 14, fontWeight: '500' },
  prayerTime: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 4,
  },
});
