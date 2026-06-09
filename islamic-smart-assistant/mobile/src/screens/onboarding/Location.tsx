import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { detectLocation } from '../../services/location';
import { setLocation, completeOnboarding } from '../../store/slices/user';
import { Users } from '../../api/endpoints';
import { useTheme } from '../../theme';

export function LocationScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<any>(null);
  const autoPrompted = useRef(false);

  const onDetect = async () => {
    setBusy(true);
    try {
      const loc = await detectLocation();
      setResolved(loc);
      dispatch(setLocation(loc));
      await Users.setLocation(loc);
      dispatch(completeOnboarding());
    } catch (err: any) {
      Alert.alert('Location error', err?.message ?? 'Failed to detect location');
    } finally {
      setBusy(false);
    }
  };

  // First launch: request location the moment this onboarding step appears, so
  // the OS permission prompt shows automatically. The button below stays as a
  // retry if the user dismisses or denies it.
  useEffect(() => {
    if (!autoPrompted.current) {
      autoPrompted.current = true;
      onDetect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.detectLocation')}</Text>
      {resolved && (
        <Text style={[styles.detected, { color: theme.accent }]}>
          {t('onboarding.locationDetected')}: {resolved.city ?? `${resolved.lat.toFixed(2)}, ${resolved.lng.toFixed(2)}`}
        </Text>
      )}
      <Pressable onPress={onDetect} disabled={busy} style={[styles.button, { backgroundColor: theme.accent }]}>
        {busy ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>{t('onboarding.detectLocation')}</Text>}
      </Pressable>

      <Pressable onPress={() => navigation.navigate('Mosque')} style={styles.linkBtn}>
        <Text style={[styles.linkText, { color: theme.accent }]}>
          {t('onboarding.chooseMosque', 'Or choose a specific mosque on the map')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 24 },
  detected: { fontSize: 16, marginBottom: 24, textAlign: 'center' },
  button: { paddingVertical: 14, paddingHorizontal: 48, borderRadius: 28 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  linkBtn: { marginTop: 20, padding: 8 },
  linkText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
