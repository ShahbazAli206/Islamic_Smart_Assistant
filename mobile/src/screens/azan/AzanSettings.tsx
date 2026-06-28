import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Dimensions, Animated,
} from 'react-native';
import { Azan } from '../../api/endpoints';

const { width: SW } = Dimensions.get('window');

// ─── Design palette (always dark) ───────────────────────────────────────────
const BG        = '#080F19';
const CARD      = '#0E1B2A';
const CARD2     = '#111F30';
const EMERALD   = '#10B981';
const GOLD      = '#DDB94B';
const WHITE     = '#FFFFFF';
const WHITE70   = 'rgba(255,255,255,0.70)';
const WHITE20   = 'rgba(255,255,255,0.20)';
const WHITE10   = 'rgba(255,255,255,0.10)';
const ONLINE_G  = '#22C55E';
const OFFLINE_G = '#6B7280';
const RED       = '#EF4444';
const PURPLE    = '#8B5CF6';

// ─── Voice data ──────────────────────────────────────────────────────────────
const DEFAULT_VOICES = [
  { id: 'misharyalfasy',        name: 'Sheikh Mishary\nRashid Alafasy',   lang: 'Arabic', country: 'Makkah, Saudi Arabia',    duration: '2:45', online: true,  flag: '🇸🇦' },
  { id: 'abdulbasit',           name: 'Sheikh Abdul\nBasit Abdul Samad',  lang: 'Arabic', country: 'Cairo, Egypt',             duration: '3:12', online: false, flag: '🇸🇦' },
  { id: 'mehmetemin',           name: 'Mehmet Emin\nAyla',                lang: 'Turkish', country: 'Istanbul, Turkey',        duration: '2:58', online: true,  flag: '🇹🇷' },
  { id: 'abubakrshatri',        name: 'Sheikh\nAbu Bakr Shatri',          lang: 'Urdu',   country: 'Karachi, Pakistan',        duration: '3:30', online: false, flag: '🇵🇰' },
  { id: 'abdullahjuhany',       name: 'Abdullah\nAl-Juhany',              lang: 'Arabic', country: 'Medina, Saudi Arabia',     duration: '2:45', online: true,  flag: '🇸🇦' },
  { id: 'imamsalahahmed',       name: 'Imam\nSalah Ahmed',                lang: 'English', country: 'New York, USA',           duration: '2:37', online: true,  flag: '🇺🇸' },
];

const LANGUAGES = ['All Languages', 'Arabic', 'Urdu', 'Turkish', 'English'];
const STYLES    = ['All Styles', 'Classic', 'Melodious', 'Traditional'];

// ─── Mosque hero silhouette ──────────────────────────────────────────────────
function HeroBg() {
  return (
    <View style={hero.wrap}>
      {/* Sky gradient layers */}
      <View style={[hero.layer, { backgroundColor: '#1A2A4A', height: 80 }]} />
      <View style={[hero.layer, { backgroundColor: '#0F1E38', height: 140, top: 40 }]} />
      <View style={[hero.layer, { backgroundColor: '#060E1C', height: 200, top: 0 }]} />
      {/* Stars */}
      {([
        [40, 20, 2], [90, 35, 1.5], [SW - 60, 15, 2],
        [SW - 110, 40, 1.5], [SW / 2, 8, 1], [170, 50, 1],
        [260, 25, 1.5], [SW - 170, 55, 1],
      ] as [number, number, number][]).map(([left, top, size], i) => (
        <View key={i} style={{
          position: 'absolute', top, left,
          width: size, height: size, borderRadius: size / 2,
          backgroundColor: 'rgba(255,255,255,0.8)',
        }} />
      ))}
      {/* Crescent */}
      <View style={hero.moonOuter}>
        <View style={hero.moonInner} />
      </View>
      {/* Mosque shapes */}
      <View style={hero.mosqueBase} />
      <View style={hero.mainDome} />
      <View style={hero.minaretL} />
      <View style={hero.minaretR} />
      <View style={hero.minaretDomeL} />
      <View style={hero.minaretDomeR} />
    </View>
  );
}

