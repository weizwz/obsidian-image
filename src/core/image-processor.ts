import type { CompressionSettings, ProcessedImageResult, TargetFormat } from '../types';

const EXTENSION_TO_MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  avif: 'image/avif',
};

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
};

export function normalizeExtension(ext: string): string {
  const cleaned = ext.replace(/^\./, '').toLowerCase();
  return cleaned === 'jpeg' ? 'jpg' : cleaned;
}

export function getMimeFromExtension(ext: string): string {
  const normalized = normalizeExtension(ext);
  return EXTENSION_TO_MIME[normalized] ?? 'image/png';
}

export function getExtensionFromMime(mime: string): string {
  const baseMime = (mime.split(';')[0] ?? '').trim().toLowerCase();
  return MIME_TO_EXTENSION[baseMime] ?? 'png';
}

export function isBypassImage(extension: string, mimeType: string): boolean {
  const ext = normalizeExtension(extension);
  const mime = mimeType.toLowerCase();
  return ext === 'gif' || ext === 'svg' || mime === 'image/gif' || mime === 'image/svg+xml';
}

function resolveTargetMimeAndExt(
  targetFormat: TargetFormat,
  originalExt: string,
  originalMime: string,
): { mime: string; ext: string } {
  if (targetFormat === 'original') {
    const normExt = normalizeExtension(originalExt);
    if (normExt === 'png' || normExt === 'jpg' || normExt === 'webp') {
      return {
        mime: getMimeFromExtension(normExt),
        ext: normExt,
      };
    }
    const fallbackExt = getExtensionFromMime(originalMime);
    if (fallbackExt === 'png' || fallbackExt === 'jpg' || fallbackExt === 'webp') {
      return {
        mime: getMimeFromExtension(fallbackExt),
        ext: fallbackExt,
      };
    }
    return { mime: 'image/png', ext: 'png' };
  }

  if (targetFormat === 'jpeg') {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  if (targetFormat === 'webp') {
    return { mime: 'image/webp', ext: 'webp' };
  }
  return { mime: 'image/png', ext: 'png' };
}

function calculateDimensions(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number,
): { width: number; height: number; resized: boolean } {
  let targetW = width;
  let targetH = height;

  if (maxWidth > 0 && targetW > maxWidth) {
    const ratio = maxWidth / targetW;
    targetW = Math.max(1, Math.round(targetW * ratio));
    targetH = Math.max(1, Math.round(targetH * ratio));
  }

  if (maxHeight > 0 && targetH > maxHeight) {
    const ratio = maxHeight / targetH;
    targetW = Math.max(1, Math.round(targetW * ratio));
    targetH = Math.max(1, Math.round(targetH * ratio));
  }

  return {
    width: targetW,
    height: targetH,
    resized: targetW !== width || targetH !== height,
  };
}

export async function processImageBuffer(
  buffer: ArrayBuffer,
  originalExtension: string,
  originalMimeType: string,
  settings: CompressionSettings,
): Promise<ProcessedImageResult> {
  const normOriginalExt = normalizeExtension(
    originalExtension || getExtensionFromMime(originalMimeType),
  );
  const resolvedOriginalMime = originalMimeType || getMimeFromExtension(normOriginalExt);

  if (!settings.enabled || isBypassImage(normOriginalExt, resolvedOriginalMime)) {
    return {
      buffer,
      extension: normOriginalExt,
      mimeType: resolvedOriginalMime,
      changedFormat: false,
    };
  }

  const { mime: targetMime, ext: targetExt } = resolveTargetMimeAndExt(
    settings.targetFormat,
    normOriginalExt,
    resolvedOriginalMime,
  );

  const sourceBlob = new Blob([buffer], { type: resolvedOriginalMime });
  const bitmap = await createImageBitmap(sourceBlob);

  try {
    const { width, height, resized } = calculateDimensions(
      bitmap.width,
      bitmap.height,
      settings.maxWidth,
      settings.maxHeight,
    );

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return {
        buffer,
        extension: normOriginalExt,
        mimeType: resolvedOriginalMime,
        changedFormat: false,
      };
    }

    ctx.drawImage(bitmap, 0, 0, width, height);

    const quality = Math.min(1, Math.max(0.01, settings.quality / 100));
    const outputBlob = await canvas.convertToBlob({
      type: targetMime,
      quality,
    });
    const outputBuffer = await outputBlob.arrayBuffer();

    const sameFormat = targetExt === normOriginalExt;
    if (
      !resized &&
      outputBuffer.byteLength >= buffer.byteLength &&
      (sameFormat || settings.skipLargerOutput)
    ) {
      return {
        buffer,
        extension: normOriginalExt,
        mimeType: resolvedOriginalMime,
        changedFormat: false,
      };
    }

    return {
      buffer: outputBuffer,
      extension: targetExt,
      mimeType: targetMime,
      changedFormat: !sameFormat,
    };
  } finally {
    bitmap.close();
  }
}
