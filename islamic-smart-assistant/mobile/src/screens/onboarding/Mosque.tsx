import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import MapLibreGL from '@maplibre/maplibre-react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { detectLocation } from '../../services/location';
import { Mosques, Users, type MosqueHit } from '../../api/endpoints';
import { setLocation, completeOnboarding } from '../../store/slices/user';
import { useTheme } from '../../theme';

// OpenFreeMap: free vector tiles, no API key. MapLibre needs no token either.
const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
MapLibreGL.setAccessToken(null);

export function MosqueScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();

  const [coords, setCoords] = useState<{ lat: number; lng: number; timezone: string } | null>(null);
  const [mosques, setMosques] = useState<MosqueHit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<MosqueHit | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      setMosques(await Mosques.nearby(lat, lng, 6000, 60));
    } catch (e: any) {
      Alert.alert('Mosque search failed', e?.message ?? 'Try again later.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const loc = await detectLocation();
        setCoords({ lat: loc.lat, lng: loc.lng, timezone: loc.timezone });
        await load(loc.lat, loc.lng);
      } catch (e: any) {
        Alert.alert('Location error', e?.message ?? 'Could not detect your location.');
        setLoading(false);
      }
    })();
  }, [load]);

  const confirm = async () => {
    if (!selected || !coords) return;
    setSaving(true);
    try {
      const loc = {
        lat: selected.lat,
        lng: selected.lng,
        timezone: coords.timezone,
        city: selected.city ?? selected.name,
        detected_via: 'manual' as const,
      };
      dispatch(setLocation(loc));
      await Users.setLocation(loc); // backend recalculates prayer times by the user's sect/madhab
      dispatch(completeOnboarding());
    } catch (e: any) {
      Alert.alert('Could not save mosque', e?.message ?? 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.chooseMosque', 'Choose your mosque')}</Text>

      <View style={styles.mapWrap}>
        {coords && (
          <MapLibreGL.MapView style={styles.map} styleURL={STYLE_URL}>
            <MapLibreGL.Camera centerCoordinate={[coords.lng, coords.lat]} zoomLevel={12} />
            {mosques.map((m) => (
              <MapLibreGL.PointAnnotation
                key={m.id}
                id={m.id}
                coordinate={[m.lng, m.lat]}
                onSelected={() => setSelected(m)}>
                <View
                  style={[
                    styles.pin,
                    { backgroundColor: selected?.id === m.id ? '#b8860b' : theme.accent },
                  ]}
                />
              </MapLibreGL.PointAnnotation>
            ))}
          </MapLibreGL.MapView>
        )}
        {loading && (
          <View style={styles.mapLoading}>
            <ActivityIndicator color={theme.accent} />
          </View>
        )}
      </View>

      <FlatList
        style={styles.list}
        data={mosques}
        keyExtractor={(m) => m.id}
        ListEmptyComponent={
          loading ? null : (
            <Text style={{ color: theme.subText, padding: 16 }}>
              {t('onboarding.noMosques', 'No mosques found nearby. Move closer or use GPS detection.')}
            </Text>
          )
        }
        renderItem={({ item }) => {
          const active = selected?.id === item.id;
          return (
            <Pressable
              onPress={() => setSelected(item)}
              style={[styles.row, { backgroundColor: active ? theme.accent : theme.card, borderColor: theme.divider }]}>
              <Text style={{ color: active ? '#FFF' : theme.text, fontWeight: '600' }}>{item.name}</Text>
              <Text style={{ color: active ? '#FFFFFFcc' : theme.subText, fontSize: 12 }}>
                {item.city ? item.city + ' · ' : ''}
                {item.distanceKm != null ? `${item.distanceKm.toFixed(1)} km` : ''}
              </Text>
            </Pressable>
          );
        }}
      />

      <Pressable
        onPress={confirm}
        disabled={!selected || saving}
        style={[styles.button, { backgroundColor: selected ? theme.accent : theme.divider }]}>
        {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{t('common.next', 'Use this mosque')}</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  mapWrap: { height: 240, borderRadius: 16, overflow: 'hidden', marginBottom: 12 },
  map: { flex: 1 },
  mapLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  pin: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: '#fff' },
  list: { flex: 1 },
  row: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  button: { marginTop: 8, paddingVertical: 14, borderRadius: 28, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
