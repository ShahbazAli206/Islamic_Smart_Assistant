import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { Devices as DevicesApi } from '../../api/endpoints';
import { useTheme } from '../../theme';

export function DevicesScreen() {
  const theme = useTheme();
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => { DevicesApi.list().then(setItems); }, []);
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Linked Devices</Text>
      <FlatList
        data={items}
        keyExtractor={(d) => d.id}
        renderItem={({ item }) => (
          <View style={[styles.item, { backgroundColor: theme.card, borderColor: theme.divider }]}>
            <View>
              <Text style={{ color: theme.text, fontWeight: '600' }}>{item.name ?? item.platform}</Text>
              <Text style={{ color: theme.subText, fontSize: 12 }}>{item.device_type} • {item.sync_group}</Text>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  item: { padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
});