const hero = StyleSheet.create({
  wrap:        { width: SW, height: 200, position: 'relative', overflow: 'hidden' },
  layer:       { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  moonOuter:   { position: 'absolute', top: 22, right: 55, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(221,185,75,0.85)' },
  moonInner:   { position: 'absolute', top: -4, right: -9, width: 26, height: 26, borderRadius: 13, backgroundColor: '#080F19' },
  mosqueBase:  { position: 'absolute', bottom: 0, left: SW / 2 - 70, width: 140, height: 55, backgroundColor: 'rgba(255,255,255,0.08)' },
  mainDome:    { position: 'absolute', bottom: 55, left: SW / 2 - 45, width: 90, height: 48, borderTopLeftRadius: 45, borderTopRightRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)' },
  minaretL:    { position: 'absolute', bottom: 0, left: SW / 2 - 90, width: 11, height: 85, backgroundColor: 'rgba(255,255,255,0.08)' },
  minaretR:    { position: 'absolute', bottom: 0, right: SW / 2 - 90, width: 11, height: 85, backgroundColor: 'rgba(255,255,255,0.08)' },
  minaretDomeL: { position: 'absolute', bottom: 85, left: SW / 2 - 90, width: 11, height: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
  minaretDomeR: { position: 'absolute', bottom: 85, right: SW / 2 - 90, width: 11, height: 8, borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)' },
});

// ─── Voice card ──────────────────────────────────────────────────────────────
function VoiceCard({
  voice, selected, onSelect, onPlay,
}: {
  voice: typeof DEFAULT_VOICES[0];
  selected: boolean;
  onSelect: () => void;
  onPlay: () => void;
}) {
  return (
    <View style={[vc.card, selected && vc.cardActive]}>
      {/* Status + flag */}
      <View style={vc.topRow}>
        <View style={vc.flagRow}>
          <Text style={vc.flag}>{voice.flag}</Text>
          <Text style={vc.lang}>{voice.lang}</Text>
        </View>
        <View style={[vc.onlineBadge, { backgroundColor: voice.online ? ONLINE_G + '30' : OFFLINE_G + '30' }]}>
          <View style={[vc.onlineDot, { backgroundColor: voice.online ? ONLINE_G : OFFLINE_G }]} />
          <Text style={[vc.onlineText, { color: voice.online ? ONLINE_G : OFFLINE_G }]}>
            {voice.online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity onPress={onSelect}>
          <Text style={{ color: selected ? GOLD : WHITE20, fontSize: 18 }}>♥</Text>
        </TouchableOpacity>
      </View>

      {/* Play button area */}
      <TouchableOpacity style={vc.playArea} onPress={onPlay}>
        <View style={vc.avatarCircle}>
          <Text style={{ fontSize: 26 }}>🎙</Text>
        </View>
        <View style={vc.playBtnOuter}>
          <View style={vc.playBtn}>
            <Text style={vc.playIcon}>▶</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Name + location */}
      <Text style={vc.name}>{voice.name}</Text>
      <Text style={vc.country}>{voice.country}</Text>

      {/* Duration */}
      <Text style={vc.duration}>{voice.duration}</Text>

      {/* Action icons row */}
      <View style={vc.actionsRow}>
        <TouchableOpacity style={vc.actionBtn}><Text style={{ fontSize: 14 }}>⬇</Text></TouchableOpacity>
        <TouchableOpacity style={vc.actionBtn}><Text style={{ fontSize: 14 }}>✏️</Text></TouchableOpacity>
        <TouchableOpacity style={vc.actionBtn}><Text style={{ fontSize: 14 }}>⭐</Text></TouchableOpacity>
        <TouchableOpacity style={[vc.actionBtn, selected && { backgroundColor: EMERALD }]}>
          <Text style={{ fontSize: 12 }}>{selected ? '✓' : '○'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={vc.actionBtn}><Text style={{ fontSize: 14 }}>🗑</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const vc = StyleSheet.create({
  card: {
    width: (SW - 48) / 2, backgroundColor: CARD,
    borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: WHITE10,
  },
  cardActive: { borderColor: GOLD + '60', backgroundColor: '#1A1508' },
  topRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  flagRow:    { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  flag:       { fontSize: 14 },
  lang:       { color: WHITE70, fontSize: 10, fontWeight: '600' },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  onlineDot:  { width: 5, height: 5, borderRadius: 3 },
  onlineText: { fontSize: 9, fontWeight: '700' },
  playArea:   { alignItems: 'center', marginBottom: 10, position: 'relative' },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#1A3A2A',
    alignItems: 'center', justifyContent: 'center',
  },
  playBtnOuter: {
    position: 'absolute', bottom: -10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center',
  },
  playIcon:   { color: WHITE, fontSize: 11, marginLeft: 2 },
  name:       { color: WHITE, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 14, marginBottom: 2 },
  country:    { color: WHITE70, fontSize: 9, textAlign: 'center', marginBottom: 4 },
  duration:   { color: GOLD, fontSize: 10, fontWeight: '600', textAlign: 'center', marginBottom: 8 },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: WHITE10, alignItems: 'center', justifyContent: 'center',
  },
});

// ─── Mini player bar ──────────────────────────────────────────────────────────
function MiniPlayer({ voice }: { voice: typeof DEFAULT_VOICES[0] }) {
  const [playing, setPlaying] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (playing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      anim.stopAnimation();
    }
  }, [playing]);

  return (
    <View style={mp.bar}>
      <View style={mp.iconBox}>
        <Text style={{ fontSize: 18 }}>🎙</Text>
      </View>
      <View style={{ flex: 1, marginHorizontal: 10 }}>
        <Text style={mp.name}>{voice.name.replace('\n', ' ')}</Text>
        {/* Waveform bars */}
        <View style={mp.waveRow}>
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={[mp.waveLine, { height: playing ? (i % 3 === 0 ? 12 : i % 2 === 0 ? 8 : 5) : 4 }]} />
          ))}
        </View>
        <Text style={mp.duration}>{voice.duration}</Text>
      </View>
      {/* Controls */}
      <TouchableOpacity style={mp.ctrlBtn}><Text style={mp.ctrlIcon}>⏮</Text></TouchableOpacity>
      <TouchableOpacity style={mp.playBtn} onPress={() => setPlaying(!playing)}>
        <Text style={mp.playIcon}>{playing ? '⏸' : '▶'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={mp.ctrlBtn}><Text style={mp.ctrlIcon}>⏭</Text></TouchableOpacity>
      <TouchableOpacity style={mp.ctrlBtn}><Text style={mp.ctrlIcon}>🔊</Text></TouchableOpacity>
    </View>
  );
}

const mp = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#0A1628', borderTopWidth: 1, borderTopColor: WHITE10,
    paddingHorizontal: 16, paddingVertical: 10, paddingBottom: 24,
  },
  iconBox: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  name:    { color: WHITE, fontSize: 12, fontWeight: '600', marginBottom: 3 },
  waveRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  waveLine: { width: 2, backgroundColor: EMERALD, borderRadius: 1 },
  duration: { color: WHITE70, fontSize: 10 },
  ctrlBtn:  { padding: 6 },
  ctrlIcon: { color: WHITE70, fontSize: 16 },
  playBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4,
  },
  playIcon: { color: WHITE, fontSize: 14 },
});

