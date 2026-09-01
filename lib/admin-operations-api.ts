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
  filter?: Record<string, string | undefined>;
};

export type ChurchRecord = {
  id: string;
  name: string;
  location_id?: string | null;
  location_name?: string | null;
  country_id?: string | null;
  country_name?: string | null;
  address_line_one?: string | null;
  address_line_two?: string | null;
  locality?: string | null;
  postal_code?: string | null;
  timezone?: string | null;
  administrative_unit_id?: string | null;
  administrative_unit_name?: string | null;
  published_at?: string | null;
  created_at?: string | null;
  status?: string | null;
  home_churches_count?: number;
  memberships_count?: number;
  first_timers_count?: number;
  applications_count?: number;
};

export type HomeChurchRecord = {
  id: string;
  church_id?: string | null;
  church_name?: string | null;
  leader_person_id?: string | null;
  leader_name?: string | null;
  location_id?: string | null;
  location_name?: string | null;
  administrative_unit_id?: string | null;
  administrative_unit_name?: string | null;
  name: string;
  status: string;
  members_count?: number;
  created_at?: string | null;
};

export type HomeChurchApplicationAction = { status: string; label: string; tone: string };

export type HomeChurchApplicationRecord = {
  id: string;
  church_id?: string | null;
  church_name?: string | null;
  home_church_id?: string | null;
  applicant_person_id?: string | null;
  applicant_name?: string | null;
  proposed_name: string;
  expected_participants?: number;
  meeting_day?: string;
  meeting_time?: string;
  status: string;
  status_changed_at?: string | null;
  location_name?: string | null;
  administrative_unit_name?: string | null;
  allowed_actions?: HomeChurchApplicationAction[];
  history?: Array<{
    id: string;
    from_status: string;
    to_status: string;
    reason_code: string;
    notes?: string | null;
    occurred_at?: string | null;
  }>;
};

export type FirstTimerRecord = {
  id: string;
  person_id?: string | null;
  person_name?: string | null;
  person_email?: string | null;
  church_id?: string | null;
  church_name?: string | null;
  home_church_id?: string | null;
  home_church_name?: string | null;
  registered_at?: string | null;
  contacted_at?: string | null;
};

export type MembershipRecord = {
  id: string;
  person_id?: string | null;
  person_name?: string | null;
  church_id?: string | null;
  church_name?: string | null;
  home_church_id?: string | null;
  home_church_name?: string | null;
  status: string;
  joined_at?: string | null;
  ended_at?: string | null;
};

export type FollowUpTaskRecord = {
  id: string;
  first_timer_id?: string | null;
  person_name?: string | null;
  assigned_to_person_id?: string | null;
  assigned_to_name?: string | null;
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
  location_name?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  published_at?: string | null;
  status?: string | null;
  souls_count?: number;
};

export type SoulRecord = {
  id: string;
  crusade_id?: string | null;
  crusade_name?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  connected_church_id?: string | null;
  connected_church_name?: string | null;
  status: string;
  mentor_assignment_id?: string | null;
  captured_at?: string | null;
  last_follow_up_at?: string | null;
  follow_up_completed_at?: string | null;
};

export type MissionInvitationRecord = {
  id: string;
  crusade_id?: string | null;
  crusade_name?: string | null;
  requester_person_id?: string | null;
  requester_name?: string | null;
  requested_location_id?: string | null;
  requested_location_name?: string | null;
  status: string;
  created_at?: string | null;
  status_changed_at?: string | null;
};

export type PrayerRequestRecord = {
  id: string;
  person_id?: string | null;
  person_name?: string | null;
  person_email?: string | null;
  assigned_to_person_id?: string | null;
  assigned_to_name?: string | null;
  assigned_at?: string | null;
  subject: string;
  body: string;
  status: string;
  created_at?: string | null;
};

export type PastoralNeedRecord = {
  id: string;
  person_id?: string | null;
  person_name?: string | null;
  category: string;
  summary: string;
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

export type CreateHomeChurchInput = {
  church_id: string;
  leader_person_id: string;
  location_id: string;
  administrative_unit_id: string;
  name: string;
};

export type TeamAssignmentRecord = {
  id: string;
  crusade_id?: string | null;
  crusade_name?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  role_code?: string | null;
  assigned_at?: string | null;
  ended_at?: string | null;
  status?: string | null;
};

export type TransitionApplicationInput = {
  status: string;
  reason_code: string;
  notes?: string | null;
  expected_status?: string | null;
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
  // Fixture/UI labels like "country:nigeria" are not API scope keys — only ULIDs (or global).
  if (type && id && (type === 'global' || /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(id))) {
    return { type, id };
  }
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
    const looksLikeNetwork =
      error.message === 'Failed to fetch' ||
      error.message === 'Load failed' ||
      error.message.toLowerCase().includes('network');
    return new AdminOperationsApiError(
      503,
      error.message || fallback,
      looksLikeNetwork ? 'NETWORK_ERROR' : 'CLIENT_ERROR',
    );
  }
  return new AdminOperationsApiError(503, fallback, 'UNKNOWN');
}

