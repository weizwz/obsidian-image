# Obsidian Image Manager

[English](./README.md) | [简体中文](./README.zh-CN.md)

A lightweight, high-performance desktop image management plugin for [Obsidian](https://obsidian.md). Automatically rename, organize, convert, and compress pasted, dropped, and existing images in your vault using hardware-accelerated `OffscreenCanvas`—with zero external binary dependencies.

## Features

- **Silent Paste & Drop Processing**: Automatically intercepts pasted or dragged-and-dropped images, converts/compresses them, moves them to your target folder with custom naming templates, and inserts the Markdown/Wiki link.
- **Hardware-Accelerated Compression & Conversion**:
  - Convert images to `WebP`, `JPEG`, `PNG`, or keep the original format.
  - Customize quality (`1–100`), maximum width, and maximum height.
  - **Size Guard**: Automatically keeps the original file if the compressed output is larger.
  - **Smart Bypass**: Animated GIFs, SVGs, and videos are automatically skipped from re-encoding.
- **Flexible Path & Filename Templates**:
  - **Folder variables**: `${noteName}`, `${noteFolder}`, `${date:YYYY-MM-DD}`, `${year}`, `${month}`, `${day}`.
  - **Filename variables**: `${noteName}`, `${originalName}`, `${timestamp}`, `${date:YYYYMMDDHHmmss}`, `${hash:8}` (SHA-256).
  - Automatic folder creation and filename collision resolution (`-1`, `-2`, etc.).
- **Batch Processing & Vault Statistics**:
  - Batch process referenced local images in the **current note** or across the **entire vault** (unreferenced orphan images are safely ignored).
  - Three batch operation modes: **Rename & move**, **Convert & compress**, or **Both**.
  - Interactive confirmation modal, real-time progress bar, and **Safe Stop** support.
  - Automatic backlink synchronization across notes; replaced originals are moved to `.trash` for safe recovery.
  - Live statistics in settings showing referenced image counts, unreferenced image counts, and storage usage for the current note and entire vault.
- **Crash & Interruption Recovery**:
  - Built-in transaction tracking automatically detects and repairs incomplete image operations upon startup or via manual verification in settings.
- **Multi-language Support (i18n)**:
  - Supports **English** and **简体中文**, with automatic Obsidian language detection or manual override.

## Commands

| Command                                  | Description                                                                         |
| :--------------------------------------- | :---------------------------------------------------------------------------------- |
| **Batch process images in current note** | Scan and batch process all local images referenced in the active Markdown note.     |
| **Process image on current line**        | Process the single local or remote image located on the current editor cursor line. |

## Installation

### Manual Installation

1. Build the plugin or download the latest release assets (`main.js`, `manifest.json`, `styles.css`).
2. Copy the files into your vault's plugin directory:
   ```text
   <Vault>/.obsidian/plugins/image-manager/
   ```
3. Reload Obsidian and enable **Image Manager** in **Settings → Community plugins**.

## Development

```bash
# Install dependencies
pnpm install

# Start development build in watch mode
pnpm run dev

# Build for production
pnpm run build

# Run ESLint
pnpm run lint
```

## License

[MIT](./LICENSE)
