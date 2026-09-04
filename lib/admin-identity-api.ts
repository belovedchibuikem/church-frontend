import { ApiError, apiRequest, apiRequestResponse } from './api-client.ts';
import { resolveApiV1BaseUrl } from './api-config.ts';
import { sanitizeAdminScopeToken } from './admin-scope.ts';
import type { ApiAdminScope, ApiSuccessEnvelope, JsonObject } from './api-types.ts';

export type AdminScopeHeaders = ApiAdminScope;

export type AdminPagination = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

export type AdminUser = {
  id: string;
  person_id?: string | null;
  name: string;
  email: string;
  email_verified_at?: string | null;
  account_status: 'active' | 'suspended' | string;
  suspension_reason?: string | null;
  suspended_at?: string | null;
  reactivated_at?: string | null;
  created_at?: string | null;
  profile?: {
    given_name?: string | null;
    middle_name?: string | null;
    family_name?: string | null;
    preferred_name?: string | null;
  } | null;
  roles?: Array<{
    assignment_id: string;
    code: string;
    name: string;
    expires_at?: string | null;
    scopes?: Array<{ id: string; type: string; scope_id: string }>;
  }>;
};

export type AdminProfile = {
  person_id: string | null;
  email: string;
  account_status: string | null;
  member_since: string | null;
  last_active_at: string | null;
  roles: string[];
  profile: {
    given_name: string | null;
    middle_name: string | null;
    family_name: string | null;
    preferred_name: string | null;
  };
  preferences: {
    locale: string;
    timezone: string;
  } | null;
};

export function displayNameFromAdminProfile(profile: AdminProfile | null | undefined): string {
  if (!profile) return 'Admin';
  const preferred = profile.profile.preferred_name?.trim();
  if (preferred) return preferred;
  const legal = [profile.profile.given_name, profile.profile.middle_name, profile.profile.family_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');
  return legal || profile.email || 'Admin';
}

export function initialsFromAdminProfile(profile: AdminProfile | null | undefined): string {
  const name = displayNameFromAdminProfile(profile);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? 'AD').toUpperCase();
}

export type AdminRole = {
  id: string;
  code: string;
  name: string;
  assignment_count?: number;
  is_system?: boolean;
  permissions?: Array<{ id: string; code: string }>;
};

export type AdminPermission = {
  id: string;
  code: string;
};

export type AdminScopeAssignment = {
  id: string;
  scope: { type: string; id: string };
  assigned_at?: string | null;
  role_assignment?: {
    id: string;
    role: { id: string; code: string; name: string };
    user: { id: string; name: string; email: string };
    assigned_at?: string | null;
    expires_at?: string | null;
  };
};

export type AdminAuditEvent = {
  id: string;
  actor_user_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  scope_type?: string | null;
  scope_id?: string | null;
  correlation_id?: string | null;
  occurred_at?: string | null;
};

export type AdminAccessDecision = {
  id: string;
  actor_user_id?: string | null;
  permission_code: string;
  scope_type?: string | null;
  scope_id?: string | null;
  allowed: boolean;
  reason_code?: string | null;
  correlation_id?: string | null;
  decided_at?: string | null;
};

export type AssignAdminUserRoleInput = {
  role_id: string;
  expires_at?: string | null;
};

export type AdminRoleAssignment = {
  id: string;
  user_id?: string | null;
  role_id?: string | null;
  role_code?: string | null;
  assigned_at?: string | null;
  expires_at?: string | null;
};

export type AssignAdminRoleAssignmentScopeInput = {
  scope_type: string;
  /** Opaque record ULID. Sent as Laravel `scope_key`. */
  scope_id: string;
};

export type AdminScopeAssignmentWrite = {
  id: string;
  role_assignment_id?: string | null;
  scope_type?: string | null;
  scope_key?: string | null;
};

export type GrantAdminRolePermissionInput = {
  /** Permission record ULID (`permissions.public_id`). */
  permission_id?: string;
  /** Live permission code; resolved to `permission_id` when the ULID is not provided. */
  permission_code?: string;
};

export type AdminRolePermissionGrant = {
  id: string;
  role_id?: string | null;
  permission_id?: string | null;
  permission_code?: string | null;
};

export type AdminListResult<T> = {
  data: T[];
  pagination: AdminPagination;
  correlationId?: string;
};

