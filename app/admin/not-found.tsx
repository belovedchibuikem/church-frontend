import Link from 'next/link';
import { t } from '@/lib/i18n';
import { readRequestLocale } from '@/lib/i18n/server';

export default async function AdminNotFound() {
  const locale = await readRequestLocale();
  return (
    <main className="state-page">
      <div className="shield-lock">?</div>
      <h1>{t(locale, 'errors.pageNotFound', { defaultMessage: 'Page not found' })}</h1>
      <p>
        {t(locale, 'errors.adminRouteNotFound', {
          defaultMessage:
            'The requested administrative route does not exist or is not discoverable in this scope.',
        })}
      </p>
      <Link className="primary-button link-button" href="/admin">
        {t(locale, 'common.backToDashboard', { defaultMessage: 'Back to Dashboard' })}
      </Link>
    </main>
  );
}
