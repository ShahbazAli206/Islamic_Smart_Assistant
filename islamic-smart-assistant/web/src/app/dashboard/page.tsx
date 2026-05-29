'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Smartphone, Bell, BookOpen, TrendingUp, Sparkles, ArrowUpRight,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { Admin } from '@/lib/api';
import { PrayerCountdownHero } from '@/components/PrayerCountdown';
import Link from 'next/link';

const sample = Array.from({ length: 14 }, (_, i) => ({
  day: `D${i + 1}`,
  azan:  Math.round(800 + Math.random() * 400),
  quran: Math.round(220 + Math.random() * 220),
}));

export default function Overview() {
  const { data } = useQuery({ queryKey: ['analytics'], queryFn: Admin.analytics });
  const stats = data ?? { users: 0, devicesOnline: 0, azanFiredToday: 0, quranFiredToday: 0 };

  const cards = [
    { label: 'Total users',     value: stats.users,           icon: Users,      grad: 'from-emerald-500 to-emerald-700', delta: '+12.4%' },
    { label: 'Devices online',  value: stats.devicesOnline,   icon: Smartphone, grad: 'from-cyan-500 to-emerald-600',    delta: '+3.2%'  },
    { label: 'Azan fired (24h)', value: stats.azanFiredToday, icon: Bell,       grad: 'from-rose-500 to-amber-500',      delta: '+5.8%'  },
    { label: 'Quran played (24h)', value: stats.quranFiredToday, icon: BookOpen, grad: 'from-gold-400 to-gold-600',      delta: '+9.1%'  },
  ];

  return (
    <div className="space-y-8">
      {/* greeting */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="chip-gold mb-2"><Sparkles size={12}/> Today</p>
          <h1 className="h-display text-4xl font-bold">As-salāmu ʿalaykum 👋</h1>
          <p className="text-ink/60 mt-1">Here's a snapshot of your ecosystem.</p>
        </div>
        <Link href="/dashboard/quran" className="btn-primary text-sm py-2 px-4">
          <BookOpen size={16}/> Open the Quran <ArrowUpRight size={16}/>
        </Link>
      </motion.div>

      {/* hero countdown */}
      <PrayerCountdownHero />

      {/* stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, i) => (
          <motion.div
            key={c.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="card card-pad relative overflow-hidden"
          >
            <div className={`absolute -right-8 -top-8 w-24 h-24 rounded-full bg-gradient-to-br ${c.grad} opacity-20`} />
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl text-white bg-gradient-to-br ${c.grad} shadow-md`}>
              <c.icon size={20} />
            </div>
            <p className="text-sm text-ink/60 mt-4">{c.label}</p>
            <div className="flex items-baseline justify-between mt-1">
              <p className="text-3xl font-bold tabular-nums">{c.value.toLocaleString()}</p>
              <span className="text-xs font-semibold text-emerald-700 inline-flex items-center gap-1">
                <TrendingUp size={12}/> {c.delta}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* charts */}
      <div className="grid lg:grid-cols-3 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="card card-pad lg:col-span-2 h-80"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-bold">Engagement (14d)</h3>
              <p className="text-xs text-ink/55">Azan triggers vs. Quran sessions</p>
            </div>
            <span className="chip">Live</span>
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <AreaChart data={sample}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C9A227" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e5e7eb" vertical={false} />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e5e7eb' }} />
              <Area type="monotone" dataKey="azan"  stroke="#059669" fill="url(#g1)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="quran" stroke="#A6831A" fill="url(#g2)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="card card-pad h-80"
        >
          <h3 className="font-bold mb-3">Top reciters this week</h3>
          <ul className="space-y-3">
            {[
              { name: 'Abdul Basit', plays: 1284, color: 'bg-emerald-500' },
              { name: 'Abdurrahman Sudais', plays: 982,  color: 'bg-gold-500' },
              { name: 'Mishary Alafasy', plays: 754,    color: 'bg-cyan-500' },
              { name: 'Khalil Al-Husary', plays: 412,   color: 'bg-rose-500' },
              { name: 'Muhammad Ayyoub', plays: 287,    color: 'bg-indigo-500' },
            ].map((r) => (
              <li key={r.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-ink/60 tabular-nums">{r.plays.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-ink/5 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }} animate={{ width: `${Math.min(100, r.plays / 14)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full ${r.color}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </div>
  );
}
