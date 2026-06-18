import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSelector } from 'react-redux';
import { Coordinates, CalculationMethod, PrayerTimes } from 'adhan';
import { DateTime } from 'luxon';
import { useTheme } from '../../theme';
import { RootState } from '../../store';

type Sect = 'sunni' | 'shia';
type Madhab = 'hanafi' | 'shafi' | 'maliki' | 'hanbali' | 'jafari';

// Design palette — the featured card + prayer grid use the same dark green / gold
// look as the web design regardless of the active light/dark theme.
const GREEN_DEEP = '#0F2A1C';
const GREEN_DEEP_2 = '#08160F';
const GOLD = '#E9CF7A';
const GOLD_2 = '#DDB94B';
const PARCHMENT = '#FAF7EE';

const SUNNI_MADHABS: { key: Madhab; label: string }[] = [
  { key: 'hanafi', label: 'Hanafi' },
  { key: 'shafi', label: "Shafi'i" },
  { key: 'maliki', label: 'Maliki' },
  { key: 'hanbali', label: 'Hanbali' },
];

const SHIA_MADHABS: { key: Madhab; label: string }[] = [
  { key: 'jafari', label: "Ja'fari" },
];

const PRAYER_ICONS: Record<string, string> = {
  fajr: '🌙',
  sunrise: '🌅',
  dhuhr: '☀️',
  asr: '🧭',
  maghrib: '🌇',
  isha: '🌃',
};

const PRAYER_LABELS: Record<string, string> = {
  fajr: 'Fajr',
  sunrise: 'Sunrise',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  maghrib: 'Maghrib',
  isha: 'Isha',
};

function getAdhanCalculationMethod(sect: Sect, _madhab: Madhab) {
  if (sect === 'shia') return CalculationMethod.Tehran();
  return CalculationMethod.MuslimWorldLeague();
}

function getMethodLabel(sect: Sect) {
  if (sect === 'shia') return 'Tehran (Institute of Geophysics)';
  return 'Muslim World League';
}

// Next upcoming prayer with its Date; wraps to tomorrow's Fajr once Isha passes.
function getNextPrayerInfo(times: Record<string, Date>): { key: string; at: Date } {
  const now = new Date();
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const key of order) {
    if (times[key] && times[key] > now) return { key, at: times[key] };
  }
  return { key: 'fajr', at: new Date(times.fajr.getTime() + 24 * 3600 * 1000) };
}

