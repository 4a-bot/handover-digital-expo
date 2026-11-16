"""Check generated asset paths and standalone tools without installing packages."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import subprocess, tempfile

ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
errors=[]
class Inspect(HTMLParser):
    def __init__(self):
        super().__init__(); self.refs=[]; self.script=False; self.inline=[]; self.code=[]; self.external=[]
    def handle_starttag(self,tag,attrs):
        attrs=dict(attrs)
        for key in ('src','href'):
            if attrs.get(key): self.refs.append(attrs[key])
        if tag=='script':
            self.script=True; self.code=[]
            if attrs.get('src'): self.external.append(attrs['src'])
        if tag=='link' and attrs.get('rel')=='stylesheet': self.external.append(attrs.get('href'))
    def handle_data(self,data):
        if self.script:self.code.append(data)
    def handle_endtag(self,tag):
        if tag=='script':self.inline.append(''.join(self.code));self.script=False

files=list(DIST.rglob('*.html'))
for page in files:
    parser=Inspect();parser.feed(page.read_text())
    for ref in parser.refs:
        path=urlsplit(ref)
        if path.scheme or path.netloc or not path.path: continue
        target=(page.parent/unquote(path.path)).resolve()
        if not target.is_relative_to(DIST.resolve()): errors.append(f'{page}: escapes project: {ref}')
        elif not target.exists(): errors.append(f'{page}: missing asset: {ref}')
    if page.name.endswith('-offline.html') and parser.external:
        errors.append(f'{page}: offline tool has external assets: {parser.external}')
    with tempfile.TemporaryDirectory() as folder:
        for i,code in enumerate(parser.inline):
            if not code.strip():continue
            test=Path(folder)/f'inline-{i}.js';test.write_text(code)
            result=subprocess.run(['node','--check',str(test)],capture_output=True,text=True)
            if result.returncode:errors.append(f'{page}: inline JS syntax: {result.stderr}')
if errors:raise SystemExit('\n'.join(errors))
print(f'PASS: {len(files)} HTML documents; asset paths resolve inside dist; offline tools contain no external script or stylesheet; inline JavaScript parses.')
