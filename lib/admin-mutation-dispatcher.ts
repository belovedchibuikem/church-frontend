/**
 * Maps admin UI (route, label, payload, record ULID, scope) onto Laravel
 * `/api/v1/admin/*` mutations from `api/routes/api/v1/admin.php`.
 *
 * Catalog wrappers are GET-only (`lib/admin-catalog-api.ts`) and are not used here.
 * Do not invent endpoints that are absent from that route file.
 */
import { ApiError, apiRequestData } from './api-client.ts';
import type { JsonObject, JsonValue } from './api-types.ts';
import {
  AdminIdentityApiError,
  reactivateAdminUser,
  suspendAdminUser,
} from './admin-identity-api.ts';
import {
  createCountry,
  createLevel,
  createLocation,
  createUnit,
  moveUnit,
  OrganizationApiError,
  organizationErrorMessage,
} from './admin-organization-api.ts';
import {
  AdminOperationsApiError,
  assignSoulMentor,
  captureSoul,
  completeFollowUpTask,
  completeSoulFollowUp,
  createChurch,
  createHomeChurch,
  updateHomeChurch,
  createTeamAssignment,
  endTeamAssignment,
  updateChurch,
  deleteChurch,
  defaultOpsScope,
  GLOBAL_ADMIN_SCOPE,
  operationsErrorMessage,
  recordSoulFollowUp,
  registerFirstTimer,
  updateFirstTimer,
  deleteFirstTimer,
  mutateMinistryRecord,
  transitionHomeChurchApplication,
  type AdminScope,
} from './admin-operations-api.ts';
import {
  activateMapsProvider,
  activateObjectStorage,
  AdminPlatformApiError,
  configureMapsProvider,
  configureObjectStorage,
  deactivateMapsProvider,
  deactivateObjectStorage,
  disableFeatureFlag,
  enableFeatureFlag,
  platformErrorMessage,
  upsertConfiguration,
  upsertFeatureFlag,
  validateObjectStorage,
  wipeDemoDataset,
  issueKcaAdmissionLetter,
  downloadKcaAdmissionLetterPdf,
  type MapsProvider,
} from './admin-platform-api.ts';
import { downloadBlob } from './download-blob.ts';

export { GLOBAL_ADMIN_SCOPE };

export const UNREGISTERED_ADMIN_ACTION_MESSAGE =
  'This action is not available for the selected record. Use View to inspect it; Edit and Delete only work where the platform supports them.';

export class UnregisteredAdminActionError extends Error {
  constructor(message = UNREGISTERED_ADMIN_ACTION_MESSAGE) {
    super(message);
    this.name = 'UnregisteredAdminActionError';
  }
}

export type AdminActionInput = {
  route: string;
  label: string;
  payload: Record<string, string>;
  recordId?: string | null;
  scope?: string | AdminScope;
};

export type AdminActionResult = {
  id?: string;
  status?: string;
  data: unknown;
};

type Ctx = {
  route: string;
  label: string;
  payload: Record<string, string>;
  recordId?: string;
  scope: AdminScope;
};

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;
const CODE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
const KCA_APPLICATION_STATES = new Set([
  'draft',
  'received',
  'information_required',
  'interview',
  'reviewed',
  'accepted',
  'provisionally_accepted',
  'deferred',
  'not_accepted',
  'withdrawn',
  'suspended',
  'revoked',
]);

function kcaAssignmentTransitionStatus(payload: Record<string, string>, fallback: string): string {
  const raw = (field(payload, 'status') ?? fallback).trim().toLowerCase();
  if (raw === 'published' || raw === 'publised' || raw === 'publish') return 'assigned';
  return field(payload, 'status') ?? fallback;
}

function kcaApplicationStatus(payload: Record<string, string>): string | undefined {
  const status = field(payload, 'status')?.toLowerCase();
  return status && KCA_APPLICATION_STATES.has(status) ? status : undefined;
}

function normalizeLabel(label: string): string {
  return label
    .replace(/[＋+→↗⌄⋯•••]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function extractUlid(value?: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (ULID_PATTERN.test(trimmed)) return trimmed;
  const matches = trimmed.match(/[0-7][0-9A-HJKMNP-TV-Z]{25}/gi);
  return matches?.at(-1);
}

function firstUlid(...values: Array<string | null | undefined>): string | undefined {
  for (const value of values) {
    const id = extractUlid(value);
    if (id) return id;
  }
  return undefined;
}

function field(payload: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && String(value).trim() !== '') return String(value).trim();
  }
  return undefined;
}

function asNumber(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function asInt(value?: string): number | undefined {
  const parsed = asNumber(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function asBool(value?: string): boolean | undefined {
  if (value === undefined || value === '') return undefined;
  if (/^(true|1|yes|on|enabled|active)$/i.test(value)) return true;
  if (/^(false|0|no|off|disabled|inactive)$/i.test(value)) return false;
  return undefined;
}

function asObject(value?: string): JsonObject | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as JsonObject;
    }
  } catch {
    /* not JSON */
  }
  return undefined;
}

function asStringArray(value?: string): string[] | undefined {
  if (!value) return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    /* comma-separated */
  }
  return value
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function jsonBody(entries: Record<string, JsonValue | undefined>): JsonObject {
  const body: JsonObject = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) body[key] = value;
  }
  return body;
}

function pressTypeMetadata(payload: Record<string, string>): JsonObject {
  return jsonBody({
    speaker: field(payload, 'speaker', 'preacher'),
    preached_date: field(payload, 'preached_date'),
    reflection: field(payload, 'reflection', 'body'),
    passage: field(payload, 'passage'),
  });
}

async function attachPressPublicationAssetIfNeeded(
  publication: unknown,
  payload: Record<string, string>,
  scope: AdminScope,
): Promise<void> {
  const fileAssetId = firstUlid(payload.content_file_asset_id, payload.file_asset_id);
  if (!fileAssetId) return;
  const publicationId =
    (publication && typeof publication === 'object' && 'id' in publication && typeof (publication as { id?: unknown }).id === 'string'
      ? extractUlid(String((publication as { id: string }).id))
      : undefined)
    ?? firstUlid(payload.publication_id, payload.id);
  if (!publicationId) return;
  const format = (field(payload, 'format', 'asset_format') ?? 'pdf').toLowerCase();
  try {
    await mutate(
      `admin/press/publications/${encodeURIComponent(publicationId)}/assets`,
      {
        file_asset_id: fileAssetId,
        asset_format: format === 'print' ? 'pdf' : format,
        is_required: true,
      },
      { scope },
    );
  } catch {
    // Primary content_file_asset_id is already stored on the publication.
  }
}

function looksLikeCode(value?: string): boolean {
  return Boolean(value && CODE_PATTERN.test(value));
}

function reasonCode(payload: Record<string, string>, fallback?: string): string | undefined {
  const direct = field(payload, 'reason_code', 'reasonCode', 'completion_reason_code');
  if (looksLikeCode(direct)) return direct;
  const notes = field(payload, 'notes', 'note');
  if (looksLikeCode(notes)) return notes;
  return fallback && looksLikeCode(fallback) ? fallback : undefined;
}

function requireId(id: string | undefined, name: string): string {
  if (!id) {
    throw new ApiError(422, `A ${name} ULID is required for this action.`);
  }
  return id;
}

