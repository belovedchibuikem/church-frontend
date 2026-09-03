import { ApiError, apiRequest, resolveApiBaseUrl } from './api-client';
import type { ApiAdminScope, ApiSuccessEnvelope, JsonObject } from './api-types';
import type { SearchSelectOption } from '../components/search-select';
import { formatTimestamp } from './admin-identity-api';

export type AdminScope = ApiAdminScope;

/** Catalog endpoints require global platform scope (`DomainCatalogController::ensureGlobal`). */
export const CATALOG_GLOBAL_SCOPE: AdminScope = { type: 'global', id: 'platform' };

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

/**
 * Paths from `ProtectedDomainRegistry::definitions()` — do not invent.
 * Values are relative to `/api/v1/admin/catalog/`.
 */
export const CATALOG_PATHS = {
  'kca.applications': 'kca/applications',
  'kca.enrollments': 'kca/enrollments',
  'kca.years': 'kca/years',
  'kca.cohorts': 'kca/cohorts',
  'kca.modules': 'kca/modules',
  'kca.lessons': 'kca/lessons',
  'kca.chapters': 'kca/chapters',
  'kca.prerequisites': 'kca/prerequisites',
  'kca.lecturer_assignments': 'kca/lecturer-assignments',
  'kca.mentor_assignments': 'kca/mentor-assignments',
  'kca.assignments': 'kca/assignments',
  'kca.evidence': 'kca/evidence-submissions',
  'kca.assessments': 'kca/assessment-results',
  'kca.attendance': 'kca/attendance',
  'kca.certificates': 'kca/certificates',
  'kca.orientation': 'kca/orientation-sessions',
  'press.publications': 'press/publications',
  'press.translations': 'press/translations',
  'press.contributors': 'press/contributors',
  'press.authors': 'press/authors',
  'press.assets': 'press/assets',
  'press.reviews': 'press/reviews',
  'events.events': 'events/events',
  'events.registrations': 'events/registrations',
  'finance.payment_intents': 'finance/payment-intents',
  'finance.payment_transactions': 'finance/payment-transactions',
  'finance.payment_reconciliations': 'finance/payment-reconciliations',
  'finance.payment_receipts': 'finance/payment-receipts',
  'finance.payment_refunds': 'finance/payment-refunds',
  'finance.payment_disputes': 'finance/payment-disputes',
  'communications.templates': 'communications/templates',
  'communications.audiences': 'communications/audiences',
  'communications.broadcasts': 'communications/broadcasts',
  'communications.deliveries': 'communications/delivery-attempts',
  'communications.notifications': 'communications/notifications',
  'reporting.alert_rules': 'reporting/alert-rules',
  'reporting.alert_occurrences': 'reporting/alert-occurrences',
  'privacy.data_subject_requests': 'privacy/data-subject-requests',
  'platform.files': 'platform/files',
  'safeguarding.incidents': 'safeguarding/incidents',
  'safeguarding.guardians': 'safeguarding/guardian-relationships',
  'safeguarding.child_profiles': 'safeguarding/child-profiles',
} as const;

export type CatalogDomainKey = keyof typeof CATALOG_PATHS;

export type CatalogListQuery = {
  search?: string;
  status?: string;
  purpose?: string;
  page?: number;
  perPage?: number;
  scope?: AdminScope;
  signal?: AbortSignal;
};

export type CatalogListResult<T = Record<string, unknown>> = {
  items: T[];
  pagination: PaginationMeta;
  correlationId?: string;
};

export class AdminCatalogApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public correlationId?: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AdminCatalogApiError';
  }
}

export function designFixturesEnabled(): boolean {
  return (
    process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true' ||
    process.env.NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES === 'true'
  );
}

export function catalogApiConfigured(): boolean {
  return Boolean(resolveApiBaseUrl());
}

export function shouldUseCatalogLiveData(): boolean {
  return !designFixturesEnabled() && catalogApiConfigured();
}

