export const supportedLocales = ['en', 'yo', 'ig', 'ha', 'fr', 'ar', 'zh', 'sw'] as const;
export type SupportedLocale = (typeof supportedLocales)[number];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return supportedLocales.includes(value as SupportedLocale);
}

export function localeDirection(locale: SupportedLocale): 'ltr' | 'rtl' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}

// English screenshot copy is the approved source message catalogue for this design-closure slice.
// Locale bundles can replace these values without changing route, permission, or layout metadata.
export const commonMessages = {
  en: { search: 'Search', filters: 'Filters', cancel: 'Cancel', save: 'Save', retry: 'Try Again' },
} as const;
