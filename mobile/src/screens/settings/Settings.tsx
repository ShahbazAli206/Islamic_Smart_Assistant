import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, Alert, Switch } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../../theme';
import { RootState } from '../../store';
import { detectLocation } from '../../services/location';
import { setLocation } from '../../store/slices/user';
import { Users } from '../../api/endpoints';

const APP_VERSION = '1.0.0';

function InfoTile({ icon, label, value, theme }: { icon: string; label: string; value: string; theme: any }) {
  return (
    <View style={[styles.tile, { backgroundColor: theme.card, borderColor: theme.divider }]}>
      <Text style={styles.tileIcon}>{icon}</Text>
      <Text style={[styles.tileLabel, { color: theme.subText }]}>{label}</Text>
      <Text style={[styles.tileValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

export function SettingsScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.user);
  const [busy, setBusy] = useState(false);

  const updateLocation = async () => {
    setBusy(true);
    try {
      const loc = await detectLocation();
      dispatch(setLocation(loc));
      Users.setLocation(loc).catch(() => {});
    } catch (err: any) {
      Alert.alert('Location error', err?.message ?? 'Failed to update location');
    } finally {
      setBusy(false);
    }
  };

  const locationValue = user.location
    ? (user.location.city ?? `${user.location.lat.toFixed(2)}°, ${user.location.lng.toFixed(2)}°`)
    : 'Not set';

  const sectLabel = user.sect ? (user.sect === 'sunni' ? 'Sunni' : 'Shia') : '—';
  const fiqhLabels: Record<string, string> = {
    hanafi: 'Hanafi', shafi: 'Shafi\'i', maliki: 'Maliki', hanbali: 'Hanbali', jafari: 'Ja\'fari',
  };
  const fiqhLabel = user.fiqh_method ? (fiqhLabels[user.fiqh_method] ?? user.fiqh_method) : '—';

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Text style={{ fontSize: 12 }}>⚙️</Text>
          <Text style={[styles.chipText, { color: theme.accent }]}>Settings</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Your Profile</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Language, sect, location and preferences
        </Text>
      </View>

      {/* Info tiles grid */}
      <Text style={[styles.sectionLabel, { color: theme.subText }]}>PROFILE</Text>
      <View style={styles.tileGrid}>
        <InfoTile icon="🌐" label="Language" value={user.language.toUpperCase()} theme={theme} />
        <InfoTile icon="🕌" label="Sect" value={sectLabel} theme={theme} />
        <InfoTile icon="📚" label="Fiqh" value={fiqhLabel} theme={theme} />
        <InfoTile icon="📍" label="City" value={locationValue} theme={theme} />
      </View>

      {/* Location section */}
      <Text style={[styles.sectionLabel, { color: theme.subText }]}>LOCATION</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <View style={styles.cardRow}>
          <Text style={{ fontSize: 20 }}>📍</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Current Location</Text>
            <Text style={[styles.cardSub, { color: theme.subText }]}>{locationValue}</Text>
          </View>
        </View>
        <Pressable
          onPress={updateLocation}
          disabled={busy}
          style={[styles.actionBtn, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}
        >
          {busy ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.actionBtnText}>
              {user.location ? '↻  Update Location' : '📍  Detect Location'}
            </Text>
          )}
        </Pressable>
      </View>

      {/* App info */}
      <Text style={[styles.sectionLabel, { color: theme.subText }]}>ABOUT</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <View style={styles.aboutRow}>
          <Text style={{ fontSize: 32 }}>🕌</Text>
          <View>
            <Text style={[styles.appName, { color: theme.text }]}>Islamic Smart Assistant</Text>
            <Text style={[styles.appVersion, { color: theme.subText }]}>Version {APP_VERSION}</Text>
          </View>
        </View>
        <Text style={[styles.aboutDesc, { color: theme.subText }]}>
          Prayer times · Holy Quran · Qibla direction · Azan · Device sync
        </Text>
      </View>

      {/* Calculation method */}
      <Text style={[styles.sectionLabel, { color: theme.subText }]}>CALCULATION</Text>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <View style={styles.calcRow}>
          <Text style={{ fontSize: 18 }}>📐</Text>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Prayer Calculation</Text>
          <View style={[styles.calcBadge, { backgroundColor: theme.emeraldSoft }]}>
            <Text style={[styles.calcBadgeText, { color: theme.emerald }]}>MWL</Text>
          </View>
        </View>
        <Text style={[styles.cardSub, { color: theme.subText }]}>
          Muslim World League — used by default for offline calculation
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginTop: 8 },

  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  tile: {
    width: '47.5%', padding: 14, borderRadius: 16, borderWidth: 1,
  },
  tileIcon: { fontSize: 20, marginBottom: 6 },
  tileLabel: { fontSize: 11, marginBottom: 4 },
  tileValue: { fontSize: 16, fontWeight: '700' },

  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 8 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  actionBtn: {
    paddingVertical: 12, borderRadius: 24, alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  aboutRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  appName: { fontSize: 16, fontWeight: '700' },
  appVersion: { fontSize: 12, marginTop: 2 },
  aboutDesc: { fontSize: 12, lineHeight: 18 },

  calcRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  calcBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  calcBadgeText: { fontSize: 12, fontWeight: '700' },
});
