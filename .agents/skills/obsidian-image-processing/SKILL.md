---
name: obsidian-image-processing
description: >-
  Architecture, requirements, and implementation guidelines for the Obsidian desktop image management plugin (silent paste/drop processing, existing note image organization, remote image download/replacement, GPU-accelerated OffscreenCanvas compression/conversion, and extensible settings schema). Use when designing, implementing, or modifying any feature in this plugin.
---

# Obsidian Image Management Plugin Skill

## 1. Platform & Performance Architecture

- **Target Platform**: Desktop Only (`"isDesktopOnly": true` in `manifest.json`).
- **Image Engine**: Chromium hardware-accelerated `createImageBitmap` + `OffscreenCanvas` (`convertToBlob`).
  - Runs off the main UI thread where possible, leverages Electron's native Skia/GPU pipeline, requires zero native OS binary dependencies (`sharp` / `ffmpeg`), and natively encodes `image/webp`, `image/jpeg`, and `image/png`.
  - Node.js built-ins (`node:crypto`, `node:path`) are permitted since `isDesktopOnly: true`.
- **Bypass Rules**: Animated `gif` and vector `svg` skip canvas re-encoding and only execute path routing and renaming.
- **Size Guard**: If the compressed/converted output byte size is larger than the original (when format is unchanged or user enables size guard), keep the original buffer.

---

## 2. Core Feature Modules

### 2.1 Silent Paste & Drop Processing (Auto Mode)
- Listen to `editor-paste` and `editor-drop` via `this.registerEvent()`.
- Check `if (evt.defaultPrevented) return;` first.
- **Binary Image Files** (`evt.clipboardData?.files` / `evt.dataTransfer?.files`):
  - Synchronously call `evt.preventDefault()` before any `async` call.
  - Run pipeline: **Compress/Convert → Resolve Folder & Filename → `vault.createBinary()` → Insert link via `fileManager.generateMarkdownLink()` + `editor.replaceSelection()`**.

### 2.2 Remote Image Download & Link Replacement (Configurable)
- Controlled by settings:
  - `remote.enabled`: Whether to detect remote image URLs (`http://` / `https://`) on paste or via command.
  - `remote.replaceLink`: Whether to replace the original remote Markdown link with the local vault link after downloading.
- **Network API**: MUST use Obsidian's `requestUrl({ url, method: 'GET' })` (rule #24, bypasses CORS), reading `response.arrayBuffer`.
- Run downloaded buffer through the same Compress/Convert + Save + Rename pipeline.

### 2.3 Existing Note Image Management (Configurable)
- Controlled by setting `existingImages.enabled`.
- When enabled, register commands / context menu items:
  - **Process all images in current note**: Scan internal embeds (`![[...]]` and `![](...)`) in active `MarkdownView` (and optionally remote links if `remote.enabled`).
  - **Process single image**: Convert/compress and move/rename.
- **Link Integrity**:
  - When only moving/renaming an existing `TFile`: use `await this.app.fileManager.renameFile(file, newPath)` so Obsidian automatically updates all vault backlinks.
  - When format changes (e.g., `.png` → `.webp`): write converted buffer via `vault.modifyBinary()` on the file, then call `fileManager.renameFile(file, newWebpPath)` so all references across the vault update atomically to the new extension.

---

## 3. Routing & Renaming Rules

- **Directory Resolution**:
  - Always normalize with `normalizePath()`.
  - Supported variables: `${noteName}`, `${noteFolder}`, `${date:YYYY-MM-DD}`, `${year}`, `${month}`, `${day}`.
  - Ensure target folder exists via `vault.getAbstractFileByPath(folderPath)`; create recursively via `vault.createFolder()` if missing.
- **Filename Resolution**:
  - Supported variables: `${noteName}`, `${originalName}`, `${timestamp}`, `${date:YYYYMMDDHHmmss}`, `${hash:8}` (via `node:crypto` SHA-256 prefix).
  - Conflict resolution: Append `-1`, `-2`, etc., checking `vault.getAbstractFileByPath(candidatePath)`.

---

## 4. Extensible Settings Architecture

Design settings with domain-grouped sub-objects and a `version` field so new options can be added without breaking user data. Deep-merge each group in `loadSettings()`.

```typescript
export type TargetFormat = 'original' | 'webp' | 'jpeg' | 'png';

export interface PasteRuleSettings {
	enabled: boolean;
	targetFolder: string;     // e.g. "${noteFolder}/assets/${noteName}"
	filenameTemplate: string; // e.g. "${noteName}-${timestamp}"
}

export interface CompressionSettings {
	enabled: boolean;
	targetFormat: TargetFormat;
	quality: number;          // 1 - 100, default 80
	maxWidth: number;         // 0 = unlimited
	maxHeight: number;        // 0 = unlimited
	skipLargerOutput: boolean;
}

export interface ExistingImagesSettings {
	enabled: boolean;
}

export interface RemoteImagesSettings {
	enabled: boolean;
	replaceLink: boolean;
}

export interface ImagePluginSettings {
	version: number;
	paste: PasteRuleSettings;
	compression: CompressionSettings;
	existingImages: ExistingImagesSettings;
	remote: RemoteImagesSettings;
	extensions?: Record<string, unknown>; // Reserved for future rule extensions
}
```

### Deep-Merge Pattern on Load
```typescript
export function mergeSettings(
	defaults: ImagePluginSettings,
	saved?: Partial<ImagePluginSettings> | null
): ImagePluginSettings {
	if (!saved) return structuredClone(defaults);
	return {
		version: defaults.version,
		paste: Object.assign({}, defaults.paste, saved.paste),
		compression: Object.assign({}, defaults.compression, saved.compression),
		existingImages: Object.assign({}, defaults.existingImages, saved.existingImages),
		remote: Object.assign({}, defaults.remote, saved.remote),
		extensions: Object.assign({}, defaults.extensions, saved.extensions),
	};
}
```

---

## 5. Module Structure (`src/`)

```text
src/
  main.ts                  # Plugin lifecycle, event & command registration
  settings.ts              # Extensible settings schema, defaults, SettingTab
  types.ts                 # Shared interfaces & pipeline context types
  core/
    image-processor.ts     # OffscreenCanvas + createImageBitmap compression & conversion
    path-resolver.ts       # Folder & filename template variable interpolation + conflict check
    remote-downloader.ts   # requestUrl downloader & MIME/extension detection
    note-scanner.ts        # Existing note image scanner & atomic rename/convert
  handlers/
    paste-drop-handler.ts  # editor-paste and editor-drop silent pipeline
```
