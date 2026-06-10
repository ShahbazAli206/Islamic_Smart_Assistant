'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Sparkles, User, Mail, BookOpen, Globe2, MapPin, Check, Loader2, Crosshair } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Me, type MeProfile, type SetLocation } from '@/lib/api';
import { setLocationByCoords } from '@/lib/location';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ar', label: 'العربية (Arabic)' },
  { code: 'ur', label: 'اردو (Urdu)' },
  { code: 'tr', label: 'Türkçe (Turkish)' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'bn', label: 'বাংলা (Bengali)' },
  { code: 'fr', label: 'Français (French)' },
  { code: 'ps', label: 'پښتو (Pashto)' },
  { code: 'ja', label: '日本語 (Japanese)' },
  { code: 'zh', label: '中文 (Chinese)' },
];

const SECTS = [
  { value: 'sunni', label: 'Sunni' },
  { value: 'shia', label: 'Shia' },
] as const;

// Fiqh schools affect prayer-time calculation, so we offer the relevant set per sect.
const FIQH: Record<'sunni' | 'shia', { value: string; label: string }[]> = {
  sunni: [
    { value: 'hanafi', label: 'Hanafi' },
    { value: 'shafi', label: 'Shafiʿi' },
    { value: 'maliki', label: 'Maliki' },
    { value: 'hanbali', label: 'Hanbali' },
  ],
  shia: [{ value: 'jafari', label: 'Jaʿfari' }],
};

export default function ProfilePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['me'], queryFn: Me.profile });

  const [form, setForm] = useState<Partial<MeProfile>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Seed the editable form once the profile loads.
  useEffect(() => {
    if (data) setForm({ name: data.name, language: data.language, sect: data.sect, fiqh_method: data.fiqh_method });
  }, [data]);

  const save = useMutation({
    mutationFn: () =>
      Me.update({
        name: form.name,
        language: form.language,
        sect: form.sect ?? undefined,
        fiqh_method: form.fiqh_method ?? undefined,
      }),
    onSuccess: (fresh) => {
      qc.setQueryData(['me'], fresh);
      setSavedAt(Date.now());
    },
  });

  const saveLocation = useMutation({
    mutationFn: (loc: SetLocation) => Me.setLocation(loc),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  });

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // 1. Persist to the account (synced across signed-in devices).
      saveLocation.mutate({ lat, lng, timezone, detected_via: 'gps' });

      // 2. Mirror into localStorage so the prayer-time hero + sidebar — which
      //    read the isa:* keys on this device — refresh immediately.
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
          { headers: { Accept: 'application/json' }, cache: 'no-store' },
        );
        const addr = (await res.json())?.address ?? {};
        const city = addr.city || addr.town || addr.village || addr.county || addr.state || '';
        const country = addr.country || '';
        // Centralized writer: tags coords with the city + dispatches StorageEvents.
        setLocationByCoords(lat, lng, city || undefined, country || undefined, { clearMosque: true });
      } catch {
        // Reverse geocode failed — still store the raw GPS coords (trusted).
        setLocationByCoords(lat, lng, undefined, undefined, { clearMosque: true });
      }
    });
  };

  const fiqhOptions = form.sect ? FIQH[form.sect] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-ink/50">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading your profile…
      </div>
    );
  }

  const initials = (form.name ?? data?.name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('');

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="chip-gold mb-2"><Sparkles size={12} /> Your account</p>
        <h1 className="h-display text-4xl font-bold">My Profile</h1>
        <p className="text-ink/60 mt-1">Your details are saved to your account and synced to every device.</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-xl font-bold shadow-md">
            {initials}
          </span>
          <div>
            <p className="text-lg font-semibold">{form.name || data?.name}</p>
            <p className="text-sm text-ink/55 flex items-center gap-1"><Mail size={13} /> {data?.email}</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <Field icon={User} label="Name">
            <input
              value={form.name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="profile-input"
              placeholder="Your name"
            />
          </Field>

          <Field icon={Mail} label="Email">
            <input value={data?.email ?? ''} disabled className="profile-input opacity-60 cursor-not-allowed" />
          </Field>

          <Field icon={Globe2} label="Language">
            <select
              value={form.language ?? 'en'}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
              className="profile-input"
            >
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>

          <Field icon={BookOpen} label="Sect">
            <select
              value={form.sect ?? ''}
              onChange={(e) => {
                const sect = (e.target.value || null) as MeProfile['sect'];
                // Reset fiqh when sect changes so the saved school stays valid for the sect.
                setForm((f) => ({ ...f, sect, fiqh_method: null }));
              }}
              className="profile-input"
            >
              <option value="">Prefer not to say</option>
              {SECTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </Field>

          {form.sect && (
            <Field icon={BookOpen} label="Fiqh / School">
              <select
                value={form.fiqh_method ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, fiqh_method: (e.target.value || null) as MeProfile['fiqh_method'] }))}
                className="profile-input"
              >
                <option value="">Select a school</option>
                {fiqhOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button onClick={() => save.mutate()} disabled={save.isPending} className="btn-primary text-sm py-2 px-5">
            {save.isPending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save changes
          </button>
          {savedAt && !save.isPending && <span className="text-sm text-emerald-700 flex items-center gap-1"><Check size={14} /> Saved</span>}
          {save.isError && <span className="text-sm text-rose-600">Couldn’t save — try again.</span>}
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-emerald-700" />
          <h3 className="font-bold">Location</h3>
          <span className="text-xs text-ink/50">— used to calculate your prayer times</span>
        </div>

        {data?.location ? (
          <p className="text-sm text-ink/70">
            {data.location.city ? `${data.location.city}, ` : ''}{data.location.country ?? ''}
            <span className="text-ink/45">
              {' '}({data.location.lat.toFixed(3)}, {data.location.lng.toFixed(3)} · {data.location.timezone})
            </span>
          </p>
        ) : (
          <p className="text-sm text-ink/55">No location set yet.</p>
        )}

        <button
          onClick={detectLocation}
          disabled={saveLocation.isPending}
          className="btn-ghost text-sm py-2 px-4 mt-4"
        >
          {saveLocation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
          {data?.location ? 'Update location' : 'Detect my location'}
        </button>
      </motion.div>
    </div>
  );
}

function Field({ icon: Icon, label, children }: { icon: any; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider text-ink/50 font-semibold flex items-center gap-1.5 mb-1.5">
        <Icon size={13} /> {label}
      </span>
      {children}
    </label>
  );
}