function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `admin-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function resolveScope(scope?: string | AdminScope): AdminScope {
  if (!scope) return GLOBAL_ADMIN_SCOPE;
  if (typeof scope === 'object' && scope.type && scope.id) {
    if (scope.type === 'global' || /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(scope.id)) {
      return scope;
    }
    return GLOBAL_ADMIN_SCOPE;
  }
  return defaultOpsScope(typeof scope === 'string' ? scope : undefined);
}

function recordFrom(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null;
  const obj = data as Record<string, unknown>;
  if (obj.data && typeof obj.data === 'object' && !Array.isArray(obj.data)) {
    return obj.data as Record<string, unknown>;
  }
  return obj;
}

function toResult(data: unknown): AdminActionResult {
  const record = recordFrom(data);
  const id = typeof record?.id === 'string' ? record.id : typeof record?.public_id === 'string' ? record.public_id : undefined;
  const status =
    typeof record?.status === 'string'
      ? record.status
      : typeof record?.account_status === 'string'
        ? record.account_status
        : undefined;
  return { data, id, status };
}

export function formatAdminActionSuccess(result: AdminActionResult): string {
  const parts = ['Saved'];
  const data = result.data && typeof result.data === 'object' ? (result.data as Record<string, unknown>) : null;
  const created = data && typeof data.created === 'number' ? data.created : null;
  if (created !== null && created > 1) {
    parts.push(`${created} assignments`);
  } else if (result.id) {
    parts.push(`id ${result.id}`);
  }
  if (result.status) parts.push(`status ${result.status}`);
  return parts.join(' · ');
}

export function formatAdminMutationError(error: unknown): string {
  if (error instanceof UnregisteredAdminActionError) return error.message;
  if (error instanceof OrganizationApiError) return organizationErrorMessage(error);
  if (error instanceof AdminPlatformApiError) {
    return platformErrorMessage(error, 'The platform admin request failed.');
  }
  if (error instanceof AdminOperationsApiError) {
    return operationsErrorMessage(error, 'Admin operations mutation failed.');
  }
  if (error instanceof AdminIdentityApiError) {
    return error.code ? `${error.message} (${error.code})` : error.message;
  }
  if (error instanceof ApiError) {
    const first = error.errors ? Object.values(error.errors).flat()[0] : undefined;
    const message = first || error.message;
    return error.code ? `${message} (${error.code})` : message;
  }
  if (error instanceof Error && error.message) return error.message;
  return 'The admin action failed.';
}

async function mutate<T>(
  path: string,
  body?: JsonObject,
  options: { scope: AdminScope; method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE'; idempotent?: boolean } = {
    scope: GLOBAL_ADMIN_SCOPE,
  },
): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.idempotent) headers['Idempotency-Key'] = newIdempotencyKey();
  return apiRequestData<T>(path, {
    method: options.method ?? 'POST',
    scope: options.scope,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function routeStarts(route: string, ...prefixes: string[]): boolean {
  return prefixes.some((prefix) => route === prefix || route.startsWith(`${prefix}/`) || route.startsWith(prefix));
}

function labelIs(label: string, pattern: RegExp): boolean {
  return pattern.test(label);
}

function kcaApplicationId(ctx: Ctx): string {
  return requireId(
    firstUlid(ctx.recordId, ctx.payload.application_id, ctx.payload.id, extractUlid(ctx.route)),
    'application',
  );
}

export function isAdmissionLetterDownloadAction(label: string, route: string): boolean {
  const normalized = normalizeLabel(label);
  return routeStarts(route, '/admin/kca/applications')
    && labelIs(normalized, /download (admission letter|pdf)|download admission letter/);
}

export function isAdmissionLetterIssueAction(label: string, route: string): boolean {
  const normalized = normalizeLabel(label);
  return routeStarts(route, '/admin/kca/applications')
    && labelIs(normalized, /issue admission letter|issue letter/);
}

export async function executeAdmissionLetterDownload(input: AdminActionInput): Promise<void> {
  const applicationId = requireId(
    firstUlid(input.recordId, input.payload?.application_id, input.payload?.id, extractUlid(input.route)),
    'application',
  );
  const blob = await downloadKcaAdmissionLetterPdf(applicationId, resolveScope(input.scope));
  downloadBlob(blob, 'kca-admission-letter.pdf');
}

function pickRecord(ctx: Ctx, ...keys: string[]): string | undefined {
  return firstUlid(ctx.recordId, ...keys.map((key) => ctx.payload[key]));
}

function splitPersonName(payload: Record<string, string>): { given_name?: string; family_name?: string } {
  const given = field(payload, 'given_name', 'givenName', 'first_name', 'firstName');
  const family = field(payload, 'family_name', 'familyName', 'last_name', 'lastName');
  if (given || family) return { given_name: given, family_name: family };
  const full = field(payload, 'fullName', 'full_name', 'name');
  if (!full) return {};
  const [first, ...rest] = full.split(/\s+/);
  return { given_name: first, family_name: rest.join(' ') || undefined };
}

/** Next workflow status for Press publication stage screens / approve actions. */
function nextPressPublicationStatus(route: string, label: string): string {
  if (labelIs(label, /unpublish/)) return 'unpublished';
  if (labelIs(label, /archive/)) return 'archived';
  if (labelIs(label, /reject/)) return 'rejected';
  if (labelIs(label, /changes requested|request revision/)) return 'changes_requested';
  if (route.includes('/editorial-review')) return 'theological_review';
  if (route.includes('/theological-review')) return 'copy_editing';
  if (route.includes('/copy-editing')) return 'design';
  if (route.includes('/design')) return 'publication_approval';
  if (route.includes('/isbn')) return 'publication_approval';
  if (route.includes('/approval') || labelIs(label, /publish|publication/)) return 'published';
  if (labelIs(label, /continue|approv/)) return 'editorial_review';
  return 'editorial_review';
}

function routeIncludesComposeChannel(route: string): boolean {
  return [
    '/admin/communications/email/',
    '/admin/communications/sms/',
    '/admin/communications/whatsapp/',
    '/admin/communications/push/',
    '/admin/communications/in-app/',
    '/admin/communications/announcements/',
    '/admin/communications/newsletters/',
  ].some((prefix) => route.includes(prefix));
}

async function dispatch(ctx: Ctx): Promise<unknown> {
  const { route, label, payload, scope } = ctx;
  const opts = { scope };

  // --- Identity (existing wrappers + remaining POSTs) ---
  if (routeStarts(route, '/admin/users') && labelIs(label, /suspend|disable|lock/)) {
    const userId = requireId(pickRecord(ctx, 'user_id', 'id'), 'user');
    return suspendAdminUser(userId, field(payload, 'reason', 'notes', 'reason_code') ?? 'policy_violation', scope);
  }
  if (routeStarts(route, '/admin/users') && labelIs(label, /reactivat|unsuspend|enable account|restore/)) {
    return reactivateAdminUser(requireId(pickRecord(ctx, 'user_id', 'id'), 'user'), scope);
  }
  if (
    (routeStarts(route, '/admin/access/user-role-assignment', '/admin/users') && labelIs(label, /assign role|save assignment/)) ||
    labelIs(label, /^assign roles? to users?$/)
  ) {
    const userId = requireId(pickRecord(ctx, 'user_id', 'id'), 'user');
    return mutate(`admin/users/${encodeURIComponent(userId)}/role-assignments`, {
      role_id: requireId(firstUlid(payload.role_id, payload.role), 'role'),
      expires_at: field(payload, 'expires_at', 'expiresAt') ?? null,
    }, opts);
  }
  if (routeStarts(route, '/admin/roles', '/admin/permissions') && labelIs(label, /grant permission|add permission|assign permission/)) {
    const roleId = requireId(pickRecord(ctx, 'role_id', 'id'), 'role');
    return mutate(`admin/access/roles/${encodeURIComponent(roleId)}/permissions`, {
      permission_id: requireId(firstUlid(payload.permission_id, payload.permission), 'permission'),
    }, opts);
  }
  if (
    routeStarts(route, '/admin/access/scope-assignments', '/admin/geography/scope-assignment', '/admin/access') &&
    labelIs(label, /save scope|assign scope|save assignment/)
  ) {
    const assignmentId = requireId(pickRecord(ctx, 'role_assignment_id', 'assignment_id', 'id'), 'role assignment');
    return mutate(`admin/access/role-assignments/${encodeURIComponent(assignmentId)}/scopes`, {
      scope_type: field(payload, 'scope_type', 'scopeType') ?? scope.type,
      scope_key: field(payload, 'scope_key', 'scopeKey', 'scope_id', 'scopeId') ?? scope.id,
    }, opts);
  }

  // --- Organization ---
  if (routeStarts(route, '/admin/geography/countries') && labelIs(label, /add country|create country/)) {
    return createCountry(
      {
        iso_code: (field(payload, 'iso_code', 'code') ?? '').toUpperCase(),
        name: field(payload, 'name', 'country') ?? '',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/geography') && labelIs(label, /add level|create level/)) {
    const countryId = requireId(pickRecord(ctx, 'country_id', 'id'), 'country');
    return createLevel(
      countryId,
      {
        code: field(payload, 'code', 'level_code') ?? '',
        name: field(payload, 'name', 'level_name') ?? '',
        sort_order: asInt(field(payload, 'sort_order', 'order', 'sequence')) ?? 1,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/geography') && labelIs(label, /add (region|state|local area|unit)|create (region|state|local area|unit)/)) {
    return createUnit(
      {
        country_id: requireId(firstUlid(payload.country_id, ctx.recordId), 'country'),
        administrative_level_id: requireId(firstUlid(payload.administrative_level_id, payload.level_id), 'administrative level'),
        name: field(payload, 'name') ?? '',
        parent_id: firstUlid(payload.parent_id) ?? null,
        reference_code: field(payload, 'reference_code', 'code') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/geography') && labelIs(label, /move unit|change parent|reparent/)) {
    return moveUnit(
      requireId(pickRecord(ctx, 'unit_id', 'id'), 'unit'),
      { parent_id: firstUlid(payload.parent_id) ?? null },
      opts,
    );
  }
  if (routeStarts(route, '/admin/geography') && labelIs(label, /add location|create location/)) {
    return createLocation(
      {
        country_id: requireId(firstUlid(payload.country_id), 'country'),
        name: field(payload, 'name') ?? '',
        timezone: field(payload, 'timezone') ?? 'UTC',
        administrative_unit_id: firstUlid(payload.administrative_unit_id) ?? null,
        address_line_one: field(payload, 'address_line_one', 'address') ?? null,
        address_line_two: field(payload, 'address_line_two') ?? null,
        locality: field(payload, 'locality') ?? null,
        postal_code: field(payload, 'postal_code') ?? null,
        latitude: asNumber(field(payload, 'latitude')) ?? null,
        longitude: asNumber(field(payload, 'longitude')) ?? null,
      },
      opts,
    );
  }

  // --- Platform settings / storage / maps / search / advisory ---
  if (routeStarts(route, '/admin/settings/feature-flags') && labelIs(label, /enable|activate/)) {
    return enableFeatureFlag(requireId(pickRecord(ctx, 'feature_flag_id', 'id'), 'feature flag'), scope);
  }
  if (routeStarts(route, '/admin/settings/feature-flags') && labelIs(label, /disable|deactivate/)) {
    return disableFeatureFlag(requireId(pickRecord(ctx, 'feature_flag_id', 'id'), 'feature flag'), scope);
  }
  if (routeStarts(route, '/admin/settings/feature-flags') && labelIs(label, /save|upsert|update|create/)) {
    return upsertFeatureFlag(
      {
        key: field(payload, 'key', 'name') ?? '',
        environment: field(payload, 'environment') ?? '*',
        rollout_percentage: asInt(field(payload, 'rollout_percentage')) ?? 100,
        scope_type: field(payload, 'scope_type') ?? null,
        scope_id: field(payload, 'scope_id') ?? null,
        starts_at: field(payload, 'starts_at', 'startDate') ?? null,
        ends_at: field(payload, 'ends_at', 'endDate') ?? null,
      },
      scope,
    );
  }
  if (routeStarts(route, '/admin/settings/maps') && labelIs(label, /activate/)) {
    return activateMapsProvider(scope);
  }
  if (routeStarts(route, '/admin/settings/maps') && labelIs(label, /deactivate/)) {
    return deactivateMapsProvider(scope);
  }
  if (routeStarts(route, '/admin/settings/maps') && labelIs(label, /save|configure|update/)) {
    return configureMapsProvider(
      {
        active_provider: (field(payload, 'active_provider', 'provider') ?? 'leaflet') as MapsProvider,
        google_api_key: field(payload, 'google_api_key') ?? null,
        mapbox_access_token: field(payload, 'mapbox_access_token') ?? null,
        leaflet_tile_url: field(payload, 'leaflet_tile_url') ?? null,
        default_latitude: asNumber(field(payload, 'default_latitude')) ?? null,
        default_longitude: asNumber(field(payload, 'default_longitude')) ?? null,
        default_zoom: asInt(field(payload, 'default_zoom')) ?? null,
      },
      scope,
    );
  }
  if (routeStarts(route, '/admin/settings/uploads') && labelIs(label, /validate/)) {
    return validateObjectStorage(scope);
  }
  if (routeStarts(route, '/admin/settings/uploads') && labelIs(label, /activate/)) {
    return activateObjectStorage(scope);
  }
  if (routeStarts(route, '/admin/settings/uploads') && labelIs(label, /deactivate/)) {
    return deactivateObjectStorage(scope);
  }
  if (routeStarts(route, '/admin/settings/uploads') && labelIs(label, /save|configure|update/)) {
    return configureObjectStorage(
      {
        access_key_id: field(payload, 'access_key_id') ?? '',
        secret_access_key: field(payload, 'secret_access_key') ?? '',
        region: field(payload, 'region') ?? '',
        bucket: field(payload, 'bucket') ?? '',
        endpoint: field(payload, 'endpoint') ?? null,
        url: field(payload, 'url') ?? null,
        root_prefix: field(payload, 'root_prefix') ?? null,
        use_path_style_endpoint: asBool(field(payload, 'use_path_style_endpoint')),
      },
      scope,
    );
  }
  if (routeStarts(route, '/admin/settings/platform') && labelIs(label, /erase demo|wipe demo/)) {
    return wipeDemoDataset(field(payload, 'confirmation') ?? 'ERASE DEMO', scope);
  }
  if (routeStarts(route, '/admin/settings/platform') && labelIs(label, /save|upsert|update|configure/)) {
    const valueRaw = field(payload, 'value');
    const valueType = (field(payload, 'value_type') ?? 'string') as 'string' | 'integer' | 'boolean' | 'json';
    let value: JsonValue = valueRaw ?? '';
    if (valueType === 'integer') value = asInt(valueRaw) ?? 0;
    else if (valueType === 'boolean') value = asBool(valueRaw) ?? false;
    else if (valueType === 'json') value = asObject(valueRaw) ?? {};
    return upsertConfiguration(
      {
        key: field(payload, 'key', 'name') ?? '',
        value_type: valueType,
        classification: (field(payload, 'classification') ?? 'internal') as 'internal' | 'confidential',
        value,
        environment: field(payload, 'environment') ?? '*',
        scope_type: field(payload, 'scope_type') ?? null,
        scope_id: field(payload, 'scope_id') ?? null,
      },
      scope,
    );
  }
  if (routeStarts(route, '/admin/press/assets', '/admin/settings/uploads') && labelIs(label, /approv/)) {
    const fileId = requireId(pickRecord(ctx, 'file_id', 'file_asset_id', 'id'), 'file');
    return mutate(`admin/platform/files/${encodeURIComponent(fileId)}/approval`, undefined, opts);
  }
  if (labelIs(label, /search (the )?(platform|directory|records)|run search|command search/) || (routeStarts(route, '/admin/command') && field(payload, 'term', 'q'))) {
    const term = field(payload, 'term', 'query', 'q', 'name', 'prompt');
    if (term && term.length >= 2) {
      return mutate(
        'admin/platform/search/queries',
        jsonBody({
          term,
          resource_types: asStringArray(field(payload, 'resource_types')),
          limit: asInt(field(payload, 'limit')),
        }),
        opts,
      );
    }
  }
  if (routeStarts(route, '/admin/mission/ai-assistant', '/admin/reports/pastoral-ai', '/admin/reports/press-ai') || labelIs(label, /ask.*ai|ai assistant|save prompt/)) {
    const assistant =
      field(payload, 'assistant') ??
      (route.includes('/mission/') ? 'mission' : route.includes('press') ? 'press' : route.includes('kca') ? 'kca' : 'pastoral');
    const useCase =
      field(payload, 'use_case', 'useCase') ??
      (assistant === 'mission'
        ? 'follow_up_gap_detection'
        : assistant === 'kca'
          ? 'lesson_explanation'
          : assistant === 'press'
            ? 'publication_search'
            : 'report_summarization');
    return mutate(
      'admin/platform/advisory/requests',
      {
        assistant,
        use_case: useCase,
        instruction: field(payload, 'instruction', 'prompt', 'notes', 'description') ?? '',
        context: asObject(field(payload, 'context')) ?? { source_route: route },
      },
      opts,
    );
  }

  // --- Church / mission (existing wrappers + remaining POSTs) ---
  if ((routeStarts(route, '/admin/churches') || labelIs(label, /add church|create church/)) && labelIs(label, /add church|create church|save|submit|register/) && !labelIs(label, /edit|update|delete|remove/)) {
    if (route.includes('/first-timers')) {
      /* handled below */
    } else if (!route.includes('/members') && !route.includes('/home-churches')) {
      const unitId = requireId(firstUlid(payload.administrative_unit_id), 'administrative unit');
      let locationId = firstUlid(payload.location_id);
      if (!locationId) {
        const countryId = requireId(firstUlid(payload.country_id), 'country');
        const locationName =
          field(payload, 'location_name', 'address_line_one', 'name') ??
          `${field(payload, 'name') ?? 'Church'} location`;
        const createdLocation = await createLocation(
          {
            country_id: countryId,
            name: locationName,
            timezone: field(payload, 'timezone') ?? 'Africa/Lagos',
            administrative_unit_id: unitId,
            address_line_one: field(payload, 'address_line_one', 'address') ?? null,
            address_line_two: field(payload, 'address_line_two') ?? null,
            locality: field(payload, 'locality') ?? null,
            postal_code: field(payload, 'postal_code') ?? null,
          },
          { scope },
        );
        locationId = createdLocation.id;
      }
      return createChurch(
        {
          name: field(payload, 'name') ?? '',
          location_id: requireId(locationId, 'location'),
          administrative_unit_id: unitId,
        },
        scope,
      );
    }
  }
  if (routeStarts(route, '/admin/churches') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add church|create church/)) {
    const unitId = requireId(firstUlid(payload.administrative_unit_id), 'administrative unit');
    let locationId = firstUlid(payload.location_id);
    if (!locationId) {
      const countryId = requireId(firstUlid(payload.country_id), 'country');
      const createdLocation = await createLocation(
        {
          country_id: countryId,
          name: field(payload, 'location_name', 'address_line_one') ?? field(payload, 'name') ?? 'Church location',
          timezone: field(payload, 'timezone') ?? 'Africa/Lagos',
          administrative_unit_id: unitId,
          address_line_one: field(payload, 'address_line_one', 'address') ?? null,
          address_line_two: field(payload, 'address_line_two') ?? null,
          locality: field(payload, 'locality') ?? null,
          postal_code: field(payload, 'postal_code') ?? null,
        },
        { scope },
      );
      locationId = createdLocation.id;
    }
    return updateChurch(
      requireId(pickRecord(ctx, 'church_id', 'id'), 'church'),
      {
        name: field(payload, 'name') ?? '',
        location_id: requireId(locationId, 'location'),
        administrative_unit_id: unitId,
      },
      scope,
    );
  }
  if (routeStarts(route, '/admin/churches') && labelIs(label, /delete|remove/)) {
    return deleteChurch(requireId(pickRecord(ctx, 'church_id', 'id'), 'church'), scope);
  }
  if (routeStarts(route, '/admin/kca/lecturers') && labelIs(label, /add lecturer|create lecturer|save|submit/) && !labelIs(label, /delete|remove|edit/)) {
    return mutate(
      'admin/kca/lecturer-assignments',
      {
        lecturer_person_id: requireId(firstUlid(payload.lecturer_person_id, payload.person_id), 'lecturer'),
        kca_module_id: requireId(firstUlid(payload.kca_module_id, payload.module_id), 'module'),
        kca_cohort_id: requireId(firstUlid(payload.kca_cohort_id, payload.cohort_id), 'cohort'),
        starts_at: field(payload, 'starts_at', 'startDate') ?? new Date().toISOString(),
        ends_at: field(payload, 'ends_at', 'endDate') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/lecturers') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|create|add/)) {
    return mutate(
      `admin/kca/lecturer-assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'lecturer assignment'))}`,
      {
        starts_at: field(payload, 'starts_at', 'startDate') ?? new Date().toISOString(),
        ends_at: field(payload, 'ends_at', 'endDate') ?? null,
      },
      { ...opts, method: 'PATCH' },
    );
  }
  if (routeStarts(route, '/admin/kca/lecturers') && labelIs(label, /delete|remove/)) {
    return mutate(
      `admin/kca/lecturer-assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'lecturer assignment'))}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }
  if (routeStarts(route, '/admin/kca/mentors') && labelIs(label, /add mentor|create mentor|save|submit/) && !labelIs(label, /delete|remove|edit/)) {
    return mutate(
      'admin/kca/mentor-assignments',
      {
        mentor_person_id: requireId(firstUlid(payload.mentor_person_id, payload.person_id), 'mentor'),
        kca_enrollment_id: requireId(firstUlid(payload.kca_enrollment_id, payload.enrollment_id), 'enrollment'),
        starts_at: field(payload, 'starts_at', 'startDate') ?? new Date().toISOString(),
        ends_at: field(payload, 'ends_at', 'endDate') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/mentors') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|create|add/)) {
    return mutate(
      `admin/kca/mentor-assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'mentor assignment'))}`,
      {
        starts_at: field(payload, 'starts_at', 'startDate') ?? new Date().toISOString(),
        ends_at: field(payload, 'ends_at', 'endDate') ?? null,
      },
      { ...opts, method: 'PATCH' },
    );
  }
  if (routeStarts(route, '/admin/kca/mentors') && labelIs(label, /delete|remove/)) {
    return mutate(
      `admin/kca/mentor-assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'mentor assignment'))}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }
  if (
    route === '/admin/home-churches' &&
    labelIs(label, /create home church|add home church|register home church|save|submit/) &&
    !labelIs(label, /application/)
  ) {
    return createHomeChurch(
      {
        church_id: requireId(firstUlid(payload.church_id), 'church'),
        leader_person_id: requireId(firstUlid(payload.leader_person_id, payload.person_id, payload.owner_id), 'leader'),
        location_id: requireId(firstUlid(payload.location_id), 'location'),
        administrative_unit_id: requireId(firstUlid(payload.administrative_unit_id), 'administrative unit'),
        name: field(payload, 'name', 'proposed_name') ?? '',
      },
      opts.scope,
    );
  }
  if (routeStarts(route, '/admin/home-churches') && !route.includes('/applications') && labelIs(label, /edit|update/) && !labelIs(label, /member|attendance|status|application/)) {
    return updateHomeChurch(
      requireId(pickRecord(ctx, 'home_church_id', 'id'), 'home church'),
      {
        name: field(payload, 'name') ?? '',
        leader_person_id: requireId(firstUlid(payload.leader_person_id, payload.person_id, payload.owner_id), 'leader'),
      },
      opts.scope,
    );
  }
  if (routeStarts(route, '/admin/home-churches/applications') && labelIs(label, /new application|create application|submit application|add application/)) {
    return mutate(
      'admin/church/home-church-applications',
      {
        applicant_person_id: requireId(firstUlid(payload.applicant_person_id, payload.person_id, payload.owner_id), 'applicant'),
        church_id: requireId(firstUlid(payload.church_id), 'church'),
        location_id: requireId(firstUlid(payload.location_id), 'location'),
        administrative_unit_id: requireId(firstUlid(payload.administrative_unit_id), 'administrative unit'),
        proposed_name: field(payload, 'proposed_name', 'name') ?? '',
        expected_participants: asInt(field(payload, 'expected_participants')) ?? 1,
        meeting_day: field(payload, 'meeting_day') ?? 'sunday',
        meeting_time: field(payload, 'meeting_time') ?? '10:00',
        contact_email: field(payload, 'contact_email', 'email') ?? '',
        contact_phone: field(payload, 'contact_phone', 'phone') ?? '',
        guidelines_agreed_at: field(payload, 'guidelines_agreed_at') ?? new Date().toISOString(),
      },
      opts,
    );
  }
  if (route.includes('/small-groups') && labelIs(label, /add small group|create small group|add group|register group/)) {
    return mutate(
      'admin/church/home-church-applications',
      {
        applicant_person_id: requireId(firstUlid(payload.applicant_person_id, payload.person_id, payload.owner_id), 'leader'),
        church_id: requireId(firstUlid(payload.church_id), 'church'),
        location_id: requireId(firstUlid(payload.location_id), 'location'),
        administrative_unit_id: requireId(firstUlid(payload.administrative_unit_id), 'administrative unit'),
        proposed_name: field(payload, 'proposed_name', 'name') ?? '',
        expected_participants: asInt(field(payload, 'expected_participants')) ?? 8,
        meeting_day: field(payload, 'meeting_day') ?? 'sunday',
        meeting_time: field(payload, 'meeting_time') ?? '18:00',
        contact_email: field(payload, 'contact_email', 'email') ?? '',
        contact_phone: field(payload, 'contact_phone', 'phone') ?? '',
        guidelines_agreed_at: field(payload, 'guidelines_agreed_at') ?? new Date().toISOString(),
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/home-churches/applications') && labelIs(label, /approv|reject|defer|transition|submit decision|review|activate|suspend|close/)) {
    const status =
      field(payload, 'status') ??
      (labelIs(label, /approv/)
        ? 'approved'
        : labelIs(label, /reject/)
          ? 'rejected'
          : labelIs(label, /defer/)
            ? 'under_review'
            : labelIs(label, /activate/)
              ? 'active'
              : labelIs(label, /suspend/)
                ? 'suspended'
                : labelIs(label, /close/)
                  ? 'closed'
                  : 'submitted');
    return transitionHomeChurchApplication(
      requireId(pickRecord(ctx, 'application_id', 'id'), 'application'),
      { status, reason_code: reasonCode(payload, 'application_reviewed') ?? 'application_reviewed' },
      scope,
    );
  }
  if ((route.includes('/first-timers') || routeStarts(route, '/admin/people/first-timers')) && labelIs(label, /register|create|add/) && !labelIs(label, /edit|update|delete|remove/)) {
    return registerFirstTimer(
      {
        person_id: requireId(firstUlid(payload.person_id, payload.owner_id), 'person'),
        church_id: requireId(firstUlid(payload.church_id), 'church'),
        home_church_id: firstUlid(payload.home_church_id) ?? null,
        assigned_follow_up_person_id: firstUlid(payload.assigned_follow_up_person_id, payload.assignee_id) ?? null,
        registered_at: field(payload, 'registered_at', 'startDate') ?? null,
      },
      scope,
    );
  }
  if ((route.includes('/first-timers') || routeStarts(route, '/admin/people/first-timers')) && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|register|create|add/)) {
    return updateFirstTimer(
      requireId(pickRecord(ctx, 'first_timer_id', 'id'), 'first timer'),
      {
        person_id: requireId(firstUlid(payload.person_id, payload.owner_id), 'person'),
        church_id: requireId(firstUlid(payload.church_id), 'church'),
        home_church_id: firstUlid(payload.home_church_id) ?? null,
        registered_at: field(payload, 'registered_at', 'startDate') ?? null,
      },
      scope,
    );
  }
  if ((route.includes('/first-timers') || routeStarts(route, '/admin/people/first-timers')) && labelIs(label, /delete|remove/)) {
    return deleteFirstTimer(requireId(pickRecord(ctx, 'first_timer_id', 'id'), 'first timer'), scope);
  }
  if (route.includes('/converts') && labelIs(label, /add|create|register|save|submit/) && !labelIs(label, /edit|update|delete|remove/)) {
    return mutateMinistryRecord('admin/church/converts', 'POST', {
      person_id: requireId(firstUlid(payload.person_id), 'person'),
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      home_church_id: firstUlid(payload.home_church_id) ?? null,
      converted_at: field(payload, 'converted_at') ?? null,
      baptized_at: field(payload, 'baptized_at') ?? null,
      source: field(payload, 'source') ?? null,
      status: field(payload, 'status') ?? 'active',
      notes: field(payload, 'notes') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/converts') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add|create/)) {
    return mutateMinistryRecord(`admin/church/converts/${encodeURIComponent(requireId(pickRecord(ctx, 'convert_id', 'id'), 'convert'))}`, 'PUT', {
      person_id: requireId(firstUlid(payload.person_id), 'person'),
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      home_church_id: firstUlid(payload.home_church_id) ?? null,
      converted_at: field(payload, 'converted_at') ?? null,
      baptized_at: field(payload, 'baptized_at') ?? null,
      source: field(payload, 'source') ?? null,
      status: field(payload, 'status') ?? 'active',
      notes: field(payload, 'notes') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/converts') && labelIs(label, /delete|remove/)) {
    return mutateMinistryRecord(`admin/church/converts/${encodeURIComponent(requireId(pickRecord(ctx, 'convert_id', 'id'), 'convert'))}`, 'DELETE', undefined, scope);
  }
  if ((route.includes('/evangelism') || route.includes('/departments') || route.includes('/workers') || route.includes('/leadership') || route.includes('/leaders') || route.includes('/disciples') || route.includes('/counselling') || route.includes('/testimonies') || route.includes('/attendance')) && labelIs(label, /delete|remove/)) {
    const id = requireId(pickRecord(ctx, 'id'), 'record');
    const path = route.includes('/evangelism')
      ? `admin/church/evangelism-activities/${id}`
      : route.includes('/departments')
        ? `admin/church/departments/${id}`
        : route.includes('/counselling')
          ? `admin/church/counselling-cases/${id}`
          : route.includes('/testimonies')
            ? `admin/church/testimonies/${id}`
            : route.includes('/attendance')
              ? `admin/church/attendance/${id}`
              : `admin/church/role-assignments/${id}`;
    return mutateMinistryRecord(path, 'DELETE', undefined, scope);
  }
  if (route.includes('/evangelism') && labelIs(label, /add|create|save|submit|register/) && !labelIs(label, /edit|update|delete|remove/)) {
    return mutateMinistryRecord('admin/church/evangelism-activities', 'POST', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      title: field(payload, 'title', 'name') ?? '',
      activity_type: field(payload, 'activity_type') ?? 'outreach',
      souls_reached: asInt(field(payload, 'souls_reached')),
      decisions: asInt(field(payload, 'decisions')),
      occurred_at: field(payload, 'occurred_at') ?? null,
      status: field(payload, 'status') ?? 'completed',
      notes: field(payload, 'notes') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/evangelism') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add|create/)) {
    return mutateMinistryRecord(`admin/church/evangelism-activities/${encodeURIComponent(requireId(pickRecord(ctx, 'id'), 'activity'))}`, 'PUT', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      title: field(payload, 'title', 'name') ?? '',
      activity_type: field(payload, 'activity_type') ?? 'outreach',
      souls_reached: asInt(field(payload, 'souls_reached')),
      decisions: asInt(field(payload, 'decisions')),
      occurred_at: field(payload, 'occurred_at') ?? null,
      status: field(payload, 'status') ?? 'completed',
      notes: field(payload, 'notes') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/departments') && labelIs(label, /add|create|save|submit/) && !labelIs(label, /edit|update|delete|remove/)) {
    return mutateMinistryRecord('admin/church/departments', 'POST', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      name: field(payload, 'name') ?? '',
      description: field(payload, 'description') ?? null,
      leader_person_id: firstUlid(payload.leader_person_id) ?? null,
      status: field(payload, 'status') ?? 'active',
    } as JsonObject, scope);
  }
  if (route.includes('/departments') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add|create/)) {
    return mutateMinistryRecord(`admin/church/departments/${encodeURIComponent(requireId(pickRecord(ctx, 'id'), 'department'))}`, 'PUT', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      name: field(payload, 'name') ?? '',
      description: field(payload, 'description') ?? null,
      leader_person_id: firstUlid(payload.leader_person_id) ?? null,
      status: field(payload, 'status') ?? 'active',
    } as JsonObject, scope);
  }
  if ((route.includes('/workers') || route.includes('/leadership') || route.includes('/leaders') || route.includes('/disciples')) && labelIs(label, /add|create|save|submit|assign/) && !labelIs(label, /edit|update|delete|remove/)) {
    const roleType = route.includes('/leaders') || route.includes('/leadership')
      ? 'leader'
      : route.includes('/disciples')
        ? 'disciple'
        : (field(payload, 'role_type') ?? 'worker');
    return mutateMinistryRecord('admin/church/role-assignments', 'POST', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      person_id: requireId(firstUlid(payload.person_id), 'person'),
      department_id: firstUlid(payload.department_id) ?? null,
      role_type: roleType,
      title: field(payload, 'title', 'name') ?? roleType,
      status: field(payload, 'status') ?? 'active',
      started_at: field(payload, 'started_at') ?? null,
    } as JsonObject, scope);
  }
  if ((route.includes('/workers') || route.includes('/leadership') || route.includes('/leaders') || route.includes('/disciples')) && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add|create/)) {
    return mutateMinistryRecord(`admin/church/role-assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'id'), 'assignment'))}`, 'PUT', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      person_id: requireId(firstUlid(payload.person_id), 'person'),
      department_id: firstUlid(payload.department_id) ?? null,
      role_type: field(payload, 'role_type') ?? 'worker',
      title: field(payload, 'title', 'name') ?? '',
      status: field(payload, 'status') ?? 'active',
      started_at: field(payload, 'started_at') ?? null,
      ended_at: field(payload, 'ended_at') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/counselling') && labelIs(label, /add|create|save|submit|new/) && !labelIs(label, /edit|update|delete|remove/)) {
    return mutateMinistryRecord('admin/church/counselling-cases', 'POST', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      client_person_id: requireId(firstUlid(payload.client_person_id, payload.person_id), 'client'),
      counselor_person_id: firstUlid(payload.counselor_person_id) ?? null,
      case_type: field(payload, 'case_type') ?? 'general',
      status: field(payload, 'status') ?? 'open',
      summary: field(payload, 'summary') ?? null,
      opened_at: field(payload, 'opened_at') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/counselling') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add|create|new/)) {
    return mutateMinistryRecord(`admin/church/counselling-cases/${encodeURIComponent(requireId(pickRecord(ctx, 'id'), 'case'))}`, 'PUT', {
      church_id: requireId(firstUlid(payload.church_id), 'church'),
      client_person_id: requireId(firstUlid(payload.client_person_id, payload.person_id), 'client'),
      counselor_person_id: firstUlid(payload.counselor_person_id) ?? null,
      case_type: field(payload, 'case_type') ?? 'general',
      status: field(payload, 'status') ?? 'open',
      summary: field(payload, 'summary') ?? null,
      opened_at: field(payload, 'opened_at') ?? null,
      closed_at: field(payload, 'closed_at') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/testimonies') && labelIs(label, /add|create|save|submit/) && !labelIs(label, /edit|update|delete|remove/)) {
    return mutateMinistryRecord('admin/church/testimonies', 'POST', {
      person_id: requireId(firstUlid(payload.person_id), 'person'),
      church_id: firstUlid(payload.church_id) ?? null,
      title: field(payload, 'title', 'name') ?? '',
      body: field(payload, 'body', 'summary') ?? '',
      status: field(payload, 'status') ?? 'pending',
      submitted_at: field(payload, 'submitted_at') ?? null,
      published_at: field(payload, 'published_at') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/testimonies') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add|create/)) {
    return mutateMinistryRecord(`admin/church/testimonies/${encodeURIComponent(requireId(pickRecord(ctx, 'id'), 'testimony'))}`, 'PUT', {
      person_id: requireId(firstUlid(payload.person_id), 'person'),
      church_id: firstUlid(payload.church_id) ?? null,
      title: field(payload, 'title', 'name') ?? '',
      body: field(payload, 'body', 'summary') ?? '',
      status: field(payload, 'status') ?? 'pending',
      submitted_at: field(payload, 'submitted_at') ?? null,
      published_at: field(payload, 'published_at') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/attendance') && labelIs(label, /add|create|save|submit|record/) && !labelIs(label, /edit|update|delete|remove/)) {
    return mutateMinistryRecord('admin/church/attendance', 'POST', {
      home_church_id: requireId(firstUlid(payload.home_church_id), 'home church'),
      service_date: field(payload, 'service_date') ?? new Date().toISOString().slice(0, 10),
      males: asInt(field(payload, 'males', 'male')) ?? 0,
      females: asInt(field(payload, 'females', 'female')) ?? 0,
      children: asInt(field(payload, 'children')) ?? 0,
      notes: field(payload, 'notes') ?? null,
    } as JsonObject, scope);
  }
  if (route.includes('/attendance') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|add|create/)) {
    return mutateMinistryRecord(`admin/church/attendance/${encodeURIComponent(requireId(pickRecord(ctx, 'id'), 'attendance'))}`, 'PUT', {
      service_date: field(payload, 'service_date') ?? new Date().toISOString().slice(0, 10),
      males: asInt(field(payload, 'males', 'male')) ?? 0,
      females: asInt(field(payload, 'females', 'female')) ?? 0,
      children: asInt(field(payload, 'children')) ?? 0,
      notes: field(payload, 'notes') ?? null,
    } as JsonObject, scope);
  }
  if (route === '/admin/people' && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove/)) {
    return mutateMinistryRecord(`admin/church/people/${encodeURIComponent(requireId(pickRecord(ctx, 'id', 'person_id'), 'person'))}`, 'PUT', {
      phone: field(payload, 'phone') ?? null,
      given_name: field(payload, 'given_name') ?? null,
      family_name: field(payload, 'family_name') ?? null,
    } as JsonObject, scope);
  }
  if (routeStarts(route, '/admin/people/prayer-requests') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|assign|transition/)) {
    const prayerId = requireId(pickRecord(ctx, 'id'), 'prayer request');
    const status = field(payload, 'status');
    if (status && !['open', 'assigned', 'rejected', 'answered'].includes(status)) {
      return mutate(`admin/church/prayer-requests/${encodeURIComponent(prayerId)}/transitions`, { status }, opts);
    }
    return mutate(
      `admin/church/prayer-requests/${encodeURIComponent(prayerId)}`,
      {
        subject: field(payload, 'subject', 'title', 'name', 'summary') ?? '',
        body: field(payload, 'body', 'description', 'notes') ?? '',
        status: status ?? null,
      },
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/people/needs') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|transition/)) {
    const needId = requireId(pickRecord(ctx, 'id'), 'pastoral need');
    const status = field(payload, 'status');
    if (status && !['open', 'approved', 'rejected', 'closed'].includes(status)) {
      return mutate(`admin/church/pastoral-needs/${encodeURIComponent(needId)}/transitions`, { status }, opts);
    }
    return mutate(
      `admin/church/pastoral-needs/${encodeURIComponent(needId)}`,
      jsonBody({
        person_id: firstUlid(payload.person_id) ?? null,
        church_id: firstUlid(payload.church_id) ?? null,
        home_church_id: firstUlid(payload.home_church_id) ?? null,
        category: field(payload, 'category') ?? '',
        summary: field(payload, 'summary', 'title', 'name') ?? '',
        status: status ?? null,
      }),
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/people/follow-up') && labelIs(label, /edit|update|save/) && !labelIs(label, /delete|remove|complete/)) {
    return mutate(
      `admin/church/follow-up-tasks/${encodeURIComponent(requireId(pickRecord(ctx, 'task_id', 'id'), 'follow-up task'))}`,
      jsonBody({
        assigned_to_person_id: firstUlid(payload.assigned_to_person_id, payload.assignee_id) ?? null,
        due_at: field(payload, 'due_at', 'startDate') ?? null,
      }),
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/people/follow-up', '/admin/churches') && labelIs(label, /complete follow|mark complete|complete task/) ) {
    return completeFollowUpTask(
      requireId(pickRecord(ctx, 'task_id', 'id'), 'follow-up task'),
      reasonCode(payload, 'contacted_successfully') ?? 'contacted_successfully',
      scope,
    );
  }
  if (
    ((routeStarts(route, '/admin/churches') && route.includes('/members')) || route.includes('/membership')) &&
    labelIs(label, /add member|register member|start membership|create membership/)
  ) {
    return mutate(
      'admin/church/memberships',
      {
        person_id: requireId(firstUlid(payload.person_id, payload.owner_id), 'person'),
        church_id: requireId(firstUlid(payload.church_id), 'church'),
        home_church_id: firstUlid(payload.home_church_id) ?? null,
        joined_at: field(payload, 'joined_at', 'startDate') ?? null,
      },
      opts,
    );
  }
  if (
    (route.includes('/membership') || route.includes('/members')) &&
    labelIs(label, /end membership|close membership|remove member/)
  ) {
    return mutate(
      `admin/church/memberships/${encodeURIComponent(requireId(pickRecord(ctx, 'membership_id', 'id'), 'membership'))}/end`,
      { reason_code: reasonCode(payload, 'membership_ended') ?? 'membership_ended' },
      opts,
    );
  }
  if (routeStarts(route, '/admin/mission/crusades') && labelIs(label, /create crusade|save crusade|submit crusade/) && !labelIs(label, /invitation|soul|invite|edit|update/)) {
    return mutate(
      'admin/mission/crusades',
      {
        name: field(payload, 'name', 'title', 'crusade_name') ?? '',
        code: field(payload, 'code') ?? null,
        theme: field(payload, 'theme') ?? null,
        purpose: field(payload, 'purpose') ?? null,
        description: field(payload, 'description') ?? null,
        timezone: field(payload, 'timezone') ?? null,
        location_id: firstUlid(payload.location_id) ?? null,
        starts_at: field(payload, 'starts_at', 'startDate', 'start') ?? null,
        ends_at: field(payload, 'ends_at', 'endDate', 'end') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/mission/crusades') && labelIs(label, /edit|update|save crusade/) && !labelIs(label, /invitation|soul|invite|transition|archive|create/)) {
    return mutate(
      `admin/mission/crusades/${encodeURIComponent(requireId(pickRecord(ctx, 'crusade_id', 'id'), 'crusade'))}`,
      {
        name: field(payload, 'name', 'title', 'crusade_name') ?? '',
        code: field(payload, 'code') ?? null,
        theme: field(payload, 'theme') ?? null,
        purpose: field(payload, 'purpose') ?? null,
        description: field(payload, 'description') ?? null,
        timezone: field(payload, 'timezone') ?? null,
        location_id: firstUlid(payload.location_id) ?? null,
        starts_at: field(payload, 'starts_at', 'startDate', 'start') ?? null,
        ends_at: field(payload, 'ends_at', 'endDate', 'end') ?? null,
      },
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/mission/crusades') && labelIs(label, /transition crusade|submit for review|approve crusade|start planning|schedule crusade|activate crusade|complete crusade|report crusade|postpone|cancel crusade/)) {
    const status =
      field(payload, 'status') ??
      (labelIs(label, /submit for review/)
        ? 'submitted'
        : labelIs(label, /approve crusade/)
          ? 'approved'
          : labelIs(label, /planning/)
            ? 'planning'
            : labelIs(label, /schedule/)
              ? 'scheduled'
              : labelIs(label, /activate/)
                ? 'active'
                : labelIs(label, /complete/)
                  ? 'completed'
                  : labelIs(label, /report/)
                    ? 'reported'
                    : labelIs(label, /postpone/)
                      ? 'postponed'
                      : labelIs(label, /cancel/)
                        ? 'cancelled'
                        : 'submitted');
    return mutate(
      `admin/mission/crusades/${encodeURIComponent(requireId(firstUlid(payload.crusade_id, ctx.recordId), 'crusade'))}/transitions`,
      { status, reason_code: reasonCode(payload) ?? null },
      opts,
    );
  }
  if (routeStarts(route, '/admin/mission/crusades') && labelIs(label, /archive crusade/)) {
    return mutate(
      `admin/mission/crusades/${encodeURIComponent(requireId(firstUlid(payload.crusade_id, ctx.recordId), 'crusade'))}/archive`,
      { reason_code: reasonCode(payload, 'archived') ?? 'archived' },
      opts,
    );
  }
  if (routeStarts(route, '/admin/mission/crusades') && labelIs(label, /invitation|invite/) && labelIs(label, /create|add|submit|save|send/)) {
    return mutate(
      'admin/mission/invitations',
      {
        crusade_id: requireId(firstUlid(payload.crusade_id, ctx.recordId), 'crusade'),
        requester_person_id: requireId(firstUlid(payload.requester_person_id, payload.person_id, payload.owner_id), 'requester'),
        requested_location_id: requireId(firstUlid(payload.requested_location_id, payload.location_id), 'location'),
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/mission') && labelIs(label, /transition invitation|approv.*invitation|reject.*invitation|decline.*invitation|request more info|defer invitation/)) {
    const status =
      field(payload, 'status') ??
      (labelIs(label, /reject|decline/)
        ? 'declined'
        : labelIs(label, /request more info|information/)
          ? 'information_required'
          : labelIs(label, /defer/)
            ? 'deferred'
            : 'approved');
    return mutate(
      `admin/mission/invitations/${encodeURIComponent(requireId(pickRecord(ctx, 'invitation_id', 'id'), 'invitation'))}/transitions`,
      {
        status,
        reason_code: reasonCode(payload) ?? (status === 'approved' ? null : 'review_decision'),
      },
      opts,
    );
  }
  if (
    (routeStarts(route, '/admin/mission/souls', '/admin/mission/crusades') && labelIs(label, /capture|register soul|add soul|add convert/)) ||
    labelIs(label, /capture soul/)
  ) {
    const names = splitPersonName(payload);
    return captureSoul(
      requireId(firstUlid(payload.crusade_id, ctx.recordId), 'crusade'),
      {
        person_id: firstUlid(payload.person_id) ?? null,
        given_name: names.given_name ?? null,
        family_name: names.family_name ?? null,
        middle_name: field(payload, 'middle_name') ?? null,
        preferred_name: field(payload, 'preferred_name') ?? null,
      },
      { scope },
    );
  }
  if (routeStarts(route, '/admin/mission/mentor-assignments', '/admin/mission/souls') && labelIs(label, /assign mentor|mentor assignment|assign/)) {
    return assignSoulMentor(
      requireId(pickRecord(ctx, 'soul_id', 'id'), 'soul'),
      { mission_team_assignment_id: requireId(firstUlid(payload.mission_team_assignment_id, payload.assignment, payload.assignee_id), 'mission team assignment') },
      { scope },
    );
  }
  if (routeStarts(route, '/admin/mission/follow-up') && labelIs(label, /record follow|log follow|add follow|save/)) {
    return recordSoulFollowUp(
      requireId(pickRecord(ctx, 'soul_id', 'id'), 'soul'),
      {
        mentor_assignment_id: requireId(firstUlid(payload.mentor_assignment_id), 'mentor assignment'),
        channel_code: field(payload, 'channel_code', 'channel') ?? 'in_person',
        outcome_code: field(payload, 'outcome_code', 'status') ?? 'contacted',
        occurred_at: field(payload, 'occurred_at', 'startDate') ?? new Date().toISOString(),
      },
      { scope },
    );
  }
  if (routeStarts(route, '/admin/mission/follow-up', '/admin/mission/souls') && labelIs(label, /complete follow/)) {
    return completeSoulFollowUp(
      requireId(pickRecord(ctx, 'soul_id', 'id'), 'soul'),
      reasonCode(payload, 'follow_up_completed') ?? 'follow_up_completed',
      scope,
    );
  }
  if (routeStarts(route, '/admin/mission/souls') && labelIs(label, /edit|update|save/) && !labelIs(label, /capture|register|assign|follow|delete|remove/)) {
    const soulId = requireId(pickRecord(ctx, 'soul_id', 'id'), 'soul');
    const churchId = firstUlid(payload.church_id, payload.connected_church_id);
    if (churchId) {
      return mutate(`admin/mission/souls/${encodeURIComponent(soulId)}/church-connection`, { church_id: churchId }, opts);
    }
    const status = field(payload, 'status');
    if (status === 'follow_up_completed') {
      return completeSoulFollowUp(soulId, reasonCode(payload, 'follow_up_completed') ?? 'follow_up_completed', scope);
    }
  }
  if (route.includes('/teams') && labelIs(label, /add team|create team|assign team|add member|assign member|save|submit/)) {
    return createTeamAssignment(
      {
        crusade_id: requireId(firstUlid(payload.crusade_id, ctx.recordId), 'crusade'),
        person_id: requireId(firstUlid(payload.person_id, payload.owner_id), 'person'),
        role_code: field(payload, 'role_code', 'team', 'name', 'title') ?? 'counselling',
        assigned_at: field(payload, 'assigned_at', 'startDate') ?? null,
      },
      scope,
    );
  }
  if (route.includes('/teams') && labelIs(label, /end assignment|remove member|end team|unassign/)) {
    return endTeamAssignment(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'team assignment'), scope);
  }

  // --- KCA ---
  if (routeStarts(route, '/admin/kca/years') && labelIs(label, /create|add|save|submit/)) {
    return mutate(
      'admin/kca/years',
      {
        code: field(payload, 'code') ?? '',
        name: field(payload, 'name', 'title') ?? '',
        starts_on: field(payload, 'starts_on', 'startDate', 'starts_at') ?? '',
        ends_on: field(payload, 'ends_on', 'endDate', 'ends_at') ?? '',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/cohorts') && labelIs(label, /edit|update/) && !labelIs(label, /delete|remove|create|add/)) {
    const cohortId = requireId(pickRecord(ctx, 'id'), 'cohort');
    const body: JsonObject = {
      code: field(payload, 'code') ?? '',
      name: field(payload, 'name', 'title') ?? '',
      starts_on: field(payload, 'starts_on', 'starts_at', 'startDate') ?? '',
      ends_on: field(payload, 'ends_on', 'ends_at', 'endDate') ?? '',
      timezone: field(payload, 'timezone') || 'UTC',
    };
    const yearId = firstUlid(payload.year_id, payload.kca_year_id);
    if (yearId) body.year_id = yearId;
    return mutate(`admin/kca/cohorts/${encodeURIComponent(cohortId)}`, body, { ...opts, method: 'PATCH' });
  }
  if (routeStarts(route, '/admin/kca/cohorts') && labelIs(label, /create|add|save|submit/) && !labelIs(label, /edit|update|delete|remove/)) {
    const yearId = requireId(firstUlid(payload.year_id, payload.kca_year_id, ctx.recordId), 'year');
    return mutate(
      `admin/kca/years/${encodeURIComponent(yearId)}/cohorts`,
      {
        code: field(payload, 'code') ?? '',
        name: field(payload, 'name', 'title') ?? '',
        starts_on: field(payload, 'starts_on', 'starts_at', 'startDate') ?? '',
        ends_on: field(payload, 'ends_on', 'ends_at', 'endDate') ?? '',
        timezone: field(payload, 'timezone') || 'UTC',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/modules') && labelIs(label, /edit|update/) && !labelIs(label, /lesson|delete|remove|create|add|map|publish/)) {
    const moduleId = requireId(pickRecord(ctx, 'id', 'kca_module_id', 'module_id'), 'module');
    const activeRaw = field(payload, 'is_active', 'status') ?? 'Active';
    return mutate(
      `admin/kca/modules/${encodeURIComponent(moduleId)}`,
      {
        code: field(payload, 'code') ?? '',
        title: field(payload, 'title', 'name') ?? '',
        sequence: asInt(field(payload, 'sequence')) ?? 1,
        duration_days: asInt(field(payload, 'duration_days')) ?? 1,
        is_active: !/inactive|false|0/i.test(activeRaw),
      },
      { ...opts, method: 'PATCH' },
    );
  }
  if (
    (routeStarts(route, '/admin/kca/lessons') || (routeStarts(route, '/admin/kca/modules') && labelIs(label, /edit lesson|update lesson|save lesson changes/)))
    && labelIs(label, /edit|update|save lesson/)
    && !labelIs(label, /delete|remove|create|add|chapter|add lesson/)
  ) {
    const lessonId = requireId(pickRecord(ctx, 'id', 'kca_lesson_id', 'lesson_id'), 'lesson');
    return mutate(
      `admin/kca/lessons/${encodeURIComponent(lessonId)}`,
      {
        code: field(payload, 'code') ?? '',
        title: field(payload, 'title', 'name') ?? '',
        sequence: asInt(field(payload, 'sequence')) ?? 1,
        day_index: asInt(field(payload, 'day_index')) ?? null,
        lesson_type: field(payload, 'lesson_type') || 'text',
        summary: field(payload, 'summary') || '',
        body: field(payload, 'body') || '',
        content_url: field(payload, 'content_url') || '',
      },
      { ...opts, method: 'PATCH' },
    );
  }
  if (routeStarts(route, '/admin/kca/modules') && labelIs(label, /map learning days|map days|day map/)) {
    const moduleId = requireId(firstUlid(payload.kca_module_id, payload.module_id, ctx.recordId), 'module');
    return mutate(`admin/kca/modules/${encodeURIComponent(moduleId)}/day-map`, {}, opts);
  }
  if (routeStarts(route, '/admin/kca/modules') && labelIs(label, /publish module/)) {
    const moduleId = requireId(firstUlid(payload.kca_module_id, payload.module_id, ctx.recordId), 'module');
    return mutate(`admin/kca/modules/${encodeURIComponent(moduleId)}/publish`, {}, opts);
  }
  if (routeStarts(route, '/admin/kca/modules') && labelIs(label, /create module|add module|save|submit/) && !labelIs(label, /lesson|edit|update|delete|remove|map|publish/)) {
    return mutate(
      'admin/kca/modules',
      {
        code: field(payload, 'code') ?? '',
        title: field(payload, 'title', 'name') ?? '',
        sequence: asInt(field(payload, 'sequence')) ?? 1,
        duration_days: asInt(field(payload, 'duration_days')) ?? 1,
      },
      opts,
    );
  }
  if (
    (routeStarts(route, '/admin/kca/lessons') && labelIs(label, /create|add|save|submit/) && !labelIs(label, /edit|update|delete|remove|chapter/))
    || (routeStarts(route, '/admin/kca/modules') && labelIs(label, /add lesson|create lesson|save lesson/))
  ) {
    const moduleId = requireId(firstUlid(payload.kca_module_id, payload.module_id, ctx.recordId), 'module');
    return mutate(
      `admin/kca/modules/${encodeURIComponent(moduleId)}/lessons`,
      {
        code: field(payload, 'code') ?? '',
        title: field(payload, 'title', 'name') ?? '',
        sequence: asInt(field(payload, 'sequence')) ?? 1,
        lesson_type: field(payload, 'lesson_type') || 'text',
        summary: field(payload, 'summary') || '',
        body: field(payload, 'body') || '',
        content_url: field(payload, 'content_url') || '',
        ...(asInt(field(payload, 'day_index')) !== undefined ? { day_index: asInt(field(payload, 'day_index')) } : {}),
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/chapters', '/admin/kca/lessons') && labelIs(label, /create chapter|add chapter|save chapter/)) {
    const lessonId = requireId(firstUlid(payload.kca_lesson_id, payload.lesson_id, ctx.recordId), 'lesson');
    return mutate(
      `admin/kca/lessons/${encodeURIComponent(lessonId)}/chapters`,
      {
        code: field(payload, 'code') ?? '',
        title: field(payload, 'title', 'name') ?? '',
        sequence: asInt(field(payload, 'sequence')) ?? 1,
        summary: field(payload, 'summary') || '',
        body: field(payload, 'body') || '',
        content_url: field(payload, 'content_url') || '',
      },
      opts,
    );
  }
  if (
    routeStarts(route, '/admin/kca/assignments') &&
    (labelIs(label, /publish assignment|transition assignment/) || field(payload, '__action') === 'publish_assignment')
  ) {
    return mutate(
      `admin/kca/assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'assignment'))}/transitions`,
      { status: kcaAssignmentTransitionStatus(payload, 'assigned') },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/assignments') && labelIs(label, /delete|remove/) && !labelIs(label, /create|add/)) {
    return mutate(
      `admin/kca/assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'assignment'))}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }
  if (routeStarts(route, '/admin/kca/assignments') && labelIs(label, /edit|update/) && !labelIs(label, /create|add|transition|publish/)) {
    const levelsRaw = field(payload, 'soul_tree_levels') ?? '';
    const levels = levelsRaw
      .split(/[,\s]+/)
      .map((part) => Number.parseInt(part, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    const body: Record<string, unknown> = {
      title: field(payload, 'title', 'name') ?? '',
      due_at: field(payload, 'due_at', 'dueDate') || null,
    };
    const moduleId = firstUlid(payload.kca_module_id, payload.module_id);
    const lessonId = firstUlid(payload.kca_lesson_id, payload.lesson_id);
    if (moduleId) body.kca_module_id = moduleId;
    if (lessonId) body.kca_lesson_id = lessonId;
    if (levels.length > 0) body.soul_tree_levels = levels;
    const kind = field(payload, 'assignment_kind');
    if (kind) {
      body.assignment_kind = /soul/i.test(kind)
        ? 'soul_winning'
        : /practical/i.test(kind)
          ? 'practical'
          : /written/i.test(kind)
            ? 'written'
            : 'standard';
    }
    return mutate(
      `admin/kca/assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'assignment'))}`,
      body,
      { ...opts, method: 'PATCH' },
    );
  }
  if (routeStarts(route, '/admin/kca/assignments') && labelIs(label, /create assignment|add assignment|save assignment/)) {
    const levelsRaw = field(payload, 'soul_tree_levels') ?? '';
    const levels = levelsRaw
      .split(/[,\s]+/)
      .map((part) => Number.parseInt(part, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    const audienceRaw = field(payload, 'audience') ?? 'One student';
    const audience = /all/i.test(audienceRaw)
      ? 'all'
      : /cohort/i.test(audienceRaw)
        ? 'cohort'
        : 'student';
    return mutate(
      'admin/kca/assignments',
      {
        audience,
        kca_enrollment_id: audience === 'student'
          ? requireId(firstUlid(payload.kca_enrollment_id, payload.enrollment_id), 'enrollment')
          : (firstUlid(payload.kca_enrollment_id, payload.enrollment_id) ?? null),
        cohort_id: audience === 'cohort'
          ? requireId(firstUlid(payload.cohort_id, payload.kca_cohort_id), 'cohort')
          : (firstUlid(payload.cohort_id, payload.kca_cohort_id) ?? null),
        kca_module_id: requireId(firstUlid(payload.kca_module_id, payload.module_id), 'module'),
        kca_lesson_id: requireId(firstUlid(payload.kca_lesson_id, payload.lesson_id), 'lesson'),
        title: field(payload, 'title', 'name') ?? '',
        assignment_kind: (() => {
          const kind = field(payload, 'assignment_kind') ?? '';
          if (/soul/i.test(kind)) return 'soul_winning';
          if (/practical/i.test(kind)) return 'practical';
          if (/written/i.test(kind)) return 'written';
          return 'standard';
        })(),
        soul_tree_levels: levels,
        due_at: field(payload, 'due_at', 'dueDate') || null,
        as_draft: field(payload, 'as_draft') === 'true' || field(payload, 'as_draft') === 'on',
      },
      opts,
    );
  }
  if (route.includes('/prerequisites') && labelIs(label, /add prerequisite|create prerequisite|save prerequisite|save|submit/)) {
    const moduleId = requireId(firstUlid(payload.kca_module_id, payload.module_id, ctx.recordId), 'module');
    return mutate(
      `admin/kca/modules/${encodeURIComponent(moduleId)}/prerequisites`,
      {
        prerequisite_module_id: requireId(firstUlid(payload.prerequisite_module_id, payload.prerequisite_id, payload.linked_module_id), 'prerequisite module'),
        requirement: field(payload, 'requirement') ?? 'previous_module_complete',
      },
      opts,
    );
  }
  if (route.includes('/prerequisites') && labelIs(label, /remove prerequisite|delete prerequisite|unlink prerequisite|remove/)) {
    return mutate(
      `admin/kca/prerequisites/${encodeURIComponent(requireId(pickRecord(ctx, 'prerequisite_id', 'id'), 'prerequisite'))}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }
  if (routeStarts(route, '/admin/kca/students/register') && labelIs(label, /register|submit|save/)) {
    let applicationData: Record<string, string> = {};
    if (payload.application_data_json) {
      try {
        applicationData = JSON.parse(payload.application_data_json) as Record<string, string>;
      } catch {
        throw new ApiError(422, 'Application data could not be parsed.');
      }
    }
    const createLogin = payload.create_login === 'true';
    return mutate(
      'admin/kca/applications',
      jsonBody({
        application_id: firstUlid(payload.application_id) ?? undefined,
        person_id: firstUlid(payload.person_id) ?? undefined,
        given_name: field(payload, 'given_name') || undefined,
        family_name: field(payload, 'family_name') || undefined,
        email: field(payload, 'email') || undefined,
        phone: field(payload, 'phone') || undefined,
        create_login: createLogin,
        password: createLogin ? field(payload, 'password') || undefined : undefined,
        password_confirmation: createLogin ? field(payload, 'password_confirmation') || undefined : undefined,
        application_data: applicationData,
        finalize: payload.finalize !== 'false',
      }),
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca') && labelIs(label, /record attendance|mark attendance/)) {
    const enrollmentId = requireId(firstUlid(payload.kca_enrollment_id, payload.enrollment_id, ctx.recordId), 'enrollment');
    return mutate(
      `admin/kca/enrollments/${encodeURIComponent(enrollmentId)}/attendance`,
      {
        lesson_id: requireId(firstUlid(payload.lesson_id, payload.kca_lesson_id), 'lesson'),
        status: field(payload, 'status') ?? 'present',
        session_on: field(payload, 'session_on', 'startDate') ?? '',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/assessments') && labelIs(label, /create|add|record|save|submit/)) {
    const audienceRaw = field(payload, 'audience') ?? 'student';
    const audience = /all/i.test(audienceRaw)
      ? 'all'
      : /year/i.test(audienceRaw)
        ? 'year'
        : 'student';
    return mutate(
      'admin/kca/assessment-results',
      {
        audience,
        kca_enrollment_id: firstUlid(payload.kca_enrollment_id, payload.enrollment_id) ?? null,
        year_id: firstUlid(payload.year_id, payload.kca_year_id) ?? null,
        kca_module_id: firstUlid(payload.kca_module_id, payload.module_id) ?? null,
        kca_lesson_id: firstUlid(payload.kca_lesson_id, payload.lesson_id) ?? null,
        assessment_code: field(payload, 'assessment_code', 'title', 'name') ?? '',
        result_code: field(payload, 'result_code', 'result') ?? 'pass',
        score: field(payload, 'score') ?? null,
      },
      opts,
    );
  }
  if (route.includes('/leadership-recommendation') && labelIs(label, /verify/)) {
    const recommendationId = requireId(firstUlid(payload.recommendation_id, ctx.recordId), 'recommendation');
    return mutate(`admin/kca/recommendations/${encodeURIComponent(recommendationId)}/verify`, {}, opts);
  }
  if (
    routeStarts(route, '/admin/kca/applications') &&
    (field(payload, 'action') === 'complete_orientation' || labelIs(label, /complete orientation/))
  ) {
    return mutate(
      `admin/kca/applications/${encodeURIComponent(requireId(pickRecord(ctx, 'application_id', 'id'), 'application'))}/orientation/complete`,
      {},
      opts,
    );
  }
  if (
    routeStarts(route, '/admin/kca/applications') &&
    labelIs(label, /issue admission letter|issue letter/)
  ) {
    return issueKcaAdmissionLetter(
      kcaApplicationId(ctx),
      {
        batch_label: field(payload, 'batch_label', 'batch') ?? undefined,
        letter_body: field(payload, 'letter_body') ?? undefined,
        signer_name: field(payload, 'signer_name') ?? undefined,
        signer_title: field(payload, 'signer_title') ?? undefined,
      },
      ctx.scope,
    );
  }
  if (
    routeStarts(route, '/admin/kca/applications', '/admin/kca/review-queue') &&
    (kcaApplicationStatus(payload) ||
      labelIs(label, /transition|approv|defer|accept|admit|reject|not accepted|decision|submit|edit|update|save|interview|orientation|request info|information required/))
  ) {
    const status =
      kcaApplicationStatus(payload) ??
      (labelIs(label, /request info|information required/)
        ? 'information_required'
        : labelIs(label, /interview|orientation/)
          ? 'interview'
          : labelIs(label, /provisionally/)
            ? 'provisionally_accepted'
            : labelIs(label, /not accepted|reject/)
              ? 'not_accepted'
              : labelIs(label, /defer/)
                ? 'deferred'
                : labelIs(label, /accept|approv|admit/)
                  ? 'accepted'
                  : 'reviewed');
    return mutate(
      `admin/kca/applications/${encodeURIComponent(requireId(pickRecord(ctx, 'application_id', 'id'), 'application'))}/transitions`,
      { status, reason_code: reasonCode(payload) ?? null },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca') && labelIs(label, /enroll/)) {
    const applicationId = requireId(pickRecord(ctx, 'application_id', 'id'), 'application');
    return mutate(
      `admin/kca/applications/${encodeURIComponent(applicationId)}/enrollments`,
      {
        cohort_id: requireId(firstUlid(payload.cohort_id), 'cohort'),
        registration_number: field(payload, 'registration_number', 'code') ?? '',
        starts_on: field(payload, 'starts_on', 'startDate') ?? '',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca') && labelIs(label, /transition assignment/)) {
    return mutate(
      `admin/kca/assignments/${encodeURIComponent(requireId(pickRecord(ctx, 'assignment_id', 'id'), 'assignment'))}/transitions`,
      { status: kcaAssignmentTransitionStatus(payload, 'submitted') },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca') && labelIs(label, /submit evidence|add evidence/)) {
    const assignmentId = requireId(pickRecord(ctx, 'assignment_id', 'id'), 'assignment');
    return mutate(
      `admin/kca/assignments/${encodeURIComponent(assignmentId)}/evidence`,
      {
        enrollment_id: requireId(firstUlid(payload.enrollment_id), 'enrollment'),
        file_asset_id: requireId(firstUlid(payload.file_asset_id, payload.platform_file_id), 'file'),
        submitted_by_person_id: requireId(firstUlid(payload.submitted_by_person_id, payload.person_id, payload.owner_id), 'person'),
      },
      { ...opts, idempotent: true },
    );
  }
  if (routeStarts(route, '/admin/kca/evidence-reviews') && labelIs(label, /review|approv|reject/)) {
    return mutate(
      `admin/kca/evidence/${encodeURIComponent(requireId(pickRecord(ctx, 'evidence_id', 'id'), 'evidence'))}/reviews`,
      {
        reviewer_person_id: requireId(firstUlid(payload.reviewer_person_id, payload.person_id, payload.owner_id), 'reviewer'),
        outcome: field(payload, 'outcome', 'status') ?? (labelIs(label, /reject/) ? 'rejected' : 'accepted'),
      },
      opts,
    );
  }
  if ((routeStarts(route, '/admin/kca/certificates', '/admin/kca/alumni')) && labelIs(label, /issue|create|add|save|submit/)) {
    const enrollmentId = requireId(firstUlid(payload.kca_enrollment_id, payload.enrollment_id, pickRecord(ctx, 'enrollment_id', 'id')), 'enrollment');
    return mutate(
      `admin/kca/enrollments/${encodeURIComponent(enrollmentId)}/certificates`,
      {
        certificate_number: field(payload, 'certificate_number', 'code') ?? '',
        completion_on: field(payload, 'completion_on', 'startDate') ?? '',
        verification_code: field(payload, 'verification_code') ?? '',
      },
      { ...opts, idempotent: true },
    );
  }

  // --- Press ---
  if (routeStarts(route, '/admin/press/publications', '/admin/press/manuscripts', '/admin/press/catalogue') && labelIs(label, /create publication|add publication|submit manuscript|save|submit/) && !route.includes('/translations')) {
    if (!labelIs(label, /isbn|contributor|translation|transition|approv|publish|edit|update|delete|remove|attach|asset|upload/)) {
      const created = await mutate(
        'admin/press/publications',
        jsonBody({
          title: field(payload, 'title', 'name') ?? '',
          publisher_name: field(payload, 'publisher_name') ?? 'Kingdom Press',
          language_code: field(payload, 'language_code', 'language') ?? 'en',
          format: (field(payload, 'format') ?? 'print').toLowerCase(),
          publication_type: (field(payload, 'publication_type', 'type') ?? 'book').toLowerCase().replace(/\s+/g, '_'),
          subtitle: field(payload, 'subtitle') ?? null,
          summary: field(payload, 'summary') ?? null,
          edition: field(payload, 'edition') ?? null,
          publication_date: field(payload, 'publication_date') ?? null,
          category: field(payload, 'category') ?? null,
          description: field(payload, 'description') ?? null,
          as_draft: field(payload, 'as_draft') === 'true' || field(payload, 'as_draft') === 'on' ? true : undefined,
          price_minor: asInt(field(payload, 'price_minor') ?? undefined) ?? null,
          currency_code: field(payload, 'currency_code') ?? null,
          content_file_asset_id: firstUlid(payload.content_file_asset_id) ?? null,
          content_source_url: field(payload, 'content_source_url') || null,
          type_metadata: pressTypeMetadata(payload),
        }),
        { ...opts, idempotent: true },
      );
      await attachPressPublicationAssetIfNeeded(created, payload, scope);
      return created;
    }
  }
  if (routeStarts(route, '/admin/press/publications') && labelIs(label, /edit|update|save publication/) && pickRecord(ctx, 'publication_id', 'id')) {
    const publicationId = requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication');
    const updated = await mutate(
      `admin/press/publications/${encodeURIComponent(publicationId)}`,
      jsonBody({
        title: field(payload, 'title', 'name') ?? '',
        publisher_name: field(payload, 'publisher_name') ?? 'Kingdom Press',
        language_code: field(payload, 'language_code', 'language') ?? 'en',
        format: (field(payload, 'format') ?? 'print').toLowerCase(),
        publication_type: (field(payload, 'publication_type', 'type') ?? 'book').toLowerCase().replace(/\s+/g, '_'),
        subtitle: field(payload, 'subtitle') ?? null,
        summary: field(payload, 'summary') ?? null,
        category: field(payload, 'category') ?? null,
        description: field(payload, 'description') ?? null,
        content_file_asset_id: firstUlid(payload.content_file_asset_id) ?? null,
        content_source_url: field(payload, 'content_source_url') || null,
        type_metadata: pressTypeMetadata(payload),
      }),
      { ...opts, method: 'PUT' },
    );
    await attachPressPublicationAssetIfNeeded({ ...(typeof updated === 'object' && updated ? updated as Record<string, unknown> : {}), id: publicationId }, payload, scope);
    return updated;
  }
  if (routeStarts(route, '/admin/press/publications') && labelIs(label, /attach asset|upload asset|add asset|attach document/)) {
    const publicationId = requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication');
    const fileAssetId = requireId(firstUlid(payload.file_asset_id, payload.content_file_asset_id), 'file');
    return mutate(
      `admin/press/publications/${encodeURIComponent(publicationId)}/assets`,
      {
        file_asset_id: fileAssetId,
        asset_format: (field(payload, 'asset_format', 'format') ?? 'pdf').toLowerCase(),
        is_required: true,
        label: field(payload, 'label') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/press/publications') && labelIs(label, /delete/) && pickRecord(ctx, 'publication_id', 'id')) {
    return mutate(
      `admin/press/publications/${encodeURIComponent(requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication'))}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }
  if (routeStarts(route, '/admin/press') && labelIs(label, /isbn/)) {
    return mutate(
      `admin/press/publications/${encodeURIComponent(requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication'))}/isbn`,
      {
        isbn: field(payload, 'isbn', 'code', 'name') ?? '',
        reason_code: reasonCode(payload, 'isbn_assigned') ?? 'isbn_assigned',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/press/authors') && labelIs(label, /add author|create author|save|submit/) && !labelIs(label, /edit|update/)) {
    return mutate(
      'admin/press/authors',
      {
        person_id: requireId(firstUlid(payload.person_id, payload.owner_id), 'person'),
        display_name: field(payload, 'display_name', 'name', 'fullName') ?? '',
        bio: field(payload, 'bio', 'about') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/press/authors') && labelIs(label, /edit|update|save/) && !labelIs(label, /add|create/)) {
    return mutate(
      `admin/press/authors/${encodeURIComponent(requireId(pickRecord(ctx, 'author_id', 'id'), 'author'))}`,
      {
        display_name: field(payload, 'display_name', 'name', 'fullName') ?? '',
        bio: field(payload, 'bio', 'about') ?? null,
      },
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/press') && labelIs(label, /add contributor|assign contributor/)) {
    return mutate(
      `admin/press/publications/${encodeURIComponent(requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication'))}/contributors`,
      {
        person_id: requireId(firstUlid(payload.person_id, payload.owner_id), 'person'),
        role: (field(payload, 'role') ?? 'author').toLowerCase(),
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/press') && labelIs(label, /submit review|record review/)) {
    return mutate(
      `admin/press/publications/${encodeURIComponent(requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication'))}/reviews`,
      jsonBody({
        stage: field(payload, 'stage') ?? (route.includes('theological') ? 'theological' : route.includes('copy') ? 'copy' : route.includes('design') ? 'design' : 'editorial'),
        decision: field(payload, 'decision') ?? (labelIs(label, /reject/) ? 'rejected' : 'approved'),
        comments: field(payload, 'comments', 'comment') ?? null,
        requested_changes: field(payload, 'requested_changes') ?? null,
        reviewer_person_id: firstUlid(payload.reviewer_person_id, payload.person_id),
      }),
      opts,
    );
  }
  if (routeStarts(route, '/admin/press/publications', '/admin/press/manuscripts', '/admin/press/catalogue') && labelIs(label, /approv|publish|transition|continue|unpublish|archive|reject/)) {
    return mutate(
      `admin/press/publications/${encodeURIComponent(requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication'))}/transitions`,
      {
        status: field(payload, 'status') ?? nextPressPublicationStatus(route, label),
        reason_code: reasonCode(payload, 'publication_reviewed') ?? 'publication_reviewed',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/press/translations', '/admin/press/publications') && labelIs(label, /create translation|add translation|submit translation/)) {
    return mutate(
      `admin/press/publications/${encodeURIComponent(requireId(pickRecord(ctx, 'publication_id', 'id'), 'publication'))}/translations`,
      {
        target_language_code: field(payload, 'target_language_code', 'language_code', 'language') ?? '',
        translated_title: field(payload, 'translated_title', 'title', 'name') ?? '',
        translated_subtitle: field(payload, 'translated_subtitle', 'subtitle') ?? null,
        translated_description: field(payload, 'translated_description', 'description') ?? null,
      },
      { ...opts, idempotent: true },
    );
  }
  if (routeStarts(route, '/admin/press/translations') && labelIs(label, /approv|transition|reject/)) {
    return mutate(
      `admin/press/translations/${encodeURIComponent(requireId(pickRecord(ctx, 'translation_id', 'id'), 'translation'))}/transitions`,
      {
        status: field(payload, 'status') ?? (labelIs(label, /reject/) ? 'rejected' : 'approved'),
        reason_code: reasonCode(payload, 'translation_reviewed') ?? 'translation_reviewed',
      },
      opts,
    );
  }

  // --- Events ---
  if (
    (routeStarts(route, '/admin/settings/events', '/admin/events/create', '/admin/events') || labelIs(label, /create event|add event/))
    && labelIs(label, /create event|add event|save|submit/)
    && !labelIs(label, /update|edit|delete|publish|unpublish/)
  ) {
    const toIso = (value?: string) => {
      if (!value || value.trim() === '') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    };
    return mutate(
      'admin/events',
      {
        name: field(payload, 'name', 'title') ?? '',
        category_code: field(payload, 'category_code', 'category') ?? 'general',
        starts_at: toIso(field(payload, 'starts_at', 'startDate') ?? '') ?? '',
        ends_at: toIso(field(payload, 'ends_at', 'endDate') ?? '') ?? '',
        location_id: firstUlid(payload.location_id) ?? null,
        registration_opens_at: toIso(field(payload, 'registration_opens_at') ?? undefined),
        registration_closes_at: toIso(field(payload, 'registration_closes_at') ?? undefined),
        fee_amount_minor: asInt(field(payload, 'fee_amount_minor', 'amount')) ?? null,
        fee_currency: field(payload, 'fee_currency') ?? null,
        capacity: asInt(field(payload, 'capacity')) ?? null,
        is_important: asBool(field(payload, 'is_important')) ?? false,
        published_at: toIso(field(payload, 'published_at') ?? undefined),
      },
      opts,
    );
  }
  if (
    routeStarts(route, '/admin/settings/events', '/admin/events')
    && labelIs(label, /edit|update|save/)
    && !labelIs(label, /delete|remove|create|add|publish|unpublish|register/)
    && pickRecord(ctx, 'event_id', 'id')
  ) {
    const toIso = (value?: string) => {
      if (!value || value.trim() === '') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    };
    return mutate(
      `admin/events/${encodeURIComponent(requireId(pickRecord(ctx, 'event_id', 'id'), 'event'))}`,
      jsonBody({
        name: field(payload, 'name', 'title'),
        category_code: field(payload, 'category_code', 'category'),
        starts_at: toIso(field(payload, 'starts_at', 'startDate') ?? undefined),
        ends_at: toIso(field(payload, 'ends_at', 'endDate') ?? undefined),
        location_id: firstUlid(payload.location_id) ?? null,
        registration_opens_at: toIso(field(payload, 'registration_opens_at') ?? undefined),
        registration_closes_at: toIso(field(payload, 'registration_closes_at') ?? undefined),
        fee_amount_minor: asInt(field(payload, 'fee_amount_minor', 'amount')) ?? null,
        fee_currency: field(payload, 'fee_currency') ?? null,
        capacity: asInt(field(payload, 'capacity')) ?? null,
        is_important: asBool(field(payload, 'is_important')) ?? false,
        published_at: toIso(field(payload, 'published_at') ?? undefined),
      }),
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/settings/events', '/admin/events') && labelIs(label, /publish event/) && pickRecord(ctx, 'event_id', 'id')) {
    const toIso = (value?: string) => {
      if (!value || value.trim() === '') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    };
    return mutate(
      `admin/events/${encodeURIComponent(requireId(pickRecord(ctx, 'event_id', 'id'), 'event'))}`,
      { published_at: toIso(field(payload, 'published_at') ?? new Date().toISOString()) },
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/settings/events', '/admin/events') && labelIs(label, /unpublish event/) && pickRecord(ctx, 'event_id', 'id')) {
    return mutate(
      `admin/events/${encodeURIComponent(requireId(pickRecord(ctx, 'event_id', 'id'), 'event'))}`,
      { published_at: null },
      { ...opts, method: 'PUT' },
    );
  }
  if (
    routeStarts(route, '/admin/settings/events', '/admin/events')
    && labelIs(label, /delete/)
    && !labelIs(label, /create|add|edit|update/)
    && pickRecord(ctx, 'event_id', 'id')
  ) {
    return mutate(
      `admin/events/${encodeURIComponent(requireId(pickRecord(ctx, 'event_id', 'id'), 'event'))}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }
  if (labelIs(label, /register (for )?event|add registration/)) {
    const eventId = requireId(pickRecord(ctx, 'event_id', 'id'), 'event');
    return mutate(
      `admin/events/${encodeURIComponent(eventId)}/registrations`,
      { person_id: requireId(firstUlid(payload.person_id, payload.owner_id), 'person') },
      { ...opts, idempotent: true },
    );
  }
  if (labelIs(label, /record (event )?attendance/)) {
    return mutate(
      `admin/events/registrations/${encodeURIComponent(requireId(pickRecord(ctx, 'registration_id', 'id'), 'registration'))}/attendance`,
      { source_code: field(payload, 'source_code') ?? 'admin' },
      opts,
    );
  }
  if (labelIs(label, /record (event )?feedback/)) {
    return mutate(
      `admin/events/registrations/${encodeURIComponent(requireId(pickRecord(ctx, 'registration_id', 'id'), 'registration'))}/feedback`,
      { rating: asInt(field(payload, 'rating')) ?? 5 },
      opts,
    );
  }

  // --- KCA orientation sessions ---
  if (
    (routeStarts(route, '/admin/kca/orientation/create', '/admin/kca/orientation') || labelIs(label, /create orientation session|new orientation/))
    && labelIs(label, /create orientation session|new orientation|save|submit/)
    && !labelIs(label, /update|edit|delete|publish|unpublish/)
  ) {
    const toIso = (value?: string) => {
      if (!value || value.trim() === '') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    };
    return mutate(
      'admin/kca/orientation-sessions',
      {
        name: field(payload, 'name', 'title') ?? '',
        cohort_id: firstUlid(payload.cohort_id) ?? null,
        location_id: firstUlid(payload.location_id) ?? null,
        venue_label: field(payload, 'venue_label', 'venue') ?? null,
        starts_at: toIso(field(payload, 'starts_at', 'startDate') ?? '') ?? '',
        ends_at: toIso(field(payload, 'ends_at', 'endDate') ?? undefined),
        capacity: asInt(field(payload, 'capacity')) ?? null,
        notes: field(payload, 'notes') ?? null,
        published_at: toIso(field(payload, 'published_at') ?? undefined),
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/kca/orientation') && labelIs(label, /update orientation session|save session|edit orientation/) && pickRecord(ctx, 'session_id', 'id')) {
    const toIso = (value?: string) => {
      if (!value || value.trim() === '') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    };
    return mutate(
      `admin/kca/orientation-sessions/${encodeURIComponent(requireId(pickRecord(ctx, 'session_id', 'id'), 'session'))}`,
      jsonBody({
        name: field(payload, 'name', 'title'),
        cohort_id: firstUlid(payload.cohort_id) ?? null,
        location_id: firstUlid(payload.location_id) ?? null,
        venue_label: field(payload, 'venue_label', 'venue'),
        starts_at: toIso(field(payload, 'starts_at', 'startDate') ?? undefined),
        ends_at: toIso(field(payload, 'ends_at', 'endDate') ?? undefined),
        capacity: asInt(field(payload, 'capacity')) ?? null,
        notes: field(payload, 'notes'),
        published_at: toIso(field(payload, 'published_at') ?? undefined),
      }),
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/kca/orientation') && labelIs(label, /publish orientation session/) && pickRecord(ctx, 'session_id', 'id')) {
    const toIso = (value?: string) => {
      if (!value || value.trim() === '') return null;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? value : date.toISOString();
    };
    return mutate(
      `admin/kca/orientation-sessions/${encodeURIComponent(requireId(pickRecord(ctx, 'session_id', 'id'), 'session'))}`,
      { published_at: toIso(field(payload, 'published_at') ?? new Date().toISOString()) },
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/kca/orientation') && labelIs(label, /unpublish orientation session/) && pickRecord(ctx, 'session_id', 'id')) {
    return mutate(
      `admin/kca/orientation-sessions/${encodeURIComponent(requireId(pickRecord(ctx, 'session_id', 'id'), 'session'))}`,
      { published_at: null },
      { ...opts, method: 'PUT' },
    );
  }
  if (routeStarts(route, '/admin/kca/orientation') && labelIs(label, /delete orientation session/) && pickRecord(ctx, 'session_id', 'id')) {
    return mutate(
      `admin/kca/orientation-sessions/${encodeURIComponent(requireId(pickRecord(ctx, 'session_id', 'id'), 'session'))}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }

  // --- Finance ---
  if (routeStarts(route, '/admin/finance') && labelIs(label, /payment intent|create intent|charge|collect payment/)) {
    return mutate(
      'admin/finance/payment-intents',
      { event_registration_id: requireId(firstUlid(payload.event_registration_id, payload.registration_id, ctx.recordId), 'event registration') },
      { ...opts, idempotent: true },
    );
  }
  if (routeStarts(route, '/admin/finance') && labelIs(label, /send receipt|issue receipt/)) {
    const transactionId = requireId(
      pickRecord(ctx, 'payment_transaction_id', 'transaction_id', 'id'),
      'transaction',
    );
    return mutate(`admin/finance/payment-transactions/${encodeURIComponent(transactionId)}/receipts`, {}, opts);
  }
  if (routeStarts(route, '/admin/finance') && labelIs(label, /^reconcile$|reconcile transaction|mark reconciled/)) {
    const transactionId = requireId(
      pickRecord(ctx, 'payment_transaction_id', 'transaction_id', 'id'),
      'transaction',
    );
    return mutate(
      `admin/finance/payment-transactions/${encodeURIComponent(transactionId)}/reconciliations`,
      { reason_code: reasonCode(payload, 'manual_admin_reconcile') ?? 'manual_admin_reconcile' },
      opts,
    );
  }
  if (routeStarts(route, '/admin/finance/refunds', '/admin/finance/transactions') && labelIs(label, /refund|process/)) {
    const transactionId = requireId(
      pickRecord(ctx, 'payment_transaction_id', 'transaction_id', 'id'),
      'transaction',
    );
    return mutate(
      `admin/finance/payment-transactions/${encodeURIComponent(transactionId)}/refunds`,
      {
        amount_minor: asInt(field(payload, 'amount_minor', 'amount')) ?? 1,
        reason_code: reasonCode(payload, 'requested_by_admin') ?? 'requested_by_admin',
      },
      { ...opts, idempotent: true },
    );
  }

  // --- Communications ---
  if (routeStarts(route, '/admin/communications/templates') && labelIs(label, /create|add|new template|save|submit/)) {
    return mutate(
      'admin/communications/templates',
      {
        code: field(payload, 'code') ?? '',
        channel: field(payload, 'channel') ?? 'email',
        locale: field(payload, 'locale', 'language_code') ?? 'en',
        subject: field(payload, 'subject', 'title', 'name') ?? '',
        body: field(payload, 'body', 'description', 'notes', 'prompt') ?? '',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/communications/audiences') && labelIs(label, /save audience|create audience|add audience|submit/)) {
    const rules = asObject(field(payload, 'rules'));
    return mutate(
      'admin/communications/audiences',
      {
        code: field(payload, 'code') ?? '',
        name: field(payload, 'name', 'title') ?? '',
        rules: (rules ? [rules] : [{ type: 'all_users', selector_key: null, scope_type: null, scope_key: null }]) as unknown as JsonValue[],
      } as unknown as JsonObject,
      opts,
    );
  }
  if (
    (
      routeStarts(route, '/admin/communications/broadcasts') ||
      routeIncludesComposeChannel(route)
    ) &&
    labelIs(label, /compose|prepare|create|save|submit|send|publish|resolve broadcast/)
  ) {
    if (labelIs(label, /resolve broadcast/)) {
      return mutate(
        `admin/communications/broadcasts/${encodeURIComponent(requireId(pickRecord(ctx, 'broadcast_id', 'id'), 'broadcast'))}/resolve`,
        undefined,
        opts,
      );
    }
    return mutate(
      'admin/communications/broadcasts',
      {
        template_id: requireId(firstUlid(payload.template_id), 'template'),
        audience_id: requireId(firstUlid(payload.audience_id), 'audience'),
        kind: field(payload, 'kind') ?? 'broadcast',
        channel: field(payload, 'channel') ?? 'email',
        purpose: field(payload, 'purpose', 'title', 'name') ?? 'communications.ministry_updates',
        scheduled_at: field(payload, 'scheduled_at') ?? null,
      },
      { ...opts, idempotent: true },
    );
  }
  if (routeStarts(route, '/admin/communications') && labelIs(label, /resolve broadcast|resolve audience/)) {
    return mutate(
      `admin/communications/broadcasts/${encodeURIComponent(requireId(pickRecord(ctx, 'broadcast_id', 'id'), 'broadcast'))}/resolve`,
      undefined,
      opts,
    );
  }
  if (routeStarts(route, '/admin/communications/delivery-queue', '/admin/communications/failed') && labelIs(label, /deliver|retry|attempt/)) {
    // Delivery catalog rows are attempts; the deliver API needs the recipient ULID.
    const recipientId = requireId(firstUlid(payload.recipient_id), 'recipient');
    return mutate(
      `admin/communications/recipients/${encodeURIComponent(recipientId)}/deliveries`,
      {},
      { ...opts, idempotent: true },
    );
  }
  if (routeStarts(route, '/admin/communications') && labelIs(label, /in-app|create notification|notify/)) {
    return mutate(
      `admin/communications/recipients/${encodeURIComponent(requireId(pickRecord(ctx, 'recipient_id', 'id'), 'recipient'))}/notifications`,
      undefined,
      opts,
    );
  }

  // --- Reporting ---
  if ((routeStarts(route, '/admin/alerts', '/admin/finance/alerts', '/admin/security/alerts') || labelIs(label, /alert rule/)) && labelIs(label, /create|add|new|save|submit/)) {
    return mutate(
      'admin/reporting/alert-rules',
      {
        code: field(payload, 'code') ?? '',
        title: field(payload, 'title', 'name') ?? '',
        condition_type: field(payload, 'condition_type', 'category') ?? 'threshold',
        severity: field(payload, 'severity', 'status') ?? 'warning',
        configuration: asObject(field(payload, 'configuration')) ?? { source: field(payload, 'description', 'notes') ?? 'admin' },
        scope_type: field(payload, 'scope_type') ?? null,
        scope_key: field(payload, 'scope_key') ?? null,
      },
      opts,
    );
  }
  if (labelIs(label, /enable alert|disable alert/)) {
    return mutate(
      `admin/reporting/alert-rules/${encodeURIComponent(requireId(pickRecord(ctx, 'alert_rule_id', 'id'), 'alert rule'))}/enabled`,
      { enabled: !labelIs(label, /disable/) },
      opts,
    );
  }
  if (labelIs(label, /evaluate alert/)) {
    return mutate(
      `admin/reporting/alert-rules/${encodeURIComponent(requireId(pickRecord(ctx, 'alert_rule_id', 'id'), 'alert rule'))}/evaluations`,
      {
        condition_reference_type: field(payload, 'condition_reference_type') ?? 'manual',
        condition_reference_key: field(payload, 'condition_reference_key', 'code') ?? 'admin',
        summary: field(payload, 'summary', 'notes') ?? null,
        facts: asObject(field(payload, 'facts')) ?? null,
      },
      opts,
    );
  }
  if (labelIs(label, /acknowledge/)) {
    return mutate(
      `admin/reporting/alert-occurrences/${encodeURIComponent(requireId(pickRecord(ctx, 'occurrence_id', 'id'), 'occurrence'))}/acknowledgement`,
      undefined,
      opts,
    );
  }
  if (labelIs(label, /resolve alert|resolve occurrence/)) {
    return mutate(
      `admin/reporting/alert-occurrences/${encodeURIComponent(requireId(pickRecord(ctx, 'occurrence_id', 'id'), 'occurrence'))}/resolution`,
      { reason_code: reasonCode(payload, 'resolved') ?? 'resolved' },
      opts,
    );
  }

  // --- Privacy ---
  if (routeStarts(route, '/admin/security/privacy-requests', '/admin/security/data-export-requests', '/admin/security/data-deletion-requests') && labelIs(label, /create|add|new request|submit|save/)) {
    const requestType =
      field(payload, 'request_type') ??
      (route.includes('deletion') ? 'deletion' : route.includes('export') ? 'export' : 'export');
    return mutate(
      'admin/privacy/data-subject-requests',
      {
        person_id: requireId(firstUlid(payload.person_id, payload.owner_id, ctx.recordId), 'person'),
        request_type: requestType,
        notes: field(payload, 'notes', 'description') ?? null,
      },
      { ...opts, idempotent: true },
    );
  }
  if (routeStarts(route, '/admin/security/data-export-requests', '/admin/security/privacy-requests') && labelIs(label, /begin export/)) {
    const requestId = requireId(pickRecord(ctx, 'data_subject_request_id', 'id'), 'data-subject request');
    return mutate(
      `admin/privacy/data-subject-requests/${encodeURIComponent(requestId)}/exports/begin`,
      {
        data_categories: asStringArray(field(payload, 'data_categories')) ?? ['profile'],
        scope_type: field(payload, 'scope_type') ?? null,
        scope_key: field(payload, 'scope_key') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/security/data-export-requests', '/admin/security/privacy-requests') && labelIs(label, /complete export/)) {
    const requestId = requireId(pickRecord(ctx, 'data_subject_request_id', 'id'), 'data-subject request');
    return mutate(
      `admin/privacy/data-subject-requests/${encodeURIComponent(requestId)}/exports/complete`,
      {
        file_asset_id: requireId(firstUlid(payload.file_asset_id), 'file'),
        expires_at: field(payload, 'expires_at') ?? '',
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/security/data-export-requests', '/admin/security/privacy-requests') && labelIs(label, /expire export/)) {
    const requestId = requireId(pickRecord(ctx, 'data_subject_request_id', 'id'), 'data-subject request');
    return mutate(`admin/privacy/data-subject-requests/${encodeURIComponent(requestId)}/exports/expire`, undefined, opts);
  }
  if (routeStarts(route, '/admin/security/data-deletion-requests', '/admin/security/privacy-requests') && labelIs(label, /execute deletion|erase|anonymize/)) {
    const requestId = requireId(pickRecord(ctx, 'data_subject_request_id', 'id'), 'data-subject request');
    return mutate(`admin/privacy/data-subject-requests/${encodeURIComponent(requestId)}/erasure`, undefined, opts);
  }
  if (routeStarts(route, '/admin/security/data-deletion-requests', '/admin/security/privacy-requests') && labelIs(label, /record policy denial|deny erasure|reject deletion/)) {
    const requestId = requireId(pickRecord(ctx, 'data_subject_request_id', 'id'), 'data-subject request');
    return mutate(`admin/privacy/data-subject-requests/${encodeURIComponent(requestId)}/erasure-denial`, undefined, opts);
  }

  // --- Safeguarding ---
  if (route.includes('/admin/security/safeguarding/cases') && labelIs(label, /add note|assign|change priority|close case/)) {
    const incidentId = requireId(pickRecord(ctx, 'incident_id', 'id'), 'incident');
    const body: Record<string, unknown> = {};
    if (labelIs(label, /add note/)) body.note = field(payload, 'note', 'notes', 'restricted_summary', 'description') ?? '';
    if (labelIs(label, /assign/)) body.assigned_to_user_id = requireId(firstUlid(payload.assigned_to_user_id, payload.user_id, payload.assignee_id), 'assignee');
    if (labelIs(label, /change priority/)) body.severity = field(payload, 'severity', 'priority') ?? 'medium';
    if (labelIs(label, /close case/)) body.status = 'closed';
    return mutate(`admin/safeguarding/incidents/${encodeURIComponent(incidentId)}`, body, { ...opts, method: 'PATCH' });
  }
  if (routeStarts(route, '/admin/security') && !route.includes('guardian') && !route.includes('child-profiles') && !route.includes('communication-restrictions') && !route.includes('privacy') && !route.includes('data-export') && !route.includes('data-deletion') && !route.includes('configuration') && labelIs(label, /create record|report incident|\+ report incident/)) {
    return mutate(
      'admin/safeguarding/incidents',
      {
        concern_type: field(payload, 'concern_type', 'category', 'name') ?? '',
        severity: field(payload, 'severity', 'status') ?? 'medium',
        restricted_summary: field(payload, 'restricted_summary', 'notes', 'description') ?? '',
        subject_person_id: firstUlid(payload.subject_person_id, payload.person_id) ?? null,
        occurred_at: field(payload, 'occurred_at', 'startDate') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/security/safeguarding') && labelIs(label, /report incident|\+ report incident/) && !labelIs(label, /guardian/)) {
    return mutate(
      'admin/safeguarding/incidents',
      {
        concern_type: field(payload, 'concern_type', 'category', 'name') ?? '',
        severity: field(payload, 'severity', 'status') ?? 'medium',
        restricted_summary: field(payload, 'restricted_summary', 'notes', 'description') ?? '',
        subject_person_id: firstUlid(payload.subject_person_id, payload.person_id) ?? null,
        occurred_at: field(payload, 'occurred_at', 'startDate') ?? null,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/security/child-profiles', '/admin/security/communication-restrictions') && labelIs(label, /register|add|create|save|submit|set restriction/)) {
    return mutate(
      'admin/safeguarding/child-profiles',
      {
        person_id: requireId(firstUlid(payload.person_id, payload.child_person_id, payload.owner_id), 'person'),
        date_of_birth: field(payload, 'date_of_birth') ?? null,
        minor_status: field(payload, 'minor_status') ?? 'confirmed_minor',
        direct_communication_restricted: asBool(field(payload, 'direct_communication_restricted')) ?? true,
        media_use_restricted: asBool(field(payload, 'media_use_restricted')) ?? true,
      },
      opts,
    );
  }
  if (routeStarts(route, '/admin/security/guardian-consent') && labelIs(label, /register|add|create|save|submit/)) {
    return mutate(
      'admin/safeguarding/guardian-relationships',
      {
        guardian_person_id: requireId(firstUlid(payload.guardian_person_id, payload.person_id, payload.owner_id), 'guardian'),
        child_person_id: requireId(firstUlid(payload.child_person_id, payload.assignee_id), 'child'),
        relationship_type: field(payload, 'relationship_type', 'assignment', 'name') ?? 'parent',
      },
      opts,
    );
  }

  // --- Content CMS ---
  if (labelIs(label, /create (content )?page|add page/) || (route.includes('/content') && labelIs(label, /create|add/))) {
    return mutate(
      'admin/content/pages',
      {
        slug: field(payload, 'slug', 'code') ?? '',
        title: field(payload, 'title', 'name') ?? '',
        summary: field(payload, 'summary') ?? null,
        body: field(payload, 'body', 'description', 'notes') ?? '',
        locale: field(payload, 'locale') ?? null,
        published_at: field(payload, 'published_at') ?? null,
      },
      opts,
    );
  }
  if (labelIs(label, /update (content )?page/) || (route.includes('/content') && labelIs(label, /save|update/))) {
    const pageId = requireId(pickRecord(ctx, 'page_id', 'id'), 'page');
    return mutate(
      `admin/content/pages/${encodeURIComponent(pageId)}`,
      jsonBody({
        slug: field(payload, 'slug', 'code'),
        title: field(payload, 'title', 'name'),
        summary: field(payload, 'summary') ?? null,
        body: field(payload, 'body', 'description', 'notes'),
        locale: field(payload, 'locale'),
        published_at: field(payload, 'published_at') ?? null,
      }),
      { ...opts, method: 'PUT' },
    );
  }
  if (labelIs(label, /add (page )?item|create (page )?item/)) {
    const pageId = requireId(pickRecord(ctx, 'page_id', 'id'), 'page');
    return mutate(
      `admin/content/pages/${encodeURIComponent(pageId)}/items`,
      jsonBody({
        kind: field(payload, 'kind', 'category') ?? 'block',
        title: field(payload, 'title', 'name') ?? '',
        body: field(payload, 'body', 'description', 'notes') ?? '',
        href: field(payload, 'href') ?? null,
        sort_order: asInt(field(payload, 'sort_order', 'sequence')),
        published_at: field(payload, 'published_at') ?? null,
      }),
      opts,
    );
  }
  if (labelIs(label, /update (page |content )?item|save (page )?item/)) {
    const pageId = requireId(pickRecord(ctx, 'page_id', 'id'), 'page');
    const itemId = requireId(pickRecord(ctx, 'item_id') ?? ctx.recordId, 'item');
    return mutate(
      `admin/content/pages/${encodeURIComponent(pageId)}/items/${encodeURIComponent(itemId)}`,
      jsonBody({
        kind: field(payload, 'kind', 'category'),
        title: field(payload, 'title', 'name'),
        body: field(payload, 'body', 'description', 'notes'),
        href: field(payload, 'href') ?? null,
        sort_order: asInt(field(payload, 'sort_order', 'sequence')),
        published_at: field(payload, 'published_at') ?? null,
      }),
      { ...opts, method: 'PUT' },
    );
  }
  if (labelIs(label, /delete (page |content )?item|remove (page )?item/)) {
    const pageId = requireId(pickRecord(ctx, 'page_id', 'id'), 'page');
    const itemId = requireId(pickRecord(ctx, 'item_id') ?? ctx.recordId, 'item');
    return mutate(
      `admin/content/pages/${encodeURIComponent(pageId)}/items/${encodeURIComponent(itemId)}`,
      undefined,
      { ...opts, method: 'DELETE' },
    );
  }

  throw new UnregisteredAdminActionError();
}

export async function executeAdminAction(input: AdminActionInput): Promise<AdminActionResult> {
  const ctx: Ctx = {
    route: input.route,
    label: normalizeLabel(input.label),
    payload: input.payload ?? {},
    recordId: extractUlid(input.recordId) ?? extractUlid(input.payload?.id) ?? extractUlid(input.route),
    scope: resolveScope(input.scope),
  };

  const data = await dispatch(ctx);
  return toResult(data);
}
