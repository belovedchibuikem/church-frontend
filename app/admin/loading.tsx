import { t } from '@/lib/i18n';
import { readRequestLocale } from '@/lib/i18n/server';

export default async function AdminLoading() {
  const locale = await readRequestLocale();
  return (
    <main className="state-page" aria-busy="true" aria-live="polite">
      <div className="state-skeleton" />
      <div className="state-skeleton wide" />
      <div className="state-card-grid">
        {[1, 2, 3, 4].map((item) => (
          <div className="card state-card" key={item} />
        ))}
      </div>
      <span>
        {t(locale, 'common.loadingAuthorizedAdmin', {
          defaultMessage: 'Loading authorized administration data…',
        })}
      </span>
    </main>
  );
}
