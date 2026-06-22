'use client';

/**
 * Layered, animated backdrop for the dashboard sidebar — themed *separately*
 * for dark and light mode to match the Noor design:
 *
 *   • a base gradient (deep forest-green at night, warm parchment by day)
 *   • slowly drifting "aurora" glow blobs — the moving shades
 *   • a faded arabesque pattern tucked into the top-right corner
 *   • twinkling stars + a glowing crescent (dark) / drifting birds (light)
 *   • a hand-drawn mosque skyline silhouette anchored to the bottom
 *
 * Purely decorative: non-interactive and hidden from assistive tech. Sits at
 * z-0 behind the sidebar's relative/z-10 content.
 */

// Fixed star field (percentage-based so it scales with the rail and stays
// stable across SSR/CSR — no Math.random hydration mismatch). Dark mode only.
const STARS = [
  { x: '18%', y: '15%', r: 2,   o: 0.85, d: 0   },
  { x: '33%', y: '9%',  r: 1.5, o: 0.6,  d: 0.6 },
  { x: '55%', y: '13%', r: 2,   o: 0.7,  d: 1.2 },
  { x: '71%', y: '19%', r: 1.5, o: 0.5,  d: 0.3 },
  { x: '86%', y: '11%', r: 2,   o: 0.75, d: 0.9 },
  { x: '45%', y: '23%', r: 1.5, o: 0.55, d: 1.6 },
  { x: '12%', y: '29%', r: 1.5, o: 0.5,  d: 2.0 },
  { x: '63%', y: '30%', r: 1.5, o: 0.5,  d: 2.4 },
];

export function SidebarScene({ isDark }: { isDark: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden>
      {/* ── base gradient ── */}
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{
          background: isDark
            ? 'linear-gradient(165deg,#10332a 0%,#0a2019 42%,#06120d 100%)'
            : 'linear-gradient(165deg,#fcfaf2 0%,#f3f1e3 55%,#e9eede 100%)',
        }}
      />

      {/* ── moving shades: drifting aurora blobs ── */}
      <div
        className="absolute -top-24 -left-20 w-72 h-72 rounded-full blur-3xl animate-aurora"
        style={{
          background: isDark
            ? 'radial-gradient(circle,rgba(16,185,129,0.32),transparent 70%)'
            : 'radial-gradient(circle,rgba(52,211,153,0.22),transparent 70%)',
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full blur-3xl animate-float-x"
        style={{
          background: isDark
            ? 'radial-gradient(circle,rgba(201,162,39,0.20),transparent 70%)'
            : 'radial-gradient(circle,rgba(221,185,75,0.22),transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-28 -left-16 w-72 h-72 rounded-full blur-3xl animate-float-y"
        style={{
          background: isDark
            ? 'radial-gradient(circle,rgba(20,140,100,0.30),transparent 70%)'
            : 'radial-gradient(circle,rgba(120,180,140,0.22),transparent 70%)',
        }}
      />

      {/* ── top-right arabesque, faded into the corner ── */}
      <div
        className="pattern-bg absolute -top-8 right-0 w-60 h-60 animate-spin-slow"
        style={{
          opacity: isDark ? 0.45 : 0.55,
          WebkitMaskImage: 'radial-gradient(circle at 100% 0%,#000 0%,transparent 72%)',
          maskImage: 'radial-gradient(circle at 100% 0%,#000 0%,transparent 72%)',
        }}
      />

      {/* ── dark-mode only: glowing crescent + twinkling stars ── */}
      {isDark && (
        <>
          <div
            className="absolute top-9 right-9 w-16 h-16 rounded-full blur-xl animate-pulse-soft"
            style={{ background: 'radial-gradient(circle,rgba(233,207,122,0.5),transparent 70%)' }}
          />
          <svg
            viewBox="0 0 24 24"
            className="absolute top-11 right-12 w-7 h-7 text-gold-300/80 animate-float"
            fill="none" stroke="currentColor" strokeWidth="1.6"
          >
            <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
          </svg>
          {STARS.map((s, i) => (
            <span
              key={i}
              className="absolute rounded-full bg-gold-200 animate-pulse-soft"
              style={{
                left: s.x, top: s.y,
                width: `${s.r}px`, height: `${s.r}px`,
                opacity: s.o, animationDelay: `${s.d}s`,
              }}
            />
          ))}
        </>
      )}

      {/* ── mosque panorama anchored to the bottom, hazing out toward the top ──
          In light mode `multiply` drops the image's pale sky into the parchment
          so only the green domes / minarets remain (watercolour feel). In dark
          mode it's darkened + tinted and seated with a deep-green overlay. */}
      <div
        className="absolute inset-x-0 bottom-0 h-[46%] bg-no-repeat"
        style={{
          backgroundImage: 'url(/quran-bg-card.png)',
          backgroundSize: '143% auto',
          backgroundPosition: 'left bottom',
          opacity: isDark ? 0.55 : 0.92,
          mixBlendMode: isDark ? 'normal' : 'multiply',
          filter: isDark
            ? 'brightness(0.5) contrast(1.05) saturate(1.15)'
            : 'saturate(1.05)',
          WebkitMaskImage: 'linear-gradient(to top,#000 58%,transparent 100%)',
          maskImage: 'linear-gradient(to top,#000 58%,transparent 100%)',
        }}
      />
      {isDark && (
        <div
          className="absolute inset-x-0 bottom-0 h-[46%]"
          style={{
            background:
              'linear-gradient(to top,rgba(6,18,13,0.55) 0%,rgba(6,18,13,0.25) 45%,transparent 75%)',
          }}
        />
      )}
    </div>
  );
}
