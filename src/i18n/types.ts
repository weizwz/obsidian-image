import type { BatchProcessMode, LanguageSetting } from '../types';

export interface TranslationSchema {
  commands: {
    processAllInNote: string;
    processSingleUnderCursor: string;
  };
  notices: {
    processedImage: (name: string) => string;
    failedProcessImage: (name: string) => string;
    processedRemoteImage: (name: string) => string;
    failedDownloadRemote: (url: string) => string;
    processedCountInNote: (count: number) => string;
    noImageOnLine: string;
    noActiveMarkdownNote: string;
    noReferencedImages: string;
    batchCompleted: (processed: number, skipped: number, failed: number, savedText: string) => string;
    batchCancelled: (processed: number, skipped: number) => string;
    recoveryNoPending: string;
    recoveryRepaired: (oldPath: string) => string;
  };
  modals: {
    confirmTitle: string;
    scopeCurrentNote: (noteName: string) => string;
    scopeAllVault: (noteCount: number) => string;
    imageCountLabel: (count: number) => string;
    modeLabel: (modeText: string) => string;
    ruleHintRename: (folderTpl: string, nameTpl: string) => string;
    ruleHintCompress: (format: string, quality: number, maxW: number, maxH: number) => string;
    warningHint: string;
    confirmStartBtn: string;
    confirmCancelBtn: string;
    progressTitle: string;
    progressWarning: string;
    progressStatus: (current: number, total: number, fileName: string) => string;
    safeStopBtn: string;
    stoppingBtn: string;
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
    batch: {
      heading: string;
      modeName: string;
      modeDesc: string;
      modeOptions: Record<BatchProcessMode, string>;
      currentNoteName: string;
      currentNoteDesc: (activeNoteName: string | null) => string;
      currentNoteBtn: string;
      allVaultName: string;
      allVaultDesc: string;
      allVaultBtn: string;
      recoveryName: string;
      recoveryDesc: (hasPending: boolean) => string;
      recoveryBtn: string;
      statsSummary: (
        referencedImages: number,
        referencedNotes: number,
        unreferencedImages: number,
        sizeMB: string,
      ) => string;
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
