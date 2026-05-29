import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Quran } from '../../api/endpoints';
import { useTheme } from '../../theme';

export function QuranSchedulerScreen() {
  const theme = useTheme();
  const [schedules, setSchedules] = useState<any[]>([]);
  useEffect(() => { Quran.schedules().then(setSchedules); }, []);
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Quran Schedules</Text>
      <FlatList
        data={schedules}
        keyExtractor={(s) => s.id}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: theme.card, borderColor: theme.divider }]}>
            <Text style={{ color: theme.text }}>Surah {item.surah}</Text>
            <Text style={{ color: theme.subText, fontSize: 12 }}>{item.trigger_kind === 'prayer' ? `After ${item.trigger_prayer}` : item.trigger_cron}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  item: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
});