function toCatalogError(error: unknown, fallback: string): AdminCatalogApiError {
  if (error instanceof AdminCatalogApiError) return error;
  if (error instanceof ApiError) {
    return new AdminCatalogApiError(
      error.status,
      error.message || fallback,
      error.code,
      error.correlationId,
      error.details,
    );
  }
  if (error instanceof Error) {
    return new AdminCatalogApiError(503, error.message || fallback, 'NETWORK_ERROR');
  }
  return new AdminCatalogApiError(503, fallback, 'UNKNOWN');
}

export function catalogErrorMessage(error: unknown, fallback: string): string {
  const catalog = toCatalogError(error, fallback);
  return catalog.code ? `${catalog.message} (${catalog.code})` : catalog.message;
}

function paginationFromMeta(meta: JsonObject | undefined): PaginationMeta {
  const pagination = (meta?.pagination ?? {}) as Partial<PaginationMeta>;
  return {
    current_page: Number(pagination.current_page ?? 1),
    per_page: Number(pagination.per_page ?? 25),
    last_page: Number(pagination.last_page ?? 1),
    total: Number(pagination.total ?? 0),
  };
}

export async function listCatalogDomain<T = Record<string, unknown>>(
  key: CatalogDomainKey,
  params: CatalogListQuery = {},
): Promise<CatalogListResult<T>> {
  const path = CATALOG_PATHS[key];
  if (!path) {
    throw new AdminCatalogApiError(404, `Unknown catalog domain: ${String(key)}`, 'CATALOG_NOT_FOUND');
  }

  try {
    const search = new URLSearchParams();
    if (params.search) search.set('filter[search]', params.search);
    if (params.status) search.set('filter[status]', params.status);
    if (params.purpose) search.set('filter[purpose]', params.purpose);
    if (params.page) search.set('page', String(params.page));
    search.set('per_page', String(params.perPage ?? 25));
    const qs = search.toString();

    const envelope = await apiRequest<ApiSuccessEnvelope<T[]>>(
      `admin/catalog/${path}${qs ? `?${qs}` : ''}`,
      {
        method: 'GET',
        scope: params.scope ?? CATALOG_GLOBAL_SCOPE,
        signal: params.signal,
      },
    );

    return {
      items: Array.isArray(envelope.data) ? envelope.data : [],
      pagination: paginationFromMeta(envelope.meta as JsonObject | undefined),
      correlationId: envelope.correlation_id,
    };
  } catch (error) {
    throw toCatalogError(error, 'Unable to load domain catalog.');
  }
}

const LABEL_FIELDS = [
  'title',
  'translated_title',
  'name',
  'person_name',
  'lecturer_name',
  'mentor_name',
  'code',
  'assessment_code',
  'result_code',
  'status',
  'id',
] as const;

const META_FIELDS = ['status', 'category', 'format', 'language_code', 'code', 'person_id'] as const;

export function catalogRecordToOption(record: Record<string, unknown>): SearchSelectOption {
  const id = String(record.id ?? '');
  let label = id;
  for (const field of LABEL_FIELDS) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) {
      label = value;
      break;
    }
  }
  let meta: string | undefined;
  for (const field of META_FIELDS) {
    const value = record[field];
    if (typeof value === 'string' && value.trim() && value !== label) {
      meta = value;
      break;
    }
  }
  return { value: id, label, meta };
}

export async function searchCatalogOptions(
  key: CatalogDomainKey,
  query = '',
  options: { perPage?: number; signal?: AbortSignal; scope?: AdminScope } = {},
): Promise<SearchSelectOption[]> {
  const result = await listCatalogDomain(key, {
    search: query || undefined,
    perPage: options.perPage ?? 25,
    signal: options.signal,
    scope: options.scope,
  });
  return result.items.map((item) => catalogRecordToOption(item as Record<string, unknown>));
}

