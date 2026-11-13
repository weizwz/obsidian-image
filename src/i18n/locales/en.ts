import type { TranslationSchema } from '../types';

const en: TranslationSchema = {
  commands: {
    processAllInNote: 'Process all images in current note',
    processSingleUnderCursor: 'Process image on current line',
  },
  menu: {
    compressAndOrganize: 'Compress and organize image',
  },
  notices: {
    processedImage: (name) => `Processed image: ${name}`,
    failedProcessImage: (name) => `Failed to process image: ${name}`,
    processedRemoteImage: (name) => `Processed remote image: ${name}`,
    failedDownloadRemote: (url) => `Failed to download remote image: ${url}`,
    processedCountInNote: (count) => `Processed ${count} image(s) in current note.`,
    noImageOnLine: 'No image found on the current line.',
  },
  settings: {
    language: {
      heading: 'Language',
      name: 'Display language',
      desc: 'Follow Obsidian language or choose a specific language.',
      options: {
        auto: 'Follow system (Obsidian)',
        en: 'English',
        zh: '简体中文',
      },
    },
    paste: {
      heading: 'Paste and drop',
      enableName: 'Enable silent paste and drop processing',
      enableDesc: 'Automatically process and organize pasted or dropped images.',
      targetFolderName: 'Target folder template',
      targetFolderDesc:
        'Variables: ${noteName}, ${noteFolder}, ${date:YYYY-MM-DD}, ${year}, ${month}, ${day}.',
      filenameTemplateName: 'Filename template',
      filenameTemplateDesc:
        'Variables: ${noteName}, ${originalName}, ${timestamp}, ${date:YYYYMMDDHHmmss}, ${hash:8}.',
    },
    compression: {
      heading: 'Compression and conversion',
      enableName: 'Enable compression and conversion',
      enableDesc: 'Compress or convert images using hardware acceleration.',
      targetFormatName: 'Target format',
      targetFormatDesc: 'Output image format. Animated GIF and SVG are skipped.',
      formatOptions: {
        original: 'Original',
        webp: 'Webp',
        jpeg: 'JPEG',
        png: 'PNG',
      },
      qualityName: 'Quality',
      qualityDesc: 'Compression quality from 1 to 100.',
      maxWidthName: 'Max width',
      maxWidthDesc: 'Maximum width in pixels (0 for unlimited).',
      maxHeightName: 'Max height',
      maxHeightDesc: 'Maximum height in pixels (0 for unlimited).',
      skipLargerName: 'Skip larger output',
      skipLargerDesc: 'Keep original image if the processed output is larger.',
    },
    existingImages: {
      heading: 'Existing note images',
      enableName: 'Enable existing image management',
      enableDesc: 'Allow organizing and converting existing images in notes.',
    },
    remote: {
      heading: 'Remote images',
      enableName: 'Enable remote image download',
      enableDesc: 'Download remote images when pasting or running commands.',
      replaceLinkName: 'Replace remote link',
      replaceLinkDesc: 'Replace remote links with local vault links after download.',
    },
  },
};

export default en;