/** Identity-domain error alias so UI can catch without importing the shared client. */
export class AdminIdentityApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly correlationId?: string;
  readonly details?: JsonObject | Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    code?: string,
    correlationId?: string,
    details?: JsonObject | Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AdminIdentityApiError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.details = details;
  }
}

const DEFAULT_SCOPE: AdminScopeHeaders = { type: 'global', id: 'platform' };

/**
 * Design fixtures are opt-in only. Missing API base must surface real errors, not fake data.
 * Honors FHC_ENABLE_DESIGN_FIXTURES and NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES.
 */
export function designFixturesEnabled(): boolean {
  return (
    process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true' ||
    process.env.NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES === 'true'
  );
}

/** @deprecated Prefer designFixturesEnabled — kept for existing admin UI call sites. */
export function shouldUseDesignFixtures(): boolean {
  return designFixturesEnabled();
}

export function identityApiConfigured(): boolean {
  return Boolean(resolveApiV1BaseUrl());
}

/** Prefer live identity writes when fixtures are off and the API base is configured. */
export function shouldUseIdentityLiveData(): boolean {
  return !designFixturesEnabled() && identityApiConfigured();
}

export function defaultAdminScope(requestedScope?: string): AdminScopeHeaders {
  const token = sanitizeAdminScopeToken(requestedScope);
  if (!token || token === 'global' || token === 'assigned' || token === 'self') {
    return DEFAULT_SCOPE;
  }
  const [type, ...rest] = token.split(':');
  const id = rest.join(':');
  if (type && id) return { type, id };
  return DEFAULT_SCOPE;
}

