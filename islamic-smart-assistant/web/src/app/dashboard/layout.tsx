'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home, Users, Smartphone, Music2, BarChart3, Settings,
  BookOpen, Bell, Clock, Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { AutoAzanScheduler } from '@/components/AutoAzanScheduler';

const NAV = [
  { group: 'Worship',
    items: [
      { href: '/dashboard/prayer-times', label: 'Prayer Times', icon: Clock, color: 'text-emerald-600' },
      { href: '/dashboard/quran',        label: 'Holy Quran',   icon: BookOpen, color: 'text-gold-600' },
      { href: '/dashboard/azan',         label: 'Azan Voices',  icon: Bell, color: 'text-rose-500' },
    ],
  },
  { group: 'Admin',
    items: [
      { href: '/dashboard',           label: 'Overview',  icon: Home,       color: 'text-emerald-700' },
      { href: '/dashboard/users',     label: 'Users',     icon: Users,      color: 'text-indigo-500' },
      { href: '/dashboard/devices',   label: 'Devices',   icon: Smartphone, color: 'text-cyan-600' },
      { href: '/dashboard/audio',     label: 'Audio',     icon: Music2,     color: 'text-fuchsia-500' },
      { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart3,  color: 'text-amber-600' },
      { href: '/dashboard/settings',  label: 'Settings',  icon: Settings,   color: 'text-slate-500' },
    ],
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex">
      <aside className="w-72 shrink-0 bg-mosque-gradient text-parchment p-5 flex flex-col gap-4 relative overflow-hidden">
        <div className="absolute inset-0 pattern-bg opacity-25 pointer-events-none" />
        <div className="absolute -top-32 -left-24 w-72 h-72 rounded-full bg-glow-emerald pointer-events-none" />

        <Link href="/" className="relative flex items-center gap-2 mb-2 px-2">
          <span className="inline-flex w-9 h-9 rounded-xl items-center justify-center bg-white/10 backdrop-blur border border-white/15">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gold-300">
              <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
              <path d="M19.5 7.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2.8-1.6z" fill="currentColor" />
            </svg>
          </span>
          <div className="leading-tight">
            <p className="font-display text-lg font-bold">Noor</p>
            <p className="text-[10px] uppercase tracking-widest text-emerald-100/70">Admin Console</p>
          </div>
        </Link>

        <nav className="relative flex-1 overflow-y-auto pr-1 space-y-5">
          {NAV.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-2 text-[10px] uppercase tracking-[0.18em] text-emerald-100/60 font-semibold">
                {group.group}
              </p>
              <div className="space-y-0.5">
                {group.items.map((n) => {
                  const active = pathname === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                        active
                          ? 'bg-white/15 text-white shadow-inner ring-1 ring-white/15'
                          : 'text-emerald-50/80 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="active-pill"
                          className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-gold-400"
                        />
                      )}
                      <n.icon size={18} className={`${active ? 'text-gold-300' : n.color}`} />
                      <span className="font-medium">{n.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="relative rounded-2xl bg-white/10 backdrop-blur p-4 border border-white/10 text-xs text-emerald-50/85">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={14} className="text-gold-300" />
            <span className="font-semibold">Tip</span>
          </div>
          Switch reciters and translation languages right inside the Quran page — your choice syncs to every device.
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
      <AutoAzanScheduler />
    </div>
  );
}
