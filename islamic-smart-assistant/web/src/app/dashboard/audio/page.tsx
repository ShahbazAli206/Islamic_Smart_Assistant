'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Music2, FileAudio, Sparkles, BookOpen } from 'lucide-react';
import { Admin } from '@/lib/api';

/** Audio assets page — drag-and-drop upload of custom Azan packs plus the bundled defaults. */
export default function AudioPage() {
  const [busy, setBusy] = useState(false);          // an upload is in flight (disables the input)
  const [msg, setMsg] = useState<string | null>(null); // success/failure banner text
  const [dragOver, setDragOver] = useState(false);  // drives the dropzone highlight styling
  const fileRef = useRef<HTMLInputElement>(null);

  // Shared upload handler for both the file picker and drag-drop. Surfaces the
  // outcome via `msg` and always clears `busy` so the dropzone re-enables.
  const upload = async (file: File) => {
    setBusy(true); setMsg(null);
    try { await Admin.uploadAzanPack(file); setMsg(`Uploaded ${file.name}`); }
    catch (err: any) { setMsg(`Failed: ${err.message}`); }
    finally { setBusy(false); }
  };

  return (
    <div className="-m-5 sm:-m-8 min-h-full text-ink page-light">
      {/* ── hero section ── */}
      <div className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/Overview_Light_Theme_Updated background images first section.png" alt="" className="absolute inset-0 h-full w-full select-none object-cover object-center" />

        <div className="relative px-6 sm:px-10 pt-8 pb-8 flex flex-wrap items-start justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-sm border border-white/60 bg-white/60 text-emerald-800">
              <Sparkles size={12} /> Islamic Library
            </span>
            <h1 className="mt-4 font-display font-bold text-xl sm:text-2xl xl:text-[2rem] 2xl:text-[2rem] leading-[1.05] whitespace-nowrap text-black"
              style={{ textShadow: '0 1px 8px rgba(255,255,255,0.7)' }}>
              Audio Assets
            </h1>
            <div className="mt-3 inline-block max-w-md rounded-xl border border-white/60 bg-white/60 px-4 py-2.5 backdrop-blur-sm">
              <p className="text-base sm:text-lg leading-relaxed text-black/85">
                Upload custom Azan packs. Files are stored on cloud storage and pushed to devices instantly.
              </p>
            </div>
          </div>

          {/* ayah card */}
          <div className="hidden md:block" style={{ maxWidth: '360px' }}>
            <div className="rounded-3xl border border-white/70 bg-white/55 p-5 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(16,40,30,0.25)]">
              <div>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-gradient text-[11px] font-bold text-midnight-900 shadow ring-2 ring-white/60">
                    ١
                  </span>
                  <p dir="rtl" className="font-arabic text-2xl leading-snug text-black">
                    اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ
                  </p>
                </div>
                <p className="mt-3 max-w-sm text-[15px] font-semibold leading-snug text-black">
                  Read in the name of your Lord who created.
                </p>
                <p className="mt-2 text-xs font-semibold text-black/75">Surah Al-&apos;Alaq (96:1)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-10 py-8 space-y-6">

      {/* drag-and-drop upload zone — the whole label is clickable to open the hidden file input */}
      <motion.label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) upload(f);   // only the first dropped file is uploaded
        }}
        whileHover={{ y: -2 }}
        className={`relative block rounded-3xl p-14 cursor-pointer text-center transition overflow-hidden
                    ${dragOver
                      ? 'bg-emerald-50 border-2 border-dashed border-emerald-500 shadow-glow-emerald'
                      : 'bg-white/70 border-2 border-dashed border-emerald-200 hover:border-emerald-400'}`}
      >
        <div className="absolute inset-0 pattern-bg opacity-20 pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-mosque-gradient text-gold-300 shadow-glow-emerald">
            <UploadCloud size={28}/>
          </div>
          <p className="mt-4 text-lg font-bold">Drop an mp3 here, or click to browse</p>
          <p className="text-sm text-ink/60 mt-1">Single file • ≤ 5 MB • audio/mpeg</p>
          <input
            ref={fileRef} type="file" accept="audio/mpeg" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
            disabled={busy}
          />
        </div>
      </motion.label>

      {/* upload result banner */}
      {msg && (
        <motion.p
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
        >
          {msg}
        </motion.p>
      )}

      {/* bundled defaults grid — static, ships with the app */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { name: 'Default Makkah pack',  size: '4.2 MB', icon: Music2 },
          { name: 'Default Madinah pack', size: '4.0 MB', icon: Music2 },
          { name: 'Quran starter (6 surahs)', size: '38 MB', icon: FileAudio },
        ].map((f, i) => (
          <motion.div
            key={f.name}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card card-pad flex items-center gap-3"
          >
            <span className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <f.icon size={22}/>
            </span>
            <div>
              <p className="font-semibold">{f.name}</p>
              <p className="text-xs text-ink/55">Bundled · {f.size}</p>
            </div>
          </motion.div>
        ))}
      </div>
      </div>
    </div>
  );
}
