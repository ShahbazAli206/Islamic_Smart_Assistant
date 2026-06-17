import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../theme';

const STORAGE_KEY = 'isa:recitationSchedules';

const SURAH_NAMES: Record<number, string> = {
  1: 'Al-Fatiha',
  2: 'Al-Baqarah',
  18: 'Al-Kahf',
  36: 'Ya-Sin',
  55: 'Ar-Rahman',
  67: 'Al-Mulk',
  112: 'Al-Ikhlas',
  113: 'Al-Falaq',
  114: 'An-Nas',
  56: "Al-Waqi'ah",
};

const QUICK_PICK_SURAHS = [1, 36, 55, 67, 18, 2, 112, 113, 114, 56];

type RepeatMode = 'Once' | 'Daily' | 'Weekly' | 'Monthly';
type ReciterOption = 'Alafasy' | 'Abdul Basit' | 'Sudais';
type VolumeLevel = 'Low' | 'Medium' | 'High';

interface Schedule {
  id: string;
  time: string;
  reciter: ReciterOption;
  surahs: number[];
  repeat: RepeatMode;
  volume: VolumeLevel;
  enabled: boolean;
}

function surahSummary(surahs: number[]): string {
  if (surahs.length === 0) return 'No surahs';
  const names = surahs.map((n) => SURAH_NAMES[n] ?? `Surah ${n}`);
  if (names.length <= 2) return names.join(', ');
  return `${names[0]}, ${names[1]} +${names.length - 2} more`;
}

