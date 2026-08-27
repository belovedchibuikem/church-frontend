import { ApiError, apiRequest, resolveApiBaseUrl } from './api-client.ts';
import type { ApiAdminScope, ApiSuccessEnvelope, JsonObject } from './api-types.ts';

export type AdminScope = ApiAdminScope;

export const GLOBAL_ADMIN_SCOPE: AdminScope = { type: 'global', id: 'platform' };

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

export type ListQuery = {
  search?: string;
  status?: string;
  page?: number;
  perPage?: number;
  scope?: AdminScope;
  signal?: AbortSignal;
};

export type ChurchRecord = {
  id: string;
  name: string;
  location_id?: string | null;
  administrative_unit_id?: string | null;
  published_at?: string | null;
  created_at?: string | null;
};

export type HomeChurchRecord = {
  id: string;
  church_id?: string | null;
  leader_person_id?: string | null;
  name: string;
  status: string;
  created_at?: string | null;
};

export type HomeChurchApplicationRecord = {
  id: string;
  church_id?: string | null;
  home_church_id?: string | null;
  applicant_person_id?: string | null;
  proposed_name: string;
  expected_participants?: number;
  meeting_day?: string;
  meeting_time?: string;
  status: string;
  status_changed_at?: string | null;
};

export type FirstTimerRecord = {
  id: string;
  person_id?: string | null;
  church_id?: string | null;
  home_church_id?: string | null;
  registered_at?: string | null;
  contacted_at?: string | null;
};

export type FollowUpTaskRecord = {
  id: string;
  first_timer_id?: string | null;
  assigned_to_person_id?: string | null;
  type: string;
  status: string;
  due_at?: string | null;
  completed_at?: string | null;
  completion_reason_code?: string | null;
};

export type CrusadeRecord = {
  id: string;
  name: string;
  location_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  published_at?: string | null;
};

export type SoulRecord = {
  id: string;
  crusade_id?: string | null;
  person_id?: string | null;
  connected_church_id?: string | null;
  status: string;
  mentor_assignment_id?: string | null;
  captured_at?: string | null;
  last_follow_up_at?: string | null;
  follow_up_completed_at?: string | null;
};

export type MissionInvitationRecord = {
  id: string;
  crusade_id?: string | null;
  requester_person_id?: string | null;
  requested_location_id?: string | null;
  status: string;
  created_at?: string | null;
};

export type MentorAssignmentRecord = {
  id: string;
  soul_id?: string | null;
  mission_team_assignment_id?: string | null;
  assigned_at?: string | null;
  ended_at?: string | null;
};

export type FollowUpInteractionRecord = {
  id: string;
  soul_id?: string | null;
  mentor_assignment_id?: string | null;
  channel_code: string;
  outcome_code: string;
  occurred_at?: string | null;
};

export type CreateChurchInput = {
  name: string;
  location_id: string;
  administrative_unit_id: string;
};

export type TransitionApplicationInput = {
  status: string;
  reason_code: string;
};

export type RegisterFirstTimerInput = {
  person_id: string;
  church_id: string;
  home_church_id?: string | null;
  assigned_follow_up_person_id?: string | null;
  registered_at?: string | null;
};

export type CaptureSoulInput = {
  person_id?: string | null;
  given_name?: string | null;
  family_name?: string | null;
  middle_name?: string | null;
  preferred_name?: string | null;
};

export type AssignMentorInput = {
  mission_team_assignment_id: string;
};

export type RecordMissionFollowUpInput = {
  mentor_assignment_id: string;
  channel_code: string;
  outcome_code: string;
  occurred_at: string;
};

export type OpsListResult<T> = {
  items: T[];
  pagination: PaginationMeta;
  correlationId?: string;
};

export class AdminOperationsApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly correlationId?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    code?: string,
    correlationId?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AdminOperationsApiError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.details = details;
  }
}

/** Fixtures only when explicitly enabled. */
export function designFixturesEnabled(): boolean {
  return (
    process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true' ||
    process.env.NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES === 'true'
  );
}

export function operationsApiConfigured(): boolean {
  return Boolean(resolveApiBaseUrl());
}

/** Prefer live ops when fixtures are off and the API base is configured. */
export function shouldUseOperationsLiveData(): boolean {
  return !designFixturesEnabled() && operationsApiConfigured();
}

export function defaultOpsScope(requestedScope?: string): AdminScope {
  if (!requestedScope || requestedScope === 'global' || requestedScope === 'assigned') {
    return GLOBAL_ADMIN_SCOPE;
  }
  const [type, ...rest] = requestedScope.split(':');
  const id = rest.join(':');
  if (type && id) return { type, id };
  return GLOBAL_ADMIN_SCOPE;
}

