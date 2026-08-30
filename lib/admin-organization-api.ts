import { ApiError, apiRequest } from './api-client.ts';
import { resolveApiV1BaseUrl } from './api-config.ts';
import type { ApiAdminScope, ApiSuccessEnvelope, JsonObject } from './api-types.ts';

export type AdminScope = ApiAdminScope;

export const GLOBAL_ADMIN_SCOPE: AdminScope = { type: 'global', id: 'platform' };

export type AdminCountry = {
  id: string;
  iso_code: string;
  name: string;
  created_at: string | null;
};

export type AdminAdministrativeLevel = {
  id: string;
  country_id?: string;
  code: string;
  name: string;
  sort_order: number;
};

export type AdminAdministrativeUnit = {
  id: string;
  name: string;
  reference_code: string | null;
  country?: { id: string; iso_code: string; name: string };
  administrative_level?: { id: string; code: string; name: string; sort_order: number };
  parent?: { id: string; name: string } | null;
  created_at: string | null;
};

export type AdminLocation = {
  id: string;
  name: string;
  country?: { id: string; iso_code: string; name: string };
  administrative_unit?: { id: string; name: string } | null;
  address?: {
    line_one: string | null;
    line_two: string | null;
    locality: string | null;
    postal_code: string | null;
  };
  timezone: string;
  coordinates?: { latitude: number; longitude: number } | null;
  created_at: string | null;
};

export type CreateCountryInput = { iso_code: string; name: string };
export type CreateLevelInput = { code: string; name: string; sort_order: number };
export type CreateUnitInput = {
  country_id: string;
  administrative_level_id: string;
  name: string;
  parent_id?: string | null;
  reference_code?: string | null;
};
export type MoveUnitInput = { parent_id: string | null };
export type CreateLocationInput = {
  country_id: string;
  name: string;
  timezone: string;
  administrative_unit_id?: string | null;
  address_line_one?: string | null;
  address_line_two?: string | null;
  locality?: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

export type OrganizationListQuery = {
  search?: string;
  countryId?: string;
  levelId?: string;
  parentId?: string;
  administrativeUnitId?: string;
  timezone?: string;
  sort?: string;
  page?: number;
  perPage?: number;
};

export class OrganizationApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: Record<string, unknown>;
  readonly correlationId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {},
    correlationId?: string,
  ) {
    super(message);
    this.name = 'OrganizationApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
  }

  get needsMfa(): boolean {
    return (
      this.status === 403 &&
      (/mfa/i.test(this.code) || /mfa/i.test(this.message) || this.code === 'RECENT_MFA_REQUIRED')
    );
  }
}

export type OrganizationRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: JsonObject;
  scope?: AdminScope;
  signal?: AbortSignal;
  correlationId?: string;
};

