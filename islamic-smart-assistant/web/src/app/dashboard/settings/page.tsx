'use client';

import { motion } from 'framer-motion';
import {
  Sparkles, ToggleLeft, ToggleRight, Bell, BookOpen, Globe2, Shield, CreditCard,
} from 'lucide-react';
import { useState } from 'react';

// Read-only summary tiles shown at the top — current platform-wide defaults.
// `accent` is the gradient class applied to the icon badge and glow.
const TILES = [
  { icon: Bell,       title: 'Default Azan voice', value: 'Makkah — Haramain',  accent: 'from-emerald-500 to-emerald-700' },
  { icon: BookOpen,   title: 'Default reciter',    value: 'Abdul Basit (Murattal)', accent: 'from-gold-400 to-gold-600' },
  { icon: Globe2,     title: 'Default language',   value: 'English + Urdu translation', accent: 'from-cyan-500 to-indigo-600' },
  { icon: CreditCard, title: 'Billing',            value: 'Free tier — upgrade anytime', accent: 'from-fuchsia-500 to-rose-500' },
];

// Toggleable feature flags. `on` is the initial state; `key` seeds the local
// flags map below and is the stable identity for each row.
const FLAGS = [
  { key: 'azan_auto',       label: 'Auto-play Azan on all linked devices',             on: true },
  { key: 'translation_mode', label: 'Translation playback (Arabic + Urdu)',             on: true },
  { key: 'qibla_compass',   label: 'Show Qibla compass on mobile dashboard',           on: true },
  { key: 'dst_adjust',      label: 'Auto-adjust prayer times for Daylight Saving',     on: true },
  { key: 'analytics',       label: 'Share anonymous usage analytics',                  on: false },
];

/** Global settings page — default info tiles plus the platform feature-flag toggles. */
export default function GlobalSettings() {
  // Lazy init builds a { key: on } lookup from FLAGS so toggles are tracked by key.
  const [flags, setFlags] = useState(() => Object.fromEntries(FLAGS.map((f) => [f.key, f.on])));

  return (
    <div className="space-y-6">
      {/* page header */}
      <div>
        <p className="chip-gold mb-2"><Sparkles size={12}/> Platform</p>
        <h1 className="h-display text-4xl font-bold">Global Settings</h1>
        <p className="text-ink/60 mt-1">Defaults applied to every new user across mobile, web, desktop and smart speakers.</p>
      </div>

      {/* read-only default tiles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {TILES.map((t, i) => (
          <motion.div
            key={t.title}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
            className="card card-pad relative overflow-hidden"
          >
            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${t.accent} opacity-20`} />
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl text-white bg-gradient-to-br ${t.accent} shadow-md`}>
              <t.icon size={20}/>
            </div>
            <p className="text-sm text-ink/55 mt-4">{t.title}</p>
            <p className="text-lg font-semibold">{t.value}</p>
          </motion.div>
        ))}
      </div>

      {/* feature-flag toggle list */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="p-5 border-b border-emerald-900/5 flex items-center gap-2">
          <Shield size={16} className="text-emerald-700"/>
          <h3 className="font-bold">Feature flags</h3>
        </div>
        <ul className="divide-y divide-emerald-900/5">
          {FLAGS.map((f) => (
            <li key={f.key} className="flex items-center justify-between p-5">
              <span className="text-sm">{f.label}</span>
              <button
                // flip just this flag, leaving the rest of the map untouched
                onClick={() => setFlags((s) => ({ ...s, [f.key]: !s[f.key] }))}
                className={`inline-flex items-center gap-2 text-sm font-semibold rounded-full px-3 py-1.5 transition
                            ${flags[f.key]
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-600'}`}
              >
                {flags[f.key]
                  ? <><ToggleRight size={18} className="text-emerald-700"/> On</>
                  : <><ToggleLeft  size={18} className="text-slate-500"/> Off</>}
              </button>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );
}
