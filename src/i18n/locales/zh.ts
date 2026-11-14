import type { TranslationSchema } from '../types';

const zh: TranslationSchema = {
  commands: {
    processAllInNote: '批量处理当前笔记中的图片',
    processSingleUnderCursor: '处理当前行的图片',
  },
  notices: {
    processedImage: (name) => `已处理图片：${name}`,
    failedProcessImage: (name) => `处理图片失败：${name}`,
    processedRemoteImage: (name) => `已处理远程图片：${name}`,
    failedDownloadRemote: (url) => `下载远程图片失败：${url}`,
    processedCountInNote: (count) => `当前笔记已处理 ${count} 张图片。`,
    noImageOnLine: '当前行未找到图片。',
    noActiveMarkdownNote: '当前未打开任何 Markdown 笔记。',
    noReferencedImages: '未找到任何笔记引用的本地图片。',
    batchCompleted: (processed, skipped, failed, savedText) =>
      `批量处理完成：成功 ${processed} 张，跳过 ${skipped} 张${failed > 0 ? `，失败 ${failed} 张` : ''}${savedText ? `，节省 ${savedText}` : ''}。`,
    batchCancelled: (processed, skipped) =>
      `已安全停止批量处理：已完成 ${processed} 张，跳过 ${skipped} 张（已处理图片的链接均已同步更新）。`,
    recoveryNoPending: '校验完成：未检测到异常中断的残留任务，所有图片与链接状态正常。',
    recoveryRepaired: (oldPath) => `已修复上次异常中断的任务并恢复图片：${oldPath}`,
  },
  modals: {
    confirmTitle: '确认执行批量图片处理',
    scopeCurrentNote: (noteName) => `处理范围：当前笔记《${noteName}》`,
    scopeAllVault: (noteCount) => `处理范围：全库共 ${noteCount} 篇包含图片的笔记`,
    imageCountLabel: (count) => `待扫描笔记图片：共 ${count} 张（非笔记引用的孤立图片将自动忽略）`,
    modeLabel: (modeText) => `处理内容：${modeText}`,
    ruleHintRename: (folderTpl, nameTpl) =>
      `位置与命名规则（遵循【粘贴与拖拽】配置）：目录「${folderTpl || '/'}」，文件名「${nameTpl}」`,
    ruleHintCompress: (format, quality, maxW, maxH) =>
      `压缩与转换规则（遵循【压缩与格式转换】配置）：格式「${format}」，质量 ${quality}，最大尺寸 ${maxW || '不限'}×${maxH || '不限'}`,
    warningHint:
      '注意：处理期间请勿关闭 Obsidian 或手动编辑相关笔记。每张图片处理后会同步更新对应文章内的链接，被替换的原文件将移入系统/库回收站（.trash）以备恢复。',
    confirmStartBtn: '开始处理',
    confirmCancelBtn: '取消',
    progressTitle: '正在批量处理图片...',
    progressWarning: '正在处理图片并同步更新文章链接，请勿关闭窗口。如需中止请点击下方「安全停止」。',
    progressStatus: (current, total, fileName) => `正在处理 (${current} / ${total})：${fileName}`,
    safeStopBtn: '安全停止',
    stoppingBtn: '正在完成当前图片并安全停止...',
  },
  settings: {
    language: {
      heading: '语言',
      name: '显示语言',
      desc: '默认跟随 Obsidian 语言，也可手动指定。',
      options: {
        auto: '跟随 Obsidian',
        en: 'English',
        zh: '简体中文',
      },
    },
    paste: {
      heading: '粘贴与拖拽',
      enableName: '启用静默粘贴与拖拽处理',
      enableDesc: '自动处理并整理粘贴或拖拽进来的图片。',
      targetFolderName: '目标文件夹模板',
      targetFolderDesc:
        '支持变量：${noteName}, ${noteFolder}, ${date:YYYY-MM-DD}, ${year}, ${month}, ${day}。',
      filenameTemplateName: '文件名模板',
      filenameTemplateDesc:
        '支持变量：${noteName}, ${originalName}, ${timestamp}, ${date:YYYYMMDDHHmmss}, ${hash:8}。',
    },
    compression: {
      heading: '压缩与格式转换',
      enableName: '启用压缩与格式转换',
      enableDesc: '使用硬件加速压缩或转换图片格式。',
      targetFormatName: '目标格式',
      targetFormatDesc: '输出图片格式。动态 GIF 和 SVG 将自动跳过。',
      formatOptions: {
        original: '保持原格式',
        webp: 'Webp',
        jpeg: 'JPEG',
        png: 'PNG',
      },
      qualityName: '压缩质量',
      qualityDesc: '压缩质量范围 1 到 100。',
      maxWidthName: '最大宽度',
      maxWidthDesc: '最大像素宽度（0 表示不限制）。',
      maxHeightName: '最大高度',
      maxHeightDesc: '最大像素高度（0 表示不限制）。',
      skipLargerName: '跳过体积变大的结果',
      skipLargerDesc: '如果处理后文件比原图更大，则保留原图。',
    },
    batch: {
      heading: '批量处理',
      modeName: '批量处理内容',
      modeDesc:
        '选择批量执行的操作类型。修改位置与名称遵循上方【粘贴与拖拽】中的模板配置；转换格式与压缩遵循上方【压缩与格式转换】中的参数配置（非笔记引用的图片不会处理）。',
      modeOptions: {
        'rename-and-move': '1. 修改图片名称和位置',
        'compress-and-convert': '2. 转换图片格式并压缩',
        both: '3. 以上都有',
      },
      currentNoteName: '批量处理当前笔记中的图片',
      currentNoteDesc: (activeNoteName) =>
        activeNoteName
          ? `对当前打开的笔记《${activeNoteName}》引用的本地图片执行批量处理，并自动更新文内链接。`
          : '当前未打开任何 Markdown 笔记，请先在编辑器中打开一篇笔记。',
      currentNoteBtn: '处理当前笔记',
      allVaultName: '批量处理全库笔记中的图片',
      allVaultDesc:
        '扫描当前库内所有 Markdown 笔记引用的本地图片，批量处理并同步修改对应文章中的链接。被替换的原图将移入 .trash 回收站以备恢复。',
      allVaultBtn: '处理全库图片',
      recoveryName: '异常中断校验与恢复',
      recoveryDesc: (hasPending) =>
        hasPending
          ? '检测到上次批量操作存在未完成的图片事务，点击右侧按钮立即回滚修复。'
          : '如遇意外断电或强制关闭导致批量操作中断，可使用此功能校验并修复残留图片与链接。',
      recoveryBtn: '校验并修复',
      statsSummary: (referencedImages, referencedNotes, unreferencedImages, sizeMB) =>
        `笔记引用图片: ${referencedImages} 张（关联 ${referencedNotes} 篇笔记） · 未引用跳过图片: ${unreferencedImages} 张 · 引用图片总占用: ${sizeMB} MB`,
    },
    remote: {
      heading: '远程图片',
      enableName: '启用远程图片下载',
      enableDesc: '在粘贴或运行命令时自动下载远程图片。',
      replaceLinkName: '替换远程链接',
      replaceLinkDesc: '下载完成后将远程链接替换为本地库链接。',
    },
  },
};

export default zh;
