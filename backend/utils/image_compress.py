"""
Image compression utilities for PDF report generation.
Fetches images from URLs, resizes + recompresses to JPEG, returns base64 data URLs.
Drastically reduces final PDF size while preserving print-quality output.
"""
import base64
import io
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image, ImageOps
from requests.adapters import HTTPAdapter
import tempfile
import os

# Per-asset compression presets (max_width_px, jpeg_quality)
PRESETS = {
    'cover':       (800, 70),
    'gallery':     (600, 65),
    'annexure':    (700, 65),
    'comparable':  (500, 60),
}

_session = requests.Session()
adapter = HTTPAdapter(pool_connections=32, pool_maxsize=32)
_session.mount('http://', adapter)
_session.mount('https://', adapter)


def compress_image_to_data_url(image_url, preset='gallery'):
    """Fetch an image URL, resize + recompress as JPEG, return data URL.
    Falls back to original URL on any failure."""
    if not image_url or not isinstance(image_url, str):
        return image_url
    if image_url.startswith('data:'):
        return image_url

    max_width, quality = PRESETS.get(preset, PRESETS['gallery'])

    try:
        resp = _session.get(image_url, timeout=20)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content))
        img = ImageOps.exif_transpose(img)

        # Flatten transparent images onto white before JPEG encode
        if img.mode in ('RGBA', 'LA'):
            bg = Image.new('RGB', img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        elif img.mode == 'P':
            img = img.convert('RGBA')
            bg = Image.new('RGB', img.size, (255, 255, 255))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        if img.width > max_width:
            ratio = max_width / float(img.width)
            new_h = int(img.height * ratio)
            img = img.resize((max_width, new_h), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=quality, optimize=True, progressive=True)
        fd, path = tempfile.mkstemp(suffix='.jpg')
        
        with os.fdopen(fd, 'wb') as f:
            f.write(buf.getvalue())
        
        safe_path = path.replace('\\', '/')
        return f"file:///{safe_path}"
    except Exception as e:
        print(f"[image_compress] Failed for {image_url}: {e}")
        return image_url


def compress_report_images(report, max_workers=32):
    """Walk a report dict and replace photoUrl fields with compressed data URLs.
    Skips floor plans and title searches (preserves original for fine-detail content).
    Fetches and compresses images in parallel. Mutates the report in place."""
    if not isinstance(report, dict):
        return report

    # Build a list of (target_dict, key, preset) tuples to compress
    targets = []

    for photo in report.get('photos', []) or []:
        if not isinstance(photo, dict) or not photo.get('photoUrl'):
            continue
        if photo.get('isCover'):
            preset = 'cover'
        elif photo.get('isAnnexure'):
            preset = 'annexure'
        else:
            preset = 'gallery'
        targets.append((photo, 'photoUrl', preset))

    for photo in report.get('additionalPhotos', []) or []:
        if not isinstance(photo, dict) or not photo.get('photoUrl'):
            continue
        targets.append((photo, 'photoUrl', 'gallery'))

    comparables = report.get('comparables', {}) or {}
    for bucket in ('sales', 'rentals'):
        for comp in comparables.get(bucket, []) or []:
            if not isinstance(comp, dict):
                continue
            for key in ('photoUrl', 'photo_url', 'imageUrl', 'image_url'):
                if comp.get(key):
                    targets.append((comp, key, 'comparable'))

    if not targets:
        return report

    def _do(t):
        target, key, preset = t
        return target, key, compress_image_to_data_url(target[key], preset)

    with ThreadPoolExecutor(max_workers=max_workers) as ex:
        for target, key, new_url in ex.map(_do, targets):
            target[key] = new_url

    return report
