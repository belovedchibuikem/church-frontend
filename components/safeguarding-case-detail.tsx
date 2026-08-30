'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import { apiRequest, ApiError } from '../lib/api-client';
import type { ApiSuccessEnvelope, JsonObject } from '../lib/api-types';
import { CATALOG_GLOBAL_SCOPE } from '../lib/admin-catalog-api';
import { designFixturesEnabled } from '../lib/admin-platform-api';
import { getAdminRecordDetails, stashAdminRecords } from '../lib/admin-record-cache';

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

function incidentIdFromRoute(route: string): string | undefined {
  const match = route.match(/\/admin\/security\/safeguarding\/cases\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  return match?.[1];
}

function asRecord(data: unknown): Record<string, string> {
  if (!data || typeof data !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      out[key] = String(value);
    }
  }
  return out;
}

export function SafeguardingCaseDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const incidentId = incidentIdFromRoute(screen.route);
  const cached = getAdminRecordDetails(incidentId);
  const [details, setDetails] = useState<Record<string, string>>(() => cached ?? screen.details ?? {});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!incidentId || !ULID.test(incidentId) || designFixturesEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        const envelope = await apiRequest<ApiSuccessEnvelope<JsonObject>>(
          `admin/safeguarding/incidents/${encodeURIComponent(incidentId)}`,
          { method: 'GET', scope: CATALOG_GLOBAL_SCOPE },
        );
        if (cancelled) return;
        const record = asRecord(envelope.data);
        stashAdminRecords([envelope.data as Record<string, unknown>]);
        setDetails(record);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        if (cached) {
          setDetails(cached);
          setError(null);
          return;
        }
        setError(err instanceof ApiError ? err.message : t('errors.loadCase', { defaultMessage: 'Unable to load safeguarding case.' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cached, incidentId, t]);

  const display = {
    Type: details.concern_type ?? details.type ?? details.Type ?? '—',
    Severity: details.severity ?? details.Severity ?? '—',
    Status: details.status ?? details.Status ?? '—',
    'Reference Code': details.reference_code ?? details['Reference Code'] ?? '—',
    Subject: details.subject_name ?? details.person_name ?? details.Subject ?? '—',
    'Date Reported': details.reported_at ?? details['Date Reported'] ?? '—',
    'Occurred At': details.occurred_at ?? details['Occurred At'] ?? '—',
    ReportedBy: details.reported_by_name ?? details.ReportedBy ?? '—',
    AssignedTo: details.assigned_to_name ?? details.AssignedTo ?? '—',
    Description: details.restricted_summary ?? details.Description ?? details.description ?? '—',
  };

  return (
    <div className="platform-restricted">
      <div className="platform-restricted-banner">
        <span>🔒</span>
        <div>
          <strong>{t('admin.restrictedInformation', { defaultMessage: 'Restricted information' })}</strong>
          <p>{t('admin.restrictedAccessCopy', { defaultMessage: 'Access is audited and limited to explicitly authorized personnel.' })}</p>
        </div>
      </div>
      <div className="platform-detail">
        <article className="platform-card platform-detail-hero">
          <div>
            <span className="platform-overline">{t('admin.safeguardingCase', { defaultMessage: 'Safeguarding case' })}</span>
            <h2>{display['Reference Code'] !== '—' ? display['Reference Code'] : (incidentId ?? screen.title)}</h2>
            <p>{display.Status} · {display.Severity}</p>
          </div>
        </article>
        {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        <article className="platform-card">
          <dl className="platform-detail-grid">
            {Object.entries(display).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <footer style={{ marginTop: '1rem' }}>
            <Link href="/admin/security/safeguarding/cases">
              {t('admin.backToCases', { defaultMessage: 'Back to cases' })}
            </Link>
          </footer>
        </article>
      </div>
    </div>
  );
}
