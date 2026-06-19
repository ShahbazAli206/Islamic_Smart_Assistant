'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, User, Smartphone, Music2, BarChart3, Settings,
  BookOpen, Bell, Clock, MapPin, Globe, GraduationCap, Pencil, Menu, X, AlarmClock, Compass,
  Moon, Sun,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { motion } from 'framer-motion';
import { AutoAzanScheduler } from '@/components/AutoAzanScheduler';
import { SurahScheduleRunner } from '@/components/SurahScheduleRunner';
import { OnboardingSetup } from '@/components/OnboardingSetup';
import { ProfileModal } from '@/components/ProfileModal';
import { useLocalStorage } from '@/lib/useLocalStorage';

// Human-readable labels for the persisted `isa:sect` value, shown in the
// profile panel. Falls back to the raw key if an unknown value is stored.
const SECT_LABELS: Record<string, string> = {
  hanafi: 'Hanafi',
  shafii: "Shafi'i",
  maliki: 'Maliki',
  hanbali: 'Hanbali',
  shia: 'Shia (Jafari)',
};

// Human-readable labels for the persisted `isa:language` value (Quran
// translation preference) shown in the profile panel.
const LANG_LABELS: Record<string, string> = {
  ur: 'Urdu',
  en: 'English',
  none: 'Arabic only',
};

// Sidebar navigation, grouped into sections ('Worship', 'Account'). Each item
// carries its route, label, icon, and an accent colour used when inactive.
const NAV = [
  { group: 'Worship',
    items: [
      { href: '/dashboard/prayer-times', label: 'Prayer Times',    icon: Clock,      color: 'text-emerald-600' },
      { href: '/dashboard/quran',        label: 'Holy Quran',      icon: BookOpen,   color: 'text-gold-600' },
      { href: '/dashboard/qibla',        label: 'Qibla Finder',    icon: Compass,    color: 'text-teal-600' },
      { href: '/dashboard/azan',         label: 'Azan Voices',     icon: Bell,       color: 'text-rose-500' },
      { href: '/dashboard/recitation',   label: 'Recitation Alarm', icon: AlarmClock, color: 'text-violet-600' },
    ],
  },
  { group: 'Account',
    items: [
      { href: '/dashboard',           label: 'Overview',  icon: Home,       color: 'text-emerald-700' },
      { href: '/dashboard/profile',   label: 'Profile',   icon: User,       color: 'text-indigo-500' },
      { href: '/dashboard/devices',   label: 'Devices',   icon: Smartphone, color: 'text-cyan-600' },
      { href: '/dashboard/audio',     label: 'Audio',     icon: Music2,     color: 'text-fuchsia-500' },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3,  color: 'text-amber-600' },
      { href: '/dashboard/settings',  label: 'Settings',  icon: Settings,   color: 'text-slate-500' },
    ],
  },
];