export function RecitationAlarmScreen() {
  const theme = useTheme();

  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Form state
  const [formTime, setFormTime] = useState('06:00');
  const [formSurahs, setFormSurahs] = useState<number[]>([1]);
  const [formRepeat, setFormRepeat] = useState<RepeatMode>('Daily');
  const [formReciter, setFormReciter] = useState<ReciterOption>('Alafasy');
  const [formVolume, setFormVolume] = useState<VolumeLevel>('Medium');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try { setSchedules(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  async function saveSchedules(next: Schedule[]) {
    setSchedules(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addSchedule() {
    if (formSurahs.length === 0) {
      Alert.alert('Select Surahs', 'Please pick at least one surah.');
      return;
    }
    const schedule: Schedule = {
      id: Date.now().toString(),
      time: formTime,
      reciter: formReciter,
      surahs: formSurahs,
      repeat: formRepeat,
      volume: formVolume,
      enabled: true,
    };
    saveSchedules([...schedules, schedule]);
    setShowForm(false);
    resetForm();
  }

  function deleteSchedule(id: string) {
    Alert.alert('Delete Schedule', 'Remove this recitation alarm?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveSchedules(schedules.filter((s) => s.id !== id)) },
    ]);
  }

  function toggleEnabled(id: string) {
    saveSchedules(schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }

  function resetForm() {
    setFormTime('06:00');
    setFormSurahs([1]);
    setFormRepeat('Daily');
    setFormReciter('Alafasy');
    setFormVolume('Medium');
  }

  function toggleFormSurah(num: number) {
    setFormSurahs((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  }

  const RECITERS: ReciterOption[] = ['Alafasy', 'Abdul Basit', 'Sudais'];
  const REPEATS: RepeatMode[] = ['Once', 'Daily', 'Weekly', 'Monthly'];
  const VOLUMES: { label: string; key: VolumeLevel; pct: number }[] = [
    { label: 'Low', key: 'Low', pct: 25 },
    { label: 'Medium', key: 'Medium', pct: 60 },
    { label: 'High', key: 'High', pct: 90 },
  ];

  const s = StyleSheet.create({
    root: { backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 80 },
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
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      marginBottom: 12,
    },
    scheduleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    scheduleTime: { color: theme.text, fontSize: 22, fontWeight: '700', flex: 1 },
    deleteBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: 'rgba(239,68,68,0.15)',
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    deleteBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
    scheduleInfo: { color: theme.subText, fontSize: 13, marginBottom: 4 },
    scheduleReciter: { color: theme.subText, fontSize: 12 },
    badgeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    badge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 20,
      backgroundColor: theme.accentSoft,
    },
    badgeText: { color: theme.accent, fontSize: 11, fontWeight: '600' },
    controlsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 },
    playBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: theme.emeraldSoft,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: theme.emerald,
    },
    playBtnText: { color: theme.emerald, fontSize: 14 },
    emptyCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 32,
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyText: { color: theme.subText, fontSize: 14, marginBottom: 16 },
    addFirstBtn: {
      backgroundColor: theme.accentSoft,
      borderWidth: 1,
      borderColor: theme.accent,
      borderRadius: 24,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    addFirstBtnText: { color: theme.accent, fontSize: 15, fontWeight: '700' },
    sectionLabel: {
      color: theme.subText,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginBottom: 8,
    },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    optBtn: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
    },
    optBtnText: { fontSize: 13, fontWeight: '600' },
    input: {
      backgroundColor: theme.cardAlt,
      borderWidth: 1,
      borderColor: theme.divider,
      borderRadius: 8,
      color: theme.text,
      fontSize: 16,
      paddingHorizontal: 12,
      paddingVertical: 10,
      marginBottom: 14,
    },
    formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
    saveBtn: {
      flex: 1,
      backgroundColor: theme.emeraldSoft,
      borderWidth: 1,
      borderColor: theme.emerald,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    saveBtnText: { color: theme.emerald, fontSize: 15, fontWeight: '700' },
    cancelBtn: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.divider,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelBtnText: { color: theme.subText, fontSize: 15, fontWeight: '600' },
    fab: {
      position: 'absolute',
      bottom: 20,
      right: 20,
      width: 54,
      height: 54,
      borderRadius: 27,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 6,
    },
    fabText: { color: '#080F19', fontSize: 28, fontWeight: '700', lineHeight: 30 },
  });

  return (
    <>
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        {/* Header */}
        <View style={s.chipWrap}>
          <View style={s.chip}>
            <Text style={s.chipText}>Recitation Alarm</Text>
          </View>
        </View>
        <Text style={s.title}>Recitation Alarm</Text>
        <Text style={s.subtitle}>Schedule Quran recitation with time and repeat</Text>

        {/* Schedule List */}
        {schedules.length === 0 && !showForm ? (
          <View style={s.emptyCard}>
            <Text style={s.emptyText}>No schedules yet</Text>
            <TouchableOpacity style={s.addFirstBtn} onPress={() => setShowForm(true)}>
              <Text style={s.addFirstBtnText}>+ Create First Schedule</Text>
            </TouchableOpacity>
          </View>
        ) : (
          schedules.map((sched) => {
            const isPlaying = playingId === sched.id;
            return (
              <View
                key={sched.id}
                style={[
                  s.card,
                  !sched.enabled && { opacity: 0.5 },
                ]}
              >
                <View style={s.scheduleHeader}>
                  <Text style={s.scheduleTime}>{sched.time}</Text>
                  <Switch
                    value={sched.enabled}
                    onValueChange={() => toggleEnabled(sched.id)}
                    trackColor={{ false: theme.divider, true: theme.emeraldSoft }}
                    thumbColor={sched.enabled ? theme.emerald : theme.subText}
                  />
                  <TouchableOpacity style={s.deleteBtn} onPress={() => deleteSchedule(sched.id)}>
                    <Text style={s.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={s.scheduleInfo}>{surahSummary(sched.surahs)}</Text>
                <Text style={s.scheduleReciter}>Reciter: {sched.reciter}</Text>

                <View style={s.badgeRow}>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{sched.repeat}</Text>
                  </View>
                  <View style={[s.badge, { backgroundColor: theme.emeraldSoft }]}>
                    <Text style={[s.badgeText, { color: theme.emerald }]}>{sched.volume}</Text>
                  </View>
                </View>

                <View style={s.controlsRow}>
                  <TouchableOpacity
                    style={s.playBtn}
                    onPress={() => setPlayingId(isPlaying ? null : sched.id)}
                  >
                    <Text style={s.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
                  </TouchableOpacity>
                  <Text style={[s.scheduleReciter, { color: theme.subText }]}>
                    {isPlaying ? 'Now playing...' : 'Tap to preview'}
                  </Text>
                </View>
              </View>
            );
          })
        )}

        {/* Add Form */}
        {showForm && (
          <View style={s.card}>
            <Text style={[s.sectionLabel, { marginBottom: 12 }]}>New Recitation Schedule</Text>

            <Text style={s.sectionLabel}>Surahs</Text>
            <View style={s.row}>
              {QUICK_PICK_SURAHS.map((num) => {
                const active = formSurahs.includes(num);
                return (
                  <TouchableOpacity
                    key={num}
                    style={[
                      s.optBtn,
                      {
                        backgroundColor: active ? theme.emeraldSoft : theme.cardAlt,
                        borderColor: active ? theme.emerald : theme.divider,
                      },
                    ]}
                    onPress={() => toggleFormSurah(num)}
                  >
                    <Text style={[s.optBtnText, { color: active ? theme.emerald : theme.subText }]}>
                      {SURAH_NAMES[num]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.sectionLabel}>Time (HH:MM)</Text>
            <TextInput
              style={s.input}
              value={formTime}
              onChangeText={setFormTime}
              placeholder="06:00"
              placeholderTextColor={theme.subText}
              keyboardType="numbers-and-punctuation"
              maxLength={5}
            />

            <Text style={s.sectionLabel}>Repeat</Text>
            <View style={s.row}>
              {REPEATS.map((r) => {
                const active = formRepeat === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      s.optBtn,
                      {
                        backgroundColor: active ? theme.emeraldSoft : theme.cardAlt,
                        borderColor: active ? theme.emerald : theme.divider,
                      },
                    ]}
                    onPress={() => setFormRepeat(r)}
                  >
                    <Text style={[s.optBtnText, { color: active ? theme.emerald : theme.subText }]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.sectionLabel}>Reciter</Text>
            <View style={s.row}>
              {RECITERS.map((r) => {
                const active = formReciter === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[
                      s.optBtn,
                      {
                        backgroundColor: active ? theme.accentSoft : theme.cardAlt,
                        borderColor: active ? theme.accent : theme.divider,
                      },
                    ]}
                    onPress={() => setFormReciter(r)}
                  >
                    <Text style={[s.optBtnText, { color: active ? theme.accent : theme.subText }]}>{r}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={s.sectionLabel}>Volume</Text>
            <View style={s.row}>
              {VOLUMES.map((v) => {
                const active = formVolume === v.key;
                return (
                  <TouchableOpacity
                    key={v.key}
                    style={[
                      s.optBtn,
                      {
                        backgroundColor: active ? theme.accentSoft : theme.cardAlt,
                        borderColor: active ? theme.accent : theme.divider,
                      },
                    ]}
                    onPress={() => setFormVolume(v.key)}
                  >
                    <Text style={[s.optBtnText, { color: active ? theme.accent : theme.subText }]}>
                      {v.label} ({v.pct}%)
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.formActions}>
              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => {
                  setShowForm(false);
                  resetForm();
                }}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={addSchedule}>
                <Text style={s.saveBtnText}>Save Schedule</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      {!showForm && (
        <TouchableOpacity
          style={s.fab}
          onPress={() => setShowForm(true)}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </>
  );
}
