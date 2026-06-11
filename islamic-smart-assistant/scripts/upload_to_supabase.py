#!/usr/bin/env python3
"""
Upload pre-generated per-ayah MP3s to Supabase Storage using the official SDK.
Handles both legacy JWT service_role keys and new sb_secret_... key formats.

Usage:
    python upload_to_supabase.py --lang hi
    python upload_to_supabase.py --lang bn
"""

import argparse
import json
import os
import sys
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

BUCKET = os.environ.get("SUPABASE_BUCKET", "quran-audio")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")


def ensure_bucket(client):
    try:
        client.storage.get_bucket(BUCKET)
        print(f"  bucket '{BUCKET}' already exists")
    except Exception:
        print(f"  creating public bucket '{BUCKET}'...")
        client.storage.create_bucket(BUCKET, options={"public": True})


def upload_lang(lang: str):
    from supabase import create_client

    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.")

    out_dir = Path("out") / lang
    files = sorted(out_dir.glob("*.mp3"), key=lambda p: int(p.stem))
    if not files:
        sys.exit(f"No MP3s found in {out_dir}. Run generate_translation_audio.py first.")

    manifest = out_dir / ".uploaded.json"
    uploaded: set[int] = set(json.loads(manifest.read_text())) if manifest.exists() else set()
    todo = [p for p in files if int(p.stem) not in uploaded]

    print(f"  uploading {len(todo)} files to {BUCKET}/translations/{lang}/ "
          f"({len(uploaded)} already done)")

    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    ensure_bucket(client)

    bucket = client.storage.from_(BUCKET)
    done_count = len(uploaded)

    def put(path: Path):
        dest = f"translations/{lang}/{path.name}"
        data = path.read_bytes()
        for attempt in range(4):
            try:
                bucket.upload(dest, data, {"content-type": "audio/mpeg", "upsert": "true"})
                return int(path.stem)
            except Exception as e:
                msg = str(e)
                if attempt == 3:
                    print(f"\n  ! {path.name} failed: {msg[:100]}")
                    return None
                import time; time.sleep(1.0 * (attempt + 1))
        return None

    with ThreadPoolExecutor(max_workers=1) as pool:
        futures = {pool.submit(put, p): p for p in todo}
        i = 0
        for future in as_completed(futures):
            i += 1
            num = future.result()
            if num is not None:
                uploaded.add(num)
            if i % 50 == 0 or i == len(todo):
                manifest.write_text(json.dumps(sorted(uploaded)))
                print(f"  uploaded {done_count + i}/{len(files)}", end="\r", flush=True)

    manifest.write_text(json.dumps(sorted(uploaded)))
    print(f"\n== done: {lang} — {len(uploaded)}/{len(files)} files in bucket ==")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True, choices=("hi", "bn"))
    args = ap.parse_args()
    upload_lang(args.lang)
