import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { detectLocation } from '../../services/location';
import { setLocation, completeOnboarding } from '../../store/slices/user';
import { Users } from '../../api/endpoints';
import { useTheme } from '../../theme';

type ErrorKind = 'permission_denied' | 'network' | 'unknown' | null;

export function LocationScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const [busy, setBusy] = useState(false);
  const [resolved, setResolved] = useState<any>(null);
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const autoPrompted = useRef(false);

  const onDetect = async () => {
    setBusy(true);
    setErrorKind(null);
    setErrorMsg('');
    try {
      const loc = await detectLocation();
      setResolved(loc);
      dispatch(setLocation(loc));
      Users.setLocation(loc).catch(() => {}); // non-fatal if backend is offline
      dispatch(completeOnboarding());
    } catch (err: any) {
      const msg: string = err?.message ?? 'Failed to detect location';
      if (msg.includes('permission') || msg.includes('denied')) {
        setErrorKind('permission_denied');
      } else if (msg.includes('network') || msg.includes('timeout') || msg.includes('connect')) {
        setErrorKind('network');
      } else {
        setErrorKind('unknown');
      }
      setErrorMsg(msg);
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

      {/* Error states */}
      {errorKind === 'permission_denied' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Location access denied</Text>
          <Text style={styles.errorBody}>
            Islamic Assistant needs location permission to calculate accurate prayer times.
            Please open App Settings and enable Location access.
          </Text>
          <Pressable
            onPress={() => Linking.openSettings()}
            style={[styles.settingsBtn, { backgroundColor: theme.accent }]}
          >
            <Text style={styles.settingsBtnText}>Open App Settings</Text>
          </Pressable>
        </View>
      )}

      {errorKind === 'network' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Network error</Text>
          <Text style={styles.errorBody}>
            Could not reach location services. Check your internet connection and try again.
          </Text>
        </View>
      )}

      {errorKind === 'unknown' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Location unavailable</Text>
          <Text style={styles.errorBody}>{errorMsg}</Text>
        </View>
      )}

      {!resolved && (
        <Pressable onPress={onDetect} disabled={busy} style={[styles.button, { backgroundColor: theme.accent }]}>
          {busy ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>
              {errorKind ? t('onboarding.retryLocation', 'Retry Detection') : t('onboarding.detectLocation')}
            </Text>
          )}
        </Pressable>
      )}

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
  button: { paddingVertical: 14, paddingHorizontal: 48, borderRadius: 28, marginTop: 8 },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  linkBtn: { marginTop: 20, padding: 8 },
  linkText: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorBox: {
    width: '100%', marginBottom: 20, padding: 16,
    borderRadius: 12, backgroundColor: '#fff3f3',
    borderWidth: 1, borderColor: '#fecaca',
  },
  errorTitle: { fontSize: 14, fontWeight: '700', color: '#b91c1c', marginBottom: 6 },
  errorBody: { fontSize: 13, color: '#7f1d1d', lineHeight: 19 },
  settingsBtn: {
    marginTop: 12, paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  settingsBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});
