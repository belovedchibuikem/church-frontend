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

type EventDetail = {
  id: string;
  name: string;
  category_code?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
  published_at?: string | null;
  fee_amount_minor?: number | null;
  fee_currency?: string | null;
  capacity?: number | null;
  status?: string | null;
  registrations_count?: number;
  can_delete?: boolean;
};

function missing(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return 'Not provided';
  return String(value);
}

function formatFee(amountMinor?: number | null, currency?: string | null): string {
  if (amountMinor === null || amountMinor === undefined) return 'Free';
  return `${currency ?? 'NGN'} ${amountMinor}`;
}

export function EventDetailPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const id = screen.route.split('/').pop() ?? '';
  const [data, setData] = useState<EventDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(() => {
    if (typeof window === 'undefined') return false;
    return new URL(window.location.href).searchParams.get('edit') === '1';
  });

  const refresh = async () => {
    const envelope = await apiRequest<{ data: EventDetail }>(`admin/events/${encodeURIComponent(id)}`, {
      scope: CATALOG_GLOBAL_SCOPE,
    });
    setData(envelope.data);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refresh();
      } catch (err) {
        if (!cancelled) {
          setError(catalogErrorMessage(err, t('errors.loadEvent', { defaultMessage: 'Unable to load event.' })));
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
    return <p className="maps-settings-lead">{t('admin.loadingEvent', { defaultMessage: 'Loading event…' })}</p>;
  }

  const details: Array<[string, string]> = [
    ['Category', missing(data.category_code)],
    ['Status', missing(data.status)],
    ['Location', missing(data.location_name ?? data.location_id)],
    ['Starts', data.starts_at ? formatTimestamp(data.starts_at) : 'Not provided'],
    ['Ends', data.ends_at ? formatTimestamp(data.ends_at) : 'Not provided'],
    ['Registration opens', data.registration_opens_at ? formatTimestamp(data.registration_opens_at) : 'Not provided'],
    ['Registration closes', data.registration_closes_at ? formatTimestamp(data.registration_closes_at) : 'Not provided'],
    ['Published', data.published_at ? formatTimestamp(data.published_at) : 'Draft'],
    ['Fee', formatFee(data.fee_amount_minor, data.fee_currency)],
    ['Capacity', missing(data.capacity)],
    ['Registrations', String(data.registrations_count ?? 0)],
  ];

  if (editing) {
    const fields = fieldsForEntity('event');
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
          void mutate('Update Event', payload);
        }}
      >
        <article className="platform-card platform-form">
          <header>
            <h2>{data.name}</h2>
            <p>{t('admin.editEventCopy', { defaultMessage: 'Update event details and publishing window.' })}</p>
          </header>
          {error ? <p className="maps-settings-lead" role="alert">{error}</p> : null}
          <AdminFormFields fields={fields} values={{
            name: data.name,
            category_code: data.category_code ?? '',
            location_id: data.location_id ?? '',
            starts_at: data.starts_at?.slice(0, 16) ?? '',
            ends_at: data.ends_at?.slice(0, 16) ?? '',
            registration_opens_at: data.registration_opens_at?.slice(0, 16) ?? '',
            registration_closes_at: data.registration_closes_at?.slice(0, 16) ?? '',
            published_at: data.published_at?.slice(0, 16) ?? '',
            fee_amount_minor: data.fee_amount_minor != null ? String(data.fee_amount_minor) : '',
            fee_currency: data.fee_currency ?? '',
            capacity: data.capacity != null ? String(data.capacity) : '',
          }} />
          <footer className="form-footer">
            <button className="platform-secondary" disabled={busy} type="button" onClick={() => {
              setEditing(false);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                if (url.searchParams.has('edit')) {
                  url.searchParams.delete('edit');
                  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
                }
              }
            }}>
              {t('common.cancel', { defaultMessage: 'Cancel' })}
            </button>
            <button className="platform-primary" disabled={busy} type="submit">
              {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : t('admin.saveEvent', { defaultMessage: 'Save event' })}
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
          <span className="platform-overline">{t('admin.eventDetail', { defaultMessage: 'Event detail' })}</span>
          <h2>{data.name}</h2>
          <p>{data.category_code ?? t('admin.uncategorizedEvent', { defaultMessage: 'Uncategorized event' })}</p>
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
              <button className="platform-secondary" disabled={busy} type="button" onClick={() => void mutate('Unpublish Event', { published_at: '' })}>
                {t('admin.unpublishEvent', { defaultMessage: 'Unpublish' })}
              </button>
            ) : (
              <button className="platform-secondary" disabled={busy} type="button" onClick={() => void mutate('Publish Event', { published_at: new Date().toISOString() })}>
                {t('admin.publishEvent', { defaultMessage: 'Publish now' })}
              </button>
            )}
            {data.can_delete ? (
              <button className="platform-secondary" disabled={busy} type="button" onClick={() => void mutate('Delete Event')}>
                {t('common.delete', { defaultMessage: 'Delete' })}
              </button>
            ) : null}
          </div>
        </article>
      </div>
      <p>
        <Link href="/admin/events">{t('admin.backToEvents', { defaultMessage: 'Back to events' })}</Link>
        {' · '}
        <Link href="/admin/events/registrations">{t('admin.viewRegistrations', { defaultMessage: 'View registrations' })}</Link>
      </p>
    </div>
  );
}

export function EventCreateForm({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const fields = fieldsForEntity('event');
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
        label: 'Create Event',
        payload,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      const name = typeof result.data === 'object' && result.data && 'name' in result.data
        ? String((result.data as { name?: string }).name ?? result.id ?? 'event')
        : (result.id ?? 'event');
      setMessage(t('admin.eventCreated', { defaultMessage: 'Created {name}', vars: { name } }));
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
          <Link className="platform-secondary" href="/admin/events">{t('common.cancel', { defaultMessage: 'Cancel' })}</Link>
          <button className="platform-primary" disabled={busy} type="submit">
            {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : t('admin.createEvent', { defaultMessage: 'Create event' })}
          </button>
        </footer>
      </article>
    </form>
  );
}
