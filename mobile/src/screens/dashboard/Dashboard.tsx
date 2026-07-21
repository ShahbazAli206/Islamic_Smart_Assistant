import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity,
  Dimensions, Image, ImageBackground,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { DateTime } from 'luxon';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { Prayer, Mosques, MosqueHit } from '../../api/endpoints';
import { RootState } from '../../store';

const { width: SW } = Dimensions.get('window');
const PAD = 16;
const GAP = 12;
const HALF = (SW - PAD * 2 - GAP) / 2;

// ─── Optional artwork slots ──────────────────────────────────────────────────
// Drop the real images into src/assets and point these requires at them; until
// then a tasteful gradient placeholder is rendered in their place.
//   const HERO_IMAGE       = require('../../assets/dashboard_hero.png');
//   const RECITATION_IMAGE = require('../../assets/recitation_banner.png');
const HERO_IMAGE: any = null;
const RECITATION_IMAGE: any = null;

// ─── Design palette (light) ──────────────────────────────────────────────────
const INK       = '#1B2530';
const INK_SOFT  = '#5B6572';
const WHITE      = '#FFFFFF';
const PAGE_BG    = '#F1EEF7';
const CARD       = '#FFFFFF';
const EMERALD    = '#0E9E63';
const GOLD       = '#C9A227';

const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
type PrayerKey = typeof PRAYERS[number];

const PRAYER_META: Record<PrayerKey, { label: string; icon: string; tint: string; badge: string }> = {
  fajr:    { label: 'Fajr',    icon: '🌅', tint: '#3B82F6', badge: '#E7F0FF' },
  sunrise: { label: 'Sunrise', icon: '☀️', tint: '#F59E0B', badge: '#FFF3DC' },
  dhuhr:   { label: 'Dhuhr',   icon: '🌞', tint: '#F59E0B', badge: '#FFF3DC' },
  asr:     { label: 'Asr',     icon: '⛅', tint: '#0E9E63', badge: '#E3F6EC' },
  maghrib: { label: 'Maghrib', icon: '🌇', tint: '#F97316', badge: '#FFE9DC' },
  isha:    { label: 'Isha',    icon: '🌙', tint: '#8B5CF6', badge: '#EEE9FE' },
};

const QUICK_LINKS = [
  { key: 'Quran',      label: 'Quran',       icon: '📖', bg: '#E3F6EC', screen: 'Quran'          },
  { key: 'Qibla',      label: 'Qibla',       icon: '🧭', bg: '#E3F6EC', screen: 'Qibla'          },
  { key: 'AzanAlerts', label: 'Azan Alerts', icon: '🔔', bg: '#FFEBD6', screen: 'Azan'           },
  { key: 'Recitation', label: 'Recitation',  icon: '🎵', bg: '#EEE9FE', screen: 'QuranScheduler' },
];

const PRAYER_TOOLS = [
  { icon: '🕐', label: 'Prayer Times',        sub: 'Accurate times', bg: '#EAF7EF', iconBg: '#0E9E63', screen: 'Prayers'        },
  { icon: '📖', label: 'Quran &\nRecitation', sub: 'Read & listen',  bg: '#E9F5F3', iconBg: '#0D9488', screen: 'Quran'          },
  { icon: '🧭', label: 'Qibla\nFinder',       sub: 'Direction',      bg: '#EAF0FB', iconBg: '#3B82F6', screen: 'Qibla'          },
  { icon: '📊', label: 'Analytics',           sub: 'Your progress',  bg: '#FDECEC', iconBg: '#EF4444', screen: 'Analytics'      },
];

const FALLBACK_MOSQUES = [
  { id: '1', name: 'Jamia Masjid',              dist: '0.4 km' },
  { id: '2', name: 'Masjid-e-Rehmat',           dist: '1.1 km' },
  { id: '3', name: 'Peer Mehr Ali Shah Masjid', dist: '1.6 km' },
];

