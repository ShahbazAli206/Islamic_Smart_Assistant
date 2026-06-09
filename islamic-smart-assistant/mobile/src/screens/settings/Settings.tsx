import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { useTheme } from '../../theme';
import { RootState } from '../../store';
import { detectLocation } from '../../services/location';
import { setLocation } from '../../store/slices/user';
import { Users } from '../../api/endpoints';

export function SettingsScreen() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.user);
  const [busy, setBusy] = useState(false);

  const updateLocation = async () => {
    setBusy(true);
    try {
      const loc = await detectLocation();
      dispatch(setLocation(loc));
      await Users.setLocation(loc);
    } catch (err: any) {
      Alert.alert('Location error', err?.message ?? 'Failed to update location');
    } finally {
      setBusy(false);
    }
  };

  const locationValue = user.location
    ? user.location.city ?? `${user.location.lat.toFixed(2)}, ${user.location.lng.toFixed(2)}`
    : '—';

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>Settings</Text>
      <Row label="Language" value={user.language} theme={theme} />
      <Row label="Sect" value={user.sect ?? '—'} theme={theme} />
      <Row label="Fiqh" value={user.fiqh_method ?? '—'} theme={theme} />
      <Row label="City" value={locationValue} theme={theme} />

      <Pressable
        onPress={updateLocation}
        disabled={busy}
        style={[styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}
      >
        {busy ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.buttonText}>
            {user.location ? 'Update my location' : 'Detect my location'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

function Row({ label, value, theme }: { label: string; value: string; theme: any }) {
  return (
    <View style={[styles.row, { backgroundColor: theme.card, borderColor: theme.divider }]}>
      <Text style={{ color: theme.subText }}>{label}</Text>
      <Text style={{ color: theme.text, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  button: { marginTop: 16, paddingVertical: 14, borderRadius: 28, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