// ─── Main screen ─────────────────────────────────────────────────────────────
export function AzanSettingsScreen() {
  const [voices,      setVoices]      = useState(DEFAULT_VOICES);
  const [selected,    setSelected]    = useState('misharyalfasy');
  const [autoAzan,    setAutoAzan]    = useState(true);
  const [search,      setSearch]      = useState('');
  const [langFilter,  setLangFilter]  = useState('All Languages');
  const [styleFilter, setStyleFilter] = useState('All Styles');

  useEffect(() => {
    Azan.voices().then(v => { if (v?.length) setVoices(v); }).catch(() => {});
  }, []);

  const filtered = voices.filter(v => {
    const q = search.toLowerCase();
    if (q && !v.name.toLowerCase().includes(q)) return false;
    if (langFilter !== 'All Languages' && v.lang !== langFilter) return false;
    return true;
  });

  const selectedVoice = voices.find(v => v.id === selected) ?? voices[0];

  // Pair voices into rows of 2
  const rows: (typeof DEFAULT_VOICES)[] = [];
  for (let i = 0; i < filtered.length; i += 2) {
    rows.push(filtered.slice(i, i + 2));
  }

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>

        {/* ── Mosque hero ── */}
        <HeroBg />

        {/* ── Header row ── */}
        <View style={S.pageHeader}>
          <View>
            <Text style={S.pageTitle}>Azan Voices</Text>
            <Text style={S.pageSub}>Beautiful voices for the call to prayer</Text>
          </View>
          <View style={S.headerActions}>
            <TouchableOpacity style={S.uploadBtn}>
              <Text style={{ fontSize: 13 }}>⬆</Text>
              <Text style={S.uploadText}>Upload Azan</Text>
            </TouchableOpacity>
            <View style={S.autoRow}>
              <Text style={S.autoLabel}>Auto Azan</Text>
              <Switch
                value={autoAzan}
                onValueChange={setAutoAzan}
                trackColor={{ false: WHITE20, true: EMERALD + '80' }}
                thumbColor={autoAzan ? EMERALD : '#666'}
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </View>
        </View>

        {/* ── Search bar ── */}
        <View style={S.searchWrap}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search by voice, reciter or style..."
            placeholderTextColor={WHITE70}
            value={search}
            onChangeText={setSearch}
          />
          <Text style={{ fontSize: 14, color: WHITE70 }}>🎙</Text>
        </View>

        {/* ── Filter chips ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterRow}>
          {LANGUAGES.slice(0, 3).map(lang => (
            <TouchableOpacity
              key={lang}
              style={[S.filterChip, langFilter === lang && S.filterChipActive]}
              onPress={() => setLangFilter(lang)}
            >
              <Text style={[S.filterChipText, langFilter === lang && S.filterChipTextActive]}>
                {lang} ▾
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={S.filterChip}>
            <Text style={S.filterChipText}>Sort by Default ▾</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.filterChip}><Text style={S.filterChipText}>⊞</Text></TouchableOpacity>
          <TouchableOpacity style={S.filterChip}><Text style={S.filterChipText}>⊟</Text></TouchableOpacity>
        </ScrollView>

        {/* ── Customize Your Azan promo ── */}
        <View style={S.promoCard}>
          <View style={{ flex: 1 }}>
            <Text style={S.promoTitle}>Customize Your Azan</Text>
            <Text style={S.promoSub}>
              Upload, edit and personalize Azan.{'\n'}
              Add your own intro, outro, or post-Azan{'\n'}
              prayers and set as default.
            </Text>
            <TouchableOpacity style={S.learnBtn}>
              <Text style={S.learnText}>Learn More ›</Text>
            </TouchableOpacity>
          </View>
          {/* Part icons */}
          <View style={S.promoIcons}>
            {[{ icon: '🎙', label: 'Intro' }, { icon: '🔊', label: 'Azan' }, { icon: '🎵', label: 'Durod' }, { icon: '🎶', label: 'Outro' }].map(p => (
              <View key={p.label} style={S.promoIcon}>
                <View style={S.promoIconBg}>
                  <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                </View>
                <Text style={S.promoIconLabel}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Voice grid ── */}
        <View style={S.section}>
          {rows.map((row, ri) => (
            <View key={ri} style={S.voiceRow}>
              {row.map(voice => (
                <VoiceCard
                  key={voice.id}
                  voice={voice}
                  selected={selected === voice.id}
                  onSelect={() => setSelected(voice.id)}
                  onPlay={() => setSelected(voice.id)}
                />
              ))}
            </View>
          ))}
        </View>

        {/* ── Tips + Custom Azans ── */}
        <View style={S.bottomRow}>
          <View style={[S.tipsCard, { flex: 1, marginRight: 8 }]}>
            <Text style={S.tipsTitle}>Tips</Text>
            {[
              'Auto Azan will play at the exact 5 prayer times',
              'Requires good internet for streaming voices',
              'Download for offline high quality playback',
            ].map((tip, i) => (
              <View key={i} style={S.tipRow}>
                <View style={S.tipDot} />
                <Text style={S.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={[S.customCard, { flex: 1 }]}>
            <Text style={S.customTitle}>Your Custom Azans</Text>
            <Text style={S.customSub}>Create and manage your personalized Azan collections.</Text>
            <View style={S.customArrow}>
              <Text style={{ color: WHITE, fontSize: 16 }}>›</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── Mini player (pinned at bottom) ── */}
      {selectedVoice && <MiniPlayer voice={selectedVoice} />}
    </View>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 20 },

  // ── Page header ───────────────────────────────────────────────────────────
  pageHeader: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  pageTitle:  { color: WHITE,   fontSize: 26, fontWeight: '800' },
  pageSub:    { color: WHITE70, fontSize: 12, marginTop: 2 },
  headerActions: { alignItems: 'flex-end', gap: 8 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: WHITE20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  uploadText: { color: WHITE, fontSize: 12, fontWeight: '600' },
  autoRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  autoLabel:  { color: WHITE, fontSize: 13, fontWeight: '600' },

  // ── Search ────────────────────────────────────────────────────────────────
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: CARD, borderRadius: 12,
    borderWidth: 1, borderColor: WHITE20,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: WHITE, fontSize: 14 },

  // ── Filter chips ──────────────────────────────────────────────────────────
  filterRow: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: WHITE20,
  },
  filterChipActive:     { backgroundColor: EMERALD + '25', borderColor: EMERALD },
  filterChipText:       { color: WHITE70, fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: EMERALD },

  // ── Promo card ────────────────────────────────────────────────────────────
  promoCard: {
    marginHorizontal: 16, marginBottom: 20,
    backgroundColor: '#0A1E35',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: WHITE10,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  promoTitle: { color: WHITE, fontSize: 15, fontWeight: '700', marginBottom: 6 },
  promoSub:   { color: WHITE70, fontSize: 11, lineHeight: 17, marginBottom: 10 },
  learnBtn: {
    backgroundColor: EMERALD,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  learnText:       { color: WHITE, fontSize: 12, fontWeight: '700' },
  promoIcons:      { marginLeft: 12, gap: 8 },
  promoIcon:       { alignItems: 'center' },
  promoIconBg: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
    marginBottom: 3,
  },
  promoIconLabel: { color: WHITE70, fontSize: 9, fontWeight: '600' },

  // ── Section ───────────────────────────────────────────────────────────────
  section: { paddingHorizontal: 16, marginBottom: 20 },
  voiceRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },

  // ── Bottom tips & custom ──────────────────────────────────────────────────
  bottomRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 16 },
  tipsCard: {
    backgroundColor: CARD, borderRadius: 16,
    borderWidth: 1, borderColor: WHITE10, padding: 14,
  },
  tipsTitle:  { color: WHITE,   fontSize: 13, fontWeight: '700', marginBottom: 8 },
  tipRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 5 },
  tipDot:     { width: 5, height: 5, borderRadius: 3, backgroundColor: EMERALD, marginTop: 4, flexShrink: 0 },
  tipText:    { color: WHITE70, fontSize: 10, flex: 1, lineHeight: 15 },
  customCard: {
    backgroundColor: EMERALD + '20',
    borderRadius: 16, borderWidth: 1,
    borderColor: EMERALD + '40', padding: 14,
  },
  customTitle: { color: WHITE, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  customSub:   { color: WHITE70, fontSize: 10, lineHeight: 15, marginBottom: 10 },
  customArrow: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center',
  },
});
