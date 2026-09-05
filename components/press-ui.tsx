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
import { PLATFORM_GLOBAL_SCOPE, uploadPlatformFile } from '../lib/admin-platform-api';
import { useLocale } from '@/components/locale-provider';

type PressDetail = {
  id: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  description?: string | null;
  publisher_name?: string | null;
  language_code?: string | null;
  category?: string | null;
  format?: string | null;
  publication_type?: string | null;
  status?: string | null;
  isbn?: string | null;
  author_name?: string | null;
  published_at?: string | null;
  content_file_asset_id?: string | null;
  content_source_url?: string | null;
  allowed_transitions?: string[];
  type_metadata?: Record<string, unknown>;
  contributors?: Array<{ id: string; person_name?: string; role?: string }>;
  assets?: Array<{ id: string; asset_format?: string; processing_status?: string; version?: number }>;
  reviews?: Array<{ id: string; stage?: string; decision?: string; comments?: string | null; decided_at?: string | null }>;
  translations?: Array<{ id: string; target_language_code?: string; translated_title?: string; status?: string }>;
};

function missing(value?: string | null): string {
  return value && value.trim() !== '' && value !== '—' ? value : 'Not provided';
}

function transitionLabel(status: string): string {
  switch (status) {
    case 'published':
      return 'Publish';
    case 'editorial_review':
      return 'Send to editorial review';
    case 'unpublished':
      return 'Unpublish';
    default:
      return status.replaceAll('_', ' ');
  }
}

function orderedTransitions(statuses: string[]): string[] {
  const rank = (status: string) => (status === 'published' ? 0 : 1);
  return [...statuses].sort((left, right) => rank(left) - rank(right));
}

function publicationTypeLabel(type?: string | null): string {
  switch ((type ?? '').toLowerCase()) {
    case 'bible_study':
      return 'Study Manual';
    case 'devotional':
      return 'Devotional';
    case 'document_pdf':
      return 'Document';
    default:
      return missing(type);
  }
}

async function payloadFromPublicationForm(form: HTMLFormElement): Promise<Record<string, string>> {
  const formData = new FormData(form);
  const payload: Record<string, string> = {};
  const contentFile = formData.get('content_file');
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) continue;
    payload[key] = String(value);
  }
  if (contentFile instanceof File && contentFile.size > 0) {
    const uploaded = await uploadPlatformFile(contentFile, 'press.publication.content', PLATFORM_GLOBAL_SCOPE);
    payload.content_file_asset_id = uploaded.id;
  }
  return payload;
}

