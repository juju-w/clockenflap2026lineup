"""Refresh web-only large images from the recorded photograph/artwork sources.

Requires ffmpeg/ffprobe; never enlarges a low-resolution source.
The offline bundle does not include this directory or its image references.
"""
from pathlib import Path
from urllib.request import Request, urlopen
from concurrent.futures import ThreadPoolExecutor, as_completed
import json, shutil, subprocess, tempfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'web-assets'

def dimensions(path):
    result = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
        '-show_entries', 'stream=width,height', '-of', 'json', str(path)],
        capture_output=True, text=True, check=True, timeout=15)
    stream = json.loads(result.stdout)['streams'][0]
    return [stream['width'], stream['height']]

def prepare(record):
    filename = Path(record['thumbnail']).name
    destination = OUT / 'images' / filename
    with tempfile.TemporaryDirectory(prefix='cf-large-') as directory:
        source = Path(directory) / 'original'
        request = Request(record['source'], headers={'User-Agent': 'Mozilla/5.0'})
        with urlopen(request, timeout=30) as response, source.open('wb') as output:
            shutil.copyfileobj(response, output)
        original = dimensions(source)
        quality = '90' if record['kind'] == 'album' else '88'
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
            '-vf', "scale='min(1600,iw)':'min(1600,ih)':force_original_aspect_ratio=decrease",
            '-frames:v', '1', '-c:v', 'libwebp', '-compression_level', '6', '-q:v', quality,
            str(destination)], check=True, timeout=30)
    result = dict(record, large='assets/large/' + filename, dimensions=dimensions(destination),
                  sourceDimensions=original, bytes=destination.stat().st_size)
    return result

def main():
    records = json.loads((OUT / 'sources.json').read_text())
    (OUT / 'images').mkdir(parents=True, exist_ok=True)
    results, failures = [], []
    with ThreadPoolExecutor(max_workers=4) as pool:
        pending = {pool.submit(prepare, record): record for record in records}
        for future in as_completed(pending):
            record = pending[future]
            try:
                result = future.result(); results.append(result)
                print(record['thumbnail'], result['dimensions'], flush=True)
            except Exception as error:
                failures.append(dict(record, error=str(error)))
                print('FAILED', record['thumbnail'], str(error), flush=True)
    (OUT / 'manifest.json').write_text(json.dumps(sorted(results, key=lambda r:r['thumbnail']),
        ensure_ascii=False, indent=2) + '\n')
    (OUT / 'failures.json').write_text(json.dumps(failures, ensure_ascii=False, indent=2) + '\n')
    print('Prepared', len(results), 'large images;', len(failures), 'failures.', flush=True)
    if failures: raise SystemExit(1)

if __name__ == '__main__': main()
