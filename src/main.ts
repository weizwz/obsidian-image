import { Plugin } from 'obsidian';
import {
	DEFAULT_SETTINGS,
	ImagePluginSettings,
	ImageSettingTab,
} from './settings';

export default class ImagePlugin extends Plugin {
	settings!: ImagePluginSettings;

	async onload() {
		await this.loadSettings();
		this.addSettingTab(new ImageSettingTab(this.app, this));
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<ImagePluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