export function PressPublicationDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const id = screen.route.split('/').pop() ?? '';
  const [data, setData] = useState<PressDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);

  const reload = async () => {
    const envelope = await apiRequest<{ data: PressDetail }>(`admin/press/publications/${encodeURIComponent(id)}`, {
      scope: CATALOG_GLOBAL_SCOPE,
    });
    setData(envelope.data);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const envelope = await apiRequest<{ data: PressDetail }>(`admin/press/publications/${encodeURIComponent(id)}`, {
          scope: CATALOG_GLOBAL_SCOPE,
        });
        if (!cancelled) setData(envelope.data);
      } catch (err) {
        if (!cancelled) setError(catalogErrorMessage(err, t('errors.loadPublication', { defaultMessage: 'Unable to load publication.' })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, t]);

  const act = async (status: string, label: string) => {
    setBusy(true);
    setError(null);
    try {
      await executeAdminAction({
        route: screen.route,
        label,
        payload: { status, reason_code: 'publication_reviewed' },
        recordId: id,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      await reload();
    } catch (err) {
      setError(formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  };

  const attachDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setAssetMessage(null);
    try {
      const payload = await payloadFromPublicationForm(event.currentTarget);
      payload.publication_id = id;
      payload.id = id;
      if (!payload.content_file_asset_id && !payload.content_source_url) {
        throw new Error('Choose a document file or enter a document URL.');
      }
      await executeAdminAction({
        route: screen.route,
        label: 'Edit publication',
        payload,
        recordId: id,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      await reload();
      setAssetMessage(t('admin.publicationDocumentSaved', { defaultMessage: 'Document attached to this publication.' }));
      event.currentTarget.reset();
    } catch (err) {
      setError(err instanceof Error && !(err as { status?: number }).status
        ? err.message
        : formatAdminMutationError(err));
    } finally {
      setBusy(false);
    }
  };

  if (error && !data) {
    return <p className="maps-settings-lead" role="alert">{error}</p>;
  }
  if (!data) {
    return <p className="maps-settings-lead">{t('admin.loadingPublication', { defaultMessage: 'Loading publication…' })}</p>;
  }

  const details: Array<[string, string]> = [
    ['Type', publicationTypeLabel(data.publication_type)],
    ['Format', missing(data.format)],
    ['Status', missing(data.status)],
    ['Author', missing(data.author_name)],
    ['Category', missing(data.category)],
    ['Language', missing(data.language_code)],
    ['Publisher', missing(data.publisher_name)],
    ['ISBN', missing(data.isbn)],
    ['Document file', missing(data.content_file_asset_id)],
    ['Document URL', missing(data.content_source_url)],
    ['Published', data.published_at ? formatTimestamp(data.published_at) : 'Not provided'],
  ];

  return (
    <div className="platform-detail">
      <article className="platform-card platform-detail-hero">
        <div>
          <span className="platform-overline">{t('admin.publicationDetail', { defaultMessage: 'Publication detail' })}</span>
          <h2>{data.title}</h2>
          <p>{data.subtitle || data.summary || t('admin.noSubtitle', { defaultMessage: 'Not provided' })}</p>
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
          {data.description ? <p>{data.description}</p> : null}
        </article>
        <article className="platform-card">
          <h3>{t('admin.allowedActions', { defaultMessage: 'Allowed actions' })}</h3>
          <p className="maps-settings-lead">
            {data.status === 'published' || data.status === 'distribution'
              ? t('admin.publicationIsLive', { defaultMessage: 'This title is live on the public Press catalogue.' })
              : t('admin.publishHint', { defaultMessage: 'Manuscript is a working copy. Click Publish to make it visible on the public Press catalogue. Books still need an ISBN first.' })}
          </p>
          {(data.allowed_transitions ?? []).length === 0 ? (
            <p className="maps-settings-lead">{t('admin.noTransitions', { defaultMessage: 'No further transitions.' })}</p>
          ) : (
            <div className="row-actions platform-row-actions">
              {orderedTransitions(data.allowed_transitions ?? []).map((status) => (
                <button
                  className={status === 'published' ? 'platform-primary' : 'ghost-button'}
                  disabled={busy}
                  key={status}
                  type="button"
                  onClick={() => void act(status, status === 'published' ? 'Publish' : `Transition ${status}`)}
                >
                  {transitionLabel(status)}
                </button>
              ))}
            </div>
          )}
        </article>
      </div>
      <article className="platform-card">
        <h3>{t('admin.contributors', { defaultMessage: 'Contributors' })}</h3>
        {(data.contributors ?? []).length === 0 ? <p>Not provided</p> : (
          <ul>{data.contributors?.map((row) => <li key={row.id}>{row.person_name} · {row.role}</li>)}</ul>
        )}
      </article>
      <article className="platform-card">
        <h3>{t('admin.assets', { defaultMessage: 'Assets' })}</h3>
        {(data.assets ?? []).length === 0 ? <p>Not provided</p> : (
          <ul>{data.assets?.map((row) => <li key={row.id}>{row.asset_format} v{row.version} · {row.processing_status}</li>)}</ul>
        )}
        <form className="platform-form-grid" onSubmit={(event) => void attachDocument(event)} style={{ marginTop: 16 }}>
          <label className="wide">
            <span>{t('admin.field.content_file', { defaultMessage: 'Document file' })}</span>
            <input name="content_file" type="file" accept=".pdf,.epub,.mp3,.mp4,.doc,.docx,application/pdf" />
          </label>
          <label className="wide">
            <span>{t('admin.field.content_source_url', { defaultMessage: 'Document URL' })}</span>
            <input name="content_source_url" type="url" placeholder="https://example.com/document.pdf" defaultValue={data.content_source_url ?? ''} />
          </label>
          <input type="hidden" name="format" value={data.format ?? 'pdf'} />
          <input type="hidden" name="title" value={data.title} />
          <input type="hidden" name="publisher_name" value={data.publisher_name ?? 'Kingdom Press'} />
          <input type="hidden" name="language_code" value={data.language_code ?? 'en'} />
          <input type="hidden" name="publication_type" value={data.publication_type ?? 'book'} />
          <input type="hidden" name="subtitle" value={data.subtitle ?? ''} />
          <input type="hidden" name="summary" value={data.summary ?? ''} />
          <input type="hidden" name="category" value={data.category ?? ''} />
          <input type="hidden" name="description" value={data.description ?? ''} />
          {assetMessage ? <p className="maps-settings-lead" role="status">{assetMessage}</p> : null}
          <footer className="form-footer">
            <button className="platform-primary" disabled={busy} type="submit">
              {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : t('admin.attachDocument', { defaultMessage: 'Attach document' })}
            </button>
          </footer>
        </form>
      </article>
      <article className="platform-card">
        <h3>{t('admin.reviews', { defaultMessage: 'Reviews' })}</h3>
        {(data.reviews ?? []).length === 0 ? <p>Not provided</p> : (
          <ul>{data.reviews?.map((row) => <li key={row.id}>{row.stage} · {row.decision} · {row.decided_at ? formatTimestamp(row.decided_at) : ''} {row.comments ?? ''}</li>)}</ul>
        )}
      </article>
      <article className="platform-card">
        <h3>{t('admin.translations', { defaultMessage: 'Translations' })}</h3>
        {(data.translations ?? []).length === 0 ? <p>Not provided</p> : (
          <ul>{data.translations?.map((row) => <li key={row.id}>{row.target_language_code}: {row.translated_title} · {row.status}</li>)}</ul>
        )}
      </article>
      <p><Link href="/admin/press/publications">{t('admin.backToPublications', { defaultMessage: 'Back to publications' })}</Link></p>
    </div>
  );
}

export function PressPublicationCreateForm({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const fields = fieldsForEntity('press_publication');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const payload = await payloadFromPublicationForm(event.currentTarget);
      const result = await executeAdminAction({
        route: screen.route,
        label: 'Create Publication',
        payload,
        scope: CATALOG_GLOBAL_SCOPE,
      });
      const title = typeof result.data === 'object' && result.data && 'title' in result.data
        ? String((result.data as { title?: string }).title ?? result.id ?? 'publication')
        : (result.id ?? 'publication');
      setMessage(t('admin.publicationCreated', { defaultMessage: 'Created {title}', vars: { title } }));
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
          <button className="platform-primary" disabled={busy} type="submit">
            {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : t('admin.createPublication', { defaultMessage: 'Create publication' })}
          </button>
        </footer>
      </article>
    </form>
  );
}
