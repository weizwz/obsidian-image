import { App, PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import type ImagePlugin from './main';
import type { ImagePluginSettings, TargetFormat } from './types';

export type { ImagePluginSettings } from './types';

export const DEFAULT_SETTINGS: ImagePluginSettings = {
  version: 1,
  paste: {
    enabled: true,
    targetFolder: '${noteFolder}/assets/${noteName}',
    filenameTemplate: '${noteName}-${timestamp}',
  },
  compression: {
    enabled: true,
    targetFormat: 'webp',
    quality: 80,
    maxWidth: 0,
    maxHeight: 0,
    skipLargerOutput: true,
  },
  existingImages: {
    enabled: true,
  },
  remote: {
    enabled: false,
    replaceLink: true,
  },
  extensions: {},
};

export function mergeSettings(
  defaults: ImagePluginSettings,
  saved?: Partial<ImagePluginSettings> | null,
): ImagePluginSettings {
  if (!saved) {
    return structuredClone(defaults);
  }
  return {
    version: defaults.version,
    paste: Object.assign({}, defaults.paste, saved.paste),
    compression: Object.assign({}, defaults.compression, saved.compression),
    existingImages: Object.assign({}, defaults.existingImages, saved.existingImages),
    remote: Object.assign({}, defaults.remote, saved.remote),
    extensions: Object.assign({}, defaults.extensions, saved.extensions),
  };
}

export class ImageSettingTab extends PluginSettingTab {
  plugin: ImagePlugin;

  constructor(app: App, plugin: ImagePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getControlValue(key: string): unknown {
    const { settings } = this.plugin;
    switch (key) {
      case 'paste.enabled':
        return settings.paste.enabled;
      case 'paste.targetFolder':
        return settings.paste.targetFolder;
      case 'paste.filenameTemplate':
        return settings.paste.filenameTemplate;
      case 'compression.enabled':
        return settings.compression.enabled;
      case 'compression.targetFormat':
        return settings.compression.targetFormat;
      case 'compression.quality':
        return settings.compression.quality;
      case 'compression.maxWidth':
        return settings.compression.maxWidth;
      case 'compression.maxHeight':
        return settings.compression.maxHeight;
      case 'compression.skipLargerOutput':
        return settings.compression.skipLargerOutput;
      case 'existingImages.enabled':
        return settings.existingImages.enabled;
      case 'remote.enabled':
        return settings.remote.enabled;
      case 'remote.replaceLink':
        return settings.remote.replaceLink;
      default:
        return undefined;
    }
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    const { settings } = this.plugin;
    switch (key) {
      case 'paste.enabled':
        settings.paste.enabled = Boolean(value);
        break;
      case 'paste.targetFolder':
        settings.paste.targetFolder = String(value).trim();
        break;
      case 'paste.filenameTemplate':
        settings.paste.filenameTemplate = String(value).trim();
        break;
      case 'compression.enabled':
        settings.compression.enabled = Boolean(value);
        break;
      case 'compression.targetFormat':
        settings.compression.targetFormat = value as TargetFormat;
        break;
      case 'compression.quality':
        settings.compression.quality = Number(value);
        break;
      case 'compression.maxWidth':
        settings.compression.maxWidth = Math.max(0, Number(value) || 0);
        break;
      case 'compression.maxHeight':
        settings.compression.maxHeight = Math.max(0, Number(value) || 0);
        break;
      case 'compression.skipLargerOutput':
        settings.compression.skipLargerOutput = Boolean(value);
        break;
      case 'existingImages.enabled':
        settings.existingImages.enabled = Boolean(value);
        break;
      case 'remote.enabled':
        settings.remote.enabled = Boolean(value);
        break;
      case 'remote.replaceLink':
        settings.remote.replaceLink = Boolean(value);
        break;
      default:
        return;
    }
    await this.plugin.saveSettings();
  }

  getSettingDefinitions(): SettingDefinitionItem[] {
    return [
      {
        type: 'group',
        heading: 'Paste and drop',
        items: [
          {
            name: 'Enable silent paste and drop processing',
            desc: 'Automatically process and organize pasted or dropped images.',
            control: {
              type: 'toggle',
              key: 'paste.enabled',
            },
          },
          {
            name: 'Target folder template',
            desc: 'Variables: ${noteName}, ${noteFolder}, ${date:YYYY-MM-DD}, ${year}, ${month}, ${day}.',
            control: {
              type: 'text',
              key: 'paste.targetFolder',
              placeholder: '${noteFolder}/assets/${noteName}',
            },
          },
          {
            name: 'Filename template',
            desc: 'Variables: ${noteName}, ${originalName}, ${timestamp}, ${date:YYYYMMDDHHmmss}, ${hash:8}.',
            control: {
              type: 'text',
              key: 'paste.filenameTemplate',
              placeholder: '${date:YYYYMMDD_HHmmss}',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Compression and conversion',
        items: [
          {
            name: 'Enable compression and conversion',
            desc: 'Compress or convert images using hardware acceleration.',
            control: {
              type: 'toggle',
              key: 'compression.enabled',
            },
          },
          {
            name: 'Target format',
            desc: 'Output image format. Animated GIF and SVG are skipped.',
            control: {
              type: 'dropdown',
              key: 'compression.targetFormat',
              options: {
                original: 'Original',
                webp: 'Webp',
                jpeg: 'JPEG',
                png: 'PNG',
              },
            },
          },
          {
            name: 'Quality',
            desc: 'Compression quality from 1 to 100.',
            control: {
              type: 'slider',
              key: 'compression.quality',
              min: 1,
              max: 100,
              step: 1,
            },
          },
          {
            name: 'Max width',
            desc: 'Maximum width in pixels (0 for unlimited).',
            control: {
              type: 'number',
              key: 'compression.maxWidth',
              min: 0,
              placeholder: '0',
            },
          },
          {
            name: 'Max height',
            desc: 'Maximum height in pixels (0 for unlimited).',
            control: {
              type: 'number',
              key: 'compression.maxHeight',
              min: 0,
              placeholder: '0',
            },
          },
          {
            name: 'Skip larger output',
            desc: 'Keep original image if the processed output is larger.',
            control: {
              type: 'toggle',
              key: 'compression.skipLargerOutput',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Existing note images',
        items: [
          {
            name: 'Enable existing image management',
            desc: 'Allow organizing and converting existing images in notes.',
            control: {
              type: 'toggle',
              key: 'existingImages.enabled',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: 'Remote images',
        items: [
          {
            name: 'Enable remote image download',
            desc: 'Download remote images when pasting or running commands.',
            control: {
              type: 'toggle',
              key: 'remote.enabled',
            },
          },
          {
            name: 'Replace remote link',
            desc: 'Replace remote links with local vault links after download.',
            control: {
              type: 'toggle',
              key: 'remote.replaceLink',
            },
          },
        ],
      },
    ];
  }
}
