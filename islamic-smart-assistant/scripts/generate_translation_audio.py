#!/usr/bin/env python3
"""
Generate per-ayah spoken TRANSLATION audio for the Quran and upload it to
Supabase Storage, so the web player can play Bengali / Hindi translation audio
ayah-by-ayah. (No free public *human* per-ayah recording exists for these two
languages — only whole-surah files — so we synthesize our own.)

How it works
------------
1. Reads the per-ayah translation TEXT from the free AlQuran.cloud API
   (one request for the whole Quran per language — no API key).
2. Runs each ayah's text through a FREE, no-API-key text-to-speech engine.
3. Writes one MP3 per ayah named by GLOBAL ayah number (1..6236) — exactly what
   the web app requests:  translations/<folder>/<globalAyahNumber>.mp3
4. Uploads each file to a public Supabase Storage bucket (idempotent upsert).

This script runs ONCE on your own machine. End users then stream the finished
MP3s from Supabase — they never touch the TTS engine.

Engines (both free, no paid cloud)
----------------------------------
  edge  (default)  Microsoft Edge online neural voices via the `edge-tts` pkg.
                   Best quality, tiny install, no API key / account. The online
                   call happens only here, during this one-time generation.
  mms              Meta MMS-TTS — fully offline / open-source (needs torch +
                   transformers + ffmpeg). Use if you want zero external calls.

Quick start
-----------
  pip install -r requirements.txt          # edge-tts + requests
  set  SUPABASE_URL=https://xxxx.supabase.co            (PowerShell: $env:SUPABASE_URL=...)
  set  SUPABASE_SERVICE_ROLE_KEY=eyJ...                 (Project Settings -> API)

  python generate_translation_audio.py --lang hi
  python generate_translation_audio.py --lang bn

  # generate locally only, no upload:
  python generate_translation_audio.py --lang hi --no-upload

  # offline engine:
  pip install torch transformers scipy pydub   # + install ffmpeg
  python generate_translation_audio.py --lang bn --engine mms

After both languages finish, tell the web app they exist by setting in web/.env.local:
  NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
  NEXT_PUBLIC_TTS_TRANSLATION_LANGS=bn,hi
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.request import Request, urlopen

# ── Config ──────────────────────────────────────────────────────────────────

# folder-in-bucket  ->  AlQuran.cloud TEXT edition to synthesize.
# These MUST match TTS_EDITIONS in web/src/lib/quran.ts so the spoken words
# match the on-screen text (bn.bengali, hi.hindi — NOT the sibling editions).
EDITIONS = {
    "bn": "bn.bengali",   # Muhiuddin Khan
    "hi": "hi.hindi",     # Suhel Farooq Khan & Saifur Rahman Nadwi
}

# Default Edge neural voices (calm male narration). Override with --voice.
EDGE_VOICES = {
    "hi": "hi-IN-MadhurNeural",     # alt: hi-IN-SwaraNeural (female)
    "bn": "bn-IN-BashkarNeural",    # alt: bn-IN-TanishaaNeural, bn-BD-PradeepNeural
}

MMS_MODELS = {
    "hi": "facebook/mms-tts-hin",
    "bn": "facebook/mms-tts-ben",
}

API = "https://api.alquran.cloud/v1"
TOTAL_AYAHS = 6236


# ── Fetch per-ayah translation text ──────────────────────────────────────────

def fetch_ayahs(edition: str) -> list[tuple[int, str]]:
    """Return [(global_ayah_number, text), ...] for the whole Quran."""
    url = f"{API}/quran/{edition}"
    print(f"  fetching text: {url}")
    req = Request(url, headers={"Accept": "application/json", "User-Agent": "syedi-ismaa-tts/1.0"})
    with urlopen(req, timeout=60) as r:
        data = json.loads(r.read().decode("utf-8"))
    if data.get("code") != 200:
        raise SystemExit(f"AlQuran.cloud returned {data.get('code')} for edition {edition!r}")
    out: list[tuple[int, str]] = []
    for surah in data["data"]["surahs"]:
        for ayah in surah["ayahs"]:
            text = clean_text(ayah["text"])
            if text:
                out.append((int(ayah["number"]), text))
    if len(out) != TOTAL_AYAHS:
        print(f"  ! warning: got {len(out)} ayahs (expected {TOTAL_AYAHS})")
    return out


def clean_text(text: str) -> str:
    """Strip footnote markup / collapse whitespace so the TTS reads cleanly."""
    text = re.sub(r"<[^>]+>", " ", text)          # any stray HTML tags
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ── TTS engines ──────────────────────────────────────────────────────────────

async def generate_edge(ayahs: list[tuple[int, str]], voice: str, out_dir: Path,
                        force: bool, concurrency: int = 4) -> None:
    """Synthesize with Microsoft Edge neural voices (edge-tts). Outputs MP3."""
    import edge_tts  # pip install edge-tts

    sem = asyncio.Semaphore(concurrency)
    done = 0
    total = len(ayahs)

    async def one(num: int, text: str) -> None:
        nonlocal done
        path = out_dir / f"{num}.mp3"
        if path.exists() and not force and path.stat().st_size > 0:
            done += 1
            return
        async with sem:
            for attempt in range(5):
                try:
                    await edge_tts.Communicate(text, voice).save(str(path))
                    break
                except Exception as e:  # noqa: BLE001 — Edge endpoint can rate-limit
                    if attempt == 4:
                        print(f"\n  ! ayah {num} failed after retries: {e}")
                        path.unlink(missing_ok=True)
                        return
                    await asyncio.sleep(1.5 * (attempt + 1))
        done += 1
        if done % 50 == 0 or done == total:
            print(f"  generated {done}/{total}", end="\r", flush=True)

    # Run in chunks to keep memory + open sockets bounded.
    chunk = 200
    for i in range(0, total, chunk):
        await asyncio.gather(*(one(n, t) for n, t in ayahs[i:i + chunk]))
    print()


def generate_mms(ayahs: list[tuple[int, str]], model_id: str, out_dir: Path, force: bool) -> None:
    """Synthesize fully offline with Meta MMS-TTS. Needs torch+transformers+ffmpeg."""
    import torch                                   # noqa: F401
    from transformers import VitsModel, AutoTokenizer
    from pydub import AudioSegment                 # needs ffmpeg on PATH
    import io, scipy.io.wavfile as wav             # noqa: E401

    print(f"  loading MMS model {model_id} (first run downloads it)…")
    model = VitsModel.from_pretrained(model_id)
    tokenizer = AutoTokenizer.from_pretrained(model_id)
    model.eval()
    rate = model.config.sampling_rate
    total = len(ayahs)

    for done, (num, text) in enumerate(ayahs, 1):
        path = out_dir / f"{num}.mp3"
        if path.exists() and not force and path.stat().st_size > 0:
            continue
        inputs = tokenizer(text, return_tensors="pt")
        with torch.no_grad():
            wave = model(**inputs).waveform[0].cpu().numpy()
        buf = io.BytesIO()
        wav.write(buf, rate, (wave * 32767).astype("int16"))
        buf.seek(0)
        AudioSegment.from_wav(buf).export(path, format="mp3", bitrate="48k")
        if done % 25 == 0 or done == total:
            print(f"  generated {done}/{total}", end="\r", flush=True)
    print()


# ── Supabase Storage upload ──────────────────────────────────────────────────

def supabase_upload_dir(folder: str, out_dir: Path) -> None:
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    bucket = os.environ.get("SUPABASE_BUCKET", "quran-audio")
    if not base or not key:
        raise SystemExit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to upload "
                         "(or pass --no-upload to only generate locally).")
    import requests  # pip install requests

    ensure_bucket(base, key, bucket)

    files = sorted(out_dir.glob("*.mp3"), key=lambda p: int(p.stem))
    manifest = out_dir / ".uploaded.json"
    uploaded: set[int] = set(json.loads(manifest.read_text())) if manifest.exists() else set()
    todo = [p for p in files if int(p.stem) not in uploaded]
    print(f"  uploading {len(todo)} files to {bucket}/translations/{folder}/ "
          f"({len(uploaded)} already up)")

    sess = requests.Session()
    sess.headers.update({"Authorization": f"Bearer {key}", "x-upsert": "true",
                         "Content-Type": "audio/mpeg"})

    def put(path: Path) -> int | None:
        url = f"{base}/storage/v1/object/{bucket}/translations/{folder}/{path.name}"
        for attempt in range(4):
            try:
                resp = sess.post(url, data=path.read_bytes(), timeout=60)
                if resp.status_code in (200, 201):
                    return int(path.stem)
                if resp.status_code == 429 or resp.status_code >= 500:
                    time.sleep(1.0 * (attempt + 1)); continue
                print(f"\n  ! {path.name}: HTTP {resp.status_code} {resp.text[:120]}")
                return None
            except Exception as e:  # noqa: BLE001
                if attempt == 3:
                    print(f"\n  ! {path.name}: {e}")
                    return None
                time.sleep(1.0 * (attempt + 1))
        return None

    done = len(uploaded)
    with ThreadPoolExecutor(max_workers=8) as pool:
        for i, num in enumerate(pool.map(put, todo), 1):
            if num is not None:
                uploaded.add(num)
            if i % 50 == 0 or i == len(todo):
                manifest.write_text(json.dumps(sorted(uploaded)))
                print(f"  uploaded {done + i}/{len(files)}", end="\r", flush=True)
    manifest.write_text(json.dumps(sorted(uploaded)))
    print()


def ensure_bucket(base: str, key: str, bucket: str) -> None:
    import requests
    h = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"}
    r = requests.get(f"{base}/storage/v1/bucket/{bucket}", headers=h, timeout=30)
    if r.status_code == 200:
        return
    print(f"  creating public bucket {bucket!r}…")
    requests.post(f"{base}/storage/v1/bucket", headers=h, timeout=30,
                  data=json.dumps({"id": bucket, "name": bucket, "public": True}))


# ── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Generate + upload per-ayah Quran translation audio.")
    ap.add_argument("--lang", required=True, choices=sorted(EDITIONS), help="bn or hi")
    ap.add_argument("--engine", default="edge", choices=("edge", "mms"))
    ap.add_argument("--voice", help="Override the Edge voice (engine=edge only)")
    ap.add_argument("--out", default="out", help="Output directory (default: ./out)")
    ap.add_argument("--no-upload", action="store_true", help="Generate locally, don't upload")
    ap.add_argument("--upload-only", action="store_true", help="Skip generation, upload existing files")
    ap.add_argument("--force", action="store_true", help="Re-generate files that already exist")
    args = ap.parse_args()

    lang = args.lang
    out_dir = Path(args.out) / lang
    out_dir.mkdir(parents=True, exist_ok=True)
    print(f"== {lang.upper()} ({EDITIONS[lang]}) -> {out_dir} ==")

    if not args.upload_only:
        ayahs = fetch_ayahs(EDITIONS[lang])
        if args.engine == "edge":
            voice = args.voice or EDGE_VOICES[lang]
            print(f"  engine=edge  voice={voice}")
            asyncio.run(generate_edge(ayahs, voice, out_dir, args.force))
        else:
            print(f"  engine=mms   model={MMS_MODELS[lang]}")
            generate_mms(ayahs, MMS_MODELS[lang], out_dir, args.force)

    if not args.no_upload:
        supabase_upload_dir(lang, out_dir)

    print(f"== done: {lang} ==")
    if not args.no_upload:
        print("   Remember to set NEXT_PUBLIC_TTS_TRANSLATION_LANGS (e.g. \"bn,hi\") "
              "and NEXT_PUBLIC_SUPABASE_URL in the web app.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        sys.exit(130)
