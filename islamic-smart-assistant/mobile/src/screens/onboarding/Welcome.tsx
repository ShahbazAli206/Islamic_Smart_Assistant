import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';

export function WelcomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.welcome')}</Text>
      <Text style={[styles.tagline, { color: theme.subText }]}>{t('onboarding.tagline')}</Text>
      <Pressable onPress={() => navigation.navigate('Language')} style={[styles.button, { backgroundColor: theme.accent }]}>
        <Text style={styles.buttonText}>{t('common.next')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 36, fontWeight: '700', marginBottom: 8 },
  tagline: { fontSize: 16, marginBottom: 48 },
  button: { paddingVertical: 14, paddingHorizontal: 48, borderRadius: 28 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
