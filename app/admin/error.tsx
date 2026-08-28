'use client';

import { useLocale } from '@/components/locale-provider';

export default function AdminError({ reset }: { reset: () => void }) {
  const { t } = useLocale();
  return (
    <main className="state-page">
      <div className="shield-lock error-mark">!</div>
      <h1>{t('errors.unableToLoadPage', { defaultMessage: 'Unable to load this page' })}</h1>
      <p>
        {t('errors.adminRequestFailed', {
          defaultMessage:
            'The request could not be completed safely. Try again or contact support with the correlation reference.',
        })}
      </p>
      <button className="primary-button" onClick={reset}>
        {t('errors.tryAgain', { defaultMessage: 'Try Again' })}
      </button>
    </main>
  );
}
