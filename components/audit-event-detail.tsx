'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import {
  defaultAdminScope,
  exportAdminAuditCsv,
  exportAdminAuditEventCsv,
  getAdminAuditEvent,
  listAdminAuditEvents,
  type AdminAuditEvent,
} from '../lib/admin-identity-api';
import { designFixturesEnabled } from '../lib/admin-platform-api';

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

function eventIdFromRoute(route: string): string | undefined {
  const match = route.match(/\/admin\/security\/audit-logs\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  return match?.[1];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AuditEventDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const routeId = eventIdFromRoute(screen.route);
  const [event, setEvent] = useState<AdminAuditEvent | null>(null);
  const [sampleNotice, setSampleNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (designFixturesEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        if (routeId && ULID.test(routeId)) {
          const record = await getAdminAuditEvent(routeId, defaultAdminScope());
          if (cancelled) return;
          setEvent(record);
          setSampleNotice(null);
          setError(null);
          return;
        }
        const page = await listAdminAuditEvents({ scope: defaultAdminScope(), perPage: 1 });
        if (cancelled) return;
        setEvent(page.data[0] ?? null);
        setSampleNotice(
          page.data[0]
            ? t('admin.auditSamplePath', {
                defaultMessage: 'This URL is a sample path. Showing the latest live audit event.',
              })
            : t('admin.auditNoEvents', { defaultMessage: 'No audit events are recorded yet.' }),
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : t('errors.loadAuditEvent', { defaultMessage: 'Unable to load this audit event.' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [routeId, t]);

  function download(): void {
    setBusy(true);
    const request = event?.id
      ? exportAdminAuditEventCsv(event.id, defaultAdminScope())
      : exportAdminAuditCsv(defaultAdminScope());
    void request
      .then((blob) => downloadBlob(blob, event?.id ? `audit-event-${event.id}.csv` : 'audit-events.csv'))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : t('errors.downloadAuditEvent', { defaultMessage: 'Unable to download this audit event.' }));
      })
      .finally(() => setBusy(false));
  }

  const details = {
    User: event?.actor_user_id ?? '—',
    Action: event?.action ?? '—',
    Module: event?.target_type ?? '—',
    Resource: event?.target_id ?? '—',
    Scope: event ? `${event.scope_type ?? '—'} ${event.scope_id ?? ''}`.trim() : '—',
    'Correlation ID': event?.correlation_id ?? '—',
    'Occurred At': event?.occurred_at ?? '—',
    Status: event ? t('admin.statusRecorded', { defaultMessage: 'Recorded' }) : '—',
  };

  return (
    <div className="platform-detail">
      <article className="platform-card platform-detail-hero">
        <div>
          <span className="platform-overline">{t('admin.auditDetail', { defaultMessage: 'Audit detail' })}</span>
          <h2>{event?.action ?? screen.title}</h2>
          <p>{event?.id ?? screen.subtitle}</p>
        </div>
      </article>
      {sampleNotice ? <p className="maps-settings-lead" role="status">{sampleNotice}</p> : null}
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="platform-detail-grid">
        <article className="platform-card platform-definition">
          <h3>{t('admin.information', { defaultMessage: 'Information' })}</h3>
          <dl>
            {Object.entries(details).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <footer style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
            <button className="platform-primary" data-interaction-native="true" disabled={busy} type="button" onClick={download}>
              {t('admin.download', { defaultMessage: 'Download' })}
            </button>
            <Link href="/admin/security/audit-logs">{t('admin.backToAuditLogs', { defaultMessage: 'Back to audit logs' })}</Link>
          </footer>
        </article>
      </div>
    </div>
  );
}
