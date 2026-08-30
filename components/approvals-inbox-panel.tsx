'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/locale-provider';
import type { AdminScreen } from '../lib/admin-routes.ts';
import { catalogErrorMessage, listCatalogDomain, shouldUseCatalogLiveData } from '../lib/admin-catalog-api';
import { designFixturesEnabled } from '../lib/admin-platform-api';
import {
  defaultOpsScope,
  listHomeChurchApplications,
  operationsErrorMessage,
} from '../lib/admin-operations-api';

type QueueSource = 'all' | 'home-churches' | 'alerts' | 'privacy' | 'press' | 'files' | 'kca';

type QueueItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  source: Exclude<QueueSource, 'all'>;
};

const PRESS_REVIEW_STATUSES = new Set([
  'editorial_review',
  'theological_review',
  'copy_editing',
  'design',
  'isbn_assignment',
  'publication_approval',
]);

const TRANSLATION_REVIEW_STATUSES = new Set(['machine_generated', 'under_review', 'reviewed']);
const KCA_REVIEW_STATUSES = new Set(['received', 'reviewed']);
const FILE_REVIEW_STATUSES = new Set(['quarantined', 'pending']);
const PRIVACY_OPEN_STATUSES = new Set(['pending_review', 'processing', 'pending']);

const FILTERS: Array<{ id: QueueSource; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'home-churches', label: 'Home Churches' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'press', label: 'Press' },
  { id: 'files', label: 'Files' },
  { id: 'kca', label: 'KCA' },
];

function pushItems(
  next: QueueItem[],
  records: Array<Record<string, unknown>> | undefined,
  map: (record: Record<string, unknown>, id: string) => QueueItem | null,
) {
  for (const record of records ?? []) {
    const id = String(record.id ?? '');
    if (!id) continue;
    const item = map(record, id);
    if (item) next.push(item);
  }
}

