'use client';

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { UploadCloud, Music2, FileAudio, Sparkles } from 'lucide-react';
import { Admin } from '@/lib/api';

export default function AudioPage() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setBusy(true); setMsg(null);
    try { await Admin.uploadAzanPack(file); setMsg(`Uploaded ${file.name}`); }
    catch (err: any) { setMsg(`Failed: ${err.message}`); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="chip-gold mb-2"><Sparkles size={12}/> Library</p>
        <h1 className="h-display text-4xl font-bold">Audio assets</h1>
        <p className="text-ink/60 mt-1">Upload custom Azan packs. Files are stored on cloud storage and pushed to devices instantly.</p>
      </div>

      <motion.label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) upload(f);
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

      {msg && (
        <motion.p
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className="text-sm text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3"
        >
          {msg}
        </motion.p>
      )}

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
  );
}
