export type TargetFormat = 'original' | 'webp' | 'jpeg' | 'png';

export type SupportedLocale = 'en' | 'zh';
export type LanguageSetting = 'auto' | SupportedLocale;

export type BatchProcessMode = 'rename-and-move' | 'compress-and-convert' | 'both';

export interface PendingBatchTransaction {
  oldPath: string;
  newPath: string;
  affectedNotes: string[];
  timestamp: number;
}

export interface PasteRuleSettings {
  enabled: boolean;
  targetFolder: string;
  filenameTemplate: string;
}

export interface CompressionSettings {
  enabled: boolean;
  targetFormat: TargetFormat;
  quality: number;
  maxWidth: number;
  maxHeight: number;
  skipLargerOutput: boolean;
}

export interface ExistingImagesSettings {
  mode: BatchProcessMode;
  pendingTransaction?: PendingBatchTransaction | null;
}

export interface RemoteImagesSettings {
  enabled: boolean;
  replaceLink: boolean;
}

export interface ImagePluginSettings {
  version: number;
  language: LanguageSetting;
  paste: PasteRuleSettings;
  compression: CompressionSettings;
  existingImages: ExistingImagesSettings;
  remote: RemoteImagesSettings;
  extensions?: Record<string, unknown>;
}

export interface ProcessedImageResult {
  buffer: ArrayBuffer;
  extension: string;
  mimeType: string;
  changedFormat: boolean;
}

export interface ResolvedTarget {
  folderPath: string;
  fileName: string;
  fullPath: string;
}

export interface VaultImageStats {
  currentNoteReferencedImages: number;
  currentNoteReferencedBytes: number;
  referencedImages: number;
  referencedNotes: number;
  unreferencedImages: number;
  totalReferencedBytes: number;
}

export interface BatchProcessResult {
  processed: number;
  skipped: number;
  failed: number;
  savedBytes: number;
  cancelled: boolean;
}

export interface BatchRemoteImageHandler {
  processRemoteImagesInNotes: (notePaths: string[]) => Promise<number>;
}
