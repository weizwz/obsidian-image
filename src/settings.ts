import { App, PluginSettingTab } from 'obsidian';
import ImagePlugin from './main';

export interface ImagePluginSettings {
	[key: string]: unknown;
}

export const DEFAULT_SETTINGS: ImagePluginSettings = {};

export class ImageSettingTab extends PluginSettingTab {
	plugin: ImagePlugin;

	constructor(app: App, plugin: ImagePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
	}
}