function buildQuery(
  params?: Record<string, string | number | boolean | undefined>,
  filter?: Record<string, string | boolean | undefined>,
): string {
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === '') continue;
      search.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    }
  }
  if (filter) {
    for (const [key, value] of Object.entries(filter)) {
      if (value === undefined || value === '') continue;
      search.set(`filter[${key}]`, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

function parsePagination(meta: ApiSuccessEnvelope<unknown>['meta'] | undefined): AdminPagination {
  const pagination = (meta?.pagination ?? {}) as Partial<AdminPagination>;
  return {
    current_page: Number(pagination.current_page ?? 1),
    per_page: Number(pagination.per_page ?? 25),
    last_page: Number(pagination.last_page ?? 1),
    total: Number(pagination.total ?? 0),
  };
}

function toIdentityError(error: unknown): never {
  if (error instanceof AdminIdentityApiError) throw error;
  if (error instanceof ApiError) {
    throw new AdminIdentityApiError(error.status, error.message, error.code, error.correlationId, error.details);
  }
  throw new AdminIdentityApiError(500, error instanceof Error ? error.message : 'Admin identity request failed.');
}

async function identityRequest<T>(
  path: string,
  init: RequestInit & { scope?: AdminScopeHeaders; bootstrapCsrf?: boolean } = {},
): Promise<ApiSuccessEnvelope<T>> {
  try {
    return await apiRequest<ApiSuccessEnvelope<T>>(path, {
      ...init,
      scope: init.scope ?? DEFAULT_SCOPE,
      bootstrapCsrf: init.bootstrapCsrf,
    });
  } catch (error) {
    toIdentityError(error);
  }
}

async function listResource<T>(
  path: string,
  options: {
    scope?: AdminScopeHeaders;
    page?: number;
    perPage?: number;
    sort?: string;
    filter?: Record<string, string | boolean | undefined>;
  } = {},
): Promise<AdminListResult<T>> {
  const query = buildQuery(
    {
      page: options.page,
      per_page: options.perPage ?? 25,
      sort: options.sort,
    },
    options.filter,
  );
  const envelope = await identityRequest<T[]>(`${path}${query}`, { scope: options.scope });
  return {
    data: Array.isArray(envelope.data) ? envelope.data : [],
    pagination: parsePagination(envelope.meta),
    correlationId: envelope.correlation_id,
  };
}

/** GET /admin/profile — authenticated administrator's own database-backed profile. */
export async function fetchAdminProfile(): Promise<AdminProfile> {
  const envelope = await identityRequest<AdminProfile>('admin/profile');
  return envelope.data;
}

export function listAdminUsers(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  sort?: string;
  search?: string;
  status?: 'active' | 'suspended';
  emailVerified?: boolean;
  excludeAppMembers?: boolean;
} = {}): Promise<AdminListResult<AdminUser>> {
  return listResource<AdminUser>('admin/users', {
    scope: options.scope,
    page: options.page,
    perPage: options.perPage,
    sort: options.sort ?? '-created_at',
    filter: {
      search: options.search,
      status: options.status,
      email_verified: options.emailVerified,
      exclude_app_members: options.excludeAppMembers,
    },
  });
}

export async function getAdminUser(userId: string, scope?: AdminScopeHeaders): Promise<AdminUser> {
  const envelope = await identityRequest<AdminUser>(`admin/users/${encodeURIComponent(userId)}`, { scope });
  return envelope.data;
}

export async function suspendAdminUser(
  userId: string,
  reason: string,
  scope?: AdminScopeHeaders,
): Promise<AdminUser> {
  const envelope = await identityRequest<AdminUser>(`admin/users/${encodeURIComponent(userId)}/suspension`, {
    method: 'POST',
    scope,
    body: JSON.stringify({ reason }),
  });
  return envelope.data;
}

export async function reactivateAdminUser(userId: string, scope?: AdminScopeHeaders): Promise<AdminUser> {
  const envelope = await identityRequest<AdminUser>(`admin/users/${encodeURIComponent(userId)}/suspension`, {
    method: 'DELETE',
    scope,
  });
  return envelope.data;
}

export async function assignAdminUserRole(
  userId: string,
  input: AssignAdminUserRoleInput,
  scope?: AdminScopeHeaders,
): Promise<AdminRoleAssignment> {
  const expiresAt = input.expires_at?.trim();
  const envelope = await identityRequest<AdminRoleAssignment>(
    `admin/users/${encodeURIComponent(userId)}/role-assignments`,
    {
      method: 'POST',
      scope,
      body: JSON.stringify({
        role_id: input.role_id,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      }),
    },
  );
  return envelope.data;
}

export async function assignAdminRoleAssignmentScope(
  roleAssignmentId: string,
  input: AssignAdminRoleAssignmentScopeInput,
  scope?: AdminScopeHeaders,
): Promise<AdminScopeAssignmentWrite> {
  const envelope = await identityRequest<AdminScopeAssignmentWrite>(
    `admin/access/role-assignments/${encodeURIComponent(roleAssignmentId)}/scopes`,
    {
      method: 'POST',
      scope,
      body: JSON.stringify({
        scope_type: input.scope_type,
        scope_key: input.scope_id,
      }),
    },
  );
  return envelope.data;
}

export async function grantAdminRolePermission(
  roleId: string,
  input: GrantAdminRolePermissionInput,
  scope?: AdminScopeHeaders,
): Promise<AdminRolePermissionGrant> {
  let permissionId = input.permission_id?.trim();
  const permissionCode = input.permission_code?.trim();
  if (!permissionId && permissionCode) {
    const listed = await listAdminPermissions({ scope, perPage: 100, search: permissionCode });
    permissionId = listed.data.find((row) => row.id === permissionCode || row.code === permissionCode)?.id;
  }
  if (!permissionId) {
    throw new AdminIdentityApiError(
      422,
      'A permission record ULID is required to grant a role permission.',
    );
  }
  const envelope = await identityRequest<AdminRolePermissionGrant>(
    `admin/access/roles/${encodeURIComponent(roleId)}/permissions`,
    {
      method: 'POST',
      scope,
      body: JSON.stringify({ permission_id: permissionId }),
    },
  );
  return envelope.data;
}

export function listAdminRoles(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  sort?: string;
  search?: string;
} = {}): Promise<AdminListResult<AdminRole>> {
  return listResource<AdminRole>('admin/access/roles', {
    scope: options.scope,
    page: options.page,
    perPage: options.perPage,
    sort: options.sort ?? 'code',
    filter: { search: options.search },
  });
}

export function listAdminPermissions(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  sort?: string;
  search?: string;
} = {}): Promise<AdminListResult<AdminPermission>> {
  return listResource<AdminPermission>('admin/access/permissions', {
    scope: options.scope,
    page: options.page,
    perPage: options.perPage,
    sort: options.sort ?? 'code',
    filter: { search: options.search },
  });
}

