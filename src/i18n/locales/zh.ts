import type { TranslationSchema } from '../types';

const zh: TranslationSchema = {
  commands: {
    processAllInNote: '处理当前笔记中的所有图片',
    processSingleUnderCursor: '处理当前行的图片',
  },
  menu: {
    compressAndOrganize: '压缩并整理图片',
  },
  notices: {
    processedImage: (name) => `已处理图片：${name}`,
    failedProcessImage: (name) => `处理图片失败：${name}`,
    processedRemoteImage: (name) => `已处理远程图片：${name}`,
    failedDownloadRemote: (url) => `下载远程图片失败：${url}`,
    processedCountInNote: (count) => `当前笔记已处理 ${count} 张图片。`,
    noImageOnLine: '当前行未找到图片。',
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
    existingImages: {
      heading: '存量笔记图片',
      enableName: '启用存量图片管理',
      enableDesc: '允许整理和转换笔记中已有的图片。',
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
