import { messageCatalogs } from './i18n/catalogs.ts';
import { localeDirection, lookupMessage, normalizeLocale, isSupportedLocale } from './i18n/lookup.ts';
import {
  DEFAULT_LOCALE,
  localeMeta,
  supportedLocales,
  type SupportedLocale,
  type TranslateOptions,
} from './i18n/types.ts';

export { localeDirection, isSupportedLocale, normalizeLocale, lookupMessage };
export { supportedLocales, localeMeta, DEFAULT_LOCALE };
export type { SupportedLocale, TranslateOptions };

export function t(
  locale: string,
  key: string,
  options: TranslateOptions = {},
): string {
  return lookupMessage(messageCatalogs, locale, key, options);
}

/** Resolve display copy for a route without mutating English catalog metadata. */
export function translateRouteCopy(
  t: (key: string, options?: { defaultMessage?: string }) => string,
  route: { path: string; title: string; section: string; subtitle: string },
) {
  return {
    title: t(`routes.${route.path}`, { defaultMessage: route.title }),
    subtitle: t(`sections.${route.section}`, { defaultMessage: route.subtitle }),
  };
}

/** English screenshot copy remains the approved source catalogue. */
export const commonMessages = {
  en: {
    search: 'Search',
    filters: 'Filters',
    cancel: 'Cancel',
    save: 'Save',
    retry: 'Try Again',
  },
  yo: {
    search: 'Wá',
    filters: 'Àlẹ̀mọ́',
    cancel: 'Fagilé',
    save: 'Fi pamọ́',
    retry: 'Gbìyànjú lẹ́ẹ̀kan sí i',
  },
  ig: {
    search: 'Chọọ',
    filters: 'Nzacha',
    cancel: 'Kagbuo',
    save: 'Chekwaa',
    retry: 'Nwaa ọzọ',
  },
  ha: {
    search: 'Nema',
    filters: 'Tacewa',
    cancel: 'Soke',
    save: 'Ajiye',
    retry: 'Sake gwadawa',
  },
  fr: {
    search: 'Rechercher',
    filters: 'Filtres',
    cancel: 'Annuler',
    save: 'Enregistrer',
    retry: 'Réessayer',
  },
  ar: {
    search: 'بحث',
    filters: 'عوامل التصفية',
    cancel: 'إلغاء',
    save: 'حفظ',
    retry: 'حاول مرة أخرى',
  },
  zh: {
    search: '搜索',
    filters: '筛选',
    cancel: '取消',
    save: '保存',
    retry: '重试',
  },
  sw: {
    search: 'Tafuta',
    filters: 'Vichujio',
    cancel: 'Ghairi',
    save: 'Hifadhi',
    retry: 'Jaribu tena',
  },
} as const;
