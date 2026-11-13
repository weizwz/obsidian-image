export type TargetFormat = 'original' | 'webp' | 'jpeg' | 'png';

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
