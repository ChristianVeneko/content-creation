"""Assemble <film>/film.js from the kit template + the project's scenes.js, and enforce the scenery rule:
every scene must draw a SCENERY set (no plain colour rooms). Usage: python3 assemble.py <film dir>"""
import os, re, sys, shutil
F = sys.argv[1]; K = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sc = open(os.path.join(F, 'scenes.js'), encoding='utf-8').read()
bad = []
for m in re.finditer(r"scene\('(\w+)'", sc):
    body = sc[m.end(): sc.find("\nscene('", m.end()) if sc.find("\nscene('", m.end()) > 0 else len(sc)]
    if 'SCENERY.' not in body: bad.append(m.group(1))
if re.search(r'\broom\(|STAGE\.bg\(|STAGE\.cones\(', sc): bad.append('uses room()/STAGE.bg (plain colour background)')
if bad: sys.exit('assemble: scenes without a SCENERY set: ' + ', '.join(bad) + '\n  Pick a set from SCENERY.list (kit/scenery.js) or add one in sets.js with SCENERY.add().')
emph = '[]'
m = re.search(r'//\s*EMPHASIS:\s*(\[.*\])', sc)
if m: emph = m.group(1)
head = open(os.path.join(K, 'template/film.head.js'), encoding='utf-8').read()
extra = open(os.path.join(K, 'kit/props-extra.part.js'), encoding='utf-8').read()
foot = open(os.path.join(K, 'template/film.foot.js'), encoding='utf-8').read().replace('emphasis: EMPHASIS', 'emphasis: ' + emph)
open(os.path.join(F, 'film.js'), 'w', encoding='utf-8').write(head + extra + sc + '\n' + foot)
# keep the kit files in sync inside the film (the page serves them from its own folder)
for f in ['stage.js', 'cast.js', 'props.js', 'scenery.js', 'shorts-captions.js']:
    if not os.path.exists(os.path.join(F, f)) or os.environ.get('KIT_SYNC', '1') == '1':
        shutil.copy(os.path.join(K, 'kit', f), os.path.join(F, f))
# private cast (real people, git-ignored): copied when present, else an empty stub so the page loads
priv = os.path.join(K, 'private', 'cast-people.js')
if os.path.exists(priv): shutil.copy(priv, os.path.join(F, 'cast-people.js'))
elif not os.path.exists(os.path.join(F, 'cast-people.js')): open(os.path.join(F, 'cast-people.js'), 'w').write('// no private cast\n')
if not os.path.exists(os.path.join(F, 'sets.js')): shutil.copy(os.path.join(K, 'template/sets.js'), os.path.join(F, 'sets.js'))
print('assemble: ok,', len(re.findall(r"scene\('", sc)), 'scenes')
