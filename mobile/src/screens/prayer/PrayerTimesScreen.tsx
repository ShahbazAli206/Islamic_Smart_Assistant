import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, TextInput,
  StyleSheet, Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { DateTime } from 'luxon';
import { RootState } from '../../store';

const { width: SW } = Dimensions.get('window');

// ─── Design palette (light mode to match design) ────────────────────────────
const BG        = '#FAF7EE';
const WHITE     = '#FFFFFF';
const GREEN_CARD = '#0D3320';
const GREEN_MID  = '#1A4A2E';
const EMERALD    = '#10B981';
const GOLD       = '#DDB94B';
const GOLD2      = '#E9CF7A';
const TEXT       = '#0B1410';
const SUBTEXT    = '#5C5A50';
const DIVIDER    = '#E5E4DA';
const CARD       = '#FFFFFF';
const PARCHMENT  = '#FAF7EE';
const ACTIVE_BG  = '#ECFDF5';

type Sect   = 'sunni' | 'shia';
type Madhab = 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari';

const PRAYER_KEYS   = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr', sunrise: 'Sunrise', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha',
};
const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙', sunrise: '🌅', dhuhr: '☀️', asr: '🌤', maghrib: '🌇', isha: '🌃',
};

const SUNNI_MADHABS: { key: Madhab; label: string }[] = [
  { key: 'hanafi',  label: 'Hanafi'  },
  { key: 'shafi',   label: "Shafi'i" },
  { key: 'maliki',  label: 'Maliki'  },
  { key: 'hanbali', label: 'Hanbali' },
];
const SHIA_MADHABS: { key: Madhab; label: string }[] = [
  { key: 'jafari', label: "Ja'fari" },
];

const MOCK_MOSQUES = [
  { id: '1', name: 'Jamia Masjid Islamabad',           dist: '0.2 km' },
  { id: '2', name: 'Peer Mehr Ali Shah Masjid',        dist: '0.5 km' },
  { id: '3', name: 'Masjid-e-Rehmat',                  dist: '1.2 km' },
];

function getCalcMethod(sect: Sect) {
  return sect === 'shia' ? CalculationMethod.Tehran() : CalculationMethod.MuslimWorldLeague();
}
function getMethodLabel(sect: Sect) {
  return sect === 'shia'
    ? 'University of Islamic Sciences, Karachi'
    : 'University of Islamic Sciences, Karachi';
}

