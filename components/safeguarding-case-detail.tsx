'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import { apiRequest, ApiError } from '../lib/api-client';
import type { ApiSuccessEnvelope, JsonObject } from '../lib/api-types';
import { CATALOG_GLOBAL_SCOPE } from '../lib/admin-catalog-api';
import { designFixturesEnabled, uploadMediaAttachment } from '../lib/admin-platform-api';
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
  const [notes, setNotes] = useState<Array<Record<string, string>>>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function refresh(): Promise<void> {
    if (!incidentId || !ULID.test(incidentId) || designFixturesEnabled()) return;
    const envelope = await apiRequest<ApiSuccessEnvelope<JsonObject>>(
      `admin/safeguarding/incidents/${encodeURIComponent(incidentId)}`,
      { method: 'GET', scope: CATALOG_GLOBAL_SCOPE },
    );
    const record = asRecord(envelope.data);
    stashAdminRecords([envelope.data as Record<string, unknown>]);
    setDetails(record);
    const rawNotes = (envelope.data as { case_notes?: unknown }).case_notes;
    setNotes(Array.isArray(rawNotes) ? rawNotes.map((note) => asRecord(note)) : []);
  }

  useEffect(() => {
    if (!incidentId || !ULID.test(incidentId) || designFixturesEnabled()) return;
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
        if (!cancelled) setError(null);
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

  async function patch(body: Record<string, unknown>, success: string): Promise<void> {
    if (!incidentId) return;
    setBusy(true);
    setMessage(null);
    try {
      await apiRequest(`admin/safeguarding/incidents/${encodeURIComponent(incidentId)}`, {
        method: 'PATCH',
        scope: CATALOG_GLOBAL_SCOPE,
        body: JSON.stringify(body),
      });
      await refresh();
      setMessage(success);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errors.updateCase', { defaultMessage: 'Unable to update this case.' }));
    } finally {
      setBusy(false);
    }
  }

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
        {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
        <article className="platform-card">
          <dl className="platform-detail-grid">
            {Object.entries(display).map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article className="platform-card">
          <h3>{t('admin.caseNotes', { defaultMessage: 'Notes' })}</h3>
          {notes.length === 0 ? <p className="maps-settings-lead">{t('admin.noCaseNotes', { defaultMessage: 'No case notes yet.' })}</p> : (
            <ul>
              {notes.map((note) => (
                <li key={note.id ?? note.at}>{note.at}: {note.body}</li>
              ))}
            </ul>
          )}
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void patch({ note: String(form.get('note') ?? '') }, t('admin.noteAdded', { defaultMessage: 'Note added.' }));
              event.currentTarget.reset();
            }}
          >
            <label>
              <span>{t('admin.addNote', { defaultMessage: 'Add Note' })}</span>
              <textarea name="note" required />
            </label>
            <button className="platform-primary" data-interaction-native="true" disabled={busy} type="submit">
              {t('admin.addNote', { defaultMessage: 'Add Note' })}
            </button>
          </form>
        </article>
        <article className="platform-card">
          <h3>{t('admin.caseActions', { defaultMessage: 'Actions' })}</h3>
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void patch(
                { assigned_to_user_id: String(form.get('assigned_to_user_id') ?? '') },
                t('admin.caseAssigned', { defaultMessage: 'Case assigned.' }),
              );
            }}
          >
            <label>
              <span>{t('admin.assignUserUlid', { defaultMessage: 'Assign (user ULID)' })}</span>
              <input name="assigned_to_user_id" required />
            </label>
            <button className="ghost-button" data-interaction-native="true" disabled={busy} type="submit">
              {t('admin.assignCase', { defaultMessage: 'Assign Case' })}
            </button>
          </form>
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void patch(
                { severity: String(form.get('severity') ?? 'medium') },
                t('admin.priorityChanged', { defaultMessage: 'Priority updated.' }),
              );
            }}
          >
            <label>
              <span>{t('admin.changePriority', { defaultMessage: 'Change Priority' })}</span>
              <select defaultValue={details.severity ?? 'medium'} name="severity">
                <option value="low">low</option>
                <option value="medium">medium</option>
                <option value="high">high</option>
                <option value="critical">critical</option>
              </select>
            </label>
            <button className="ghost-button" data-interaction-native="true" disabled={busy} type="submit">
              {t('admin.changePriority', { defaultMessage: 'Change Priority' })}
            </button>
          </form>
          <form
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              if (!incidentId) return;
              const form = new FormData(event.currentTarget);
              const file = form.get('file');
              if (!(file instanceof File) || file.size === 0) return;
              const upload = new FormData();
              upload.set('file', file);
              upload.set('attachable_type', 'safeguarding_incident');
              upload.set('attachable_id', incidentId);
              upload.set('role', 'document');
              upload.set('purpose', 'safeguarding_evidence');
              upload.set('classification', 'restricted');
              setBusy(true);
              void uploadMediaAttachment(upload, CATALOG_GLOBAL_SCOPE)
                .then(async () => {
                  await refresh();
                  setMessage(t('admin.documentUploaded', { defaultMessage: 'Document attached.' }));
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : t('errors.uploadDocument', { defaultMessage: 'Unable to attach this document.' }));
                })
                .finally(() => setBusy(false));
            }}
          >
            <label>
              <span>{t('admin.uploadDocument', { defaultMessage: 'Upload Document' })}</span>
              <input name="file" type="file" />
            </label>
            <button className="ghost-button" data-interaction-native="true" disabled={busy} type="submit">
              {t('admin.uploadDocument', { defaultMessage: 'Upload Document' })}
            </button>
          </form>
          <button
            className="platform-primary"
            data-interaction-native="true"
            disabled={busy || details.status === 'closed'}
            type="button"
            onClick={() => void patch({ status: 'closed' }, t('admin.caseClosed', { defaultMessage: 'Case closed.' }))}
          >
            {t('admin.closeCase', { defaultMessage: 'Close Case' })}
          </button>
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
