import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import {
	isImageFile,
	processAllImagesInNote,
	processImageUnderCursor,
	processSingleImageFile,
} from './core/note-scanner';
import { registerPasteAndDropHandlers } from './handlers/paste-drop-handler';
import {
	DEFAULT_SETTINGS,
	ImagePluginSettings,
	ImageSettingTab,
	mergeSettings,
} from './settings';

export default class ImagePlugin extends Plugin {
	settings!: ImagePluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ImageSettingTab(this.app, this));
		registerPasteAndDropHandlers(this);

		this.addCommand({
			id: 'process-all-images-in-current-note',
			name: 'Process all images in current note',
			checkCallback: (checking: boolean) => {
				if (!this.settings.existingImages.enabled) {
					return false;
				}
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view || !view.file) {
					return false;
				}
				if (!checking) {
					void processAllImagesInNote(this.app, view, this.settings);
				}
				return true;
			},
		});

		this.addCommand({
			id: 'process-single-image-under-cursor',
			name: 'Process image on current line',
			editorCheckCallback: (
				checking: boolean,
				editor: Editor,
				ctx,
			) => {
				if (!this.settings.existingImages.enabled || !ctx.file) {
					return false;
				}
				if (!checking) {
					void processImageUnderCursor(
						this.app,
						editor,
						ctx.file,
						this.settings,
					);
				}
				return true;
			},
		});

		this.registerEvent(
			this.app.workspace.on('file-menu', (menu, file) => {
				if (
					!this.settings.existingImages.enabled ||
					!(file instanceof TFile) ||
					!isImageFile(file)
				) {
					return;
				}
				menu.addItem((item) => {
					item
						.setTitle('Compress and organize image')
						.setIcon('image')
						.onClick(() => {
							const activeNote = this.app.workspace.getActiveFile();
							void processSingleImageFile(
								this.app,
								file,
								activeNote,
								this.settings,
							).then(
								(updated) => {
									new Notice(`Processed image: ${updated.name}`);
								},
								() => {
									new Notice(`Failed to process image: ${file.name}`);
								},
							);
						});
				});
			}),
		);
	}

	onunload() {}

	async loadSettings() {
		const saved = (await this.loadData()) as Partial<ImagePluginSettings> | null;
		this.settings = mergeSettings(DEFAULT_SETTINGS, saved);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
