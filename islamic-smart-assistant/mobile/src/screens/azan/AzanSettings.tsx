import React, { useEffect, useState } from 'react';
import {
  View, Text, Pressable, Switch, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Azan } from '../../api/endpoints';
import { useTheme } from '../../theme';

const DEFAULT_VOICES = [
  { id: 'abdullahbasfar', name: 'Abdullah Basfar', style: 'Classic' },
  { id: 'misharyalfasy', name: 'Mishari Alafasy', style: 'Melodious' },
  { id: 'abdulbasitabdulsamad', name: 'Abdul Basit', style: 'Traditional' },
  { id: 'minshawi', name: 'Mohamed Siddiq El-Minshawi', style: 'Egyptian' },
  { id: 'alafasy', name: 'Mishary Rashid Alafasy', style: 'Kuwaiti' },
];

const PRAYER_LABELS = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
const PRAYER_ICONS = ['🌙', '☀️', '🌤', '🌇', '🌃'];

export function AzanSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [voices, setVoices] = useState<any[]>(DEFAULT_VOICES);
  const [settings, setSettings] = useState<any>({
    auto_play_enabled: true,
    selected_voice: 'misharyalfasy',
    prayer_alerts: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([Azan.voices(), Azan.settings()])
      .then(([v, s]) => {
        if (v?.length) setVoices(v);
        if (s) setSettings(s);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const updateField = (patch: any) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    Azan.update(next).catch(() => {});
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Text style={{ fontSize: 12 }}>🔔</Text>
          <Text style={[styles.chipText, { color: theme.accent }]}>Azan Settings</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Prayer Call</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Configure automatic Azan playback and voice
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <View style={styles.cardHeader}>
          <Text style={{ fontSize: 20 }}>🔔</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Auto-play Azan</Text>
            <Text style={[styles.cardSub, { color: theme.subText }]}>
              Play the call to prayer at each prayer time
            </Text>
          </View>
          <Switch
            value={settings.auto_play_enabled ?? true}
            onValueChange={(v) => updateField({ auto_play_enabled: v })}
            trackColor={{ false: theme.divider, true: theme.emerald + '80' }}
            thumbColor={settings.auto_play_enabled ? theme.emerald : theme.subText}
          />
        </View>
      </View>

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>PRAYER ALERTS</Text>
      {PRAYER_LABELS.map((label, i) => {
        const key = label.toLowerCase() as any;
        const enabled = settings.prayer_alerts?.[key] !== false;
        return (
          <View
            key={key}
            style={[styles.toggleRow, { backgroundColor: theme.card, borderColor: theme.divider }]}
          >
            <Text style={{ fontSize: 20 }}>{PRAYER_ICONS[i]}</Text>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>{label}</Text>
            <Switch
              value={enabled}
              onValueChange={(v) =>
                updateField({ prayer_alerts: { ...settings.prayer_alerts, [key]: v } })
              }
              trackColor={{ false: theme.divider, true: theme.emerald + '80' }}
              thumbColor={enabled ? theme.emerald : theme.subText}
            />
          </View>
        );
      })}

      <Text style={[styles.sectionLabel, { color: theme.subText }]}>SELECT VOICE</Text>
      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
      ) : (
        voices.map((v) => {
          const isSelected = settings.selected_voice === v.id;
          return (
            <Pressable
              key={v.id}
              onPress={() => updateField({ selected_voice: v.id })}
              style={[
                styles.voiceCard,
                {
                  backgroundColor: isSelected ? theme.accentSoft : theme.card,
                  borderColor: isSelected ? theme.accent : theme.divider,
                },
              ]}
            >
              <View style={[styles.voiceBadge, { backgroundColor: isSelected ? theme.accent : theme.accentSoft }]}>
                <Text style={{ fontSize: 16 }}>🎙</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.voiceName, { color: theme.text }]}>{v.name}</Text>
                {v.style && (
                  <Text style={[styles.voiceStyle, { color: theme.subText }]}>{v.style}</Text>
                )}
              </View>
              {isSelected && (
                <View style={[styles.checkBadge, { backgroundColor: theme.accent }]}>
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                </View>
              )}
            </Pressable>
          );
        })
      )}

      <Pressable
        style={[styles.previewBtn, { backgroundColor: theme.emerald }]}
        onPress={() => {}}
      >
        <Text style={{ fontSize: 20 }}>▶</Text>
        <Text style={styles.previewBtnText}>Preview Selected Azan</Text>
      </Pressable>
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
  card: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSub: { fontSize: 12, marginTop: 2 },
  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginTop: 8 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 6,
  },
  toggleLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  voiceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  voiceBadge: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  voiceName: { fontSize: 15, fontWeight: '600' },
  voiceStyle: { fontSize: 12, marginTop: 2 },
  checkBadge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 28, marginTop: 8,
  },
  previewBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
