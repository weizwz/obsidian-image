import { posix as pathPosix } from 'node:path';
import { App, requestUrl, TFile } from 'obsidian';
import type { ImagePluginSettings } from '../types';
import {
	getExtensionFromMime,
	getMimeFromExtension,
	normalizeExtension,
	processImageBuffer,
} from './image-processor';
import { resolveAndPrepareTarget } from './path-resolver';

const KNOWN_IMAGE_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'webp',
	'gif',
	'svg',
	'bmp',
	'avif',
]);

export interface DownloadedRemoteImage {
	buffer: ArrayBuffer;
	originalName: string;
	extension: string;
	mimeType: string;
}

function extractHeaderCaseInsensitive(
	headers: Record<string, string>,
	targetKey: string,
): string | undefined {
	const lower = targetKey.toLowerCase();
	for (const [key, value] of Object.entries(headers)) {
		if (key.toLowerCase() === lower) {
			return value;
		}
	}
	return undefined;
}

function parseUrlNameAndExt(urlStr: string): {
	baseName: string;
	extension: string;
} {
	try {
		const parsed = new URL(urlStr);
		const base = pathPosix.basename(parsed.pathname);
		const extRaw = pathPosix.extname(base).replace(/^\./, '').toLowerCase();
		if (extRaw && KNOWN_IMAGE_EXTENSIONS.has(extRaw)) {
			const nameWithoutExt = base.slice(0, base.length - extRaw.length - 1);
			return {
				baseName: decodeURIComponent(nameWithoutExt || 'remote-image'),
				extension: normalizeExtension(extRaw),
			};
		}
		return {
			baseName: decodeURIComponent(base || 'remote-image'),
			extension: '',
		};
	} catch {
		return { baseName: 'remote-image', extension: '' };
	}
}

export function isLikelyRemoteImageUrl(urlStr: string): boolean {
	try {
		const parsed = new URL(urlStr);
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return false;
		}
		const ext = pathPosix
			.extname(parsed.pathname)
			.replace(/^\./, '')
			.toLowerCase();
		return KNOWN_IMAGE_EXTENSIONS.has(ext);
	} catch {
		return false;
	}
}

export async function fetchRemoteImage(
	url: string,
): Promise<DownloadedRemoteImage> {
	const response = await requestUrl({
		url,
		method: 'GET',
	});

	const contentType =
		extractHeaderCaseInsensitive(response.headers, 'content-type') ?? '';
	const { baseName, extension: urlExt } = parseUrlNameAndExt(url);

	const cleanMime = (contentType.split(';')[0] ?? '').trim().toLowerCase();
	const isImageMime = cleanMime.startsWith('image/');

	const resolvedExt = urlExt || (isImageMime ? getExtensionFromMime(cleanMime) : 'png');
	const resolvedMime = isImageMime
		? cleanMime
		: getMimeFromExtension(resolvedExt);

	return {
		buffer: response.arrayBuffer,
		originalName: baseName,
		extension: resolvedExt,
		mimeType: resolvedMime,
	};
}

export async function downloadAndSaveRemoteImage(
	app: App,
	url: string,
	noteFile: TFile | null,
	settings: ImagePluginSettings,
): Promise<TFile> {
	const downloaded = await fetchRemoteImage(url);
	const processed = await processImageBuffer(
		downloaded.buffer,
		downloaded.extension,
		downloaded.mimeType,
		settings.compression,
	);
	const target = await resolveAndPrepareTarget(
		app,
		settings.paste,
		noteFile,
		downloaded.originalName,
		processed.extension,
		processed.buffer,
	);

	return app.vault.createBinary(target.fullPath, processed.buffer);
}