/** Form-catalog keys that resolve to ProtectedDomainRegistry catalogs (searchable). */
export const FORM_TO_DOMAIN_CATALOG: Partial<Record<string, CatalogDomainKey>> = {
  // Domain catalogs are used for remaining modules; church/org selects use operations/org APIs.
  paymentTransaction: 'finance.payment_transactions',
  eventRegistration: 'events.registrations',
  pressPublication: 'press.publications',
  pressTranslation: 'press.translations',
  pressContributor: 'press.contributors',
  event: 'events.events',
  communicationTemplate: 'communications.templates',
  communicationAudience: 'communications.audiences',
  alertRule: 'reporting.alert_rules',
  kcaApplication: 'kca.applications',
  kcaYear: 'kca.years',
  kcaCohort: 'kca.cohorts',
  kcaModule: 'kca.modules',
  kcaLesson: 'kca.lessons',
  kcaChapter: 'kca.chapters',
  kcaEnrollment: 'kca.enrollments',
  kcaCertificate: 'kca.certificates',
  platformFile: 'platform.files',
};

/**
 * Map admin screen routes to ProtectedDomainRegistry catalog keys (no invented paths).
 * Returns null when the screen has no matching list catalog.
 */
export function resolveCatalogDataset(screen: {
  id?: string;
  route: string;
  nav?: string;
}): CatalogDomainKey | null {
  const route = screen.route;
  if (
    route === '/admin/press/publications' ||
    route === '/admin/press/manuscripts' ||
    route === '/admin/press/catalogue' ||
    route === '/admin/press/distribution'
  ) {
    return 'press.publications';
  }
  if (route === '/admin/press/authors') return 'press.authors';
  if (route === '/admin/press/translations' || route === '/admin/settings/translation-governance') {
    return 'press.translations';
  }
  if (route.includes('/admin/press/manuscripts/') && route.includes('review')) return 'press.reviews';
  if (route === '/admin/press/assets') return 'press.assets';
  if (route === '/admin/press/sales') return 'finance.payment_intents';
  if (route === '/admin/communications/templates') return 'communications.templates';
  if (route === '/admin/communications/audiences' || route === '/admin/communications/audiences/create' || route.startsWith('/admin/communications/audiences/')) {
    return route === '/admin/communications/audiences' ? 'communications.audiences' : null;
  }
  if (route === '/admin/communications/broadcasts' || route.startsWith('/admin/communications/broadcasts/')) {
    return route === '/admin/communications/broadcasts' ? 'communications.broadcasts' : null;
  }
  if (route === '/admin/communications/delivery-queue' || route === '/admin/communications/failed') {
    return 'communications.deliveries';
  }
  if (route === '/admin/communications/notifications' || route === '/admin/notifications') {
    return 'communications.notifications';
  }
  if (route === '/admin/finance/transactions') return 'finance.payment_transactions';
  if (
    route === '/admin/finance/tithes' ||
    route === '/admin/finance/offerings' ||
    route === '/admin/finance/projects' ||
    route === '/admin/finance/donations' ||
    route === '/admin/finance/event-payments' ||
    route === '/admin/finance/kca-payments' ||
    route === '/admin/finance/publication-payments'
  ) {
    return 'finance.payment_intents';
  }
  if (route === '/admin/finance/reconciliation') return 'finance.payment_reconciliations';
  if (route === '/admin/finance/receipts') return 'finance.payment_receipts';
  if (route === '/admin/finance/refunds') return 'finance.payment_refunds';
  if (route === '/admin/finance/disputes') return 'finance.payment_disputes';
  if (route === '/admin/alerts' || route === '/admin/finance/alerts' || route === '/admin/security/alerts') {
    return 'reporting.alert_occurrences';
  }
  if (route === '/admin/alerts/rules') return 'reporting.alert_rules';
  if (route === '/admin/settings/events' || route === '/admin/events' || route === '/admin/events/registrations') {
    return route.includes('registration') ? 'events.registrations' : 'events.events';
  }
  if (
    route === '/admin/security/privacy-requests' ||
    route === '/admin/security/data-export-requests' ||
    route === '/admin/security/data-deletion-requests'
  ) {
    return 'privacy.data_subject_requests';
  }
  if (route === '/admin/security/safeguarding/cases') return 'safeguarding.incidents';
  if (route === '/admin/security/guardian-consent') return 'safeguarding.guardians';
  if (route === '/admin/security/child-profiles' || route === '/admin/security/communication-restrictions') {
    return 'safeguarding.child_profiles';
  }
  if (route === '/admin/settings/uploads') return 'platform.files';
  if (route === '/admin/kca/applications' || route === '/admin/kca/review-queue') return 'kca.applications';
  if (route === '/admin/kca/students') return 'kca.enrollments';
  if (route === '/admin/kca/evidence-reviews') return 'kca.evidence';
  if (route === '/admin/kca/assessments/final') return 'kca.assessments';
  if (route === '/admin/kca/certificates') return 'kca.certificates';
  if (route === '/admin/kca/cohorts') return 'kca.cohorts';
  if (route === '/admin/kca/years') return 'kca.years';
  if (route === '/admin/kca/modules') return 'kca.modules';
  if (route === '/admin/kca/lessons') return 'kca.lessons';
  if (route === '/admin/kca/chapters') return 'kca.chapters';
  if (route === '/admin/kca/attendance') return 'kca.attendance';
  if (route.includes('/admin/kca/modules/') && route.endsWith('/prerequisites')) return 'kca.prerequisites';
  if (route === '/admin/kca/alumni') return 'kca.certificates';
  if (route === '/admin/kca/lecturers') return 'kca.lecturer_assignments';
  if (route === '/admin/kca/mentors') return 'kca.mentor_assignments';
  if (route === '/admin/kca/assignments') return 'kca.assignments';
  if (route === '/admin/kca/orientation') return 'kca.orientation';
  return null;
}

