import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '../../theme';
import { RootState } from '../../store';

export function SettingsScreen() {
  const theme = useTheme();
  const user = useSelector((s: RootState) => s.user);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      <Row label="Language" value={user.language} theme={theme} />
      <Row label="Sect" value={user.sect ?? '—'} theme={theme} />
      <Row label="Fiqh" value={user.fiqh_method ?? '—'} theme={theme} />
      <Row label="City" value={user.location?.city ?? '—'} theme={theme} />
    </View>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.divider }]}>
      <Text style={{ color: theme.subText }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
});
