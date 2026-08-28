'use client';

import { localeMeta, supportedLocales, type SupportedLocale } from '@/lib/i18n/types.ts';
import { useLocale } from '@/components/locale-provider';

export function LocaleSwitcher({ className = 'locale-switcher' }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <label className={className}>
      <span className="sr-only">{t('common.language', { defaultMessage: 'Language' })}</span>
      <select
        aria-label={t('common.language', { defaultMessage: 'Language' })}
        value={locale}
        onChange={(event) => setLocale(event.target.value)}
      >
        {supportedLocales.map((code: SupportedLocale) => (
          <option key={code} value={code}>
            {localeMeta[code].flag} {localeMeta[code].endonym}
          </option>
        ))}
      </select>
    </label>
  );
}