/** Purpose code for finance category screens (`filter[purpose]`). */
export function resolveCatalogPurposeFilter(route: string): string | undefined {
  if (route === '/admin/finance/tithes') return 'tithe';
  if (route === '/admin/finance/offerings') return 'offering';
  if (route === '/admin/finance/projects') return 'projects';
  if (route === '/admin/finance/donations') return 'donation';
  if (route === '/admin/finance/event-payments') return 'event_payment';
  if (route === '/admin/finance/kca-payments') return 'kca';
  if (route === '/admin/finance/publication-payments' || route === '/admin/press/sales') return 'publication';
  return undefined;
}

function humanizeCatalogToken(value: string): string {
  if (!value || value === '—') return value;
  return value.replaceAll(/[._-]+/g, ' ').trim();
}

/** Project catalog records onto existing platform table column labels. */
export function catalogRecordsToRows(
  items: Record<string, unknown>[],
  columns: string[],
): Array<Record<string, string>> {
  return items.map((item) => {
    const mapped: Record<string, string> = {};
    const get = (...fields: string[]) => {
      for (const field of fields) {
        const value = item[field];
        if (value !== null && value !== undefined && value !== '') return String(value);
      }
      return '—';
    };
    for (const column of columns) {
      const key = column.toLowerCase();
      if (key.includes('title') || key === 'message' || key === 'name' || key === 'item' || key === 'alumni') {
        mapped[column] = get(
          'title',
          'translated_title',
          'name',
          'subject_name',
          'child_name',
          'guardian_name',
          'person_name',
          'subject',
          'message',
          'code',
          'purpose',
        );
      } else if (key.includes('applicant')) {
        mapped[column] = get('person_name', 'applicant_name', 'name');
      } else if (key.includes('status') || key === 'state') {
        mapped[column] = humanizeCatalogToken(get('status', 'state'));
      } else if (key.includes('author') || key.includes('donor') || key.includes('user') || key === 'by') {
        mapped[column] = get(
          'author_name',
          'person_name',
          'payer_name',
          'submitted_by_name',
          'reviewer_name',
          'owner_name',
          'donor_name',
        );
      } else if (key.includes('stage')) {
        mapped[column] = humanizeCatalogToken(get('status', 'stage'));
      } else if (key === 'channel' || key.endsWith(' channel')) {
        mapped[column] = humanizeCatalogToken(get('channel', 'provider_code', 'channel_code'));
      } else if (key.includes('category') || key.includes('type') || key.includes('reason')) {
        mapped[column] = humanizeCatalogToken(
          get(
            'assignment_kind',
            'category',
            'purpose_code',
            'kind',
            'format',
            'type',
            'concern_type',
            'relationship_type',
            'request_type',
            'condition_type',
            'reason',
            'reason_code',
          ),
        );
      } else if (key.includes('language')) {
        mapped[column] = get('language_code', 'language');
      } else if (key === 'id') {
        mapped[column] = get('registration_number', 'code', 'id');
      } else if (
        key.includes('submitted') ||
        key.includes('received') ||
        key.includes('date') ||
        key.includes('published') ||
        key.includes('updated') ||
        key === 'time'
      ) {
        const timestamp =
          key === 'date' || key === 'date & time'
            ? get(
                'occurred_at',
                'issued_at',
                'requested_at',
                'reconciled_at',
                'succeeded_at',
                'created_at',
                'starts_at',
              )
            : get(
                'received_at',
                'submitted_at',
                'published_at',
                'occurred_at',
                'opened_at',
                'succeeded_at',
                'starts_at',
                'starts_on',
                'issued_at',
                'registered_at',
                'created_at',
                'updated_at',
                'status_changed_at',
                'reviewed_at',
                'decided_at',
                'due_at',
                'assigned_at',
              );
        mapped[column] = formatTimestamp(timestamp === '—' ? null : timestamp);
      } else if (key.includes('amount')) {
        mapped[column] = get('amount', 'amount_minor');
      } else if (key === 'code') {
        mapped[column] = get('code');
      } else if (key.includes('audience')) {
        mapped[column] = get('audience', 'audience_id', 'name');
      } else if (key.includes('variance') || key.includes('expected') || key.includes('received')) {
        mapped[column] = get('amount', 'status', 'reason_code');
      } else if (key.includes('progress')) {
        mapped[column] = get('progress', 'starts_on', 'status');
      } else if (key.includes('result')) {
        mapped[column] = humanizeCatalogToken(get('result_code', 'result'));
      } else if (key.includes('score')) {
        mapped[column] = get('score');
      } else if (key.includes('assessment')) {
        mapped[column] = get('assessment_code', 'title', 'name');
      } else if (key.includes('assignment')) {
        mapped[column] = get('title', 'assignment_kind', 'name');
      } else if (key.includes('lecturer') || key.includes('mentor')) {
        mapped[column] = get('lecturer_name', 'mentor_name', 'person_name');
      } else if (key.includes('specialization') || key.includes('module')) {
        mapped[column] = get('module_title', 'module_code', 'title', 'specialization');
      } else if (key.includes('student')) {
        mapped[column] = get('student_name', 'person_name', 'students_count', 'enrollments_count', 'enrollment_id');
      } else if (key.includes('venue')) {
        mapped[column] = get('venue', 'location_name', 'venue_label');
      } else if (key.includes('church')) {
        mapped[column] = get('church_name', 'home_church_name', 'church');
      } else if (key.includes('batch')) {
        mapped[column] = get('batch_name', 'cohort_name', 'year_name', 'batch');
      } else if (key.includes('region')) {
        mapped[column] = get('cohort_name', 'region', 'locality');
      } else if (key.includes('translator')) {
        mapped[column] = get('translator_name', 'person_name');
      } else if (key.includes('lesson')) {
        mapped[column] = get('lessons_count', 'lesson_title', 'title', 'lesson_id');
      } else if (key.includes('session')) {
        mapped[column] = formatTimestamp(get('session_on') === '—' ? null : get('session_on'));
      } else if (key.includes('cohort')) {
        mapped[column] = get('cohort_name', 'name', 'cohort_id', 'cohort');
      } else if (key.includes('year')) {
        mapped[column] = get('year_name', 'name', 'code', 'year_id', 'starts_on');
      } else if (key.includes('detail') || key.includes('severity')) {
        mapped[column] = get('severity', 'status', 'condition_type', 'scope_type');
      } else {
        mapped[column] = get(column.toLowerCase().replaceAll(' ', '_'));
      }
    }
    mapped.__id = get('id');
    return mapped;
  });
}
