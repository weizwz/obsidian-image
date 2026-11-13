import { App, normalizePath, TFile, TFolder } from 'obsidian';
import type { PasteRuleSettings, ResolvedTarget } from '../types';

function pad2(num: number): string {
  return String(num).padStart(2, '0');
}

function formatDateToken(date: Date, pattern: string): string {
  const year = String(date.getFullYear());
  const month = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hours = pad2(date.getHours());
  const minutes = pad2(date.getMinutes());
  const seconds = pad2(date.getSeconds());

  return pattern
    .replace(/YYYY/g, year)
    .replace(/MM/g, month)
    .replace(/DD/g, day)
    .replace(/HH/g, hours)
    .replace(/mm/g, minutes)
    .replace(/ss/g, seconds);
}

function sanitizeSegment(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim();
}

async function computeSha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await window.crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function interpolateFolderTemplate(
  template: string,
  noteFile: TFile | null,
  now = new Date(),
): string {
  const noteName = sanitizeSegment(noteFile?.basename ?? 'untitled');
  const rawParentPath = noteFile?.parent?.path ?? '';
  const noteFolder = rawParentPath === '/' ? '' : rawParentPath;
  const year = String(now.getFullYear());
  const month = pad2(now.getMonth() + 1);
  const day = pad2(now.getDate());

  const raw = template
    .replace(/\$\{noteName\}/g, noteName)
    .replace(/\$\{noteFolder\}/g, noteFolder)
    .replace(/\$\{year\}/g, year)
    .replace(/\$\{month\}/g, month)
    .replace(/\$\{day\}/g, day)
    .replace(/\$\{date:([^}]+)\}/g, (_, fmt: string) => formatDateToken(now, fmt));

  const cleaned = raw
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '.')
    .join('/');

  return cleaned ? normalizePath(cleaned) : '';
}

export async function interpolateFilenameTemplate(
  template: string,
  noteFile: TFile | null,
  originalName: string,
  buffer: ArrayBuffer,
  now = new Date(),
): Promise<string> {
  const noteName = sanitizeSegment(noteFile?.basename ?? 'untitled');
  const cleanOriginal = sanitizeSegment(originalName || 'image') || 'image';
  const timestamp = String(now.getTime());
  const cachedHash = /\$\{hash(?::\d+)?\}/.test(template) ? await computeSha256Hex(buffer) : null;

  const raw = template
    .replace(/\$\{noteName\}/g, noteName)
    .replace(/\$\{originalName\}/g, cleanOriginal)
    .replace(/\$\{timestamp\}/g, timestamp)
    .replace(/\$\{date:([^}]+)\}/g, (_, fmt: string) => formatDateToken(now, fmt))
    .replace(/\$\{hash(?::(\d+))?\}/g, (_, lenStr?: string) => {
      const length = lenStr ? Number.parseInt(lenStr, 10) : 8;
      return (cachedHash ?? '').slice(0, Math.max(1, Math.min(64, length)));
    });

  const sanitized = sanitizeSegment(raw);
  return sanitized || `image-${timestamp}`;
}

export async function ensureFolderExists(app: App, folderPath: string): Promise<void> {
  if (!folderPath) {
    return;
  }
  const normalized = normalizePath(folderPath);
  const existing = app.vault.getAbstractFileByPath(normalized);
  if (existing instanceof TFolder) {
    return;
  }

  const segments = normalized.split('/').filter((s) => s.length > 0);
  let currentPath = '';
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const node = app.vault.getAbstractFileByPath(currentPath);
    if (!node) {
      await app.vault.createFolder(currentPath);
    }
  }
}

export function resolveUniqueFilePath(
  app: App,
  folderPath: string,
  baseName: string,
  extension: string,
  ignoreCurrentPath?: string,
): ResolvedTarget {
  const ext = extension.replace(/^\./, '').toLowerCase();
  const prefix = folderPath ? `${normalizePath(folderPath)}/` : '';

  let candidateName = `${baseName}.${ext}`;
  let candidatePath = normalizePath(`${prefix}${candidateName}`);
  let counter = 1;

  while (
    candidatePath !== ignoreCurrentPath &&
    app.vault.getAbstractFileByPath(candidatePath) !== null
  ) {
    candidateName = `${baseName}-${counter}.${ext}`;
    candidatePath = normalizePath(`${prefix}${candidateName}`);
    counter += 1;
  }

  return {
    folderPath: folderPath ? normalizePath(folderPath) : '',
    fileName: candidateName,
    fullPath: candidatePath,
  };
}

export async function resolveAndPrepareTarget(
  app: App,
  pasteSettings: PasteRuleSettings,
  noteFile: TFile | null,
  originalBaseName: string,
  extension: string,
  buffer: ArrayBuffer,
  ignoreCurrentPath?: string,
): Promise<ResolvedTarget> {
  const now = new Date();
  const folderPath = interpolateFolderTemplate(pasteSettings.targetFolder, noteFile, now);
  await ensureFolderExists(app, folderPath);

  const baseName = await interpolateFilenameTemplate(
    pasteSettings.filenameTemplate,
    noteFile,
    originalBaseName,
    buffer,
    now,
  );

  return resolveUniqueFilePath(app, folderPath, baseName, extension, ignoreCurrentPath);
}
