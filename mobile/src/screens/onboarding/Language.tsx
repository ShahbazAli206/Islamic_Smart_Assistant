import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';

import { SUPPORTED_LANGUAGES } from '../../i18n';
import i18n from '../../i18n';
import { setLanguage } from '../../store/slices/user';
import { useTheme } from '../../theme';

export function LanguageScreen({ navigation }: any) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { t } = useTranslation();

  const pick = (code: string) => {
    i18n.changeLanguage(code);
    dispatch(setLanguage(code));
    navigation.navigate('Sect');
  };

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <Text style={[styles.title, { color: theme.text }]}>{t('onboarding.chooseLanguage')}</Text>
      <FlatList
        data={SUPPORTED_LANGUAGES}
        keyExtractor={(item) => item.code}
        renderItem={({ item }) => (
          <Pressable onPress={() => pick(item.code)} style={[styles.item, { backgroundColor: theme.card, borderColor: theme.divider }]}>
            <Text style={[styles.itemText, { color: theme.text }]}>{item.name}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 24, paddingTop: 64 },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 16 },
  item: { padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1 },
  itemText: { fontSize: 16 },
});