function toOpsError(error: unknown, fallback: string): AdminOperationsApiError {
  if (error instanceof AdminOperationsApiError) return error;
  if (error instanceof ApiError) {
    return new AdminOperationsApiError(
      error.status,
      error.message || fallback,
      error.code,
      error.correlationId,
      error.details,
    );
  }
  if (error instanceof Error) {
    return new AdminOperationsApiError(503, error.message || fallback, 'NETWORK_ERROR');
  }
  return new AdminOperationsApiError(503, fallback, 'UNKNOWN');
}

export function operationsErrorMessage(error: unknown, fallback: string): string {
  const ops = toOpsError(error, fallback);
  return ops.code ? `${ops.message} (${ops.code})` : ops.message;
}

function listQuery(params: ListQuery = {}): Record<string, string | number | undefined> {
  return {
    'filter[search]': params.search,
    'filter[status]': params.status,
    page: params.page,
    per_page: params.perPage ?? 25,
  };
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

async function opsGetList<T>(path: string, params: ListQuery = {}): Promise<OpsListResult<T>> {
  try {
    const query = listQuery(params);
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') search.set(key, String(value));
    }
    const qs = search.toString();
    const envelope = await apiRequest<ApiSuccessEnvelope<T[]>>(`${path}${qs ? `?${qs}` : ''}`, {
      method: 'GET',
      scope: params.scope ?? GLOBAL_ADMIN_SCOPE,
      signal: params.signal,
    });
    return {
      items: Array.isArray(envelope.data) ? envelope.data : [],
      pagination: paginationFromMeta(envelope.meta as JsonObject | undefined),
      correlationId: envelope.correlation_id,
    };
  } catch (error) {
    throw toOpsError(error, 'Unable to load admin operations records.');
  }
}

async function opsMutate<T>(
  path: string,
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  body?: JsonObject,
  options: { scope?: AdminScope; idempotencyKey?: string; signal?: AbortSignal } = {},
): Promise<T> {
  try {
    const headers: Record<string, string> = {};
    if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;
    const envelope = await apiRequest<ApiSuccessEnvelope<T>>(path, {
      method,
      scope: options.scope ?? GLOBAL_ADMIN_SCOPE,
      signal: options.signal,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return envelope.data;
  } catch (error) {
    throw toOpsError(error, 'Admin operations mutation failed.');
  }
}

export function listChurches(params: ListQuery = {}): Promise<OpsListResult<ChurchRecord>> {
  return opsGetList<ChurchRecord>('admin/church/churches', params);
}

export function createChurch(input: CreateChurchInput, scope?: AdminScope): Promise<ChurchRecord> {
  return opsMutate<ChurchRecord>('admin/church/churches', 'POST', input as unknown as JsonObject, { scope });
}

export function listHomeChurches(params: ListQuery = {}): Promise<OpsListResult<HomeChurchRecord>> {
  return opsGetList<HomeChurchRecord>('admin/church/home-churches', params);
}

export function listHomeChurchApplications(
  params: ListQuery = {},
): Promise<OpsListResult<HomeChurchApplicationRecord>> {
  return opsGetList<HomeChurchApplicationRecord>('admin/church/home-church-applications', params);
}

export function transitionHomeChurchApplication(
  applicationId: string,
  input: TransitionApplicationInput,
  scope?: AdminScope,
): Promise<HomeChurchApplicationRecord> {
  return opsMutate<HomeChurchApplicationRecord>(
    `admin/church/home-church-applications/${encodeURIComponent(applicationId)}/transitions`,
    'POST',
    input as unknown as JsonObject,
    { scope },
  );
}

export function listFirstTimers(params: ListQuery = {}): Promise<OpsListResult<FirstTimerRecord>> {
  return opsGetList<FirstTimerRecord>('admin/church/first-timers', params);
}

export function registerFirstTimer(
  input: RegisterFirstTimerInput,
  scope?: AdminScope,
): Promise<FirstTimerRecord> {
  return opsMutate<FirstTimerRecord>('admin/church/first-timers', 'POST', input as unknown as JsonObject, {
    scope,
  });
}

export function listFollowUpTasks(params: ListQuery = {}): Promise<OpsListResult<FollowUpTaskRecord>> {
  return opsGetList<FollowUpTaskRecord>('admin/church/follow-up-tasks', params);
}

export function completeFollowUpTask(
  taskId: string,
  reasonCode: string,
  scope?: AdminScope,
): Promise<FollowUpTaskRecord> {
  return opsMutate<FollowUpTaskRecord>(
    `admin/church/follow-up-tasks/${encodeURIComponent(taskId)}/completion`,
    'POST',
    { reason_code: reasonCode },
    { scope },
  );
}

export function listCrusades(params: ListQuery = {}): Promise<OpsListResult<CrusadeRecord>> {
  return opsGetList<CrusadeRecord>('admin/mission/crusades', params);
}

export function listSouls(params: ListQuery = {}): Promise<OpsListResult<SoulRecord>> {
  return opsGetList<SoulRecord>('admin/mission/souls', params);
}

export function listMissionInvitations(
  params: ListQuery = {},
): Promise<OpsListResult<MissionInvitationRecord>> {
  return opsGetList<MissionInvitationRecord>('admin/mission/invitations', params);
}

export function captureSoul(
  crusadeId: string,
  input: CaptureSoulInput,
  options: { scope?: AdminScope; idempotencyKey?: string } = {},
): Promise<SoulRecord> {
  const idempotencyKey =
    options.idempotencyKey ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `capture-soul-${crypto.randomUUID()}`
      : `capture-soul-${Date.now()}`);
  return opsMutate<SoulRecord>(
    `admin/mission/crusades/${encodeURIComponent(crusadeId)}/souls`,
    'POST',
    input as unknown as JsonObject,
    { scope: options.scope, idempotencyKey },
  );
}

export function assignSoulMentor(
  soulId: string,
  input: AssignMentorInput,
  options: { scope?: AdminScope; idempotencyKey?: string } = {},
): Promise<MentorAssignmentRecord> {
  const idempotencyKey =
    options.idempotencyKey ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `assign-mentor-${crypto.randomUUID()}`
      : `assign-mentor-${Date.now()}`);
  return opsMutate<MentorAssignmentRecord>(
    `admin/mission/souls/${encodeURIComponent(soulId)}/mentor-assignment`,
    'POST',
    input as unknown as JsonObject,
    { scope: options.scope, idempotencyKey },
  );
}

