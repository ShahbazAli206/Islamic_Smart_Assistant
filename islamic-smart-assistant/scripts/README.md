# Quran translation-audio generator

Generates **per-ayah spoken translation audio** for **Bengali** and **Hindi** and
uploads it to **Supabase Storage**, so the web Quran player can play these
translations ayah-by-ayah — just like the built-in English/Urdu/Turkish/
Chinese/French audio.

**Why this script exists:** English, Urdu, Turkish, Chinese and French already
have free *human* per-ayah recordings on the islamic.network CDN (wired up in
`web/src/lib/quran.ts`). Bengali and Hindi do **not** — only whole-surah files
exist online, which can't drive an ayah-by-ayah player. So we synthesize our own
per-ayah audio once, for free, and host it ourselves.

Everything here is **free, no paid cloud service**. The text-to-speech runs on
your machine; end users only ever stream the finished MP3s from Supabase.

---

## 1. Install

```bash
cd islamic-smart-assistant/scripts
pip install -r requirements.txt
```

## 2. Set Supabase credentials

From your Supabase project → **Settings → API**:

```bash
# PowerShell
$env:SUPABASE_URL = "https://YOUR-PROJECT.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJ...service_role..."   # NOT the anon key
# optional, default is quran-audio
$env:SUPABASE_BUCKET = "quran-audio"
```

> The **service_role** key can write to Storage — keep it secret, never commit
> it, never ship it to the browser. It's used only by this local script.
> The script auto-creates the (public) bucket if it doesn't exist.

## 3. Generate + upload

```bash
python generate_translation_audio.py --lang hi      # Hindi  (~6,236 files)
python generate_translation_audio.py --lang bn      # Bengali (~6,236 files)
```

- Resumable: re-run any time; existing local files and already-uploaded files
  are skipped.
- Generate locally without uploading: add `--no-upload`.
- Upload an already-generated folder: `--upload-only`.
- Pick a different voice: `--voice hi-IN-SwaraNeural` (female), etc.

Output layout (local mirror of the bucket):

```
out/hi/1.mp3 … out/hi/6236.mp3      ->  translations/hi/<n>.mp3 in the bucket
out/bn/1.mp3 … out/bn/6236.mp3      ->  translations/bn/<n>.mp3 in the bucket
```

The filename is the **global ayah number** (1–6236) — exactly what the web app
requests.

## 4. Turn it on in the web app

In `web/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_TTS_TRANSLATION_LANGS=bn,hi
```

That's it. Pick Hindi or Bengali in the Quran player, tick **“Recite each ayah
with its translation”**, and the translation will now play as audio. Until the
files exist / the flag is set, those languages gracefully fall back to text-only.

---

## Engines

| `--engine` | What | Install | Notes |
|---|---|---|---|
| `edge` (default) | Microsoft Edge online neural voices | `edge-tts` | Best quality, tiny install, no key/account. Online call happens only during generation. |
| `mms` | Meta MMS-TTS, fully offline | `torch transformers scipy pydub` + `ffmpeg` | Zero external calls; heavier; more robotic. |

```bash
# fully offline:
pip install torch transformers scipy pydub   # and install ffmpeg
python generate_translation_audio.py --lang bn --engine mms
```

## Voices

| Lang | Default | Alternatives |
|---|---|---|
| Hindi | `hi-IN-MadhurNeural` (m) | `hi-IN-SwaraNeural` (f) |
| Bengali | `bn-IN-BashkarNeural` (m) | `bn-IN-TanishaaNeural` (f), `bn-BD-PradeepNeural`, `bn-BD-NabanitaNeural` |

List all available Edge voices: `edge-tts --list-voices`

## Notes / caveats

- **Size:** ~0.3–0.45 GB per language at the Edge default 48 kbps. Both fit
  Supabase's free 1 GB storage, but watch the free egress (~5 GB/month) if many
  users stream — Cloudflare R2 (free, zero egress) is a good alternative host.
- **Authenticity:** these are synthetic voices, not human reciters, and may
  mispronounce some Arabic names. Spot-check before publishing widely.
- **Text licensing:** the translation text comes from AlQuran.cloud / Tanzil;
  confirm its terms before publicly redistributing derived audio.
- The script generates audio for the **`bn.bengali`** and **`hi.hindi`** text
  editions specifically, so the spoken words match what's shown on screen. The
  sibling editions (`bn.hoque`, `hi.farooq`) remain text-only.
