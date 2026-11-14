# Obsidian 图片管理插件执行计划与任务清单

## 一、 核心架构与已有模块
- [manifest.json](file:///Users/weiz/workspace/tools/obsidian-image/manifest.json)：桌面端专属插件（`isDesktopOnly: true`）。
- [image-processor.ts](file:///Users/weiz/workspace/tools/obsidian-image/src/core/image-processor.ts)：基于 `createImageBitmap` + `OffscreenCanvas` 的硬件加速压缩与格式转换（自动跳过 GIF/SVG，支持体积守卫）。
- [path-resolver.ts](file:///Users/weiz/workspace/tools/obsidian-image/src/core/path-resolver.ts)：目录与文件名模板解析、目录自动创建、重名冲突递增处理。
- [paste-drop-handler.ts](file:///Users/weiz/workspace/tools/obsidian-image/src/handlers/paste-drop-handler.ts)：编辑器静默粘贴与拖拽处理。

---

## 二、 批量处理（Batch Processing）改造任务清单

### 任务 1：扩展类型定义与多语言文案 (`src/types.ts`, `src/i18n/`)
- [x] 定义批量处理模式 `BatchProcessMode = 'rename-and-move' | 'compress-and-convert' | 'both'`。
- [x] 定义单图原子事务日志 `PendingBatchTransaction`（记录 `oldPath`、`newPath`、`affectedNotes`、`timestamp`），用于异常中断后的启动自检与回滚修复。
- [x] 将设置项中的 `existingImages` 升级并兼容为批量处理配置（保留向后兼容），在 `src/i18n/types.ts`、`zh.ts`、`en.ts` 中将分组标题改为「批量处理」（`Batch processing`），补充下拉选项、按钮、确认框、进度弹窗及统计栏文案。

### 任务 2：重构核心批量处理与恢复引擎 (`src/core/note-scanner.ts`)
- [x] **范围限定**：仅处理被 Markdown 笔记显式引用的本地图片（`![[...]]` 与 `![](...)`），非笔记引用的孤立图片仅统计数量、不执行修改。
- [x] **去重与统计**：构建 `Map<imagePath, { imageFile, notes: TFile[] }>` 去重队列，实现全库/单篇笔记图片统计（引用图片数、关联笔记数、未引用孤立图片数、引用图片总字节数）。
- [x] **三种处理模式与幂等跳过**：
  - `rename-and-move`：仅按【粘贴与拖拽】模板移动位置与修改名称，不重编码图片；已在目标目录且无需改名的自动跳过。
  - `compress-and-convert`：仅按【压缩与格式转换】参数压缩转格式，保持原目录与原文件名（仅当格式变化时改后缀）；格式已匹配且无需压缩的自动跳过。
  - `both`：同时执行压缩转换与目录/文件名归档。
- [x] **单图原子提交与防丢图（Copy-then-Swap）**：
  - 写入 `pendingTransaction` 状态；
  - 若目标路径或格式变化：先 `vault.createBinary(newPath, buffer)` 写入新图 → 通过 `vault.process()` 原子替换所有关联笔记内的链接 → 将旧图通过 `vault.trash(oldFile, false)` 移入 `.trash` 回收站；
  - 若路径与后缀均未变且仅压缩体积：直接 `vault.modifyBinary()`；
  - 清除 `pendingTransaction`。
- [x] **异常中断自检与修复 (`recoverPendingBatchTransaction`)**：校验残留事务，若旧图仍在则回滚链接并清理半成品新图；若新图已就绪则补齐链接替换并将旧图移入回收站。
- [x] **预留远程图片批量接口 (`BatchRemoteImageHandler`)**：在代码中保留接口定义与扩展入口，UI 暂不展示。

### 任务 3：防中断确认弹窗与进度锁弹窗 (`src/ui/batch-modals.ts`)
- [x] **处理前确认弹窗 (`BatchConfirmModal`)**：展示待处理范围（当前笔记 / 全库笔记）、当前所选模式、生效的命名/压缩规则摘要、待处理图片数与关联笔记数、防中断提示（原图移入回收站备份）。
- [x] **处理中锁定进度弹窗 (`BatchProgressModal`)**：禁用遮罩点击与 `Esc` 强退，拦截窗口 `beforeunload` 事件，实时展示处理进度 `(n / N)` 与当前文件名，提供「安全停止」按钮（等待当前单图原子事务完成后安全退出）。

### 任务 4：设置面板操作卡片与统计栏 (`src/settings.ts`, `styles.css`, `src/main.ts`)
- [x] 在「批量处理」分组下渲染：
  1. 批量处理内容（下拉菜单：`修改图片名称和位置` / `转换图片格式并压缩` / `以上都有`）；
  2. 批量处理当前笔记中的图片（显示当前激活笔记名 + 右侧 `处理当前笔记` 按钮）；
  3. 批量处理全库笔记中的图片（说明 + 右侧 `处理全库图片` 按钮）；
  4. 异常中断恢复校验（说明 + 右侧 `校验并修复` 按钮）；
  5. 底部实时统计状态栏（展示笔记引用图片数、关联笔记数、未引用跳过图片数、总体积）。
- [x] 在 `src/main.ts` 启动时自动检查是否存在异常中断事务，移除右键菜单冗余入口，保持命令面板兼容。
- [x] 运行 `npm run lint` 与 `npm run build` 验证零错误通过。
