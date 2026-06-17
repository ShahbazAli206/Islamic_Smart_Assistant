import React, { useMemo, useState } from 'react';
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
  asr: '🌤',
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

function getNextPrayer(times: Record<string, Date>): string {
  const now = new Date();
  const order = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
  for (const key of order) {
    if (times[key] && times[key] > now) return key;
  }
  return 'fajr';
}

export function PrayerTimesScreen() {
  const theme = useTheme();
  const location = useSelector((s: RootState) => s.user.location);

  const [sect, setSect] = useState<Sect>('sunni');
  const [madhab, setMadhab] = useState<Madhab>('hanafi');

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
      };
    } catch {
      return null;
    }
  }, [location, sect, madhab]);

  const nextPrayer = prayerData ? getNextPrayer(prayerData) : null;

  const todayDt = DateTime.now().setZone(location?.timezone ?? 'local');
  const dateLabel = todayDt.toFormat('cccc, MMMM d, yyyy');
  const tzLabel = location?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;

  const formatTime = (d: Date) => {
    const tz = location?.timezone ?? 'local';
    return DateTime.fromJSDate(d).setZone(tz).toFormat('h:mm a');
  };

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
    title: { color: theme.text, fontSize: 28, fontWeight: '700', marginBottom: 4 },
    subtitle: { color: theme.subText, fontSize: 13, marginBottom: 20 },
    // selectors
    sectionLabel: { color: theme.subText, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    btn: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    btnText: { fontSize: 14, fontWeight: '600' },
    // card
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
    // prayer row
    prayerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 10,
      marginBottom: 6,
      borderWidth: 1,
    },
    prayerIcon: { fontSize: 22, marginRight: 12 },
    prayerName: { color: theme.text, fontSize: 16, fontWeight: '600', flex: 1 },
    prayerTime: { color: theme.emerald, fontSize: 16, fontWeight: '700' },
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
    infoRowLast: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    infoKey: { color: theme.subText, fontSize: 13 },
    infoVal: { color: theme.text, fontSize: 13, fontWeight: '600' },
  });

  const PRAYERS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'] as const;

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.chipWrap}>
        <View style={s.chip}>
          <Text style={s.chipText}>Prayer Times</Text>
        </View>
      </View>
      <Text style={s.title}>Prayer Times</Text>
      <Text style={s.subtitle}>Today's salah schedule with calculation settings</Text>

      {/* Sect Selector */}
      <Text style={s.sectionLabel}>Sect</Text>
      <View style={s.row}>
        {(['sunni', 'shia'] as Sect[]).map((item) => {
          const active = sect === item;
          return (
            <TouchableOpacity
              key={item}
              style={[
                s.btn,
                {
                  backgroundColor: active ? theme.emeraldSoft : theme.card,
                  borderColor: active ? theme.emerald : theme.divider,
                },
              ]}
              onPress={() => {
                setSect(item);
                setMadhab(item === 'shia' ? 'jafari' : 'hanafi');
              }}
            >
              <Text style={[s.btnText, { color: active ? theme.emerald : theme.subText }]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Madhab Selector */}
      <Text style={s.sectionLabel}>Madhab</Text>
      <View style={s.row}>
        {madhabList.map((item) => {
          const active = madhab === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[
                s.btn,
                {
                  backgroundColor: active ? theme.emeraldSoft : theme.card,
                  borderColor: active ? theme.emerald : theme.divider,
                },
              ]}
              onPress={() => setMadhab(item.key)}
            >
              <Text style={[s.btnText, { color: active ? theme.emerald : theme.subText }]}>
                {item.label}
              </Text>
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

      {/* Prayer Times */}
      {!prayerData ? (
        <View style={s.noLocationCard}>
          <Text style={s.noLocationText}>
            Set your location in Settings to see prayer times
          </Text>
        </View>
      ) : (
        <View style={[s.card, { padding: 10 }]}>
          <Text style={[s.cardTitle, { marginBottom: 8, paddingHorizontal: 4 }]}>Today's Prayers</Text>
          {PRAYERS.map((key) => {
            const isActive = nextPrayer === key;
            return (
              <View
                key={key}
                style={[
                  s.prayerRow,
                  {
                    backgroundColor: isActive ? theme.accentSoft : 'transparent',
                    borderColor: isActive ? theme.accent : 'transparent',
                  },
                ]}
              >
                <Text style={s.prayerIcon}>{PRAYER_ICONS[key]}</Text>
                <Text style={s.prayerName}>{PRAYER_LABELS[key]}</Text>
                <Text style={s.prayerTime}>{formatTime(prayerData[key])}</Text>
              </View>
            );
          })}
        </View>
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
