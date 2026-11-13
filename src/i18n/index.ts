import { getLanguage } from 'obsidian';
import type { LanguageSetting, SupportedLocale } from '../types';
import en from './locales/en';
import zh from './locales/zh';
import type { TranslationSchema } from './types';

const LOCALES: Record<SupportedLocale, TranslationSchema> = {
  en,
  zh,
};

let currentLanguageSetting: LanguageSetting = 'auto';

export function resolveLocale(setting: LanguageSetting = currentLanguageSetting): SupportedLocale {
  if (setting === 'en' || setting === 'zh') {
    return setting;
  }
  const obsidianLang = getLanguage().toLowerCase();
  if (obsidianLang.startsWith('zh')) {
    return 'zh';
  }
  return 'en';
}

export function setLanguageSetting(setting: LanguageSetting): void {
  currentLanguageSetting = setting;
}

export function t(setting?: LanguageSetting): TranslationSchema {
  return LOCALES[resolveLocale(setting)];
}

export type { TranslationSchema } from './types';
