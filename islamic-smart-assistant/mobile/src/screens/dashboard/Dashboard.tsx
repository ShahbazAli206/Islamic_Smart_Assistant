import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { DateTime } from 'luxon';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';

import { Prayer } from '../../api/endpoints';
import { useTheme } from '../../theme';
import { NextPrayerCountdown } from '../../components/NextPrayerCountdown';
import { RootState } from '../../store';

const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙', sunrise: '🌅', dhuhr: '☀️', asr: '🌤', maghrib: '🌇', isha: '🌃',
};

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
  const navigation = useNavigation<any>();
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
        icon: PRAYER_ICONS[k],
      }))
    : [];

  const isDark = theme.scheme === 'dark';

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.accent} />
      }
    >
      {/* Greeting header */}
      <View style={styles.greeting}>
        <Text style={[styles.greetingArabic, { color: theme.accent }]}>السلام عليكم</Text>
        <Text style={[styles.greetingEn, { color: theme.text }]}>As-salāmu ʿalaykum</Text>
      </View>

      {/* Chip badges row */}
      <View style={styles.chipRow}>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Text style={{ fontSize: 12 }}>✨</Text>
          <Text style={[styles.chipText, { color: theme.accent }]}>Daily Prayer Times</Text>
        </View>
        <Pressable
          onPress={() => navigation.navigate('Quran')}
          style={[styles.chip, { backgroundColor: theme.emeraldSoft, borderColor: theme.emerald }]}
        >
          <Text style={{ fontSize: 12 }}>📖</Text>
          <Text style={[styles.chipText, { color: theme.emerald }]}>Open the Quran</Text>
        </Pressable>
      </View>

      {/* Prayer hero card */}
      {prayers.length > 0 ? (
        <NextPrayerCountdown prayers={prayers} />
      ) : (
        <View style={[styles.loadingCard, { backgroundColor: theme.card, borderColor: theme.divider }]}>
          <Text style={[styles.loadingText, { color: theme.subText }]}>
            {location ? 'Calculating prayer times…' : 'Enable location to see prayer times'}
          </Text>
        </View>
      )}

      {/* Quick links section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.subText }]}>QUICK ACCESS</Text>
        <View style={styles.quickGrid}>
          <Pressable
            style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.divider }]}
            onPress={() => navigation.navigate('Qibla')}
          >
            <Text style={styles.quickIcon}>🧭</Text>
            <Text style={[styles.quickLabel, { color: theme.text }]}>Qibla</Text>
            <Text style={[styles.quickSub, { color: theme.subText }]}>Direction</Text>
          </Pressable>
          <Pressable
            style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.divider }]}
            onPress={() => navigation.navigate('Azan')}
          >
            <Text style={styles.quickIcon}>🔔</Text>
            <Text style={[styles.quickLabel, { color: theme.text }]}>Azan</Text>
            <Text style={[styles.quickSub, { color: theme.subText }]}>Settings</Text>
          </Pressable>
          <Pressable
            style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.divider }]}
            onPress={() => navigation.navigate('Devices')}
          >
            <Text style={styles.quickIcon}>📱</Text>
            <Text style={[styles.quickLabel, { color: theme.text }]}>Devices</Text>
            <Text style={[styles.quickSub, { color: theme.subText }]}>Linked</Text>
          </Pressable>
          <Pressable
            style={[styles.quickCard, { backgroundColor: theme.card, borderColor: theme.divider }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.quickIcon}>⚙️</Text>
            <Text style={[styles.quickLabel, { color: theme.text }]}>Settings</Text>
            <Text style={[styles.quickSub, { color: theme.subText }]}>Profile</Text>
          </Pressable>
        </View>
      </View>

      {/* Info banner */}
      <View style={[styles.banner, { backgroundColor: isDark ? '#0E1B2A' : theme.emeraldSoft, borderColor: theme.emerald + '30' }]}>
        <Text style={{ fontSize: 22 }}>🕌</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.bannerTitle, { color: theme.emerald }]}>Islamic Smart Assistant</Text>
          <Text style={[styles.bannerSub, { color: theme.subText }]}>
            Prayer times · Quran · Qibla · Azan · Devices
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  greeting: { marginBottom: 12, alignItems: 'flex-start' },
  greetingArabic: { fontSize: 28, fontWeight: '700', letterSpacing: 0.5 },
  greetingEn: { fontSize: 15, fontWeight: '500', marginTop: 2 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 18, flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipText: { fontSize: 12, fontWeight: '600' },

  loadingCard: {
    borderWidth: 1, borderRadius: 20, padding: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  loadingText: { fontSize: 14, textAlign: 'center' },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickCard: {
    width: '47.5%', alignItems: 'center', padding: 16,
    borderRadius: 16, borderWidth: 1,
  },
  quickIcon: { fontSize: 28, marginBottom: 6 },
  quickLabel: { fontSize: 15, fontWeight: '600' },
  quickSub: { fontSize: 11, marginTop: 2 },

  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginTop: 20, borderRadius: 16, borderWidth: 1, padding: 16,
  },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerSub: { fontSize: 12, marginTop: 2 },
});
