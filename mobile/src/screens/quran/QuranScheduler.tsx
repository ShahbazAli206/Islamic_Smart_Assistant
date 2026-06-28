import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch,
  StyleSheet, Dimensions,
} from 'react-native';
import { Quran } from '../../api/endpoints';

const { width: SW } = Dimensions.get('window');

// ─── Design palette (light mode) ─────────────────────────────────────────────
const BG       = '#FFFFFF';
const CARD     = '#FFFFFF';
const EMERALD  = '#10B981';
const GOLD     = '#DDB94B';
const PURPLE   = '#8B5CF6';
const TEXT     = '#0B1410';
const SUBTEXT  = '#5C5A50';
const DIVIDER  = '#E5E4DA';
const BG_SOFT  = '#F8F9FA';
const GREEN_D  = '#0D3320';

// ─── Sample schedule data ──────────────────────────────────────────────────────
const SAMPLE_SCHEDULES = [
  {
    id: '1', surah: 'Surah Yaseen', detail: 'With Translation',
    date: '24 May, 2025', time: '06:00 AM', repeat: 'Daily', enabled: true,
  },
  {
    id: '2', surah: 'Surah Al-Mulk', detail: 'Without Translation',
    date: '25 May, 2025', time: '10:30 PM', repeat: 'Weekly', enabled: true,
  },
  {
    id: '3', surah: 'Surah Ar-Rahman', detail: 'With Translation',
    date: '26 May, 2025', time: '08:00 AM', repeat: 'Daily', enabled: false,
  },
];

const SURAH_OPTIONS = ['Al-Fatiha', 'Ya-Sin', 'Ar-Rahman', 'Al-Mulk', 'Al-Kahf'];
const REPEAT_OPTIONS = ['Daily', 'Weekly', 'Monthly', 'Once'];
const VOLUME_LEVELS = [20, 40, 60, 80, 100];

const BENEFITS = [
  { icon: '❤️', color: '#EF4444', title: 'Brings Peace to the Heart', desc: 'Regular Quran recitation brings inner peace and tranquility.' },
  { icon: '⭐', color: GOLD,      title: 'Rewards Multiplied Every Connection', desc: 'Each letter of the Quran brings 10 rewards.' },
  { icon: '🛡️', color: '#3B82F6', title: 'Strengthen Iman and Connection', desc: 'Increases faith and connection with Allah.' },
  { icon: '📖', color: EMERALD,   title: 'Guidance for Daily Life', desc: 'Quran is the ultimate guide for every Muslim.' },
];

