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

      {/* ── mosque skyline anchored to the bottom, hazing out toward the top ── */}
      <div
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{
          WebkitMaskImage: 'linear-gradient(to top,#000 50%,transparent 100%)',
          maskImage: 'linear-gradient(to top,#000 50%,transparent 100%)',
        }}
      >
        <MosqueSkyline isDark={isDark} />
      </div>
    </div>
  );
}

/**
 * Hand-built mosque skyline silhouette: a central onion dome flanked by two
 * side domes, two inner and two outer minarets, and an arcade base. Filled with
 * a soft sage gradient in light mode (watercolour feel) and a deep-green
 * gradient in dark mode (night silhouette). Light mode also gets a few birds.
 */
function MosqueSkyline({ isDark }: { isDark: boolean }) {
  return (
    <svg
      viewBox="0 0 400 240"
      preserveAspectRatio="xMidYMax slice"
      className="absolute inset-0 w-full h-full"
    >
      <defs>
        <linearGradient id="mosque-light" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d3e2d6" />
          <stop offset="100%" stopColor="#9bbaa4" />
        </linearGradient>
        <linearGradient id="mosque-dark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#16563d" />
          <stop offset="100%" stopColor="#091f15" />
        </linearGradient>
      </defs>

      {/* birds (light mode only) */}
      {!isDark && (
        <g stroke="#5c7a66" strokeWidth="1.4" fill="none" opacity="0.5" className="animate-float">
          <path d="M70 84 q5 -5 10 0 q5 -5 10 0" />
          <path d="M104 70 q5 -5 10 0 q5 -5 10 0" />
          <path d="M300 98 q4 -4 8 0 q4 -4 8 0" />
        </g>
      )}

      <g fill={isDark ? 'url(#mosque-dark)' : 'url(#mosque-light)'} opacity={isDark ? 0.95 : 0.6}>
        {/* outer minaret — left */}
        <rect x="37" y="84" width="14" height="156" />
        <rect x="32" y="100" width="24" height="6" />
        <path d="M37 88 Q44 64 51 88 Z" />
        <path d="M41 66 L44 50 L47 66 Z" />
        <circle cx="44" cy="48" r="3" />

        {/* inner minaret — left */}
        <rect x="106" y="120" width="12" height="120" />
        <rect x="102" y="132" width="20" height="5" />
        <path d="M106 124 Q112 104 118 124 Z" />
        <path d="M109 108 L112 94 L115 108 Z" />
        <circle cx="112" cy="92" r="2.5" />

        {/* side dome — left */}
        <rect x="140" y="176" width="32" height="30" />
        <path d="M134 178 C128 156 146 146 156 134 C166 146 184 156 178 178 Z" />
        <path d="M153 136 L156 122 L159 136 Z" />
        <circle cx="156" cy="120" r="2.5" />

        {/* central dome */}
        <rect x="172" y="150" width="56" height="56" />
        <path d="M166 152 C158 118 184 110 200 90 C216 110 242 118 234 152 Z" />
        <path d="M196 92 L200 70 L204 92 Z" />
        <circle cx="200" cy="68" r="3.5" />

        {/* side dome — right */}
        <rect x="228" y="176" width="32" height="30" />
        <path d="M222 178 C216 156 234 146 244 134 C254 146 272 156 266 178 Z" />
        <path d="M241 136 L244 122 L247 136 Z" />
        <circle cx="244" cy="120" r="2.5" />

        {/* inner minaret — right */}
        <rect x="282" y="120" width="12" height="120" />
        <rect x="278" y="132" width="20" height="5" />
        <path d="M282 124 Q288 104 294 124 Z" />
        <path d="M285 108 L288 94 L291 108 Z" />
        <circle cx="288" cy="92" r="2.5" />

        {/* outer minaret — right */}
        <rect x="349" y="84" width="14" height="156" />
        <rect x="344" y="100" width="24" height="6" />
        <path d="M349 88 Q356 64 363 88 Z" />
        <path d="M353 66 L356 50 L359 66 Z" />
        <circle cx="356" cy="48" r="3" />

        {/* annexes + arcade base */}
        <rect x="60" y="186" width="44" height="54" />
        <rect x="296" y="186" width="44" height="54" />
        <rect x="6" y="200" width="388" height="40" />
      </g>
    </svg>
  );
}
