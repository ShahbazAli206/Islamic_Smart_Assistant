#!/usr/bin/env python3
"""
Delete a language's per-ayah translation MP3s from the Supabase Storage bucket.
Companion to upload_to_supabase.py. Use this to retire a TTS translation that is
no longer offered in the app (e.g. Hindi) WITHOUT touching the others (Bengali).

DESTRUCTIVE: removed objects cannot be recovered. Dry-run is the default — you
must pass --yes to actually delete.

Usage:
    # 1. See what WOULD be deleted (no changes):
    python delete_from_supabase.py --lang hi

    # 2. Actually delete every translations/hi/*.mp3 from the bucket:
    python delete_from_supabase.py --lang hi --yes

Requires (same as the upload script):
    SUPABASE_URL=...                 # https://<ref>.supabase.co
    SUPABASE_SERVICE_ROLE_KEY=...    # service_role / sb_secret_... key (write access)
    SUPABASE_BUCKET=quran-audio      # optional, defaults to quran-audio
"""

import argparse
import os
import sys

BUCKET = os.environ.get("SUPABASE_BUCKET", "quran-audio")
SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")

PAGE = 1000      # Storage list() page size
BATCH = 200      # objects removed per remove() call


def list_all(bucket, prefix: str) -> list[str]:
    """Return full object paths under `prefix`, paging through the whole folder."""
    paths: list[str] = []
    offset = 0
    while True:
        page = bucket.list(prefix, {"limit": PAGE, "offset": offset})
        if not page:
            break
        for obj in page:
            name = obj.get("name")
            # Skip the pseudo-folder placeholder rows Storage sometimes returns.
            if name and obj.get("id") is not None:
                paths.append(f"{prefix}/{name}")
        if len(page) < PAGE:
            break
        offset += PAGE
    return paths


def main(lang: str, confirm: bool):
    if not SUPABASE_URL or not SUPABASE_KEY:
        sys.exit("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.")

    from supabase import create_client

    prefix = f"translations/{lang}"
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    bucket = client.storage.from_(BUCKET)

    print(f"  scanning {BUCKET}/{prefix}/ ...")
    paths = list_all(bucket, prefix)
    print(f"  found {len(paths)} object(s) under {prefix}/")
    if not paths:
        print("  nothing to delete.")
        return

    if not confirm:
        sample = ", ".join(p.rsplit("/", 1)[-1] for p in paths[:5])
        print(f"  e.g. {sample}{' ...' if len(paths) > 5 else ''}")
        print("\n  DRY RUN — nothing deleted. Re-run with --yes to delete the above.")
        return

    print(f"  deleting {len(paths)} object(s) from {BUCKET}/{prefix}/ ...")
    removed = 0
    for i in range(0, len(paths), BATCH):
        chunk = paths[i:i + BATCH]
        bucket.remove(chunk)
        removed += len(chunk)
        print(f"  removed {removed}/{len(paths)}", end="\r", flush=True)
    print(f"\n== done: deleted {removed} object(s) under {prefix}/ ==")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--lang", required=True, help="bucket folder under translations/ (e.g. hi)")
    ap.add_argument("--yes", action="store_true", help="actually delete (otherwise dry-run)")
    args = ap.parse_args()
    main(args.lang, args.yes)
