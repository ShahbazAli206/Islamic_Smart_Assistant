'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight, BookOpen, Compass, Radio, Smartphone, Globe2, Sparkles, Headphones,
  ShieldCheck, Languages, Bell, CalendarClock,
} from 'lucide-react';
import { PrayerCountdownHero } from '@/components/PrayerCountdown';
import { useStoredLocation } from '@/lib/useStoredLocation';

const FEATURES = [
  { icon: Bell,         title: 'Auto Azan',         desc: 'Triggers Makkah, Madinah, Pakistani, Turkish & Egyptian Azan on every linked device — in sync.', color: 'from-emerald-500 to-emerald-700' },
  { icon: BookOpen,     title: 'Full Quran',        desc: 'All 114 Surahs by Abdul Basit, Sudais, Alafasy & more — with Urdu and English translation.', color: 'from-gold-400 to-gold-600' },
  { icon: Compass,      title: 'Qibla & Times',     desc: 'Pinpoint Qibla direction. Live prayer times by city, fiqh and DST-aware.', color: 'from-cyan-500 to-emerald-600' },
  { icon: Radio,        title: 'PTV-style Tilawat', desc: 'Arabic recitation followed by Urdu translation, ayah by ayah — like classic PTV broadcasts.', color: 'from-rose-500 to-amber-500' },
  { icon: Smartphone,   title: 'Multi-device sync', desc: 'Phones, tablets, desktops, Alexa & Google Home. Group as Home, Office, Mosque.', color: 'from-indigo-500 to-violet-600' },
  { icon: CalendarClock, title: 'Smart Scheduler',  desc: 'Yaseen after Fajr, Waqiah after Maghrib, Mulk before sleep — set it once.', color: 'from-emerald-600 to-teal-500' },
  { icon: Languages,    title: '10+ Languages',     desc: 'UI in English, اردو, العربية, Türkçe, 中文, 日本語, हिन्दी, বাংলা, and more.', color: 'from-fuchsia-500 to-pink-500' },
  { icon: ShieldCheck,  title: 'Privacy first',     desc: 'No tracking. Your location stays on-device; only your settings sync across login.', color: 'from-slate-500 to-emerald-700' },
];

export default function HomePage() {
  const loc = useStoredLocation();
  return (
    <main className="relative">
      {/* nav */}
      <header className="relative z-10">
        <nav className="max-w-7xl mx-auto flex items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-2">
            <NoorMark />
            <span className="text-xl font-display font-bold tracking-tight">Noor</span>
            <span className="chip-gold ml-2 hidden sm:inline-flex"><Sparkles size={12}/> Islamic Smart Assistant</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/quran" className="hidden sm:inline text-sm font-semibold text-emerald-800 hover:text-emerald-900">Quran</Link>
            <Link href="/dashboard/azan"  className="hidden sm:inline text-sm font-semibold text-emerald-800 hover:text-emerald-900">Azan</Link>
            <Link href="/dashboard/prayer-times" className="hidden sm:inline text-sm font-semibold text-emerald-800 hover:text-emerald-900">Prayer Times</Link>
            <Link href="/dashboard" className="btn-primary text-sm py-2 px-4">Open Dashboard <ArrowRight size={16}/></Link>
          </div>
        </nav>
      </header>

      {/* hero */}
      <section className="relative max-w-7xl mx-auto px-6 pt-6 pb-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <span className="chip"><Sparkles size={12}/> New • Powered by AI</span>
            <h1 className="h-display text-5xl md:text-6xl font-bold leading-[1.05]">
              Your home,<br/>
              your masjid,<br/>
              <span className="bg-clip-text text-transparent bg-gold-gradient">your assistant.</span>
            </h1>
            <p className="text-lg text-ink/70 max-w-xl">
              Noor brings the Azan, the Quran, and your prayer routine into one beautifully crafted
              experience — synced across every screen and speaker in your life.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="btn-primary">
                <Headphones size={18}/> Launch the Dashboard <ArrowRight size={18}/>
              </Link>
              <Link href="/dashboard/quran" className="btn-ghost">
                <BookOpen size={18}/> Open the Quran
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-2 text-sm text-ink/60">
              <span className="flex items-center gap-2"><Globe2 size={14}/> 200+ countries</span>
              <span className="flex items-center gap-2"><Smartphone size={14}/> iOS, Android, Web, Desktop</span>
              <span className="flex items-center gap-2"><ShieldCheck size={14}/> Verified recitations</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
          >
            <PrayerCountdownHero
              lat={loc.lat ?? undefined}
              lng={loc.lng ?? undefined}
              city={loc.city}
              country={loc.country}
              method={loc.method}
              label={loc.hasCoords ? loc.label : undefined}
            />
          </motion.div>
        </div>
      </section>

      {/* feature grid */}
      <section className="relative max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <span className="chip-gold"><Sparkles size={12}/> Everything in one place</span>
          <h2 className="h-display text-4xl md:text-5xl font-bold mt-4">A complete Islamic lifestyle, beautifully orchestrated</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ delay: i * 0.04, duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="group card card-pad relative overflow-hidden"
            >
              <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.color} opacity-20 group-hover:opacity-40 transition`} />
              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-white bg-gradient-to-br ${f.color} shadow-lg`}>
                <f.icon size={22} />
              </div>
              <h3 className="mt-4 text-lg font-bold">{f.title}</h3>
              <p className="mt-1 text-sm text-ink/70 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* footer */}
      <footer className="relative border-t border-emerald-900/10">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink/60">
          <div className="flex items-center gap-2"><NoorMark size={20}/> <span className="font-semibold text-ink">Noor</span> • Islamic Smart Assistant Ecosystem</div>
          <p>Built with ihsaan • Recitations sourced from islamic.network (verified)</p>
        </div>
      </footer>
    </main>
  );
}

function NoorMark({ size = 28 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl bg-mosque-gradient shadow-glow-emerald"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" width={size * 0.65} height={size * 0.65} fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gold-300">
        {/* crescent + star */}
        <path d="M16 4a8 8 0 1 0 4.5 14.5A8 8 0 1 1 16 4z" />
        <path d="M19.5 7.5l.8 1.6 1.7.2-1.3 1.2.3 1.7-1.5-.8-1.5.8.3-1.7-1.3-1.2 1.7-.2.8-1.6z" fill="currentColor" />
      </svg>
    </span>
  );
}
