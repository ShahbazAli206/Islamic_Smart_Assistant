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
import fa from './locales/fa.json';
import ru from './locales/ru.json';
import kk from './locales/kk.json';
import de from './locales/de.json';
import es from './locales/es.json';
import nl from './locales/nl.json';
import it from './locales/it.json';
import sv from './locales/sv.json';
import bs from './locales/bs.json';
import sq from './locales/sq.json';
import pl from './locales/pl.json';
import pt from './locales/pt.json';
import id from './locales/id.json';
import ms from './locales/ms.json';
import ta from './locales/ta.json';
import ml from './locales/ml.json';
import ko from './locales/ko.json';
import th from './locales/th.json';
import my from './locales/my.json';
import si from './locales/si.json';
import uz from './locales/uz.json';
import sw from './locales/sw.json';
import so from './locales/so.json';
import am from './locales/am.json';
import az from './locales/az.json';
import cs from './locales/cs.json';
import bg from './locales/bg.json';
import ro from './locales/ro.json';

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
  fa: { translation: fa },
  ru: { translation: ru },
  kk: { translation: kk },
  de: { translation: de },
  es: { translation: es },
  nl: { translation: nl },
  it: { translation: it },
  sv: { translation: sv },
  bs: { translation: bs },
  sq: { translation: sq },
  pl: { translation: pl },
  pt: { translation: pt },
  id: { translation: id },
  ms: { translation: ms },
  ta: { translation: ta },
  ml: { translation: ml },
  ko: { translation: ko },
  th: { translation: th },
  my: { translation: my },
  si: { translation: si },
  uz: { translation: uz },
  sw: { translation: sw },
  so: { translation: so },
  am: { translation: am },
  az: { translation: az },
  cs: { translation: cs },
  bg: { translation: bg },
  ro: { translation: ro },
};

// Every language the Qur'an translation dropdown offers (see LANGUAGE_OPTIONS
// in the web app's lib/quran.ts), so the language switcher matches app-wide.
// Only en/ur/ar/tr/fr/zh/ja/hi/bn/ps have been reviewed by native speakers;
// the rest are best-effort machine-assisted translations of the azan/quran/
// qibla strings (common UI chrome falls back to English) — flag for
// native-speaker review before treating as final.
export const SUPPORTED_LANGUAGES: Array<{ code: keyof typeof resources; name: string; rtl: boolean }> = [
  { code: 'en', name: 'English',     rtl: false },
  { code: 'ur', name: 'اردو',        rtl: true  },
  { code: 'ar', name: 'العربية',     rtl: true  },
  { code: 'ps', name: 'پښتو',        rtl: true  },
  { code: 'fa', name: 'فارسی',       rtl: true  },
  { code: 'tr', name: 'Türkçe',      rtl: false },
  { code: 'fr', name: 'Français',    rtl: false },
  { code: 'zh', name: '中文',         rtl: false },
  { code: 'ja', name: '日本語',       rtl: false },
  { code: 'hi', name: 'हिन्दी',        rtl: false },
  { code: 'bn', name: 'বাংলা',        rtl: false },
  { code: 'ru', name: 'Русский',     rtl: false },
  { code: 'kk', name: 'Қазақша',     rtl: false },
  { code: 'de', name: 'Deutsch',     rtl: false },
  { code: 'es', name: 'Español',     rtl: false },
  { code: 'nl', name: 'Nederlands',  rtl: false },
  { code: 'it', name: 'Italiano',    rtl: false },
  { code: 'sv', name: 'Svenska',     rtl: false },
  { code: 'bs', name: 'Bosanski',    rtl: false },
  { code: 'sq', name: 'Shqip',       rtl: false },
  { code: 'pl', name: 'Polski',      rtl: false },
  { code: 'pt', name: 'Português',   rtl: false },
  { code: 'id', name: 'Indonesia',   rtl: false },
  { code: 'ms', name: 'Melayu',      rtl: false },
  { code: 'ta', name: 'தமிழ்',        rtl: false },
  { code: 'ml', name: 'മലയാളം',      rtl: false },
  { code: 'ko', name: '한국어',       rtl: false },
  { code: 'th', name: 'ไทย',         rtl: false },
  { code: 'my', name: 'မြန်မာ',       rtl: false },
  { code: 'si', name: 'සිංහල',       rtl: false },
  { code: 'uz', name: 'Oʻzbek',      rtl: false },
  { code: 'sw', name: 'Kiswahili',   rtl: false },
  { code: 'so', name: 'Soomaali',    rtl: false },
  { code: 'am', name: 'አማርኛ',        rtl: false },
  { code: 'az', name: 'Azərbaycan',  rtl: false },
  { code: 'cs', name: 'Čeština',     rtl: false },
  { code: 'bg', name: 'Български',   rtl: false },
  { code: 'ro', name: 'Română',      rtl: false },
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
