'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import { designFixturesEnabled } from '../lib/admin-platform-api';
import { CATALOG_GLOBAL_SCOPE, shouldUseCatalogLiveData } from '../lib/admin-catalog-api';
import {
  breakdownToItems,
  dashboardModuleForScreen,
  type AdminDashboardModule,
} from '../lib/admin-dashboard-api';
import { executeAdminAction, formatAdminMutationError } from '../lib/admin-mutation-dispatcher';
import { useAdminDashboard } from '../lib/use-admin-dashboard';

function assistantForRoute(route: string): 'pastoral' | 'press' {
  return route.includes('press') ? 'press' : 'pastoral';
}

function fallbackModule(assistant: 'pastoral' | 'press'): AdminDashboardModule {
  return assistant === 'press' ? 'press' : 'reports';
}

export function ReportsAiPanel({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const live = !designFixturesEnabled() && shouldUseCatalogLiveData();
  const assistant = assistantForRoute(screen.route);
  const module = dashboardModuleForScreen(screen.id) ?? fallbackModule(assistant);
  const dashboard = useAdminDashboard(module, requestedScope);
  const insightItems = useMemo(() => {
    if (dashboard.live && dashboard.data?.breakdown?.length) {
      return breakdownToItems(dashboard.data.breakdown);
    }
    return screen.items ?? [];
  }, [dashboard.data?.breakdown, dashboard.live, screen.items]);

  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<string | null>(null);

  async function onAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!live) {
      setError(t('admin.aiFixturesDisabled', {
        defaultMessage: 'Live advisory AI requires design fixtures off and NEXT_PUBLIC_FHC_API_URL configured.',
      }));
      return;
    }
    if (!prompt.trim()) {
      setError(t('admin.aiPromptRequired', { defaultMessage: 'Enter a question before submitting.' }));
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    setResponseText(null);
    try {
      const result = await executeAdminAction({
        route: screen.route,
        label: 'Ask AI',
        payload: {
          assistant,
          prompt: prompt.trim(),
          instruction: prompt.trim(),
        },
        scope: CATALOG_GLOBAL_SCOPE,
      });
      const data = (result.data ?? {}) as Record<string, unknown>;
      const recommendation = typeof data.recommendation === 'string' ? data.recommendation : null;
      const reason = typeof data.reason_code === 'string' ? data.reason_code : null;
      const available = data.available === true;
      setResponseText(
        recommendation
          ?? (available
            ? t('admin.aiNoRecommendation', { defaultMessage: 'Advisory completed without a text recommendation.' })
            : t('admin.aiUnavailable', {
              defaultMessage: 'Advisory unavailable{reason}.',
              vars: { reason: reason ? ` (${reason})` : '' },
            })),
      );
      setMessage(t('admin.aiRequestCompleted', { defaultMessage: 'Advisory response received.' }));
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="platform-ai">
      <article className="platform-card platform-ai-sidebar">
        <span className="platform-ai-orb">✦</span>
        <h2>{screen.title}</h2>
        <p>
          {t('admin.aiSidebarCopy', {
            defaultMessage: 'AI-assisted insights grounded in ministry reporting data ({assistant}).',
            vars: { assistant },
          })}
        </p>
        {['Overview', 'Content AI', 'Performance AI', 'Ask AI'].map((item, index) => (
          <button className={index === 3 ? 'active' : ''} type="button" key={item}>{item}</button>
        ))}
      </article>
      <article className="platform-card platform-ai-body">
        <h2>{t('admin.insights', { defaultMessage: 'Insights' })}</h2>
        {dashboard.loading ? <p className="maps-settings-lead" role="status">{t('admin.loadingDashboard', { defaultMessage: 'Loading dashboard…' })}</p> : null}
        {dashboard.error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{dashboard.error}</p> : null}
        {!dashboard.loading && insightItems.length === 0 ? (
          <p className="maps-settings-lead">{t('admin.noAiInsights', { defaultMessage: 'No dashboard categories yet to ground an advisory prompt.' })}</p>
        ) : null}
        <div className="platform-ai-grid">
          {insightItems.slice(0, 4).map((item, index) => (
            <article key={item}>
              <span>{['◎', '◇', '▤', '✦'][index]}</span>
              <h3>{item.split(' — ')[0]}</h3>
              <strong>{item.split(' — ')[1] ?? '—'}</strong>
              <p>{t('admin.insightFromDashboard', { defaultMessage: 'Updated from the latest approved analytics data.' })}</p>
            </article>
          ))}
        </div>
        {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
        {responseText ? (
          <article className="platform-card" style={{ marginBottom: '1rem' }}>
            <h3>{t('admin.advisoryResponse', { defaultMessage: 'Advisory response' })}</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{responseText}</p>
          </article>
        ) : null}
        <form onSubmit={(event) => void onAsk(event)}>
          <label>
            <span className="sr-only">{t('admin.askAi', { defaultMessage: 'Ask {title}', vars: { title: screen.title } })}</span>
            <input
              aria-label={t('admin.askAi', { defaultMessage: 'Ask {title}', vars: { title: screen.title } })}
              placeholder={t('admin.askAiPlaceholder', { defaultMessage: 'Ask {title}…', vars: { title: screen.title } })}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              disabled={busy}
            />
            <button type="submit" disabled={busy}>{busy ? '…' : '↑'}</button>
          </label>
        </form>
      </article>
    </div>
  );
}
