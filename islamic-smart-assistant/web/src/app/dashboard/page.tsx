'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import {
  Search, MapPin, Sun, Sunrise, Sunset, Moon, Clock, ChevronDown,
  Compass, Bell, Play, BookOpen, Hand, Calendar, Star, Library, Scale,
  Globe, GraduationCap, Calculator,
  User, Check, X, Crosshair, Loader2, BookMarked, AlertTriangle,
} from 'lucide-react';
import {
  fetchTimingsByCity, fetchTimingsByCoords, nextPrayerInZone, formatCountdown,
  type PrayerTimes,
} from '@/lib/prayer';
import { qiblaBearing } from '@/lib/qibla';
import { useStoredLocation } from '@/lib/useStoredLocation';
import { usePrayerParams } from '@/lib/usePrayerParams';
import { useTheme } from '@/lib/ThemeContext';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { AyahDisplay } from '@/components/AyahDisplay';
import { ContentBackdrop } from '@/components/ContentBackdrop';
import { setLocationByCoords, setLocationByCity } from '@/lib/location';
import { METHOD_LABELS as CALC_METHODS } from '@/lib/sect';
import { LANGUAGE_OPTIONS as QURAN_LANGUAGE_OPTIONS } from '@/lib/quran';

const ORDER: (keyof PrayerTimes)[] = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

// Per-prayer icon + accent, tuned to the reference design (warm dawn → cool night).
const PRAYER_META: Record<keyof PrayerTimes, { icon: any; tint: string; badge: string }> = {
  Fajr:    { icon: Sunrise, tint: 'text-amber-500',   badge: 'bg-amber-100'   },
  Sunrise: { icon: Sun,     tint: 'text-orange-400',  badge: 'bg-orange-100'  },
  Dhuhr:   { icon: Sun,     tint: 'text-emerald-500', badge: 'bg-emerald-100' },
  Asr:     { icon: Sun,     tint: 'text-emerald-600', badge: 'bg-emerald-100' },
  Maghrib: { icon: Sunset,  tint: 'text-rose-500',    badge: 'bg-rose-100'    },
  Isha:    { icon: Moon,    tint: 'text-violet-500',  badge: 'bg-violet-100'  },
};

const SECT_LABELS: Record<string, string> = {
  sunni: 'Sunni', shia: 'Fiqah Jafri',
  hanafi: 'Hanafi', shafii: "Shafi'i", maliki: 'Maliki', hanbali: 'Hanbali',
};
const LANG_LABELS: Record<string, string> = { ur: 'Urdu', en: 'English', none: 'Arabic only' };
const METHOD_OPTIONS = CALC_METHODS.map(m => ({ value: String(m.id), label: m.label }));
const FIQH_LABELS: Record<string, string> = {
  hanafi: 'Hanafi', shafi: "Shafi'i", maliki: 'Maliki', hanbali: 'Hanbali', jafari: "Ja'fari",
};

// Same list the Qur'an translation dropdown, onboarding, settings and profile
// form use, so a language picked here matches everywhere else.
const LANGUAGE_OPTIONS = QURAN_LANGUAGE_OPTIONS.map(({ code, label, native }) => ({
  value: code,
  label: native && native !== label ? `${label} (${native})` : label,
}));

const SECT_OPTIONS = [
  { value: 'sunni', label: 'Sunni' },
  { value: 'shia',  label: 'Fiqah Jafri (Shia)' },
];

const FIQH_OPTIONS: Record<string, { value: string; label: string }[]> = {
  sunni: [
    { value: 'hanafi',  label: 'Hanafi'  },
    { value: 'shafi',   label: "Shafi'i" },
    { value: 'maliki',  label: 'Maliki'  },
    { value: 'hanbali', label: 'Hanbali' },
  ],
  shia: [{ value: 'jafari', label: "Ja'fari" }],
};

const ALL_AZAN_VOICES = [
  { id: 'azan-best-sound-quality',    name: 'Azan — Best Sound Quality',       region: 'HD Recording'         },
{ id: 'hafiz-ahmed-raza-qadri',     name: 'Hafiz Ahmed Raza Qadri',          region: 'Pakistan'             },
  { id: 'mevlan-kurtishi',            name: 'Mevlan Kurtishi',                 region: 'Macedonia'            },
  { id: 'egzon-ibrahimi',             name: 'Egzon Ibrahimi',                  region: 'Kosovo'               },
  { id: 'abdul-rahman-mossad',        name: 'Abdul Rahman Mossad',             region: 'Egypt'                },
  { id: 'masjid-al-haram',            name: 'Masjid Al-Haram',                 region: 'Makkah, Saudi Arabia' },
  { id: 'masjid-nabawi-osama-akhdar', name: 'Masjid Nabawi — Osama Al-Akhdar', region: 'Saudi Arabia'         },
  { id: 'islam-sobhi',                name: 'Islam Sobhi',                     region: 'Egypt'                },
  { id: 'makkah-abdallah-ahmad',      name: 'Makkah — Abdallah Ahmad',         region: 'Saudi Arabia'         },
  { id: 'pakistan',                   name: 'Pakistan Style',                  region: 'Lahore, Pakistan'     },
  { id: 'turkey',                     name: 'Turkish — Istanbul',              region: 'Türkiye'              },
  { id: 'egypt',                      name: 'Egyptian — Cairo',                region: 'Egypt'                },
  { id: 'madinah-adhan',              name: 'Azan Madinah',                    region: 'Saudi Arabia'         },
  { id: 'makkah',                     name: 'Makkah — Haramain',               region: 'Saudi Arabia'         },
  { id: 'madinah',                    name: 'Madinah — Masjid Nabawi',         region: 'Saudi Arabia'         },
];

