'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home, User, Smartphone, Settings,
  BookOpen, Bell, Clock, Menu, X, AlarmClock, Compass,
  Moon, Sun, ChevronRight, RefreshCw, Library, SlidersHorizontal,
  Square, Radio,
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeContext';
import { motion } from 'framer-motion';
import { SidebarScene } from '@/components/SidebarScene';
import { AutoAzanScheduler } from '@/components/AutoAzanScheduler';
import { SurahScheduleRunner } from '@/components/SurahScheduleRunner';
import { OnboardingSetup } from '@/components/OnboardingSetup';
import { ProfileModal } from '@/components/ProfileModal';
import { PremiumModal } from '@/components/PremiumModal';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { QuickSettingsPopup, AzanOffTag, type QuickSection } from '@/components/QuickSettings';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Sidebar navigation, grouped into sections ('Worship', 'Account'). Each item
// carries its route, label, icon, and an accent colour used when inactive.
const NAV = [
  { group: 'Worship',
    items: [
      { href: '/dashboard',              label: 'Overview',        icon: Home,       color: 'text-emerald-700' },
      { href: '/dashboard/prayer-times', label: 'Prayer Times',    icon: Clock,      color: 'text-emerald-600' },
      { href: '/dashboard/quran',        label: 'Holy Quran',      icon: BookOpen,   color: 'text-gold-600' },
      { href: '/dashboard/qibla',        label: 'Qibla Finder',    icon: Compass,    color: 'text-teal-600' },
      { href: '/dashboard/azan',         label: 'Azan Voices',     icon: Bell,       color: 'text-rose-500' },
      { href: '/dashboard/recitation',   label: 'Schedule Recitation', icon: AlarmClock, color: 'text-violet-600' },
      { href: '/dashboard/advanced',     label: 'Islamic Library',  icon: Library,    color: 'text-amber-600' },
    ],
  },
  { group: 'Account',
    items: [
      { href: '/dashboard/profile',   label: 'Profile',   icon: User,       color: 'text-indigo-500' },
      { href: '/dashboard/devices',   label: 'Devices',   icon: Smartphone, color: 'text-cyan-600' },
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
  // Profile popup (opened from the sidebar "Profile" nav item).
  const [profileOpen, setProfileOpen] = useState(false);
  // Premium popup (opened from the sidebar bottom profile card).
  const [premiumOpen, setPremiumOpen] = useState(false);
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

  // Catch unhandled promise rejections so they show a console warning rather than
  // crashing the Electron renderer process.
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      e.preventDefault();
      console.error('[UnhandledRejection]', e.reason);
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  // Theme-specific class fragments for the sidebar surfaces. Written as full
  // literal strings so Tailwind's JIT picks them up. Dark mode keeps the
  // original parchment-on-green look; light mode flips to ink-on-cream.
  const t = isDark
    ? {
        text:        'text-parchment',
        groupLabel:  'text-emerald-100/55',
        groupLabelBg: '',
        itemBase:    'text-emerald-50/80 hover:bg-white/[0.11] hover:text-white hover:shadow-[0_4px_20px_rgba(0,0,0,0.45)] hover:ring-1 hover:ring-white/[0.13] hover:backdrop-blur-sm',
        itemActive:  'bg-gradient-to-r from-emerald-500/35 to-emerald-700/15 text-white ring-1 ring-emerald-400/35 shadow-[0_6px_30px_rgba(0,0,0,0.55),0_0_18px_rgba(52,211,153,0.18),inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-sm',
        brandSub:    'text-emerald-100/70',
        logoBox:     'bg-emerald-500/15 border-emerald-300/20',
        profile:     'bg-white/[0.07] border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
        profileName: 'text-white',
        premium:     'text-emerald-300',
        chevron:     'text-emerald-100/50',
        goldAccent:  'text-gold-300/80',
        activePill:  'bg-gold-400 shadow-[0_0_10px_rgba(233,207,122,0.75)]',
        activeIcon:  'text-gold-300',
        closeBtn:    'text-emerald-100/80 hover:bg-white/15',
        avatarRing:  'ring-emerald-300/30',
        circleBtn:   'border-white/10 bg-white/[0.06] text-emerald-100/80 hover:bg-white/15 hover:shadow-[0_2px_12px_rgba(0,0,0,0.3)]',
        circleGlow:  'border-emerald-400/30 bg-emerald-500/10 text-gold-300 shadow-glow-emerald',
        divider:     'border-white/10',
        sidebarBorder: '',
      }
    : {
        text:        'text-emerald-950',
        groupLabel:  'text-emerald-900',
        groupLabelBg: 'bg-emerald-800/[0.10] border border-emerald-700/20 rounded-xl -mx-1 px-4 backdrop-blur-sm',
        itemBase:    'text-emerald-950 hover:bg-white/80 hover:text-emerald-950 hover:shadow-[0_4px_18px_rgba(16,185,129,0.20)] hover:ring-1 hover:ring-emerald-300/70 hover:backdrop-blur-sm',
        itemActive:  'bg-gradient-to-r from-white/95 to-emerald-50/85 text-emerald-950 ring-1 ring-emerald-500/25 shadow-[0_6px_26px_rgba(16,185,129,0.24),0_0_14px_rgba(16,185,129,0.12),inset_0_1px_0_rgba(255,255,255,1)] backdrop-blur-sm',
        brandSub:    'text-emerald-800/70',
        logoBox:     'bg-emerald-600/10 border-emerald-700/20',
        profile:     'bg-white/80 border-emerald-700/12 shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.04)]',
        profileName: 'text-emerald-950',
        premium:     'text-emerald-700',
        chevron:     'text-emerald-800/40',
        goldAccent:  'text-gold-600',
        activePill:  'bg-gold-500 shadow-[0_0_10px_rgba(201,162,39,0.60)]',
        activeIcon:  'text-emerald-700',
        closeBtn:    'text-emerald-800/70 hover:bg-emerald-900/10',
        avatarRing:  'ring-emerald-600/20',
        circleBtn:   'border-emerald-700/15 bg-white/70 text-emerald-800/80 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
        circleGlow:  'border-gold-400/40 bg-gold-50 text-gold-600 shadow-[0_0_16px_rgba(221,185,75,0.35)]',
        divider:     'border-emerald-900/10',
        sidebarBorder: '',
      };

  // Personalised greeting, read from the key the onboarding wizard writes.
  const [name] = useLocalStorage<string>('isa:name', '');

  // Quick settings popup state.
  const [quickOpen,  setQuickOpen]  = useState(false);
  const [quickFocus, setQuickFocus] = useState<QuickSection | undefined>();
  const openQuick = (section?: QuickSection) => { setQuickFocus(section); setQuickOpen(true); };

  // Mini Azan indicator: shown in sidebar when the big popup is minimized.
  const [azanMini, setAzanMini] = useState<{ prayer: string } | null>(null);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setAzanMini(detail ? { prayer: detail.prayer } : null);
    };
    window.addEventListener('isa:azan-minimized', handler);
    return () => window.removeEventListener('isa:azan-minimized', handler);
  }, []);

  return (
    <div className="min-h-screen lg:h-[calc(100vh/0.85)] lg:overflow-hidden lg:flex dashboard-zoom">
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
        className={`fixed lg:relative inset-y-0 lg:h-full left-0 z-50 w-72 shrink-0 ${t.text} ${t.sidebarBorder} p-4 flex flex-col gap-2 overflow-hidden transition-transform duration-300 ease-out lg:translate-x-0 ${!isDark ? 'backdrop-blur-md' : ''} ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={isDark
          ? { boxShadow: '8px 0 64px rgba(0,0,0,0.90), 4px 0 24px rgba(0,0,0,0.70), 0 0 0 1px rgba(52,211,153,0.05)' }
          : { boxShadow: '8px 0 48px rgba(0,0,0,0.22), 4px 0 18px rgba(0,0,0,0.14), 0 0 0 1px rgba(16,185,129,0.07), 6px 0 30px rgba(16,185,129,0.06)' }}
      >
        {/* Animated, theme-aware backdrop: gradient, drifting shades, arabesque,
            stars/birds and the mosque skyline (non-interactive, sits at z-0). */}
        <SidebarScene isDark={isDark} />

        {/* animated right-edge glow — visually separates the sidebar from the page */}
        <motion.div
          aria-hidden
          className="absolute right-0 top-0 bottom-0 w-[3px] pointer-events-none z-20"
          animate={{ opacity: isDark ? [0.45, 1, 0.45] : [0.35, 0.85, 0.35] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            background: isDark
              ? 'linear-gradient(to bottom, transparent 0%, rgba(52,211,153,0.7) 20%, rgba(52,211,153,0.90) 50%, rgba(233,207,122,0.65) 78%, transparent 100%)'
              : 'linear-gradient(to bottom, transparent 0%, rgba(16,185,129,0.55) 20%, rgba(16,185,129,0.70) 50%, rgba(201,162,39,0.50) 78%, transparent 100%)',
            boxShadow: isDark
              ? '0 0 16px rgba(52,211,153,0.55), 0 0 36px rgba(52,211,153,0.22)'
              : '0 0 14px rgba(16,185,129,0.45), 0 0 28px rgba(16,185,129,0.18)',
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
            <p className={`${isDark ? 'text-[10px]' : 'text-[11px] font-bold'} uppercase tracking-widest ${t.brandSub}`}>Smart Assistant</p>
          </div>
        </Link>

        {/* navigation */}
        <nav className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1 space-y-2">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className={`mb-2 mt-1 text-center uppercase tracking-[0.22em] font-extrabold ${isDark ? 'px-3 py-0.5 text-[11px]' : 'py-2.5 text-[12px]'} ${t.groupLabel} ${t.groupLabelBg}`}>
                {group.group}
              </p>
              <div className="space-y-1">
                {group.items.map((n) => {
                  // Exact-match highlight for the current route.
                  const active = pathname === n.href;
                  const cls = `group relative flex w-full items-center gap-3 pl-4 pr-3 ${isDark ? 'py-2.5' : 'py-3'} rounded-2xl ${isDark ? 'text-[15px]' : 'text-[16px]'} text-left transition-all duration-200 ${
                    active ? t.itemActive : t.itemBase
                  }`;
                  const inner = (
                    <>
                      {/* Shared layoutId lets framer-motion slide one gold pill
                          between items as the active route changes. */}
                      {active && (
                        <motion.span
                          layoutId="active-pill"
                          className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-full ${t.activePill}`}
                        />
                      )}
                      <n.icon size={isDark ? 18 : 20} className={`shrink-0 ${active ? t.activeIcon : n.color}`} />
                      <span className="font-semibold tracking-[0.01em]">{n.label}</span>
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

        {/* ── Profile card: avatar · greeting + plan · chevron (opens premium) ── */}
        <button
          onClick={() => { setPremiumOpen(true); closeSidebar(); }}
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

        {/* Azan-off blinking tag — appears between profile card and quick-actions */}
        <div className="relative z-10 mt-1 px-2">
          <AzanOffTag onClick={() => openQuick('azan')} className="w-full justify-center" />
        </div>

        {/* ── Mini Azan indicator — appears when big popup is dismissed ── */}
        {azanMini && (
          <div className="relative z-10 mt-1 px-1">
            <div
              className="flex items-center gap-2 rounded-2xl px-3 py-2 backdrop-blur-sm"
              style={isDark
                ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }
                : { background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(16,185,129,0.35)', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}
            >
              <motion.div
                animate={{ scale: [1, 1.18, 1], opacity: [0.75, 1, 0.75] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
                className="shrink-0"
              >
                <Radio size={13} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-widest leading-none ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>Azan Playing</p>
                <p className={`text-xs font-bold truncate leading-snug mt-0.5 ${isDark ? 'text-parchment/80' : 'text-emerald-950'}`}>
                  {azanMini.prayer} Prayer
                </p>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('isa:azan-expand'))}
                title="Show full popup"
                className={`shrink-0 p-1 rounded-full transition ${isDark ? 'hover:bg-emerald-500/20 text-emerald-400' : 'hover:bg-emerald-100 text-emerald-700'}`}
              >
                <Bell size={13} />
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('isa:azan-stop'))}
                title="Stop Azan"
                className={`shrink-0 p-1 rounded-full transition ${isDark ? 'hover:bg-rose-500/15 text-rose-400' : 'hover:bg-rose-50 text-rose-500'}`}
              >
                <Square size={12} fill="currentColor" />
              </button>
            </div>
          </div>
        )}

        {/* ── Quick actions: notifications · theme toggle · sync · settings ── */}
        <div className={`relative z-10 mt-1 flex items-center justify-around border-t pt-3 ${t.divider}`}>
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

          {/* Quick settings — opens the flat settings popup. */}
          <button
            onClick={() => openQuick()}
            aria-label="Quick settings"
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition ${t.circleBtn}`}
          >
            <SlidersHorizontal size={18} />
          </button>
        </div>
      </aside>

      {/* Mobile-only: floating azan-off tag visible when the sidebar drawer is closed */}
      <div className="lg:hidden fixed bottom-24 right-4 z-[140] pointer-events-none">
        <div className="pointer-events-auto">
          <AzanOffTag onClick={() => openQuick('azan')} />
        </div>
      </div>

      {/* ── Routed page content ── */}
      <main className="flex-1 min-w-0 p-5 sm:p-8 overflow-y-auto">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      {/* Always-on background workers, mounted once for the whole dashboard:
          fire the Azan / run scheduled Surahs regardless of the active route.
          OnboardingSetup is the shared preferences modal (opened via the pencil). */}
      <AutoAzanScheduler />
      <SurahScheduleRunner />
      <OnboardingSetup forceOpen={editPrefs} onClose={() => setEditPrefs(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
      <QuickSettingsPopup
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        focusSection={quickFocus}
      />
    </div>
  );
}