export function QuranSchedulerScreen() {
  const [schedules,  setSchedules]  = useState(SAMPLE_SCHEDULES);
  const [selSurah,   setSelSurah]   = useState('Ya-Sin');
  const [selRepeat,  setSelRepeat]  = useState('Daily');
  const [selVolume,  setSelVolume]  = useState(80);
  const [withTrans,  setWithTrans]  = useState(true);
  const [selDate,    setSelDate]    = useState('24 May, 2025');

  useEffect(() => {
    Quran.schedules()
      .then(data => { if (data?.length) setSchedules(data); })
      .catch(() => {});
  }, []);

  const toggleSchedule = (id: string) => {
    setSchedules(prev =>
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
  };

  return (
    <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>

      {/* ── Top decorative header ── */}
      <View style={S.heroBanner}>
        <View style={S.heroOverlay} />
        <View style={S.heroDecoLeft} />
        <View style={S.heroDecoRight} />
        <View style={S.heroContent}>
          <Text style={S.heroTitle}>Quran Recitation Schedule</Text>
          <Text style={S.heroArabic}>
            {'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ'}
          </Text>
          <Text style={S.heroEn}>Verify, in the remembrance of Allah do hearts find rest.</Text>
          <Text style={S.heroRef}>Surah Ar-Ra'd (13:28)</Text>
        </View>
      </View>

      {/* ── Create New Schedule ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Create New Schedule</Text>
        <View style={S.createCard}>

          {/* Surah selector */}
          <View style={S.formRow}>
            <View style={S.formIconBox}>
              <Text style={{ fontSize: 16 }}>📖</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Select Surah</Text>
              <Text style={S.formValue}>{selSurah}</Text>
            </View>
            <View style={S.formDividerV} />
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Recitation</Text>
              <Text style={S.formValue}>{withTrans ? 'With Translation' : 'No Translation'}</Text>
            </View>
            <Text style={S.formArrow}>›</Text>
          </View>

          {/* Surah quick select */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.surahChipRow}>
            {SURAH_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[S.surahChip, selSurah === opt && S.surahChipActive]}
                onPress={() => setSelSurah(opt)}
              >
                <Text style={[S.surahChipText, selSurah === opt && S.surahChipTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={S.formDividerH} />

          {/* Date row */}
          <View style={S.formRow}>
            <View style={S.formIconBox}>
              <Text style={{ fontSize: 16 }}>📅</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Date</Text>
              <Text style={S.formValue}>{selDate}</Text>
            </View>
            <View style={S.formDividerV} />
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Repeat</Text>
              <Text style={S.formValue}>{selRepeat}</Text>
            </View>
            <Text style={S.formArrow}>›</Text>
          </View>

          {/* Repeat quick select */}
          <View style={S.repeatRow}>
            {REPEAT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[S.repeatBtn, selRepeat === opt && S.repeatBtnActive]}
                onPress={() => setSelRepeat(opt)}
              >
                <Text style={[S.repeatBtnText, selRepeat === opt && S.repeatBtnTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={S.formDividerH} />

          {/* Test Volume */}
          <View style={S.formRow}>
            <View style={S.formIconBox}>
              <Text style={{ fontSize: 16 }}>🔊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.formLabel}>Test Volume</Text>
              <Text style={S.formValue}>{selVolume}%</Text>
            </View>
            <Text style={S.formSub}>Listen to test the selected volume</Text>
          </View>
          {/* Volume bar */}
          <View style={S.volumeBarBg}>
            <View style={[S.volumeBarFill, { width: `${selVolume}%` as any }]} />
            <View style={[S.volumeThumb, { left: `${selVolume}%` as any }]} />
          </View>

          {/* Save button */}
          <TouchableOpacity style={S.saveBtn}>
            <Text style={S.saveBtnText}>Save Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Your Schedules ── */}
      <View style={S.section}>
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>Your Schedules</Text>
          <TouchableOpacity><Text style={S.viewAll}>View All</Text></TouchableOpacity>
        </View>
        {schedules.map(sch => (
          <View key={sch.id} style={S.scheduleCard}>
            <View style={S.scheduleLeft}>
              <View style={S.scheduleIconBox}>
                <Text style={{ fontSize: 18 }}>📖</Text>
              </View>
              <View>
                <Text style={S.scheduleSurah}>{sch.surah}</Text>
                <Text style={S.scheduleDetail}>{sch.detail}</Text>
                <Text style={S.scheduleMeta}>{sch.date}  ·  {sch.time}  ·  {sch.repeat}</Text>
              </View>
            </View>
            <Switch
              value={sch.enabled}
              onValueChange={() => toggleSchedule(sch.id)}
              trackColor={{ false: DIVIDER, true: EMERALD + '80' }}
              thumbColor={sch.enabled ? EMERALD : '#999'}
            />
          </View>
        ))}
      </View>

      {/* ── Benefits of Listening to Quran ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Benefits of Listening to Quran</Text>
        <View style={S.benefitsGrid}>
          {BENEFITS.map((b, i) => (
            <View key={i} style={S.benefitCard}>
              <View style={[S.benefitIconBox, { backgroundColor: b.color + '20' }]}>
                <Text style={{ fontSize: 22 }}>{b.icon}</Text>
              </View>
              <Text style={S.benefitTitle}>{b.title}</Text>
              <Text style={S.benefitDesc}>{b.desc}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 48 },

  // ── Hero banner ───────────────────────────────────────────────────────────
  heroBanner: {
    position: 'relative', backgroundColor: '#EAF7F0',
    overflow: 'hidden', marginBottom: 0,
  },
  heroOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  heroDecoLeft: {
    position: 'absolute', top: -20, left: -30,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  heroDecoRight: {
    position: 'absolute', bottom: -10, right: -20,
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.10)',
  },
  heroContent: { padding: 24, paddingTop: 28 },
  heroTitle:   { color: GREEN_D, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  heroArabic:  { color: TEXT,    fontSize: 16, fontWeight: '700', textAlign: 'center', lineHeight: 26, marginBottom: 8 },
  heroEn:      { color: SUBTEXT, fontSize: 12, textAlign: 'center', lineHeight: 18, marginBottom: 4 },
  heroRef:     { color: EMERALD, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  // ── Section ───────────────────────────────────────────────────────────────
  section:      { paddingHorizontal: 16, marginTop: 24, marginBottom: 0 },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: '700', marginBottom: 0 },
  viewAll:      { color: EMERALD, fontSize: 13, fontWeight: '600' },

  // ── Create card ───────────────────────────────────────────────────────────
  createCard: {
    backgroundColor: CARD, borderRadius: 18,
    borderWidth: 1, borderColor: DIVIDER,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
    overflow: 'hidden', marginTop: 12,
  },
  formRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  formIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: EMERALD + '15', alignItems: 'center', justifyContent: 'center',
  },
  formLabel:   { color: SUBTEXT, fontSize: 10, fontWeight: '600', marginBottom: 2 },
  formValue:   { color: TEXT,    fontSize: 14, fontWeight: '600' },
  formDividerV: { width: 1, height: 32, backgroundColor: DIVIDER },
  formDividerH: { height: 1, backgroundColor: DIVIDER, marginHorizontal: 0 },
  formArrow:    { color: SUBTEXT, fontSize: 20 },
  formSub:      { color: SUBTEXT, fontSize: 11, flex: 1 },

  surahChipRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  surahChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: BG_SOFT, borderRadius: 20,
    borderWidth: 1, borderColor: DIVIDER,
  },
  surahChipActive:    { backgroundColor: EMERALD, borderColor: EMERALD },
  surahChipText:      { color: SUBTEXT, fontSize: 12, fontWeight: '600' },
  surahChipTextActive: { color: '#FFFFFF' },

  repeatRow: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 8 },
  repeatBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 8,
    backgroundColor: BG_SOFT, borderRadius: 10,
    borderWidth: 1, borderColor: DIVIDER,
  },
  repeatBtnActive:    { backgroundColor: EMERALD, borderColor: EMERALD },
  repeatBtnText:      { color: SUBTEXT, fontSize: 12, fontWeight: '600' },
  repeatBtnTextActive: { color: '#FFFFFF' },

  volumeBarBg: {
    height: 4, backgroundColor: DIVIDER,
    marginHorizontal: 16, borderRadius: 2,
    marginTop: 4, marginBottom: 6, position: 'relative',
  },
  volumeBarFill: {
    height: '100%', backgroundColor: EMERALD,
    borderRadius: 2,
  },
  volumeThumb: {
    position: 'absolute', top: -6,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: EMERALD,
    borderWidth: 2, borderColor: '#FFFFFF',
    transform: [{ translateX: -8 }],
  },
  saveBtn: {
    backgroundColor: EMERALD,
    margin: 16, marginTop: 20,
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: EMERALD, shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // ── Schedule cards ────────────────────────────────────────────────────────
  scheduleCard: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: CARD, borderRadius: 14,
    borderWidth: 1, borderColor: DIVIDER,
    padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  scheduleLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  scheduleIconBox: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: EMERALD + '18', alignItems: 'center', justifyContent: 'center',
  },
  scheduleSurah:  { color: TEXT,    fontSize: 15, fontWeight: '700', marginBottom: 2 },
  scheduleDetail: { color: SUBTEXT, fontSize: 11, marginBottom: 3 },
  scheduleMeta:   { color: SUBTEXT, fontSize: 10 },

  // ── Benefits grid ─────────────────────────────────────────────────────────
  benefitsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  benefitCard: {
    width: (SW - 44) / 2,
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: DIVIDER, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  benefitIconBox: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  benefitTitle: { color: TEXT,    fontSize: 13, fontWeight: '700', marginBottom: 5, lineHeight: 18 },
  benefitDesc:  { color: SUBTEXT, fontSize: 11, lineHeight: 16 },
});
