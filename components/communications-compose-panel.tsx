'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import {
  catalogErrorMessage,
  listCatalogDomain,
  shouldUseCatalogLiveData,
  CATALOG_GLOBAL_SCOPE,
} from '../lib/admin-catalog-api';
import { designFixturesEnabled } from '../lib/admin-platform-api.ts';
import { executeAdminAction } from '../lib/admin-mutation-dispatcher';
import { SearchSelect } from './search-select';

function channelForRoute(route: string): string {
  if (route.includes('/email/')) return 'email';
  if (route.includes('/sms/')) return 'sms';
  if (route.includes('/whatsapp/')) return 'whatsapp';
  if (route.includes('/push/')) return 'push';
  return 'in_app';
}

export function CommunicationsComposePanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = !designFixturesEnabled() && shouldUseCatalogLiveData();
  const channel = channelForRoute(screen.route);
  const [audienceId, setAudienceId] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [purpose, setPurpose] = useState(screen.title.replace(/\s+/g, '_').toLowerCase());
  const [subject, setSubject] = useState('');
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [templateCount, setTemplateCount] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshMeta = useCallback(async () => {
    if (!live) return;
    try {
      const [audiences, templates] = await Promise.all([
        listCatalogDomain('communications.audiences', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE }),
        listCatalogDomain('communications.templates', { perPage: 100, scope: CATALOG_GLOBAL_SCOPE }),
      ]);
      setAudienceCount(audiences.pagination.total);
      setTemplateCount(templates.pagination.total);
    } catch (err) {
      setError(catalogErrorMessage(err, 'Unable to load communication catalogs.'));
    }
  }, [live]);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const summaryItems = useMemo(() => {
    if (!live) return screen.items ?? [];
    return [
      `Audiences — ${audienceCount ?? '…'}`,
      `Templates — ${templateCount ?? '…'}`,
      `Channel — ${channel}`,
    ];
  }, [audienceCount, channel, live, screen.items, templateCount]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!live) {
      setMessage('Live communications API is disabled. Turn off design fixtures and configure NEXT_PUBLIC_FHC_API_URL.');
      return;
    }
    if (!audienceId || !templateId) {
      setError('Select a live audience and template.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label: screen.action ?? 'Publish Message',
        payload: {
          audience_id: audienceId,
          template_id: templateId,
          channel,
          kind: 'broadcast',
          purpose: purpose || 'admin_broadcast',
          title: subject || screen.title,
        },
        scope: CATALOG_GLOBAL_SCOPE,
      });
      setMessage('Broadcast prepared via the live communications API.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Broadcast preparation failed.');
    } finally {
      setBusy(false);
    }
  }

  if (!live) {
    return (
      <>
        <p className="maps-settings-lead" role="status">
          No live communications compose API for this screen while design fixtures are enabled.
        </p>
        <article className="platform-card platform-form">
          <p>Live data unavailable for this route.</p>
        </article>
      </>
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
            <span>{t('admin.audience', { defaultMessage: 'Audience' })}</span>
            <SearchSelect
              name="audience_id"
              catalog="communicationAudience"
              defaultValue={audienceId}
              onValueChange={setAudienceId}
              placeholder={t('admin.searchAudience', { defaultMessage: 'Search audience' })}
              required
            />
          </label>
          <label>
            <span>{t('admin.template', { defaultMessage: 'Template' })}</span>
            <SearchSelect
              name="template_id"
              catalog="communicationTemplate"
              defaultValue={templateId}
              onValueChange={setTemplateId}
              placeholder={t('admin.searchTemplate', { defaultMessage: 'Search template' })}
              required
            />
          </label>
          <label className="wide">
            <span>{t('admin.purpose', { defaultMessage: 'Purpose code' })}</span>
            <input name="purpose" value={purpose} onChange={(event) => setPurpose(event.target.value)} required />
          </label>
          <label className="wide">
            <span>{t('admin.subject', { defaultMessage: 'Subject / title' })}</span>
            <input name="title" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </label>
        </div>
        <aside className="platform-summary">
          <h3>{t('admin.summary', { defaultMessage: 'Summary' })}</h3>
          {summaryItems.map((item) => (
            <p key={item}>
              <span>{item.split(' — ')[0]}</span>
              <strong>{item.split(' — ')[1] ?? ''}</strong>
            </p>
          ))}
        </aside>
        <footer className="form-footer">
          <button className="platform-primary" type="submit" disabled={busy}>
            {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : (screen.action ?? t('common.submit', { defaultMessage: 'Submit' }))}
          </button>
        </footer>
      </article>
    </form>
  );
}
