import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import en from './locales/en.json';
import ur from './locales/ur.json';
import ar from './locales/ar.json';
import tr from './locales/tr.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import ps from './locales/ps.json';

const resources = {
  en: { translation: en },
  ur: { translation: ur },
  ar: { translation: ar },
  tr: { translation: tr },
  fr: { translation: fr },
  zh: { translation: zh },
  ja: { translation: ja },
  hi: { translation: hi },
  bn: { translation: bn },
  ps: { translation: ps },
};

export const SUPPORTED_LANGUAGES: Array<{ code: keyof typeof resources; name: string; rtl: boolean }> = [
  { code: 'en', name: 'English',  rtl: false },
  { code: 'ur', name: 'اردو',     rtl: true  },
  { code: 'ar', name: 'العربية',  rtl: true  },
  { code: 'ps', name: 'پښتو',     rtl: true  },
  { code: 'tr', name: 'Türkçe',   rtl: false },
  { code: 'fr', name: 'Français', rtl: false },
  { code: 'zh', name: '中文',      rtl: false },
  { code: 'ja', name: '日本語',    rtl: false },
  { code: 'hi', name: 'हिन्दी',     rtl: false },
  { code: 'bn', name: 'বাংলা',     rtl: false },
];

export function setupI18n() {
  const fallback = RNLocalize.findBestLanguageTag(SUPPORTED_LANGUAGES.map((l) => l.code))?.languageTag ?? 'en';
  i18n.use(initReactI18next).init({
    resources,
    lng: fallback,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v3',
  });
}

export default i18n;