export function recordSoulFollowUp(
  soulId: string,
  input: RecordMissionFollowUpInput,
  options: { scope?: AdminScope; idempotencyKey?: string } = {},
): Promise<FollowUpInteractionRecord> {
  const idempotencyKey =
    options.idempotencyKey ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `follow-up-${crypto.randomUUID()}`
      : `follow-up-${Date.now()}`);
  return opsMutate<FollowUpInteractionRecord>(
    `admin/mission/souls/${encodeURIComponent(soulId)}/follow-ups`,
    'POST',
    input as unknown as JsonObject,
    { scope: options.scope, idempotencyKey },
  );
}

export function completeSoulFollowUp(
  soulId: string,
  reasonCode: string,
  scope?: AdminScope,
): Promise<SoulRecord> {
  return opsMutate<SoulRecord>(
    `admin/mission/souls/${encodeURIComponent(soulId)}/follow-up-completion`,
    'POST',
    { reason_code: reasonCode },
    { scope },
  );
}

export type OpsDatasetKey =
  | 'churches'
  | 'home-churches'
  | 'home-church-applications'
  | 'first-timers'
  | 'follow-up-tasks'
  | 'crusades'
  | 'souls'
  | 'invitations';

/** Map admin screen routes/ids to church/mission list endpoints (no invented paths). */
export function resolveOpsDataset(screen: {
  id: string;
  route: string;
  batch?: string;
  nav?: string;
}): OpsDatasetKey | null {
  const { id, route, nav } = screen;
  if (id === 'E-02' || route === '/admin/churches') return 'churches';
  if (id === 'D-07' || route === '/admin/home-churches') return 'home-churches';
  if (id === 'D-02' || route.startsWith('/admin/home-churches/applications')) {
    if (route === '/admin/home-churches/applications' || id === 'D-02') return 'home-church-applications';
  }
  if (
    id === 'E-07' ||
    id === 'F-02' ||
    route.includes('/first-timers') ||
    nav === 'first-timers'
  ) {
    if (route.endsWith('/first-timers') || id === 'E-07' || id === 'F-02') return 'first-timers';
  }
  if (id === 'F-04' || route === '/admin/people/follow-up') return 'follow-up-tasks';
  if (id === 'I-02' || route === '/admin/mission/crusades') return 'crusades';
  if (id === 'I-10' || id === 'I-13' || route === '/admin/mission/souls' || route === '/admin/mission/mentor-assignments') {
    return 'souls';
  }
  if (id === 'I-05' || /\/invitations\/?$/.test(route)) return 'invitations';
  return null;
}

