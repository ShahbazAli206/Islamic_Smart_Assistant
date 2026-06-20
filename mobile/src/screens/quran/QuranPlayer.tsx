import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet,
  ActivityIndicator, FlatList,
} from 'react-native';
import { useTheme } from '../../theme';

interface Surah {
  id: number;
  name: string;
  arabic: string;
  meaning: string;
  ayahs: number;
  type: 'Meccan' | 'Medinan';
}

const SURAHS: Surah[] = [
  { id: 1, name: 'Al-Fatiha', arabic: 'الفاتحة', meaning: 'The Opening', ayahs: 7, type: 'Meccan' },
  { id: 2, name: 'Al-Baqarah', arabic: 'البقرة', meaning: 'The Cow', ayahs: 286, type: 'Medinan' },
  { id: 3, name: "Ali 'Imran", arabic: 'آل عمران', meaning: 'Family of Imran', ayahs: 200, type: 'Medinan' },
  { id: 4, name: "An-Nisa", arabic: 'النساء', meaning: 'The Women', ayahs: 176, type: 'Medinan' },
  { id: 5, name: "Al-Ma'idah", arabic: 'المائدة', meaning: 'The Table Spread', ayahs: 120, type: 'Medinan' },
  { id: 6, name: "Al-An'am", arabic: 'الأنعام', meaning: 'The Cattle', ayahs: 165, type: 'Meccan' },
  { id: 7, name: "Al-A'raf", arabic: 'الأعراف', meaning: 'The Heights', ayahs: 206, type: 'Meccan' },
  { id: 8, name: 'Al-Anfal', arabic: 'الأنفال', meaning: 'The Spoils of War', ayahs: 75, type: 'Medinan' },
  { id: 9, name: 'At-Tawbah', arabic: 'التوبة', meaning: 'The Repentance', ayahs: 129, type: 'Medinan' },
  { id: 10, name: 'Yunus', arabic: 'يونس', meaning: 'Jonah', ayahs: 109, type: 'Meccan' },
  { id: 11, name: 'Hud', arabic: 'هود', meaning: 'Hud', ayahs: 123, type: 'Meccan' },
  { id: 12, name: 'Yusuf', arabic: 'يوسف', meaning: 'Joseph', ayahs: 111, type: 'Meccan' },
  { id: 13, name: "Ar-Ra'd", arabic: 'الرعد', meaning: 'The Thunder', ayahs: 43, type: 'Medinan' },
  { id: 14, name: 'Ibrahim', arabic: 'إبراهيم', meaning: 'Abraham', ayahs: 52, type: 'Meccan' },
  { id: 15, name: 'Al-Hijr', arabic: 'الحجر', meaning: 'The Rocky Tract', ayahs: 99, type: 'Meccan' },
  { id: 16, name: 'An-Nahl', arabic: 'النحل', meaning: 'The Bee', ayahs: 128, type: 'Meccan' },
  { id: 17, name: "Al-Isra", arabic: 'الإسراء', meaning: 'The Night Journey', ayahs: 111, type: 'Meccan' },
  { id: 18, name: 'Al-Kahf', arabic: 'الكهف', meaning: 'The Cave', ayahs: 110, type: 'Meccan' },
  { id: 19, name: 'Maryam', arabic: 'مريم', meaning: 'Mary', ayahs: 98, type: 'Meccan' },
  { id: 20, name: 'Ta-Ha', arabic: 'طه', meaning: 'Ta-Ha', ayahs: 135, type: 'Meccan' },
  { id: 21, name: "Al-Anbiya", arabic: 'الأنبياء', meaning: 'The Prophets', ayahs: 112, type: 'Meccan' },
  { id: 22, name: 'Al-Hajj', arabic: 'الحج', meaning: 'The Pilgrimage', ayahs: 78, type: 'Medinan' },
  { id: 23, name: "Al-Mu'minun", arabic: 'المؤمنون', meaning: 'The Believers', ayahs: 118, type: 'Meccan' },
  { id: 24, name: 'An-Nur', arabic: 'النور', meaning: 'The Light', ayahs: 64, type: 'Medinan' },
  { id: 25, name: 'Al-Furqan', arabic: 'الفرقان', meaning: 'The Criterion', ayahs: 77, type: 'Meccan' },
  { id: 26, name: "Ash-Shu'ara", arabic: 'الشعراء', meaning: 'The Poets', ayahs: 227, type: 'Meccan' },
  { id: 27, name: 'An-Naml', arabic: 'النمل', meaning: 'The Ant', ayahs: 93, type: 'Meccan' },
  { id: 28, name: 'Al-Qasas', arabic: 'القصص', meaning: 'The Stories', ayahs: 88, type: 'Meccan' },
  { id: 29, name: "Al-'Ankabut", arabic: 'العنكبوت', meaning: 'The Spider', ayahs: 69, type: 'Meccan' },
  { id: 30, name: 'Ar-Rum', arabic: 'الروم', meaning: 'The Romans', ayahs: 60, type: 'Meccan' },
  { id: 31, name: 'Luqman', arabic: 'لقمان', meaning: 'Luqman', ayahs: 34, type: 'Meccan' },
  { id: 32, name: 'As-Sajdah', arabic: 'السجدة', meaning: 'The Prostration', ayahs: 30, type: 'Meccan' },
  { id: 33, name: 'Al-Ahzab', arabic: 'الأحزاب', meaning: 'The Combined Forces', ayahs: 73, type: 'Medinan' },
  { id: 34, name: "Saba", arabic: 'سبأ', meaning: 'Sheba', ayahs: 54, type: 'Meccan' },
  { id: 35, name: 'Fatir', arabic: 'فاطر', meaning: 'Originator', ayahs: 45, type: 'Meccan' },
  { id: 36, name: 'Ya-Sin', arabic: 'يس', meaning: 'Ya-Sin', ayahs: 83, type: 'Meccan' },
  { id: 37, name: 'As-Saffat', arabic: 'الصافات', meaning: 'Those who set the Ranks', ayahs: 182, type: 'Meccan' },
  { id: 38, name: 'Sad', arabic: 'ص', meaning: 'The Letter Sad', ayahs: 88, type: 'Meccan' },
  { id: 39, name: 'Az-Zumar', arabic: 'الزمر', meaning: 'The Troops', ayahs: 75, type: 'Meccan' },
  { id: 40, name: 'Ghafir', arabic: 'غافر', meaning: 'The Forgiver', ayahs: 85, type: 'Meccan' },
  { id: 41, name: 'Fussilat', arabic: 'فصلت', meaning: 'Explained in Detail', ayahs: 54, type: 'Meccan' },
  { id: 42, name: 'Ash-Shura', arabic: 'الشورى', meaning: 'The Consultation', ayahs: 53, type: 'Meccan' },
  { id: 43, name: 'Az-Zukhruf', arabic: 'الزخرف', meaning: 'The Ornaments of Gold', ayahs: 89, type: 'Meccan' },
  { id: 44, name: 'Ad-Dukhan', arabic: 'الدخان', meaning: 'The Smoke', ayahs: 59, type: 'Meccan' },
  { id: 45, name: 'Al-Jathiyah', arabic: 'الجاثية', meaning: 'The Crouching', ayahs: 37, type: 'Meccan' },
  { id: 46, name: 'Al-Ahqaf', arabic: 'الأحقاف', meaning: 'The Wind-Curved Sandhills', ayahs: 35, type: 'Meccan' },
  { id: 47, name: 'Muhammad', arabic: 'محمد', meaning: 'Muhammad', ayahs: 38, type: 'Medinan' },
  { id: 48, name: 'Al-Fath', arabic: 'الفتح', meaning: 'The Victory', ayahs: 29, type: 'Medinan' },
  { id: 49, name: 'Al-Hujurat', arabic: 'الحجرات', meaning: 'The Rooms', ayahs: 18, type: 'Medinan' },
  { id: 50, name: 'Qaf', arabic: 'ق', meaning: 'The Letter Qaf', ayahs: 45, type: 'Meccan' },
  { id: 51, name: 'Adh-Dhariyat', arabic: 'الذاريات', meaning: 'The Winnowing Winds', ayahs: 60, type: 'Meccan' },
  { id: 52, name: 'At-Tur', arabic: 'الطور', meaning: 'The Mount', ayahs: 49, type: 'Meccan' },
  { id: 53, name: 'An-Najm', arabic: 'النجم', meaning: 'The Star', ayahs: 62, type: 'Meccan' },
  { id: 54, name: 'Al-Qamar', arabic: 'القمر', meaning: 'The Moon', ayahs: 55, type: 'Meccan' },
  { id: 55, name: 'Ar-Rahman', arabic: 'الرحمن', meaning: 'The Beneficent', ayahs: 78, type: 'Medinan' },
  { id: 56, name: "Al-Waqi'ah", arabic: 'الواقعة', meaning: 'The Inevitable', ayahs: 96, type: 'Meccan' },
  { id: 57, name: 'Al-Hadid', arabic: 'الحديد', meaning: 'The Iron', ayahs: 29, type: 'Medinan' },
  { id: 58, name: 'Al-Mujadila', arabic: 'المجادلة', meaning: 'The Pleading Woman', ayahs: 22, type: 'Medinan' },
  { id: 59, name: 'Al-Hashr', arabic: 'الحشر', meaning: 'The Exile', ayahs: 24, type: 'Medinan' },
  { id: 60, name: 'Al-Mumtahanah', arabic: 'الممتحنة', meaning: 'She that is to be Examined', ayahs: 13, type: 'Medinan' },
  { id: 61, name: 'As-Saf', arabic: 'الصف', meaning: 'The Ranks', ayahs: 14, type: 'Medinan' },
  { id: 62, name: "Al-Jumu'ah", arabic: 'الجمعة', meaning: 'The Congregation, Friday', ayahs: 11, type: 'Medinan' },
  { id: 63, name: 'Al-Munafiqun', arabic: 'المنافقون', meaning: 'The Hypocrites', ayahs: 11, type: 'Medinan' },
  { id: 64, name: 'At-Taghabun', arabic: 'التغابن', meaning: 'The Mutual Disillusion', ayahs: 18, type: 'Medinan' },
  { id: 65, name: 'At-Talaq', arabic: 'الطلاق', meaning: 'The Divorce', ayahs: 12, type: 'Medinan' },
  { id: 66, name: 'At-Tahrim', arabic: 'التحريم', meaning: 'The Prohibition', ayahs: 12, type: 'Medinan' },
  { id: 67, name: 'Al-Mulk', arabic: 'الملك', meaning: 'The Sovereignty', ayahs: 30, type: 'Meccan' },
  { id: 68, name: 'Al-Qalam', arabic: 'القلم', meaning: 'The Pen', ayahs: 52, type: 'Meccan' },
  { id: 69, name: 'Al-Haqqah', arabic: 'الحاقة', meaning: 'The Reality', ayahs: 52, type: 'Meccan' },
  { id: 70, name: "Al-Ma'arij", arabic: 'المعارج', meaning: 'The Ascending Stairways', ayahs: 44, type: 'Meccan' },
  { id: 71, name: 'Nuh', arabic: 'نوح', meaning: 'Noah', ayahs: 28, type: 'Meccan' },
  { id: 72, name: 'Al-Jinn', arabic: 'الجن', meaning: 'The Jinn', ayahs: 28, type: 'Meccan' },
  { id: 73, name: 'Al-Muzzammil', arabic: 'المزمل', meaning: 'The Enshrouded One', ayahs: 20, type: 'Meccan' },
  { id: 74, name: 'Al-Muddaththir', arabic: 'المدثر', meaning: 'The Cloaked One', ayahs: 56, type: 'Meccan' },
  { id: 75, name: 'Al-Qiyamah', arabic: 'القيامة', meaning: 'The Resurrection', ayahs: 40, type: 'Meccan' },
  { id: 76, name: 'Al-Insan', arabic: 'الإنسان', meaning: 'The Man', ayahs: 31, type: 'Medinan' },
  { id: 77, name: 'Al-Mursalat', arabic: 'المرسلات', meaning: 'The Emissaries', ayahs: 50, type: 'Meccan' },
  { id: 78, name: "An-Naba", arabic: 'النبأ', meaning: 'The Tidings', ayahs: 40, type: 'Meccan' },
  { id: 79, name: "An-Nazi'at", arabic: 'النازعات', meaning: 'Those who Drag Forth', ayahs: 46, type: 'Meccan' },
  { id: 80, name: "'Abasa", arabic: 'عبس', meaning: 'He Frowned', ayahs: 42, type: 'Meccan' },
  { id: 81, name: 'At-Takwir', arabic: 'التكوير', meaning: 'The Overthrowing', ayahs: 29, type: 'Meccan' },
  { id: 82, name: 'Al-Infitar', arabic: 'الانفطار', meaning: 'The Cleaving', ayahs: 19, type: 'Meccan' },
  { id: 83, name: 'Al-Mutaffifin', arabic: 'المطففين', meaning: 'The Defrauding', ayahs: 36, type: 'Meccan' },
  { id: 84, name: 'Al-Inshiqaq', arabic: 'الانشقاق', meaning: 'The Sundering', ayahs: 25, type: 'Meccan' },
  { id: 85, name: 'Al-Buruj', arabic: 'البروج', meaning: 'The Mansions of the Stars', ayahs: 22, type: 'Meccan' },
  { id: 86, name: 'At-Tariq', arabic: 'الطارق', meaning: 'The Nightcommer', ayahs: 17, type: 'Meccan' },
  { id: 87, name: "Al-A'la", arabic: 'الأعلى', meaning: 'The Most High', ayahs: 19, type: 'Meccan' },
  { id: 88, name: 'Al-Ghashiyah', arabic: 'الغاشية', meaning: 'The Overwhelming', ayahs: 26, type: 'Meccan' },
  { id: 89, name: 'Al-Fajr', arabic: 'الفجر', meaning: 'The Dawn', ayahs: 30, type: 'Meccan' },
  { id: 90, name: 'Al-Balad', arabic: 'البلد', meaning: 'The City', ayahs: 20, type: 'Meccan' },
  { id: 91, name: 'Ash-Shams', arabic: 'الشمس', meaning: 'The Sun', ayahs: 15, type: 'Meccan' },
  { id: 92, name: 'Al-Layl', arabic: 'الليل', meaning: 'The Night', ayahs: 21, type: 'Meccan' },
  { id: 93, name: 'Ad-Duhah', arabic: 'الضحى', meaning: 'The Morning Hours', ayahs: 11, type: 'Meccan' },
  { id: 94, name: 'Ash-Sharh', arabic: 'الشرح', meaning: 'The Relief', ayahs: 8, type: 'Meccan' },
  { id: 95, name: 'At-Tin', arabic: 'التين', meaning: 'The Fig', ayahs: 8, type: 'Meccan' },
  { id: 96, name: "Al-'Alaq", arabic: 'العلق', meaning: 'The Clot', ayahs: 19, type: 'Meccan' },
  { id: 97, name: 'Al-Qadr', arabic: 'القدر', meaning: 'The Power', ayahs: 5, type: 'Meccan' },
  { id: 98, name: 'Al-Bayyinah', arabic: 'البينة', meaning: 'The Clear Proof', ayahs: 8, type: 'Medinan' },
  { id: 99, name: 'Az-Zalzalah', arabic: 'الزلزلة', meaning: 'The Earthquake', ayahs: 8, type: 'Medinan' },
  { id: 100, name: "Al-'Adiyat", arabic: 'العاديات', meaning: 'The Courser', ayahs: 11, type: 'Meccan' },
  { id: 101, name: "Al-Qari'ah", arabic: 'القارعة', meaning: 'The Calamity', ayahs: 11, type: 'Meccan' },
  { id: 102, name: 'At-Takathur', arabic: 'التكاثر', meaning: 'The Rivalry in World Increase', ayahs: 8, type: 'Meccan' },
  { id: 103, name: "Al-'Asr", arabic: 'العصر', meaning: 'The Declining Day', ayahs: 3, type: 'Meccan' },
  { id: 104, name: 'Al-Humazah', arabic: 'الهمزة', meaning: 'The Traducer', ayahs: 9, type: 'Meccan' },
  { id: 105, name: 'Al-Fil', arabic: 'الفيل', meaning: 'The Elephant', ayahs: 5, type: 'Meccan' },
  { id: 106, name: 'Quraysh', arabic: 'قريش', meaning: 'Quraysh', ayahs: 4, type: 'Meccan' },
  { id: 107, name: "Al-Ma'un", arabic: 'الماعون', meaning: 'The Small Kindnesses', ayahs: 7, type: 'Meccan' },
  { id: 108, name: 'Al-Kawthar', arabic: 'الكوثر', meaning: 'The Abundance', ayahs: 3, type: 'Meccan' },
  { id: 109, name: 'Al-Kafirun', arabic: 'الكافرون', meaning: 'The Disbelievers', ayahs: 6, type: 'Meccan' },
  { id: 110, name: 'An-Nasr', arabic: 'النصر', meaning: 'The Divine Support', ayahs: 3, type: 'Medinan' },
  { id: 111, name: 'Al-Masad', arabic: 'المسد', meaning: 'The Palm Fiber', ayahs: 5, type: 'Meccan' },
  { id: 112, name: 'Al-Ikhlas', arabic: 'الإخلاص', meaning: 'The Sincerity', ayahs: 4, type: 'Meccan' },
  { id: 113, name: 'Al-Falaq', arabic: 'الفلق', meaning: 'The Daybreak', ayahs: 5, type: 'Meccan' },
  { id: 114, name: 'An-Nas', arabic: 'الناس', meaning: 'Mankind', ayahs: 6, type: 'Meccan' },
];

