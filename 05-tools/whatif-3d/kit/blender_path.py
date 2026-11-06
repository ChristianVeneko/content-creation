"""blender_path.py: print the path of a Blender 4.2+ that runs here, installing a portable copy if there is none.
  python kit/blender_path.py           -> prints the blender executable (use it as BLENDER in every command)
Looks in: $BLENDER, PATH, the usual install folders, ./blender/. Otherwise downloads the official portable build
from download.blender.org (free, no account, ~350 MB) into ./blender/ (Windows zip / Linux tar.xz).
On a Mac it asks you to install Blender from blender.org instead (a .dmg can't be unpacked silently)."""
import glob, os, platform, re, shutil, subprocess, sys, tarfile, urllib.request, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL = os.path.join(ROOT, "blender")


def ok(p):
    try:
        out = subprocess.run([p, "-b", "--factory-startup", "--version"], capture_output=True, text=True, timeout=120).stdout
        m = re.search(r"Blender (\d+)\.(\d+)", out)
        return m and (int(m.group(1)), int(m.group(2))) >= (4, 2)
    except Exception:
        return False


def candidates():
    if os.environ.get("BLENDER"): yield os.environ["BLENDER"]
    if shutil.which("blender"): yield shutil.which("blender")
    pats = [os.path.join(LOCAL, "**", "blender.exe"), os.path.join(LOCAL, "**", "blender")]
    if platform.system() == "Windows":
        pats += [r"C:\Program Files\Blender Foundation\*\blender.exe", os.path.expandvars(r"%LOCALAPPDATA%\Programs\Blender Foundation\*\blender.exe"),
                 r"C:\Program Files (x86)\Steam\steamapps\common\Blender\blender.exe"]
    elif platform.system() == "Darwin":
        pats += ["/Applications/Blender*.app/Contents/MacOS/Blender"]
    else:
        pats += ["/usr/bin/blender", "/snap/bin/blender", os.path.expanduser("~/blender*/blender")]
    for pat in pats:
        for p in sorted(glob.glob(pat, recursive=True), reverse=True):
            if os.path.isfile(p): yield p


for p in candidates():
    if ok(p):
        print(p); sys.exit(0)

sysname = platform.system()
if sysname == "Darwin":
    sys.exit("No Blender found. Install Blender 5.x from https://www.blender.org/download/ (free), then run this again.")
base = "https://download.blender.org/release/Blender5.2/"
listing = urllib.request.urlopen(base, timeout=60).read().decode()
arch = "windows-x64.zip" if sysname == "Windows" else "linux-x64.tar.xz"
files = sorted(set(re.findall(r'href="(blender-5\.2\.\d+-' + re.escape(arch) + ')"', listing)), key=lambda s: int(re.search(r"5\.2\.(\d+)", s).group(1)))
if not files: sys.exit("could not find a portable Blender on download.blender.org")
url = base + files[-1]
os.makedirs(LOCAL, exist_ok=True)
dst = os.path.join(LOCAL, files[-1])
print("downloading", url, "(once, ~350 MB)", file=sys.stderr)
urllib.request.urlretrieve(url, dst + ".part"); os.replace(dst + ".part", dst)
if dst.endswith(".zip"):
    zipfile.ZipFile(dst).extractall(LOCAL)
else:
    tarfile.open(dst).extractall(LOCAL)
os.remove(dst)
for p in candidates():
    if ok(p):
        print(p); sys.exit(0)
sys.exit("Blender was downloaded but doesn't start; check the GPU driver.")