export function ApprovalsInboxPanel({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = !designFixturesEnabled() && shouldUseCatalogLiveData();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<QueueSource>('all');
  const [message, setMessage] = useState(() => t('admin.loadingApprovals', { defaultMessage: 'Loading approval queues…' }));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live) {
      setMessage(t('admin.approvalsFixtures', {
        defaultMessage: 'Live approvals require design fixtures off and a configured API URL. There is no unified approval-queue API; this inbox aggregates existing queues.',
      }));
      return;
    }
    let cancelled = false;
    void (async () => {
      setError(null);
      try {
        const [
          applications,
          alerts,
          privacy,
          publications,
          translations,
          files,
          kcaApps,
        ] = await Promise.all([
          listHomeChurchApplications({ scope: defaultOpsScope(screen.scope), perPage: 15, status: 'submitted' }).catch(() => null),
          listCatalogDomain('reporting.alert_occurrences', { perPage: 15, status: 'open' }).catch(() => null),
          listCatalogDomain('privacy.data_subject_requests', { perPage: 25 }).catch(() => null),
          listCatalogDomain('press.publications', { perPage: 40 }).catch(() => null),
          listCatalogDomain('press.translations', { perPage: 40 }).catch(() => null),
          listCatalogDomain('platform.files', { perPage: 40 }).catch(() => null),
          listCatalogDomain('kca.applications', { perPage: 40 }).catch(() => null),
        ]);
        if (cancelled) return;
        const next: QueueItem[] = [];

        pushItems(next, applications?.items as Array<Record<string, unknown>> | undefined, (app, id) => ({
          id,
          title: String(app.applicant_name ?? app.name ?? 'Home church application'),
          detail: String(app.status ?? 'submitted'),
          href: `/admin/home-churches/applications/${id}/review`,
          source: 'home-churches',
        }));

        pushItems(next, alerts?.items, (alert, id) => ({
          id,
          title: String(alert.title ?? alert.name ?? alert.condition_reference_type ?? 'Alert'),
          detail: String(alert.status ?? 'open'),
          href: '/admin/alerts',
          source: 'alerts',
        }));

        pushItems(next, privacy?.items, (request, id) => {
          const status = String(request.status ?? '');
          if (status && !PRIVACY_OPEN_STATUSES.has(status)) return null;
          return {
            id,
            title: String(request.person_name ?? request.request_type ?? 'Privacy request'),
            detail: status || 'pending_review',
            href: '/admin/security/privacy-requests',
            source: 'privacy',
          };
        });

        pushItems(next, publications?.items, (publication, id) => {
          const status = String(publication.status ?? '');
          if (!PRESS_REVIEW_STATUSES.has(status)) return null;
          return {
            id,
            title: String(publication.title ?? publication.name ?? 'Publication'),
            detail: status,
            href: '/admin/press/publications',
            source: 'press',
          };
        });

        pushItems(next, translations?.items, (translation, id) => {
          const status = String(translation.status ?? '');
          if (!TRANSLATION_REVIEW_STATUSES.has(status)) return null;
          return {
            id,
            title: String(translation.translated_title ?? translation.title ?? translation.language_code ?? 'Translation'),
            detail: status,
            href: '/admin/press/translations',
            source: 'press',
          };
        });

        pushItems(next, files?.items, (file, id) => {
          const status = String(file.status ?? '');
          if (!FILE_REVIEW_STATUSES.has(status)) return null;
          return {
            id,
            title: String(file.name ?? file.original_filename ?? file.detected_mime_type ?? 'File asset'),
            detail: status,
            href: '/admin/settings/uploads',
            source: 'files',
          };
        });

        pushItems(next, kcaApps?.items, (application, id) => {
          const status = String(application.status ?? '');
          if (!KCA_REVIEW_STATUSES.has(status)) return null;
          return {
            id,
            title: String(application.person_name ?? application.applicant_name ?? 'KCA application'),
            detail: status,
            href: `/admin/kca/applications/${id}/decision`,
            source: 'kca',
          };
        });

        setItems(next);
        setMessage(
          next.length === 0
            ? t('admin.noApprovals', { defaultMessage: 'No open items in aggregated approval queues.' })
            : t('admin.showingApprovals', { defaultMessage: 'Showing {count} open items across live queues.', vars: { count: next.length } }),
        );
      } catch (err) {
        if (cancelled) return;
        setItems([]);
        setError(
          operationsErrorMessage(err, catalogErrorMessage(err, t('errors.loadApprovals', { defaultMessage: 'Unable to load approval queues.' }))),
        );
        setMessage(t('admin.approvalsUnavailable', { defaultMessage: 'Live approvals unavailable' }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [live, screen.scope, t]);

  const visible = useMemo(
    () => (filter === 'all' ? items : items.filter((item) => item.source === filter)),
    [filter, items],
  );

  if (!live) {
    return (
      <article className="platform-card">
        <p className="maps-settings-lead" role="status">{message}</p>
      </article>
    );
  }

  return (
    <div className="platform-dashboard">
      <p className="maps-settings-lead" role="status">
        {t('admin.approvalsLead', {
          defaultMessage: 'Aggregated from existing domain queues (home churches, alerts, privacy, press, files, KCA). There is no single approval-queue API.',
        })}
      </p>
      <div className="platform-tabs" role="tablist" aria-label={t('admin.approvalFilters', { defaultMessage: 'Approval filters' })}>
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={filter === entry.id}
            className={filter === entry.id ? 'active' : ''}
            onClick={() => setFilter(entry.id)}
          >
            {entry.label}
            {entry.id === 'all' ? ` (${items.length})` : ` (${items.filter((item) => item.source === entry.id).length})`}
          </button>
        ))}
      </div>
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <article className="platform-card platform-list">
        <header>
          <h2>{screen.title}</h2>
          <span>{message}</span>
        </header>
        {visible.length === 0 ? (
          <p>{t('admin.noApprovalsInFilter', { defaultMessage: 'No open items in this filter.' })}</p>
        ) : (
          visible.map((item) => (
            <div key={`${item.source}-${item.id}`}>
              <span className="platform-list-icon">✓</span>
              <b>{item.title}</b>
              <strong>{item.source} · {item.detail}</strong>
              <Link href={item.href}>{t('common.review', { defaultMessage: 'Review' })}</Link>
            </div>
          ))
        )}
      </article>
    </div>
  );
}
