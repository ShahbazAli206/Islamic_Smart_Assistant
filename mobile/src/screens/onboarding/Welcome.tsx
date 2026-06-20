import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../theme';

export function WelcomeScreen({ navigation }: any) {
  const { t } = useTranslation();
  const theme = useTheme();
  const isDark = theme.scheme === 'dark';

  return (
    <View style={[styles.root, { backgroundColor: isDark ? '#080F19' : theme.bg }]}>
      {/* Islamic geometric accent */}
      <View style={styles.geometricAccent}>
        <Text style={{ fontSize: 80 }}>🕌</Text>
      </View>

      {/* Gold chip */}
      <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
        <Text style={{ fontSize: 12 }}>✨</Text>
        <Text style={[styles.chipText, { color: theme.accent }]}>Islamic Smart Assistant</Text>
      </View>

      {/* Arabic greeting */}
      <Text style={[styles.arabic, { color: theme.accent }]}>السلام عليكم</Text>

      {/* Title */}
      <Text style={[styles.title, { color: theme.text }]}>
        {t('onboarding.welcome')}
      </Text>
      <Text style={[styles.tagline, { color: theme.subText }]}>
        {t('onboarding.tagline')}
      </Text>

      {/* Feature pills */}
      <View style={styles.features}>
        {['🕐 Prayer Times', '📖 Holy Quran', '🧭 Qibla', '🔔 Azan', '📱 Devices'].map((f) => (
          <View key={f} style={[styles.featurePill, { backgroundColor: theme.card, borderColor: theme.divider }]}>
            <Text style={[styles.featureText, { color: theme.subText }]}>{f}</Text>
          </View>
        ))}
      </View>

      {/* CTA */}
      <Pressable
        onPress={() => navigation.navigate('Language')}
        style={[styles.button, { backgroundColor: theme.accent }]}
      >
        <Text style={styles.buttonText}>{t('common.next')} →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 28 },
  geometricAccent: { marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 20,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  arabic: { fontSize: 32, fontWeight: '700', marginBottom: 8, letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 10 },
  tagline: { fontSize: 15, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  features: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 36 },
  featurePill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  featureText: { fontSize: 12 },
  button: { paddingVertical: 15, paddingHorizontal: 52, borderRadius: 30 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
