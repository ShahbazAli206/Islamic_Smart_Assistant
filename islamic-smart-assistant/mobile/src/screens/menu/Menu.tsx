import React from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { useTheme } from '../../theme';

// ─── Nav item type ─────────────────────────────────────────────────────────────

interface NavItem {
  icon: string;
  title: string;
  subtitle: string;
  screen: string;
}

// ─── Section data ──────────────────────────────────────────────────────────────

const WORSHIP_ITEMS: NavItem[] = [
  {
    icon: '🕐',
    title: 'Prayer Times',
    subtitle: 'Daily salah schedule with calculation settings',
    screen: 'PrayerTimes',
  },
  {
    icon: '📖',
    title: 'Holy Quran',
    subtitle: 'All 114 surahs · Arabic · Translations',
    screen: 'Quran',
  },
  {
    icon: '🧭',
    title: 'Qibla Finder',
    subtitle: 'Compass direction toward the Holy Kaaba',
    screen: 'Qibla',
  },
  {
    icon: '🔔',
    title: 'Azan Settings',
    subtitle: 'Configure prayer call voice and alerts',
    screen: 'Azan',
  },
  {
    icon: '⏰',
    title: 'Recitation Alarm',
    subtitle: 'Schedule Quran recitation with reminders',
    screen: 'Recitation',
  },
];

const ACCOUNT_ITEMS: NavItem[] = [
  {
    icon: '🏠',
    title: 'Overview',
    subtitle: 'Dashboard with prayer countdown and quick stats',
    screen: 'Home',
  },
  {
    icon: '👤',
    title: 'Profile',
    subtitle: 'Language, sect, fiqh and location settings',
    screen: 'Profile',
  },
  {
    icon: '📱',
    title: 'Devices',
    subtitle: 'Manage linked speakers and phones',
    screen: 'Devices',
  },
  {
    icon: '🎵',
    title: 'Audio Library',
    subtitle: 'Azan voices and custom audio packs',
    screen: 'Audio',
  },
  {
    icon: '📊',
    title: 'Analytics',
    subtitle: 'Usage insights and recitation trends',
    screen: 'Analytics',
  },
  {
    icon: '⚙️',
    title: 'Settings',
    subtitle: 'App preferences and account settings',
    screen: 'Settings',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function NavCard({
  item,
  onPress,
}: {
  item: NavItem;
  onPress: () => void;
}) {
  const theme = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.navCard,
        {
          backgroundColor: theme.card,
          borderColor: theme.divider,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onPress}
    >
      {/* Icon badge */}
      <View style={[styles.iconBadge, { backgroundColor: theme.accentSoft }]}>
        <Text style={styles.iconEmoji}>{item.icon}</Text>
      </View>

      {/* Text block */}
      <View style={styles.navCardBody}>
        <Text style={[styles.navCardTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.navCardSubtitle, { color: theme.subText }]} numberOfLines={1}>
          {item.subtitle}
        </Text>
      </View>

      {/* Arrow */}
      <Text style={[styles.navCardArrow, { color: theme.subText }]}>›</Text>
    </Pressable>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function MenuScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <View
          style={[
            styles.headerChip,
            { backgroundColor: theme.accentSoft, borderColor: theme.accent },
          ]}
        >
          <Text style={[styles.headerChipText, { color: theme.accent }]}>Menu</Text>
        </View>
        <Text style={[styles.headerTitle, { color: theme.text }]}>All Features</Text>
        <Text style={[styles.headerSubtitle, { color: theme.subText }]}>
          Quick access to all Islamic Smart Assistant tools
        </Text>
      </View>

      {/* ── Worship section ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.subText }]}>WORSHIP</Text>
        <View style={styles.navList}>
          {WORSHIP_ITEMS.map((item) => (
            <NavCard
              key={item.screen}
              item={item}
              onPress={() => navigation.navigate(item.screen)}
            />
          ))}
        </View>
      </View>

      {/* ── Account section ── */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: theme.subText }]}>ACCOUNT</Text>
        <View style={styles.navList}>
          {ACCOUNT_ITEMS.map((item) => (
            <NavCard
              key={item.screen}
              item={item}
              onPress={() => navigation.navigate(item.screen)}
            />
          ))}
        </View>
      </View>

      {/* ── Version footer ── */}
      <Text style={[styles.versionFooter, { color: theme.subText }]}>
        Islamic Smart Assistant v1.0.0
      </Text>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  content: {
    padding: 16,
    paddingBottom: 48,
  },

  // Header
  header: {
    marginBottom: 24,
  },
  headerChip: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 10,
  },
  headerChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },

  // Nav list
  navList: {
    gap: 8,
  },
  navCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
  },

  // Icon badge
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 22,
  },

  // Nav card text
  navCardBody: {
    flex: 1,
    gap: 2,
  },
  navCardTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  navCardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Arrow
  navCardArrow: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },

  // Footer
  versionFooter: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
});