function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)} : ${p(m)} : ${p(s)}`;
}

export function PrayerTimesScreen() {
  const location = useSelector((s: RootState) => s.user.location);
  const [sect,   setSect]   = useState<Sect>('sunni');
  const [madhab, setMadhab] = useState<Madhab>('hanafi');
  const [now,    setNow]    = useState(new Date());
  const [search, setSearch] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const madhabList = sect === 'shia' ? SHIA_MADHABS : SUNNI_MADHABS;

  const prayerData = useMemo(() => {
    if (!location) return null;
    try {
      const coords = new Coordinates(location.lat, location.lng);
      const pt     = new PrayerTimes(coords, new Date(), getCalcMethod(sect));
      return {
        fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr,
        asr:  pt.asr,  maghrib: pt.maghrib, isha:  pt.isha,
      } as Record<string, Date>;
    } catch { return null; }
  }, [location, sect, madhab]);

  const tz = location?.timezone ?? 'local';
  const fmt = (d: Date) => DateTime.fromJSDate(d).setZone(tz).toFormat('h:mm a');

  const nextKey = (() => {
    if (!prayerData) return null;
    for (const k of PRAYER_KEYS) {
      if (prayerData[k] > now) return k;
    }
    return 'fajr';
  })();
  const nextDate = nextKey && prayerData
    ? prayerData[nextKey] > now
      ? prayerData[nextKey]
      : new Date(prayerData[nextKey].getTime() + 86_400_000)
    : null;
  const countdown = nextDate ? fmtCountdown(nextDate.getTime() - now.getTime()) : '--:--:--';

  const locLabel   = location?.city ?? 'Your Location';
  const todayDt    = DateTime.now().setZone(tz);
  const dateLabel  = todayDt.toFormat('dd MMMM yyyy');

  // Sunrise / Sunset
  const sunriseStr = prayerData ? fmt(prayerData.sunrise) : '--:-- AM';
  const sunsetStr  = prayerData ? fmt(prayerData.maghrib) : '--:-- PM';

  return (
    <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>

      {/* ── Top Arabic verse banner ── */}
      <View style={S.verseBanner}>
        <Text style={S.verseArabic}>
          {'إِنَّ ٱلصَّلَوٰةَ كَانَتْ عَلَى ٱلْمُؤْمِنِينَ كِتَٰبًۭا مَّوْقُوتًۭا'}
        </Text>
        <Text style={S.verseEn}>
          And established prayer. Indeed, prayer prohibits immorality and wrongdoing and the
          remembrance of Allah is greater.
        </Text>
        <Text style={S.verseRef}>Al-Ankabut (29:45)</Text>
      </View>

      {/* ── Location + date chip ── */}
      <View style={S.locRow}>
        <View style={S.locPin}>
          <Text style={{ fontSize: 12 }}>📍</Text>
          <Text style={S.locText}>{locLabel}</Text>
        </View>
        <Text style={S.locDate}>{dateLabel}</Text>
      </View>

      {/* ── Next prayer hero card ── */}
      <View style={S.heroCard}>
        {/* Mosque dome decoration */}
        <View style={S.heroDome} />
        <View style={S.heroMinaretL} />
        <View style={S.heroMinaretR} />

        <View style={S.heroContent}>
          <View style={S.heroLeft}>
            <Text style={S.heroNextLabel}>Next Prayer</Text>
            <Text style={S.heroPrayerName}>
              {nextKey ? PRAYER_LABELS[nextKey] : 'Fajr'}
            </Text>
            <View style={S.heroCountdownRow}>
              <View style={S.heroCdBox}>
                <Text style={S.heroCdNum}>{countdown.split(' : ')[0]}</Text>
                <Text style={S.heroCdUnit}>hr</Text>
              </View>
              <Text style={S.heroCdSep}>:</Text>
              <View style={S.heroCdBox}>
                <Text style={S.heroCdNum}>{countdown.split(' : ')[1]}</Text>
                <Text style={S.heroCdUnit}>min</Text>
              </View>
              <Text style={S.heroCdSep}>:</Text>
              <View style={S.heroCdBox}>
                <Text style={S.heroCdNum}>{countdown.split(' : ')[2]}</Text>
                <Text style={S.heroCdUnit}>sec</Text>
              </View>
            </View>
            {nextDate && (
              <Text style={S.heroAt}>
                Upcoming: {nextKey ? PRAYER_LABELS[nextKey] : ''} at{' '}
                {nextDate ? fmt(nextDate) : '--'}
              </Text>
            )}
          </View>
          <View style={S.heroRight}>
            <View style={S.sunCard}>
              <Text style={S.sunIcon}>🌅</Text>
              <Text style={S.sunLabel}>Sunrise</Text>
              <Text style={S.sunTime}>{sunriseStr}</Text>
            </View>
            <View style={[S.sunCard, { marginTop: 8 }]}>
              <Text style={S.sunIcon}>🌇</Text>
              <Text style={S.sunLabel}>Sunset</Text>
              <Text style={S.sunTime}>{sunsetStr}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Today's Prayer Times horizontal scroll ── */}
      <Text style={S.sectionTitle}>Today's Prayer Times</Text>
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        style={S.todayScroll} contentContainerStyle={S.todayScrollInner}
      >
        {PRAYER_KEYS.map(k => {
          const isNext = k === nextKey;
          const isPast = prayerData && prayerData[k] < now;
          return (
            <View key={k} style={[
              S.todayPill,
              isNext && S.todayPillActive,
              isPast && !isNext && S.todayPillPast,
            ]}>
              <Text style={S.todayPillIcon}>{PRAYER_ICONS[k]}</Text>
              <Text style={[S.todayPillName, isNext && S.todayPillNameA]}>
                {PRAYER_LABELS[k]}
              </Text>
              <Text style={[S.todayPillTime, isNext && S.todayPillTimeA]}>
                {prayerData ? fmt(prayerData[k]) : '--:--'}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* ── Search location ── */}
      <View style={S.searchRow}>
        <View style={S.searchBar}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search city or area..."
            placeholderTextColor={SUBTEXT}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <TouchableOpacity style={S.gpsBtn}>
          <Text style={{ fontSize: 16 }}>📍</Text>
          <Text style={S.gpsBtnText}>Go to Location</Text>
        </TouchableOpacity>
      </View>

      {/* ── Nearby Mosques ── */}
      <View style={S.section}>
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>Nearby Mosques</Text>
          <TouchableOpacity><Text style={S.viewAll}>View All</Text></TouchableOpacity>
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
            <Text style={{ color: SUBTEXT, fontSize: 20 }}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Select Sect ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Select Sect</Text>
        <View style={S.selectorRow}>
          {(['sunni', 'shia'] as Sect[]).map(item => {
            const active = sect === item;
            return (
              <TouchableOpacity
                key={item}
                style={[S.sectorBtn, active && S.sectorBtnActive]}
                onPress={() => { setSect(item); setMadhab(item === 'shia' ? 'jafari' : 'hanafi'); }}
              >
                <Text style={[S.sectorLabel, active && S.sectorLabelActive]}>
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Madhab / Fiqh ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Madhab / Fiqh</Text>
        <View style={S.selectorRow}>
          {madhabList.map(item => {
            const active = madhab === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                style={[S.sectorBtn, active && S.sectorBtnActive]}
                onPress={() => setMadhab(item.key)}
              >
                <Text style={[S.sectorLabel, active && S.sectorLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Calculation Method ── */}
      <View style={S.section}>
        <Text style={S.sectionTitle}>Calculation Method</Text>
        <View style={S.calcCard}>
          <Text style={S.calcValue}>{getMethodLabel(sect)}</Text>
          <Text style={S.calcSub}>Standard</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const DOME_W  = 60;
const DOME_H  = 32;
const MIN_W   = 10;

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 48 },

  // ── Arabic verse banner ───────────────────────────────────────────────────
  verseBanner: {
    backgroundColor: WHITE, paddingHorizontal: 20,
    paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  verseArabic: {
    fontSize: 18, fontWeight: '700', color: TEXT,
    textAlign: 'right', lineHeight: 28, marginBottom: 8,
  },
  verseEn:  { fontSize: 12, color: SUBTEXT, lineHeight: 18, marginBottom: 4 },
  verseRef: { fontSize: 11, color: EMERALD, fontWeight: '600' },

  // ── Location row ─────────────────────────────────────────────────────────
  locRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  locPin: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: EMERALD + '18', borderWidth: 1,
    borderColor: EMERALD + '40', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  locText: { color: EMERALD, fontSize: 13, fontWeight: '600' },
  locDate: { color: SUBTEXT, fontSize: 12 },

  // ── Hero card ─────────────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16, backgroundColor: GREEN_CARD,
    borderRadius: 22, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(233,207,122,0.2)',
    marginBottom: 24,
    position: 'relative',
  },
  // Mosque silhouette decorations
  heroDome: {
    position: 'absolute', bottom: 0, right: 24,
    width: DOME_W, height: DOME_H,
    borderTopLeftRadius: DOME_W / 2, borderTopRightRadius: DOME_W / 2,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroMinaretL: {
    position: 'absolute', bottom: 0, right: 20,
    width: MIN_W, height: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroMinaretR: {
    position: 'absolute', bottom: 0, right: 78,
    width: MIN_W, height: 55,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  heroContent:   { flexDirection: 'row', padding: 22, alignItems: 'flex-start' },
  heroLeft:      { flex: 1, paddingRight: 12 },
  heroNextLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  heroPrayerName: {
    color: WHITE, fontSize: 34, fontWeight: '800', marginBottom: 12,
  },
  heroCountdownRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 12 },
  heroCdBox:    { alignItems: 'center' },
  heroCdNum:    { color: GOLD2, fontSize: 30, fontWeight: '800', fontVariant: ['tabular-nums'] },
  heroCdUnit:   { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 },
  heroCdSep:    { color: GOLD2, fontSize: 26, fontWeight: '300', paddingBottom: 12 },
  heroAt:       { color: 'rgba(255,255,255,0.55)', fontSize: 11 },

  heroRight: { alignItems: 'flex-end' },
  sunCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 80,
  },
  sunIcon:  { fontSize: 18, marginBottom: 3 },
  sunLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, marginBottom: 2 },
  sunTime:  { color: WHITE, fontSize: 13, fontWeight: '700' },

  // ── Today's prayer scroll ─────────────────────────────────────────────────
  todayScroll:       { marginBottom: 24 },
  todayScrollInner:  { paddingHorizontal: 16, gap: 8 },
  todayPill: {
    alignItems: 'center', backgroundColor: WHITE,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: DIVIDER, minWidth: 80,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  todayPillActive:   { backgroundColor: ACTIVE_BG, borderColor: EMERALD + '70' },
  todayPillPast:     { opacity: 0.4 },
  todayPillIcon:     { fontSize: 16, marginBottom: 3 },
  todayPillName:     { color: SUBTEXT, fontSize: 11, fontWeight: '600', marginBottom: 2 },
  todayPillNameA:    { color: EMERALD },
  todayPillTime:     { color: TEXT,    fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  todayPillTimeA:    { color: EMERALD },

  // ── Search ────────────────────────────────────────────────────────────────
  searchRow: { paddingHorizontal: 16, marginBottom: 20, gap: 8 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: WHITE, borderRadius: 12,
    borderWidth: 1, borderColor: DIVIDER,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: EMERALD + '15',
    borderRadius: 12, borderWidth: 1, borderColor: EMERALD + '50',
    paddingVertical: 10, paddingHorizontal: 14,
  },
  gpsBtnText: { color: EMERALD, fontSize: 13, fontWeight: '600' },

  // ── Section ───────────────────────────────────────────────────────────────
  section:      { paddingHorizontal: 16, marginBottom: 20 },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: TEXT, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  viewAll:      { color: EMERALD, fontSize: 13, fontWeight: '600' },

  // ── Mosques ───────────────────────────────────────────────────────────────
  mosqueRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: WHITE, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: DIVIDER, marginBottom: 8,
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  mosqueIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: EMERALD + '18', alignItems: 'center', justifyContent: 'center',
  },
  mosqueName: { color: TEXT,    fontSize: 15, fontWeight: '600' },
  mosqueDist: { color: SUBTEXT, fontSize: 12, marginTop: 2 },

  // ── Sect / Madhab selectors ───────────────────────────────────────────────
  selectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sectorBtn: {
    paddingHorizontal: 20, paddingVertical: 9,
    borderRadius: 22, borderWidth: 1.5,
    borderColor: DIVIDER, backgroundColor: WHITE,
  },
  sectorBtnActive: { borderColor: EMERALD, backgroundColor: EMERALD },
  sectorLabel:        { fontSize: 14, fontWeight: '600', color: SUBTEXT },
  sectorLabelActive:  { color: WHITE },

  // ── Calculation method ────────────────────────────────────────────────────
  calcCard: {
    backgroundColor: WHITE, borderRadius: 12,
    borderWidth: 1, borderColor: DIVIDER,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  calcValue: { color: TEXT,    fontSize: 14, fontWeight: '600', flex: 1 },
  calcSub:   { color: SUBTEXT, fontSize: 13 },
});
