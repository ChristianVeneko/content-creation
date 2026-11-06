"""encode.py FOLDER : FOLDER/frames + FOLDER/mix.wav -> FOLDER/<folder>.mp4 (the phone copy: H.264 + AAC, under 10 MB),
FOLDER/<folder>_master.mp4 (high quality),
FOLDER/sheet.jpg (frame 0, then one frame every 3 s) and a pacing check (cuts per 10 s, longest still).
needs: pip install numpy imageio-ffmpeg"""
import os, re, shutil, subprocess, sys
import numpy as np
def ffmpeg():
    if os.environ.get("FFMPEG"): return os.environ["FFMPEG"]
    if shutil.which("ffmpeg"): return shutil.which("ffmpeg")
    import imageio_ffmpeg; return imageio_ffmpeg.get_ffmpeg_exe()
FF = ffmpeg()
part = os.path.normpath(os.path.abspath(sys.argv[1])); name = os.path.basename(part) + ".mp4"
out = os.path.join(part, name)
import wave
with wave.open(os.path.join(part, "mix.wav")) as w: need = int(w.getnframes() / w.getframerate() * 30)
have = len([n for n in os.listdir(os.path.join(part, "frames")) if n.endswith(".jpg")])
if have < need - 3: sys.exit(f"STOP: frames/ has {have} frames but the sound needs {need}: the render stopped early, render again")
for crf in (22, 24, 26, 28, 30):
    subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(part, "frames", "f%05d.jpg"),
                    "-i", os.path.join(part, "mix.wav"), "-vf", "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p",
                    "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-maxrate", "1100k", "-bufsize", "2200k",
                    "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv",
                    "-c:a", "aac", "-b:a", "128k", "-shortest", "-movflags", "+faststart", out], check=True)
    mb = os.path.getsize(out) / 1e6
    if mb < 10: break
subprocess.run([FF, "-y", "-loglevel", "error", "-framerate", "30", "-i", os.path.join(part, "frames", "f%05d.jpg"), "-i", os.path.join(part, "mix.wav"),
                "-vf", "scale=out_range=tv:out_color_matrix=bt709,format=yuv420p", "-c:v", "libx264", "-preset", "slow", "-crf", "20",
                "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv", "-c:a", "aac", "-b:a", "192k", "-shortest",
                "-movflags", "+faststart", out[:-4] + "_master.mp4"], check=True)
rows = -(-len(os.listdir(os.path.join(part, "frames"))) // 540)
subprocess.run([FF, "-y", "-loglevel", "error", "-i", out, "-vf", rf"select='not(mod(n\,90))',scale=270:-1,tile=6x{rows}",
                "-frames:v", "1", "-fps_mode", "vfr", os.path.join(part, "sheet.jpg")], check=True)
info = subprocess.run([FF, "-hide_banner", "-i", out, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
dur = re.search(r"Duration: (\d+):(\d+):([\d.]+)", info); secs = int(dur.group(2)) * 60 + float(dur.group(3))
lufs = re.findall(r"I:\s+(-?[\d.]+) LUFS", info)
print(f"{name}: {secs:.1f} s, {mb:.1f} MB (crf {crf}), loudness {lufs[-1] if lufs else '?'} LUFS, contact sheet: sheet.jpg")
# pacing: how often the picture cuts, and where nothing on screen moves at all
raw = subprocess.run([FF, "-loglevel", "error", "-i", out, "-vf", "fps=10,scale=54:96,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, 96, 54).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
cuts = []
for i in np.where(d > 14)[0]:
    if not cuts or (i + 1) / 10 - cuts[-1] > 0.25: cuts.append((i + 1) / 10)
stills, start = [], None
for i, s in enumerate(np.append(d < 0.35, False)):
    if s and start is None: start = i
    if not s and start is not None:
        if (i - start) / 10 > 2.5: stills.append(f"{start / 10:.1f}-{i / 10:.1f} s")
        start = None
gaps = [f"{a:.1f}-{b:.1f} s" for a, b in zip([0.0] + cuts, cuts + [secs]) if b - a > 5.0]
per10 = len(cuts) / secs * 10
print(f"pacing: {per10:.1f} cuts per 10 s (aim for 3.3 or more: a new shot every 1.5 to 3 s)")
if per10 < 2.5 or stills or gaps:
    if stills: print("PACING WARNING: nothing moves at " + ", ".join(stills) + ": add a move or a card there")
    if gaps: print("PACING WARNING: no cut for over 5 s at " + ", ".join(gaps) + ": cut to a new picture there")
    if per10 < 2.5: print("PACING WARNING: too few cuts overall: give more lines their own shot")
else:
    print("pacing OK")