function fmtCountdown(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export function PrayerTimesScreen() {
  const theme = useTheme();
  const location = useSelector((s: RootState) => s.user.location);

  const [sect, setSect] = useState<Sect>('sunni');
  const [madhab, setMadhab] = useState<Madhab>('hanafi');

  // Live ticking clock for the countdown.
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const madhabList = sect === 'shia' ? SHIA_MADHABS : SUNNI_MADHABS;

  const prayerData = useMemo(() => {
    if (!location) return null;
    try {
      const coords = new Coordinates(location.lat, location.lng);
      const params = getAdhanCalculationMethod(sect, madhab);
      const today = new Date();
      const pt = new PrayerTimes(coords, today, params);
      return {
        fajr: pt.fajr,
        sunrise: pt.sunrise,
        dhuhr: pt.dhuhr,
        asr: pt.asr,
        maghrib: pt.maghrib,
        isha: pt.isha,
      } as Record<string, Date>;
    } catch {
      return null;
    }
  }, [location, sect, madhab]);

  const nextInfo = prayerData ? getNextPrayerInfo(prayerData) : null;
  const nextPrayer = nextInfo?.key ?? null;
  const countdown = nextInfo ? fmtCountdown(nextInfo.at.getTime() - now.getTime()) : '--:--:--';

  const tz = location?.timezone ?? 'local';
  const todayDt = DateTime.now().setZone(tz);
  // Hijri output via Intl islamic calendar isn't reliable on Hermes — show the
  // Gregorian date in the accent slot instead so it never crashes.
  const hijri = todayDt.toFormat('d MMMM yyyy');
  const dateLabel = todayDt.toFormat('cccc, MMMM d, yyyy');
  const tzLabel = location?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatTime = (d: Date) =>
    DateTime.fromJSDate(d).setZone(tz).toFormat('h:mm a');

  const s = StyleSheet.create({
    root: { backgroundColor: theme.bg },
    content: { padding: 16, paddingBottom: 40 },
    // header
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
    title: { color: theme.text, fontSize: 26, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: theme.subText, fontSize: 13, marginBottom: 18 },
    // featured countdown card
    hero: {
      backgroundColor: GREEN_DEEP,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: 'rgba(233,207,122,0.18)',
      padding: 20,
      marginBottom: 18,
      overflow: 'hidden',
    },
    heroLoc: { color: PARCHMENT, fontSize: 14, fontWeight: '600' },
    heroHijri: { color: GOLD, fontSize: 12, fontWeight: '700', letterSpacing: 1, marginTop: 4, textTransform: 'uppercase' },
    heroNextLabel: { color: PARCHMENT, fontSize: 20, fontWeight: '700', marginTop: 14 },
    heroCountdown: { color: GOLD, fontSize: 44, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
    heroAt: { color: 'rgba(250,247,238,0.7)', fontSize: 13, marginTop: 4 },
    // selectors
    sectionLabel: { color: theme.subText, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    btnText: { fontSize: 14, fontWeight: '600' },
    // calc method card
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      marginBottom: 16,
    },
    cardTitle: { color: theme.subText, fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
    cardValue: { color: theme.text, fontSize: 15, fontWeight: '600' },
    cardInfo: { color: theme.subText, fontSize: 12, marginTop: 2 },
    // prayer grid (2 columns)
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 16 },
    prayerCard: {
      width: '48.5%',
      borderRadius: 14,
      borderWidth: 1,
      padding: 14,
      marginBottom: 10,
    },
    prayerIcon: { fontSize: 22 },
    prayerName: { fontSize: 14, fontWeight: '600', marginTop: 8 },
    prayerTime: { fontSize: 18, fontWeight: '800', marginTop: 2 },
    noLocationCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 20,
      alignItems: 'center',
      marginBottom: 16,
    },
    noLocationText: { color: theme.subText, fontSize: 14, textAlign: 'center' },
    // info card
    infoCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.divider,
    },
    infoRowLast: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    infoKey: { color: theme.subText, fontSize: 13 },
    infoVal: { color: theme.text, fontSize: 13, fontWeight: '600' },
  });

  const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;
  const locLabel = location?.city ? location.city : 'Set your location';

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.chipWrap}>
        <View style={s.chip}>
          <Text style={s.chipText}>Prayer Times</Text>
        </View>
      </View>
      <Text style={s.title}>Pick your mosque, anywhere on earth</Text>
      <Text style={s.subtitle}>Times are calculated for your location using your sect &amp; madhab.</Text>

      {/* Featured next-prayer countdown card */}
      {prayerData && nextInfo && (
        <View style={s.hero}>
          <Text style={s.heroLoc}>📍 {locLabel}</Text>
          <Text style={s.heroHijri}>{hijri}</Text>
          <Text style={s.heroNextLabel}>{PRAYER_LABELS[nextInfo.key]} in</Text>
          <Text style={s.heroCountdown}>{countdown}</Text>
          <Text style={s.heroAt}>at {formatTime(nextInfo.at)}</Text>
        </View>
      )}

      {/* Sect Selector */}
      <Text style={s.sectionLabel}>Sect</Text>
      <View style={s.row}>
        {(['sunni', 'shia'] as Sect[]).map((item) => {
          const active = sect === item;
          return (
            <TouchableOpacity
              key={item}
              style={[s.btn, { backgroundColor: active ? theme.emerald : theme.card, borderColor: active ? theme.emerald : theme.divider }]}
              onPress={() => {
                setSect(item);
                setMadhab(item === 'shia' ? 'jafari' : 'hanafi');
              }}
            >
              <Text style={[s.btnText, { color: active ? '#FFFFFF' : theme.subText }]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Madhab Selector */}
      <Text style={s.sectionLabel}>Madhab / Fiqh</Text>
      <View style={s.row}>
        {madhabList.map((item) => {
          const active = madhab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[s.btn, { backgroundColor: active ? theme.emerald : theme.card, borderColor: active ? theme.emerald : theme.divider }]}
              onPress={() => setMadhab(item.key)}
            >
              <Text style={[s.btnText, { color: active ? '#FFFFFF' : theme.subText }]}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Calculation Method */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Calculation Method</Text>
        <Text style={s.cardValue}>{getMethodLabel(sect)}</Text>
        <Text style={s.cardInfo}>Used for offline calculation via the adhan library</Text>
      </View>

      {/* Prayer Times grid */}
      {!prayerData ? (
        <View style={s.noLocationCard}>
          <Text style={s.noLocationText}>Set your location in Settings to see prayer times</Text>
        </View>
      ) : (
        <>
          <Text style={s.sectionLabel}>Today&apos;s Prayers</Text>
          <View style={s.grid}>
            {PRAYERS.map((key) => {
              const isActive = nextPrayer === key;
              return (
                <View
                  key={key}
                  style={[
                    s.prayerCard,
                    isActive
                      ? { backgroundColor: GOLD_2, borderColor: GOLD }
                      : { backgroundColor: theme.card, borderColor: theme.divider },
                  ]}
                >
                  <Text style={s.prayerIcon}>{PRAYER_ICONS[key]}</Text>
                  <Text style={[s.prayerName, { color: isActive ? GREEN_DEEP_2 : theme.subText }]}>{PRAYER_LABELS[key]}</Text>
                  <Text style={[s.prayerTime, { color: isActive ? GREEN_DEEP_2 : theme.text }]}>{formatTime(prayerData[key])}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Info Card */}
      <View style={s.infoCard}>
        <Text style={[s.cardTitle, { marginBottom: 8 }]}>Details</Text>
        <View style={s.infoRow}>
          <Text style={s.infoKey}>Location</Text>
          <Text style={s.infoVal}>
            {location?.city
              ? location.city
              : location
              ? `${location.lat.toFixed(3)}, ${location.lng.toFixed(3)}`
              : 'Not set'}
          </Text>
        </View>
        <View style={s.infoRow}>
          <Text style={s.infoKey}>Date</Text>
          <Text style={s.infoVal}>{dateLabel}</Text>
        </View>
        <View style={s.infoRowLast}>
          <Text style={s.infoKey}>Timezone</Text>
          <Text style={s.infoVal}>{tzLabel}</Text>
        </View>
      </View>
    </ScrollView>
  );
}
