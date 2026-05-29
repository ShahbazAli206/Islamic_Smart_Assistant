"""
Downloads the default Azan + Quran starter pack into the web app's public folder so
new users see real audio without needing an internet connection.

Saves:
    islamic-smart-assistant/web/public/audio/azan/{makkah,madinah,pakistan,turkey,egypt}.mp3
    islamic-smart-assistant/web/public/audio/quran/{001,036,055,056,067}_abdulbasit.mp3

Run on its own:
    python download_assets.py
Or skip:
    python download_assets.py --skip-existing   (default — won't re-download)
    python download_assets.py --force           (re-download everything)

This script is safe to run repeatedly. It picks the first working URL from a list
of mirrors per file, so if one source is down it tries the next.
"""

from __future__ import annotations

import argparse
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Iterable

# Windows' default cp1252 console can't encode non-ASCII chars (e.g. arrows).
# Reconfigure stdout/stderr so any future logging quirk doesn't crash us.
for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass

ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "islamic-smart-assistant" / "web" / "public"
AZAN_DIR = PUBLIC_DIR / "audio" / "azan"
QURAN_DIR = PUBLIC_DIR / "audio" / "quran"

USER_AGENT = "Mozilla/5.0 (IslamicAssistant/1.0 +https://github.com/)"

# Each item: (output filename, list of mirror URLs to try in order)
# Mirrors are public, widely-used CDNs. islamic.network is the verified
# Quran audio CDN that the Quran web page also streams from.
AZAN_FILES: list[tuple[str, list[str]]] = [
    ("makkah.mp3", [
        "https://www.islamcan.com/audio/adhan/azan2.mp3",
        "https://archive.org/download/AzanFromMakkahAlMukarrama/Azan%20from%20Makkah%20al-Mukarrama.mp3",
    ]),
    ("madinah.mp3", [
        "https://www.islamcan.com/audio/adhan/azan3.mp3",
        "https://archive.org/download/AdhanMadinaMunawwara/Adhan_Madina_Munawwara.mp3",
    ]),
    ("pakistan.mp3", [
        "https://www.islamcan.com/audio/adhan/azan1.mp3",
    ]),
    ("turkey.mp3", [
        "https://www.islamcan.com/audio/adhan/azan6.mp3",
    ]),
    ("egypt.mp3", [
        "https://www.islamcan.com/audio/adhan/azan4.mp3",
    ]),
]

# Surahs we want offline by default. (surah_number, padded_filename_prefix)
# We pull Abdul Basit (Murattal) — the world-renowned classical reciter.
QURAN_SURAHS: list[tuple[int, str]] = [
    (1,  "001"),   # Al-Fatihah
    (36, "036"),   # Yaseen
    (55, "055"),   # Ar-Rahman
    (56, "056"),   # Al-Waqiah
    (67, "067"),   # Al-Mulk
]
QURAN_RECITER = "ar.abdulbasitmurattal"
QURAN_BITRATE = 128


def quran_urls(surah: int, padded: str) -> list[str]:
    return [
        f"https://cdn.islamic.network/quran/audio-surah/{QURAN_BITRATE}/{QURAN_RECITER}/{surah}.mp3",
        f"https://server8.mp3quran.net/basit/{padded}.mp3",
    ]


# ---------- helpers ----------

def info(msg: str) -> None: print(f"[ * ] {msg}")
def ok(msg: str)   -> None: print(f"[ OK ] {msg}")
def warn(msg: str) -> None: print(f"[ ! ] {msg}")
def fail(msg: str) -> None: print(f"[FAIL] {msg}", file=sys.stderr)


def human_size(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024  # type: ignore
    return f"{n:.1f} TB"


def download_one(url: str, dest: Path, timeout: int = 60) -> bool:
    """Download a single URL to dest. Returns True on success."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            total = int(resp.headers.get("Content-Length") or 0)
            tmp = dest.with_suffix(dest.suffix + ".part")
            written = 0
            start = time.time()
            with open(tmp, "wb") as fh:
                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    fh.write(chunk)
                    written += len(chunk)
                    if total:
                        pct = written / total * 100
                        print(f"\r        {dest.name}: {human_size(written)} / {human_size(total)} ({pct:5.1f}%)",
                              end="", flush=True)
                    else:
                        print(f"\r        {dest.name}: {human_size(written)}", end="", flush=True)
            tmp.replace(dest)
            elapsed = time.time() - start
            print()
            ok(f"{dest.name} <- {url}   ({human_size(written)} in {elapsed:.1f}s)")
            return True
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
        print()
        warn(f"  failed: {url}  ({e})")
        return False
    except Exception as e:
        print()
        warn(f"  unexpected error from {url}: {e}")
        return False


def download_with_fallback(name: str, mirrors: Iterable[str], dest: Path) -> bool:
    """Try each mirror until one succeeds."""
    info(f"Fetching {name} ...")
    for url in mirrors:
        if download_one(url, dest):
            return True
    fail(f"All mirrors failed for {name}.")
    return False


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


# ---------- main ----------

def main() -> None:
    parser = argparse.ArgumentParser(description="Download default Azan + Quran starter pack")
    parser.add_argument("--force", action="store_true", help="Re-download files that already exist.")
    parser.add_argument("--azan-only", action="store_true", help="Only download Azan files.")
    parser.add_argument("--quran-only", action="store_true", help="Only download Quran files.")
    args = parser.parse_args()

    print("=" * 60)
    print(" Default asset downloader — Azan + Quran starter pack")
    print("=" * 60)

    web_dir = PUBLIC_DIR.parent
    if not web_dir.is_dir():
        fail(f"Web project folder not found: {web_dir}")
        fail("Make sure the islamic-smart-assistant/web folder exists.")
        sys.exit(1)

    # Next.js doesn't require a public/ folder, so create it on demand.
    ensure_dir(PUBLIC_DIR)
    ensure_dir(AZAN_DIR)
    ensure_dir(QURAN_DIR)

    succeeded = 0
    skipped = 0
    failed = 0

    if not args.quran_only:
        info(f"Azan target: {AZAN_DIR}")
        for filename, mirrors in AZAN_FILES:
            dest = AZAN_DIR / filename
            if dest.exists() and not args.force:
                ok(f"{filename} already exists ({human_size(dest.stat().st_size)}) — skipping")
                skipped += 1
                continue
            if download_with_fallback(filename, mirrors, dest):
                succeeded += 1
            else:
                failed += 1

    if not args.azan_only:
        info(f"Quran target: {QURAN_DIR}")
        for surah, padded in QURAN_SURAHS:
            filename = f"{padded}_abdulbasit.mp3"
            dest = QURAN_DIR / filename
            if dest.exists() and not args.force:
                ok(f"{filename} already exists ({human_size(dest.stat().st_size)}) — skipping")
                skipped += 1
                continue
            if download_with_fallback(f"Surah {surah} ({filename})", quran_urls(surah, padded), dest):
                succeeded += 1
            else:
                failed += 1

    print()
    print("-" * 60)
    print(f" Done. {succeeded} downloaded, {skipped} skipped, {failed} failed.")
    print(f" Azan files  -> {AZAN_DIR}")
    print(f" Quran files -> {QURAN_DIR}")
    print("-" * 60)
    if failed:
        print(" Note: a few mirrors may be blocked or rate-limited. The web app still")
        print(" streams everything from the islamic.network CDN as a live fallback, so")
        print(" the Quran page works regardless. Re-run later to fill in the gaps.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted.")
        sys.exit(130)
