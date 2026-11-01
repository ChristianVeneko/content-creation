#!/usr/bin/env python3
"""Build the curated music library in 03-assets/music/ (maintainer tool, run once or to refresh).

Sources (both license-clear and allow direct download):
  * Incompetech (Kevin MacLeod), CC BY 4.0: hand-picked titles per mood from the public catalog
    https://incompetech.com/music/royalty-free/pieces.json
  * Openverse audio API (optional, --openverse): only CC0 / CC BY results; anything else is skipped.

Every downloaded track is listen-checked programmatically and rejected when it is shorter than 60 s,
clips, has a long silent gap, or contains vocals (demucs two-stem separation on an excerpt).
Accepted tracks get beat cues (brag's analyze_music_cues.py) in <mood>/cues/ and an entry in library.json.

Usage (from anywhere, after `source env.sh`):
  python 07-studio/engine/scripts/music-fetch.py [--per-mood 5] [--openverse] [--skip-vocal-check]
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

CC_ROOT = Path(os.environ.get("CC_ROOT", Path(__file__).resolve().parents[3]))
MUSIC = CC_ROOT / "03-assets" / "music"
CUES_PY = CC_ROOT / "05-tools" / "repos" / "brag" / "skills" / "brag" / "scripts" / "analyze_music_cues.py"
PY = sys.executable
UA = {"User-Agent": "video-studio-music-fetch/1.0 (local content tool)"}

INCOMPETECH_CATALOG = "https://incompetech.com/music/royalty-free/pieces.json"
INCOMPETECH_MP3 = "https://incompetech.com/music/royalty-free/mp3-royaltyfree/"
CC_BY_4 = "https://creativecommons.org/licenses/by/4.0/"

# Hand-picked per mood, best first. More candidates than needed so rejects can be replaced.
CURATED = {
    "tech-lofi": ["Chill Wave", "Late Night Radio", "Study And Relax", "ZigZag", "Pleasant Porridge", "Screen Saver"],
    "cinematic-epic": ["Undaunted", "Hiding Your Reality", "Rynos Theme", "Urban Gauntlet", "The Descent", "Full On"],
    "tense-mystery": ["I Can Feel it Coming", "Constance", "Invariance", "Scissors", "Enter the Maze", "Thunder Dreams"],
    "inspiring-uplifting": ["Inspired", "Newer Wave", "Life of Riley", "Carefree", "Montauk Point", "Neon Laser Horizon"],
    "minimal-ambient": ["Mana Two - Part 1", "Mana Two - Part 3", "Mirage", "Airship Serenity", "Energizing", "Screen Saver"],
    "upbeat-fun": ["Cloud Dancer", "Paradise Found", "Voxel Revolution", "Island Meet and Greet", "Blippy Trance", "Glitter Blast"],
}
OPENVERSE_QUERIES = {
    "tech-lofi": "lofi instrumental",
    "cinematic-epic": "epic cinematic orchestral",
    "tense-mystery": "suspense tension",
    "inspiring-uplifting": "uplifting inspiring",
    "minimal-ambient": "ambient calm",
    "upbeat-fun": "happy upbeat",
}
ALLOWED_OPENVERSE = {"cc0", "by"}
VOCAL_WORDS = re.compile(r"voice|vocal|choir|sing|chant|lyrics|rap\b", re.I)


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def get(url: str, timeout: int = 60) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
        return r.read()


def secs(length: str) -> int:
    h, m, s = (int(x) for x in length.split(":"))
    return h * 3600 + m * 60 + s


def check_audio(path: Path, skip_vocals: bool) -> tuple[dict, str | None]:
    """Return (stats, reject_reason|None)."""
    import librosa
    import numpy as np

    y, sr = librosa.load(path, sr=22050, mono=True)
    dur = len(y) / sr
    stats = {"durationSec": round(dur, 2)}
    if dur < 60:
        return stats, f"too short ({dur:.0f}s)"
    clip = float(np.mean(np.abs(y) >= 0.995))
    stats["clipRatio"] = round(clip, 5)
    if clip > 0.002:
        return stats, f"clipping ({clip:.3%} samples at full scale)"
    # long silence inside the first 90 s (what a short video uses)
    hop = 512
    rms = librosa.feature.rms(y=y[: sr * 90], hop_length=hop)[0]
    rms_db = 20 * np.log10(np.maximum(rms, 1e-9))
    silent = rms_db < -50
    run = best = 0
    for v in silent[int(1.0 * sr / hop):]:
        run = run + 1 if v else 0
        best = max(best, run)
    gap = best * hop / sr
    stats["longestSilenceSec"] = round(gap, 2)
    if gap > 3.0:
        return stats, f"silent gap of {gap:.1f}s"
    tempo, _ = librosa.beat.beat_track(y=y[: sr * 90], sr=sr)
    stats["bpm"] = round(float(np.asarray(tempo).reshape(-1)[0]), 1)
    if not skip_vocals:
        ratio = vocal_ratio(path, dur)
        stats["vocalRatioDb"] = ratio
        if ratio is not None and ratio > -14:
            return stats, f"vocals detected (vocal stem {ratio} dB vs mix)"
    return stats, None


def vocal_ratio(path: Path, dur: float) -> float | None:
    """Vocal-stem energy relative to the full mix (dB) on a 40 s excerpt, via demucs --two-stems vocals."""
    import numpy as np
    import soundfile as sf

    tmp = Path(tempfile.mkdtemp(prefix="music-vocals-"))
    try:
        exc = tmp / "excerpt.wav"
        start = min(20.0, max(0.0, dur - 45))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(start), "-t", "40", "-i", str(path), "-ac", "2", "-ar", "44100", str(exc)], check=True)
        r = subprocess.run([PY, "-m", "demucs", "--two-stems", "vocals", "-n", "htdemucs", "-o", str(tmp / "sep"), str(exc)], capture_output=True, text=True)
        if r.returncode != 0:
            print(f"    demucs failed: {r.stderr.strip()[-200:]}", file=sys.stderr)
            return None
        voc, _ = sf.read(next((tmp / "sep").rglob("vocals.wav")))
        mix, _ = sf.read(exc)
        e = lambda a: float(np.sqrt(np.mean(np.square(a))) + 1e-9)
        return round(20 * np.log10(e(voc) / e(mix)), 1)
    finally:
        subprocess.run(["rm", "-rf", str(tmp)])


def write_cues(mp3: Path) -> None:
    cues = mp3.parent / "cues"
    stem = mp3.stem
    subprocess.run([PY, str(CUES_PY), str(mp3), "--output-json", str(cues / f"{stem}.music-cues.json"), "--output-md", str(cues / f"{stem}.music-cues.md")], check=True, capture_output=True)


def incompetech_candidates() -> dict[str, dict]:
    catalog = json.loads(get(INCOMPETECH_CATALOG))
    return {p["title"]: p for p in catalog}


def openverse_candidates(mood: str, limit: int = 6) -> list[dict]:
    q = urllib.parse.urlencode({"q": OPENVERSE_QUERIES[mood], "category": "music", "license": "cc0,by", "page_size": limit * 3})
    try:
        data = json.loads(get(f"https://api.openverse.org/v1/audio/?{q}", timeout=45))
    except Exception as e:  # noqa: BLE001 - optional source
        print(f"  openverse unavailable for {mood}: {e}", file=sys.stderr)
        return []
    out = []
    for r in data.get("results", []):
        lic = (r.get("license") or "").lower()
        if lic not in ALLOWED_OPENVERSE:  # never NC / ND / SA
            continue
        if VOCAL_WORDS.search(f"{r.get('title','')} {' '.join(t.get('name','') for t in r.get('tags') or [])}"):
            continue
        if (r.get("duration") or 0) < 60000 or not r.get("url"):
            continue
        out.append(r)
    return out[:limit]


def credit_incompetech(title: str) -> str:
    return f"{title} Kevin MacLeod (incompetech.com) Licensed under Creative Commons: By Attribution 4.0 License http://creativecommons.org/licenses/by/4.0/"


def ende_entries() -> list[dict]:
    """Keep the original ende.app pack as mood corporate-happy."""
    pack = MUSIC / "ende-happy-beats"
    out = []
    for mp3 in sorted(pack.glob("*.mp3")):
        cues = pack / "cues" / f"{mp3.stem}.music-cues.json"
        meta = json.loads(cues.read_text()) if cues.exists() else {}
        vol = re.search(r"vol-(\d+)", mp3.stem)
        out.append({
            "id": mp3.stem,
            "mood": "corporate-happy",
            "title": f"Happy Beats: Business Moves Vol. {vol.group(1) if vol else ''}".strip(),
            "artist": "ende.app",
            "file": str(mp3.relative_to(MUSIC)),
            "durationSec": round(meta.get("duration", 0), 2),
            "bpm": round(meta.get("tempo", 0), 1) or None,
            "license": "CC BY 4.0",
            "licenseUrl": CC_BY_4,
            "sourceUrl": "https://ende.app",
            "credit": "Music: ende.app (CC BY 4.0)",
        })
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--per-mood", type=int, default=5)
    ap.add_argument("--openverse", action="store_true", help="also try Openverse CC0/CC BY results")
    ap.add_argument("--skip-vocal-check", action="store_true")
    args = ap.parse_args()

    lib_file = MUSIC / "library.json"
    existing = {t["id"]: t for t in json.loads(lib_file.read_text())} if lib_file.exists() else {}
    catalog = incompetech_candidates()
    library = ende_entries()
    rejected = []
    used = set()
    for mood, titles in CURATED.items():
        dest = MUSIC / mood
        dest.mkdir(parents=True, exist_ok=True)
        cands = [("incompetech", catalog[t]) for t in titles if t in catalog]
        if args.openverse:
            cands += [("openverse", r) for r in openverse_candidates(mood)]
        kept = 0
        for source, c in cands:
            if kept >= args.per_mood:
                break
            if source == "incompetech":
                title, artist = c["title"], "Kevin MacLeod"
                if VOCAL_WORDS.search(c.get("instruments") or "") or secs(c["length"]) < 60:
                    continue
                url = INCOMPETECH_MP3 + urllib.parse.quote(c["filename"])
                tid = f"incompetech-{slug(title)}"
                meta = {"license": "CC BY 4.0", "licenseUrl": CC_BY_4, "sourceUrl": f"https://incompetech.com/music/royalty-free/index.html?isrc={c.get('isrc','')}", "credit": credit_incompetech(title)}
            else:
                title, artist = c["title"], c.get("creator") or "Unknown"
                url = c["url"]
                tid = f"openverse-{slug(title)[:40]}-{c['id'][:6]}"
                lic = "CC0 1.0" if c["license"] == "cc0" else f"CC BY {c.get('license_version') or '4.0'}"
                credit = f'"{title}" by {artist} ({c.get("foreign_landing_url")}) licensed under {lic}' if c["license"] != "cc0" else f'"{title}" by {artist} (CC0)'
                meta = {"license": lic, "licenseUrl": c.get("license_url"), "sourceUrl": c.get("foreign_landing_url"), "credit": credit}
            if tid in used:
                continue
            mp3 = dest / f"{tid}.mp3"
            print(f"[{mood}] {title} ({source})", file=sys.stderr)
            try:
                if not mp3.exists():
                    mp3.write_bytes(get(url, timeout=120))
                stats, reason = (existing[tid] | {"durationSec": existing[tid]["durationSec"]}, None) if tid in existing and existing[tid]["mood"] == mood else check_audio(mp3, args.skip_vocal_check)
            except Exception as e:  # noqa: BLE001
                stats, reason = {}, f"download/analysis failed: {e}"
            if reason:
                print(f"    rejected: {reason}", file=sys.stderr)
                rejected.append({"mood": mood, "title": title, "source": source, "reason": reason})
                mp3.unlink(missing_ok=True)
                continue
            write_cues(mp3)
            used.add(tid)
            kept += 1
            library.append({
                "id": tid,
                "mood": mood,
                "title": title,
                "artist": artist,
                "file": str(mp3.relative_to(MUSIC)),
                "durationSec": stats["durationSec"],
                "bpm": stats.get("bpm"),
                **meta,
                **({"check": {k: stats[k] for k in ("clipRatio", "longestSilenceSec", "vocalRatioDb") if k in stats}} if "clipRatio" in stats else ({"check": existing[tid].get("check")} if tid in existing and existing[tid].get("check") else {})),
            })
    lib_file.write_text(json.dumps(library, indent=2, ensure_ascii=False) + "\n")
    (MUSIC / "rejected.json").write_text(json.dumps(rejected, indent=2, ensure_ascii=False) + "\n")
    counts = {}
    for t in library:
        counts[t["mood"]] = counts.get(t["mood"], 0) + 1
    print(json.dumps({"tracks": len(library), "perMood": counts, "rejected": len(rejected)}))


if __name__ == "__main__":
    main()
