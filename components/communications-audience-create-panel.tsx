'use client';

import { FormEvent, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import { CATALOG_GLOBAL_SCOPE, shouldUseCatalogLiveData } from '../lib/admin-catalog-api';
import { designFixturesEnabled } from '../lib/admin-platform-api.ts';
import { executeAdminAction, formatAdminMutationError } from '../lib/admin-mutation-dispatcher';

export function CommunicationsAudienceCreatePanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = !designFixturesEnabled() && shouldUseCatalogLiveData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!live) {
      setMessage('Live communications API is disabled while design fixtures are enabled.');
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: screen.action ?? 'Save Audience',
        payload: {
          code: String(form.get('code') || ''),
          name: String(form.get('name') || ''),
        },
        scope: CATALOG_GLOBAL_SCOPE,
      });
      setMessage(t('admin.audienceCreated', { defaultMessage: 'Audience created via the live communications API.' }));
      event.currentTarget.reset();
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  if (!live) {
    return (
      <article className="platform-card platform-form">
        <p className="maps-settings-lead" role="status">
          No live audience create API while design fixtures are enabled.
        </p>
      </article>
    );
  }

  return (
    <form className="platform-form-view" onSubmit={(event) => void onSubmit(event)}>
      <article className="platform-card platform-form">
        <header>
          <h2>{screen.title}</h2>
          <p>{screen.subtitle}</p>
        </header>
        {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
        <div className="platform-form-grid">
          <label>
            <span>{t('admin.code', { defaultMessage: 'Code' })}</span>
            <input name="code" required placeholder="audience.all_members" defaultValue={screen.details?.Code ?? 'audience.all_members'} />
          </label>
          <label>
            <span>{t('admin.name', { defaultMessage: 'Name' })}</span>
            <input name="name" required placeholder="All Members" defaultValue={screen.details?.Name ?? ''} />
          </label>
        </div>
        <p className="maps-settings-lead">
          {t('admin.audienceRuleDefault', { defaultMessage: 'Creates an all-users audience rule. Advanced selectors can be added later.' })}
        </p>
        <footer>
          <button className="platform-primary" type="submit" disabled={busy}>
            {busy ? t('admin.submitting', { defaultMessage: 'Submitting…' }) : (screen.action ?? t('admin.saveAudience', { defaultMessage: 'Save Audience' }))}
          </button>
        </footer>
      </article>
    </form>
  );
}
