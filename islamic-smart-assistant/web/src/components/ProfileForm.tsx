'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  User, Mail, BookOpen, Globe2, MapPin, Check, Loader2, Crosshair,
  MonitorDown, Download,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Me, type MeProfile, type SetLocation } from '@/lib/api';
import { setLocationByCoords, readStoredLocation } from '@/lib/location';
import { useLocalStorage } from '@/lib/useLocalStorage';
import { useDesktopDownloadUrl } from '@/lib/desktopApp';

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
  { value: 'shia', label: 'Fiqah Jafri' },
] as const;

const FIQH: Record<'sunni' | 'shia', { value: string; label: string }[]> = {
  sunni: [
    { value: 'hanafi', label: 'Hanafi' },
    { value: 'shafi', label: 'Shafiʿi' },
    { value: 'maliki', label: 'Maliki' },
    { value: 'hanbali', label: 'Hanbali' },
  ],
  shia: [{ value: 'jafari', label: 'Jaʿfari' }],
};

// Local profile storage — used as the primary store in the desktop app where
// no backend is running.  The API is tried as a background sync; failures are
// silent so the form always works offline.
const LOCAL_PROFILE_KEY = 'isa:profile';

function readLocalProfile(): Partial<MeProfile> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    const compound: Partial<MeProfile> = raw ? JSON.parse(raw) : {};
    // Individual keys written by QuickSettings / Settings page may be more recent —
    // prefer them so the modal always opens with the latest values.
    const get = (k: string) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
    const lang = get('isa:language');
    const sect = get('isa:sect');
    const fiqh = get('isa:fiqh');
    return {
      ...compound,
      ...(lang != null ? { language: lang }        : {}),
      ...(sect != null ? { sect }                  : {}),
      ...(fiqh != null ? { fiqh_method: fiqh }     : {}),
    };
  } catch { return {}; }
}

function persistLocalProfile(p: Partial<MeProfile>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(p));
  // Emit individual keys so QuickSettings, Settings page, and every other
  // useLocalStorage subscriber re-renders immediately in the same tab.
  const emit = (key: string, val: unknown) => {
    if (val == null) return;
    const j = JSON.stringify(val);
    localStorage.setItem(key, j);
    window.dispatchEvent(new StorageEvent('storage', { key, newValue: j }));
  };
  emit('isa:language', p.language);
  emit('isa:sect',     p.sect);
  emit('isa:fiqh',     p.fiqh_method);
}

