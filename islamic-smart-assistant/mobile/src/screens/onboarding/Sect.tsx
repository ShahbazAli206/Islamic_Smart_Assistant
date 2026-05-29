import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { setSect, setFiqh } from '../../store/slices/user';
import { useTheme } from '../../theme';

const FIQH_BY_SECT = {
  sunni: ['hanafi', 'shafi', 'maliki', 'hanbali'] as const,
  shia: ['jafari'] as const,
};

export function SectScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const dispatch = useDispatch();
  const [sect, setS] = useState<'sunni' | 'shia' | null>(null);
  const [fiqh, setF] = useState<string | null>(null);

  const next = () => {
    if (!sect || !fiqh) return;
    dispatch(setSect(sect));
    dispatch(setFiqh(fiqh as any));
    navigation.navigate('Location');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.chooseSect')}</Text>
      <View style={styles.row}>
        {(['sunni', 'shia'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => { setS(s); setF(null); }}
            style={[styles.chip, { backgroundColor: sect === s ? theme.accent : theme.card, borderColor: theme.divider }]}
          >
            <Text style={{ color: sect === s ? '#FFF' : theme.text, fontWeight: '600' }}>{t(`onboarding.${s}`)}</Text>
          </Pressable>
        ))}
      </View>

      {sect && (
        <>
          <Text style={[styles.title, { color: theme.text, marginTop: 32 }]}>{t('onboarding.chooseFiqh')}</Text>
          <View style={styles.grid}>
            {FIQH_BY_SECT[sect].map((f) => (
              <Pressable
                key={f}
                onPress={() => setF(f)}
                style={[styles.chip, { backgroundColor: fiqh === f ? theme.accent : theme.card, borderColor: theme.divider }]}
              >
                <Text style={{ color: fiqh === f ? '#FFF' : theme.text, fontWeight: '600' }}>{t(`onboarding.${f}`)}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      <Pressable
        onPress={next}
        disabled={!sect || !fiqh}
        style={[styles.button, { backgroundColor: sect && fiqh ? theme.accent : theme.divider }]}
      >
        <Text style={styles.buttonText}>{t('common.next')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 64 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  row: { flexDirection: 'row', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  chip: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, borderWidth: 1 },
  button: { marginTop: 'auto', paddingVertical: 14, borderRadius: 28, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
