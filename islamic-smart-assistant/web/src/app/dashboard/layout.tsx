'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, User, Smartphone, Music2, Settings,
  BookOpen, Bell, Clock, Menu, X, AlarmClock, Compass,
  Moon, Sun, ChevronRight, RefreshCw, Library,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { motion } from 'framer-motion';
import { SidebarScene } from '@/components/SidebarScene';
import { AutoAzanScheduler } from '@/components/AutoAzanScheduler';
import { SurahScheduleRunner } from '@/components/SurahScheduleRunner';
import { OnboardingSetup } from '@/components/OnboardingSetup';
import { ProfileModal } from '@/components/ProfileModal';
import { useLocalStorage } from '@/lib/useLocalStorage';

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
      { href: '/dashboard/advanced',     label: 'Islamic Library',  icon: Library,    color: 'text-amber-600' },
    ],
  },
  { group: 'Account',
    items: [
      { href: '/dashboard',           label: 'Overview',  icon: Home,       color: 'text-emerald-700' },
      { href: '/dashboard/profile',   label: 'Profile',   icon: User,       color: 'text-indigo-500' },
      { href: '/dashboard/devices',   label: 'Devices',   icon: Smartphone, color: 'text-cyan-600' },
      { href: '/dashboard/audio',     label: 'Audio',     icon: Music2,     color: 'text-fuchsia-500' },
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
  const router = useRouter();

  // Bottom action-row state: the bell's unread dot and the sync button's spin.
  const [hasNotif, setHasNotif] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const handleSync = () => {
    setSyncing(true);
    router.refresh();
    setTimeout(() => setSyncing(false), 900);
  };

  // The Overview page's header avatar / "Edit Preferences" controls live in a
  // separate route component, so they signal these shared modals via window events.
  useEffect(() => {
    const openPrefs = () => setEditPrefs(true);
    const openProfile = () => setProfileOpen(true);
    window.addEventListener('isa:edit-prefs', openPrefs);
    window.addEventListener('isa:open-profile', openProfile);
    return () => {
      window.removeEventListener('isa:edit-prefs', openPrefs);
      window.removeEventListener('isa:open-profile', openProfile);
    };
  }, []);

  // Theme-specific class fragments for the sidebar surfaces. Written as full
  // literal strings so Tailwind's JIT picks them up. Dark mode keeps the
  // original parchment-on-green look; light mode flips to ink-on-cream.
  const t = isDark
    ? {
        text:        'text-parchment',
        groupLabel:  'text-emerald-100/55',
        itemBase:    'text-emerald-50/80 hover:bg-white/[0.09] hover:text-white hover:shadow-[0_2px_12px_rgba(0,0,0,0.35)] hover:ring-1 hover:ring-white/[0.08]',
        itemActive:  'bg-gradient-to-r from-emerald-600/40 to-emerald-700/20 text-white ring-1 ring-emerald-400/25 shadow-[0_4px_20px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.07)]',
        brandSub:    'text-emerald-100/70',
        logoBox:     'bg-emerald-500/15 border-emerald-300/20',
        profile:     'bg-white/[0.07] border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
        profileName: 'text-white',
        premium:     'text-emerald-300',
        chevron:     'text-emerald-100/50',
        goldAccent:  'text-gold-300/80',
        activePill:  'bg-gold-400',
        activeIcon:  'text-gold-300',
        closeBtn:    'text-emerald-100/80 hover:bg-white/15',
        avatarRing:  'ring-emerald-300/30',
        circleBtn:   'border-white/10 bg-white/[0.06] text-emerald-100/80 hover:bg-white/15 hover:shadow-[0_2px_12px_rgba(0,0,0,0.3)]',
        circleGlow:  'border-emerald-400/30 bg-emerald-500/10 text-gold-300 shadow-glow-emerald',
        divider:     'border-white/10',
        sidebarBorder: 'border-r border-emerald-300/[0.08]',
      }
    : {
        text:        'text-emerald-950',
        groupLabel:  'text-emerald-800/55',
        itemBase:    'text-emerald-900/75 hover:bg-emerald-50 hover:text-emerald-950 hover:shadow-[0_2px_10px_rgba(16,185,129,0.12)] hover:ring-1 hover:ring-emerald-200/60',
        itemActive:  'bg-gradient-to-r from-emerald-100 to-emerald-50/80 text-emerald-900 ring-1 ring-emerald-500/20 shadow-[0_4px_16px_rgba(16,185,129,0.18),inset_0_1px_0_rgba(255,255,255,0.9)]',
        brandSub:    'text-emerald-800/60',
        logoBox:     'bg-emerald-600/10 border-emerald-700/20',
        profile:     'bg-white/80 border-emerald-700/12 shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]',
        profileName: 'text-emerald-950',
        premium:     'text-emerald-700',
        chevron:     'text-emerald-800/40',
        goldAccent:  'text-gold-600',
        activePill:  'bg-gold-500',
        activeIcon:  'text-emerald-700',
        closeBtn:    'text-emerald-800/70 hover:bg-emerald-900/10',
        avatarRing:  'ring-emerald-600/20',
        circleBtn:   'border-emerald-700/15 bg-white/70 text-emerald-800/80 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
        circleGlow:  'border-gold-400/40 bg-gold-50 text-gold-600 shadow-[0_0_16px_rgba(221,185,75,0.35)]',
        divider:     'border-emerald-900/10',
        sidebarBorder: 'border-r border-emerald-900/[0.07]',
      };

  // Personalised greeting, read from the key the onboarding wizard writes.
  const [name] = useLocalStorage<string>('isa:name', '');

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
        className={`fixed lg:sticky inset-y-0 lg:inset-y-auto lg:top-0 lg:h-screen left-0 z-50 w-72 shrink-0 ${t.text} ${t.sidebarBorder} p-4 flex flex-col gap-2 overflow-hidden transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={isDark
          ? { boxShadow: '6px 0 48px rgba(0,0,0,0.75), 2px 0 12px rgba(0,0,0,0.55)' }
          : { boxShadow: '6px 0 40px rgba(0,0,0,0.10), 2px 0 8px rgba(0,0,0,0.06)' }}
      >
        {/* Animated, theme-aware backdrop: gradient, drifting shades, arabesque,
            stars/birds and the mosque skyline (non-interactive, sits at z-0). */}
        <SidebarScene isDark={isDark} />

        {/* animated right-edge glow — visually separates the sidebar from the page */}
        <motion.div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-[2px] pointer-events-none z-20"
          animate={{ opacity: isDark ? [0.35, 0.85, 0.35] : [0.2, 0.55, 0.2] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: isDark
              ? 'linear-gradient(to bottom, transparent 0%, rgba(52,211,153,0.6) 25%, rgba(52,211,153,0.75) 55%, rgba(233,207,122,0.5) 80%, transparent 100%)'
              : 'linear-gradient(to bottom, transparent 0%, rgba(16,185,129,0.35) 25%, rgba(16,185,129,0.45) 55%, rgba(201,162,39,0.3) 80%, transparent 100%)',
            boxShadow: isDark
              ? '0 0 12px rgba(52,211,153,0.4), 0 0 24px rgba(52,211,153,0.15)'
              : '0 0 8px rgba(16,185,129,0.25)',
          }}
        />

        {/* close button (mobile only) */}
        <button
          onClick={closeSidebar}
          aria-label="Close menu"
          className={`lg:hidden absolute top-4 right-4 z-10 p-1.5 rounded-lg transition ${t.closeBtn}`}
        >
          <X size={20} />
        </button>

        {/* logo */}
        <Link href="/" onClick={closeSidebar} className="relative z-10 flex items-center gap-2 mb-1 px-2">
          <span className={`inline-flex w-9 h-9 rounded-xl items-center justify-center backdrop-blur border ${t.logoBox}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" className={t.goldAccent}>
              <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
              <path d="M19.5 7.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2.8-1.6z" fill="currentColor" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-bold">Noor</p>
            <p className={`text-[10px] uppercase tracking-widest ${t.brandSub}`}>Smart Assistant</p>
          </div>
        </Link>

        {/* navigation */}
        <nav className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className={`px-3 mb-0.5 text-[10px] uppercase tracking-[0.18em] font-semibold ${t.groupLabel}`}>
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((n) => {
                  // Exact-match highlight for the current route.
                  const active = pathname === n.href;
                  const cls = `group relative flex w-full items-center gap-3 pl-4 pr-3 py-2 rounded-2xl text-sm text-left transition ${
                    active ? t.itemActive : t.itemBase
                  }`;
                  const inner = (
                    <>
                      {/* Shared layoutId lets framer-motion slide one gold pill
                          between items as the active route changes. */}
                      {active && (
                        <motion.span
                          layoutId="active-pill"
                          className={`absolute left-0 top-2 bottom-2 w-1 rounded-full ${t.activePill}`}
                        />
                      )}
                      <n.icon size={18} className={`${active ? t.activeIcon : n.color}`} />
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

        {/* ── Profile card: avatar · greeting + plan · chevron (opens profile) ── */}
        <button
          onClick={() => { setProfileOpen(true); closeSidebar(); }}
          className={`relative z-10 mt-1 flex w-full items-center gap-3 rounded-2xl border backdrop-blur px-3 py-2.5 text-left transition hover:brightness-105 ${t.profile}`}
        >
          {/* Avatar — initials from the stored name, else a person icon. */}
          <span className={`shrink-0 inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-emerald-400 to-emerald-700 text-white font-semibold ring-2 ${t.avatarRing}`}>
            {name ? name.trim().charAt(0).toUpperCase() : <User size={18} />}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate text-sm font-bold leading-tight ${t.profileName}`}>
              {name ? `As-salamu alaykum, ${name}` : 'As-salamu alaykum'}
            </span>
            <span className={`block text-xs font-semibold ${t.premium}`}>Premium User</span>
          </span>
          <ChevronRight size={18} className={`shrink-0 ${t.chevron}`} />
        </button>

        {/* ── Quick actions: notifications · theme toggle · sync ── */}
        <div className={`relative z-10 mt-1 flex items-center justify-around border-t pt-3 ${t.divider}`}>
          {/* Notifications — clears its unread dot on click. */}
          <button
            onClick={() => setHasNotif(false)}
            aria-label="Notifications"
            className={`relative inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${t.circleBtn}`}
          >
            <Bell size={18} />
            {hasNotif && (
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-orange-400" />
            )}
          </button>

          {/* Theme toggle — the accented, glowing button. */}
          <button
            onClick={toggle}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${t.circleGlow}`}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Sync — re-fetches the dashboard data, spins while refreshing. */}
          <button
            onClick={handleSync}
            aria-label="Sync"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${t.circleBtn}`}
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
          </button>
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
