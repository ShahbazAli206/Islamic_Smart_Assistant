'use client';

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

      {/* ── full-height background image (visible through glass overlay) ── */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/quran-bg-card.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center 60%',
          opacity: isDark ? 0.30 : 0.48,
          mixBlendMode: isDark ? 'normal' : 'multiply',
          filter: isDark
            ? 'brightness(0.42) contrast(1.05) saturate(1.15)'
            : 'saturate(1.20) brightness(0.90)',
          WebkitMaskImage: 'linear-gradient(to top,#000 20%,rgba(0,0,0,0.60) 58%,rgba(0,0,0,0.20) 100%)',
          maskImage:       'linear-gradient(to top,#000 20%,rgba(0,0,0,0.60) 58%,rgba(0,0,0,0.20) 100%)',
        }}
      />

      {/* ── semi-transparent glass gradient overlay ── */}
      <div
        className="absolute inset-0 transition-[background] duration-700"
        style={{
          background: isDark
            ? 'linear-gradient(165deg,rgba(16,51,42,0.88) 0%,rgba(10,32,25,0.88) 42%,rgba(6,18,13,0.90) 100%)'
            : 'linear-gradient(165deg,rgba(252,250,242,0.72) 0%,rgba(243,241,227,0.70) 55%,rgba(233,238,222,0.68) 100%)',
        }}
      />

      {/* ── moving shades: drifting aurora blobs ── */}
      <div
        className="absolute -top-24 -left-20 w-72 h-72 rounded-full blur-3xl animate-aurora"
        style={{
          background: isDark
            ? 'radial-gradient(circle,rgba(16,185,129,0.32),transparent 70%)'
            : 'radial-gradient(circle,rgba(52,211,153,0.18),transparent 70%)',
        }}
      />
      <div
        className="absolute top-1/3 -right-24 w-80 h-80 rounded-full blur-3xl animate-float-x"
        style={{
          background: isDark
            ? 'radial-gradient(circle,rgba(201,162,39,0.20),transparent 70%)'
            : 'radial-gradient(circle,rgba(221,185,75,0.16),transparent 70%)',
        }}
      />
      <div
        className="absolute bottom-28 -left-16 w-72 h-72 rounded-full blur-3xl animate-float-y"
        style={{
          background: isDark
            ? 'radial-gradient(circle,rgba(20,140,100,0.30),transparent 70%)'
            : 'radial-gradient(circle,rgba(120,180,140,0.18),transparent 70%)',
        }}
      />

      {/* ── top-right arabesque, faded into the corner ── */}
      <div
        className="pattern-bg absolute -top-8 right-0 w-60 h-60 animate-spin-slow"
        style={{
          opacity: isDark ? 0.45 : 0.40,
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

      {/* ── dark-mode bottom vignette to seat the scene ── */}
      {isDark && (
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top,rgba(6,18,13,0.65) 0%,rgba(6,18,13,0.30) 40%,transparent 70%)',
          }}
        />
      )}
    </div>
  );
}