const QUICK_PICKS = [1, 36, 55, 67, 18, 56]; // Al-Fatiha, Ya-Sin, Ar-Rahman, Al-Mulk, Al-Kahf, Al-Waqiah

export function QuranPlayerScreen() {
  const theme = useTheme();
  const [selected, setSelected] = useState<Surah | null>(null);
  const [query, setQuery] = useState('');
  const [playing, setPlaying] = useState(false);

  const filtered = query.length > 0
    ? SURAHS.filter((s) =>
        s.name.toLowerCase().includes(query.toLowerCase()) ||
        s.arabic.includes(query) ||
        s.meaning.toLowerCase().includes(query.toLowerCase())
      )
    : SURAHS;

  const quickSurahs = QUICK_PICKS.map((id) => SURAHS.find((s) => s.id === id)!);

  return (
    <ScrollView
      style={{ backgroundColor: theme.bg }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.accent }]}>
          <Text style={{ fontSize: 12 }}>📖</Text>
          <Text style={[styles.chipText, { color: theme.accent }]}>Holy Quran</Text>
        </View>
        <Text style={[styles.title, { color: theme.text }]}>The Noble Quran</Text>
        <Text style={[styles.subtitle, { color: theme.subText }]}>
          All 114 Surahs · 7 world-class reciters · Arabic + translation
        </Text>
      </View>

      {/* Selected surah player card */}
      {selected ? (
        <View style={[styles.playerCard, { backgroundColor: '#0B2017', borderColor: 'rgba(233,207,122,0.18)' }]}>
          {/* Player card header — always deep green / gold to match the design */}
          <View style={[styles.playerHeader, { backgroundColor: '#103024' }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.surahNum, { color: 'rgba(250,247,238,0.6)' }]}>Surah {selected.id}</Text>
              <Text style={[styles.surahName, { color: '#FAF7EE' }]}>{selected.name}</Text>
              <Text style={[styles.surahMeta, { color: 'rgba(250,247,238,0.6)' }]}>
                {selected.ayahs} Ayahs · {selected.type}
              </Text>
            </View>
            <Text style={styles.surahArabic}>{selected.arabic}</Text>
          </View>

          {/* Bismillah */}
          <View style={styles.bismillah}>
            <Text style={[styles.bismillahText, { color: theme.accent }]}>
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </Text>
          </View>

          {/* Audio controls */}
          <View style={styles.controls}>
            <Pressable
              style={[styles.ctrlBtn, { borderColor: theme.divider }]}
              onPress={() => {
                const prev = SURAHS.find((s) => s.id === selected.id - 1);
                if (prev) setSelected(prev);
              }}
            >
              <Text style={{ fontSize: 20 }}>⏮</Text>
            </Pressable>

            <Pressable
              style={[styles.playBtn, { backgroundColor: theme.emerald }]}
              onPress={() => setPlaying((p) => !p)}
            >
              <Text style={{ fontSize: 28, color: '#fff' }}>{playing ? '⏸' : '▶'}</Text>
            </Pressable>

            <Pressable
              style={[styles.ctrlBtn, { borderColor: theme.divider }]}
              onPress={() => {
                const next = SURAHS.find((s) => s.id === selected.id + 1);
                if (next) setSelected(next);
              }}
            >
              <Text style={{ fontSize: 20 }}>⏭</Text>
            </Pressable>
          </View>

          {playing && (
            <View style={[styles.nowPlaying, { backgroundColor: theme.emeraldSoft }]}>
              <ActivityIndicator size="small" color={theme.emerald} />
              <Text style={[styles.nowPlayingText, { color: theme.emerald }]}>
                Connecting to audio server…
              </Text>
            </View>
          )}

          <Pressable onPress={() => { setSelected(null); setPlaying(false); }} style={styles.closeBtn}>
            <Text style={[styles.closeBtnText, { color: 'rgba(250,247,238,0.6)' }]}>✕ Close player</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Quick picks */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.subText }]}>QUICK PICKS</Text>
        <View style={styles.quickGrid}>
          {quickSurahs.map((s) => (
            <Pressable
              key={s.id}
              style={[
                styles.quickCard,
                {
                  backgroundColor: selected?.id === s.id ? theme.emeraldSoft : theme.card,
                  borderColor: selected?.id === s.id ? theme.emerald : theme.divider,
                },
              ]}
              onPress={() => setSelected(s)}
            >
              <Text style={[styles.quickNum, { color: theme.subText }]}>Surah {s.id}</Text>
              <Text style={[styles.quickName, { color: theme.text }]}>{s.name}</Text>
              <Text style={[styles.quickArabic, { color: theme.accent }]}>{s.arabic}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Full surah list */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.subText }]}>ALL 114 SURAHS</Text>

        {/* Search */}
        <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.divider }]}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search surahs…"
            placeholderTextColor={theme.subText}
            value={query}
            onChangeText={setQuery}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')}>
              <Text style={{ fontSize: 16, color: theme.subText }}>✕</Text>
            </Pressable>
          )}
        </View>

        {/* List */}
        {filtered.map((s) => (
          <Pressable
            key={s.id}
            style={[
              styles.surahRow,
              {
                backgroundColor: selected?.id === s.id ? theme.emeraldSoft : theme.card,
                borderColor: selected?.id === s.id ? theme.emerald : theme.divider,
              },
            ]}
            onPress={() => setSelected(s)}
          >
            <View style={[styles.surahBadge, { backgroundColor: selected?.id === s.id ? theme.emerald : theme.accentSoft }]}>
              <Text style={[styles.surahBadgeNum, { color: selected?.id === s.id ? '#fff' : theme.accent }]}>
                {s.id}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.surahRowName, { color: theme.text }]}>{s.name}</Text>
              <Text style={[styles.surahRowMeta, { color: theme.subText }]}>
                {s.meaning} · {s.ayahs} ayahs · {s.type}
              </Text>
            </View>
            <Text style={[styles.surahRowArabic, { color: theme.accent }]}>{s.arabic}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },

  header: { marginBottom: 20 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
    marginBottom: 10,
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 13 },

  playerCard: {
    borderRadius: 20, borderWidth: 1, overflow: 'hidden', marginBottom: 20,
  },
  playerHeader: {
    flexDirection: 'row', alignItems: 'center', padding: 18, gap: 12,
  },
  surahNum: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginBottom: 2 },
  surahName: { fontSize: 22, fontWeight: '700', marginBottom: 2 },
  surahMeta: { fontSize: 12 },
  surahArabic: { fontSize: 36, color: '#DDB94B', textAlign: 'right' },
  bismillah: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18 },
  bismillahText: { fontSize: 20, textAlign: 'center', lineHeight: 32 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingBottom: 16 },
  ctrlBtn: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  playBtn: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  nowPlaying: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginBottom: 12, padding: 10, borderRadius: 10,
  },
  nowPlayingText: { fontSize: 13 },
  closeBtn: { alignItems: 'center', paddingBottom: 14 },
  closeBtnText: { fontSize: 13 },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10 },

  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickCard: {
    width: '31%', padding: 12, borderRadius: 14, borderWidth: 1,
    alignItems: 'center',
  },
  quickNum: { fontSize: 10, marginBottom: 2 },
  quickName: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  quickArabic: { fontSize: 16 },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  surahRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 6,
  },
  surahBadge: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  surahBadgeNum: { fontSize: 13, fontWeight: '700' },
  surahRowName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  surahRowMeta: { fontSize: 11 },
  surahRowArabic: { fontSize: 18 },
});
