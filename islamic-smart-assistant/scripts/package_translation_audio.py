"""
Package per-language translation audio into ZIP archives for GitHub Releases.

Reads:  desktop/resources/audio/{lang}/{N}.mp3   (generated locally, gitignored)
Writes: desktop/resources/audio-dist/{lang}.zip  (upload targets, gitignored)

MP3 is already compressed, so we store (no re-compression) — fast, same size.

Usage:
    python scripts/package_translation_audio.py            # package all languages
    python scripts/package_translation_audio.py de es uz   # package specific ones

After packaging, upload to the PUBLIC audio repo's release (see README /
the assistant's hand-off notes):
    gh release upload audio-v1 desktop/resources/audio-dist/*.zip \
        --repo ShahbazAli206/Islamic_Assistant_Audio
"""

import os
import sys
import zipfile

HERE     = os.path.dirname(os.path.abspath(__file__))
ROOT     = os.path.dirname(HERE)                         # islamic-smart-assistant/
AUDIO    = os.path.join(ROOT, 'desktop', 'resources', 'audio')
DIST     = os.path.join(ROOT, 'desktop', 'resources', 'audio-dist')

# Languages that have CDN audio elsewhere and are NOT packaged here.
SKIP = {'audio-dist'}


def package_lang(lang: str) -> tuple[int, int]:
    src = os.path.join(AUDIO, lang)
    if not os.path.isdir(src):
        print(f"  [skip] {lang}: no directory")
        return (0, 0)
    files = sorted(
        (f for f in os.listdir(src) if f.endswith('.mp3')),
        key=lambda f: int(f[:-4]) if f[:-4].isdigit() else 0,
    )
    if not files:
        print(f"  [skip] {lang}: no mp3 files")
        return (0, 0)

    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, f'{lang}.zip')
    tmp = out + '.tmp'
    total_bytes = 0
    # ZIP_STORED: no compression (mp3 is already compressed) -> fast, robust.
    with zipfile.ZipFile(tmp, 'w', compression=zipfile.ZIP_STORED) as z:
        for i, f in enumerate(files, 1):
            fp = os.path.join(src, f)
            total_bytes += os.path.getsize(fp)
            z.write(fp, arcname=f)          # flat: "1.mp3" at archive root
            if i % 1000 == 0 or i == len(files):
                print(f"    {lang}: {i}/{len(files)}", flush=True)
    os.replace(tmp, out)
    zip_mb = os.path.getsize(out) / (1024 * 1024)
    print(f"  [ok]  {lang}: {len(files)} files -> {lang}.zip ({zip_mb:.0f} MB)")
    return (len(files), os.path.getsize(out))


def main():
    if not os.path.isdir(AUDIO):
        sys.exit(f"Audio dir not found: {AUDIO}")

    wanted = sys.argv[1:]
    langs = wanted or sorted(
        d for d in os.listdir(AUDIO)
        if os.path.isdir(os.path.join(AUDIO, d)) and d not in SKIP
    )

    print(f"Packaging {len(langs)} language(s) -> {DIST}\n")
    grand_files = grand_bytes = 0
    for lang in langs:
        n, b = package_lang(lang)
        grand_files += n
        grand_bytes += b

    print(f"\nDone. {grand_files:,} files across {len(langs)} zips, "
          f"{grand_bytes / (1024**3):.2f} GB total.")
    print(f"Output: {DIST}")


if __name__ == '__main__':
    main()
