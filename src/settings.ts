import { App, PluginSettingTab, type SettingDefinitionItem } from 'obsidian';
import { setLanguageSetting, t } from './i18n';
import type ImagePlugin from './main';
import type { ImagePluginSettings, LanguageSetting, TargetFormat } from './types';

export type { ImagePluginSettings } from './types';

export const DEFAULT_SETTINGS: ImagePluginSettings = {
  version: 1,
  language: 'auto',
  paste: {
    enabled: false,
    targetFolder: '${noteFolder}/assets/${noteName}',
    filenameTemplate: '${noteName}-${timestamp}',
  },
  compression: {
    enabled: false,
    targetFormat: 'original',
    quality: 100,
    maxWidth: 0,
    maxHeight: 0,
    skipLargerOutput: true,
  },
  existingImages: {
    enabled: false,
  },
  remote: {
    enabled: false,
    replaceLink: false,
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
  const language: LanguageSetting =
    saved.language === 'en' || saved.language === 'zh' || saved.language === 'auto'
      ? saved.language
      : defaults.language;

  return {
    version: defaults.version,
    language,
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
      case 'language':
        return settings.language;
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
      case 'language': {
        const nextLang: LanguageSetting =
          value === 'en' || value === 'zh' || value === 'auto' ? value : 'auto';
        settings.language = nextLang;
        setLanguageSetting(nextLang);
        await this.plugin.saveSettings();
        this.plugin.refreshLocalizedCommands();
        this.update();
        return;
      }
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
    const i18n = t(this.plugin.settings.language).settings;

    return [
      {
        type: 'group',
        heading: i18n.language.heading,
        items: [
          {
            name: i18n.language.name,
            desc: i18n.language.desc,
            control: {
              type: 'dropdown',
              key: 'language',
              options: i18n.language.options,
            },
          },
        ],
      },
      {
        type: 'group',
        heading: i18n.paste.heading,
        items: [
          {
            name: i18n.paste.enableName,
            desc: i18n.paste.enableDesc,
            control: {
              type: 'toggle',
              key: 'paste.enabled',
            },
          },
          {
            name: i18n.paste.targetFolderName,
            desc: i18n.paste.targetFolderDesc,
            control: {
              type: 'text',
              key: 'paste.targetFolder',
              placeholder: '${noteFolder}/assets/${noteName}',
            },
          },
          {
            name: i18n.paste.filenameTemplateName,
            desc: i18n.paste.filenameTemplateDesc,
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
        heading: i18n.compression.heading,
        items: [
          {
            name: i18n.compression.enableName,
            desc: i18n.compression.enableDesc,
            control: {
              type: 'toggle',
              key: 'compression.enabled',
            },
          },
          {
            name: i18n.compression.targetFormatName,
            desc: i18n.compression.targetFormatDesc,
            control: {
              type: 'dropdown',
              key: 'compression.targetFormat',
              options: i18n.compression.formatOptions,
            },
          },
          {
            name: i18n.compression.qualityName,
            desc: i18n.compression.qualityDesc,
            control: {
              type: 'slider',
              key: 'compression.quality',
              min: 1,
              max: 100,
              step: 1,
            },
          },
          {
            name: i18n.compression.maxWidthName,
            desc: i18n.compression.maxWidthDesc,
            control: {
              type: 'number',
              key: 'compression.maxWidth',
              min: 0,
              placeholder: '0',
            },
          },
          {
            name: i18n.compression.maxHeightName,
            desc: i18n.compression.maxHeightDesc,
            control: {
              type: 'number',
              key: 'compression.maxHeight',
              min: 0,
              placeholder: '0',
            },
          },
          {
            name: i18n.compression.skipLargerName,
            desc: i18n.compression.skipLargerDesc,
            control: {
              type: 'toggle',
              key: 'compression.skipLargerOutput',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: i18n.existingImages.heading,
        items: [
          {
            name: i18n.existingImages.enableName,
            desc: i18n.existingImages.enableDesc,
            control: {
              type: 'toggle',
              key: 'existingImages.enabled',
            },
          },
        ],
      },
      {
        type: 'group',
        heading: i18n.remote.heading,
        items: [
          {
            name: i18n.remote.enableName,
            desc: i18n.remote.enableDesc,
            control: {
              type: 'toggle',
              key: 'remote.enabled',
            },
          },
          {
            name: i18n.remote.replaceLinkName,
            desc: i18n.remote.replaceLinkDesc,
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
