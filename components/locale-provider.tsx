'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { messageCatalogs } from '@/lib/i18n/catalogs.ts';
import { localeDirection, lookupMessage, normalizeLocale } from '@/lib/i18n/lookup.ts';
import { applyDocumentLocale, persistLocale, readStoredLocale } from '@/lib/i18n/persist.ts';
import {
  DEFAULT_LOCALE,
  localeMeta,
  supportedLocales,
  type SupportedLocale,
  type TranslateOptions,
} from '@/lib/i18n/types.ts';

type LocaleContextValue = {
  locale: SupportedLocale;
  direction: 'ltr' | 'rtl';
  setLocale: (next: string) => void;
  t: (key: string, options?: TranslateOptions) => string;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  direction: 'ltr',
  setLocale: () => undefined,
  t: (key, options) => lookupMessage(messageCatalogs, DEFAULT_LOCALE, key, options),
});

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale?: string;
  children: ReactNode;
}) {
  const [locale, setLocaleState] = useState<SupportedLocale>(() =>
    normalizeLocale(initialLocale ?? DEFAULT_LOCALE),
  );

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored && stored !== locale) {
      setLocaleState(stored);
    }
    // Hydrate from storage once after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyDocumentLocale(locale, localeDirection(locale));
    persistLocale(locale);
  }, [locale]);

  const setLocale = useCallback((next: string) => {
    setLocaleState(normalizeLocale(next));
  }, []);

  const t = useCallback(
    (key: string, options?: TranslateOptions) => lookupMessage(messageCatalogs, locale, key, options),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction: localeMeta[locale].direction,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export function useT(): LocaleContextValue['t'] {
  return useLocale().t;
}

export { supportedLocales };
