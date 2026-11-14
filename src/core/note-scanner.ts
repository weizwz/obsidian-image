import { App, Editor, MarkdownView, normalizePath, Notice, TFile } from 'obsidian';
import { t } from '../i18n';
import type {
  BatchProcessMode,
  BatchProcessResult,
  BatchRemoteImageHandler,
  ImagePluginSettings,
  VaultImageStats,
} from '../types';
import { getMimeFromExtension, normalizeExtension, processImageBuffer } from './image-processor';
import {
  ensureFolderExists,
  interpolateFilenameTemplate,
  interpolateFolderTemplate,
  resolveAndPrepareTarget,
  resolveUniqueFilePath,
} from './path-resolver';
import { downloadAndSaveRemoteImage } from './remote-downloader';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif']);

export interface ReferencedImageEntry {
  imageFile: TFile;
  referencingNotes: TFile[];
}

let remoteBatchHandler: BatchRemoteImageHandler | null = null;

export function registerBatchRemoteImageHandler(handler: BatchRemoteImageHandler): void {
  remoteBatchHandler = handler;
}

export function getBatchRemoteImageHandler(): BatchRemoteImageHandler | null {
  return remoteBatchHandler;
}

export function isImageFile(file: TFile): boolean {
  return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
}

export function collectLocalImageFilesInNote(app: App, noteFile: TFile, content: string): TFile[] {
  const found = new Map<string, TFile>();

  const cache = app.metadataCache.getFileCache(noteFile);
  if (cache?.embeds) {
    for (const embed of cache.embeds) {
      const linked = app.metadataCache.getFirstLinkpathDest(embed.link, noteFile.path);
      if (linked instanceof TFile && isImageFile(linked)) {
        found.set(linked.path, linked);
      }
    }
  }

  const wikiRegex = /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  for (const match of content.matchAll(wikiRegex)) {
    const linkpath = match[1]?.trim();
    if (!linkpath) continue;
    const linked = app.metadataCache.getFirstLinkpathDest(linkpath, noteFile.path);
    if (linked instanceof TFile && isImageFile(linked)) {
      found.set(linked.path, linked);
    }
  }

  const mdRegex = /!\[[^\]]*\]\((?!https?:\/\/)([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of content.matchAll(mdRegex)) {
    const rawPath = match[1]?.trim().replace(/^<|>$/g, '');
    if (!rawPath) continue;
    let decoded = rawPath;
    try {
      decoded = decodeURIComponent(rawPath);
    } catch {
      decoded = rawPath;
    }
    const linked = app.metadataCache.getFirstLinkpathDest(decoded, noteFile.path);
    if (linked instanceof TFile && isImageFile(linked)) {
      found.set(linked.path, linked);
    }
  }

  return Array.from(found.values());
}

export async function collectReferencedImagesFromNotes(
  app: App,
  notes: TFile[],
): Promise<ReferencedImageEntry[]> {
  const imageMap = new Map<string, ReferencedImageEntry>();

  for (const noteFile of notes) {
    const content = await app.vault.cachedRead(noteFile);
    const localImages = collectLocalImageFilesInNote(app, noteFile, content);
    for (const img of localImages) {
      const existing = imageMap.get(img.path);
      if (existing) {
        if (!existing.referencingNotes.some((n) => n.path === noteFile.path)) {
          existing.referencingNotes.push(noteFile);
        }
      } else {
        imageMap.set(img.path, {
          imageFile: img,
          referencingNotes: [noteFile],
        });
      }
    }
  }

  return Array.from(imageMap.values());
}

export async function scanVaultImageStats(
  app: App,
  activeNote?: TFile | null,
): Promise<VaultImageStats> {
  const allFiles = app.vault.getFiles();
  const allImageFiles = allFiles.filter(isImageFile);
  const markdownNotes = app.vault.getMarkdownFiles();

  const entries = await collectReferencedImagesFromNotes(app, markdownNotes);
  const referencedPaths = new Set<string>();
  const notePaths = new Set<string>();
  let totalReferencedBytes = 0;
  let currentNoteReferencedImages = 0;
  let currentNoteReferencedBytes = 0;

  for (const entry of entries) {
    referencedPaths.add(entry.imageFile.path);
    totalReferencedBytes += entry.imageFile.stat.size;
    for (const note of entry.referencingNotes) {
      notePaths.add(note.path);
    }
    if (activeNote && entry.referencingNotes.some((n) => n.path === activeNote.path)) {
      currentNoteReferencedImages += 1;
      currentNoteReferencedBytes += entry.imageFile.stat.size;
    }
  }

  const unreferencedImages = allImageFiles.filter((img) => !referencedPaths.has(img.path)).length;

  return {
    currentNoteReferencedImages,
    currentNoteReferencedBytes,
    referencedImages: entries.length,
    referencedNotes: notePaths.size,
    unreferencedImages,
    totalReferencedBytes,
  };
}

function matchesTargetFile(
  app: App,
  rawLinkpath: string,
  notePath: string,
  targetRef: { path: string; name: string },
): boolean {
  const trimmed = rawLinkpath.trim().replace(/^<|>$/g, '');
  if (!trimmed) return false;

  let decoded = trimmed;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    decoded = trimmed;
  }

  const resolved = app.metadataCache.getFirstLinkpathDest(decoded, notePath);
  if (resolved instanceof TFile && resolved.path === targetRef.path) {
    return true;
  }

  const normDecoded = normalizePath(decoded);
  if (normDecoded === targetRef.path || decoded === targetRef.name) {
    return true;
  }

  return false;
}

