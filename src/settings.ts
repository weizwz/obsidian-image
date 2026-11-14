import { App, Notice, PluginSettingTab, type SettingDefinitionItem, TFile } from 'obsidian';
import { recoverPendingBatchTransaction, scanVaultImageStats } from './core/note-scanner';
import { setLanguageSetting, t } from './i18n';
import type ImagePlugin from './main';
import type { BatchProcessMode, ImagePluginSettings, LanguageSetting, TargetFormat } from './types';
import { runInteractiveBatchProcess } from './ui/batch-modals';

export type { ImagePluginSettings } from './types';

export const DEFAULT_SETTINGS: ImagePluginSettings = {
  version: 2,
  language: 'auto',
  paste: {
    enabled: false,
    targetFolder: '${noteFolder}/assets/${noteName}',
    filenameTemplate: '${noteName}-${timestamp}',
  },
  compression: {
    enabled: false,
    targetFormat: 'original',
    quality: 80,
    maxWidth: 0,
    maxHeight: 0,
    skipLargerOutput: true,
  },
  existingImages: {
    mode: 'both',
    pendingTransaction: null,
  },
  remote: {
    enabled: false,
    replaceLink: false,
  },
  extensions: {},
};

function isValidBatchMode(mode: unknown): mode is BatchProcessMode {
  return mode === 'rename-and-move' || mode === 'compress-and-convert' || mode === 'both';
}

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

  const savedMode = saved.existingImages?.mode;
  const mode: BatchProcessMode = isValidBatchMode(savedMode)
    ? savedMode
    : defaults.existingImages.mode;

  return {
    version: defaults.version,
    language,
    paste: Object.assign({}, defaults.paste, saved.paste),
    compression: Object.assign({}, defaults.compression, saved.compression),
    existingImages: {
      mode,
      pendingTransaction: saved.existingImages?.pendingTransaction ?? null,
    },
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

  private getActiveMarkdownFile(): TFile | null {
    const file = this.app.workspace.getActiveFile();
    if (file instanceof TFile && file.extension.toLowerCase() === 'md') {
      return file;
    }
    return null;
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
      case 'existingImages.mode':
        return settings.existingImages.mode;
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
      case 'existingImages.mode':
        if (isValidBatchMode(value)) {
          settings.existingImages.mode = value;
        }
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
    const lang = this.plugin.settings.language;
    const i18n = t(lang).settings;
    const notices = t(lang).notices;
    const activeNote = this.getActiveMarkdownFile();
    const hasPending = Boolean(this.plugin.settings.existingImages.pendingTransaction);

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
        heading: i18n.batch.heading,
        items: [
          {
            name: i18n.batch.modeName,
            desc: i18n.batch.modeDesc,
            control: {
              type: 'dropdown',
              key: 'existingImages.mode',
              options: i18n.batch.modeOptions,
            },
          },
          {
            name: i18n.batch.currentNoteName,
            desc: i18n.batch.currentNoteDesc(activeNote?.name ?? null),
            render: (setting) => {
              setting.addButton((btn) => {
                btn
                  .setButtonText(i18n.batch.currentNoteBtn)
                  .setDisabled(!activeNote)
                  .onClick(() => {
                    const currentActive = this.getActiveMarkdownFile();
                    if (!currentActive) {
                      new Notice(notices.noActiveMarkdownNote);
                      return;
                    }
                    void runInteractiveBatchProcess(
                      this.app,
                      'current-note',
                      [currentActive],
                      this.plugin.settings,
                      () => this.plugin.saveSettings(),
                      () => this.update(),
                    );
                  });
              });
            },
          },
          {
            name: i18n.batch.allVaultName,
            desc: i18n.batch.allVaultDesc,
            render: (setting) => {
              setting.addButton((btn) => {
                btn.setButtonText(i18n.batch.allVaultBtn).onClick(() => {
                  const allNotes = this.app.vault.getMarkdownFiles();
                  void runInteractiveBatchProcess(
                    this.app,
                    'all-vault',
                    allNotes,
                    this.plugin.settings,
                    () => this.plugin.saveSettings(),
                    () => this.update(),
                  );
                });
              });
            },
          },
          {
            name: i18n.batch.recoveryName,
            desc: i18n.batch.recoveryDesc(hasPending),
            render: (setting) => {
              setting.addButton((btn) => {
                if (hasPending) {
                  btn.setCta();
                }
                btn.setButtonText(i18n.batch.recoveryBtn).onClick(() => {
                  void recoverPendingBatchTransaction(
                    this.app,
                    this.plugin.settings,
                    () => this.plugin.saveSettings(),
                  ).then((repairedPath) => {
                    if (repairedPath) {
                      new Notice(notices.recoveryRepaired(repairedPath));
                    } else {
                      new Notice(notices.recoveryNoPending);
                    }
                    this.update();
                  });
                });
              });
            },
          },
          {
            name: '',
            searchable: false,
            render: (setting) => {
              setting.settingEl.addClass('image-batch-stats-row');
              void scanVaultImageStats(this.app).then((stats) => {
                const sizeMB = (stats.totalReferencedBytes / (1024 * 1024)).toFixed(2);
                setting.setDesc(
                  i18n.batch.statsSummary(
                    stats.referencedImages,
                    stats.referencedNotes,
                    stats.unreferencedImages,
                    sizeMB,
                  ),
                );
              });
            },
          },
        ],
      },
    ];
  }
}
