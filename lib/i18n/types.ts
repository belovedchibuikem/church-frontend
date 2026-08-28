export const supportedLocales = ['en', 'yo', 'ig', 'ha', 'fr', 'ar', 'zh', 'sw'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export type MessageValue = string | MessageTree;
export type MessageTree = { readonly [key: string]: MessageValue };

export type TranslateVars = Record<string, string | number>;

export type TranslateOptions = {
  vars?: TranslateVars;
  count?: number;
  defaultMessage?: string;
};

export const LOCALE_COOKIE = 'fhc.locale';
export const LOCALE_STORAGE_KEY = 'fhc.locale';
export const DEFAULT_LOCALE: SupportedLocale = 'en';

export const localeMeta: Record<
  SupportedLocale,
  { endonym: string; englishName: string; flag: string; direction: 'ltr' | 'rtl' }
> = {
  en: { endonym: 'English', englishName: 'English', flag: '🇬🇧', direction: 'ltr' },
  yo: { endonym: 'Yorùbá', englishName: 'Yoruba', flag: '🇳🇬', direction: 'ltr' },
  ig: { endonym: 'Igbo', englishName: 'Igbo', flag: '🇳🇬', direction: 'ltr' },
  ha: { endonym: 'Hausa', englishName: 'Hausa', flag: '🇳🇬', direction: 'ltr' },
  fr: { endonym: 'Français', englishName: 'French', flag: '🇫🇷', direction: 'ltr' },
  ar: { endonym: 'العربية', englishName: 'Arabic', flag: '🇸🇦', direction: 'rtl' },
  zh: { endonym: '中文', englishName: 'Chinese', flag: '🇨🇳', direction: 'ltr' },
  sw: { endonym: 'Kiswahili', englishName: 'Swahili', flag: '🇰🇪', direction: 'ltr' },
};
