import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../../theme';

interface AzanPack {
  id: string;
  name: string;
  artist: string;
  duration: string;
  origin: string;
  size: string;
  flag: string;
}

const BUNDLED_PACKS: AzanPack[] = [
  { id: 'makkah', name: 'Makkah', artist: 'Sheikh Ali Mulla', duration: '4:38', origin: 'Saudi Arabia', size: '4.2 MB', flag: '🇸🇦' },
  { id: 'madinah', name: 'Madinah', artist: 'Sheikh Essam Bukhari', duration: '4:12', origin: 'Saudi Arabia', size: '4.0 MB', flag: '🇸🇦' },
  { id: 'pakistan', name: 'Pakistan', artist: 'Lahore Classical', duration: '3:58', origin: 'Pakistan', size: '3.8 MB', flag: '🇵🇰' },
  { id: 'turkish', name: 'Turkish', artist: 'Hafiz Mustafa Özcan', duration: '4:21', origin: 'Istanbul', size: '3.9 MB', flag: '🇹🇷' },
  { id: 'egyptian', name: 'Egyptian', artist: 'Maqam Style', duration: '4:46', origin: 'Cairo', size: '4.5 MB', flag: '🇪🇬' },
];

const QURAN_SURAHS = ['Fatiha', 'Yasin', 'Rahman', 'Mulk', 'Kahf', "Waqi'ah"];

export function AudioScreen() {
  const theme = useTheme();
  const [playingId, setPlayingId] = useState<string | null>(null);

  function handlePlayToggle(id: string) {
    setPlayingId((prev) => (prev === id ? null : id));
  }

  function handleUploadPress() {
    Alert.alert(
      'Custom Upload',
      'Upload feature coming soon. Connect your device to the server to upload custom Azan packs.',
      [{ text: 'OK' }]
    );
  }

  const s = StyleSheet.create({
    root: { backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 40 },
    chipWrap: { alignSelf: 'flex-start', marginBottom: 10 },
    chip: {
      backgroundColor: theme.accentSoft,
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    chipText: { color: theme.accent, fontSize: 12, fontWeight: '600' },
    title: { color: theme.text, fontSize: 28, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: theme.subText, fontSize: 13, marginBottom: 20 },
    sectionLabel: {
      color: theme.subText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    packCard: {
      borderRadius: 12,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
    },
    packRow: { flexDirection: 'row', alignItems: 'center' },
    packFlag: { fontSize: 28, marginRight: 12 },
    packInfo: { flex: 1 },
    packName: { color: theme.text, fontSize: 16, fontWeight: '700', marginBottom: 2 },
    packArtist: { color: theme.subText, fontSize: 13, marginBottom: 4 },
    packMeta: { color: theme.subText, fontSize: 12 },
    playBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    playBtnText: { fontSize: 16 },
    badgeRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
    offlineBadge: {
      backgroundColor: theme.emeraldSoft,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    offlineBadgeText: { color: theme.emerald, fontSize: 11, fontWeight: '600' },
    quranCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      marginBottom: 16,
    },
    quranHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    quranTitle: { color: theme.text, fontSize: 16, fontWeight: '700', flex: 1 },
    quranBadge: {
      backgroundColor: theme.accentSoft,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
    },
    quranBadgeText: { color: theme.accent, fontSize: 11, fontWeight: '600' },
    quranMeta: { color: theme.subText, fontSize: 13, marginBottom: 10 },
    surahChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    surahChip: {
      backgroundColor: theme.cardAlt,
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: theme.divider,
    },
    surahChipText: { color: theme.subText, fontSize: 12 },
    uploadCard: {
      borderRadius: 12,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.divider,
      padding: 24,
      alignItems: 'center',
      marginBottom: 10,
    },
    uploadIcon: { fontSize: 28, marginBottom: 8 },
    uploadText: { color: theme.text, fontSize: 15, fontWeight: '600', marginBottom: 4 },
    uploadSub: { color: theme.subText, fontSize: 12 },
    emptyText: { color: theme.subText, fontSize: 13, textAlign: 'center', marginBottom: 16 },
    infoCard: {
      backgroundColor: theme.cardAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    infoIcon: { fontSize: 16 },
    infoText: { color: theme.subText, fontSize: 13, flex: 1, lineHeight: 18 },
  });

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.chipWrap}>
        <View style={s.chip}>
          <Text style={s.chipText}>Audio</Text>
        </View>
      </View>
      <Text style={s.title}>Audio Library</Text>
      <Text style={s.subtitle}>Manage Azan voices and custom uploads</Text>

      {/* Bundled Packs */}
      <Text style={s.sectionLabel}>Bundled Packs</Text>
      {BUNDLED_PACKS.map((pack) => {
        const isPlaying = playingId === pack.id;
        return (
          <View
            key={pack.id}
            style={[
              s.packCard,
              {
                backgroundColor: isPlaying ? theme.accentSoft : theme.card,
                borderColor: isPlaying ? theme.accent : theme.divider,
              },
            ]}
          >
            <View style={s.packRow}>
              <Text style={s.packFlag}>{pack.flag}</Text>
              <View style={s.packInfo}>
                <Text style={s.packName}>{pack.name}</Text>
                <Text style={s.packArtist}>{pack.artist}</Text>
                <Text style={s.packMeta}>{pack.duration} · {pack.origin} · {pack.size}</Text>
              </View>
              <TouchableOpacity
                style={[
                  s.playBtn,
                  {
                    backgroundColor: isPlaying ? 'rgba(16,185,129,0.2)' : theme.emeraldSoft,
                    borderColor: theme.emerald,
                  },
                ]}
                onPress={() => handlePlayToggle(pack.id)}
              >
                <Text style={[s.playBtnText, { color: theme.emerald }]}>
                  {isPlaying ? '⏸' : '▶'}
                </Text>
              </TouchableOpacity>
            </View>
            <View style={s.badgeRow}>
              <View style={s.offlineBadge}>
                <Text style={s.offlineBadgeText}>Offline ready</Text>
              </View>
            </View>
          </View>
        );
      })}

      {/* Quran Starter Pack */}
      <View style={s.quranCard}>
        <View style={s.quranHeader}>
          <Text style={s.quranTitle}>Quran Starter Pack</Text>
          <View style={s.quranBadge}>
            <Text style={s.quranBadgeText}>Bundled</Text>
          </View>
        </View>
        <Text style={s.quranMeta}>6 surahs · 38 MB</Text>
        <View style={s.surahChips}>
          {QURAN_SURAHS.map((name) => (
            <View key={name} style={s.surahChip}>
              <Text style={s.surahChipText}>{name}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Custom Uploads */}
      <Text style={s.sectionLabel}>Custom Uploads</Text>
      <TouchableOpacity style={s.uploadCard} onPress={handleUploadPress} activeOpacity={0.7}>
        <Text style={s.uploadIcon}>⬆</Text>
        <Text style={s.uploadText}>Upload custom Azan pack</Text>
        <Text style={s.uploadSub}>.mp3 · max 5 MB</Text>
      </TouchableOpacity>

      <Text style={s.emptyText}>No custom packs uploaded yet</Text>

      {/* Info Card */}
      <View style={s.infoCard}>
        <Text style={s.infoIcon}>ℹ️</Text>
        <Text style={s.infoText}>
          All bundled packs work offline. Custom uploads require server connection.
        </Text>
      </View>
    </ScrollView>
  );
}