export function listAdminScopeAssignments(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  sort?: string;
  scopeType?: string;
  roleCode?: string;
  user?: string;
} = {}): Promise<AdminListResult<AdminScopeAssignment>> {
  return listResource<AdminScopeAssignment>('admin/access/scope-assignments', {
    scope: options.scope,
    page: options.page,
    perPage: options.perPage,
    sort: options.sort ?? '-created_at',
    filter: {
      scope_type: options.scopeType,
      role_code: options.roleCode,
      user: options.user,
    },
  });
}

export type AdminSecuritySession = {
  id: string;
  actor_user_id?: string | null;
  user_name?: string | null;
  status?: string | null;
  device?: string | null;
  ip_address?: string | null;
  location?: string | null;
  started_at?: string | null;
  last_seen_at?: string | null;
  occurred_at?: string | null;
};

export function listAdminAuditEvents(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  actorId?: string;
  action?: string;
  targetType?: string;
  targetTypes?: string;
  from?: string;
  to?: string;
} = {}): Promise<AdminListResult<AdminAuditEvent>> {
  return listResource<AdminAuditEvent>('admin/security/audit-events', {
    scope: options.scope ?? DEFAULT_SCOPE,
    page: options.page,
    perPage: options.perPage,
    filter: {
      actor_id: options.actorId,
      action: options.action,
      target_type: options.targetType,
      target_types: options.targetTypes,
      from: options.from,
      to: options.to,
    },
  });
}

export async function getAdminAuditEvent(
  id: string,
  scope?: AdminScopeHeaders,
): Promise<AdminAuditEvent> {
  const envelope = await identityRequest<AdminAuditEvent>(
    `admin/security/audit-events/${encodeURIComponent(id)}`,
    { method: 'GET', scope: scope ?? DEFAULT_SCOPE },
  );
  return envelope.data;
}

export async function exportAdminAuditEventCsv(
  id: string,
  scope?: AdminScopeHeaders,
): Promise<Blob> {
  const headers = scope ?? DEFAULT_SCOPE;
  const response = await apiRequestResponse(
    `admin/security/audit-events/${encodeURIComponent(id)}?format=csv`,
    { method: 'GET', scope: headers },
  );
  if (!response.ok) {
    throw new AdminIdentityApiError(response.status, 'Unable to download this audit event.');
  }
  return response.blob();
}

export function listAdminSecuritySessions(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  actorId?: string;
  from?: string;
  to?: string;
} = {}): Promise<AdminListResult<AdminSecuritySession>> {
  return listResource<AdminSecuritySession>('admin/security/sessions', {
    scope: options.scope ?? DEFAULT_SCOPE,
    page: options.page,
    perPage: options.perPage,
    filter: {
      actor_id: options.actorId,
      from: options.from,
      to: options.to,
    },
  });
}

export function listAdminAccessDecisions(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  actorId?: string;
  permissionCode?: string;
  allowed?: boolean;
  from?: string;
  to?: string;
} = {}): Promise<AdminListResult<AdminAccessDecision>> {
  return listResource<AdminAccessDecision>('admin/security/access-decisions', {
    scope: options.scope ?? DEFAULT_SCOPE,
    page: options.page,
    perPage: options.perPage,
    filter: {
      actor_id: options.actorId,
      permission_code: options.permissionCode,
      allowed: options.allowed,
      from: options.from,
      to: options.to,
    },
  });
}