// ── Preference Dropdown ───────────────────────────────────────────────────────

function PrefDropdown({
  label, icon: Icon, value, displayValue, options, onSelect, isDark, divider, faint,
}: {
  label: string; icon: any; value: string; displayValue: string;
  options: { value: string; label: string }[];
  onSelect: (v: string) => void;
  isDark: boolean; divider: string; faint: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:border-emerald-400 ${isDark ? `${divider} bg-black/25 backdrop-blur-sm` : 'border-emerald-900/[0.12] bg-emerald-950/[0.07] backdrop-blur-sm'}`}
      >
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}><Icon size={16} /></span>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${isDark ? faint : 'text-emerald-900'}`}>{label}</p>
          <p className={`truncate text-base font-semibold ${isDark ? '' : 'text-emerald-950'}`}>{displayValue || '—'}</p>
        </div>
        <ChevronDown size={15} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? faint : 'text-emerald-700/70'}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            className={`absolute top-full left-0 right-0 mt-2 max-h-72 overflow-y-auto rounded-2xl shadow-2xl z-50 border ${isDark ? 'bg-[#0d2018] border-emerald-500/20' : 'bg-white border-emerald-100'}`}
          >
            {options.map((opt, i) => {
              const selected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={() => { onSelect(opt.value); setOpen(false); }}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between text-sm transition ${
                    selected
                      ? (isDark ? 'bg-emerald-600 text-white' : 'bg-emerald-500 text-white')
                      : (isDark ? 'text-parchment/80 hover:bg-emerald-500/10' : 'text-emerald-950 hover:bg-emerald-50')
                  } ${i > 0 ? `border-t ${isDark ? 'border-white/5' : 'border-emerald-50'}` : ''}`}
                >
                  <span>{opt.label}</span>
                  {selected && <Check size={14} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function to12h(time?: string): { hm: string; ap: string } {
  if (!time || !time.includes(':')) return { hm: '--:--', ap: '' };
  const [hStr, mStr] = time.split(':');
  const h = parseInt(hStr, 10);
  const ap = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return { hm: `${String(h12).padStart(2, '0')}:${mStr}`, ap };
}

export default function Overview() {
  const { isDark } = useTheme();
  const loc = useStoredLocation();
  // Resolve the SAME prayer-time inputs (method/school + pinned-mosque location)
  // the prayer-times page and the Azan scheduler use, so all three show — and
  // fire on — the identical next-prayer time. See usePrayerParams for why.
  const params = usePrayerParams();
  const byCoords = params.byCoords;

  // Live preference values for the "Your Preferences" banner.
  const [name]      = useLocalStorage<string>('isa:name', '');
  const [language]  = useLocalStorage<string>('isa:language', 'en');
  const [sect]      = useLocalStorage<string>('isa:sect', 'sunni');
  const [fiqh]      = useLocalStorage<string>('isa:fiqh', '');
  const [selectedAzanVoice] = useLocalStorage<string>('isa:azanVoice', 'azan-best-sound-quality');

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locDetecting, setLocDetecting] = useState(false);
  const [draftCity, setDraftCity] = useState('');
  const [draftCountry, setDraftCountry] = useState('');
  const [locError, setLocError] = useState('');
  const [locValidating, setLocValidating] = useState(false);

  const { data } = useQuery({
    queryKey: byCoords
      ? ['timings', 'coords', params.lat, params.lng, params.method, params.school]
      : ['timings', 'city', params.city, params.country],
    queryFn: () =>
      byCoords
        ? fetchTimingsByCoords(params.lat!, params.lng!, { method: params.method, school: params.school, label: params.label })
        : fetchTimingsByCity(params.city, params.country),
    staleTime: 5 * 60 * 1000,
  });

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const next = useMemo(
    () => (data ? nextPrayerInZone(data.timings, data.timezone, now) : null),
    [data, now],
  );

  // The prayer whose window we're currently inside = the one before `next`.
  const currentName: keyof PrayerTimes | null = useMemo(() => {
    if (!next) return null;
    const i = ORDER.indexOf(next.name);
    return i > 0 ? ORDER[i - 1] : 'Isha';
  }, [next]);

  // Progress through the current prayer window (start → next prayer start).
  const progress = useMemo(() => {
    if (!data || !next || !currentName) return 0;
    const [h, m] = (data.timings[currentName] ?? '0:0').split(':').map(Number);
    let start = new Date(now); start.setHours(h, m, 0, 0);
    if (start.getTime() > next.at.getTime()) start = new Date(start.getTime() - 86_400_000);
    const total = next.at.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    return total > 0 ? Math.min(100, Math.max(3, (elapsed / total) * 100)) : 0;
  }, [data, next, currentName, now]);

  const bearing = byCoords ? qiblaBearing(params.lat!, params.lng!) : 256;
  const methodLabel = CALC_METHODS.find(m => m.id === params.method)?.label ?? 'Muslim World League';

  const persistPref = (key: string, val: unknown) => {
    const j = JSON.stringify(val);
    localStorage.setItem(key, j);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: j }));
  };

  const openLocationModal = () => {
    setDraftCity(loc.city ?? '');
    setDraftCountry(loc.country ?? '');
    setLocError('');
    setShowLocationModal(true);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocDetecting(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
            { headers: { Accept: 'application/json' }, cache: 'no-store' },
          );
          const addr = (await res.json())?.address ?? {};
          const city    = addr.city || addr.town || addr.village || addr.county || addr.state || '';
          const country = addr.country || '';
          setDraftCity(city);
          setDraftCountry(country);
          setLocationByCoords(lat, lng, city || undefined, country || undefined, { clearMosque: true });
        } catch {
          setLocationByCoords(lat, lng, undefined, undefined, { clearMosque: true });
        }
        setLocDetecting(false);
        setShowLocationModal(false);
      },
      () => {
        setLocDetecting(false);
        setLocError('GPS access denied. Please type your city and country below.');
      },
    );
  };

  const saveManualLocation = async () => {
    const city = draftCity.trim();
    const country = draftCountry.trim();
    if (!city || !country) {
      setLocError('Please enter both city and country.');
      return;
    }
    setLocValidating(true);
    setLocError('');
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&addressdetails=1&q=${encodeURIComponent(`${city}, ${country}`)}`,
        { headers: { Accept: 'application/json', 'User-Agent': 'NoorIslamicApp/1.0' }, cache: 'no-store' },
      );
      const hits: any[] = res.ok ? await res.json() : [];
      if (!hits.length) {
        setLocError(`"${city}, ${country}" couldn't be found. Check the spelling.`);
        return;
      }
      const resultCountry = (hits[0].address?.country ?? '').toLowerCase();
      const typed = country.toLowerCase();
      if (!resultCountry.includes(typed) && !typed.includes(resultCountry)) {
        setLocError(`"${city}" is in ${hits[0].address?.country ?? 'a different country'}, not "${country}".`);
        return;
      }
      await setLocationByCity(city, country);
      setShowLocationModal(false);
    } catch {
      // Nominatim unreachable — save directly without validation
      await setLocationByCity(city, country);
      setShowLocationModal(false);
    } finally {
      setLocValidating(false);
    }
  };

  const effectiveSect = ['sunni', 'shia'].includes(sect) ? sect as 'sunni' | 'shia' : 'sunni';
  const fiqhOptions = FIQH_OPTIONS[effectiveSect] ?? FIQH_OPTIONS.sunni;

  // Top 7 voices shown in the overview ticker
  const TOP_AZAN_VOICES = ALL_AZAN_VOICES.slice(0, 7);

  // Arrange so the selected voice is visible near the top; fall back to natural order
  const arrangedVoices = useMemo(() => {
    const idx = TOP_AZAN_VOICES.findIndex((v) => v.id === selectedAzanVoice);
    if (idx < 0) return TOP_AZAN_VOICES;
    const start = Math.max(0, idx - 1);
    return [...TOP_AZAN_VOICES.slice(start), ...TOP_AZAN_VOICES.slice(0, start)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAzanVoice]);

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const c = isDark
    ? {
        text: 'text-parchment', muted: 'text-parchment/85', faint: 'text-parchment/70',
        card: 'bg-midnight-800/80 border border-white/10 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]',
        soft: 'bg-white/[0.04] border border-white/10',
        divider: 'border-white/10',
        search: 'bg-white/[0.06] border-white/10 text-parchment placeholder:text-parchment/40',
        kbd: 'bg-white/10 text-parchment/55',
        track: 'bg-white/10',
      }
    : {
        text: 'text-emerald-950', muted: 'text-emerald-900/80', faint: 'text-emerald-900/65',
        card: 'bg-white border border-emerald-900/[0.05] shadow-[0_1px_3px_rgba(16,40,30,0.04),0_16px_38px_-18px_rgba(16,40,30,0.18)]',
        soft: 'bg-emerald-50/40 border border-emerald-900/[0.06]',
        divider: 'border-emerald-900/[0.08]',
        search: 'bg-white border-emerald-900/[0.06] text-emerald-950 placeholder:text-emerald-900/40 shadow-[0_1px_3px_rgba(16,40,30,0.04),0_10px_24px_-14px_rgba(16,40,30,0.18)]',
        kbd: 'bg-emerald-900/[0.05] text-emerald-900/45',
        track: 'bg-emerald-900/[0.07]',
      };
  const cardCls = `relative overflow-hidden rounded-[26px] ${c.card}`;

  const rootCls = isDark
    ? `-m-5 sm:-m-8 p-5 sm:p-8 min-h-screen space-y-5 ${c.text}`
    : `space-y-5 ${c.text}`;
  const rootStyle = isDark
    ? { background: 'radial-gradient(1000px 520px at 12% -12%, rgba(16,185,129,0.14), transparent 60%), linear-gradient(180deg,#33745b 0%,#285a45 100%)' }
    : undefined;

  return (
    <div className={rootCls} style={rootStyle}>
      {/* ─────────── First section: full-bleed mosque banner behind the
          search/status bar, greeting and verse card. The photo is always a
          light scene, so text colours inside are hardcoded light-on-image
          (independent of the dark/light theme). ─────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden -mt-5 -mx-5 sm:-mt-8 sm:-mx-8"
      >
        {/* full-cover background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/overview_first_section_bg_image.png" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center" />

        <div className="relative p-5 sm:p-6">
          {/* top bar: search (left, flexible) + right-aligned status */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full min-w-0 sm:max-w-[420px] sm:flex-1">
              <div className="flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-4 py-2.5 text-black backdrop-blur-sm shadow-[0_1px_3px_rgba(16,40,30,0.06),0_10px_24px_-14px_rgba(16,40,30,0.25)]">
                <Search size={18} className="text-black/90" />
                <input placeholder="Search anything..." className="flex-1 bg-transparent text-sm font-semibold text-black placeholder:text-black/80 focus:outline-none" />
                <span className="hidden sm:inline-flex items-center rounded-md bg-emerald-900/10 px-1.5 py-0.5 text-[11px] font-bold text-black/80">Ctrl /</span>
                <button aria-label="Search" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md shadow-emerald-700/30 hover:bg-emerald-700 transition">
                  <Search size={15} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 text-black shrink-0">
              <div className="flex items-center gap-5 rounded-2xl border border-white/60 bg-white/60 px-4 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <MapPin size={18} className="text-emerald-700" />
                  <div className="leading-tight">
                    <p className="text-sm font-bold">{loc.city}{loc.country ? `, ${loc.country}` : ''}</p>
                    <p className="text-[11px] font-semibold text-black/80">{data?.hijriDate ?? '—'}</p>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <Sun size={18} className="text-amber-500" />
                  <div className="leading-tight">
                    <p className="text-sm font-bold">18°C</p>
                    <p className="text-[11px] font-semibold text-black/80">Clear</p>
                  </div>
                </div>
              </div>
              <button onClick={() => window.dispatchEvent(new Event('isa:edit-prefs'))} className="relative shrink-0" aria-label="Open preferences">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-white font-bold ring-2 ring-white shadow-md">
                  {name ? name.trim().charAt(0).toUpperCase() : <User size={20} />}
                </span>
                <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
              </button>
            </div>
          </div>

          {/* hero content: greeting (top-left, three lines) + verse card */}
          <div className="mt-8 grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_minmax(0,560px)]">
          {/* greeting — light translucent panel behind just this text block */}
          <div className="w-fit rounded-2xl bg-white/60 px-4 py-3 backdrop-blur-sm">
            <h1 className="h-display text-3xl sm:text-4xl font-bold leading-[1.05] text-black">
              Assalamu Alaikum, <span className="inline-block">👋</span>
            </h1>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-black/85">
              May Allah bless your day<br />and ease your journey.
            </p>
          </div>

          {/* verse glass card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/55 p-5 pr-[48%] backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
            {/* Quran-on-rehal image fills the right ~50% of the card, shown
                clearly; only the inner edge is softly faded into the card. */}
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-1/2 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/quran-bg-overview-page.png"
                alt=""
                className="h-full w-full select-none object-cover"
                style={{ WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 16%)', maskImage: 'linear-gradient(to right, transparent 0%, black 16%)' }}
              />
            </div>
            <div className="relative">
              <AyahDisplay variant="hero" />
            </div>
          </div>
          </div>
        </div>
      </motion.section>

      {/* ── Everything below the banner sits on the shared bg image + dark veil ── */}
      <div className="-mx-5 sm:-mx-8 -mb-5 sm:-mb-8 -mt-5">
      <ContentBackdrop isDark={isDark} className="px-5 sm:px-8 pb-5 sm:pb-8 pt-5 space-y-5">

      {/* ───────────────────────── Your Preferences ───────────────────────── */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.04 }}
        className={
          isDark
            ? 'relative rounded-[26px] border border-white/10 p-5 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]'
            : `relative rounded-[26px] border border-emerald-900/[0.05] bg-white shadow-[0_1px_3px_rgba(16,40,30,0.04),0_16px_38px_-18px_rgba(16,40,30,0.18)] p-5`
        }
        style={isDark ? { background: 'linear-gradient(150deg,#103a2c 0%,#0b2118 55%,#07140e 100%)' } : undefined}
      >
        {/* Background images clipped inside their own wrapper so the outer section can overflow for dropdowns */}
        {isDark && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/masjid_img.png" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center opacity-70" />
            {/* readability veil — denser on the left where the text sits, lighter toward the right */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg,rgba(7,20,14,0.88) 0%,rgba(7,20,14,0.55) 45%,rgba(7,20,14,0.22) 100%)' }} />
          </div>
        )}
        {!isDark && (
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/OverviewPage_your_preference_bg.png" alt="" aria-hidden className="absolute inset-0 h-full w-full select-none object-cover object-right" />
          </div>
        )}
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className={`grid h-10 w-10 place-items-center rounded-xl ${isDark ? 'bg-gold-400/15 text-gold-300' : 'bg-gold-100 text-gold-600'}`}><Star size={18} /></span>
            <div>
              <h3 className="text-xl font-bold leading-tight">Your Preferences</h3>
              <p className={`text-sm ${isDark ? c.muted : 'text-emerald-950'}`}>Customize your experience</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
            {/* Language dropdown */}
            <PrefDropdown
              label="Language" icon={Globe}
              value={language}
              displayValue={LANGUAGE_OPTIONS.find(o => o.value === language)?.label ?? language}
              options={LANGUAGE_OPTIONS}
              onSelect={(v) => persistPref('isa:language', v)}
              isDark={isDark} divider={c.divider} faint={c.faint}
            />

            {/* Location — opens popup */}
            <button
              onClick={openLocationModal}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition hover:border-emerald-400 ${isDark ? `${c.divider} bg-black/25 backdrop-blur-sm` : 'border-emerald-900/[0.12] bg-emerald-950/[0.07] backdrop-blur-sm'}`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-100 text-emerald-600'}`}><MapPin size={16} /></span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${isDark ? c.faint : 'text-emerald-900'}`}>Location</p>
                <p className={`truncate text-base font-semibold ${isDark ? '' : 'text-emerald-950'}`}>
                  {loc.city ? `${loc.city}${loc.country ? `, ${loc.country}` : ''}` : 'Set location'}
                </p>
              </div>
              <ChevronDown size={15} className={`shrink-0 ${isDark ? c.faint : 'text-emerald-700/70'}`} />
            </button>

            {/* Sect dropdown */}
            <PrefDropdown
              label="Sect" icon={GraduationCap}
              value={effectiveSect}
              displayValue={SECT_LABELS[effectiveSect] ?? effectiveSect}
              options={SECT_OPTIONS}
              onSelect={(v) => persistPref('isa:sect', v)}
              isDark={isDark} divider={c.divider} faint={c.faint}
            />

            {/* Fiqh / School dropdown */}
            <PrefDropdown
              label="Fiqh / School" icon={BookMarked}
              value={fiqh}
              displayValue={FIQH_LABELS[fiqh] ?? (fiqh || 'Select school')}
              options={fiqhOptions}
              onSelect={(v) => persistPref('isa:fiqh', v)}
              isDark={isDark} divider={c.divider} faint={c.faint}
            />

            {/* Calculation Method dropdown */}
            <PrefDropdown
              label="Calculation Method" icon={Calculator}
              value={String(params.method)}
              displayValue={methodLabel}
              options={METHOD_OPTIONS}
              onSelect={(v) => persistPref('isa:method', Number(v))}
              isDark={isDark} divider={c.divider} faint={c.faint}
            />
          </div>
        </div>
      </motion.section>

      {/* Location popup */}
      <AnimatePresence>
        {showLocationModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 14 }}
              className={`relative w-full max-w-sm rounded-3xl p-7 shadow-2xl ${isDark ? 'bg-[#0b1a12] border border-emerald-500/20' : 'bg-white'}`}
            >
              <button
                onClick={() => setShowLocationModal(false)}
                className={`absolute top-4 right-4 w-8 h-8 grid place-items-center rounded-full transition ${isDark ? 'bg-white/8 text-parchment/50 hover:bg-white/15' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
              >
                <X size={15} />
              </button>

              <div className="flex flex-col gap-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <span className={`w-12 h-12 shrink-0 flex items-center justify-center rounded-2xl ${isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                    <MapPin size={22} />
                  </span>
                  <div>
                    <h3 className={`font-bold text-lg leading-tight ${isDark ? 'text-parchment' : 'text-emerald-950'}`}>Your Location</h3>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-parchment/55' : 'text-emerald-900/55'}`}>
                      Needed for accurate prayer times &amp; Azan scheduling
                    </p>
                  </div>
                </div>

                {/* GPS detect */}
                <button
                  onClick={detectLocation}
                  disabled={locDetecting || locValidating}
                  className="w-full rounded-2xl bg-emerald-600 text-white font-bold py-3 hover:bg-emerald-700 transition flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  {locDetecting ? <Loader2 size={18} className="animate-spin" /> : <Crosshair size={18} />}
                  {locDetecting ? 'Detecting…' : loc.city ? 'Update via GPS' : 'Detect my location'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className={`flex-1 border-t ${isDark ? 'border-white/10' : 'border-emerald-900/10'}`} />
                  <span className={`text-xs ${isDark ? 'text-parchment/40' : 'text-emerald-900/40'}`}>or type manually</span>
                  <div className={`flex-1 border-t ${isDark ? 'border-white/10' : 'border-emerald-900/10'}`} />
                </div>

                {/* Manual inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-parchment/55' : 'text-ink/55'}`}>City</label>
                    <input
                      value={draftCity}
                      onChange={(e) => { setDraftCity(e.target.value); setLocError(''); }}
                      placeholder="Karachi"
                      disabled={locDetecting || locValidating}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 ${
                        isDark
                          ? 'bg-white/5 border-white/10 text-parchment placeholder:text-parchment/30'
                          : 'bg-white border-emerald-100 text-emerald-950 placeholder:text-emerald-900/30'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs font-medium mb-1 block ${isDark ? 'text-parchment/55' : 'text-ink/55'}`}>Country</label>
                    <input
                      value={draftCountry}
                      onChange={(e) => { setDraftCountry(e.target.value); setLocError(''); }}
                      placeholder="Pakistan"
                      disabled={locDetecting || locValidating}
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-60 ${
                        isDark
                          ? 'bg-white/5 border-white/10 text-parchment placeholder:text-parchment/30'
                          : 'bg-white border-emerald-100 text-emerald-950 placeholder:text-emerald-900/30'
                      }`}
                    />
                  </div>
                </div>

                {/* Validation error */}
                {locError && (
                  <div className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs leading-relaxed ${
                    isDark ? 'border-amber-400/30 bg-amber-500/10 text-amber-300' : 'border-amber-300 bg-amber-50 text-amber-800'
                  }`}>
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>{locError}</span>
                  </div>
                )}

                {/* Save button */}
                <button
                  onClick={saveManualLocation}
                  disabled={locDetecting || locValidating || !draftCity.trim() || !draftCountry.trim()}
                  className={`w-full rounded-2xl border py-3 text-sm font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 ${
                    isDark
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {locValidating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {locValidating ? 'Checking location…' : 'Save location'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─────────────────── Main grid: left stack + right rail ─────────────── */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* LEFT */}
        <div className="min-w-0 space-y-5">
          {/* Row 1 — Prayer Times + Countdown */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.55fr_1fr]">
            {/* Prayer Times */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`${cardCls} p-5`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-100 text-violet-600"><Clock size={20} /></span>
                  <div>
                    <h2 className="text-xl font-bold leading-tight">Prayer Times</h2>
                    <p className={`text-sm ${isDark ? c.muted : 'text-emerald-900'}`}>Today, {data?.hijriDate ?? '—'}</p>
                  </div>
                </div>
                <ChevronDown size={18} className={c.faint} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2.5 sm:grid-cols-6">
                {ORDER.map((p) => {
                  const meta = PRAYER_META[p];
                  const t = to12h(data?.timings[p]);
                  const active = currentName === p;
                  return (
                    <div
                      key={p}
                      className={`relative flex flex-col items-center rounded-2xl border py-3.5 px-1 text-center transition ${
                        active
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-[0_10px_22px_-10px_rgba(5,150,105,0.7)]'
                          : `${c.divider} ${isDark ? 'bg-white/[0.03]' : 'bg-white'}`
                      }`}
                    >
                      <span className={`grid h-10 w-10 place-items-center rounded-full ${active ? 'bg-white/20' : meta.badge}`}>
                        <meta.icon size={18} className={active ? 'text-white' : meta.tint} />
                      </span>
                      <p className={`mt-2 text-sm font-semibold ${active ? 'text-white' : c.muted}`}>{p}</p>
                      <p className="mt-1 text-lg font-bold tabular-nums leading-none">{t.hm}</p>
                      <p className={`mt-1 text-xs font-semibold ${active ? 'text-white/85' : c.faint}`}>{t.ap}</p>
                      {active && <span className="absolute bottom-1.5 left-1/2 h-1 w-6 -translate-x-1/2 rounded-full bg-white/80" />}
                    </div>
                  );
                })}
              </div>

              <div className={`mt-4 flex items-center justify-between rounded-2xl border ${c.divider} ${c.soft} px-4 py-3 text-sm`}>
                <span className="flex items-center gap-2">
                  <Clock size={15} className="text-emerald-600" />
                  <span className={c.muted}>Next Prayer:</span>
                  <span className="font-semibold">{next?.name ?? '—'}</span>
                </span>
                <span className="flex items-center gap-1.5 font-semibold text-emerald-600 tabular-nums">
                  <Clock size={15} /> {next ? formatCountdown(next.inMs) : '--:--:--'}
                </span>
              </div>
            </motion.section>

            {/* Countdown — "{current} Time Left" (green-tinted) */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className={`relative overflow-hidden rounded-[26px] border p-5 ${isDark ? 'border-white/10' : 'border-emerald-200/60'}`}
              style={{ background: isDark ? 'linear-gradient(150deg,#103a2c 0%,#0c2c21 100%)' : 'linear-gradient(150deg,#eafaf1 0%,#e2f5ee 55%,#dbf1ec 100%)' }}
            >
              {/* Full-section background image, softened by a light translucent
                  veil so it never reads fully clear and text stays legible. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={isDark ? '/masjid_img.png' : '/OverviewPage_Asr_Time_bg.png'}
                alt=""
                className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
              />
              {/* Readability veil — denser on the left where the text sits. */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: isDark
                    ? 'linear-gradient(90deg, rgba(12,44,33,0.90) 0%, rgba(12,44,33,0.72) 45%, rgba(12,44,33,0.55) 100%)'
                    : 'linear-gradient(90deg, rgba(234,250,241,0.92) 0%, rgba(234,250,241,0.78) 45%, rgba(234,250,241,0.60) 100%)',
                }}
              />
              <div className="relative">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-600/15 text-emerald-600"><Moon size={17} /></span>
                  <div>
                    <h2 className="text-lg font-bold leading-tight">{currentName ?? 'Prayer'} Time Left</h2>
                    <p className={`text-sm font-medium ${isDark ? c.muted : 'text-emerald-900'}`}>Stay mindful of your time</p>
                  </div>
                </div>

                <p className={`mt-7 font-display text-[3.25rem] font-bold tabular-nums leading-none ${isDark ? 'text-white' : 'text-emerald-700'}`}>
                  {next ? formatCountdown(next.inMs) : '--:--:--'}
                </p>

                <div className={`mt-5 h-2 w-4/5 rounded-full ${isDark ? 'bg-white/10' : 'bg-emerald-900/[0.08]'} overflow-hidden`}>
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                    animate={{ width: `${progress}%` }} transition={{ ease: 'easeOut', duration: 0.6 }} />
                </div>
                <p className={`mt-2.5 text-sm ${c.muted}`}>
                  Ends at {next ? next.at.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase() : '—'}
                </p>
              </div>
            </motion.section>
          </div>

          {/* Row 2 — Qibla + Azan + Recitation */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Qibla Direction — photographic dark card */}
            <motion.section
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
              className="relative flex flex-col overflow-hidden rounded-[26px] p-5 text-white shadow-[0_16px_38px_-18px_rgba(16,40,30,0.5)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/hero-bg.jpg" alt="" className="absolute inset-0 h-full w-full object-cover object-[72%_42%]" />
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(7,40,28,0.34) 0%, rgba(6,28,20,0.55) 52%, rgba(5,18,12,0.82) 100%)' }} />
              <div className="relative flex flex-1 flex-col">
                <h3 className="text-lg font-bold leading-tight">Qibla Direction</h3>
                <p className="text-sm text-white/85">Find the direction of the Kaaba</p>

                <div className="relative mx-auto my-6 h-40 w-40">
                  <div className="absolute inset-0 rounded-full border border-white/25 bg-white/[0.06] backdrop-blur-sm" />
                  <svg viewBox="0 0 160 160" className="absolute inset-0 h-full w-full">
                    {Array.from({ length: 72 }).map((_, i) => {
                      const major = i % 9 === 0;
                      const a = (i * 5 * Math.PI) / 180;
                      const r1 = 76, r2 = major ? 66 : 71;
                      return <line key={i}
                        x1={80 + r1 * Math.sin(a)} y1={80 - r1 * Math.cos(a)}
                        x2={80 + r2 * Math.sin(a)} y2={80 - r2 * Math.cos(a)}
                        stroke="rgba(255,255,255,0.45)" strokeWidth={major ? 1.6 : 0.7} />;
                    })}
                  </svg>
                  <span className="absolute left-1/2 top-2 -translate-x-1/2 text-[11px] font-bold text-white/80">N</span>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/80">E</span>
                  <span className="absolute left-1/2 bottom-2 -translate-x-1/2 text-[11px] font-bold text-white/80">S</span>
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/80">W</span>
                  <div className="absolute inset-0" style={{ transform: `rotate(${bearing}deg)` }}>
                    <div className="absolute left-1/2 top-[18px] h-0 w-0 -translate-x-1/2 border-x-[8px] border-b-[30px] border-x-transparent border-b-emerald-400" />
                  </div>
                  {/* Kaaba at center */}
                  <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[5px] bg-midnight-900 shadow-lg ring-1 ring-gold-400/50">
                    <span className="block h-3.5 w-3.5 rounded-[2px] border border-gold-300/80" />
                  </span>
                </div>

                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-white">{Math.round(bearing)}<span className="align-top text-lg">°</span></p>
                  <p className="text-sm text-white/80">from North</p>
                  <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/25 px-3 py-1 text-xs font-semibold text-emerald-100 ring-1 ring-emerald-300/30">
                    <Compass size={12} /> Accurate
                  </span>
                  <p className="mt-2 text-xs text-white/75">Makkah, Saudi Arabia</p>
                </div>

                <Link href="/dashboard/qibla" className="mt-5 flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
                  <MapPin size={15} /> View on Map
                </Link>
              </div>
            </motion.section>

            {/* Azan Voices — scrolling ticker */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${cardCls} p-5 flex flex-col`}>
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-500"><Bell size={18} /></span>
                  <div>
                    <h3 className="text-lg font-bold leading-tight">Azan Voices</h3>
                    <p className={`text-sm ${isDark ? c.muted : 'text-emerald-900'}`}>Listen to beautiful Azan</p>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${isDark ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-600'}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live
                </span>
              </div>

              {/* Scrolling voices list — top 7, compact; fixed height so the card doesn't stretch with taller siblings */}
              <div className="relative overflow-hidden rounded-2xl h-56">
                {/* Top fade */}
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-8 z-10 ${isDark ? 'bg-gradient-to-b from-midnight-800/80 to-transparent' : 'bg-gradient-to-b from-white to-transparent'}`} />
                {/* Bottom fade */}
                <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 z-10 ${isDark ? 'bg-gradient-to-t from-midnight-800/80 to-transparent' : 'bg-gradient-to-t from-white to-transparent'}`} />

                <motion.div
                  animate={{ y: [0, -(arrangedVoices.length * 56)] }}
                  transition={{ duration: arrangedVoices.length * 2.8, repeat: Infinity, ease: 'linear', repeatDelay: 0 }}
                  className="space-y-2"
                >
                  {/* Doubled list for seamless loop */}
                  {[...arrangedVoices, ...arrangedVoices].map((voice, i) => {
                    const isSelected = voice.id === selectedAzanVoice;
                    return (
                      <Link
                        href="/dashboard/azan-voices"
                        key={`${voice.id}-${i}`}
                        className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition h-[48px] ${
                          isSelected
                            ? (isDark ? 'bg-emerald-500/20 ring-1 ring-emerald-400/50' : 'bg-emerald-50 ring-1 ring-emerald-300')
                            : `border ${c.divider} ${isDark ? 'bg-white/[0.02] hover:bg-white/[0.04]' : 'hover:bg-emerald-50/50'}`
                        }`}
                      >
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${isSelected ? 'bg-emerald-600 text-white' : 'bg-gradient-to-br from-emerald-400 to-emerald-700 text-white'}`}>
                          <User size={13} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className={`truncate text-sm font-semibold leading-tight ${isSelected ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : ''}`}>{voice.name}</p>
                          <p className={`truncate text-xs ${c.faint}`}>{voice.region}</p>
                        </div>
                        {isSelected && (
                          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                            <Play size={10} className="ml-0.5" fill="currentColor" />
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </motion.div>
              </div>

              <Link href="/dashboard/azan-voices" className={`mt-auto pt-4 flex items-center justify-center gap-2 rounded-2xl border py-3 text-sm font-semibold transition ${isDark ? 'border-violet-400/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20' : 'border-violet-200 bg-violet-50 text-violet-600 hover:border-violet-300'}`}>
                <Bell size={15} /> View All Voices
              </Link>
            </motion.section>

            {/* Recitation Scheduler */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className={`${cardCls} p-5 flex flex-col`}>
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-600"><BookOpen size={18} /></span>
                <div>
                  <h3 className="text-lg font-bold leading-tight">Recitation Scheduler</h3>
                  <p className={`text-sm ${isDark ? c.muted : 'text-emerald-900'}`}>Your daily Quran recitation</p>
                </div>
              </div>
              <div className={`mt-4 flex items-center justify-between rounded-2xl border ${c.divider} ${c.soft} px-4 py-3`}>
                <div>
                  <p className={`text-sm ${isDark ? c.muted : 'text-emerald-900'}`}>Daily Goal</p>
                  <p className="text-2xl font-bold leading-tight">20 <span className={`text-sm font-medium ${c.muted}`}>minutes</span></p>
                </div>
                <div className="relative grid h-12 w-12 place-items-center">
                  <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(5,95,70,0.12)'} strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="15.5" fill="none" stroke="#059669" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 15.5}`} strokeDashoffset={`${2 * Math.PI * 15.5 * (1 - 0.6)}`} />
                  </svg>
                  <span className="absolute text-[11px] font-bold text-emerald-600">60%</span>
                </div>
              </div>
              <div className="mt-4 flex-1 space-y-3.5">
                <div>
                  <p className={`text-xs ${c.faint}`}>Next Session</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-sm font-semibold">Surah Al-Kahf (18)</span>
                    <span className={`text-xs ${c.muted}`}>Today, 08:00 PM</span>
                  </div>
                </div>
                <div className={`border-t ${c.divider}`} />
                <div>
                  <p className={`text-xs ${c.faint}`}>Last Session</p>
                  <div className="mt-0.5 flex items-center justify-between">
                    <span className="text-sm font-semibold">Surah Yaseen (36)</span>
                    <span className={`text-xs ${c.muted}`}>Today, 06:00 AM</span>
                  </div>
                </div>
              </div>
              <Link href="/dashboard/recitation" className={`mt-4 flex items-center justify-center gap-2 rounded-2xl border ${c.divider} py-3 text-sm font-semibold text-emerald-600 transition hover:border-emerald-400 hover:bg-emerald-50/40`}>
                <Calendar size={15} /> Open Scheduler
              </Link>
            </motion.section>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="space-y-5">
          {/* Quran of the Day (purple-tinted) */}
          <motion.section
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
            className={`relative min-h-[560px] overflow-hidden rounded-[26px] border p-5 ${isDark ? 'border-white/10' : 'border-violet-200/60'}`}
            style={{ background: isDark ? 'linear-gradient(160deg,#241b3a 0%,#1a1430 100%)' : 'linear-gradient(160deg,#f6f2ff 0%,#efe9fb 55%,#e9e1f7 100%)' }}
          >
            {/* full-bleed background: mosque-and-flowers artwork, anchored to the
                bottom and rendered crisp (saturated, no wash) in light mode. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/overview_page_bg-1.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] w-full select-none object-cover object-bottom"
              style={{ filter: isDark ? 'brightness(0.62) saturate(1.1)' : 'saturate(1.3) contrast(1.12)', WebkitMaskImage: 'linear-gradient(to top, black 74%, transparent)', maskImage: 'linear-gradient(to top, black 74%, transparent)' }}
            />
            {/* No full-section wash — the artwork stays fully clear. Only the
                verse panel below carries a translucent background for legibility. */}
            <div className="relative flex flex-col">
              {/* header + surface labels sit over the clear image; a soft white
                  text-shadow (light mode) keeps them readable without a wash. */}
              <div className={`flex items-center gap-2 ${isDark ? '' : '[text-shadow:0_1px_8px_rgba(255,255,255,0.85)]'}`}>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-200/70 text-violet-700"><BookOpen size={17} /></span>
                <h3 className="text-lg font-bold">Quran of the Day</h3>
              </div>

              <div className={`mt-4 ${isDark ? '' : '[text-shadow:0_1px_8px_rgba(255,255,255,0.85)]'}`}>
                <AyahDisplay variant="rail" isDark={isDark} />
              </div>

              <Link href="/dashboard/quran" className={`mt-5 inline-flex w-fit items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold backdrop-blur transition ${isDark ? 'border-violet-400/30 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30' : 'border-violet-300/70 bg-white/70 text-violet-700 hover:bg-white'}`}>
                <BookOpen size={15} /> Read More
              </Link>
            </div>
          </motion.section>

          {/* Quick Actions — this card lives in the fixed ~340px sidebar column, not
              the full page width, so the grid stays at 2 columns regardless of
              viewport size (a wider breakpoint here would squeeze 4 columns into
              ~300px and truncate every label). */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className={`${cardCls} p-5`}>
            <h3 className="text-lg font-bold">Quick Actions</h3>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Quran Library',      sub: 'Read, listen & bookmark Surahs',   icon: BookOpen,   tint: 'text-emerald-600', bg: 'bg-emerald-100', href: '/dashboard/quran' },
                { label: 'Duas & Supplications', sub: 'Masnoon duas for every moment',  icon: Hand,       tint: 'text-violet-600',  bg: 'bg-violet-100',  href: '/dashboard/advanced?tab=duas' },
                { label: 'Hadees Library',      sub: 'Authentic hadith collections',     icon: BookMarked, tint: 'text-rose-500',    bg: 'bg-rose-100',    href: '/dashboard/advanced?tab=hadees' },
                { label: 'Tafsir-ul-Quran',     sub: 'Verse-by-verse Quran commentary',  icon: Library,    tint: 'text-sky-600',     bg: 'bg-sky-100',     href: '/dashboard/advanced?tab=tafsir' },
                { label: 'Islamic Masail',      sub: 'Hanafi rulings & fatawa',          icon: Scale,      tint: 'text-amber-600',   bg: 'bg-amber-100',   href: '/dashboard/advanced?tab=masail' },
                { label: 'Islamic Calculators', sub: 'Zakat, Ushr & inheritance',        icon: Calculator, tint: 'text-teal-600',    bg: 'bg-teal-100',    href: '/dashboard/advanced?tab=calculators' },
                { label: 'Azan Voices',         sub: 'Choose your favorite Muezzin',     icon: Bell,       tint: 'text-orange-500',  bg: 'bg-orange-100',  href: '/dashboard/azan-voices' },
                { label: 'Schedule Recitation', sub: 'Daily Quran recitation reminders', icon: Clock,      tint: 'text-indigo-600',  bg: 'bg-indigo-100',  href: '/dashboard/recitation' },
              ].map((a) => (
                <Link key={a.label} href={a.href}
                  className={`group flex items-start gap-3 rounded-2xl border ${c.divider} ${isDark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-white hover:bg-emerald-50/40'} p-3.5 transition hover:shadow-md`}>
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${a.bg} transition group-hover:scale-105`}><a.icon size={19} className={a.tint} /></span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold leading-tight ${c.text}`}>{a.label}</span>
                    <span className={`block text-[11px] mt-0.5 leading-snug ${c.faint}`}>{a.sub}</span>
                  </span>
                </Link>
              ))}
            </div>
          </motion.section>
        </div>
      </div>

      </ContentBackdrop>
      </div>

    </div>
  );
}
