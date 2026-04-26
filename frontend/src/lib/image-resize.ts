/**
 * Client-side image resize before S3 upload.
 *
 * Why: phone-camera photos are typically 4000-8000px wide and 3-8 MB. The PDF
 * report displays them at A4 widths where ~2000px is already overkill, but
 * Chromium downloads, decodes, and embeds them at full source size. Resizing
 * client-side cuts PDF render time and final PDF size by ~5-10x with no
 * perceptible quality loss at the sizes used in the report.
 *
 * Strategy: decode with EXIF orientation honored, downscale only if the longest
 * edge exceeds maxDimension, re-encode as JPEG quality 0.85. On any failure we
 * pass the original file through unchanged — never block an upload because a
 * resize misbehaved.
 */

const RESIZABLE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const DEFAULT_MAX_DIMENSION = 2000;
const DEFAULT_JPEG_QUALITY = 0.85;

export interface ResizeOptions {
  maxDimension?: number;
  quality?: number;
}

export interface ResizeResult {
  file: File;
  resized: boolean;
}

export async function resizeImageIfNeeded(
  file: File,
  { maxDimension = DEFAULT_MAX_DIMENSION, quality = DEFAULT_JPEG_QUALITY }: ResizeOptions = {},
): Promise<ResizeResult> {
  if (!RESIZABLE_MIME_TYPES.has(file.type)) {
    return { file, resized: false };
  }

  let bitmap: ImageBitmap | null = null;
  try {
    // imageOrientation: 'from-image' tells the browser to bake EXIF rotation
    // into the bitmap, so portrait phone shots don't end up sideways.
    try {
      bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // Older Safari rejects the options bag; fall back to default decode.
      bitmap = await createImageBitmap(file);
    }

    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    if (longest <= maxDimension) {
      return { file, resized: false };
    }

    const scale = maxDimension / longest;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const blob = await drawAndEncode(bitmap, targetWidth, targetHeight, quality);
    if (!blob) return { file, resized: false };

    const baseName = file.name.replace(/\.[^./\\]+$/, '') || 'image';
    const resizedFile = new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    return { file: resizedFile, resized: true };
  } catch (err) {
    console.warn('Image resize failed; uploading original file as-is.', err);
    return { file, resized: false };
  } finally {
    bitmap?.close?.();
  }
}

async function drawAndEncode(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality: number,
): Promise<Blob | null> {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.convertToBlob({ type: 'image/jpeg', quality });
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((b) => resolve(b), 'image/jpeg', quality);
  });
}

/**
 * Resize a list of files with bounded concurrency. Used by batch upload paths
 * to avoid spawning N concurrent decodes when a user drops 50 photos at once.
 */
export async function resizeAll(
  files: File[],
  options: ResizeOptions & { concurrency?: number } = {},
): Promise<File[]> {
  const { concurrency = 4, ...resizeOptions } = options;
  const out: File[] = new Array(files.length);
  let idx = 0;
  async function worker() {
    while (idx < files.length) {
      const i = idx++;
      const result = await resizeImageIfNeeded(files[i], resizeOptions);
      out[i] = result.file;
    }
  }
  const workers = Array.from(
    { length: Math.min(concurrency, files.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return out;
}
