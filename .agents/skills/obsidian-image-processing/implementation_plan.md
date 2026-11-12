# Obsidian 图片管理插件执行计划

## 1. 基础配置与元数据
- [manifest.json](file:///Users/weiz/workspace/tools/obsidian-image/manifest.json)：更新插件 `id`、`name`、`description`，并将 `isDesktopOnly` 设为 `true`。
- [esbuild.config.mjs](file:///Users/weiz/workspace/tools/obsidian-image/esbuild.config.mjs)：支持 `node:` 前缀内置模块外部化（`node:crypto`、`node:path`）。

## 2. 类型与可扩展配置 (`src/types.ts`, `src/settings.ts`)
- `src/types.ts`：定义 `TargetFormat`、`PasteRuleSettings`、`CompressionSettings`、`ExistingImagesSettings`、`RemoteImagesSettings`、`ImagePluginSettings` 及处理管道上下文类型。
- `src/settings.ts`：实现 `DEFAULT_SETTINGS`、`mergeSettings()` 深层合并函数，以及基于 `PluginSettingTab` 的配置面板 UI（粘贴与路径规则、压缩转换、存量图片管理、远程图片下载）。

## 3. 核心处理模块 (`src/core/`)
- `src/core/image-processor.ts`：
  - 使用 `createImageBitmap` + `OffscreenCanvas.convertToBlob` 实现硬件加速缩放与格式转换（`webp`、`jpeg`、`png`）。
  - 动图 `gif` 与矢量图 `svg` 跳过重编码。
  - 实现体积守卫（`skipLargerOutput` 或同格式变大时保留原图）。
- `src/core/path-resolver.ts`：
  - 解析目录变量（`${noteName}`、`${noteFolder}`、`${date:YYYY-MM-DD}`、`${year}`、`${month}`、`${day}`）并通过 `normalizePath()` 规范化，递归创建缺失目录。
  - 解析文件名变量（`${noteName}`、`${originalName}`、`${timestamp}`、`${date:YYYYMMDDHHmmss}`、`${hash:8}`），自动追加 `-1`、`-2` 解决同名冲突。
- `src/core/remote-downloader.ts`：
  - 使用 `requestUrl({ url, method: 'GET' })` 下载远程图片，解析 MIME 与扩展名。
- `src/core/note-scanner.ts`：
  - 扫描当前笔记中的本地图片引用（`![[...]]`、`![](...)`）及远程图片链接。
  - 移动/重命名时调用 `fileManager.renameFile()`；格式转换时先 `vault.modifyBinary()` 再 `fileManager.renameFile()` 以保持全库链接完整性。

## 4. 事件与命令处理器 (`src/handlers/`, `src/main.ts`)
- `src/handlers/paste-drop-handler.ts`：
  - 监听 `editor-paste` 与 `editor-drop`，检查 `evt.defaultPrevented`，同步调用 `evt.preventDefault()`。
  - 处理剪贴板/拖拽的二进制图片文件与远程图片链接，执行压缩、保存并通过 `fileManager.generateMarkdownLink()` + `editor.replaceSelection()` 插入链接。
- `src/main.ts`：
  - 注册配置面板、粘贴/拖拽事件监听器及存量/远程图片处理命令。

## 5. 验证与构建
- 运行 `npm run lint` 与 `npm run build`，确保零警告、零错误通过编译与 ESLint 校验。
