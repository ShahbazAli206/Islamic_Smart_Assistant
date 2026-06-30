import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Switch, Dimensions,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { RootState } from '../../store';
import { Quran as QuranAPI } from '../../api/endpoints';
import { SUPPORTED_LANGUAGES } from '../../i18n';

const { width: SW } = Dimensions.get('window');

// ─── Design palette (light mode) ─────────────────────────────────────────────
const BG      = '#FFFFFF';
const CARD    = '#FFFFFF';
const EMERALD = '#10B981';
const GOLD    = '#DDB94B';
const TEXT    = '#0B1410';
const SUBTEXT = '#5C5A50';
const DIVIDER = '#E5E4DA';
const BG_SOFT = '#F8F9FA';
const GREEN_D = '#0D3320';

// Popular surah card colors
const SURAH_COLORS = [
  '#1A3A5C', '#0D3320', '#2D1B4E', '#1A3A2A', '#1C2B3A', '#3A1A2A',
];

interface Surah {
  id: number; name: string; arabic: string; meaning: string; ayahs: number; type: 'Meccan' | 'Medinan';
}

const SURAHS: Surah[] = [
  { id: 1,   name: 'Al-Fatiha',        arabic: 'الفاتحة',   meaning: 'The Opening',            ayahs: 7,   type: 'Meccan'  },
  { id: 2,   name: 'Al-Baqarah',       arabic: 'البقرة',    meaning: 'The Cow',                ayahs: 286, type: 'Medinan' },
  { id: 3,   name: "Ali 'Imran",       arabic: 'آل عمران',  meaning: 'Family of Imran',        ayahs: 200, type: 'Medinan' },
  { id: 4,   name: "An-Nisa",          arabic: 'النساء',    meaning: 'The Women',              ayahs: 176, type: 'Medinan' },
  { id: 5,   name: "Al-Ma'idah",       arabic: 'المائدة',   meaning: 'The Table Spread',       ayahs: 120, type: 'Medinan' },
  { id: 6,   name: "Al-An'am",         arabic: 'الأنعام',   meaning: 'The Cattle',             ayahs: 165, type: 'Meccan'  },
  { id: 7,   name: "Al-A'raf",         arabic: 'الأعراف',   meaning: 'The Heights',            ayahs: 206, type: 'Meccan'  },
  { id: 8,   name: 'Al-Anfal',         arabic: 'الأنفال',   meaning: 'The Spoils of War',      ayahs: 75,  type: 'Medinan' },
  { id: 9,   name: 'At-Tawbah',        arabic: 'التوبة',    meaning: 'The Repentance',         ayahs: 129, type: 'Medinan' },
  { id: 10,  name: 'Yunus',            arabic: 'يونس',      meaning: 'Jonah',                  ayahs: 109, type: 'Meccan'  },
  { id: 11,  name: 'Hud',              arabic: 'هود',       meaning: 'Hud',                    ayahs: 123, type: 'Meccan'  },
  { id: 12,  name: 'Yusuf',            arabic: 'يوسف',      meaning: 'Joseph',                 ayahs: 111, type: 'Meccan'  },
  { id: 13,  name: "Ar-Ra'd",          arabic: 'الرعد',     meaning: 'The Thunder',            ayahs: 43,  type: 'Medinan' },
  { id: 14,  name: 'Ibrahim',          arabic: 'إبراهيم',   meaning: 'Abraham',                ayahs: 52,  type: 'Meccan'  },
  { id: 15,  name: 'Al-Hijr',          arabic: 'الحجر',     meaning: 'The Rocky Tract',        ayahs: 99,  type: 'Meccan'  },
  { id: 16,  name: 'An-Nahl',          arabic: 'النحل',     meaning: 'The Bee',                ayahs: 128, type: 'Meccan'  },
  { id: 17,  name: "Al-Isra",          arabic: 'الإسراء',   meaning: 'The Night Journey',      ayahs: 111, type: 'Meccan'  },
  { id: 18,  name: 'Al-Kahf',          arabic: 'الكهف',     meaning: 'The Cave',               ayahs: 110, type: 'Meccan'  },
  { id: 19,  name: 'Maryam',           arabic: 'مريم',      meaning: 'Mary',                   ayahs: 98,  type: 'Meccan'  },
  { id: 20,  name: 'Ta-Ha',            arabic: 'طه',        meaning: 'Ta-Ha',                  ayahs: 135, type: 'Meccan'  },
  { id: 21,  name: "Al-Anbiya",        arabic: 'الأنبياء',  meaning: 'The Prophets',           ayahs: 112, type: 'Meccan'  },
  { id: 22,  name: 'Al-Hajj',          arabic: 'الحج',      meaning: 'The Pilgrimage',         ayahs: 78,  type: 'Medinan' },
  { id: 23,  name: "Al-Mu'minun",      arabic: 'المؤمنون',  meaning: 'The Believers',          ayahs: 118, type: 'Meccan'  },
  { id: 24,  name: 'An-Nur',           arabic: 'النور',     meaning: 'The Light',              ayahs: 64,  type: 'Medinan' },
  { id: 25,  name: 'Al-Furqan',        arabic: 'الفرقان',   meaning: 'The Criterion',          ayahs: 77,  type: 'Meccan'  },
  { id: 26,  name: "Ash-Shu'ara",      arabic: 'الشعراء',   meaning: 'The Poets',              ayahs: 227, type: 'Meccan'  },
  { id: 27,  name: 'An-Naml',          arabic: 'النمل',     meaning: 'The Ant',                ayahs: 93,  type: 'Meccan'  },
  { id: 28,  name: 'Al-Qasas',         arabic: 'القصص',     meaning: 'The Stories',            ayahs: 88,  type: 'Meccan'  },
  { id: 29,  name: "Al-'Ankabut",      arabic: 'العنكبوت',  meaning: 'The Spider',             ayahs: 69,  type: 'Meccan'  },
  { id: 30,  name: 'Ar-Rum',           arabic: 'الروم',     meaning: 'The Romans',             ayahs: 60,  type: 'Meccan'  },
  { id: 31,  name: 'Luqman',           arabic: 'لقمان',     meaning: 'Luqman',                 ayahs: 34,  type: 'Meccan'  },
  { id: 32,  name: 'As-Sajdah',        arabic: 'السجدة',    meaning: 'The Prostration',        ayahs: 30,  type: 'Meccan'  },
  { id: 33,  name: 'Al-Ahzab',         arabic: 'الأحزاب',   meaning: 'The Combined Forces',    ayahs: 73,  type: 'Medinan' },
  { id: 34,  name: "Saba",             arabic: 'سبأ',       meaning: 'Sheba',                  ayahs: 54,  type: 'Meccan'  },
  { id: 35,  name: 'Fatir',            arabic: 'فاطر',      meaning: 'Originator',             ayahs: 45,  type: 'Meccan'  },
  { id: 36,  name: 'Ya-Sin',           arabic: 'يس',        meaning: 'Ya-Sin',                 ayahs: 83,  type: 'Meccan'  },
  { id: 37,  name: 'As-Saffat',        arabic: 'الصافات',   meaning: 'Those who set the Ranks', ayahs: 182, type: 'Meccan' },
  { id: 38,  name: 'Sad',              arabic: 'ص',         meaning: 'The Letter Sad',         ayahs: 88,  type: 'Meccan'  },
  { id: 39,  name: 'Az-Zumar',         arabic: 'الزمر',     meaning: 'The Troops',             ayahs: 75,  type: 'Meccan'  },
  { id: 40,  name: 'Ghafir',           arabic: 'غافر',      meaning: 'The Forgiver',           ayahs: 85,  type: 'Meccan'  },
  { id: 41,  name: 'Fussilat',         arabic: 'فصلت',      meaning: 'Explained in Detail',    ayahs: 54,  type: 'Meccan'  },
  { id: 42,  name: 'Ash-Shura',        arabic: 'الشورى',    meaning: 'The Consultation',       ayahs: 53,  type: 'Meccan'  },
  { id: 43,  name: 'Az-Zukhruf',       arabic: 'الزخرف',    meaning: 'The Ornaments of Gold',  ayahs: 89,  type: 'Meccan'  },
  { id: 44,  name: 'Ad-Dukhan',        arabic: 'الدخان',    meaning: 'The Smoke',              ayahs: 59,  type: 'Meccan'  },
  { id: 45,  name: 'Al-Jathiyah',      arabic: 'الجاثية',   meaning: 'The Crouching',          ayahs: 37,  type: 'Meccan'  },
  { id: 46,  name: 'Al-Ahqaf',         arabic: 'الأحقاف',   meaning: 'The Wind-Curved Sandhills', ayahs: 35, type: 'Meccan' },
  { id: 47,  name: 'Muhammad',         arabic: 'محمد',      meaning: 'Muhammad',               ayahs: 38,  type: 'Medinan' },
  { id: 48,  name: 'Al-Fath',          arabic: 'الفتح',     meaning: 'The Victory',            ayahs: 29,  type: 'Medinan' },
  { id: 49,  name: 'Al-Hujurat',       arabic: 'الحجرات',   meaning: 'The Rooms',              ayahs: 18,  type: 'Medinan' },
  { id: 50,  name: 'Qaf',              arabic: 'ق',         meaning: 'The Letter Qaf',         ayahs: 45,  type: 'Meccan'  },
  { id: 51,  name: 'Adh-Dhariyat',     arabic: 'الذاريات',  meaning: 'The Winnowing Winds',    ayahs: 60,  type: 'Meccan'  },
  { id: 52,  name: 'At-Tur',           arabic: 'الطور',     meaning: 'The Mount',              ayahs: 49,  type: 'Meccan'  },
  { id: 53,  name: 'An-Najm',          arabic: 'النجم',     meaning: 'The Star',               ayahs: 62,  type: 'Meccan'  },
  { id: 54,  name: 'Al-Qamar',         arabic: 'القمر',     meaning: 'The Moon',               ayahs: 55,  type: 'Meccan'  },
  { id: 55,  name: 'Ar-Rahman',        arabic: 'الرحمن',    meaning: 'The Beneficent',         ayahs: 78,  type: 'Medinan' },
  { id: 56,  name: "Al-Waqi'ah",       arabic: 'الواقعة',   meaning: 'The Inevitable',         ayahs: 96,  type: 'Meccan'  },
  { id: 57,  name: 'Al-Hadid',         arabic: 'الحديد',    meaning: 'The Iron',               ayahs: 29,  type: 'Medinan' },
  { id: 58,  name: 'Al-Mujadila',      arabic: 'المجادلة',  meaning: 'The Pleading Woman',     ayahs: 22,  type: 'Medinan' },
  { id: 59,  name: 'Al-Hashr',         arabic: 'الحشر',     meaning: 'The Exile',              ayahs: 24,  type: 'Medinan' },
  { id: 60,  name: 'Al-Mumtahanah',    arabic: 'الممتحنة',  meaning: 'She that is to be Examined', ayahs: 13, type: 'Medinan' },
  { id: 61,  name: 'As-Saf',           arabic: 'الصف',      meaning: 'The Ranks',              ayahs: 14,  type: 'Medinan' },
  { id: 62,  name: "Al-Jumu'ah",       arabic: 'الجمعة',    meaning: 'The Congregation, Friday', ayahs: 11, type: 'Medinan' },
  { id: 63,  name: 'Al-Munafiqun',     arabic: 'المنافقون', meaning: 'The Hypocrites',         ayahs: 11,  type: 'Medinan' },
  { id: 64,  name: 'At-Taghabun',      arabic: 'التغابن',   meaning: 'The Mutual Disillusion', ayahs: 18,  type: 'Medinan' },
  { id: 65,  name: 'At-Talaq',         arabic: 'الطلاق',    meaning: 'The Divorce',            ayahs: 12,  type: 'Medinan' },
  { id: 66,  name: 'At-Tahrim',        arabic: 'التحريم',   meaning: 'The Prohibition',        ayahs: 12,  type: 'Medinan' },
  { id: 67,  name: 'Al-Mulk',          arabic: 'الملك',     meaning: 'The Sovereignty',        ayahs: 30,  type: 'Meccan'  },
  { id: 68,  name: 'Al-Qalam',         arabic: 'القلم',     meaning: 'The Pen',                ayahs: 52,  type: 'Meccan'  },
  { id: 69,  name: 'Al-Haqqah',        arabic: 'الحاقة',    meaning: 'The Reality',            ayahs: 52,  type: 'Meccan'  },
  { id: 70,  name: "Al-Ma'arij",       arabic: 'المعارج',   meaning: 'The Ascending Stairways', ayahs: 44, type: 'Meccan'  },
  { id: 71,  name: 'Nuh',              arabic: 'نوح',       meaning: 'Noah',                   ayahs: 28,  type: 'Meccan'  },
  { id: 72,  name: 'Al-Jinn',          arabic: 'الجن',      meaning: 'The Jinn',               ayahs: 28,  type: 'Meccan'  },
  { id: 73,  name: 'Al-Muzzammil',     arabic: 'المزمل',    meaning: 'The Enshrouded One',     ayahs: 20,  type: 'Meccan'  },
  { id: 74,  name: 'Al-Muddaththir',   arabic: 'المدثر',    meaning: 'The Cloaked One',        ayahs: 56,  type: 'Meccan'  },
  { id: 75,  name: 'Al-Qiyamah',       arabic: 'القيامة',   meaning: 'The Resurrection',       ayahs: 40,  type: 'Meccan'  },
  { id: 76,  name: 'Al-Insan',         arabic: 'الإنسان',   meaning: 'The Man',                ayahs: 31,  type: 'Medinan' },
  { id: 77,  name: 'Al-Mursalat',      arabic: 'المرسلات',  meaning: 'The Emissaries',         ayahs: 50,  type: 'Meccan'  },
  { id: 78,  name: "An-Naba",          arabic: 'النبأ',     meaning: 'The Tidings',            ayahs: 40,  type: 'Meccan'  },
  { id: 79,  name: "An-Nazi'at",       arabic: 'النازعات',  meaning: 'Those who Drag Forth',   ayahs: 46,  type: 'Meccan'  },
  { id: 80,  name: "'Abasa",           arabic: 'عبس',       meaning: 'He Frowned',             ayahs: 42,  type: 'Meccan'  },
  { id: 81,  name: 'At-Takwir',        arabic: 'التكوير',   meaning: 'The Overthrowing',       ayahs: 29,  type: 'Meccan'  },
  { id: 82,  name: 'Al-Infitar',       arabic: 'الانفطار',  meaning: 'The Cleaving',           ayahs: 19,  type: 'Meccan'  },
  { id: 83,  name: 'Al-Mutaffifin',    arabic: 'المطففين',  meaning: 'The Defrauding',         ayahs: 36,  type: 'Meccan'  },
  { id: 84,  name: 'Al-Inshiqaq',      arabic: 'الانشقاق',  meaning: 'The Sundering',          ayahs: 25,  type: 'Meccan'  },
  { id: 85,  name: 'Al-Buruj',         arabic: 'البروج',    meaning: 'The Mansions of the Stars', ayahs: 22, type: 'Meccan' },
  { id: 86,  name: 'At-Tariq',         arabic: 'الطارق',    meaning: 'The Nightcommer',        ayahs: 17,  type: 'Meccan'  },
  { id: 87,  name: "Al-A'la",          arabic: 'الأعلى',    meaning: 'The Most High',          ayahs: 19,  type: 'Meccan'  },
  { id: 88,  name: 'Al-Ghashiyah',     arabic: 'الغاشية',   meaning: 'The Overwhelming',       ayahs: 26,  type: 'Meccan'  },
  { id: 89,  name: 'Al-Fajr',          arabic: 'الفجر',     meaning: 'The Dawn',               ayahs: 30,  type: 'Meccan'  },
  { id: 90,  name: 'Al-Balad',         arabic: 'البلد',     meaning: 'The City',               ayahs: 20,  type: 'Meccan'  },
  { id: 91,  name: 'Ash-Shams',        arabic: 'الشمس',     meaning: 'The Sun',                ayahs: 15,  type: 'Meccan'  },
  { id: 92,  name: 'Al-Layl',          arabic: 'الليل',     meaning: 'The Night',              ayahs: 21,  type: 'Meccan'  },
  { id: 93,  name: 'Ad-Duhah',         arabic: 'الضحى',     meaning: 'The Morning Hours',      ayahs: 11,  type: 'Meccan'  },
  { id: 94,  name: 'Ash-Sharh',        arabic: 'الشرح',     meaning: 'The Relief',             ayahs: 8,   type: 'Meccan'  },
  { id: 95,  name: 'At-Tin',           arabic: 'التين',     meaning: 'The Fig',                ayahs: 8,   type: 'Meccan'  },
  { id: 96,  name: "Al-'Alaq",         arabic: 'العلق',     meaning: 'The Clot',               ayahs: 19,  type: 'Meccan'  },
  { id: 97,  name: 'Al-Qadr',          arabic: 'القدر',     meaning: 'The Power',              ayahs: 5,   type: 'Meccan'  },
  { id: 98,  name: 'Al-Bayyinah',      arabic: 'البينة',    meaning: 'The Clear Proof',        ayahs: 8,   type: 'Medinan' },
  { id: 99,  name: 'Az-Zalzalah',      arabic: 'الزلزلة',   meaning: 'The Earthquake',         ayahs: 8,   type: 'Medinan' },
  { id: 100, name: "Al-'Adiyat",       arabic: 'العاديات',  meaning: 'The Courser',            ayahs: 11,  type: 'Meccan'  },
  { id: 101, name: "Al-Qari'ah",       arabic: 'القارعة',   meaning: 'The Calamity',           ayahs: 11,  type: 'Meccan'  },
  { id: 102, name: 'At-Takathur',      arabic: 'التكاثر',   meaning: 'The Rivalry in World Increase', ayahs: 8, type: 'Meccan' },
  { id: 103, name: "Al-'Asr",          arabic: 'العصر',     meaning: 'The Declining Day',      ayahs: 3,   type: 'Meccan'  },
  { id: 104, name: 'Al-Humazah',       arabic: 'الهمزة',    meaning: 'The Traducer',           ayahs: 9,   type: 'Meccan'  },
  { id: 105, name: 'Al-Fil',           arabic: 'الفيل',     meaning: 'The Elephant',           ayahs: 5,   type: 'Meccan'  },
  { id: 106, name: 'Quraysh',          arabic: 'قريش',      meaning: 'Quraysh',                ayahs: 4,   type: 'Meccan'  },
  { id: 107, name: "Al-Ma'un",         arabic: 'الماعون',   meaning: 'The Small Kindnesses',   ayahs: 7,   type: 'Meccan'  },
  { id: 108, name: 'Al-Kawthar',       arabic: 'الكوثر',    meaning: 'The Abundance',          ayahs: 3,   type: 'Meccan'  },
  { id: 109, name: 'Al-Kafirun',       arabic: 'الكافرون',  meaning: 'The Disbelievers',       ayahs: 6,   type: 'Meccan'  },
  { id: 110, name: 'An-Nasr',          arabic: 'النصر',     meaning: 'The Divine Support',     ayahs: 3,   type: 'Medinan' },
  { id: 111, name: 'Al-Masad',         arabic: 'المسد',     meaning: 'The Palm Fiber',         ayahs: 5,   type: 'Meccan'  },
  { id: 112, name: 'Al-Ikhlas',        arabic: 'الإخلاص',   meaning: 'The Sincerity',          ayahs: 4,   type: 'Meccan'  },
  { id: 113, name: 'Al-Falaq',         arabic: 'الفلق',     meaning: 'The Daybreak',           ayahs: 5,   type: 'Meccan'  },
  { id: 114, name: 'An-Nas',           arabic: 'الناس',     meaning: 'Mankind',                ayahs: 6,   type: 'Meccan'  },
];

