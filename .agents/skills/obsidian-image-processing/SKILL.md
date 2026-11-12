---
name: obsidian-image-processing
description: >-
  Guidelines and patterns for implementing image paste/drop interception, custom directory routing, renaming, compression, and format conversion in an Obsidian plugin. Use when implementing or modifying image handling, paste/drop events, Canvas/WebP/JPEG/PNG conversion, vault binary creation, or markdown link generation.
---

# Obsidian Image Management Plugin Skill

## 1. Paste & Drop Event Interception (`editor-paste` / `editor-drop`)

Follow `eslint-plugin-obsidianmd` rule #31 (`editor-drop-paste`):
- Always check `if (evt.defaultPrevented) return;` at the start of the handler.
- Inspect `evt.clipboardData?.files` (for paste) or `evt.dataTransfer?.files` (for drop) to check if image files exist before intercepting.
- Call `evt.preventDefault()` **synchronously** before any `await` call if handling the image, otherwise Obsidian's default paste handler will also insert the original image.

```typescript
this.registerEvent(
	this.app.workspace.on('editor-paste', (evt: ClipboardEvent, editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
		if (evt.defaultPrevented) return;
		const files = evt.clipboardData?.files;
		if (!files || !this.hasSupportedImage(files)) return;

		evt.preventDefault();
		void this.handleImageFiles(Array.from(files), editor, info.file);
	})
);
```

## 2. Image Compression & Format Conversion (Browser / Electron Compatible)

Use Web APIs (`createImageBitmap` + `HTMLCanvasElement` / `OffscreenCanvas` + `canvas.toBlob`) to remain compatible with both Desktop and Mobile without native Node binary dependencies:
- Decode: `const bitmap = await createImageBitmap(file);`
- Draw to Canvas (`activeDocument.createElement('canvas')` or `OffscreenCanvas`) with target dimensions.
- Encode via `toBlob(callback, mimeType, quality)` where `mimeType` is `'image/webp'`, `'image/jpeg'`, or `'image/png'`, and `quality` is `0.0`–`1.0`.
- Convert `Blob` to `ArrayBuffer` via `await blob.arrayBuffer()`.
- Close `bitmap.close()` in a `finally` block to prevent memory leaks.

## 3. Directory Resolution & Folder Creation

- Always sanitize paths using `normalizePath(rawPath)` from `'obsidian'`.
- Support template variables relative to the active note (`${noteName}`, `${noteFolder}`, `${date:YYYY-MM-DD}`, `${timestamp}`).
- Check folder existence with `this.app.vault.getAbstractFileByPath(folderPath)`:
  - If null, create recursively or call `await this.app.vault.createFolder(folderPath)`.
  - Deduplicate filenames if `this.app.vault.getAbstractFileByPath(targetPath)` already exists.

## 4. Saving, Renaming & Updating Links

- **New Pasted Image**: Save binary directly to target path with `const tFile = await this.app.vault.createBinary(targetPath, arrayBuffer);`
- **Moving/Renaming Existing Vault Image**: Always use `await this.app.fileManager.renameFile(file, newPath);` so Obsidian automatically updates all internal wikilinks/markdown links across the vault.
- **Deleting Old Image**: Use `await this.app.fileManager.trashFile(file);` (never `vault.delete` or `vault.trash`).
- **Inserting Link into Editor**: Use `this.app.fileManager.generateMarkdownLink(tFile, sourcePath)` so the generated link respects the user's Obsidian settings (**Use [[Wikilinks]]** vs standard Markdown links and relative/shortest path preferences), then insert via `editor.replaceSelection(linkText)`.
