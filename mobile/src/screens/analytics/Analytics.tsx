import React from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../theme';

// --------------- Mock Data ---------------

const DAILY_DATA = [
  { day: 'M', azan: 847, quran: 432 },
  { day: 'T', azan: 912, quran: 488 },
  { day: 'W', azan: 763, quran: 395 },
  { day: 'T', azan: 1034, quran: 521 },
  { day: 'F', azan: 1298, quran: 674 },
  { day: 'S', azan: 1152, quran: 589 },
  { day: 'S', azan: 987, quran: 502 },
  { day: 'M', azan: 876, quran: 441 },
  { day: 'T', azan: 945, quran: 478 },
  { day: 'W', azan: 803, quran: 412 },
  { day: 'T', azan: 1067, quran: 540 },
  { day: 'F', azan: 1321, quran: 701 },
  { day: 'S', azan: 1189, quran: 613 },
  { day: 'S', azan: 1043, quran: 527 },
];

const RECITER_DATA = [
  { name: 'Abdul Basit', pct: 38 },
  { name: 'Sudais', pct: 24 },
  { name: 'Alafasy', pct: 18 },
  { name: 'Husary', pct: 12 },
  { name: 'Other', pct: 8 },
];

const REGION_DATA = [
  { region: 'Pakistan', users: 14820 },
  { region: 'Saudi Arabia', users: 9210 },
  { region: 'Bangladesh', users: 7430 },
  { region: 'Turkey', users: 6150 },
  { region: 'Indonesia', users: 5840 },
];

const STAT_CARDS = [
  { icon: '👤', label: 'Total Users', value: '89,432', delta: '+12%' },
  { icon: '📱', label: 'Devices Online', value: '3,241', delta: null },
  { icon: '🔔', label: 'Azan Fired (24h)', value: '18,503', delta: null },
  { icon: '📖', label: 'Quran Played (24h)', value: '9,847', delta: null },
];

function formatUsers(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

export function AnalyticsScreen() {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const BAR_CHART_HEIGHT = 80;
  const maxBarValue = Math.max(...DAILY_DATA.map((d) => d.azan + d.quran));
  const barWidth = Math.floor((width - 64) / DAILY_DATA.length) - 2;
  const maxRegionUsers = Math.max(...REGION_DATA.map((r) => r.users));
  const maxReciterBarWidth = width - 120;

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
      marginTop: 4,
    },
    card: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      marginBottom: 16,
    },
    cardTitle: { color: theme.text, fontSize: 15, fontWeight: '700', marginBottom: 14 },
    // Stat cards
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 16,
    },
    statCard: {
      backgroundColor: theme.card,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.divider,
      padding: 14,
      width: (width - 42) / 2,
    },
    statIcon: { fontSize: 22, marginBottom: 8 },
    statValue: { color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 2 },
    statLabel: { color: theme.subText, fontSize: 12 },
    deltaBadge: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(16,185,129,0.15)',
      borderRadius: 10,
      paddingHorizontal: 7,
      paddingVertical: 2,
      marginTop: 6,
    },
    deltaText: { color: theme.emerald, fontSize: 11, fontWeight: '700' },
    // Bar chart
    chartRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, marginBottom: 6 },
    dayLabel: { color: theme.subText, fontSize: 10, textAlign: 'center', marginTop: 4 },
    legend: { flexDirection: 'row', gap: 16, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: theme.subText, fontSize: 12 },
    // Reciter bars
    reciterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    reciterName: { color: theme.text, fontSize: 13, fontWeight: '600', width: 100 },
    reciterBar: { height: 10, borderRadius: 5, backgroundColor: theme.emerald },
    reciterPct: { color: theme.subText, fontSize: 12, marginLeft: 8 },
    // Region rows
    regionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    regionRank: { color: theme.accent, fontSize: 13, fontWeight: '800', width: 24 },
    regionName: { color: theme.text, fontSize: 13, fontWeight: '600', width: 110 },
    regionBarWrap: { flex: 1, height: 10, backgroundColor: theme.cardAlt, borderRadius: 5, overflow: 'hidden' },
    regionBar: { height: 10, borderRadius: 5, backgroundColor: theme.accent },
    regionUsers: { color: theme.subText, fontSize: 12, marginLeft: 8, width: 44, textAlign: 'right' },
  });

  return (
    <ScrollView style={s.root} contentContainerStyle={s.content}>
      {/* Header */}
      <View style={s.chipWrap}>
        <View style={s.chip}>
          <Text style={s.chipText}>Analytics</Text>
        </View>
      </View>
      <Text style={s.title}>Analytics</Text>
      <Text style={s.subtitle}>Usage insights and recitation trends</Text>

      {/* Stat Cards */}
      <View style={s.statsGrid}>
        {STAT_CARDS.map((c) => (
          <View key={c.label} style={s.statCard}>
            <Text style={s.statIcon}>{c.icon}</Text>
            <Text style={s.statValue}>{c.value}</Text>
            <Text style={s.statLabel}>{c.label}</Text>
            {c.delta && (
              <View style={s.deltaBadge}>
                <Text style={s.deltaText}>{c.delta}</Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* 14-day Engagement Chart */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Engagement · 14 days</Text>
        <View style={s.chartRow}>
          {DAILY_DATA.map((d, i) => {
            const totalH = Math.round(((d.azan + d.quran) / maxBarValue) * BAR_CHART_HEIGHT);
            const azanH = Math.round((d.azan / (d.azan + d.quran)) * totalH);
            const quranH = totalH - azanH;
            return (
              <View key={i} style={{ alignItems: 'center' }}>
                <View style={{ width: barWidth, height: BAR_CHART_HEIGHT, justifyContent: 'flex-end' }}>
                  <View style={{ width: barWidth, height: azanH, backgroundColor: theme.emerald, borderTopLeftRadius: 3, borderTopRightRadius: 3 }} />
                  <View style={{ width: barWidth, height: quranH, backgroundColor: theme.accent }} />
                </View>
                <Text style={s.dayLabel}>{d.day}</Text>
              </View>
            );
          })}
        </View>
        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: theme.emerald }]} />
            <Text style={s.legendText}>Azan</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: theme.accent }]} />
            <Text style={s.legendText}>Quran</Text>
          </View>
        </View>
      </View>

      {/* Reciter Popularity */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Reciter Popularity</Text>
        {RECITER_DATA.map((r) => (
          <View key={r.name} style={s.reciterRow}>
            <Text style={s.reciterName}>{r.name}</Text>
            <View style={{ height: 10, backgroundColor: theme.cardAlt, borderRadius: 5, flex: 1, overflow: 'hidden' }}>
              <View
                style={[s.reciterBar, { width: (r.pct / 100) * maxReciterBarWidth }]}
              />
            </View>
            <Text style={s.reciterPct}>{r.pct}%</Text>
          </View>
        ))}
      </View>

      {/* Top Regions */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Top Regions</Text>
        {REGION_DATA.map((r, i) => (
          <View key={r.region} style={s.regionRow}>
            <Text style={s.regionRank}>#{i + 1}</Text>
            <Text style={s.regionName}>{r.region}</Text>
            <View style={s.regionBarWrap}>
              <View style={[s.regionBar, { width: `${Math.round((r.users / maxRegionUsers) * 100)}%` }]} />
            </View>
            <Text style={s.regionUsers}>{formatUsers(r.users)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
