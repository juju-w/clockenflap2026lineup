"""Build a static website or offline Xiaohongshu bundle, with no dependencies."""
from pathlib import Path
from html.parser import HTMLParser
import argparse, shutil, re, zipfile, hashlib, json
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = ['index.html', 'style.css', 'app.js', 'data.js', 'locales.js', 'compat.js', 'icon.svg']

class References(HTMLParser):
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'script' and ('type' in attrs or 'src' not in attrs):
            raise ValueError('Scripts must be external classic scripts')
        if any(k.startswith('on') for k in attrs):
            raise ValueError('Inline event handlers are not allowed')
        if tag in ('iframe', 'object', 'base'):
            raise ValueError('Unsupported embedded content')
        for key in ('src', 'href'):
            ref = attrs.get(key, '')
            if not ref: continue
            if ref.startswith(('http:', 'https:', '/', 'javascript:')):
                raise ValueError('Non-local runtime reference: ' + ref)
            if ref.startswith('./') and not (self.folder / urlsplit(ref).path).exists():
                raise ValueError('Missing runtime reference: ' + ref)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('target', choices=['web', 'xhs'])
    args = parser.parse_args()
    output = ROOT / 'dist' / args.target
    if output.exists(): shutil.rmtree(output)
    output.mkdir(parents=True)
    for name in RUNTIME + ['platform-' + args.target + '.js']:
        shutil.copy2(ROOT / name, output / name)
    shutil.copytree(ROOT / 'assets', output / 'assets')
    if args.target == 'xhs':
        entry = output / 'index.html'
        entry.write_text(entry.read_text().replace('platform-web.js', 'platform-xhs.js'))
    else:
        manifest = json.loads((ROOT / 'web-assets' / 'manifest.json').read_text())
        large = {record['thumbnail']: record['large'] for record in manifest}
        shutil.copytree(ROOT / 'web-assets' / 'images', output / 'assets' / 'large')
        data_file = output / 'data.js'
        payload = json.loads(data_file.read_text().split('=', 1)[1].strip().removesuffix(';'))
        for artist in payload['artists']:
            if artist['avatar'] in large: artist['avatarLarge'] = large[artist['avatar']]
            for album in artist['albums']:
                if album['cover'] in large: album['coverLarge'] = large[album['cover']]
        data_file.write_text('window.LINEUP_DATA=' + json.dumps(payload, ensure_ascii=False,
            separators=(',', ':')) + ';\n')
        # Pages caches scripts independently of HTML. A changed file gets a fresh URL.
        entry = output / 'index.html'
        def version(match):
            ref = match.group(2)
            digest = hashlib.sha256((output / ref).read_bytes()).hexdigest()[:12]
            return match.group(1) + ref + '?v=' + digest + match.group(3)
        entry.write_text(re.sub(r'((?:src|href)=")([.]/[^"?]+\.(?:js|css))(\")', version, entry.read_text()))
    check = References(); check.folder = output; check.feed((output / 'index.html').read_text())
    payload = json.loads((output / 'data.js').read_text().split('=', 1)[1].strip().removesuffix(';'))
    for artist in payload['artists']:
        refs = [artist['avatar']] + [album['cover'] for album in artist['albums']]
        extras = [artist.get('avatarLarge')] + [album.get('coverLarge') for album in artist['albums']]
        if args.target == 'xhs' and (any(extras) or (output / 'assets' / 'large').exists()):
            raise ValueError('Web large images must not enter the offline bundle')
        for ref in refs + [ref for ref in extras if ref]:
            if not ref.startswith('assets/') or '..' in ref or not (output / ref).is_file():
                raise ValueError('Invalid image reference: ' + ref)
    files = sorted(p for p in output.rglob('*') if p.is_file())
    if len(files) > 200: raise ValueError('More than 200 runtime files')
    for path in files:
        if path.suffix not in {'.html','.css','.js','.json','.svg','.webp','.jpg','.jpeg','.png','.gif','.woff','.woff2'}:
            raise ValueError('Unsupported runtime file: ' + str(path))
        if path.is_symlink(): raise ValueError('Symlinks are not allowed')
    if args.target == 'xhs':
        js = '\n'.join(p.read_text() for p in files if p.suffix == '.js')
        for pattern in [r'navigator\.clipboard', r'execCommand\s*\(', r'\bfetch\s*\(', r'XMLHttpRequest', r'new\s+(?:Worker|SharedWorker|WebSocket|EventSource)', r'window\.(?:open|prompt)\s*\(', r'\beval\s*\(', r'new\s+Function\s*\(', r'WebAssembly\.', r'\.download\s*=']:
            if re.search(pattern, js): raise ValueError('Forbidden container capability: ' + pattern)
        if re.search(r'<a\b[^>]*\bdownload', (output/'index.html').read_text()):
            raise ValueError('Downloads are not allowed in the offline container')
    archive = ROOT / 'dist' / ('clockenflap2026lineup-' + args.target + '.zip')
    with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path in files: z.write(path, path.relative_to(output))
    size = archive.stat().st_size
    if args.target == 'xhs' and size > 10*1024*1024: raise ValueError('ZIP exceeds 10 MiB')
    print(f'{args.target}: {len(files)} files, {size/1024/1024:.2f} MiB, {archive}')
    if args.target == 'xhs' and size > 2*1024*1024: print('WARN: above the recommended 2 MiB budget; images retained for readability.')

if __name__ == '__main__': main()
