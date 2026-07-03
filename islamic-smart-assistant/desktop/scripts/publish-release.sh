#!/bin/sh
# Publish the installer in desktop/dist to the PUBLIC assets repo as a GitHub
# Release (what installed apps auto-update from — see ../RELEASING.md).
#
# Usage (Git Bash, from any directory):  sh desktop/scripts/publish-release.sh ["release notes"]
# Version + tag are read from dist/latest.yml. Auth uses the token stored in
# Git Credential Manager (the same one `git push` uses) — no GH_TOKEN needed.
set -e
REPO="ShahbazAli206/Islamic_Assistant_Audio"
DIST="$(cd "$(dirname "$0")/../dist" && pwd)"
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
[ -n "$TOKEN" ] || { echo "NO TOKEN — log in to GitHub in git first"; exit 1; }

VERSION=$(sed -n 's/^version: //p' "$DIST/latest.yml")
[ -n "$VERSION" ] || { echo "NO VERSION in $DIST/latest.yml — run npm run build:win first"; exit 1; }
EXE=$(sed -n 's/^path: //p' "$DIST/latest.yml")
[ -n "$EXE" ] || { echo "NO path in latest.yml"; exit 1; }
NOTES="${1:-Desktop app v$VERSION.}"
echo "publishing v$VERSION to $REPO ..."

PAYLOAD=$(python -c "import json,sys; print(json.dumps({'tag_name':'v'+sys.argv[1],'name':'Islamic Assistant v'+sys.argv[1],'body':sys.argv[2],'draft':False,'prerelease':False}))" "$VERSION" "$NOTES")
REL_JSON=$(printf '%s' "$PAYLOAD" | curl -sS -X POST -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" -d @- \
  "https://api.github.com/repos/$REPO/releases")
REL_ID=$(printf '%s' "$REL_JSON" | python -c "import json,sys; d=json.load(sys.stdin); print(d.get('id') or '')")
if [ -z "$REL_ID" ]; then echo "RELEASE CREATE FAILED:"; printf '%s\n' "$REL_JSON" | head -20; exit 1; fi
echo "release id: $REL_ID"

upload() {
  NAME="$1"; TYPE="$2"
  echo "uploading $NAME ..."
  curl -sS -X POST -H "Authorization: token $TOKEN" -H "Content-Type: $TYPE" \
    --data-binary "@$DIST/$NAME" \
    "https://uploads.github.com/repos/$REPO/releases/$REL_ID/assets?name=$NAME" \
    | python -c "import json,sys; d=json.load(sys.stdin); print('  ->', d.get('name'), d.get('state'), d.get('size'))"
}

upload "$EXE" "application/octet-stream"
upload "$EXE.blockmap" "application/octet-stream"
upload "latest.yml" "text/yaml"
echo "DONE v$VERSION — verify: https://github.com/$REPO/releases/latest"
