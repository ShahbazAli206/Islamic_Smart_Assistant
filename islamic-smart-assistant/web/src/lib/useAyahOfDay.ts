'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalStorage } from './useLocalStorage';
import { langToTranslation, fetchSurah, fetchSurahMulti, type TranslationId } from './quran';

type CuratedEntry = { surah: number; ayah: number; surahName: string };

// 30 well-known, short ayahs — one shown per day, rotating.
const CURATED: CuratedEntry[] = [
  { surah: 13,  ayah: 28,  surahName: "Ar-Ra'd"       },  // hearts find rest
  { surah: 2,   ayah: 255, surahName: 'Al-Baqarah'    },  // Ayat al-Kursi
  { surah: 55,  ayah: 1,   surahName: 'Ar-Rahman'     },  // The Most Merciful
  { surah: 94,  ayah: 5,   surahName: 'Ash-Sharh'     },  // ease after hardship (1)
  { surah: 94,  ayah: 6,   surahName: 'Ash-Sharh'     },  // ease after hardship (2)
  { surah: 2,   ayah: 286, surahName: 'Al-Baqarah'    },  // Allah burdens not a soul
  { surah: 39,  ayah: 53,  surahName: 'Az-Zumar'      },  // do not despair of mercy
  { surah: 2,   ayah: 152, surahName: 'Al-Baqarah'    },  // remember Me, I remember you
  { surah: 65,  ayah: 3,   surahName: 'At-Talaq'      },  // Allah suffices
  { surah: 3,   ayah: 173, surahName: "Aal 'Imran"    },  // Hasbunallah wa ni'mal wakeel
  { surah: 29,  ayah: 45,  surahName: "Al-'Ankabut"   },  // prayer prevents immorality
  { surah: 7,   ayah: 56,  surahName: "Al-A'raf"      },  // mercy of Allah is near
  { surah: 49,  ayah: 13,  surahName: 'Al-Hujurat'    },  // most noble is most righteous
  { surah: 112, ayah: 1,   surahName: 'Al-Ikhlas'     },  // Say: He is Allah
  { surah: 67,  ayah: 1,   surahName: 'Al-Mulk'       },  // Blessed is He in Whose Hand
  { surah: 16,  ayah: 97,  surahName: 'An-Nahl'       },  // whoever does good
  { surah: 33,  ayah: 41,  surahName: 'Al-Ahzab'      },  // remember Allah often
  { surah: 24,  ayah: 35,  surahName: 'An-Nur'        },  // Allah is the Light
  { surah: 57,  ayah: 21,  surahName: 'Al-Hadid'      },  // race to forgiveness
  { surah: 18,  ayah: 10,  surahName: 'Al-Kahf'       },  // our Lord, grant us mercy
  { surah: 3,   ayah: 200, surahName: "Aal 'Imran"    },  // be patient and persevere
  { surah: 31,  ayah: 17,  surahName: 'Luqman'        },  // establish prayer
  { surah: 25,  ayah: 63,  surahName: 'Al-Furqan'     },  // servants of the Merciful
  { surah: 110, ayah: 1,   surahName: 'An-Nasr'       },  // help of Allah comes
  { surah: 4,   ayah: 36,  surahName: 'An-Nisa'       },  // worship Allah alone
  { surah: 17,  ayah: 1,   surahName: 'Al-Isra'       },  // subhana alladhi asra
  { surah: 2,   ayah: 185, surahName: 'Al-Baqarah'    },  // Allah intends ease
  { surah: 49,  ayah: 12,  surahName: 'Al-Hujurat'    },  // avoid suspicion
  { surah: 3,   ayah: 159, surahName: "Aal 'Imran"    },  // be gentle with people
  { surah: 2,   ayah: 177, surahName: 'Al-Baqarah'    },  // righteousness defined
];

function dayIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const day = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return day % CURATED.length;
}

export type AyahOfDay = {
  surahNumber: number;
  ayahNumber: number;
  surahName: string;
  arabic: string;
  translation: string | null;
  edition: TranslationId;
};

export function useAyahOfDay() {
  // Wait for the first render cycle to complete before fetching. This ensures
  // useLocalStorage has read the stored 'isa:language' from localStorage before
  // we compute the query key — preventing an incorrect English fetch when the
  // user has another language set.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [language] = useLocalStorage<string>('isa:language', 'en');
  const edition = langToTranslation(language);
  const entry = CURATED[dayIndex()];

  return useQuery<AyahOfDay>({
    queryKey: ['ayah-of-day', entry.surah, entry.ayah, edition],
    queryFn: async () => {
      if (edition === 'none') {
        const surah = await fetchSurah(entry.surah, 'quran-uthmani');
        const ayah = surah.ayahs.find((a) => a.numberInSurah === entry.ayah);
        if (!ayah) throw new Error('Ayah not found');
        return {
          surahNumber: entry.surah, ayahNumber: entry.ayah,
          surahName: entry.surahName, arabic: ayah.text,
          translation: null, edition,
        };
      }
      const [arabicSurah, transSurah] = await fetchSurahMulti(
        entry.surah, ['quran-uthmani', edition],
      );
      const arabicAyah = arabicSurah.ayahs.find((a) => a.numberInSurah === entry.ayah);
      const transAyah  = transSurah.ayahs.find((a) => a.numberInSurah === entry.ayah);
      if (!arabicAyah) throw new Error('Ayah not found');
      return {
        surahNumber: entry.surah, ayahNumber: entry.ayah,
        surahName: entry.surahName, arabic: arabicAyah.text,
        translation: transAyah?.text ?? null, edition,
      };
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
    enabled: mounted,
  });
}