function buildRelativeMarkdownPath(noteFile: TFile, targetFile: TFile): string {
  const noteParent = noteFile.parent?.path === '/' ? '' : (noteFile.parent?.path ?? '');
  if (noteParent && targetFile.path.startsWith(`${noteParent}/`)) {
    const rel = targetFile.path.slice(noteParent.length + 1);
    return rel.split('/').map(encodeURIComponent).join('/');
  }
  return targetFile.path.split('/').map(encodeURIComponent).join('/');
}

export function replaceImageLinksInMarkdown(
  app: App,
  content: string,
  noteFile: TFile,
  oldTarget: { path: string; name: string },
  newFile: TFile,
): string {
  const newWikiLinktext = app.metadataCache.fileToLinktext(newFile, noteFile.path, false);

  const wikiRegex = /(!?)\[\[([^\]|#]+)((?:#[^\]|]*)?(?:\|[^\]]*)?)\]\]/g;
  let updated = content.replace(
    wikiRegex,
    (fullMatch, bang: string, linkpath: string, suffix: string) => {
      if (!matchesTargetFile(app, linkpath, noteFile.path, oldTarget)) {
        return fullMatch;
      }
      return `${bang}[[${newWikiLinktext}${suffix ?? ''}]]`;
    },
  );

  const mdRegex = /!\[([^\]]*)\]\((?!https?:\/\/)([^)\s]+)(\s+"[^"]*")?\)/g;
  updated = updated.replace(
    mdRegex,
    (fullMatch, altText: string, rawPath: string, titlePart?: string) => {
      if (!matchesTargetFile(app, rawPath, noteFile.path, oldTarget)) {
        return fullMatch;
      }
      const encodedPath = buildRelativeMarkdownPath(noteFile, newFile);
      return `![${altText ?? ''}](${encodedPath}${titlePart ?? ''})`;
    },
  );

  return updated;
}

async function resolveBatchTargetForImage(
  app: App,
  imageFile: TFile,
  primaryNote: TFile | null,
  targetExtension: string,
  buffer: ArrayBuffer,
  mode: BatchProcessMode,
  settings: ImagePluginSettings,
): Promise<{ folderPath: string; fileName: string; fullPath: string }> {
  const shouldRenameMove = mode === 'rename-and-move' || mode === 'both';

  if (!shouldRenameMove) {
    const rawParent = imageFile.parent?.path ?? '';
    const currentFolder = rawParent === '/' ? '' : rawParent;
    return resolveUniqueFilePath(
      app,
      currentFolder,
      imageFile.basename,
      targetExtension,
      imageFile.path,
    );
  }

  const refDate = new Date(imageFile.stat.ctime || Date.now());
  const folderPath = interpolateFolderTemplate(
    settings.paste.targetFolder,
    primaryNote,
    refDate,
  );
  await ensureFolderExists(app, folderPath);

  const baseName = await interpolateFilenameTemplate(
    settings.paste.filenameTemplate,
    primaryNote,
    imageFile.basename,
    buffer,
    refDate,
  );

  return resolveUniqueFilePath(app, folderPath, baseName, targetExtension, imageFile.path);
}

export async function executeBatchProcessOnEntries(
  app: App,
  entries: ReferencedImageEntry[],
  settings: ImagePluginSettings,
  saveSettings: () => Promise<void>,
  onProgress?: (current: number, total: number, fileName: string) => void,
  shouldStop?: () => boolean,
): Promise<BatchProcessResult> {
  const mode = settings.existingImages.mode;
  const shouldCompress = mode === 'compress-and-convert' || mode === 'both';

  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let savedBytes = 0;
  let cancelled = false;

  const total = entries.length;

  for (let i = 0; i < total; i += 1) {
    if (shouldStop?.()) {
      cancelled = true;
      break;
    }

    const entry = entries[i];
    if (!entry) continue;

    const { imageFile, referencingNotes } = entry;
    const primaryNote = referencingNotes[0] ?? null;

    onProgress?.(i + 1, total, imageFile.name);

    try {
      const currentFile = app.vault.getAbstractFileByPath(imageFile.path);
      if (!(currentFile instanceof TFile)) {
        skippedCount += 1;
        continue;
      }

      const rawBuffer = await app.vault.readBinary(currentFile);
      const originalBytes = rawBuffer.byteLength;
      const originalExt = normalizeExtension(currentFile.extension);
      const originalMime = getMimeFromExtension(originalExt);

      const processed = shouldCompress
        ? await processImageBuffer(rawBuffer, originalExt, originalMime, {
            ...settings.compression,
            enabled: true,
          })
        : {
            buffer: rawBuffer,
            extension: originalExt,
            mimeType: originalMime,
            changedFormat: false,
          };

      const target = await resolveBatchTargetForImage(
        app,
        currentFile,
        primaryNote,
        processed.extension,
        processed.buffer,
        mode,
        settings,
      );

      const pathChanged = target.fullPath !== currentFile.path;
      const contentChanged = processed.buffer !== rawBuffer || processed.changedFormat;

      if (!pathChanged && !contentChanged) {
        skippedCount += 1;
        continue;
      }

      settings.existingImages.pendingTransaction = {
        oldPath: currentFile.path,
        newPath: target.fullPath,
        affectedNotes: referencingNotes.map((n) => n.path),
        timestamp: Date.now(),
      };
      await saveSettings();

      if (!pathChanged) {
        await app.vault.modifyBinary(currentFile, processed.buffer);
      } else {
        const newFile = await app.vault.createBinary(target.fullPath, processed.buffer);

        for (const noteFile of referencingNotes) {
          const liveNote = app.vault.getAbstractFileByPath(noteFile.path);
          if (liveNote instanceof TFile) {
            await app.vault.process(liveNote, (noteContent) =>
              replaceImageLinksInMarkdown(app, noteContent, liveNote, currentFile, newFile),
            );
          }
        }

        await app.fileManager.trashFile(currentFile);
      }

      settings.existingImages.pendingTransaction = null;
      await saveSettings();

      const delta = originalBytes - processed.buffer.byteLength;
      if (delta > 0) {
        savedBytes += delta;
      }
      processedCount += 1;
    } catch {
      settings.existingImages.pendingTransaction = null;
      await saveSettings();
      failedCount += 1;
    }
  }

  return {
    processed: processedCount,
    skipped: skippedCount,
    failed: failedCount,
    savedBytes,
    cancelled,
  };
}

export async function recoverPendingBatchTransaction(
  app: App,
  settings: ImagePluginSettings,
  saveSettings: () => Promise<void>,
): Promise<string | null> {
  const tx = settings.existingImages.pendingTransaction;
  if (!tx) {
    return null;
  }

  const oldFile = app.vault.getAbstractFileByPath(tx.oldPath);
  const newFile = app.vault.getAbstractFileByPath(tx.newPath);

  if (tx.oldPath !== tx.newPath && oldFile instanceof TFile && newFile instanceof TFile) {
    for (const notePath of tx.affectedNotes) {
      const noteFile = app.vault.getAbstractFileByPath(notePath);
      if (noteFile instanceof TFile) {
        await app.vault.process(noteFile, (content) =>
          replaceImageLinksInMarkdown(app, content, noteFile, newFile, oldFile),
        );
      }
    }
    await app.fileManager.trashFile(newFile);
  } else if (tx.oldPath !== tx.newPath && !(oldFile instanceof TFile) && newFile instanceof TFile) {
    const oldTargetRef = {
      path: tx.oldPath,
      name: tx.oldPath.split('/').pop() ?? '',
    };
    for (const notePath of tx.affectedNotes) {
      const noteFile = app.vault.getAbstractFileByPath(notePath);
      if (noteFile instanceof TFile) {
        await app.vault.process(noteFile, (content) =>
          replaceImageLinksInMarkdown(app, content, noteFile, oldTargetRef, newFile),
        );
      }
    }
  }

  const repairedPath = tx.oldPath;
  settings.existingImages.pendingTransaction = null;
  await saveSettings();
  return repairedPath;
}

export async function processSingleImageFile(
  app: App,
  imageFile: TFile,
  noteFile: TFile | null,
  settings: ImagePluginSettings,
): Promise<TFile> {
  const rawBuffer = await app.vault.readBinary(imageFile);
  const originalExt = normalizeExtension(imageFile.extension);
  const originalMime = getMimeFromExtension(originalExt);

  const processed = await processImageBuffer(
    rawBuffer,
    originalExt,
    originalMime,
    settings.compression,
  );

  const target = await resolveAndPrepareTarget(
    app,
    settings.paste,
    noteFile,
    imageFile.basename,
    processed.extension,
    processed.buffer,
    imageFile.path,
  );

  if (processed.changedFormat || processed.buffer !== rawBuffer) {
    await app.vault.modifyBinary(imageFile, processed.buffer);
  }

  if (target.fullPath !== imageFile.path) {
    await app.fileManager.renameFile(imageFile, target.fullPath);
  }

  return imageFile;
}

export async function processAllImagesInNote(
  app: App,
  view: MarkdownView,
  settings: ImagePluginSettings,
  saveSettings?: () => Promise<void>,
): Promise<void> {
  const noteFile = view.file;
  if (!noteFile) {
    return;
  }

  const entries = await collectReferencedImagesFromNotes(app, [noteFile]);
  if (entries.length === 0) {
    new Notice(t().notices.noReferencedImages);
    return;
  }

  const noopSave = async () => {};
  const result = await executeBatchProcessOnEntries(
    app,
    entries,
    settings,
    saveSettings ?? noopSave,
  );

  new Notice(t().notices.processedCountInNote(result.processed));
}

export async function processImageUnderCursor(
  app: App,
  editor: Editor,
  noteFile: TFile | null,
  settings: ImagePluginSettings,
): Promise<void> {
  if (!noteFile) {
    return;
  }

  const cursor = editor.getCursor();
  const line = editor.getLine(cursor.line);

  const wikiRegex = /!\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]/g;
  for (const match of line.matchAll(wikiRegex)) {
    const linkpath = match[1]?.trim();
    if (!linkpath) continue;
    const linked = app.metadataCache.getFirstLinkpathDest(linkpath, noteFile.path);
    if (linked instanceof TFile && isImageFile(linked)) {
      await processSingleImageFile(app, linked, noteFile, settings);
      new Notice(t().notices.processedImage(linked.name));
      return;
    }
  }

  const mdRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  for (const match of line.matchAll(mdRegex)) {
    const fullMatch = match[0];
    const altText = match[1] ?? '';
    const targetRef = match[2]?.trim();
    if (!targetRef) continue;

    if (/^https?:\/\//i.test(targetRef) && settings.remote.enabled) {
      const saved = await downloadAndSaveRemoteImage(app, targetRef, noteFile, settings);
      if (settings.remote.replaceLink) {
        const rawLink = app.fileManager.generateMarkdownLink(saved, noteFile.path, '', altText);
        const newLink = rawLink.startsWith('!') ? rawLink : `!${rawLink}`;
        editor.replaceRange(
          newLink,
          { line: cursor.line, ch: match.index ?? 0 },
          {
            line: cursor.line,
            ch: (match.index ?? 0) + fullMatch.length,
          },
        );
      }
      new Notice(t().notices.processedRemoteImage(saved.name));
      return;
    }

    const linked = app.metadataCache.getFirstLinkpathDest(
      decodeURIComponent(targetRef),
      noteFile.path,
    );
    if (linked instanceof TFile && isImageFile(linked)) {
      await processSingleImageFile(app, linked, noteFile, settings);
      new Notice(t().notices.processedImage(linked.name));
      return;
    }
  }

  new Notice(t().notices.noImageOnLine);
}