export function operationsErrorMessage(error: unknown, fallback: string): string {
  const ops = toOpsError(error, fallback);
  if (ops.status === 404 || ops.code === 'RESOURCE_NOT_FOUND') {
    return (
      'Church create failed: the country, administrative unit, or location is outside your admin scope, ' +
      'or was not found. Select a unit that belongs to the chosen country, switch Scope to Global if you have access, then try again.' +
      (ops.code ? ` (${ops.code})` : '')
    );
  }
  return ops.code ? `${ops.message} (${ops.code})` : ops.message;
}

function listQuery(params: ListQuery = {}): Record<string, string | number | undefined> {
  const query: Record<string, string | number | undefined> = {
    'filter[search]': params.search,
    'filter[status]': params.status ?? params.filter?.status,
    page: params.page,
    per_page: params.perPage ?? 25,
  };
  if (params.filter) {
    for (const [key, value] of Object.entries(params.filter)) {
      if (key !== 'status' && value) {
        query[`filter[${key}]`] = value;
      }
    }
  }
  return query;
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

export async function getChurch(churchId: string, scope?: AdminScope, signal?: AbortSignal): Promise<ChurchRecord> {
  try {
    const envelope = await apiRequest<ApiSuccessEnvelope<ChurchRecord>>(
      `admin/church/churches/${encodeURIComponent(churchId)}`,
      { method: 'GET', scope: scope ?? GLOBAL_ADMIN_SCOPE, signal },
    );
    return envelope.data;
  } catch (error) {
    throw toOpsError(error, 'Unable to load church.');
  }
}

export function createChurch(input: CreateChurchInput, scope?: AdminScope): Promise<ChurchRecord> {
  return opsMutate<ChurchRecord>('admin/church/churches', 'POST', input as unknown as JsonObject, { scope });
}

export function updateChurch(
  churchId: string,
  input: CreateChurchInput,
  scope?: AdminScope,
): Promise<ChurchRecord> {
  return opsMutate<ChurchRecord>(
    `admin/church/churches/${encodeURIComponent(churchId)}`,
    'PUT',
    input as unknown as JsonObject,
    { scope },
  );
}

export function updateChurchStatus(
  churchId: string,
  input: { status: string; reason: string },
  scope?: AdminScope,
): Promise<ChurchRecord> {
  return opsMutate<ChurchRecord>(
    `admin/church/churches/${encodeURIComponent(churchId)}/status`,
    'POST',
    input as unknown as JsonObject,
    { scope },
  );
}

export function deleteChurch(churchId: string, scope?: AdminScope): Promise<{ id: string; deleted: boolean }> {
  return opsMutate<{ id: string; deleted: boolean }>(
    `admin/church/churches/${encodeURIComponent(churchId)}`,
    'DELETE',
    undefined,
    { scope },
  );
}

export function listHomeChurches(params: ListQuery = {}): Promise<OpsListResult<HomeChurchRecord>> {
  return opsGetList<HomeChurchRecord>('admin/church/home-churches', params);
}

export function createHomeChurch(input: CreateHomeChurchInput, scope?: AdminScope): Promise<HomeChurchRecord> {
  return opsMutate<HomeChurchRecord>('admin/church/home-churches', 'POST', input as unknown as JsonObject, { scope });
}

export async function getHomeChurch(homeChurchId: string, scope?: AdminScope, signal?: AbortSignal): Promise<HomeChurchRecord> {
  try {
    const envelope = await apiRequest<ApiSuccessEnvelope<HomeChurchRecord>>(
      `admin/church/home-churches/${encodeURIComponent(homeChurchId)}`,
      { method: 'GET', scope: scope ?? GLOBAL_ADMIN_SCOPE, signal },
    );
    return envelope.data;
  } catch (error) {
    throw toOpsError(error, 'Unable to load home church.');
  }
}

export function updateHomeChurch(
  homeChurchId: string,
  input: { name: string; leader_person_id: string },
  scope?: AdminScope,
): Promise<HomeChurchRecord> {
  return opsMutate<HomeChurchRecord>(
    `admin/church/home-churches/${encodeURIComponent(homeChurchId)}`,
    'PUT',
    input as unknown as JsonObject,
    { scope },
  );
}

export function updateHomeChurchStatus(
  homeChurchId: string,
  input: { status: string; reason: string },
  scope?: AdminScope,
): Promise<HomeChurchRecord> {
  return opsMutate<HomeChurchRecord>(
    `admin/church/home-churches/${encodeURIComponent(homeChurchId)}/status`,
    'POST',
    input as unknown as JsonObject,
    { scope },
  );
}

export function listHomeChurchApplications(
  params: ListQuery = {},
): Promise<OpsListResult<HomeChurchApplicationRecord>> {
  return opsGetList<HomeChurchApplicationRecord>('admin/church/home-church-applications', params);
}

export async function getHomeChurchApplication(
  applicationId: string,
  scope?: AdminScope,
  signal?: AbortSignal,
): Promise<HomeChurchApplicationRecord> {
  try {
    const envelope = await apiRequest<ApiSuccessEnvelope<HomeChurchApplicationRecord>>(
      `admin/church/home-church-applications/${encodeURIComponent(applicationId)}`,
      { method: 'GET', scope: scope ?? GLOBAL_ADMIN_SCOPE, signal },
    );
    return envelope.data;
  } catch (error) {
    throw toOpsError(error, 'Unable to load home church application.');
  }
}

export function createHomeChurchApplication(input: JsonObject, scope?: AdminScope): Promise<HomeChurchApplicationRecord> {
  return opsMutate<HomeChurchApplicationRecord>(
    'admin/church/home-church-applications',
    'POST',
    input,
    { scope },
  );
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

export function listMemberships(params: ListQuery = {}): Promise<OpsListResult<MembershipRecord>> {
  return opsGetList<MembershipRecord>('admin/church/memberships', params);
}

export function startMembership(
  input: { person_id: string; church_id: string; home_church_id?: string | null; joined_at?: string | null },
  scope?: AdminScope,
): Promise<MembershipRecord> {
  return opsMutate<MembershipRecord>('admin/church/memberships', 'POST', input as unknown as JsonObject, { scope });
}

export function endMembership(membershipId: string, input: JsonObject, scope?: AdminScope): Promise<MembershipRecord> {
  return opsMutate<MembershipRecord>(
    `admin/church/memberships/${encodeURIComponent(membershipId)}/end`,
    'POST',
    input,
    { scope },
  );
}

export type UpsertLivestreamInput = {
  title: string;
  youtube_url: string;
  subtitle?: string;
  host_name?: string;
  status?: 'scheduled' | 'live' | 'ended';
  starts_at?: string;
  church_id?: string;
  viewer_count?: number;
  reaction_count?: number;
};

/** PUT /admin/livestreams/current — publish or update the YouTube live service. */
export function upsertCurrentLivestream(
  input: UpsertLivestreamInput,
  scope?: AdminScope,
): Promise<JsonObject> {
  return opsMutate<JsonObject>('admin/livestreams/current', 'PUT', input as unknown as JsonObject, {
    scope,
  });
}

export function registerFirstTimer(
  input: RegisterFirstTimerInput,
  scope?: AdminScope,
): Promise<FirstTimerRecord> {
  return opsMutate<FirstTimerRecord>('admin/church/first-timers', 'POST', input as unknown as JsonObject, {
    scope,
  });
}

export function updateFirstTimer(
  firstTimerId: string,
  input: RegisterFirstTimerInput,
  scope?: AdminScope,
): Promise<FirstTimerRecord> {
  return opsMutate<FirstTimerRecord>(
    `admin/church/first-timers/${encodeURIComponent(firstTimerId)}`,
    'PUT',
    input as unknown as JsonObject,
    { scope },
  );
}

export function deleteFirstTimer(
  firstTimerId: string,
  scope?: AdminScope,
): Promise<{ id: string; deleted: boolean }> {
  return opsMutate<{ id: string; deleted: boolean }>(
    `admin/church/first-timers/${encodeURIComponent(firstTimerId)}`,
    'DELETE',
    undefined,
    { scope },
  );
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

export function listPrayerRequests(params: ListQuery = {}): Promise<OpsListResult<PrayerRequestRecord>> {
  return opsGetList<PrayerRequestRecord>('admin/church/prayer-requests', params);
}

export function transitionPrayerRequest(
  prayerId: string,
  status: string,
  scope?: AdminScope,
): Promise<PrayerRequestRecord> {
  return opsMutate<PrayerRequestRecord>(
    `admin/church/prayer-requests/${encodeURIComponent(prayerId)}/transitions`,
    'POST',
    { status },
    { scope },
  );
}

export async function assignPrayerRequest(
  prayerId: string,
  input: { assigned_to_person_id: string; note?: string },
  scope?: AdminScope,
): Promise<PrayerRequestRecord> {
  const result = await opsMutate<{ prayer_request: PrayerRequestRecord }>(
    `admin/church/prayer-requests/${encodeURIComponent(prayerId)}/assignments`,
    'POST',
    input,
    { scope },
  );
  return result.prayer_request;
}

export function listPastoralNeeds(params: ListQuery = {}): Promise<OpsListResult<PastoralNeedRecord>> {
  return opsGetList<PastoralNeedRecord>('admin/church/pastoral-needs', params);
}

export function createFollowUpTask(input: JsonObject, scope?: AdminScope): Promise<FollowUpTaskRecord> {
  return opsMutate<FollowUpTaskRecord>('admin/church/follow-up-tasks', 'POST', input, { scope });
}

export function createPrayerRequest(input: JsonObject, scope?: AdminScope): Promise<PrayerRequestRecord> {
  return opsMutate<PrayerRequestRecord>('admin/church/prayer-requests', 'POST', input, { scope });
}

export function createPastoralNeed(input: JsonObject, scope?: AdminScope): Promise<PastoralNeedRecord> {
  return opsMutate<PastoralNeedRecord>('admin/church/pastoral-needs', 'POST', input, { scope });
}

export function listPeopleDirectory(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/people', params);
}

export function getPerson(id: string, scope?: AdminScope): Promise<Record<string, unknown>> {
  return apiRequest<ApiSuccessEnvelope<Record<string, unknown>>>(`admin/church/people/${encodeURIComponent(id)}`, {
    method: 'GET',
    scope: scope ?? GLOBAL_ADMIN_SCOPE,
  }).then((envelope) => envelope.data).catch((error) => {
    throw toOpsError(error, 'Unable to load person.');
  });
}

export function matchPeople(input: JsonObject, scope?: AdminScope): Promise<{ matches: Array<Record<string, unknown>> }> {
  return opsMutate('admin/church/people/matches', 'POST', input, { scope });
}

export function createPerson(input: JsonObject, scope?: AdminScope): Promise<Record<string, unknown>> {
  return opsMutate('admin/church/people', 'POST', input, { scope });
}

export function mergePeople(canonicalId: string, sourcePersonId: string, scope?: AdminScope): Promise<Record<string, unknown>> {
  return opsMutate(`admin/church/people/${encodeURIComponent(canonicalId)}/merge`, 'POST', { source_person_id: sourcePersonId }, { scope });
}

export function archivePerson(id: string, reason: string, scope?: AdminScope): Promise<Record<string, unknown>> {
  return opsMutate(`admin/church/people/${encodeURIComponent(id)}/archive`, 'POST', { reason }, { scope });
}

export function updatePersonPhone(id: string, input: JsonObject, scope?: AdminScope): Promise<Record<string, unknown>> {
  return opsMutate(`admin/church/people/${encodeURIComponent(id)}`, 'PUT', input, { scope });
}

export function getCounsellingCase(id: string, scope?: AdminScope): Promise<Record<string, unknown>> {
  return apiRequest<ApiSuccessEnvelope<Record<string, unknown>>>(`admin/church/counselling-cases/${encodeURIComponent(id)}`, {
    method: 'GET',
    scope: scope ?? GLOBAL_ADMIN_SCOPE,
  }).then((envelope) => envelope.data).catch((error) => {
    throw toOpsError(error, 'Unable to load counselling case.');
  });
}

export function listConverts(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/converts', params);
}

export function listEvangelismActivities(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/evangelism-activities', params);
}

export function listDepartments(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/departments', params);
}

export function listWorkers(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/workers', params);
}

export function listLeaders(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/leaders', params);
}

export function listDisciples(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/disciples', params);
}

export function listCounsellingCases(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/counselling-cases', params);
}

export function listTestimonies(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/testimonies', params);
}

export function listAttendance(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/attendance', params);
}

export function listChurchGroups(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/groups', params);
}

export function listAnnouncements(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/church/announcements', params);
}

export function listSafeguardingIncidents(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/safeguarding/incidents', params);
}

export function createConvert(input: JsonObject, scope?: AdminScope): Promise<Record<string, unknown>> {
  return opsMutate('admin/church/converts', 'POST', input, { scope });
}

export function updateConvert(id: string, input: JsonObject, scope?: AdminScope): Promise<Record<string, unknown>> {
  return opsMutate(`admin/church/converts/${encodeURIComponent(id)}`, 'PUT', input, { scope });
}

export function deleteConvert(id: string, scope?: AdminScope): Promise<{ id: string; deleted: boolean }> {
  return opsMutate(`admin/church/converts/${encodeURIComponent(id)}`, 'DELETE', undefined, { scope });
}

export function mutateMinistryRecord(
  path: string,
  method: 'POST' | 'PUT' | 'DELETE',
  input?: JsonObject,
  scope?: AdminScope,
): Promise<Record<string, unknown>> {
  return opsMutate(path, method, input, { scope });
}

export function transitionPastoralNeed(
  needId: string,
  status: string,
  scope?: AdminScope,
): Promise<PastoralNeedRecord> {
  return opsMutate<PastoralNeedRecord>(
    `admin/church/pastoral-needs/${encodeURIComponent(needId)}/transitions`,
    'POST',
    { status },
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

export function listTeamAssignments(params: ListQuery = {}): Promise<OpsListResult<TeamAssignmentRecord>> {
  return opsGetList<TeamAssignmentRecord>('admin/mission/team-assignments', params);
}

export function listMissionPartners(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/mission/partners', params);
}

export function listMissionSupportRequests(params: ListQuery = {}): Promise<OpsListResult<Record<string, unknown>>> {
  return opsGetList('admin/mission/support-requests', params);
}

export async function fetchFollowUpGaps(scope?: AdminScope): Promise<Record<string, number>> {
  try {
    const envelope = await apiRequest<ApiSuccessEnvelope<Record<string, number>>>('admin/mission/follow-up/gaps', {
      method: 'GET',
      scope: scope ?? GLOBAL_ADMIN_SCOPE,
    });
    return envelope.data;
  } catch (error) {
    throw toOpsError(error, 'Unable to load follow-up gaps.');
  }
}

export function createCrusade(input: JsonObject, scope?: AdminScope): Promise<CrusadeRecord> {
  return opsMutate<CrusadeRecord>('admin/mission/crusades', 'POST', input, { scope });
}

export function transitionMissionInvitation(
  invitationId: string,
  status: string,
  reasonCode?: string | null,
  scope?: AdminScope,
): Promise<MissionInvitationRecord> {
  return opsMutate<MissionInvitationRecord>(
    `admin/mission/invitations/${encodeURIComponent(invitationId)}/transitions`,
    'POST',
    { status, reason_code: reasonCode ?? null },
    { scope },
  );
}

export function requestMissionAdvisory(
  instruction: string,
  context: JsonObject = {},
  scope?: AdminScope,
): Promise<Record<string, unknown>> {
  return opsMutate('admin/platform/advisory/requests', 'POST', {
    assistant: 'mission',
    use_case: 'follow_up_gap_detection',
    instruction,
    context,
  }, { scope });
}

export function createTeamAssignment(
  input: { crusade_id: string; person_id: string; role_code: string; assigned_at?: string | null },
  scope?: AdminScope,
): Promise<TeamAssignmentRecord> {
  return opsMutate<TeamAssignmentRecord>('admin/mission/team-assignments', 'POST', input as unknown as JsonObject, {
    scope,
  });
}

export function endTeamAssignment(assignmentId: string, scope?: AdminScope): Promise<TeamAssignmentRecord> {
  return opsMutate<TeamAssignmentRecord>(
    `admin/mission/team-assignments/${encodeURIComponent(assignmentId)}/end`,
    'POST',
    {},
    { scope },
  );
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
  | 'memberships'
  | 'first-timers'
  | 'follow-up-tasks'
  | 'crusades'
  | 'souls'
  | 'invitations'
  | 'team-assignments'
  | 'mission-partners'
  | 'mission-support-requests'
  | 'prayer-requests'
  | 'pastoral-needs'
  | 'people'
  | 'converts'
  | 'evangelism-activities'
  | 'departments'
  | 'workers'
  | 'leaders'
  | 'disciples'
  | 'counselling-cases'
  | 'testimonies'
  | 'attendance'
  | 'groups'
  | 'announcements'
  | 'safeguarding-incidents';

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
  if (route.includes('/small-groups')) return 'groups';
  if (route.includes('/members') && !route.includes('/membership')) return 'memberships';
  if (route.includes('/disciples') || route.includes('/discipleship')) return 'disciples';
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
  if (id === 'I-08' || (route.includes('/teams') && !route.match(/\/teams\/[^/]+$/))) return 'team-assignments';
  if (id === 'I-10' || id === 'I-13' || route === '/admin/mission/souls' || route === '/admin/mission/mentor-assignments') {
    return 'souls';
  }
  if (id === 'I-16' || route === '/admin/mission/partners') return 'mission-partners';
  if (id === 'I-18' || route.includes('/support-requests')) return 'mission-support-requests';
  if (route.includes('/invitations')) return 'invitations';
  if (id === 'F-10' || route === '/admin/people/prayer-requests') return 'prayer-requests';
  if (id === 'F-11' || route === '/admin/people/needs') return 'pastoral-needs';
  if (route === '/admin/people' || id === 'F-01') return 'people';
  if (route.includes('/converts') || nav === 'converts') return 'converts';
  if (route.includes('/evangelism')) return 'evangelism-activities';
  if (route.includes('/departments')) return 'departments';
  if (route.includes('/workers') || nav === 'workers') return 'workers';
  if (route.includes('/leadership') || nav === 'leaders' || route.endsWith('/leaders')) return 'leaders';
  if (route.includes('/counselling')) return 'counselling-cases';
  if (route === '/admin/security/pastoral-records') return 'counselling-cases';
  if (route.includes('/testimonies')) return 'testimonies';
  if (route.includes('/attendance')) return 'attendance';
  if (route.includes('/activities')) return 'announcements';
  if (route.includes('/safeguarding/cases') || route === '/admin/security/safeguarding') return 'safeguarding-incidents';
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
    case 'memberships':
      return listMemberships(params) as Promise<OpsListResult<Record<string, unknown>>>;
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
    case 'team-assignments':
      return listTeamAssignments(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'mission-partners':
      return listMissionPartners(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'mission-support-requests':
      return listMissionSupportRequests(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'prayer-requests':
      return listPrayerRequests(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'pastoral-needs':
      return listPastoralNeeds(params) as Promise<OpsListResult<Record<string, unknown>>>;
    case 'people':
      return listPeopleDirectory(params);
    case 'converts':
      return listConverts(params);
    case 'evangelism-activities':
      return listEvangelismActivities(params);
    case 'departments':
      return listDepartments(params);
    case 'workers':
      return listWorkers(params);
    case 'leaders':
      return listLeaders(params);
    case 'disciples':
      return listDisciples(params);
    case 'counselling-cases':
      return listCounsellingCases(params);
    case 'testimonies':
      return listTestimonies(params);
    case 'attendance':
      return listAttendance(params);
    case 'groups':
      return listChurchGroups(params);
    case 'announcements':
      return listAnnouncements(params);
    case 'safeguarding-incidents':
      return listSafeguardingIncidents(params);
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

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

function humanValue(item: Record<string, unknown>, ...fields: string[]): string {
  for (const field of fields) {
    const value = item[field];
    if (value === null || value === undefined || value === '') continue;
    const text = String(value).trim();
    if (!text || ULID_PATTERN.test(text)) continue;
    return text;
  }
  return '—';
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
              ? humanValue(item, 'name')
              : column === 'Location'
                ? humanValue(item, 'location_name')
                : column === 'Region'
                  ? humanValue(item, 'administrative_unit_name')
                  : column === 'Members'
                    ? '—'
                    : column === 'Status'
                      ? item.published_at
                        ? 'Active'
                        : 'Unpublished'
                      : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'home-churches':
          mapped[column] =
            column === 'Home Church'
              ? humanValue(item, 'name')
              : column === 'Leader'
                ? humanValue(item, 'leader_name')
                : column === 'Location'
                  ? humanValue(item, 'church_name')
                  : column === 'Members'
                    ? '—'
                    : column === 'Status'
                      ? get('status')
                      : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'home-church-applications':
          mapped[column] =
            column === 'Applicant Name'
              ? humanValue(item, 'applicant_name', 'proposed_name')
              : column === 'Location'
                ? humanValue(item, 'church_name', 'proposed_name')
                : column === 'Submitted On'
                  ? shortDate(get('status_changed_at') === '—' ? null : get('status_changed_at'))
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'first-timers':
          mapped[column] =
            column === 'Name'
              ? humanValue(item, 'person_name')
              : column === 'Phone'
                ? humanValue(item, 'person_phone', 'phone')
              : column === 'Email'
                  ? humanValue(item, 'person_email')
                : column === 'Church'
                  ? humanValue(item, 'church_name', 'home_church_name')
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
                        : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'memberships':
          mapped[column] =
            column === 'Name'
              ? humanValue(item, 'person_name')
              : column === 'Member ID'
                ? humanValue(item, 'id')
                : column === 'Department' || column === 'Group'
                  ? humanValue(item, 'home_church_name')
                  : column === 'Joined Date' || column === 'Joined On'
                    ? shortDate(get('joined_at') === '—' ? null : get('joined_at'))
                    : column === 'Phone'
                      ? '—'
                      : column === 'Status'
                        ? get('status')
                        : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'follow-up-tasks':
          mapped[column] =
            column === 'Name'
              ? humanValue(item, 'person_name')
              : column === 'Discipleship Group' || column === 'Church'
                ? humanValue(item, 'church_name')
                : column === 'Mentor' || column === 'Owner'
                  ? humanValue(item, 'assigned_to_name')
                  : column === 'Stage'
                    ? humanValue(item, 'type')
                    : column === 'Last Contact'
                      ? '—'
                      : column === 'Next Follow-up'
                        ? shortDate(get('due_at') === '—' ? null : get('due_at'))
                        : column === 'Status'
                          ? get('status')
                          : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'crusades':
          mapped[column] =
            column === 'Crusade Name' || column === 'Name'
              ? humanValue(item, 'name')
              : column === 'Location'
                ? humanValue(item, 'location_name')
                : column === 'Start Date' || column === 'Starts'
                  ? shortDate(get('starts_at') === '—' ? null : get('starts_at'))
                  : column === 'End Date' || column === 'Ends'
                    ? shortDate(get('ends_at') === '—' ? null : get('ends_at'))
                    : column === 'Status'
                      ? get('status') === '—'
                        ? item.published_at
                          ? 'Published'
                          : 'Draft'
                        : get('status')
                      : column === 'Souls'
                        ? get('souls_count')
                        : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'souls':
          mapped[column] =
            column === 'Name' || column === 'Soul'
              ? humanValue(item, 'person_name')
              : column === 'Crusade'
                ? humanValue(item, 'crusade_name')
                : column === 'Mentor'
                  ? '—'
                  : column === 'Status'
                    ? get('status')
                    : column === 'Date Won' || column === 'Captured' || column === 'Date'
                      ? shortDate(
                          (column === 'Date Won' ? get('converted_at') : get('captured_at')) === '—'
                            ? null
                            : column === 'Date Won'
                              ? get('converted_at')
                              : get('captured_at'),
                        )
                      : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'invitations':
          mapped[column] =
            column === 'Invitee'
              ? humanValue(item, 'requester_name')
              : column === 'Location'
                ? humanValue(item, 'requested_location_name')
                : column === 'Invited By'
                  ? humanValue(item, 'crusade_name')
                  : column === 'Date'
                    ? shortDate(get('created_at') === '—' ? null : get('created_at'))
                    : column === 'Status'
                      ? get('status')
                      : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'team-assignments':
          mapped[column] =
            column === 'Team' || column === 'Role'
              ? humanValue(item, 'role_code', 'name')
              : column === 'Leader' || column === 'Member'
                ? humanValue(item, 'person_name')
                : column === 'Members'
                  ? '—'
                  : column === 'Size'
                    ? '—'
                    : column === 'Crusade'
                      ? humanValue(item, 'crusade_name')
                      : column === 'Status'
                        ? get('status')
                        : column === 'Assigned'
                          ? shortDate(get('assigned_at') === '—' ? null : get('assigned_at'))
                          : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'prayer-requests':
          mapped[column] =
            column === 'Request' || column === 'Name'
              ? humanValue(item, 'subject')
              : column === 'Requested By'
                ? humanValue(item, 'person_name')
                : column === 'Date'
                  ? shortDate(get('created_at') === '—' ? null : get('created_at'))
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'pastoral-needs':
          mapped[column] =
            column === 'Request' || column === 'Name'
              ? humanValue(item, 'summary', 'category')
              : column === 'Requested By'
                ? humanValue(item, 'person_name')
                : column === 'Date'
                  ? shortDate(get('created_at') === '—' ? null : get('created_at'))
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'people':
          mapped[column] =
            column === 'Name' || column === 'User'
              ? humanValue(item, 'name', 'person_name')
              : column === 'ID'
                ? humanValue(item, 'id')
                : column === 'Type'
                  ? humanValue(item, 'type')
                  : column === 'Church'
                    ? humanValue(item, 'church_name')
                    : column === 'Phone'
                      ? humanValue(item, 'phone', 'person_phone')
                      : column === 'Email'
                        ? humanValue(item, 'email', 'person_email')
                        : column === 'Last Contact'
                          ? shortDate(get('last_contact') === '—' ? null : get('last_contact'))
                          : column === 'Status'
                            ? get('status')
                            : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'converts':
          mapped[column] =
            column === 'Name'
              ? humanValue(item, 'person_name')
              : column === 'Phone'
                ? humanValue(item, 'person_phone')
                : column === 'Church'
                  ? humanValue(item, 'church_name')
                  : column === 'Converted On' || column === 'Date'
                    ? shortDate(get('converted_at') === '—' ? null : get('converted_at'))
                    : column === 'Baptized'
                      ? item.baptized_at
                        ? 'Yes'
                        : 'No'
                      : column === 'Status'
                        ? get('status')
                        : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'evangelism-activities':
          mapped[column] =
            column === 'Name' || column === 'Activity' || column === 'Title'
              ? humanValue(item, 'title', 'name')
              : column === 'Church'
                ? humanValue(item, 'church_name')
                : column === 'Date'
                  ? shortDate(get('occurred_at') === '—' ? null : get('occurred_at'))
                  : column === 'Souls' || column === 'Reached'
                    ? get('souls_reached')
                    : column === 'Decisions'
                      ? get('decisions')
                      : column === 'Status'
                        ? get('status')
                        : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'departments':
        case 'groups':
          mapped[column] =
            column === 'Name' || column === 'Department' || column === 'Group'
              ? humanValue(item, 'name')
              : column === 'Leader'
                ? humanValue(item, 'leader_name')
                : column === 'Church'
                  ? humanValue(item, 'church_name')
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'workers':
        case 'leaders':
        case 'disciples':
          mapped[column] =
            column === 'Name' || column === 'Worker' || column === 'Leader' || column === 'Disciple'
              ? humanValue(item, 'person_name', 'title')
              : column === 'Role' || column === 'Title'
                ? humanValue(item, 'title')
                : column === 'Department'
                  ? humanValue(item, 'department_name')
                  : column === 'Church'
                    ? humanValue(item, 'church_name')
                    : column === 'Phone'
                      ? humanValue(item, 'person_phone')
                      : column === 'Status'
                        ? get('status')
                        : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'counselling-cases':
          mapped[column] =
            column === 'Client' || column === 'Name'
              ? humanValue(item, 'person_name')
              : column === 'Counselor'
                ? humanValue(item, 'counselor_name')
                : column === 'Type'
                  ? humanValue(item, 'case_type', 'type')
                  : column === 'Last Updated' || column === 'Date' || column === 'Updated'
                  ? shortDate(get('updated_at') === '—' ? null : get('updated_at'))
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'testimonies':
          mapped[column] =
            column === 'Testimony' || column === 'Title' || column === 'Name'
              ? humanValue(item, 'title', 'name')
              : column === 'By'
                ? humanValue(item, 'person_name')
                : column === 'Date'
                  ? shortDate(get('submitted_at') === '—' ? null : get('submitted_at'))
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'attendance':
          mapped[column] =
            column === 'Home Church' || column === 'Name' || column === 'Church'
              ? humanValue(item, 'home_church_name', 'church_name', 'name')
              : column === 'Date' || column === 'Service Date'
                ? shortDate(get('service_date') === '—' ? null : get('service_date'))
                : column === 'Adults'
                  ? get('adults')
                  : column === 'Children'
                    ? get('children')
                    : column === 'First Timers'
                      ? get('first_timers')
                      : column === 'Total'
                        ? get('total')
                        : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'announcements':
          mapped[column] =
            column === 'Title' || column === 'Name' || column === 'Activity'
              ? humanValue(item, 'title', 'name')
              : column === 'Church'
                ? humanValue(item, 'church_name')
                : column === 'Date'
                  ? shortDate(get('published_at') === '—' ? null : get('published_at'))
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'safeguarding-incidents':
          mapped[column] =
            column === 'Name' || column === 'Concern' || column === 'Type'
              ? humanValue(item, 'concern_type', 'name')
              : column === 'Severity'
                ? get('severity')
                : column === 'Person'
                  ? humanValue(item, 'person_name')
                  : column === 'Date'
                    ? shortDate(get('reported_at') === '—' ? null : get('reported_at'))
                    : column === 'Status'
                      ? get('status')
                      : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'mission-partners':
          mapped[column] =
            column === 'Partner Name' || column === 'Name'
              ? humanValue(item, 'name')
              : column === 'Type'
                ? humanValue(item, 'partner_type')
                : column === 'Location'
                  ? humanValue(item, 'geography')
                  : column === 'Relationship'
                    ? humanValue(item, 'partner_type')
                    : column === 'Status'
                      ? get('status')
                      : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        case 'mission-support-requests':
          mapped[column] =
            column === 'Request' || column === 'Title' || column === 'Name'
              ? humanValue(item, 'title')
              : column === 'Category'
                ? humanValue(item, 'category')
                : column === 'Priority'
                  ? humanValue(item, 'priority')
                  : column === 'Status'
                    ? get('status')
                    : humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
          break;
        default:
          mapped[column] = humanValue(item, column.toLowerCase().replaceAll(' ', '_'));
      }
    }

    mapped.__id = get('id');
    return mapped;
  });
}
