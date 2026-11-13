import { App, Editor, MarkdownView, Notice, TFile } from 'obsidian';
import type { ImagePluginSettings } from '../types';
import { getMimeFromExtension, normalizeExtension, processImageBuffer } from './image-processor';
import { resolveAndPrepareTarget } from './path-resolver';
import { downloadAndSaveRemoteImage } from './remote-downloader';

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'avif']);

export function isImageFile(file: TFile): boolean {
  return IMAGE_EXTENSIONS.has(file.extension.toLowerCase());
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

function collectLocalImageFilesInNote(app: App, noteFile: TFile, content: string): TFile[] {
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
    const rawPath = match[1]?.trim();
    if (!rawPath) continue;
    const decoded = decodeURIComponent(rawPath);
    const linked = app.metadataCache.getFirstLinkpathDest(decoded, noteFile.path);
    if (linked instanceof TFile && isImageFile(linked)) {
      found.set(linked.path, linked);
    }
  }

  return Array.from(found.values());
}

async function processRemoteImagesInEditor(
  app: App,
  editor: Editor,
  noteFile: TFile,
  settings: ImagePluginSettings,
): Promise<number> {
  const content = editor.getValue();
  const remoteRegex = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  const matches = Array.from(content.matchAll(remoteRegex));
  if (matches.length === 0) {
    return 0;
  }

  let updatedContent = content;
  let count = 0;

  for (const match of matches) {
    const fullMatch = match[0];
    const altText = match[1] ?? '';
    const remoteUrl = match[2];
    if (!remoteUrl) continue;

    try {
      const savedFile = await downloadAndSaveRemoteImage(app, remoteUrl, noteFile, settings);
      count += 1;
      if (settings.remote.replaceLink) {
        const rawLink = app.fileManager.generateMarkdownLink(savedFile, noteFile.path, '', altText);
        const newLink = rawLink.startsWith('!') ? rawLink : `!${rawLink}`;
        updatedContent = updatedContent.replace(fullMatch, newLink);
      }
    } catch {
      new Notice(`Failed to download remote image: ${remoteUrl}`);
    }
  }

  if (settings.remote.replaceLink && updatedContent !== content) {
    editor.setValue(updatedContent);
  }

  return count;
}

export async function processAllImagesInNote(
  app: App,
  view: MarkdownView,
  settings: ImagePluginSettings,
): Promise<void> {
  const noteFile = view.file;
  if (!noteFile) {
    return;
  }

  const editor = view.editor;
  const content = editor.getValue();
  const localFiles = collectLocalImageFilesInNote(app, noteFile, content);

  let processedCount = 0;
  for (const imageFile of localFiles) {
    try {
      await processSingleImageFile(app, imageFile, noteFile, settings);
      processedCount += 1;
    } catch {
      new Notice(`Failed to process image: ${imageFile.name}`);
    }
  }

  if (settings.remote.enabled) {
    const remoteCount = await processRemoteImagesInEditor(app, editor, noteFile, settings);
    processedCount += remoteCount;
  }

  new Notice(`Processed ${processedCount} image(s) in current note.`);
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
      new Notice(`Processed image: ${linked.name}`);
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
      new Notice(`Processed remote image: ${saved.name}`);
      return;
    }

    const linked = app.metadataCache.getFirstLinkpathDest(
      decodeURIComponent(targetRef),
      noteFile.path,
    );
    if (linked instanceof TFile && isImageFile(linked)) {
      await processSingleImageFile(app, linked, noteFile, settings);
      new Notice(`Processed image: ${linked.name}`);
      return;
    }
  }

  new Notice('No image found on the current line.');
}
