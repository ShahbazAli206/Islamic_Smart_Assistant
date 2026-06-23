'use client';

import { useAyahOfDay } from '@/lib/useAyahOfDay';

function toArabicNumeral(n: number): string {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

type Props = {
  /**
   * 'hero'    — light glass card overlay (black text, gold ayah-number badge)
   * 'rail'    — purple-tinted right-rail card (honours isDark)
   * 'minimal' — inline, inherits surrounding text colour
   */
  variant?: 'hero' | 'rail' | 'minimal';
  isDark?: boolean;
};

export function AyahDisplay({ variant = 'hero', isDark = false }: Props) {
  const { data, isLoading } = useAyahOfDay();

  if (isLoading) return <AyahSkeleton variant={variant} isDark={isDark} />;
  if (!data) return null;

  const ref = `Surah ${data.surahName} (${data.surahNumber}:${data.ayahNumber})`;

  if (variant === 'hero') {
    return (
      <div>
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">
            {toArabicNumeral(data.ayahNumber)}
          </span>
          <p dir="rtl" className="font-arabic text-2xl leading-snug text-black">{data.arabic}</p>
        </div>
        {data.translation && (
          <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-black">
            {data.translation}
          </p>
        )}
        <p className="mt-2 text-xs font-semibold text-black/75">{ref}</p>
      </div>
    );
  }

  if (variant === 'rail') {
    const textPrimary = isDark ? 'text-violet-100' : 'text-violet-900';
    const textMuted   = isDark ? 'text-white/55'   : 'text-violet-900/55';
    const headText    = isDark ? 'text-parchment'  : 'text-emerald-950';
    return (
      <div>
        <p className={`text-lg font-bold leading-tight ${headText}`}>
          Surah {data.surahName}
        </p>
        <p className={`text-xs ${textMuted}`}>
          ({data.surahNumber}:{data.ayahNumber})
        </p>
        <div className={`mt-4 rounded-2xl border px-4 py-3 backdrop-blur-md ${isDark ? 'border-white/15 bg-midnight-900/35' : 'border-white/60 bg-white/55'}`}>
          <p dir="rtl" className={`font-arabic text-2xl leading-[1.7] ${textPrimary}`}>
            {data.arabic}
          </p>
          {data.translation && (
            <p className={`mt-2 text-[13px] font-medium leading-relaxed ${textMuted}`}>
              {data.translation}
            </p>
          )}
        </div>
      </div>
    );
  }

  // minimal — drop into any page, inherits colour
  return (
    <div>
      <p dir="rtl" className="font-arabic text-xl leading-relaxed">{data.arabic}</p>
      {data.translation && (
        <p className="mt-2 text-sm leading-relaxed">{data.translation}</p>
      )}
      <p className="mt-1 text-xs opacity-60">{ref}</p>
    </div>
  );
}

// ── Loading skeletons ──────────────────────────────────────────────────────

function AyahSkeleton({ variant, isDark }: { variant: string; isDark: boolean }) {
  const pulse = 'animate-pulse rounded-lg';

  if (variant === 'hero') {
    return (
      <div>
        <div className="flex items-center gap-3">
          <div className={`h-9 w-9 shrink-0 rounded-full ${pulse} bg-black/10`} />
          <div className={`h-7 w-64 ${pulse} bg-black/10`} />
        </div>
        <div className={`mt-3 h-5 w-52 ${pulse} bg-black/10`} />
        <div className={`mt-2 h-3.5 w-32 ${pulse} bg-black/10`} />
      </div>
    );
  }

  if (variant === 'rail') {
    const bg = isDark ? 'bg-white/10' : 'bg-violet-900/10';
    return (
      <div>
        <div className={`h-6 w-36 ${pulse} ${bg}`} />
        <div className={`mt-1 h-4 w-16 ${pulse} ${bg}`} />
        <div className={`mt-4 rounded-2xl border px-4 py-3 ${isDark ? 'border-white/15 bg-midnight-900/35' : 'border-white/60 bg-white/55'}`}>
          <div className={`h-8 w-full ${pulse} ${bg}`} />
          <div className={`mt-2 h-5 w-4/5 ${pulse} ${bg}`} />
        </div>
      </div>
    );
  }

  return <div className={`h-16 w-full ${pulse} bg-current/10`} />;
}
