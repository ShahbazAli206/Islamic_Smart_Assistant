export interface HadeesLanguage {
  code: string;
  label: string;
  native: string;
  edition: string;
}

export interface HadeesBook {
  id: string;
  slug: string;        // used in fawazahmed0/hadith-api CDN path
  name: string;
  arabicName: string;
  author: string;
  authorArabic: string;
  totalHadiths: number;
  category: 'sehah-sittah' | 'other';
  description: string;
  languages: HadeesLanguage[];
}

// Base CDN URL for the fawazahmed0/hadith-api (free, no key required, CORS-friendly)
export const HADEES_CDN = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

export const HADEES_BOOKS: HadeesBook[] = [
  {
    id: 'bukhari',
    slug: 'bukhari',
    name: 'Sahih al-Bukhari',
    arabicName: 'صحيح البخاري',
    author: 'Imam Muhammad ibn Ismail al-Bukhari',
    authorArabic: 'الإمام محمد بن إسماعيل البخاري',
    totalHadiths: 7563,
    category: 'sehah-sittah',
    description: 'Considered the most authentic book after the Quran. Imam Bukhari spent 16 years compiling it and verified over 600,000 hadiths. Contains 7,563 hadiths selected from those.',
    languages: [
      { code: 'ara', label: 'Arabic',     native: 'عربي',      edition: 'ara-bukhari' },
      { code: 'eng', label: 'English',    native: 'English',   edition: 'eng-bukhari' },
      { code: 'urd', label: 'Urdu',       native: 'اردو',      edition: 'urd-bukhari' },
      { code: 'ben', label: 'Bengali',    native: 'বাংলা',     edition: 'ben-bukhari' },
      { code: 'tur', label: 'Turkish',    native: 'Türkçe',    edition: 'tur-bukhari' },
      { code: 'mal', label: 'Malayalam',  native: 'മലയാളം',    edition: 'mal-bukhari' },
      { code: 'ind', label: 'Indonesian', native: 'Indonesia', edition: 'ind-bukhari' },
      { code: 'tam', label: 'Tamil',      native: 'தமிழ்',     edition: 'tam-bukhari' },
      { code: 'por', label: 'Portuguese', native: 'Português', edition: 'por-bukhari' },
      { code: 'fra', label: 'French',     native: 'Français',  edition: 'fra-bukhari' },
    ],
  },
  {
    id: 'muslim',
    slug: 'muslim',
    name: 'Sahih al-Muslim',
    arabicName: 'صحيح مسلم',
    author: 'Imam Muslim ibn al-Hajjaj',
    authorArabic: 'الإمام مسلم بن الحجاج',
    totalHadiths: 7563,
    category: 'sehah-sittah',
    description: 'Second most authentic hadith collection. Imam Muslim screened 300,000 hadiths and selected the most rigorously authenticated ones. Known for its excellent arrangement.',
    languages: [
      { code: 'ara', label: 'Arabic',     native: 'عربي',      edition: 'ara-muslim' },
      { code: 'eng', label: 'English',    native: 'English',   edition: 'eng-muslim' },
      { code: 'urd', label: 'Urdu',       native: 'اردو',      edition: 'urd-muslim' },
      { code: 'ben', label: 'Bengali',    native: 'বাংলা',     edition: 'ben-muslim' },
      { code: 'tur', label: 'Turkish',    native: 'Türkçe',    edition: 'tur-muslim' },
      { code: 'ind', label: 'Indonesian', native: 'Indonesia', edition: 'ind-muslim' },
      { code: 'por', label: 'Portuguese', native: 'Português', edition: 'por-muslim' },
      { code: 'fra', label: 'French',     native: 'Français',  edition: 'fra-muslim' },
    ],
  },
  {
    id: 'abudawud',
    slug: 'abudawud',
    name: 'Sunan Abu Dawood',
    arabicName: 'سنن أبي داود',
    author: 'Imam Abu Dawood Sulayman ibn al-Ash\'ath',
    authorArabic: 'الإمام أبو داود سليمان بن الأشعث',
    totalHadiths: 5274,
    category: 'sehah-sittah',
    description: 'Focuses primarily on jurisprudence (fiqh) and Islamic law. Imam Abu Dawood selected 5,274 hadiths from 500,000 that he had collected. A key reference for fiqh rulings.',
    languages: [
      { code: 'ara', label: 'Arabic',     native: 'عربي',      edition: 'ara-abudawud' },
      { code: 'eng', label: 'English',    native: 'English',   edition: 'eng-abudawud' },
      { code: 'urd', label: 'Urdu',       native: 'اردو',      edition: 'urd-abudawud' },
      { code: 'ind', label: 'Indonesian', native: 'Indonesia', edition: 'ind-abudawud' },
      { code: 'fra', label: 'French',     native: 'Français',  edition: 'fra-abudawud' },
    ],
  },
  {
    id: 'tirmizi',
    slug: 'tirmizi',
    name: 'Jami at-Tirmidhi',
    arabicName: 'جامع الترمذي',
    author: 'Imam Abu Isa Muhammad al-Tirmidhi',
    authorArabic: 'الإمام أبو عيسى محمد الترمذي',
    totalHadiths: 3956,
    category: 'sehah-sittah',
    description: 'Unique in that Imam Tirmidhi grades each hadith (Sahih, Hasan, Da\'if). Contains hadiths on various Islamic topics with detailed discussions of scholars\' opinions.',
    languages: [
      { code: 'ara', label: 'Arabic',     native: 'عربي',      edition: 'ara-tirmizi' },
      { code: 'eng', label: 'English',    native: 'English',   edition: 'eng-tirmizi' },
      { code: 'urd', label: 'Urdu',       native: 'اردو',      edition: 'urd-tirmizi' },
      { code: 'ben', label: 'Bengali',    native: 'বাংলা',     edition: 'ben-tirmizi' },
      { code: 'ind', label: 'Indonesian', native: 'Indonesia', edition: 'ind-tirmizi' },
    ],
  },
  {
    id: 'nasai',
    slug: 'nasai',
    name: 'Sunan an-Nasai',
    arabicName: 'سنن النسائي',
    author: 'Imam Ahmad ibn Shu\'ayb an-Nasai',
    authorArabic: 'الإمام أحمد بن شعيب النسائي',
    totalHadiths: 5761,
    category: 'sehah-sittah',
    description: 'Known for its very strict standards in authenticating hadiths. Imam Nasai was particularly careful about narrators. Contains detailed chapters on prayer, zakat and ritual purity.',
    languages: [
      { code: 'ara', label: 'Arabic',     native: 'عربي',      edition: 'ara-nasai' },
      { code: 'eng', label: 'English',    native: 'English',   edition: 'eng-nasai' },
      { code: 'urd', label: 'Urdu',       native: 'اردو',      edition: 'urd-nasai' },
      { code: 'ind', label: 'Indonesian', native: 'Indonesia', edition: 'ind-nasai' },
    ],
  },
  {
    id: 'ibnmajah',
    slug: 'ibnmajah',
    name: 'Sunan Ibn Majah',
    arabicName: 'سنن ابن ماجه',
    author: 'Imam Muhammad ibn Yazid Ibn Majah',
    authorArabic: 'الإمام محمد بن يزيد ابن ماجه',
    totalHadiths: 4341,
    category: 'sehah-sittah',
    description: 'The sixth book of Sehah-e-Sittah. Contains important hadiths on various topics including business transactions, marriage and divorce. Some hadiths are unique to this collection.',
    languages: [
      { code: 'ara', label: 'Arabic',     native: 'عربي',      edition: 'ara-ibnmajah' },
      { code: 'eng', label: 'English',    native: 'English',   edition: 'eng-ibnmajah' },
      { code: 'urd', label: 'Urdu',       native: 'اردو',      edition: 'urd-ibnmajah' },
      { code: 'ben', label: 'Bengali',    native: 'বাংলা',     edition: 'ben-ibnmajah' },
      { code: 'tur', label: 'Turkish',    native: 'Türkçe',    edition: 'tur-ibnmajah' },
    ],
  },
  // ── Other popular books ──────────────────────────────────────────────────
  {
    id: 'malik',
    slug: 'malik',
    name: 'Muwatta Imam Malik',
    arabicName: 'موطأ الإمام مالك',
    author: 'Imam Malik ibn Anas',
    authorArabic: 'الإمام مالك بن أنس',
    totalHadiths: 1720,
    category: 'other',
    description: 'The earliest written collection of hadith. Imam Malik, founder of the Maliki school, compiled it over 40 years. Also includes opinions of Companions and Followers (Tabi\'in).',
    languages: [
      { code: 'ara', label: 'Arabic',  native: 'عربي',  edition: 'ara-malik' },
      { code: 'eng', label: 'English', native: 'English', edition: 'eng-malik' },
      { code: 'urd', label: 'Urdu',    native: 'اردو',  edition: 'urd-malik' },
    ],
  },
  {
    id: 'nawawi40',
    slug: 'nawawi40',
    name: 'Al-Arba\'in An-Nawawi (40 Hadith)',
    arabicName: 'الأربعون النووية',
    author: 'Imam Yahya ibn Sharaf an-Nawawi',
    authorArabic: 'الإمام يحيى بن شرف النووي',
    totalHadiths: 42,
    category: 'other',
    description: 'A collection of 42 essential hadiths covering the fundamentals of Islam. An ideal starting point for students of hadith and widely memorised across the Muslim world.',
    languages: [
      { code: 'ara', label: 'Arabic',     native: 'عربي',      edition: 'ara-nawawi40' },
      { code: 'eng', label: 'English',    native: 'English',   edition: 'eng-nawawi40' },
      { code: 'urd', label: 'Urdu',       native: 'اردو',      edition: 'urd-nawawi40' },
      { code: 'ben', label: 'Bengali',    native: 'বাংলা',     edition: 'ben-nawawi40' },
      { code: 'tur', label: 'Turkish',    native: 'Türkçe',    edition: 'tur-nawawi40' },
      { code: 'ind', label: 'Indonesian', native: 'Indonesia', edition: 'ind-nawawi40' },
      { code: 'por', label: 'Portuguese', native: 'Português', edition: 'por-nawawi40' },
      { code: 'fra', label: 'French',     native: 'Français',  edition: 'fra-nawawi40' },
    ],
  },
  {
    id: 'bulugh',
    slug: 'bulugh',
    name: 'Bulugh al-Maram',
    arabicName: 'بلوغ المرام',
    author: 'Imam Ibn Hajar al-Asqalani',
    authorArabic: 'الإمام ابن حجر العسقلاني',
    totalHadiths: 1596,
    category: 'other',
    description: 'A comprehensive hadith collection focusing specifically on Islamic jurisprudence (fiqh). Each hadith is relevant to a specific legal ruling. Widely used in Hanafi and Shafi\'i fiqh studies.',
    languages: [
      { code: 'ara', label: 'Arabic',  native: 'عربي',    edition: 'ara-bulugh' },
      { code: 'eng', label: 'English', native: 'English', edition: 'eng-bulugh' },
    ],
  },
];