export async function loadOpsDataset(
  key: OpsDatasetKey,
  params: ListQuery = {},
): Promise<OpsListResult<Record<string, unknown>>> {
  switch (key) {
    case 'churches':
      return listChurches(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'home-churches':
      return listHomeChurches(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'home-church-applications':
      return listHomeChurchApplications(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'first-timers':
      return listFirstTimers(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'follow-up-tasks':
      return listFollowUpTasks(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'crusades':
      return listCrusades(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'souls':
      return listSouls(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'invitations':
      return listMissionInvitations(params) as Promise<OpsListResult<Record<string, unknown>>>;
    default:
      return { items: [], pagination: { current_page: 1, per_page: 25, last_page: 1, total: 0 } };
  }
}

function shortDate(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

/** Project API records onto existing admin table column labels. */
export function opsRecordsToRows(
  key: OpsDatasetKey,
  items: Record<string, unknown>[],
  columns: string[],
): Array<Record<string, string>> {
  return items.map((item) => {
    const mapped: Record<string, string> = {};
    const get = (field: string) => {
      const value = item[field];
      if (value === null || value === undefined || value === '') return '—';
      return String(value);
    };

    for (const column of columns) {
      switch (key) {
        case 'churches':
          mapped[column] =
            column === 'Church Name'
              ? get('name')
              : column === 'Location'
                ? get('location_id')
                : column === 'Region'
                  ? get('administrative_unit_id')
                  : column === 'Members'
                    ? '—'
                    : column === 'Status'
                      ? item.published_at
                        ? 'Active'
                        : 'Draft'
                      : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'home-churches':
          mapped[column] =
            column === 'Home Church'
              ? get('name')
              : column === 'Leader'
                ? get('leader_person_id')
                : column === 'Location'
                  ? get('church_id')
                  : column === 'Members'
                    ? '—'
                    : column === 'Status'
                      ? get('status')
                      : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'home-church-applications':
          mapped[column] =
            column === 'Applicant Name'
              ? get('proposed_name')
              : column === 'Location'
                ? get('church_id')
                : column === 'Submitted On'
                  ? shortDate(get('status_changed_at') === '—' ? null : get('status_changed_at'))
                  : column === 'Status'
                    ? get('status')
                    : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'first-timers':
          mapped[column] =
            column === 'Name'
              ? get('person_id')
              : column === 'Phone' || column === 'Email'
                ? '—'
                : column === 'Church'
                  ? get('church_id')
                  : column === 'Visit Date' || column === 'First Visit'
                    ? shortDate(get('registered_at') === '—' ? null : get('registered_at'))
                    : column === 'Follow Up'
                      ? item.contacted_at
                        ? 'Yes'
                        : 'No'
                      : column === 'Status'
                        ? item.contacted_at
                          ? 'Contacted'
                          : 'New'
                        : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'follow-up-tasks':
          mapped[column] =
            column === 'Name'
              ? get('first_timer_id')
              : column === 'Last Contact'
                ? '—'
                : column === 'Next Follow-up'
                  ? shortDate(get('due_at') === '—' ? null : get('due_at'))
                  : column === 'Owner'
                    ? get('assigned_to_person_id')
                    : column === 'Status'
                      ? get('status')
                      : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'crusades':
          mapped[column] =
            column === 'Crusade Name' || column === 'Name'
              ? get('name')
              : column === 'Location'
                ? get('location_id')
                : column === 'Start Date' || column === 'Starts'
                  ? shortDate(get('starts_at') === '—' ? null : get('starts_at'))
                  : column === 'End Date' || column === 'Ends'
                    ? shortDate(get('ends_at') === '—' ? null : get('ends_at'))
                    : column === 'Status'
                      ? item.published_at
                        ? 'Published'
                        : 'Draft'
                      : column === 'Souls'
                        ? '—'
                        : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'souls':
          mapped[column] =
            column === 'Name' || column === 'Soul'
              ? get('person_id')
              : column === 'Crusade'
                ? get('crusade_id')
                : column === 'Mentor'
                  ? get('mentor_assignment_id')
                  : column === 'Status'
                    ? get('status')
                    : column === 'Captured' || column === 'Date'
                      ? shortDate(get('captured_at') === '—' ? null : get('captured_at'))
                      : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'invitations':
          mapped[column] =
            column === 'Invitee'
              ? get('requester_person_id')
              : column === 'Location'
                ? get('requested_location_id')
                : column === 'Invited By'
                  ? get('crusade_id')
                  : column === 'Date'
                    ? shortDate(get('created_at') === '—' ? null : get('created_at'))
                    : column === 'Status'
                      ? get('status')
                      : get(column.toLowerCase().replaceAll(' ', '_'));
          break;
        default:
          mapped[column] = '—';
      }
    }

    mapped.__id = get('id');
    return mapped;
  });
}
