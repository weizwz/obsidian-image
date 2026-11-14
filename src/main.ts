import { Editor, MarkdownView, Notice, Plugin } from 'obsidian';
import { processImageUnderCursor, recoverPendingBatchTransaction } from './core/note-scanner';
import { registerPasteAndDropHandlers } from './handlers/paste-drop-handler';
import { setLanguageSetting, t } from './i18n';
import { DEFAULT_SETTINGS, ImagePluginSettings, ImageSettingTab, mergeSettings } from './settings';
import { runInteractiveBatchProcess } from './ui/batch-modals';

export default class ImagePlugin extends Plugin {
  settings!: ImagePluginSettings;

  async onload() {
    await this.loadSettings();
    this.addSettingTab(new ImageSettingTab(this.app, this));
    registerPasteAndDropHandlers(this);
    this.registerLocalizedCommands();

    this.app.workspace.onLayoutReady(() => {
      if (this.settings.existingImages.pendingTransaction) {
        void recoverPendingBatchTransaction(this.app, this.settings, () =>
          this.saveSettings(),
        ).then((repairedPath) => {
          if (repairedPath) {
            new Notice(t(this.settings.language).notices.recoveryRepaired(repairedPath));
          }
        });
      }
    });
  }

  onunload() {}

  registerLocalizedCommands() {
    const cmdText = t(this.settings.language).commands;

    this.addCommand({
      id: 'process-all-images-in-current-note',
      name: cmdText.processAllInNote,
      checkCallback: (checking: boolean) => {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view || !view.file) {
          return false;
        }
        if (!checking) {
          void runInteractiveBatchProcess(
            this.app,
            'current-note',
            [view.file],
            this.settings,
            () => this.saveSettings(),
          );
        }
        return true;
      },
    });

    this.addCommand({
      id: 'process-single-image-under-cursor',
      name: cmdText.processSingleUnderCursor,
      editorCheckCallback: (checking: boolean, editor: Editor, ctx) => {
        if (!ctx.file) {
          return false;
        }
        if (!checking) {
          void processImageUnderCursor(this.app, editor, ctx.file, this.settings);
        }
        return true;
      },
    });
  }

  refreshLocalizedCommands() {
    this.removeCommand('process-all-images-in-current-note');
    this.removeCommand('process-single-image-under-cursor');
    this.registerLocalizedCommands();
  }

  async loadSettings() {
    const saved = (await this.loadData()) as Partial<ImagePluginSettings> | null;
    this.settings = mergeSettings(DEFAULT_SETTINGS, saved);
    setLanguageSetting(this.settings.language);
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