export function formatAccountStatus(status: string): string {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatTimestamp(value?: string | null): string {
  if (!value || value === '—') return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export async function createAdminUser(
  input: {
    email: string;
    profile: {
      given_name: string;
      family_name: string;
      middle_name?: string | null;
      preferred_name?: string | null;
      country?: string | null;
      region?: string | null;
      locality?: string | null;
    };
    role_id?: string | null;
  },
  scope?: AdminScopeHeaders,
): Promise<AdminUser> {
  const envelope = await identityRequest<AdminUser>('admin/users', {
    method: 'POST',
    scope,
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function updateAdminUser(
  userId: string,
  input: { name?: string; profile?: { given_name: string; family_name: string; middle_name?: string | null; preferred_name?: string | null } },
  scope?: AdminScopeHeaders,
): Promise<AdminUser> {
  const envelope = await identityRequest<AdminUser>(`admin/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    scope,
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function requestAdminUserPasswordReset(userId: string, scope?: AdminScopeHeaders): Promise<AdminUser> {
  const envelope = await identityRequest<AdminUser>(`admin/users/${encodeURIComponent(userId)}/password-reset`, {
    method: 'POST',
    scope,
  });
  return envelope.data;
}

export async function getAdminRole(roleId: string, scope?: AdminScopeHeaders): Promise<AdminRole> {
  const envelope = await identityRequest<AdminRole>(`admin/access/roles/${encodeURIComponent(roleId)}`, { scope });
  return envelope.data;
}

export async function createAdminRole(input: { code: string; name: string }, scope?: AdminScopeHeaders): Promise<AdminRole> {
  const envelope = await identityRequest<AdminRole>('admin/access/roles', {
    method: 'POST',
    scope,
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function updateAdminRole(roleId: string, name: string, scope?: AdminScopeHeaders): Promise<AdminRole> {
  const envelope = await identityRequest<AdminRole>(`admin/access/roles/${encodeURIComponent(roleId)}`, {
    method: 'PATCH',
    scope,
    body: JSON.stringify({ name }),
  });
  return envelope.data;
}

export async function archiveAdminRole(roleId: string, scope?: AdminScopeHeaders): Promise<void> {
  await identityRequest<unknown>(`admin/access/roles/${encodeURIComponent(roleId)}`, {
    method: 'DELETE',
    scope,
  });
}

export type AdminWorkItem = {
  id: string;
  title: string;
  body?: string | null;
  status: string;
  priority: string;
  due_at?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  assigned_to?: { id: string; name: string; email: string } | null;
  created_by?: { id: string; name: string } | null;
};

export function listAdminWorkItems(options: {
  scope?: AdminScopeHeaders;
  page?: number;
  perPage?: number;
  sort?: string;
  search?: string;
  status?: string;
  assignedTo?: string;
} = {}): Promise<AdminListResult<AdminWorkItem>> {
  return listResource<AdminWorkItem>('admin/administration/work-items', {
    scope: options.scope,
    page: options.page,
    perPage: options.perPage,
    sort: options.sort ?? '-created_at',
    filter: { search: options.search, status: options.status, assigned_to: options.assignedTo },
  });
}

export async function createAdminWorkItem(
  input: { title: string; body?: string | null; priority?: string; due_at?: string | null; assigned_to_user_id?: string | null },
  scope?: AdminScopeHeaders,
): Promise<AdminWorkItem> {
  const envelope = await identityRequest<AdminWorkItem>('admin/administration/work-items', {
    method: 'POST',
    scope,
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function updateAdminWorkItem(
  id: string,
  input: Partial<{ title: string; body: string | null; priority: string; due_at: string | null; assigned_to_user_id: string | null; status: string }>,
  scope?: AdminScopeHeaders,
): Promise<AdminWorkItem> {
  const envelope = await identityRequest<AdminWorkItem>(`admin/administration/work-items/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    scope,
    body: JSON.stringify(input),
  });
  return envelope.data;
}

export async function archiveAdminWorkItem(id: string, scope?: AdminScopeHeaders): Promise<AdminWorkItem> {
  const envelope = await identityRequest<AdminWorkItem>(`admin/administration/work-items/${encodeURIComponent(id)}/archive`, {
    method: 'POST',
    scope,
  });
  return envelope.data;
}

export async function exportAdminAuditCsv(scope?: AdminScopeHeaders): Promise<Blob> {
  const headers = scope ?? DEFAULT_SCOPE;
  const response = await apiRequestResponse('admin/security/audit-events?format=csv', {
    method: 'GET',
    scope: headers,
  });
  if (!response.ok) {
    throw new AdminIdentityApiError(response.status, 'Unable to export audit events.');
  }
  return response.blob();
}

export function identityErrorMessage(error: unknown): string {
  if (error instanceof AdminIdentityApiError) {
    if (error.status === 401) return 'Sign in with an admin session to load this directory.';
    if (error.status === 403) return error.message || 'Permission or recent MFA verification required for this action.';
    return error.message + (error.correlationId ? ` (${error.correlationId})` : '');
  }
  return 'Unable to reach the admin identity API.';
}
