import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

export function QuranPlayerScreen() {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Quran Player</Text>
      <Text style={[styles.note, { color: theme.subText }]}>
        Surah list, ayah-level navigation, recitation playback, and synchronized translation will render here.
        Wire the Quran.surahs() endpoint, then bind to react-native-track-player.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 12 },
  note: { fontSize: 14, textAlign: 'center' },
});