function buildQueryString(query?: OrganizationRequestOptions['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

function listQueryParams(query: OrganizationListQuery = {}): Record<string, string | number | undefined> {
  return {
    'filter[search]': query.search,
    'filter[country_id]': query.countryId,
    'filter[level_id]': query.levelId,
    'filter[parent_id]': query.parentId,
    'filter[administrative_unit_id]': query.administrativeUnitId,
    'filter[timezone]': query.timezone,
    sort: query.sort,
    page: query.page,
    per_page: query.perPage ?? 100,
  };
}

function toOrganizationError(error: unknown): never {
  if (error instanceof OrganizationApiError) throw error;
  if (error instanceof ApiError) {
    throw new OrganizationApiError(
      error.status,
      error.code ?? 'REQUEST_FAILED',
      error.message,
      (error.details as Record<string, unknown> | undefined) ?? {},
      error.correlationId,
    );
  }
  throw new OrganizationApiError(
    500,
    'REQUEST_FAILED',
    error instanceof Error ? error.message : 'Organization request failed.',
  );
}

/**
 * Cookie session + X-Scope-* + CSRF (mutations). Laravel also requires recent MFA
 * on `/admin/organization/*`. Returns the full success envelope.
 */
export async function organizationRequest<T>(
  path: string,
  options: OrganizationRequestOptions = {},
): Promise<ApiSuccessEnvelope<T>> {
  const method = options.method ?? 'GET';
  const scope = options.scope ?? GLOBAL_ADMIN_SCOPE;
  try {
    return await apiRequest<ApiSuccessEnvelope<T>>(`${path}${buildQueryString(options.query)}`, {
      method,
      scope,
      signal: options.signal,
      correlationId: options.correlationId,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    toOrganizationError(error);
  }
}

async function paginateAll<T>(
  path: string,
  query: OrganizationListQuery,
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<T[]> {
  const items: T[] = [];
  let page = query.page ?? 1;
  let lastPage = 1;

  do {
    const envelope = await organizationRequest<T[]>(path, {
      ...options,
      query: listQueryParams({ ...query, page, perPage: query.perPage ?? 100 }),
    });
    items.push(...(envelope.data ?? []));
    const pagination = envelope.meta?.pagination as PaginationMeta | undefined;
    lastPage = pagination?.last_page ?? 1;
    page += 1;
  } while (page <= lastPage);

  return items;
}

export type OrganizationPage<T> = {
  items: T[];
  pagination: PaginationMeta;
};

/** Single-page list (no auto-walk). Use for search-selects and load-more UIs. */
export async function listOrganizationPage<T>(
  path: string,
  query: OrganizationListQuery = {},
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<OrganizationPage<T>> {
  const page = query.page ?? 1;
  const perPage = query.perPage ?? 20;
  const envelope = await organizationRequest<T[]>(path, {
    ...options,
    query: listQueryParams({ ...query, page, perPage }),
  });
  const pagination = (envelope.meta?.pagination as PaginationMeta | undefined) ?? {
    current_page: page,
    per_page: perPage,
    last_page: 1,
    total: Array.isArray(envelope.data) ? envelope.data.length : 0,
  };
  return {
    items: Array.isArray(envelope.data) ? envelope.data : [],
    pagination,
  };
}

export function isOrganizationApiConfigured(): boolean {
  return resolveApiV1BaseUrl() !== null;
}

/**
 * Design fixtures are opt-in only. Missing API base must surface real errors, not fake hierarchy data.
 * Aligns with platform/ops/catalog/identity gating.
 */
export function designFixturesEnabled(): boolean {
  return (
    process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true' ||
    process.env.NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES === 'true'
  );
}

/** @deprecated Prefer designFixturesEnabled — kept for existing hierarchy/admin call sites. */
export function shouldUseOrganizationFixtures(): boolean {
  return designFixturesEnabled();
}

export async function listCountries(
  query: OrganizationListQuery = {},
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminCountry[]> {
  return paginateAll<AdminCountry>('admin/organization/countries', { sort: 'name', ...query }, options);
}

export async function listCountriesPage(
  query: OrganizationListQuery = {},
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<OrganizationPage<AdminCountry>> {
  return listOrganizationPage<AdminCountry>(
    'admin/organization/countries',
    { sort: 'name', perPage: 20, ...query },
    options,
  );
}

export async function createCountry(
  body: CreateCountryInput,
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminCountry> {
  const envelope = await organizationRequest<AdminCountry>('admin/organization/countries', {
    method: 'POST',
    body: body as unknown as JsonObject,
    ...options,
  });
  return envelope.data;
}

export async function listLevels(
  countryId: string,
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminAdministrativeLevel[]> {
  const envelope = await organizationRequest<AdminAdministrativeLevel[]>(
    `admin/organization/countries/${encodeURIComponent(countryId)}/levels`,
    options,
  );
  return envelope.data ?? [];
}

export async function createLevel(
  countryId: string,
  body: CreateLevelInput,
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminAdministrativeLevel> {
  const envelope = await organizationRequest<AdminAdministrativeLevel>(
    `admin/organization/countries/${encodeURIComponent(countryId)}/levels`,
    { method: 'POST', body: body as unknown as JsonObject, ...options },
  );
  return envelope.data;
}

export async function listUnits(
  query: OrganizationListQuery = {},
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminAdministrativeUnit[]> {
  return paginateAll<AdminAdministrativeUnit>('admin/organization/units', { sort: 'name', ...query }, options);
}

export async function listUnitsPage(
  query: OrganizationListQuery = {},
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<OrganizationPage<AdminAdministrativeUnit>> {
  return listOrganizationPage<AdminAdministrativeUnit>(
    'admin/organization/units',
    { sort: 'name', perPage: 20, ...query },
    options,
  );
}

export async function createUnit(
  body: CreateUnitInput,
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminAdministrativeUnit> {
  const envelope = await organizationRequest<AdminAdministrativeUnit>('admin/organization/units', {
    method: 'POST',
    body: {
      country_id: body.country_id,
      administrative_level_id: body.administrative_level_id,
      name: body.name,
      parent_id: body.parent_id ?? null,
      reference_code: body.reference_code ?? null,
    },
    ...options,
  });
  return envelope.data;
}

export async function moveUnit(
  unitId: string,
  body: MoveUnitInput,
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminAdministrativeUnit> {
  const envelope = await organizationRequest<AdminAdministrativeUnit>(
    `admin/organization/units/${encodeURIComponent(unitId)}/parent`,
    { method: 'PATCH', body: { parent_id: body.parent_id }, ...options },
  );
  return envelope.data;
}

export async function listLocations(
  query: OrganizationListQuery = {},
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminLocation[]> {
  return paginateAll<AdminLocation>('admin/organization/locations', { sort: 'name', ...query }, options);
}

export async function listLocationsPage(
  query: OrganizationListQuery = {},
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<OrganizationPage<AdminLocation>> {
  return listOrganizationPage<AdminLocation>(
    'admin/organization/locations',
    { sort: 'name', perPage: 20, ...query },
    options,
  );
}

export async function createLocation(
  body: CreateLocationInput,
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<AdminLocation> {
  const envelope = await organizationRequest<AdminLocation>('admin/organization/locations', {
    method: 'POST',
    body: body as unknown as JsonObject,
    ...options,
  });
  return envelope.data;
}

export type OrganizationHierarchySnapshot = {
  countries: AdminCountry[];
  units: AdminAdministrativeUnit[];
  locations: AdminLocation[];
  levelsByCountry: Record<string, AdminAdministrativeLevel[]>;
};

/** Load countries, units, locations, and per-country levels for hierarchy UI. */
export async function loadOrganizationHierarchy(
  options: Pick<OrganizationRequestOptions, 'scope' | 'signal'> = {},
): Promise<OrganizationHierarchySnapshot> {
  const [countries, units, locations] = await Promise.all([
    listCountries({}, options),
    listUnits({}, options),
    listLocations({}, options),
  ]);

  const levelsByCountry: Record<string, AdminAdministrativeLevel[]> = {};
  await Promise.all(
    countries.map(async (country) => {
      levelsByCountry[country.id] = await listLevels(country.id, options);
    }),
  );

  return { countries, units, locations, levelsByCountry };
}

export function countriesToSelectOptions(countries: AdminCountry[]) {
  return countries.map((country) => ({
    value: country.id,
    label: country.name,
    meta: country.iso_code,
  }));
}

export function unitsToSelectOptions(units: AdminAdministrativeUnit[]) {
  return units.map((unit) => ({
    value: unit.id,
    label: unit.name,
    meta: unit.administrative_level?.name ?? unit.reference_code ?? undefined,
  }));
}

export function locationsToSelectOptions(locations: AdminLocation[]) {
  return locations.map((location) => ({
    value: location.id,
    label: location.name,
    meta: location.administrative_unit?.name ?? location.timezone,
  }));
}

export function levelsToSelectOptions(levels: AdminAdministrativeLevel[]) {
  return levels.map((level) => ({
    value: level.id,
    label: level.name,
    meta: `${level.code} · order ${level.sort_order}`,
  }));
}

export function organizationErrorMessage(error: unknown): string {
  if (error instanceof OrganizationApiError) {
    if (error.needsMfa) {
      return 'Recent MFA is required for organization APIs. Complete MFA, then retry.';
    }
    if (error.status === 401) {
      return 'Sign in as an admin with organization permissions and a recent MFA challenge.';
    }
    if (error.status === 404 || error.code === 'RESOURCE_NOT_FOUND') {
      return (
        'Location/unit was not found in your current admin scope. ' +
        'Pick a country and administrative unit that match your scope (or use Global), then retry.'
      );
    }
    return error.message;
  }
  if (error instanceof ApiError) {
    if (error.status === 403 && /mfa/i.test(`${error.code ?? ''} ${error.message}`)) {
      return 'Recent MFA is required for organization APIs. Complete MFA, then retry.';
    }
    if (error.status === 404) {
      return (
        'Location/unit was not found in your current admin scope. ' +
        'Pick a country and administrative unit that match your scope (or use Global), then retry.'
      );
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Unable to load organization data.';
}
