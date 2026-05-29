import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, Switch, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Azan } from '../../api/endpoints';
import { useTheme } from '../../theme';

export function AzanSettingsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [voices, setVoices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    Azan.voices().then(setVoices);
    Azan.settings().then(setSettings);
  }, []);

  const updateField = async (patch: any) => {
    const next = await Azan.update({ ...settings, ...patch });
    setSettings(next);
  };

  if (!settings) return <View style={{ backgroundColor: theme.bg, flex: 1 }} />;

  return (
    <View style={{ backgroundColor: theme.bg, flex: 1, padding: 16 }}>
      <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <Text style={[styles.label, { color: theme.text }]}>Auto-play Azan</Text>
        <Switch value={settings.auto_play_enabled} onValueChange={(v) => updateField({ auto_play_enabled: v })} />
      </View>

      <Text style={[styles.section, { color: theme.subText }]}>Voice</Text>
      <FlatList
        data={voices}
        keyExtractor={(v) => v.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => updateField({ selected_voice: item.id })}
            style={[styles.row, { backgroundColor: settings.selected_voice === item.id ? theme.accentSoft : theme.card, borderColor: theme.divider }]}
          >
            <Text style={[styles.label, { color: theme.text }]}>{item.name}</Text>
            {settings.selected_voice === item.id && <Text style={{ color: theme.accent, fontWeight: '700' }}>✓</Text>}
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  label: { fontSize: 16 },
  section: { marginTop: 16, marginBottom: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 },
});
