'use client';

// ── Overview page "Quick Actions" row ────────────────────────────────────────
// Full-width row of shortcut cards. When the row fits the available width it
// renders as a plain static row; once the viewport is too narrow to fit every
// card, it seamlessly loops the row right-to-left instead of wrapping/clipping,
// so every action stays reachable (and visible) on any screen size.
//
// Overflow is measured (not breakpoint-guessed) via a hidden reference copy —
// the same row, rendered off-screen — so the switch happens at the exact width
// where cards would otherwise start clipping, not at an arbitrary Tailwind
// breakpoint.

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export type QuickAction = {
  label: string;
  sub: string;
  icon: any; // lucide-react icon component
  tint: string;
  bg: string;
  href: string;
};

type ThemeTokens = { divider: string; text: string; faint: string };

function ActionCard({ a, isDark, c }: { a: QuickAction; isDark: boolean; c: ThemeTokens }) {
  const Icon = a.icon;
  return (
    <Link
      href={a.href}
      className={`group flex w-64 shrink-0 items-start gap-3 rounded-2xl border ${c.divider} ${isDark ? 'bg-white/[0.03] hover:bg-white/[0.06]' : 'bg-white hover:bg-emerald-50/40'} p-3.5 transition hover:shadow-md`}
    >
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${a.bg} transition group-hover:scale-105`}>
        <Icon size={19} className={a.tint} />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-bold leading-tight ${c.text}`}>{a.label}</span>
        <span className={`block text-[11px] mt-0.5 leading-snug ${c.faint}`}>{a.sub}</span>
      </span>
    </Link>
  );
}

export function QuickActionsMarquee({ actions, isDark, c }: { actions: QuickAction[]; isDark: boolean; c: ThemeTokens }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [overflowing, setOverflowing] = useState(false);

  useEffect(() => {
    const outer = outerRef.current;
    const measure = measureRef.current;
    if (!outer || !measure) return;
    const check = () => setOverflowing(measure.scrollWidth > outer.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(outer);
    window.addEventListener('resize', check);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', check);
    };
  }, [actions.length]);

  return (
    <div ref={outerRef} className="relative overflow-hidden">
      {/* Hidden reference row — never displayed, only measured — so the overflow
          check reflects the row's true natural width regardless of which mode
          (static / looping) is currently on screen. */}
      <div ref={measureRef} aria-hidden className="invisible absolute flex gap-3" style={{ pointerEvents: 'none' }}>
        {actions.map((a) => <ActionCard key={a.label} a={a} isDark={isDark} c={c} />)}
      </div>

      {overflowing ? (
        <div className="flex w-max animate-marquee">
          <div className="flex gap-3 pr-3">
            {actions.map((a) => <ActionCard key={a.label} a={a} isDark={isDark} c={c} />)}
          </div>
          <div className="flex gap-3 pr-3" aria-hidden>
            {actions.map((a) => <ActionCard key={`${a.label}-dup`} a={a} isDark={isDark} c={c} />)}
          </div>
        </div>
      ) : (
        <div className="flex gap-3">
          {actions.map((a) => <ActionCard key={a.label} a={a} isDark={isDark} c={c} />)}
        </div>
      )}
    </div>
  );
}
