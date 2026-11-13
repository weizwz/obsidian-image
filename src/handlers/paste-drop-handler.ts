import { App, Editor, Notice, TFile } from 'obsidian';
import type ImagePlugin from '../main';
import type { ImagePluginSettings } from '../types';
import {
  getExtensionFromMime,
  normalizeExtension,
  processImageBuffer,
} from '../core/image-processor';
import { resolveAndPrepareTarget } from '../core/path-resolver';
import { downloadAndSaveRemoteImage, isLikelyRemoteImageUrl } from '../core/remote-downloader';

function extractImageFiles(fileList: FileList | null | undefined): File[] {
  if (!fileList || fileList.length === 0) {
    return [];
  }
  const result: File[] = [];
  for (let i = 0; i < fileList.length; i += 1) {
    const file = fileList.item(i);
    if (file && file.type.startsWith('image/')) {
      result.push(file);
    }
  }
  return result;
}

function splitFileName(
  name: string,
  fallbackMime: string,
): {
  baseName: string;
  extension: string;
} {
  const dotIndex = name.lastIndexOf('.');
  const extRaw = dotIndex > 0 ? name.slice(dotIndex) : '';
  if (extRaw) {
    const base = name.slice(0, name.length - extRaw.length);
    return {
      baseName: base || 'image',
      extension: normalizeExtension(extRaw),
    };
  }
  return {
    baseName: name || 'image',
    extension: getExtensionFromMime(fallbackMime),
  };
}

async function processAndInsertFiles(
  app: App,
  files: File[],
  editor: Editor,
  noteFile: TFile | null,
  settings: ImagePluginSettings,
): Promise<void> {
  const links: string[] = [];

  for (const file of files) {
    try {
      const rawBuffer = await file.arrayBuffer();
      const { baseName, extension } = splitFileName(file.name, file.type);

      const processed = await processImageBuffer(
        rawBuffer,
        extension,
        file.type,
        settings.compression,
      );

      const target = await resolveAndPrepareTarget(
        app,
        settings.paste,
        noteFile,
        baseName,
        processed.extension,
        processed.buffer,
      );

      const created = await app.vault.createBinary(target.fullPath, processed.buffer);
      const rawLink = app.fileManager.generateMarkdownLink(created, noteFile?.path ?? '');
      const link = rawLink.startsWith('!') ? rawLink : `!${rawLink}`;
      links.push(link);
    } catch {
      new Notice(`Failed to process image: ${file.name}`);
    }
  }

  if (links.length > 0) {
    editor.replaceSelection(links.join('\n'));
  }
}

interface RemotePasteTarget {
  altText: string;
  url: string;
  rawText: string;
}

function parseRemoteImageText(text: string): RemotePasteTarget | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }

  const mdMatch = /^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/.exec(trimmed);
  if (mdMatch && mdMatch[2]) {
    return {
      altText: mdMatch[1] ?? '',
      url: mdMatch[2],
      rawText: trimmed,
    };
  }

  if (isLikelyRemoteImageUrl(trimmed)) {
    return {
      altText: '',
      url: trimmed,
      rawText: trimmed,
    };
  }

  return null;
}

async function processAndInsertRemoteTarget(
  app: App,
  target: RemotePasteTarget,
  editor: Editor,
  noteFile: TFile | null,
  settings: ImagePluginSettings,
): Promise<void> {
  try {
    const saved = await downloadAndSaveRemoteImage(app, target.url, noteFile, settings);
    if (settings.remote.replaceLink) {
      const rawLink = app.fileManager.generateMarkdownLink(
        saved,
        noteFile?.path ?? '',
        '',
        target.altText,
      );
      const link = rawLink.startsWith('!') ? rawLink : `!${rawLink}`;
      editor.replaceSelection(link);
    } else {
      editor.replaceSelection(target.rawText);
    }
  } catch {
    new Notice(`Failed to download remote image: ${target.url}`);
    editor.replaceSelection(target.rawText);
  }
}

export function registerPasteAndDropHandlers(plugin: ImagePlugin): void {
  plugin.registerEvent(
    plugin.app.workspace.on('editor-paste', (evt, editor, info) => {
      if (evt.defaultPrevented) {
        return;
      }

      const imageFiles = extractImageFiles(evt.clipboardData?.files);
      if (imageFiles.length > 0 && plugin.settings.paste.enabled) {
        evt.preventDefault();
        void processAndInsertFiles(plugin.app, imageFiles, editor, info.file, plugin.settings);
        return;
      }

      if (plugin.settings.remote.enabled) {
        const plainText = evt.clipboardData?.getData('text/plain') ?? '';
        const remoteTarget = parseRemoteImageText(plainText);
        if (remoteTarget) {
          evt.preventDefault();
          void processAndInsertRemoteTarget(
            plugin.app,
            remoteTarget,
            editor,
            info.file,
            plugin.settings,
          );
        }
      }
    }),
  );

  plugin.registerEvent(
    plugin.app.workspace.on('editor-drop', (evt, editor, info) => {
      if (evt.defaultPrevented) {
        return;
      }

      if (!plugin.settings.paste.enabled) {
        return;
      }

      const imageFiles = extractImageFiles(evt.dataTransfer?.files);
      if (imageFiles.length === 0) {
        return;
      }

      evt.preventDefault();
      void processAndInsertFiles(plugin.app, imageFiles, editor, info.file, plugin.settings);
    }),
  );
}
