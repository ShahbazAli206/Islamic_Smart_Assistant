import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export const PrayerCard: React.FC<{ name: string; time: string; highlight?: boolean }> = ({ name, time, highlight }) => {
  const theme = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: highlight ? theme.accentSoft : theme.card, borderColor: theme.divider }]}>
      <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
      <Text style={[styles.time, { color: theme.accent }]}>{time}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: '500' },
  time: { fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
