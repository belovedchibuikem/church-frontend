'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import type { AdminScreen } from '../lib/admin-routes';
import { apiRequest } from '../lib/api-client';
import { CATALOG_GLOBAL_SCOPE, catalogErrorMessage } from '../lib/admin-catalog-api';
import { fieldsForEntity } from '../lib/admin-form-schemas';
import { AdminFormFields } from './admin-form-fields';
import { executeAdminAction, formatAdminMutationError } from '../lib/admin-mutation-dispatcher';
import { formatTimestamp } from '../lib/admin-identity-api';
import { useLocale } from '@/components/locale-provider';

type OrientationSessionDetail = {
  id: string;
  name: string;
  cohort_id?: string | null;
  cohort_name?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  venue?: string | null;
  venue_label?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  capacity?: number | null;
  notes?: string | null;
  published_at?: string | null;
  students_count?: number | null;
  status?: string | null;
  can_delete?: boolean;
};

function missing(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}

export function KcaOrientationDetailPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const id = screen.route.split('/').pop() ?? '';
  const [data, setData] = useState<OrientationSessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);

  const refresh = async () => {
    const envelope = await apiRequest<{ data: OrientationSessionDetail }>(
      `admin/kca/orientation-sessions/${encodeURIComponent(id)}`,
      { scope: CATALOG_GLOBAL_SCOPE },
    );
    setData(envelope.data);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(catalogErrorMessage(err, t('errors.loadOrientationSession', { defaultMessage: 'Unable to load orientation session.' })));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const mutate = async (label: string, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label,
        payload,
        recordId: id,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      await refresh();
      setEditing(false);
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) {
    return <p className="maps-settings-lead" role="alert">{error}</p>;
  }
  if (!data) {
    return <p className="maps-settings-lead">{t('admin.loadingOrientationSession', { defaultMessage: 'Loading orientation session…' })}</p>;
  }

  const details: Array<[string, string]> = [
    ['Cohort', missing(data.cohort_name ?? data.cohort_id)],
    ['Status', missing(data.status)],
    ['Venue', missing(data.venue ?? data.location_name ?? data.venue_label)],
    ['Starts', data.starts_at ? formatTimestamp(data.starts_at) : 'Not provided'],
    ['Ends', data.ends_at ? formatTimestamp(data.ends_at) : 'Not provided'],
    ['Published', data.published_at ? formatTimestamp(data.published_at) : 'Draft'],
    ['Capacity', missing(data.capacity)],
    ['Students', String(data.students_count ?? 0)],
    ['Notes', missing(data.notes)],
  ];

  if (editing) {
    const fields = fieldsForEntity('kca_orientation_session');
    return (
      <form
        className="platform-form-view"
        onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const payload: Record<string, string> = {};
          for (const [key, value] of form.entries()) {
            payload[key] = String(value);
          }
          void mutate('Update Orientation Session', payload);
        }}
      >
        <article className="platform-card platform-form">
          <header>
            <h2>{data.name}</h2>
            <p>{t('admin.editOrientationSessionCopy', { defaultMessage: 'Update orientation session details and publishing.' })}</p>
          </header>
          {error ? <p className="maps-settings-lead" role="alert">{error}</p> : null}
          <AdminFormFields fields={fields} values={{
            name: data.name,
            cohort_id: data.cohort_id ?? '',
            location_id: data.location_id ?? '',
            venue_label: data.venue_label ?? '',
            starts_at: data.starts_at?.slice(0, 16) ?? '',
            ends_at: data.ends_at?.slice(0, 16) ?? '',
            published_at: data.published_at?.slice(0, 16) ?? '',
            capacity: data.capacity != null ? String(data.capacity) : '',
            notes: data.notes ?? '',
          }} />
          <footer className="form-footer">
            <button className="platform-secondary" disabled={busy} type="button" onClick={() => setEditing(false)}>
              {t('common.cancel', { defaultMessage: 'Cancel' })}
            </button>
            <button className="platform-primary" disabled={busy} type="submit">
              {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : t('admin.saveOrientationSession', { defaultMessage: 'Save session' })}
            </button>
          </footer>
        </article>
      </form>
    );
  }

  return (
    <div className="platform-detail">
      <article className="platform-card platform-detail-hero">
        <div>
          <span className="platform-overline">{t('admin.orientationSessionDetail', { defaultMessage: 'Orientation session' })}</span>
          <h2>{data.name}</h2>
          <p>{data.cohort_name ?? t('admin.noCohortAssigned', { defaultMessage: 'No cohort assigned' })}</p>
          <span className="platform-badge">{data.status}</span>
        </div>
      </article>
      {error ? <p className="maps-settings-lead" role="alert">{error}</p> : null}
      <div className="platform-detail-grid">
        <article className="platform-card platform-definition">
          <h3>{t('admin.information', { defaultMessage: 'Information' })}</h3>
          <dl>
            {details.map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article className="platform-card">
          <h3>{t('admin.allowedActions', { defaultMessage: 'Allowed actions' })}</h3>
          <div className="row-actions platform-row-actions">
            <button className="platform-primary" disabled={busy} type="button" onClick={() => setEditing(true)}>
              {t('common.edit', { defaultMessage: 'Edit' })}
            </button>
            {data.published_at ? (
              <button className="platform-secondary" disabled={busy} type="button" onClick={() => void mutate('Unpublish Orientation Session', { published_at: '' })}>
                {t('admin.unpublishSession', { defaultMessage: 'Unpublish' })}
              </button>
            ) : (
              <button className="platform-secondary" disabled={busy} type="button" onClick={() => void mutate('Publish Orientation Session', { published_at: new Date().toISOString() })}>
                {t('admin.publishSession', { defaultMessage: 'Publish now' })}
              </button>
            )}
            {data.can_delete ? (
              <button className="platform-secondary" disabled={busy} type="button" onClick={() => void mutate('Delete Orientation Session')}>
                {t('common.delete', { defaultMessage: 'Delete' })}
              </button>
            ) : null}
          </div>
        </article>
      </div>
      <p>
        <Link href="/admin/kca/orientation">{t('admin.backToOrientationSessions', { defaultMessage: 'Back to orientation sessions' })}</Link>
      </p>
    </div>
  );
}

export function KcaOrientationCreateForm({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const fields = fieldsForEntity('kca_orientation_session');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      payload[key] = String(value);
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await executeAdminAction({
        route: screen.route,
        label: 'Create Orientation Session',
        payload,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      const name = typeof result.data === 'object' && result.data && 'name' in result.data
        ? String((result.data as { name?: string }).name ?? result.id ?? 'session')
        : (result.id ?? 'session');
      setMessage(t('admin.orientationSessionCreated', { defaultMessage: 'Created {name}', vars: { name } }));
    } catch (err) {
      setMessage(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="platform-form-view" onSubmit={(event) => void onSubmit(event)}>
      <article className="platform-card platform-form">
        <header>
          <h2>{screen.title}</h2>
          <p>{screen.subtitle}</p>
        </header>
        {message ? <p className="maps-settings-lead" role="status">{message}</p> : null}
        <AdminFormFields fields={fields} />
        <footer className="form-footer">
          <Link className="platform-secondary" href="/admin/kca/orientation">{t('common.cancel', { defaultMessage: 'Cancel' })}</Link>
          <button className="platform-primary" disabled={busy} type="submit">
            {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : t('admin.createOrientationSession', { defaultMessage: 'Create session' })}
          </button>
        </footer>
      </article>
    </form>
  );
}
