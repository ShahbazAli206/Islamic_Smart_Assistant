import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme';

export const PrayerCard: React.FC<{
  name: string;
  time: string;
  highlight?: boolean;
  isPast?: boolean;
  icon?: string;
}> = ({ name, time, highlight, isPast, icon = '🕌' }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: highlight ? theme.accentSoft : theme.card,
          borderColor: highlight ? theme.accent : theme.divider,
        },
      ]}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.name, { color: highlight ? theme.accent : isPast ? theme.subText : theme.text }]}>
        {name}
      </Text>
      <Text style={[styles.time, { color: highlight ? theme.accent : isPast ? theme.subText : theme.emerald }]}>
        {time}
      </Text>
      {highlight && <View style={[styles.dot, { backgroundColor: theme.accent }]} />}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 6,
    gap: 10,
  },
  icon: { fontSize: 18, width: 26, textAlign: 'center' },
  name: { flex: 1, fontSize: 15, fontWeight: '500' },
  time: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
