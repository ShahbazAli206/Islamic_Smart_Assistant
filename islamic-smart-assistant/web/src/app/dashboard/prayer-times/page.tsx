'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, MapPin, RotateCw } from 'lucide-react';
import { PrayerCountdownHero } from '@/components/PrayerCountdown';
import { useLocalStorage } from '@/lib/useLocalStorage';
import type { MethodId } from '@/lib/prayer';

const POPULAR = [
  { city: 'Karachi',      country: 'Pakistan' },
  { city: 'Lahore',       country: 'Pakistan' },
  { city: 'Islamabad',    country: 'Pakistan' },
  { city: 'Makkah',       country: 'Saudi Arabia' },
  { city: 'Madinah',      country: 'Saudi Arabia' },
  { city: 'Istanbul',     country: 'Türkiye' },
  { city: 'Cairo',        country: 'Egypt' },
  { city: 'Dubai',        country: 'UAE' },
  { city: 'London',       country: 'UK' },
  { city: 'New York',     country: 'USA' },
  { city: 'Jakarta',      country: 'Indonesia' },
  { city: 'Kuala Lumpur', country: 'Malaysia' },
];

/** Dispatch a StorageEvent so same-tab useLocalStorage hooks pick up the change. */
function persistLocation(city: string, country: string) {
  localStorage.setItem('isa:city',    JSON.stringify(city));
  localStorage.setItem('isa:country', JSON.stringify(country));
  window.dispatchEvent(new StorageEvent('storage', { key: 'isa:city',    newValue: JSON.stringify(city) }));
  window.dispatchEvent(new StorageEvent('storage', { key: 'isa:country', newValue: JSON.stringify(country) }));
}

export default function PrayerTimesPage() {
  // Read & write directly to localStorage so AutoAzanScheduler and other
  // components stay in sync automatically.
  const [city,    setStoredCity]    = useLocalStorage<string>('isa:city',    'Karachi');
  const [country, setStoredCountry] = useLocalStorage<string>('isa:country', 'Pakistan');
  const [method]                    = useLocalStorage<MethodId>('isa:method', 1 as MethodId);

  const [draftCity,    setDraftCity]    = useState(city);
  const [draftCountry, setDraftCountry] = useState(country);

  const applyLocation = (c: string, co: string) => {
    const safeCity    = c.trim()  || 'Karachi';
    const safeCountry = co.trim() || 'Pakistan';
    setStoredCity(safeCity);
    setStoredCountry(safeCountry);
    persistLocation(safeCity, safeCountry);
    setDraftCity(safeCity);
    setDraftCountry(safeCountry);
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="chip-gold mb-2"><Sparkles size={12}/> Prayer Times</p>
        <h1 className="h-display text-4xl font-bold">Live timings, anywhere on earth</h1>
        <p className="text-ink/60 mt-1">DST-aware · Hijri date included · Calculation method from your preferences</p>
      </div>

      <PrayerCountdownHero city={city} country={country} method={method} />

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card card-pad lg:col-span-1">
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-700"/> Update location
          </h3>
          <label className="text-xs text-ink/55">City</label>
          <input
            value={draftCity}
            onChange={(e) => setDraftCity(e.target.value)}
            placeholder="Karachi"
            className="w-full mt-1 mb-3 px-3 py-2 rounded-lg border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <label className="text-xs text-ink/55">Country</label>
          <input
            value={draftCountry}
            onChange={(e) => setDraftCountry(e.target.value)}
            placeholder="Pakistan"
            className="w-full mt-1 mb-4 px-3 py-2 rounded-lg border border-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-300"
          />
          <button
            onClick={() => applyLocation(draftCity, draftCountry)}
            className="btn-primary w-full justify-center"
          >
            <RotateCw size={16}/> Update timings
          </button>
        </div>

        <div className="card card-pad lg:col-span-2">
          <h3 className="font-bold mb-3">Popular cities</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {POPULAR.map((p, i) => {
              const active = p.city === city && p.country === country;
              return (
                <motion.button
                  key={`${p.city}-${p.country}`}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  whileHover={{ y: -2 }}
                  onClick={() => applyLocation(p.city, p.country)}
                  className={`text-left p-3 rounded-xl border transition
                    ${active
                      ? 'border-emerald-500 bg-emerald-50 shadow-glow-emerald'
                      : 'border-emerald-100 bg-white hover:border-emerald-300'}`}
                >
                  <p className="font-semibold">{p.city}</p>
                  <p className="text-xs text-ink/55">{p.country}</p>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
