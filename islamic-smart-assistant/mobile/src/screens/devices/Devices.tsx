import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Devices as DevicesApi } from '../../api/endpoints';
import { useTheme } from '../../theme';

const PLATFORM_ICONS: Record<string, string> = {
  android: '🤖',
  ios: '🍎',
  web: '🌐',
  desktop: '🖥',
};

const DEMO_DEVICES = [
  { id: 'demo1', name: 'My Phone', platform: 'android', device_type: 'mobile', sync_group: 'home' },
  { id: 'demo2', name: 'My Laptop', platform: 'web', device_type: 'desktop', sync_group: 'home' },
];

export function DevicesScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DevicesApi.list()
      .then((data) => setItems(data?.length ? data : DEMO_DEVICES))
      .catch(() => setItems(DEMO_DEVICES))
      .finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Text style={{ fontSize: 12 }}>📱</Text>
          <Text style={[styles.chipText, { color: theme.accent }]}>Devices</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>Linked Devices</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          Manage devices synced to your Islamic Smart Assistant
        </Text>
      </View>

      {/* Sync info card */}
      <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        <View style={styles.infoRow}>
          <Text style={{ fontSize: 22 }}>🔄</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.infoTitle, { color: theme.text }]}>One Tap, Every Speaker</Text>
            <Text style={[styles.infoSub, { color: theme.subText }]}>
              Azan plays on all linked devices simultaneously at prayer time
            </Text>
          </View>
        </View>
      </View>

      {/* Devices list */}
      <Text style={[styles.sectionLabel, { color: theme.subText }]}>YOUR DEVICES</Text>

      {loading ? (
        <ActivityIndicator color={theme.accent} style={{ marginVertical: 20 }} />
      ) : (
        items.map((device) => (
          <View
            key={device.id}
            style={[styles.deviceCard, { backgroundColor: theme.card, borderColor: theme.divider }]}
          >
            <View style={[styles.deviceIcon, { backgroundColor: theme.accentSoft }]}>
              <Text style={{ fontSize: 22 }}>
                {PLATFORM_ICONS[device.platform?.toLowerCase()] ?? '📱'}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.deviceName, { color: theme.text }]}>
                {device.name ?? device.platform ?? 'Unknown Device'}
              </Text>
              <Text style={[styles.deviceMeta, { color: theme.subText }]}>
                {device.device_type ?? 'Device'}
                {device.sync_group ? ` · ${device.sync_group}` : ''}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: theme.emeraldSoft }]}>
              <View style={[styles.statusDot, { backgroundColor: theme.emerald }]} />
              <Text style={[styles.statusText, { color: theme.emerald }]}>Synced</Text>
            </View>
          </View>
        ))
      )}

      {/* Add device card */}
      <Pressable
        style={[styles.addCard, { borderColor: theme.divider }]}
        onPress={() => {}}
      >
        <View style={[styles.addIcon, { backgroundColor: theme.accentSoft }]}>
          <Text style={{ fontSize: 22, color: theme.accent }}>+</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.addTitle, { color: theme.text }]}>Add a Device</Text>
          <Text style={[styles.addSub, { color: theme.subText }]}>
            Link a new speaker, phone, or computer
          </Text>
        </View>
        <Text style={{ fontSize: 16, color: theme.subText }}>›</Text>
      </Pressable>

      {/* Sync groups */}
      <Text style={[styles.sectionLabel, { color: theme.subText }]}>SYNC GROUPS</Text>
      <View style={[styles.groupCard, { backgroundColor: theme.card, borderColor: theme.divider }]}>
        {['home', 'office', 'travel'].map((group) => (
          <View key={group} style={[styles.groupRow, { borderBottomColor: theme.divider }]}>
            <Text style={{ fontSize: 16 }}>
              {group === 'home' ? '🏠' : group === 'office' ? '🏢' : '✈️'}
            </Text>
            <Text style={[styles.groupName, { color: theme.text }]}>
              {group.charAt(0).toUpperCase() + group.slice(1)}
            </Text>
            <Text style={[styles.groupCount, { color: theme.subText }]}>
              {items.filter((d) => d.sync_group === group).length} device(s)
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginBottom: 10,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13 },

  infoCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  infoSub: { fontSize: 12 },

  sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginTop: 4 },

  deviceCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 8,
  },
  deviceIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  deviceName: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  deviceMeta: { fontSize: 12 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: '600' },

  addCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, borderStyle: 'dashed',
    padding: 14, marginBottom: 20,
  },
  addIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  addTitle: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  addSub: { fontSize: 12 },

  groupCard: { borderWidth: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 8 },
  groupRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderBottomWidth: 1,
  },
  groupName: { flex: 1, fontSize: 14, fontWeight: '500' },
  groupCount: { fontSize: 12 },
});
