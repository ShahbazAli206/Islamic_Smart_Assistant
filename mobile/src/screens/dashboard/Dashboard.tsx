import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { DateTime } from 'luxon';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { Prayer } from '../../api/endpoints';
import { RootState } from '../../store';

const { width: SW } = Dimensions.get('window');

// ─── Design palette (always dark) ───────────────────────────────────────────
const BG       = '#080F19';
const CARD     = '#0E1B2A';
const CARD_ALT = '#111F30';
const GREEN    = '#0D3320';
const EMERALD  = '#10B981';
const GOLD     = '#DDB94B';
const WHITE    = '#FFFFFF';
const WHITE70  = 'rgba(255,255,255,0.70)';
const WHITE20  = 'rgba(255,255,255,0.20)';
const WHITE10  = 'rgba(255,255,255,0.10)';
const RED      = '#EF4444';

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙', sunrise: '🌅', dhuhr: '☀️', asr: '🌤', maghrib: '🌇', isha: '🌃',
};
const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};

const QUICK_LINKS = [
  { key: 'Quran',         label: 'Quran',       icon: '📖', screen: 'Quran'         },
  { key: 'Qibla',         label: 'Qibla',       icon: '🧭', screen: 'Qibla'         },
  { key: 'AzanAlerts',    label: 'Azan Alerts', icon: '🔔', screen: 'Azan'          },
  { key: 'Recitation',    label: 'Recitation',  icon: '🎧', screen: 'QuranScheduler' },
];

const PRAYER_TOOLS = [
  { icon: '⏰', label: 'Prayer Times',       sub: 'All 5 times',    screen: 'Prayers'        },
  { icon: '📖', label: 'Quran &\nRecitation', sub: 'Read & Listen',  screen: 'Quran'          },
  { icon: '🧭', label: 'Qibla',              sub: 'Direction',      screen: 'Qibla'          },
  { icon: '📊', label: 'Analytics',          sub: 'Your progress',  screen: 'Analytics'      },
];