const POPULAR_IDS = [36, 55, 2, 67, 18, 56]; // Ya-Sin, Ar-Rahman, Al-Baqarah, Al-Mulk, Al-Kahf, Al-Waqiah

export function QuranPlayerScreen() {
  const [selected,    setSelected]    = useState<Surah>(SURAHS.find(s => s.id === 36)!);
  const [playing,     setPlaying]     = useState(false);
  const [withTranslation, setWithTranslation] = useState(true);
  const [query,       setQuery]       = useState('');
  const [translationText, setTranslationText] = useState<string | null>(null);

  const userLang = useSelector((s: RootState) => s.user.language);
  const { t } = useTranslation();
  const langName = SUPPORTED_LANGUAGES.find(l => l.code === userLang)?.name ?? 'English';

  useEffect(() => {
    if (!withTranslation) return;
    setTranslationText(null);
    QuranAPI.surah(selected.id, userLang)
      .then((data: any) => {
        const text = data?.translation ?? data?.text ?? data?.verses?.[0]?.translation ?? null;
        if (text) setTranslationText(String(text));
      })
      .catch(() => {});
  }, [selected.id, userLang, withTranslation]);

  const filtered = query
    ? SURAHS.filter(s =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.arabic.includes(query) ||
        String(s.id).includes(query)
      )
    : SURAHS;

  const popularSurahs = POPULAR_IDS.map(id => SURAHS.find(s => s.id === id)!);

  return (
    <ScrollView style={S.root} contentContainerStyle={S.content} showsVerticalScrollIndicator={false}>

      {/* ── Header image area ── */}
      <View style={S.heroBanner}>
        {/* Decorative layered background */}
        <View style={S.heroBgTop} />
        <View style={S.heroBgBottom} />
        {/* Quran book icon area */}
        <View style={S.heroContent}>
          <View style={S.heroLeft}>
            <Text style={S.heroTitle}>Holy Quran</Text>
            <Text style={S.heroArabic}>
              {'إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ'}
            </Text>
            <Text style={S.heroEn}>{t('quran.heroVerse')}</Text>
            <Text style={S.heroRef}>{t('quran.heroRef')}</Text>
          </View>
          <View style={S.heroRight}>
            <Text style={S.quranBookEmoji}>📖</Text>
          </View>
        </View>
      </View>

      {/* ── Popular Surahs ── */}
      <View style={S.section}>
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>Popular Surahs</Text>
          <TouchableOpacity><Text style={S.viewAll}>View all</Text></TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.popularRow}>
          {popularSurahs.map((s, i) => (
            <TouchableOpacity
              key={s.id}
              style={[S.popularCard, { backgroundColor: SURAH_COLORS[i % SURAH_COLORS.length] }]}
              onPress={() => setSelected(s)}
            >
              <Text style={S.popularNum}>{String(s.id).padStart(2, ' ')}</Text>
              <Text style={S.popularName}>{s.name}</Text>
              <Text style={S.popularArabic}>{s.arabic}</Text>
              <Text style={S.popularAyahs}>{s.ayahs} Verses</Text>
              <View style={S.popularTypeBadge}>
                <Text style={S.popularTypeText}>{s.type}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Audio Player card ── */}
      <View style={S.playerCard}>
        {/* Surah info header */}
        <View style={S.playerHeader}>
          <View style={{ flex: 1 }}>
            <Text style={S.playerSurahName}>
              {'سُورَةُ ' + selected.arabic}
            </Text>
            <Text style={S.playerSurahEn}>
              {selected.name} · {selected.ayahs} Ayahs
            </Text>
          </View>
          <Text style={S.playerArabicNum}>
            {String(selected.id).padStart(2, '0')}
          </Text>
        </View>

        {/* Toggle + dropdowns */}
        <View style={S.playerOptions}>
          <View style={S.translationToggleRow}>
            <View style={S.translationToggleLeft}>
              <Text style={S.playerOptionIcon}>📖</Text>
              <Text style={S.playerOptionLabel}>Recite with Translation</Text>
            </View>
            <Switch
              value={withTranslation}
              onValueChange={setWithTranslation}
              trackColor={{ false: DIVIDER, true: EMERALD + '80' }}
              thumbColor={withTranslation ? EMERALD : '#999'}
            />
          </View>
          <View style={S.playerDropdownRow}>
            <View style={S.playerDropdown}>
              <Text style={S.dropdownIcon}>🌐</Text>
              <Text style={S.dropdownLabel}>Translation Language</Text>
              <Text style={S.dropdownArrow}>›</Text>
            </View>
            <View style={S.playerDropdown}>
              <Text style={S.dropdownIcon}>🌐</Text>
              <Text style={S.dropdownLabel}>{langName}</Text>
              <Text style={S.dropdownArrow}>›</Text>
            </View>
          </View>
          <View style={[S.playerDropdown, { marginTop: 8 }]}>
            <Text style={S.dropdownIcon}>🎙</Text>
            <Text style={S.dropdownLabel}>Mishary Rashid Alafasy</Text>
            <Text style={S.dropdownArrow}>›</Text>
          </View>
        </View>

        {/* Controls */}
        <View style={S.controls}>
          <TouchableOpacity
            style={S.ctrlBtn}
            onPress={() => {
              const prev = SURAHS.find(s => s.id === selected.id - 1);
              if (prev) { setSelected(prev); setPlaying(false); }
            }}
          >
            <Text style={S.ctrlIcon}>⏮</Text>
          </TouchableOpacity>

          <TouchableOpacity style={S.playBtn} onPress={() => setPlaying(p => !p)}>
            <Text style={S.playIcon}>{playing ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={S.ctrlBtn}
            onPress={() => {
              const next = SURAHS.find(s => s.id === selected.id + 1);
              if (next) { setSelected(next); setPlaying(false); }
            }}
          >
            <Text style={S.ctrlIcon}>⏭</Text>
          </TouchableOpacity>
        </View>

        {/* Translation */}
        {withTranslation && (
          <View style={S.translationBox}>
            <Text style={S.translationArabic}>
              {'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ'}
            </Text>
            {translationText ? (
              <Text style={S.translationEn}>{translationText}</Text>
            ) : null}
          </View>
        )}

        {/* Progress bar */}
        <View style={S.progressBar}>
          <View style={S.progressFill} />
        </View>
        <View style={S.progressLabels}>
          <Text style={S.progressTime}>0:00</Text>
          <Text style={S.progressTime}>—:——</Text>
        </View>
      </View>

      {/* ── All Surahs ── */}
      <View style={S.section}>
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>All Surahs</Text>
        </View>
        {/* Search bar */}
        <View style={S.searchBar}>
          <Text style={{ fontSize: 14 }}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search Surah by name or number..."
            placeholderTextColor={SUBTEXT}
            value={query}
            onChangeText={setQuery}
          />
        </View>
        {/* Surah rows */}
        {filtered.slice(0, 20).map(s => (
          <TouchableOpacity
            key={s.id}
            style={[S.surahRow, selected.id === s.id && S.surahRowActive]}
            onPress={() => { setSelected(s); setPlaying(false); }}
          >
            <View style={[S.surahNum, selected.id === s.id && S.surahNumActive]}>
              <Text style={[S.surahNumText, selected.id === s.id && S.surahNumTextActive]}>
                {s.id}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[S.surahName, selected.id === s.id && S.surahNameActive]}>{s.name}</Text>
              <Text style={S.surahMeta}>{s.ayahs} Verses · {s.type}</Text>
            </View>
            <Text style={S.surahArabicName}>{s.arabic}</Text>
          </TouchableOpacity>
        ))}
        {filtered.length > 20 && (
          <TouchableOpacity style={S.browseAllBtn}>
            <Text style={S.browseAllText}>Browse All 114 Surahs ›</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: BG },
  content: { paddingBottom: 48 },

  // ── Hero banner ───────────────────────────────────────────────────────────
  heroBanner: { position: 'relative', overflow: 'hidden', marginBottom: 0 },
  heroBgTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 80,
    backgroundColor: '#EDF7F0',
  },
  heroBgBottom: {
    position: 'absolute', top: 80, left: 0, right: 0, bottom: 0,
    backgroundColor: BG,
  },
  heroContent: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 20, paddingTop: 24,
  },
  heroLeft:    { flex: 1, paddingRight: 12 },
  heroTitle:   { color: GREEN_D, fontSize: 24, fontWeight: '800', marginBottom: 8 },
  heroArabic:  { color: TEXT,    fontSize: 14, fontWeight: '600', textAlign: 'right', lineHeight: 22, marginBottom: 6 },
  heroEn:      { color: SUBTEXT, fontSize: 11, lineHeight: 17, marginBottom: 4 },
  heroRef:     { color: EMERALD, fontSize: 11, fontWeight: '600' },
  heroRight:   { alignItems: 'center', justifyContent: 'center' },
  quranBookEmoji: { fontSize: 52 },

  // ── Section ───────────────────────────────────────────────────────────────
  section:      { paddingHorizontal: 16, marginBottom: 24 },
  sectionHead:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { color: TEXT, fontSize: 17, fontWeight: '700' },
  viewAll:      { color: EMERALD, fontSize: 13, fontWeight: '600' },

  // ── Popular surahs ────────────────────────────────────────────────────────
  popularRow: { gap: 10 },
  popularCard: {
    width: 130, borderRadius: 18, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  popularNum:     { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '700', marginBottom: 2 },
  popularName:    { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 4 },
  popularArabic:  { color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'right', marginBottom: 6 },
  popularAyahs:   { color: 'rgba(255,255,255,0.6)', fontSize: 11, marginBottom: 6 },
  popularTypeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
  },
  popularTypeText: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '600' },

  // ── Player card ───────────────────────────────────────────────────────────
  playerCard: {
    marginHorizontal: 16, marginBottom: 24,
    backgroundColor: CARD, borderRadius: 20,
    borderWidth: 1, borderColor: DIVIDER,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12, elevation: 4,
    overflow: 'hidden',
  },
  playerHeader: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: GREEN_D, padding: 16,
  },
  playerSurahName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 3 },
  playerSurahEn:   { color: 'rgba(255,255,255,0.65)', fontSize: 12 },
  playerArabicNum: { color: GOLD, fontSize: 28, fontWeight: '800' },

  playerOptions: { padding: 16, borderBottomWidth: 1, borderBottomColor: DIVIDER },
  translationToggleRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 12,
  },
  translationToggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  playerOptionIcon:  { fontSize: 16 },
  playerOptionLabel: { color: TEXT, fontSize: 14, fontWeight: '600' },
  playerDropdownRow: { flexDirection: 'row', gap: 8 },
  playerDropdown: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: BG_SOFT, borderRadius: 10,
    borderWidth: 1, borderColor: DIVIDER,
    paddingHorizontal: 10, paddingVertical: 8,
  },
  dropdownIcon:  { fontSize: 14 },
  dropdownLabel: { flex: 1, color: TEXT, fontSize: 12, fontWeight: '500' },
  dropdownArrow: { color: SUBTEXT, fontSize: 16 },

  controls: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 20, paddingVertical: 18,
  },
  ctrlBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: BG_SOFT, borderWidth: 1, borderColor: DIVIDER,
    alignItems: 'center', justifyContent: 'center',
  },
  ctrlIcon: { fontSize: 18, color: TEXT },
  playBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: EMERALD, alignItems: 'center', justifyContent: 'center',
    shadowColor: EMERALD, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6,
  },
  playIcon: { fontSize: 24, color: '#FFFFFF' },

  translationBox: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#ECFDF5', borderRadius: 12,
    borderWidth: 1, borderColor: EMERALD + '30', padding: 14,
  },
  translationArabic: { color: TEXT, fontSize: 14, textAlign: 'right', lineHeight: 24, marginBottom: 8 },
  translationEn:     { color: SUBTEXT, fontSize: 13, lineHeight: 20 },

  progressBar: {
    height: 3, backgroundColor: DIVIDER,
    marginHorizontal: 16, borderRadius: 2, overflow: 'hidden', marginBottom: 4,
  },
  progressFill:   { height: '100%', width: '0%', backgroundColor: EMERALD, borderRadius: 2 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 16 },
  progressTime:   { color: SUBTEXT, fontSize: 11 },

  // ── All surahs ────────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: BG_SOFT, borderRadius: 12,
    borderWidth: 1, borderColor: DIVIDER,
    paddingHorizontal: 14, paddingVertical: 10,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: TEXT, fontSize: 14 },
  surahRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  surahRowActive:  {},
  surahNum: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: DIVIDER,
  },
  surahNumActive:  { backgroundColor: EMERALD, borderColor: EMERALD },
  surahNumText:    { color: TEXT,    fontSize: 13, fontWeight: '700' },
  surahNumTextActive: { color: '#FFFFFF' },
  surahName:       { color: TEXT,    fontSize: 15, fontWeight: '600', marginBottom: 2 },
  surahNameActive: { color: EMERALD },
  surahMeta:       { color: SUBTEXT, fontSize: 11 },
  surahArabicName: { color: TEXT,    fontSize: 16, fontWeight: '600' },
  browseAllBtn: {
    backgroundColor: EMERALD + '15',
    borderRadius: 14, borderWidth: 1, borderColor: EMERALD + '40',
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  browseAllText: { color: EMERALD, fontSize: 14, fontWeight: '700' },
});
