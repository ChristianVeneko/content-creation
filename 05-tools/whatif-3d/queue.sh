#!/usr/bin/env bash
# queue.sh PROJECT_DIR... : unattended whatif-3d pipeline, one project after another.
# For each 04-projects/<id>: final render (resumes from frames on disk), sound mix, captions, QA check,
# video.mp4 + platform exports, job stage "ready" and a content-log row. Run from the repo root:
#   05-tools/whatif-3d/queue.sh 04-projects/a 04-projects/b > queue.log 2>&1
# It first waits for any Blender render of these projects that is already running.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
KIT="$ROOT/05-tools/whatif-3d"
PY="$KIT/.venv/bin/python"
BL="$ROOT/05-tools/bin/blender"
source "$ROOT/env.sh"
for P in "$@"; do
  P="${P%/}"; S="$ROOT/$P/story"; id="$(basename "$P")"
  echo "== $(date +%H:%M) $id"
  while pgrep -f "build.py -- .*$id/story" >/dev/null; do sleep 60; done
  rm -rf "$S/stills" "$S/sheet.jpg" "$S/sheet2.jpg"
  (cd "$KIT" && WHATIF_SAMPLES="${WHATIF_SAMPLES:-12}" "$BL" -b --factory-startup --python kit/build.py -- "$S" --final > "$S/render.log" 2>&1)
  echo "   $(date +%H:%M) render: $(tail -n 3 "$S/render.log" | grep -o 'rendered.*' | head -1)"
  "$PY" -I "$KIT/kit/sound.py" "$S" && "$PY" -I "$KIT/kit/finish.py" "$S" || { echo "   finish FAILED"; continue; }
  WHATIF_MAX_S="${WHATIF_MAX_S:-100}" "$PY" -I "$KIT/kit/check.py" "$S" > "$S/check.log" 2>&1; echo "   check: $(tail -n 1 "$S/check.log")"
  cp "$S/final.mp4" "$ROOT/$P/video.mp4"
  "$ROOT/02-scripts/export-platforms.sh" "$ROOT/$P/video.mp4" "$id" > /dev/null 2>&1 && echo "   exported 06-exports/{reels,tiktok,shorts}/$id.mp4"
  node "$ROOT/.claude/skills/canal/jobs.mjs" set "$id" status=done stage=ready > /dev/null 2>&1
  "$PY" -I - "$ROOT/$P" "$ROOT/00-docs/content-log.csv" <<'EOF'
import csv, json, os, re, sys, datetime
p, log = sys.argv[1], sys.argv[2]
sc = json.load(open(os.path.join(p, "story", "script.json"), encoding="utf-8"))
tm = json.load(open(os.path.join(p, "story", "timing.json"), encoding="utf-8"))
title = sc["title"]
post = os.path.join(p, "post.md")
if os.path.exists(post):
    m = re.search(r"^Título:\s*(.+)$", open(post, encoding="utf-8").read(), re.M)
    if m: title = m.group(1).strip()
row = [datetime.date.today().isoformat(), "youtube", title, "whatif-3d (Blender)", sc["lines"][0]["text"], round(tm["voice_end"] + 1), "", "", "", "", "", ""]
with open(log, "a", newline="", encoding="utf-8") as f: csv.writer(f).writerow(row)
EOF
  echo "   $(date +%H:%M) done $id"
done
echo "== $(date +%H:%M) queue finished"
