'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocalStorage } from './useLocalStorage';
import { langToTranslation, fetchSurah, fetchSurahMulti, type TranslationId } from './quran';

type CuratedEntry = { surah: number; ayah: number; surahName: string };

// 30 well-known ayahs chosen for brevity — each fits in one or two display lines.
// Long ayahs (Ayat al-Kursi, 2:286, 2:177, 24:35, 17:1, etc.) are intentionally
// excluded so the hero card stays compact regardless of the current day's pick.
const CURATED: CuratedEntry[] = [
  { surah: 13,  ayah: 28,  surahName: "Ar-Ra'd"        },  // hearts find rest in remembrance
  { surah: 40,  ayah: 60,  surahName: 'Ghafir'          },  // call on Me; I will respond
  { surah: 55,  ayah: 1,   surahName: 'Ar-Rahman'       },  // The Most Merciful
  { surah: 94,  ayah: 5,   surahName: 'Ash-Sharh'       },  // ease after hardship (1)
  { surah: 94,  ayah: 6,   surahName: 'Ash-Sharh'       },  // ease after hardship (2)
  { surah: 51,  ayah: 56,  surahName: 'Adh-Dhariyat'    },  // created only to worship
  { surah: 50,  ayah: 16,  surahName: 'Qaf'             },  // closer than jugular vein
  { surah: 2,   ayah: 152, surahName: 'Al-Baqarah'      },  // remember Me, I remember you
  { surah: 3,   ayah: 8,   surahName: "Aal 'Imran"      },  // let not our hearts deviate (dua)
  { surah: 93,  ayah: 5,   surahName: 'Ad-Duha'         },  // your Lord will give; you will be satisfied
  { surah: 3,   ayah: 139, surahName: "Aal 'Imran"      },  // do not be weak; believers are superior
  { surah: 55,  ayah: 13,  surahName: 'Ar-Rahman'       },  // so which favor would you deny?
  { surah: 57,  ayah: 3,   surahName: 'Al-Hadid'        },  // He is the First and the Last
  { surah: 112, ayah: 1,   surahName: 'Al-Ikhlas'       },  // Say: He is Allah, the One
  { surah: 67,  ayah: 1,   surahName: 'Al-Mulk'         },  // Blessed is He in Whose Hand is dominion
  { surah: 20,  ayah: 14,  surahName: 'Ta-Ha'           },  // I am Allah; worship Me
  { surah: 33,  ayah: 41,  surahName: 'Al-Ahzab'        },  // remember Allah with much remembrance
  { surah: 10,  ayah: 62,  surahName: 'Yunus'           },  // allies of Allah — no fear, no grief
  { surah: 9,   ayah: 51,  surahName: 'At-Tawbah'       },  // nothing befalls except what Allah decreed
  { surah: 18,  ayah: 10,  surahName: 'Al-Kahf'         },  // our Lord, grant us mercy and guidance
  { surah: 3,   ayah: 200, surahName: "Aal 'Imran"      },  // be patient, persevere, fear Allah
  { surah: 31,  ayah: 17,  surahName: 'Luqman'          },  // establish prayer; enjoin good; be patient
  { surah: 25,  ayah: 63,  surahName: 'Al-Furqan'       },  // servants of the Most Merciful walk gently
  { surah: 110, ayah: 1,   surahName: 'An-Nasr'         },  // when victory of Allah has come
  { surah: 29,  ayah: 69,  surahName: "Al-'Ankabut"     },  // those who strive — We will guide them
  { surah: 23,  ayah: 1,   surahName: "Al-Mu'minun"     },  // certainly the believers have succeeded
  { surah: 93,  ayah: 8,   surahName: 'Ad-Duha'         },  // found you poor and made you self-sufficient
  { surah: 93,  ayah: 11,  surahName: 'Ad-Duha'         },  // as for the favor of your Lord, proclaim it
  { surah: 112, ayah: 2,   surahName: 'Al-Ikhlas'       },  // Allah, the Eternal Refuge
  { surah: 28,  ayah: 24,  surahName: 'Al-Qasas'        },  // dua of Musa — in need of Your good
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
