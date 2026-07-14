import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0B1410',
        parchment: '#FAF7EE',
        emerald: {
          50:  '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          800: '#065F46',
          900: '#064E3B',
          950: '#022C22',
        },
        gold: {
          50:  '#FBF8EF',
          100: '#F6EED0',
          200: '#F0E2A6',
          300: '#E9CF7A',
          400: '#DDB94B',
          500: '#C9A227',
          600: '#A6831A',
          700: '#7D6213',
          800: '#5E4B0F',
          900: '#3F320A',
        },
        midnight: {
          400: '#3B4E66',
          600: '#1F3147',
          700: '#162639',
          800: '#0E1B2A',
          900: '#080F19',
        },
        accent: { DEFAULT: '#C9A227', soft: '#F6EED0' },
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        arabic:  ['"Scheherazade New"', '"Amiri"', '"Noto Naskh Arabic"', 'serif'],
        // Nastaleeq-style font for the 16-line Indo-Pak mushaf reading view — visually
        // distinct from the Naskh-style `arabic` font used by the recitation player.
        // Placeholder pending a licensed Indo-Pak Quran font (see plan notes); Noto
        // Nastaliq Urdu is OFL-licensed and safe to bundle as-is.
        mushaf:  ['"Noto Nastaliq Urdu"', '"Scheherazade New"', 'serif'],
      },
      backgroundImage: {
        'mosque-gradient':
          'linear-gradient(135deg, #162639 0%, #0E1B2A 50%, #080F19 100%)',
        'gold-gradient':
          'linear-gradient(135deg, #DDB94B 0%, #C9A227 50%, #A6831A 100%)',
        'parchment-soft':
          'radial-gradient(circle at 20% 0%, #FBF8EF 0%, #FAF7EE 35%, #F1EDDC 100%)',
        'glow-emerald':
          'radial-gradient(circle at 50% 50%, rgba(16,185,129,0.35) 0%, transparent 70%)',
        'islamic-pattern':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'><g fill='none' stroke='rgba(201,162,39,0.18)' stroke-width='1'><path d='M40 4 L74 24 L74 56 L40 76 L6 56 L6 24 Z'/><path d='M40 16 L62 28 L62 52 L40 64 L18 52 L18 28 Z'/><circle cx='40' cy='40' r='10'/></g></svg>\")",
      },
      boxShadow: {
        'glow-emerald': '0 10px 40px -10px rgba(16,185,129,0.45)',
        'glow-gold':    '0 10px 40px -10px rgba(201,162,39,0.45)',
        'card-soft':    '0 1px 2px rgba(11,20,16,0.05), 0 12px 32px -8px rgba(11,20,16,0.08)',
      },
      keyframes: {
        'fade-in':  { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'float':    { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        'float-y':  { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-16px)' } },
        'float-x':  { '0%,100%': { transform: 'translateX(0)' }, '50%': { transform: 'translateX(18px)' } },
        'pulse-soft': { '0%,100%': { opacity: '0.55' }, '50%': { opacity: '1' } },
        'spin-slow':  { 'to': { transform: 'rotate(360deg)' } },
        'spin-rev':   { 'to': { transform: 'rotate(-360deg)' } },
        'shimmer':    { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'marquee':    { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        'ring':       { '0%': { transform: 'scale(0.55)', opacity: '0.65' }, '100%': { transform: 'scale(2.4)', opacity: '0' } },
        'aurora':     { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(6%,-4%) scale(1.08)' }, '66%': { transform: 'translate(-5%,5%) scale(0.96)' } },
        'sheen':      { '0%': { transform: 'translateX(-120%) skewX(-18deg)' }, '100%': { transform: 'translateX(220%) skewX(-18deg)' } },
      },
      animation: {
        'fade-in':    'fade-in 0.5s ease-out both',
        'float':      'float 5s ease-in-out infinite',
        'float-y':    'float-y 7s ease-in-out infinite',
        'float-x':    'float-x 9s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2.4s ease-in-out infinite',
        'spin-slow':  'spin-slow 24s linear infinite',
        'spin-rev':   'spin-rev 32s linear infinite',
        'shimmer':    'shimmer 2.2s linear infinite',
        'marquee':    'marquee 36s linear infinite',
        'ring':       'ring 3.4s ease-out infinite',
        'aurora':     'aurora 18s ease-in-out infinite',
        'sheen':      'sheen 4.5s ease-in-out infinite',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
} satisfies Config;