const MOCK_MOSQUES = [
  { id: '1', name: 'Jamia Masjid',               dist: '0.1 km' },
  { id: '2', name: 'Masjid-e-Rehmat',            dist: '0.5 km' },
  { id: '3', name: 'Peer Mehr Ali Shah Masjid',  dist: '1.0 km' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function localPrayerTimes(lat: number, lng: number, timezone: string) {
  const coords = new Coordinates(lat, lng);
  const params = CalculationMethod.MuslimWorldLeague();
  const date   = new Date();
  const pt     = new PrayerTimes(coords, date, params);
  return {
    timezone,
    fajr:    pt.fajr.toISOString(),
    sunrise: pt.sunrise.toISOString(),
    dhuhr:   pt.dhuhr.toISOString(),
    asr:     pt.asr.toISOString(),
    maghrib: pt.maghrib.toISOString(),
    isha:    pt.isha.toISOString(),
  };
}

function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

// ─── Mosque Silhouette (pure Views) ─────────────────────────────────────────
function MosqueSilhouette() {
  const c   = WHITE10;
  const sc  = SW;
  const cx  = sc / 2;

  // helpers
  const dome = (left: number, w: number, h: number, bottom: number) => (
    <View key={`d${left}`} style={{
      position: 'absolute', bottom, left,
      width: w, height: h,
      borderTopLeftRadius: w / 2, borderTopRightRadius: w / 2,
      backgroundColor: c,
    }} />
  );
  const rect = (left: number, w: number, h: number, bottom: number) => (
    <View key={`r${left}`} style={{
      position: 'absolute', bottom, left, width: w, height: h, backgroundColor: c,
    }} />
  );

  const bodyW  = 130;
  const bodyH  = 55;
  const domeW  = 90;
  const domeH  = 50;
  // minarets: [left, width, rectH]
  const minarets: [number, number, number][] = [
    [cx - bodyW / 2 - 20, 12, 80],
    [cx + bodyW / 2 + 8,  12, 80],
    [cx - bodyW / 2 + 15, 9,  55],
    [cx + bodyW / 2 - 24, 9,  55],
  ];

  return (
    <View style={{ width: sc, height: 140, position: 'relative' }}>
      {/* Base */}
      {rect(cx - bodyW / 2, bodyW, bodyH, 0)}
      {/* Main dome */}
      {dome(cx - domeW / 2, domeW, domeH, bodyH)}
      {/* Side small domes */}
      {dome(cx - bodyW / 2 + 10, 30, 18, bodyH)}
      {dome(cx + bodyW / 2 - 40, 30, 18, bodyH)}
      {/* Minarets */}
      {minarets.map(([left, w, h]) => [
        rect(left, w, h, 0),
        dome(left, w, w * 0.8, h),
      ])}
      {/* Crescent on main dome */}
      <Text style={{
        position: 'absolute',
        bottom: bodyH + domeH - 8,
        left: cx - 8,
        fontSize: 14,
        color: GOLD,
      }}>☽</Text>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const location   = useSelector((s: RootState) => s.user.location);
  const { t } = useTranslation();

  const [today,     setToday]     = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [now,        setNow]       = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const load = async () => {
    try {
      const data = await Prayer.today();
      setToday(data);
    } catch {
      if (location) setToday(localPrayerTimes(location.lat, location.lng, location.timezone));
    }
  };
  useEffect(() => { load(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const tz = location?.timezone ?? 'local';
  const prayerList = today
    ? PRAYERS.map(k => ({
        key:   k,
        label: PRAYER_LABELS[k],
        icon:  PRAYER_ICONS[k],
        dt:    DateTime.fromISO(today[k]).setZone(tz),
        date:  new Date(today[k]),
      }))
    : [];

  const nextIdx   = prayerList.findIndex(p => p.date > now);
  const nextPrayer = nextIdx >= 0 ? prayerList[nextIdx] : null;
  const countdown  = nextPrayer ? fmtCountdown(nextPrayer.date.getTime() - now.getTime()) : '--:--:--';

  const cityName  = location?.city ?? 'Your Location';
  const dateLabel = DateTime.now().setZone(tz).toFormat('d MMMM yyyy');

  // Progress: percentage of time elapsed between prev and next prayer
  let progress = 0.5;
  if (nextIdx > 0 && prayerList[nextIdx - 1]) {
    const prev  = prayerList[nextIdx - 1].date.getTime();
    const nxt   = nextPrayer!.date.getTime();
    const total = nxt - prev;
    const elapsed = now.getTime() - prev;
    progress = Math.min(1, Math.max(0, elapsed / total));
  }

  return (
    <ScrollView
      style={S.root}
      contentContainerStyle={S.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
    >
      {/* ── Mosque hero header ── */}
      <View style={S.heroSection}>
        {/* Stars */}
        {([
          [30, 22, 2], [80, 36, 1.5], [SW - 50, 18, 2],
          [SW - 100, 52, 1.5], [SW / 2, 10, 1], [160, 62, 1],
        ] as [number, number, number][]).map(([left, top, size], i) => (
          <View key={i} style={{
            position: 'absolute', top, left,
            width: size, height: size,
            borderRadius: size / 2,
            backgroundColor: 'rgba(255,255,255,0.75)',
          }} />
        ))}
        {/* Crescent moon */}
        <View style={S.moonOuter}>
          <View style={S.moonInner} />
        </View>
        <MosqueSilhouette />
      </View>

      {/* ── App header ── */}
      <View style={S.appBar}>
        <View style={S.appBarLeft}>
          <View style={S.logoBox}>
            <Text style={{ fontSize: 20 }}>🕌</Text>
          </View>
          <View>
            <Text style={S.appName}>Noor</Text>
            <Text style={S.appTagline}>Smart Assistant</Text>
          </View>
        </View>
        <TouchableOpacity style={S.bellWrap}>
          <Text style={{ fontSize: 22 }}>🔔</Text>
          <View style={S.bellDot} />
        </TouchableOpacity>
      </View>

      {/* ── Location + date ── */}
      <View style={S.locRow}>
        <View style={S.locChip}>
          <Text style={{ fontSize: 12 }}>📍</Text>
          <Text style={S.locText}>{cityName}</Text>
        </View>
        <Text style={S.dateText}>{dateLabel}</Text>
      </View>

      {/* ── Prayer countdown card ── */}
      <View style={S.countdownCard}>
        <Text style={S.nextLabel}>⏰ Next Prayer</Text>
        <Text style={S.prayerName}>{nextPrayer ? nextPrayer.label : '—'}</Text>
        <Text style={S.countdown}>{countdown}</Text>
        <Text style={S.prayerAt}>
          {nextPrayer ? nextPrayer.dt.toFormat('h:mm a') : '--:-- --'}
        </Text>
        {/* Progress bar */}
        <View style={S.progressBg}>
          <View style={[S.progressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
        <Text style={S.progressLabel}>Time remaining</Text>
      </View>

      {/* ── Prayer times horizontal row ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={S.prayerScroll}
        contentContainerStyle={S.prayerScrollInner}
      >
        {prayerList.map((p, i) => {
          const isNext = i === nextIdx;
          const isPast = p.date < now;
          return (
            <View key={p.key} style={[
              S.prayerPill,
              isNext && S.prayerPillActive,
              isPast && !isNext && S.prayerPillPast,
            ]}>
              <Text style={S.pillIcon}>{p.icon}</Text>
              <Text style={[S.pillName, isNext && S.pillNameActive, isPast && !isNext && S.pillNamePast]}>
                {p.label}
              </Text>
              <Text style={[S.pillTime, isNext && S.pillTimeActive]}>
                {p.dt.toFormat('h:mm a')}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Quick links ── */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={S.qlScroll}
        contentContainerStyle={S.qlRow}
      >
        {QUICK_LINKS.map(lnk => (
          <TouchableOpacity key={lnk.key} style={S.qlItem} onPress={() => navigation.navigate(lnk.screen)}>
            <View style={S.qlIconBox}>
              <Text style={{ fontSize: 22 }}>{lnk.icon}</Text>
            </View>
            <Text style={S.qlLabel}>{lnk.label}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={S.qlItem} onPress={() => navigation.navigate('More')}>
          <View style={S.qlIconBox}>
            <Text style={{ fontSize: 18, color: WHITE70 }}>⋯</Text>
          </View>
          <Text style={S.qlLabel}>View All</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Nearby Mosques ── */}
      <View style={S.section}>
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>Nearby Mosques</Text>
          <TouchableOpacity><Text style={S.viewAll}>View all</Text></TouchableOpacity>
        </View>
        {MOCK_MOSQUES.map(m => (
          <TouchableOpacity key={m.id} style={S.mosqueRow}>
            <View style={S.mosqueIconBox}>
              <Text style={{ fontSize: 20 }}>🕌</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={S.mosqueName}>{m.name}</Text>
              <Text style={S.mosqueDist}>{m.dist} away</Text>
            </View>
            <Text style={{ color: WHITE70, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Qibla Direction card ── */}
      <TouchableOpacity style={S.qiblaCard} onPress={() => navigation.navigate('Qibla')}>
        <View style={{ flex: 1 }}>
          <Text style={S.qiblaTitle}>Qibla Direction</Text>
          <Text style={S.qiblaDeg}>258°</Text>
          <Text style={S.qiblaDir}>West</Text>
        </View>
        {/* Mini compass */}
        <View style={S.miniCompassOuter}>
          <View style={S.miniCompassInner}>
            <Text style={[S.miniCardinal, { top: 4 }]}>N</Text>
            <Text style={[S.miniCardinal, { bottom: 4 }]}>S</Text>
            <Text style={[S.miniCardinal, { left: 4, top: '40%' }]}>W</Text>
            <Text style={[S.miniCardinal, { right: 4, top: '40%' }]}>E</Text>
            {/* Needle */}
            <View style={S.miniNeedleTip} />
            <View style={S.miniNeedleTail} />
            {/* Kaaba */}
            <Text style={S.miniKaaba}>🕋</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* ── Prayer Tools ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Prayer Tools</Text>
        <View style={S.toolsGrid}>
          {PRAYER_TOOLS.map(t => (
            <TouchableOpacity key={t.label} style={S.toolCard} onPress={() => navigation.navigate(t.screen)}>
              <Text style={S.toolIcon}>{t.icon}</Text>
              <Text style={S.toolLabel}>{t.label}</Text>
              <Text style={S.toolSub}>{t.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Recitation Alarm ── */}
      <TouchableOpacity style={S.recitCard} onPress={() => navigation.navigate('QuranScheduler')}>
        <View style={{ flex: 1 }}>
          <Text style={S.recitTitle}>Recitation Alarm</Text>
          <Text style={S.recitSub}>Set beautiful recitation alarms</Text>
        </View>
        <Text style={{ fontSize: 32 }}>🌙</Text>
        <Text style={{ fontSize: 28 }}>🎵</Text>
      </TouchableOpacity>

      {/* ── View of the Day ── */}
      <View style={S.ayahCard}>
        <Text style={S.ayahBadge}>View of the Day</Text>
        <Text style={S.ayahArabic}>
          {'وَأَقِمِ ٱلصَّلَوٰةَ ۖ إِنَّ ٱلصَّلَوٰةَ تَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ'}
        </Text>
        <Text style={S.ayahEn}>{t('quran.verseOfDay')}</Text>
        <Text style={S.ayahRef}>{t('quran.verseOfDayRef')}</Text>
      </View>

      {/* ── Upcoming Event ── */}
      <View style={S.eventCard}>
        <Text style={S.eventBadge}>Upcoming Event</Text>
        <View style={S.eventRow}>
          <View style={S.eventIconBox}>
            <Text style={{ fontSize: 28 }}>🌙</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={S.eventName}>Ashura</Text>
            <Text style={S.eventDesc}>The 10th of Muharram</Text>
            <Text style={S.eventDate}>In 5 days</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 48 },

  // ── Hero ──────────────────────────────────────────────────────────────────
  heroSection: {
    height: 160, backgroundColor: '#050B18',
    overflow: 'hidden', position: 'relative', justifyContent: 'flex-end',
  },
  moonOuter: {
    position: 'absolute', top: 18, right: 65,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(221,185,75,0.85)',
  },
  moonInner: {
    position: 'absolute', top: -4, right: -8,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#050B18',
  },

  // ── App bar ───────────────────────────────────────────────────────────────
  appBar: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8,
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 38, height: 38, borderRadius: 10,
    backgroundColor: EMERALD + '25',
    alignItems: 'center', justifyContent: 'center',
  },
  appName:    { color: WHITE, fontSize: 17, fontWeight: '700' },
  appTagline: { color: WHITE70, fontSize: 11 },
  bellWrap:   { padding: 4, position: 'relative' },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: RED,
    borderWidth: 1.5, borderColor: BG,
  },

  // ── Location row ─────────────────────────────────────────────────────────
  locRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  locChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: EMERALD + '1A', borderWidth: 1,
    borderColor: EMERALD + '50', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  locText:  { color: EMERALD, fontSize: 13, fontWeight: '600' },
  dateText: { color: WHITE70, fontSize: 12 },

  // ── Countdown card ────────────────────────────────────────────────────────
  countdownCard: {
    marginHorizontal: 16, backgroundColor: GREEN,
    borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: EMERALD + '35',
  },
  nextLabel:    { color: EMERALD, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  prayerName:   { color: WHITE,   fontSize: 32, fontWeight: '800', marginBottom: 2 },
  countdown: {
    color: GOLD, fontSize: 48, fontWeight: '800',
    fontVariant: ['tabular-nums'], letterSpacing: 2,
  },
  prayerAt:      { color: WHITE70, fontSize: 14, marginTop: 4, marginBottom: 14 },
  progressBg:    { height: 4, backgroundColor: WHITE10, borderRadius: 2, overflow: 'hidden', marginBottom: 6 },
  progressFill:  { height: '100%', backgroundColor: EMERALD, borderRadius: 2 },
  progressLabel: { color: WHITE70, fontSize: 11 },

  // ── Prayer pills ──────────────────────────────────────────────────────────
  prayerScroll: { marginBottom: 20 },
  prayerScrollInner: { paddingHorizontal: 16, gap: 8 },
  prayerPill: {
    alignItems: 'center', backgroundColor: CARD,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: WHITE10, minWidth: 82,
  },
  prayerPillActive: { backgroundColor: '#1A4A2E', borderColor: EMERALD + '80' },
  prayerPillPast:   { opacity: 0.45 },
  pillIcon:         { fontSize: 16, marginBottom: 3 },
  pillName:         { color: WHITE70, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  pillNameActive:   { color: EMERALD },
  pillNamePast:     { color: WHITE20 },
  pillTime:         { color: WHITE,   fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pillTimeActive:   { color: GOLD },

  // ── Quick links ───────────────────────────────────────────────────────────
  qlScroll:      { marginBottom: 24 },
  qlRow:         { paddingHorizontal: 16, gap: 16 },
  qlItem:        { alignItems: 'center', gap: 6 },
  qlIconBox: {
    width: 54, height: 54, borderRadius: 17,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: WHITE10,
  },
  qlLabel: { color: WHITE70, fontSize: 10, fontWeight: '600', textAlign: 'center', maxWidth: 60 },

  // ── Section ───────────────────────────────────────────────────────────────
  section:       { paddingHorizontal: 16, marginBottom: 20 },
  sectionHead:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { color: WHITE,   fontSize: 17, fontWeight: '700' },
  viewAll:       { color: EMERALD, fontSize: 13, fontWeight: '600' },

  // ── Mosques ───────────────────────────────────────────────────────────────
  mosqueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: CARD, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: WHITE10, marginBottom: 8,
  },
  mosqueIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: EMERALD + '20', alignItems: 'center', justifyContent: 'center',
  },
  mosqueName: { color: WHITE,   fontSize: 15, fontWeight: '600' },
  mosqueDist: { color: WHITE70, fontSize: 12, marginTop: 2 },

  // ── Qibla card ────────────────────────────────────────────────────────────
  qiblaCard: {
    marginHorizontal: 16, backgroundColor: CARD_ALT,
    borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: WHITE10, marginBottom: 20,
  },
  qiblaTitle: { color: WHITE70, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  qiblaDeg:   { color: WHITE,   fontSize: 36, fontWeight: '800' },
  qiblaDir:   { color: EMERALD, fontSize: 13, fontWeight: '600' },

  miniCompassOuter: {
    width: 94, height: 94, borderRadius: 47,
    backgroundColor: '#0A1F0F',
    borderWidth: 2, borderColor: EMERALD + '60',
    alignItems: 'center', justifyContent: 'center',
  },
  miniCompassInner: {
    width: 70, height: 70, position: 'relative',
    alignItems: 'center', justifyContent: 'center',
  },
  miniCardinal: { position: 'absolute', fontSize: 9, color: WHITE70, fontWeight: '700' },
  miniNeedleTip: {
    position: 'absolute',
    width: 3, height: 22,
    backgroundColor: EMERALD,
    borderRadius: 2,
    top: 5, left: 33.5,
    transform: [{ rotate: '-45deg' }],
  },
  miniNeedleTail: {
    position: 'absolute',
    width: 3, height: 16,
    backgroundColor: '#EF4444',
    borderRadius: 2,
    bottom: 5, left: 33.5,
    transform: [{ rotate: '-45deg' }],
  },
  miniKaaba: { position: 'absolute', fontSize: 13, top: 2 },

  // ── Prayer tools ──────────────────────────────────────────────────────────
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  toolCard: {
    width: (SW - 42) / 2, backgroundColor: CARD,
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: WHITE10,
  },
  toolIcon:  { fontSize: 26, marginBottom: 8 },
  toolLabel: { color: WHITE,   fontSize: 14, fontWeight: '600', marginBottom: 2 },
  toolSub:   { color: WHITE70, fontSize: 11 },

  // ── Recitation alarm ──────────────────────────────────────────────────────
  recitCard: {
    marginHorizontal: 16, backgroundColor: '#160E30',
    borderRadius: 18, padding: 18,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)',
    marginBottom: 20,
  },
  recitTitle: { color: WHITE,   fontSize: 16, fontWeight: '700', marginBottom: 4 },
  recitSub:   { color: WHITE70, fontSize: 12 },

  // ── Ayah card ─────────────────────────────────────────────────────────────
  ayahCard: {
    marginHorizontal: 16, backgroundColor: CARD,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: GOLD + '40', marginBottom: 16,
  },
  ayahBadge:  { color: GOLD,   fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  ayahArabic: { color: WHITE,  fontSize: 17, fontWeight: '600', textAlign: 'right', lineHeight: 30, marginBottom: 10 },
  ayahEn:     { color: WHITE70, fontSize: 13, lineHeight: 20, marginBottom: 8 },
  ayahRef:    { color: GOLD,   fontSize: 12, fontWeight: '600' },

  // ── Upcoming event ────────────────────────────────────────────────────────
  eventCard: {
    marginHorizontal: 16, backgroundColor: CARD,
    borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: WHITE10, marginBottom: 16,
  },
  eventBadge: { color: WHITE70, fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 12 },
  eventRow:   { flexDirection: 'row', alignItems: 'center', gap: 14 },
  eventIconBox: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: GOLD + '25', alignItems: 'center', justifyContent: 'center',
  },
  eventName: { color: WHITE,   fontSize: 18, fontWeight: '700' },
  eventDesc: { color: WHITE70, fontSize: 12, marginTop: 2 },
  eventDate: { color: EMERALD, fontSize: 12, fontWeight: '600', marginTop: 4 },
});
