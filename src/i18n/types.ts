import type { LanguageSetting } from '../types';

export interface TranslationSchema {
  commands: {
    processAllInNote: string;
    processSingleUnderCursor: string;
  };
  menu: {
    compressAndOrganize: string;
  };
  notices: {
    processedImage: (name: string) => string;
    failedProcessImage: (name: string) => string;
    processedRemoteImage: (name: string) => string;
    failedDownloadRemote: (url: string) => string;
    processedCountInNote: (count: number) => string;
    noImageOnLine: string;
  };
  settings: {
    language: {
      heading: string;
      name: string;
      desc: string;
      options: Record<LanguageSetting, string>;
    };
    paste: {
      heading: string;
      enableName: string;
      enableDesc: string;
      targetFolderName: string;
      targetFolderDesc: string;
      filenameTemplateName: string;
      filenameTemplateDesc: string;
    };
    compression: {
      heading: string;
      enableName: string;
      enableDesc: string;
      targetFormatName: string;
      targetFormatDesc: string;
      formatOptions: {
        original: string;
        webp: string;
        jpeg: string;
        png: string;
      };
      qualityName: string;
      qualityDesc: string;
      maxWidthName: string;
      maxWidthDesc: string;
      maxHeightName: string;
      maxHeightDesc: string;
      skipLargerName: string;
      skipLargerDesc: string;
    };
    existingImages: {
      heading: string;
      enableName: string;
      enableDesc: string;
    };
    remote: {
      heading: string;
      enableName: string;
      enableDesc: string;
      replaceLinkName: string;
      replaceLinkDesc: string;
    };
  };
}
