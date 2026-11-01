"""Turn word timestamps into TikTok/Hormozi-style animated captions (.ass) for 1080x1920.

Usage: python karaoke-ass.py words.json out.ass [--words-per-chunk 3] [--font "Montserrat ExtraBold"]
       [--size 88] [--highlight FFE400] [--y 1250] [--upper]
Each chunk shows N words; the word being spoken is colored and pops (scale 115%).
Burn with: 02-scripts/burn-captions.sh video.mp4 out.ass final.mp4
"""
import argparse, json

def ts(t: float) -> str:
    cs = int(round(t * 100)); h, cs = divmod(cs, 360000); m, cs = divmod(cs, 6000); s, cs = divmod(cs, 100)
    return f"{h}:{m:02}:{s:02}.{cs:02}"

def bgr(hex_rgb: str) -> str:
    r, g, b = hex_rgb[0:2], hex_rgb[2:4], hex_rgb[4:6]
    return f"&H00{b}{g}{r}&".upper()

def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("words"); ap.add_argument("out")
    ap.add_argument("--words-per-chunk", type=int, default=3)
    ap.add_argument("--font", default="Montserrat ExtraBold")
    ap.add_argument("--size", type=int, default=88)
    ap.add_argument("--highlight", default="FFE400")
    ap.add_argument("--y", type=int, default=1250, help="baseline Y in px (keep inside the safe zone)")
    ap.add_argument("--upper", action="store_true")
    a = ap.parse_args()
    words = json.load(open(a.words))
    hi = bgr(a.highlight)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Cap,{a.font},{a.size},&H00FFFFFF,&H00FFFFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,3,2,90,90,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    n = a.words_per_chunk
    for c in range(0, len(words), n):
        chunk = words[c:c + n]
        for i, w in enumerate(chunk):
            start = w["start"]
            end = chunk[i + 1]["start"] if i + 1 < len(chunk) else w["end"]
            parts = []
            for j, x in enumerate(chunk):
                t = x["word"].upper() if a.upper else x["word"]
                parts.append(f"{{\\c{hi}\\fscx115\\fscy115}}{t}{{\\c&H00FFFFFF&\\fscx100\\fscy100}}" if j == i else t)
            text = f"{{\\an2\\pos(540,{a.y})}}" + " ".join(parts)
            lines.append(f"Dialogue: 0,{ts(start)},{ts(max(end, start + 0.05))},Cap,,0,0,0,,{text}")
    open(a.out, "w").write(head + "\n".join(lines) + "\n")
    print(f"{len(lines)} events -> {a.out}")

if __name__ == "__main__":
    main()