export function ProfileForm() {
  const qc = useQueryClient();

  // Try the API — may 401/fail in the desktop app where no backend runs.
  const { data: apiData } = useQuery({
    queryKey: ['me'],
    queryFn: Me.profile,
    retry: 0,       // don't retry — backend simply isn't present
    staleTime: Infinity,
  });

  // Local profile loaded synchronously from localStorage (no flicker).
  const [localProfile, setLocalProfile] = useState<Partial<MeProfile>>(readLocalProfile);

  // Merge: API data wins when available, localStorage is the fallback.
  const profile: Partial<MeProfile> = { ...localProfile, ...(apiData ?? {}) };

  const [form, setForm] = useState<Partial<MeProfile>>({});
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Reactive localStorage location (updates when GPS detect completes).
  const [storedLat]     = useLocalStorage<number | null>('isa:lat',     null);
  const [storedLng]     = useLocalStorage<number | null>('isa:lng',     null);
  const [storedCity]    = useLocalStorage<string>('isa:city',    '');
  const [storedCountry] = useLocalStorage<string>('isa:country', '');

  const [locDetecting, setLocDetecting] = useState(false);

  // Populate the form from whichever source we have.
  useEffect(() => {
    const src = apiData ?? localProfile;
    if (src.name !== undefined || src.language !== undefined) {
      setForm({
        name:        src.name,
        language:    src.language,
        sect:        src.sect,
        fiqh_method: src.fiqh_method,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiData]);

  // First mount: populate from localStorage (readLocalProfile already merges individual
  // keys written by QuickSettings, so this reflects the latest values from any source).
  useEffect(() => {
    if (!apiData) {
      const merged = readLocalProfile();
      if (merged.name !== undefined || merged.language !== undefined) {
        setForm({
          name:        merged.name,
          language:    merged.language,
          sect:        merged.sect,
          fiqh_method: merged.fiqh_method,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useMutation({
    mutationFn: async () => {
      const dto = {
        name:        form.name,
        language:    form.language ?? 'en',
        sect:        form.sect   ?? undefined,
        fiqh_method: form.fiqh_method ?? undefined,
      };

      // PRIMARY: save to localStorage — always works, even without internet.
      const next: Partial<MeProfile> = { ...profile, ...dto };
      persistLocalProfile(next);
      setLocalProfile(next);

      // SECONDARY: try to sync to the backend (desktop app may not have one).
      try {
        const fresh = await Me.update(dto);
        qc.setQueryData(['me'], fresh);
        return fresh;
      } catch {
        // API unavailable — local save already completed above.
        return next as MeProfile;
      }
    },
    onSuccess: () => setSavedAt(Date.now()),
  });

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`,
            { headers: { Accept: 'application/json' }, cache: 'no-store' },
          );
          const addr = (await res.json())?.address ?? {};
          const city    = addr.city || addr.town || addr.village || addr.county || addr.state || '';
          const country = addr.country || '';
          setLocationByCoords(lat, lng, city || undefined, country || undefined, { clearMosque: true });
        } catch {
          setLocationByCoords(lat, lng, undefined, undefined, { clearMosque: true });
        }
        // Best-effort sync to API (no await — desktop may not have backend).
        Me.setLocation({ lat, lng, timezone, detected_via: 'gps' }).catch(() => {});
        setLocDetecting(false);
      },
      () => setLocDetecting(false),
    );
  };

  const fiqhOptions = form.sect ? FIQH[form.sect] : [];

  // Location to display: prefer the API value, fall back to localStorage.
  const hasApiLoc = !!apiData?.location;
  const hasLocalLoc = !!(storedLat && storedLng) || !!storedCity;

  const initials = (form.name ?? profile.name ?? '?').split(' ').map((n) => n[0]).slice(0, 2).join('');

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad">
        <div className="flex items-center gap-4 mb-6">
          <span className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center text-xl font-bold shadow-md">
            {initials}
          </span>
          <div>
            <p className="text-lg font-semibold">{form.name || profile.name}</p>
            <p className="text-sm text-ink/55 flex items-center gap-1"><Mail size={13} /> {profile.email}</p>
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
            <input value={profile.email ?? ''} disabled className="profile-input opacity-60 cursor-not-allowed" />
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
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="card card-pad">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={16} className="text-emerald-700" />
          <h3 className="font-bold">Location</h3>
          <span className="text-xs text-ink/50">— used to calculate your prayer times</span>
        </div>

        {hasApiLoc ? (
          <p className="text-sm text-ink/70">
            {apiData!.location!.city ? `${apiData!.location!.city}, ` : ''}{apiData!.location!.country ?? ''}
            <span className="text-ink/45">
              {' '}({apiData!.location!.lat.toFixed(3)}, {apiData!.location!.lng.toFixed(3)} · {apiData!.location!.timezone})
            </span>
          </p>
        ) : hasLocalLoc ? (
          <p className="text-sm text-ink/70">
            {storedCity ? `${storedCity}${storedCountry ? `, ${storedCountry}` : ''}` : ''}
            {storedLat && storedLng && (
              <span className="text-ink/45"> ({storedLat.toFixed(3)}, {storedLng.toFixed(3)})</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-ink/55">No location set yet.</p>
        )}

        <button
          onClick={detectLocation}
          disabled={locDetecting}
          className="btn-ghost text-sm py-2 px-4 mt-4"
        >
          {locDetecting ? <Loader2 size={16} className="animate-spin" /> : <Crosshair size={16} />}
          {(hasApiLoc || hasLocalLoc) ? 'Update location' : 'Detect my location'}
        </button>
      </motion.div>
    </div>
  );
}

export function DesktopRequiredNotice() {
  const desktopDownloadUrl = useDesktopDownloadUrl();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="card card-pad text-center"
    >
      <div className="mx-auto mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-mosque-gradient text-gold-300 shadow-lg">
        <MonitorDown size={28} />
      </div>
      <h3 className="h-display text-2xl font-bold">Manage your profile in the Desktop app</h3>
      <p className="mx-auto mt-2 max-w-md text-ink/60 leading-relaxed">
        To keep your personal details private and in sync, your name, language, sect and
        location are managed in the <span className="font-semibold text-ink/80">Noor Desktop</span> app.
        Download and install it to set up and save your profile.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <a
          href={desktopDownloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-gold-gradient text-midnight-900 px-6 py-3 font-bold shadow-glow-gold hover:brightness-105 transition"
        >
          <Download size={18} /> Download Noor Desktop
        </a>
      </div>
      <p className="mt-4 text-xs text-ink/40">Available for Windows, macOS and Linux.</p>
    </motion.div>
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