/**
 * Shared shell for every /dashboard route: responsive sidebar navigation
 * (off-canvas drawer on mobile, fixed rail from `lg` up), a mobile top bar with
 * quick-access icons, and the profile panel summarising the user's stored
 * preferences. Also mounts the always-on background workers — AutoAzanScheduler,
 * SurahScheduleRunner — and the OnboardingSetup modal used to edit preferences.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // Controls the OnboardingSetup modal when launched via the profile "edit" pencil.
  const [editPrefs, setEditPrefs] = useState(false);
  // Profile popup (opened from the sidebar "Profile" item) — replaces the page.
  const [profileOpen, setProfileOpen] = useState(false);
  // Off-canvas sidebar for mobile; always visible from `lg` up.
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const closeSidebar = () => setSidebarOpen(false);
  const { isDark, toggle } = useTheme();

  // Profile summary values, read from the same localStorage keys the
  // onboarding wizard writes — keeps the panel in sync with the user's setup.
  const [name]     = useLocalStorage<string>('isa:name',     '');
  const [city]     = useLocalStorage<string>('isa:city',     'Karachi');
  const [country]  = useLocalStorage<string>('isa:country',  'Pakistan');
  const [sect]     = useLocalStorage<string>('isa:sect',     'hanafi');
  const [language] = useLocalStorage<string>('isa:language', 'ur');

  return (
    <div className="min-h-screen lg:flex">
      {/* ── Mobile top bar: hamburger + brand + quick-access (hidden on lg+) ── */}
      {/* mobile top bar with menu button (hidden on lg+) */}
      <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-mosque-gradient text-parchment px-4 py-3 shadow-md">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
          className="p-1.5 rounded-lg hover:bg-white/15 transition"
        >
          <Menu size={22} />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex w-8 h-8 rounded-lg items-center justify-center bg-white/10 border border-white/15">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gold-300">
              <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
              <path d="M19.5 7.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2.8-1.6z" fill="currentColor" />
            </svg>
          </span>
          <span className="font-display text-lg font-bold">Noor</span>
        </Link>

        {/* quick-access icons — Prayer Times, Quran, Qibla, Azan */}
        <div className="ml-auto flex items-center gap-0.5">
          {[
            { href: '/dashboard/prayer-times', icon: Clock,    label: 'Prayer Times' },
            { href: '/dashboard/quran',        icon: BookOpen, label: 'Holy Quran'   },
            { href: '/dashboard/qibla',        icon: Compass,  label: 'Qibla'        },
            { href: '/dashboard/azan',         icon: Bell,     label: 'Azan'         },
          ].map(({ href, icon: Icon, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-xl transition
                  ${active ? 'bg-white/20 text-white' : 'text-emerald-100/75 hover:bg-white/15 hover:text-white'}`}
              >
                <Icon size={18} />
                <span className="text-[9px] font-semibold tracking-wide leading-none">{label}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Dimming backdrop behind the drawer (mobile only); tap to dismiss */}
      {/* backdrop (mobile only, when drawer open) */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          aria-hidden
          className="fixed inset-0 z-40 bg-midnight-900/60 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ── Sidebar: off-canvas drawer on mobile, fixed rail from lg up ── */}
      <aside
        className={`fixed lg:sticky inset-y-0 lg:inset-y-auto lg:top-0 lg:h-screen left-0 z-50 w-72 shrink-0 bg-mosque-gradient text-parchment p-4 flex flex-col gap-2 overflow-hidden transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Decorative geometric pattern + emerald glow (non-interactive) */}
        <div className="absolute inset-0 pattern-bg opacity-25 pointer-events-none" />
        <div className="absolute -top-32 -left-24 w-72 h-72 rounded-full bg-glow-emerald pointer-events-none" />

        {/* close button (mobile only) */}
        <button
          onClick={closeSidebar}
          aria-label="Close menu"
          className="lg:hidden absolute top-4 right-4 z-10 p-1.5 rounded-lg hover:bg-white/15 text-emerald-100/80 transition"
        >
          <X size={20} />
        </button>

        {/* logo */}
        <Link href="/" onClick={closeSidebar} className="relative flex items-center gap-2 mb-1 px-2">
          <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center bg-white/10 backdrop-blur border border-white/15">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gold-300">
              <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
              <path d="M19.5 7.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2.8-1.6z" fill="currentColor" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-bold">Noor</p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-100/70">Smart Assistant</p>
          </div>
        </Link>

        {/* navigation */}
        <nav className="relative flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-0.5 text-[10px] uppercase tracking-[0.18em] text-emerald-100/60 font-semibold">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((n) => {
                  // Exact-match highlight for the current route.
                  const active = pathname === n.href;
                  const cls = `group relative flex w-full items-center gap-3 px-3 py-1.5 rounded-xl text-sm text-left transition ${
                    active
                      ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/15'
                      : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
                  }`;
                  const inner = (
                    <>
                      {/* Shared layoutId lets framer-motion slide one gold pill
                          between items as the active route changes. */}
                      {active && (
                        <motion.span
                          layoutId="active-pill"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gold-400"
                        />
                      )}
                      <n.icon size={18} className={`${active ? 'text-gold-300' : n.color}`} />
                      <span className="font-medium">{n.label}</span>
                    </>
                  );
                  // Profile opens a popup instead of navigating to a separate page.
                  if (n.href === '/dashboard/profile') {
                    return (
                      <button key={n.href} onClick={() => { setProfileOpen(true); closeSidebar(); }} className={cls}>
                        {inner}
                      </button>
                    );
                  }
                  return (
                    <Link key={n.href} href={n.href} onClick={closeSidebar} className={cls}>
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Dark / Light mode toggle ── */}
        <button
          onClick={toggle}
          className="relative flex items-center justify-between w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition"
        >
          <span className="text-xs font-semibold text-emerald-100/70">
            {isDark ? 'Dark Mode' : 'Light Mode'}
          </span>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/10 text-gold-300">
            {isDark ? <Sun size={14} /> : <Moon size={14} />}
          </span>
        </button>

        {/* ── Profile panel: greeting + stored location / sect / language,
               with a pencil to reopen onboarding and edit them ── */}
        {/* profile panel */}
        <div className="relative rounded-2xl bg-white/10 backdrop-blur border border-white/10 p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            {/* Personalised greeting; falls back to a generic salam if no name set. */}
            <p className="text-xs font-semibold text-white/90 leading-snug">
              {name ? `As-salamu alaykum, ${name}` : 'As-salamu alaykum'}
            </p>
            <button
              onClick={() => setEditPrefs(true)}
              title="Edit preferences"
              className="shrink-0 p-1 rounded-lg hover:bg-white/15 text-emerald-100/60 hover:text-white transition"
            >
              <Pencil size={13} />
            </button>
          </div>

          <div className="space-y-1 text-[11px] text-emerald-100/70">
            <div className="flex items-center gap-1.5">
              <MapPin size={11} className="shrink-0 text-gold-300/80" />
              <span className="truncate">{city}, {country}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <GraduationCap size={11} className="shrink-0 text-gold-300/80" />
              <span>{SECT_LABELS[sect] ?? sect}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Globe size={11} className="shrink-0 text-gold-300/80" />
              <span>{LANG_LABELS[language] ?? language}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Routed page content ── */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 overflow-y-auto">{children}</main>

      {/* Always-on background workers, mounted once for the whole dashboard:
          fire the Azan / run scheduled Surahs regardless of the active route.
          OnboardingSetup is the shared preferences modal (opened via the pencil). */}
      <AutoAzanScheduler />
      <SurahScheduleRunner />
      <OnboardingSetup forceOpen={editPrefs} onClose={() => setEditPrefs(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </div>
  );
}
