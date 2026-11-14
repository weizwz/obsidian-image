import { App, ButtonComponent, Modal, Notice, Setting, TFile } from 'obsidian';
import {
  collectReferencedImagesFromNotes,
  executeBatchProcessOnEntries,
  type ReferencedImageEntry,
} from '../core/note-scanner';
import { t } from '../i18n';
import type { ImagePluginSettings } from '../types';

export interface BatchConfirmContext {
  scopeType: 'current-note' | 'all-vault';
  noteName?: string;
  noteCount: number;
  imageCount: number;
  settings: ImagePluginSettings;
  onConfirm: () => void;
}

export class BatchConfirmModal extends Modal {
  private ctx: BatchConfirmContext;

  constructor(app: App, ctx: BatchConfirmContext) {
    super(app);
    this.ctx = ctx;
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('image-batch-modal');

    const i18n = t(this.ctx.settings.language);
    this.setTitle(i18n.modals.confirmTitle);

    const infoList = contentEl.createDiv({ cls: 'image-batch-info-list' });

    const scopeText =
      this.ctx.scopeType === 'current-note'
        ? i18n.modals.scopeCurrentNote(this.ctx.noteName ?? '')
        : i18n.modals.scopeAllVault(this.ctx.noteCount);

    infoList.createDiv({
      cls: 'image-batch-info-item',
      text: scopeText,
    });

    infoList.createDiv({
      cls: 'image-batch-info-item',
      text: i18n.modals.imageCountLabel(this.ctx.imageCount),
    });

    const mode = this.ctx.settings.existingImages.mode;
    const modeLabel = i18n.settings.batch.modeOptions[mode];
    infoList.createDiv({
      cls: 'image-batch-info-item image-batch-info-highlight',
      text: i18n.modals.modeLabel(modeLabel),
    });

    if (mode === 'rename-and-move' || mode === 'both') {
      infoList.createDiv({
        cls: 'image-batch-rule-item',
        text: i18n.modals.ruleHintRename(
          this.ctx.settings.paste.targetFolder,
          this.ctx.settings.paste.filenameTemplate,
        ),
      });
    }

    if (mode === 'compress-and-convert' || mode === 'both') {
      const fmtText =
        i18n.settings.compression.formatOptions[this.ctx.settings.compression.targetFormat];
      infoList.createDiv({
        cls: 'image-batch-rule-item',
        text: i18n.modals.ruleHintCompress(
          fmtText,
          this.ctx.settings.compression.quality,
          this.ctx.settings.compression.maxWidth,
          this.ctx.settings.compression.maxHeight,
        ),
      });
    }

    contentEl.createDiv({
      cls: 'image-batch-warning-box',
      text: i18n.modals.warningHint,
    });

    new Setting(contentEl)
      .addButton((btn) => {
        btn.setButtonText(i18n.modals.confirmCancelBtn).onClick(() => {
          this.close();
        });
      })
      .addButton((btn) => {
        btn
          .setButtonText(i18n.modals.confirmStartBtn)
          .setCta()
          .onClick(() => {
            this.close();
            this.ctx.onConfirm();
          });
      });
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export class BatchProgressModal extends Modal {
  private settings: ImagePluginSettings;
  private statusEl!: HTMLElement;
  private progressBarFillEl!: HTMLElement;
  private stopBtn: ButtonComponent | null = null;
  private stopRequested = false;
  private canClose = false;
  private beforeUnloadHandler: (evt: BeforeUnloadEvent) => void;

  constructor(app: App, settings: ImagePluginSettings) {
    super(app);
    this.settings = settings;
    this.beforeUnloadHandler = (evt: BeforeUnloadEvent) => {
      evt.preventDefault();
    };
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('image-batch-modal');

    const closeBtn = this.modalEl.querySelector('.modal-close-button');
    if (closeBtn instanceof HTMLElement) {
      closeBtn.hide();
    }

    const i18n = t(this.settings.language);
    this.setTitle(i18n.modals.progressTitle);

    contentEl.createDiv({
      cls: 'image-batch-warning-box',
      text: i18n.modals.progressWarning,
    });

    this.statusEl = contentEl.createDiv({
      cls: 'image-batch-progress-status',
      text: i18n.modals.progressStatus(0, 0, ''),
    });

    const barTrack = contentEl.createDiv({ cls: 'image-batch-progress-track' });
    this.progressBarFillEl = barTrack.createDiv({ cls: 'image-batch-progress-fill' });

    new Setting(contentEl).addButton((btn) => {
      this.stopBtn = btn;
      btn.setButtonText(i18n.modals.safeStopBtn).onClick(() => {
        this.stopRequested = true;
        btn.setDisabled(true);
        btn.setButtonText(i18n.modals.stoppingBtn);
      });
    });

    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  updateProgress(current: number, total: number, fileName: string): void {
    const i18n = t(this.settings.language);
    if (this.statusEl) {
      this.statusEl.setText(i18n.modals.progressStatus(current, total, fileName));
    }
    if (this.progressBarFillEl && total > 0) {
      const pct = Math.min(100, Math.round((current / total) * 100));
      this.progressBarFillEl.style.width = `${pct}%`;
    }
  }

  isStopRequested(): boolean {
    return this.stopRequested;
  }

  forceClose(): void {
    this.canClose = true;
    this.close();
  }

  close(): void {
    if (!this.canClose) {
      return;
    }
    super.close();
  }

  onClose(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.contentEl.empty();
  }
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '';
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

let isBatchRunning = false;

export async function runInteractiveBatchProcess(
  app: App,
  scopeType: 'current-note' | 'all-vault',
  targetNotes: TFile[],
  settings: ImagePluginSettings,
  saveSettings: () => Promise<void>,
  onComplete?: () => void,
): Promise<void> {
  if (isBatchRunning) {
    return;
  }

  const i18n = t(settings.language);
  if (targetNotes.length === 0) {
    new Notice(i18n.notices.noActiveMarkdownNote);
    return;
  }

  const entries: ReferencedImageEntry[] = await collectReferencedImagesFromNotes(app, targetNotes);
  if (entries.length === 0) {
    new Notice(i18n.notices.noReferencedImages);
    return;
  }

  const referencedNotePaths = new Set<string>();
  for (const entry of entries) {
    for (const note of entry.referencingNotes) {
      referencedNotePaths.add(note.path);
    }
  }

  const confirmModal = new BatchConfirmModal(app, {
    scopeType,
    noteName: targetNotes[0]?.name,
    noteCount: referencedNotePaths.size,
    imageCount: entries.length,
    settings,
    onConfirm: () => {
      void startProgressBatch(app, entries, settings, saveSettings, onComplete);
    },
  });

  confirmModal.open();
}

async function startProgressBatch(
  app: App,
  entries: ReferencedImageEntry[],
  settings: ImagePluginSettings,
  saveSettings: () => Promise<void>,
  onComplete?: () => void,
): Promise<void> {
  isBatchRunning = true;
  const progressModal = new BatchProgressModal(app, settings);
  progressModal.open();

  try {
    const result = await executeBatchProcessOnEntries(
      app,
      entries,
      settings,
      saveSettings,
      (current, total, fileName) => {
        progressModal.updateProgress(current, total, fileName);
      },
      () => progressModal.isStopRequested(),
    );

    progressModal.forceClose();

    const i18n = t(settings.language);
    if (result.cancelled) {
      new Notice(i18n.notices.batchCancelled(result.processed, result.skipped), 6000);
    } else {
      const savedText = formatBytes(result.savedBytes);
      new Notice(
        i18n.notices.batchCompleted(result.processed, result.skipped, result.failed, savedText),
        6000,
      );
    }
  } finally {
    isBatchRunning = false;
    progressModal.forceClose();
    onComplete?.();
  }
}