const DIR_FULL: Record<string, string> = {
  N: 'North', NE: 'North-East', E: 'East', SE: 'South-East',
  S: 'South', SW: 'South-West', W: 'West', NW: 'North-West',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function localPrayerTimes(lat: number, lng: number, timezone: string) {
  const coords = new Coordinates(lat, lng);
  const params = CalculationMethod.MuslimWorldLeague();
  const pt     = new PrayerTimes(coords, new Date(), params);
  return {
    timezone,
    fajr: pt.fajr.toISOString(), sunrise: pt.sunrise.toISOString(),
    dhuhr: pt.dhuhr.toISOString(), asr: pt.asr.toISOString(),
    maghrib: pt.maghrib.toISOString(), isha: pt.isha.toISOString(),
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

function qiblaBearing(lat: number, lng: number) {
  const KL = 21.4225, KG = 39.8262;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const φ1 = toRad(lat), φ2 = toRad(KL), Δλ = toRad(KG - lng);
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

function dirShort(bearing: number) {
  return (['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const)[Math.round(bearing / 45) % 8];
}

function hijriLabel(apiVal?: string) {
  if (apiVal) return apiVal;
  try {
    const s = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date());
    // "Muharram 5, 1446 AH" → "5 Muharram 1446 AH"
    const m = s.match(/^(\w+)\s+(\d+),\s+(\d+)/);
    const base = m ? `${m[2]} ${m[1]} ${m[3]}` : s.replace(/,/g, '');
    return /AH$/.test(base) ? base : `${base} AH`;
  } catch {
    return '';
  }
}

// ─── Small compass for the Qibla card (pure Views) ───────────────────────────
function MiniQiblaCompass({ bearing }: { bearing: number }) {
  return (
    <View style={S.qCompassWrap}>
      <View style={S.qCompassRing}>
        {/* top target chip */}
        <View style={S.qTargetChip}><Text style={S.qTargetGlyph}>◎</Text></View>
        {/* cardinal arrows */}
        <Text style={[S.qArrow, { top: 6, alignSelf: 'center' }]}>▲</Text>
        <Text style={[S.qArrow, { bottom: 6, alignSelf: 'center' }]}>▼</Text>
        <Text style={[S.qArrow, { left: 8, top: '46%' }]}>◀</Text>
        <Text style={[S.qArrow, { right: 8, top: '46%' }]}>▶</Text>
        {/* Kaaba at center */}
        <View style={S.qKaabaOuter}>
          <Text style={{ fontSize: 34 }}>🕋</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const location   = useSelector((s: RootState) => s.user.location);
  const insets     = useSafeAreaInsets();

  const [today,      setToday]      = useState<any>(null);
  const [mosques,    setMosques]    = useState<{ id: string; name: string; dist: string }[]>(FALLBACK_MOSQUES);
  const [refreshing, setRefreshing] = useState(false);
  const [now,        setNow]        = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  const load = async () => {
    try {
      setToday(await Prayer.today());
    } catch {
      if (location) setToday(localPrayerTimes(location.lat, location.lng, location.timezone));
    }
    if (location) {
      try {
        const hits: MosqueHit[] = await Mosques.nearby(location.lat, location.lng);
        if (hits?.length) {
          setMosques(hits.slice(0, 3).map(h => ({
            id: h.id,
            name: h.name,
            dist: h.distanceKm != null ? `${h.distanceKm.toFixed(1)} km` : '',
          })));
        }
      } catch { /* keep fallback */ }
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const tz = location?.timezone ?? 'local';
  const prayerList = today
    ? PRAYERS.map(k => ({
        key: k,
        label: PRAYER_META[k].label,
        dt: DateTime.fromISO(today[k]).setZone(tz),
        date: new Date(today[k]),
      }))
    : [];

  const nextIdx    = prayerList.findIndex(p => p.date > now);
  const nextPrayer = nextIdx >= 0 ? prayerList[nextIdx] : null;
  const countdown  = nextPrayer ? fmtCountdown(nextPrayer.date.getTime() - now.getTime()) : '--:--:--';

  const cityName  = location?.city ?? 'Your Location';
  const cityLabel = location?.country ? `${cityName}, ${location.country}` : cityName;
  const hijri     = hijriLabel(today?.hijriDate ?? today?.hijri?.date);

  let progress = 0.5;
  if (nextIdx > 0 && prayerList[nextIdx - 1]) {
    const prev    = prayerList[nextIdx - 1].date.getTime();
    const nxt     = nextPrayer!.date.getTime();
    const elapsed = now.getTime() - prev;
    progress = Math.min(1, Math.max(0.02, elapsed / (nxt - prev)));
  }

  const bearing  = location ? qiblaBearing(location.lat, location.lng) : 258;
  const bDir      = dirShort(bearing);

  return (
    <View style={S.root}>
      <ScrollView
        style={S.root}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={EMERALD} />}
      >
        {/* ── Mosque hero ── */}
        <HeroBackground height={insets.top + 250}>
          {/* App bar */}
          <View style={[S.appBar, { marginTop: insets.top + 6 }]}>
            <View style={S.appBarLeft}>
              <Image
                source={require('../../assets/ismaa_logo_light.png')}
                style={S.brandLogo}
                resizeMode="contain"
                accessibilityLabel="Syedi-ISMAA — Islamic Smart Assistant"
              />
            </View>
            <TouchableOpacity style={S.bellWrap} activeOpacity={0.8}>
              <Text style={{ fontSize: 20 }}>🔔</Text>
            </TouchableOpacity>
          </View>

          {/* Location + hijri chip */}
          <TouchableOpacity style={S.locChip} activeOpacity={0.85}>
            <Text style={{ fontSize: 14, marginRight: 6 }}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={S.locCity} numberOfLines={1}>{cityLabel}</Text>
              {!!hijri && <Text style={S.locHijri}>{hijri}</Text>}
            </View>
            <Text style={S.locChevron}>⌄</Text>
          </TouchableOpacity>
        </HeroBackground>

        {/* ── Content (overlaps hero) ── */}
        <View style={S.content}>
          {/* Row 1 — Next Prayer + Prayer list */}
          <View style={S.row}>
            {/* Next Prayer gradient card */}
            <LinearGradient
              colors={['#4FA37A', '#187E4E', '#0E5C36']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[S.nextCard, { width: HALF }]}
            >
              <View style={S.nextHeadRow}>
                <View style={S.nextClockRing}><Text style={{ fontSize: 12, color: WHITE }}>◷</Text></View>
                <Text style={S.nextHeadTxt}>Next Prayer</Text>
              </View>
              <Text style={S.nextName}>{nextPrayer ? nextPrayer.label : '—'}</Text>
              <Text style={S.nextCountdown}>{countdown}</Text>
              <View style={S.nextTimeRow}>
                <Text style={S.nextTime}>{nextPrayer ? nextPrayer.dt.toFormat('h:mm a') : '--:-- --'}</Text>
                <Text style={{ fontSize: 13 }}>🔊</Text>
              </View>
              <View style={S.nextProgressBg}>
                <View style={[S.nextProgressFill, { width: `${Math.round(progress * 100)}%` as any }]} />
              </View>
              <Text style={S.nextRemain}>Time remaining</Text>
            </LinearGradient>

            {/* Prayer times list card */}
            <View style={[S.listCard, { width: HALF }]}>
              {prayerList.length === 0
                ? PRAYERS.map(k => (
                    <View key={k} style={S.listRow}>
                      <Text style={S.listIcon}>{PRAYER_META[k].icon}</Text>
                      <Text style={S.listName}>{PRAYER_META[k].label}</Text>
                      <Text style={S.listTime}>--:--</Text>
                    </View>
                  ))
                : prayerList.map((p, i) => {
                    const active = i === nextIdx;
                    return (
                      <View key={p.key} style={[S.listRow, active && S.listRowActive]}>
                        <Text style={S.listIcon}>{PRAYER_META[p.key].icon}</Text>
                        <Text style={[S.listName, active && S.listNameActive]}>{p.label}</Text>
                        <Text style={[S.listTime, active && S.listTimeActive]}>{p.dt.toFormat('h:mm a')}</Text>
                      </View>
                    );
                  })}
            </View>
          </View>

          {/* Quick links */}
          <View style={S.quickCard}>
            {QUICK_LINKS.map(q => (
              <TouchableOpacity key={q.key} style={S.quickItem} activeOpacity={0.75} onPress={() => navigation.navigate(q.screen)}>
                <View style={[S.quickIcon, { backgroundColor: q.bg }]}><Text style={{ fontSize: 20 }}>{q.icon}</Text></View>
                <Text style={S.quickLabel}>{q.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={S.quickDivider} />
            <TouchableOpacity style={S.quickItem} activeOpacity={0.75} onPress={() => navigation.navigate('More')}>
              <View style={[S.quickIcon, { backgroundColor: '#EEF0F4' }]}>
                <View style={S.gridGlyph}>
                  {[0, 1, 2, 3].map(i => <View key={i} style={S.gridDot} />)}
                </View>
              </View>
              <Text style={S.quickLabel}>View All</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2 — Nearby Mosques + Qibla */}
          <View style={S.row}>
            {/* Nearby Mosques */}
            <LinearGradient
              colors={['#B57BD6', '#8A5BDC', '#6D4BD0']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[S.mosqueCard, { width: HALF }]}
            >
              <View style={S.mosqueHead}>
                <Text style={S.mosqueTitle}>Nearby Mosques</Text>
                <TouchableOpacity><Text style={S.mosqueViewAll}>View all</Text></TouchableOpacity>
              </View>
              {mosques.map(m => (
                <View key={m.id} style={S.mosqueRow}>
                  <View style={S.mosqueIconBox}><Text style={{ fontSize: 18 }}>🕌</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.mosqueName} numberOfLines={1}>{m.name}</Text>
                    {!!m.dist && <Text style={S.mosqueDist}>{m.dist} away</Text>}
                  </View>
                </View>
              ))}
              <View style={S.mosqueHandle} />
            </LinearGradient>

            {/* Qibla Direction */}
            <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('Qibla')} style={{ width: HALF }}>
              <LinearGradient
                colors={['#5B92E8', '#4478DA', '#3A6CCE']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={S.qiblaCard}
              >
                <View style={S.qiblaHead}>
                  <Text style={S.qiblaTitle}>Qibla Direction</Text>
                  <View style={S.qiblaBadge}><Text style={{ color: WHITE, fontSize: 13 }}>◎</Text></View>
                </View>
                <MiniQiblaCompass bearing={bearing} />
                <View style={S.qiblaFooter}>
                  <Text style={S.qiblaDeg}>{Math.round(bearing)}°</Text>
                  <Text style={S.qiblaDir}>{DIR_FULL[bDir]}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Prayer Tools */}
          <LinearGradient
            colors={['#F7EFE9', '#F3ECF6']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={S.toolsCard}
          >
            <Text style={S.toolsTitle}>Prayer Tools</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 4 }}>
              {PRAYER_TOOLS.map(tool => (
                <TouchableOpacity key={tool.label} activeOpacity={0.8} onPress={() => navigation.navigate(tool.screen)}
                  style={[S.toolCard, { backgroundColor: tool.bg }]}>
                  <View style={[S.toolIconBox, { backgroundColor: tool.iconBg }]}>
                    <Text style={{ fontSize: 16 }}>{tool.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.toolLabel}>{tool.label}</Text>
                    <Text style={S.toolSub}>{tool.sub}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </LinearGradient>

          {/* Recitation Alarm banner */}
          <TouchableOpacity activeOpacity={0.92} onPress={() => navigation.navigate('QuranScheduler')} style={S.recitWrap}>
            <RecitationBanner />
          </TouchableOpacity>

          {/* Row 3 — Verse of the Day + Upcoming Event */}
          <View style={S.row}>
            {/* Verse of the Day */}
            <View style={[S.verseCard, { width: HALF }]}>
              <View style={S.verseHead}>
                <Text style={S.verseBadge}>Verse of the Day</Text>
                <Text style={{ fontSize: 15, color: INK_SOFT }}>🔖</Text>
              </View>
              <Text style={S.verseArabic}>
                {'وَأَقِمِ ٱلصَّلَوٰةَ ۖ إِنَّ ٱلصَّلَوٰةَ تَنْهَىٰ عَنِ ٱلْفَحْشَآءِ وَٱلْمُنكَرِ'}
              </Text>
              <Text style={S.verseEn}>And establish prayer. Indeed, prayer prohibits immorality and wrong-doing.</Text>
              <Text style={S.verseRef}>Surah Al-Ankabut (29:45)</Text>
            </View>

            {/* Upcoming Event */}
            <LinearGradient
              colors={['#FDEEE3', '#FBE2E6']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={[S.eventCard, { width: HALF }]}
            >
              <View style={S.eventBlob} />
              <Text style={S.eventBadge}>Upcoming Event</Text>
              <View style={S.eventRow}>
                <View style={S.eventIconBox}><Text style={{ fontSize: 20 }}>📅</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={S.eventName}>Ashura</Text>
                  <Text style={S.eventDate}>10 Muharram 1446 AH</Text>
                </View>
              </View>
              <View style={S.eventPill}><Text style={S.eventPillTxt}>In 5 days</Text></View>
            </LinearGradient>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Hero background (image slot → gradient placeholder) ─────────────────────
function HeroBackground({ height, children }: { height: number; children: React.ReactNode }) {
  if (HERO_IMAGE) {
    return (
      <ImageBackground source={HERO_IMAGE} style={[S.hero, { height }]} resizeMode="cover">
        {children}
      </ImageBackground>
    );
  }
  return (
    <LinearGradient
      colors={['#F6D9B8', '#F3C9C4', '#DBD3EC', '#C9D6E9']}
      start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
      style={[S.hero, { height }]}
    >
      {/* soft sun */}
      <View style={S.heroSun} />
      {children}
    </LinearGradient>
  );
}

// ─── Recitation banner (image slot → night gradient placeholder) ─────────────
function RecitationBanner() {
  const inner = (
    <>
      {/* stars */}
      {([[210, 24], [250, 40], [300, 20], [330, 52]] as [number, number][]).map(([l, t], i) => (
        <View key={i} style={[S.recitStar, { left: l, top: t }]} />
      ))}
      {/* crescent moon */}
      <View style={S.recitMoonOuter}><View style={S.recitMoonInner} /></View>
      <Text style={S.recitNote}>♪</Text>
      <View style={S.recitTextWrap}>
        <Text style={S.recitTitle}>Recitation Alarm</Text>
        <Text style={S.recitSub}>Set beautiful recitation alarm</Text>
        <View style={S.recitBtn}><Text style={S.recitBtnTxt}>Set Alarm</Text></View>
      </View>
      {/* speaker */}
      <View style={S.recitSpeaker} />
    </>
  );

  if (RECITATION_IMAGE) {
    return <ImageBackground source={RECITATION_IMAGE} style={S.recitCard} resizeMode="cover" imageStyle={{ borderRadius: 20 }}>{inner}</ImageBackground>;
  }
  return (
    <LinearGradient colors={['#3C4193', '#5A4B9E', '#7C5AA6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.recitCard}>
      {inner}
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: PAGE_BG },
  content: { paddingHorizontal: PAD, marginTop: -78 },
  row:     { flexDirection: 'row', gap: GAP, marginBottom: 14, alignItems: 'stretch' },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: { width: '100%', overflow: 'hidden', paddingHorizontal: PAD },
  heroSun: {
    position: 'absolute', top: '42%', left: '38%',
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: 'rgba(255,244,214,0.9)',
    shadowColor: '#FFE9B0', shadowOpacity: 0.9, shadowRadius: 24, shadowOffset: { width: 0, height: 0 },
  },

  // ── App bar ─────────────────────────────────────────────────────────────
  appBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  appBarLeft: { flexDirection: 'row', alignItems: 'center' },
  brandLogo:  { width: 132, height: 46 },
  bellWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Location chip ─────────────────────────────────────────────────────────
  locChip: {
    marginTop: 16,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(30,35,45,0.55)',
    borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10,
    alignSelf: 'flex-start', minWidth: 220, maxWidth: '78%',
  },
  locCity:    { color: WHITE, fontSize: 16, fontWeight: '700' },
  locHijri:   { color: '#8CE0AE', fontSize: 12, fontWeight: '600', marginTop: 1 },
  locChevron: { color: WHITE, fontSize: 18, marginLeft: 8, marginTop: -4 },

  // ── Next Prayer card ───────────────────────────────────────────────────────
  nextCard: {
    borderRadius: 22, padding: 16, minHeight: 210,
    shadowColor: '#0E5C36', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6,
  },
  nextHeadRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  nextClockRing: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)', alignItems: 'center', justifyContent: 'center',
  },
  nextHeadTxt:   { color: WHITE, fontSize: 14, fontWeight: '600' },
  nextName:      { color: WHITE, fontSize: 30, fontWeight: '800', marginBottom: 2 },
  nextCountdown: { color: WHITE, fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'], letterSpacing: 1 },
  nextTimeRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 14 },
  nextTime:      { color: 'rgba(255,255,255,0.95)', fontSize: 15, fontWeight: '600' },
  nextProgressBg:   { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginBottom: 8 },
  nextProgressFill: { height: '100%', borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' },
  nextRemain:    { color: 'rgba(255,255,255,0.85)', fontSize: 12 },

  // ── Prayer list card ─────────────────────────────────────────────────────
  listCard: {
    backgroundColor: CARD, borderRadius: 22, paddingVertical: 6, paddingHorizontal: 10,
    justifyContent: 'center',
    shadowColor: '#3A3550', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4,
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 8, borderRadius: 12,
  },
  listRowActive:  { backgroundColor: '#DFF4E7' },
  listIcon:       { fontSize: 16, width: 24 },
  listName:       { flex: 1, color: INK, fontSize: 14, fontWeight: '600' },
  listNameActive: { color: EMERALD },
  listTime:       { color: INK, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
  listTimeActive: { color: EMERALD },

  // ── Quick links ─────────────────────────────────────────────────────────
  quickCard: {
    backgroundColor: CARD, borderRadius: 22, paddingVertical: 16, paddingHorizontal: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 14,
    shadowColor: '#3A3550', shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  quickItem:  { flex: 1, alignItems: 'center', gap: 7 },
  quickIcon:  { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { color: INK, fontSize: 11, fontWeight: '600', textAlign: 'center' },
  quickDivider: { width: 1, height: 52, backgroundColor: '#ECEAF2', marginHorizontal: 2 },
  gridGlyph: { width: 18, height: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignContent: 'space-between' },
  gridDot:   { width: 7, height: 7, borderRadius: 2, backgroundColor: '#9AA0AB' },

  // ── Nearby Mosques ─────────────────────────────────────────────────────────
  mosqueCard: { borderRadius: 22, padding: 16, minHeight: 300,
    shadowColor: '#6D4BD0', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  mosqueHead:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  mosqueTitle:   { color: WHITE, fontSize: 16, fontWeight: '700' },
  mosqueViewAll: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  mosqueRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  mosqueIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  mosqueName:    { color: WHITE, fontSize: 13, fontWeight: '700' },
  mosqueDist:    { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 },
  mosqueHandle:  { alignSelf: 'center', width: 46, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.5)', marginTop: 'auto' },

  // ── Qibla card ─────────────────────────────────────────────────────────────
  qiblaCard: { borderRadius: 22, padding: 16, minHeight: 300,
    shadowColor: '#3A6CCE', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  qiblaHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  qiblaTitle: { color: WHITE, fontSize: 16, fontWeight: '700', flex: 1 },
  qiblaBadge: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },

  qCompassWrap:  { alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  qCompassRing: {
    width: 150, height: 150, borderRadius: 75,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  qTargetChip: {
    position: 'absolute', top: -12, alignSelf: 'center',
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center',
  },
  qTargetGlyph: { color: '#3A6CCE', fontSize: 13 },
  qArrow:       { position: 'absolute', color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  qKaabaOuter: {
    width: 78, height: 78, borderRadius: 39,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  qiblaFooter: { alignItems: 'flex-end', marginTop: 'auto' },
  qiblaDeg:    { color: WHITE, fontSize: 30, fontWeight: '800' },
  qiblaDir:    { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600' },

  // ── Prayer Tools ─────────────────────────────────────────────────────────
  toolsCard: { borderRadius: 22, padding: 16, marginBottom: 14 },
  toolsTitle: { color: INK, fontSize: 16, fontWeight: '700', marginBottom: 14 },
  toolCard: {
    width: 150, borderRadius: 16, padding: 12,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  toolIconBox: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolLabel:   { color: INK, fontSize: 13, fontWeight: '700' },
  toolSub:     { color: INK_SOFT, fontSize: 11, marginTop: 1 },

  // ── Recitation banner ──────────────────────────────────────────────────────
  recitWrap: { marginBottom: 14 },
  recitCard: { borderRadius: 20, padding: 18, minHeight: 120, overflow: 'hidden' },
  recitTextWrap: {},
  recitTitle: { color: WHITE, fontSize: 17, fontWeight: '700' },
  recitSub:   { color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 3, marginBottom: 12 },
  recitBtn:   { alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 7, backgroundColor: 'rgba(255,255,255,0.12)' },
  recitBtnTxt:{ color: WHITE, fontSize: 13, fontWeight: '700' },
  recitStar:  { position: 'absolute', width: 3, height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.9)' },
  recitMoonOuter: { position: 'absolute', right: 150, top: 44, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,247,220,0.95)' },
  recitMoonInner: { position: 'absolute', right: -7, top: -4, width: 26, height: 26, borderRadius: 13, backgroundColor: '#5A4B9E' },
  recitNote:    { position: 'absolute', right: 20, top: 22, color: 'rgba(255,255,255,0.9)', fontSize: 22 },
  recitSpeaker: { position: 'absolute', right: 60, bottom: 0, top: 24, width: 46, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: 'rgba(20,22,45,0.55)' },

  // ── Verse of the Day ───────────────────────────────────────────────────────
  verseCard: { backgroundColor: '#EAF1F4', borderRadius: 18, padding: 14, minHeight: 190 },
  verseHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  verseBadge: { color: INK, fontSize: 12, fontWeight: '700' },
  verseArabic:{ color: INK, fontSize: 15, fontWeight: '600', textAlign: 'center', lineHeight: 28, marginBottom: 10 },
  verseEn:    { color: INK_SOFT, fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 6 },
  verseRef:   { color: EMERALD, fontSize: 11, fontWeight: '700', textAlign: 'center' },

  // ── Upcoming Event ─────────────────────────────────────────────────────────
  eventCard: { borderRadius: 18, padding: 14, minHeight: 190, overflow: 'hidden' },
  eventBlob: { position: 'absolute', top: -30, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(244,114,182,0.18)' },
  eventBadge:{ color: INK, fontSize: 12, fontWeight: '700', marginBottom: 16 },
  eventRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  eventIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F97316', alignItems: 'center', justifyContent: 'center' },
  eventName: { color: INK, fontSize: 16, fontWeight: '700' },
  eventDate: { color: INK_SOFT, fontSize: 11, marginTop: 2 },
  eventPill: { alignSelf: 'flex-start', backgroundColor: '#F7D9A8', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  eventPillTxt: { color: '#9A5B12', fontSize: 12, fontWeight: '700' },
});
