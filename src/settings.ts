import { App, PluginSettingTab, Setting } from 'obsidian';
import ImagePlugin from './main';

export interface ImagePluginSettings {
	mySetting: string;
}

export const DEFAULT_SETTINGS: ImagePluginSettings = {
	mySetting: 'default',
};

export class ImageSettingTab extends PluginSettingTab {
	plugin: ImagePlugin;

	constructor(app: App, plugin: ImagePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Settings #1')
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder('Enter your secret')
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
