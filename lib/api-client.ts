import {
  CORRELATION_HEADER,
  CSRF_COOKIE_PATH,
  CSRF_HEADER_NAME,
  SCOPE_ID_HEADER,
  SCOPE_TYPE_HEADER,
  XSRF_COOKIE_NAME,
  XSRF_HEADER_NAME,
  isBrowserRuntime,
  isMutatingMethod,
  joinApiUrl,
  resolveApiOrigin,
  resolveApiV1BaseUrl,
} from './api-config.ts';
import { normalizeLocale } from './i18n/lookup.ts';
import { readStoredLocale } from './i18n/persist.ts';
import type {
  ApiErrorEnvelope,
  ApiRequestInit,
  ApiSuccessEnvelope,
  BrowserProtectedOptions,
  JsonObject,
  LaravelMessageErrorBody,
} from './api-types.ts';

export type {
  ApiAdminScope,
  ApiErrorEnvelope,
  ApiRequestInit,
  ApiSuccessEnvelope,
  BrowserProtectedOptions,
  JsonObject,
  JsonValue,
  LaravelMessageErrorBody,
} from './api-types.ts';

export {
  BROWSER_SESSION_COOKIE,
  CSRF_COOKIE_PATH,
  PUBLIC_API_BASE_URL_ENV,
  PUBLIC_API_V1_URL_ENV,
  SERVER_API_URL_ENV,
  joinApiUrl,
  resolveApiBaseUrl,
  resolveApiOrigin,
  resolveApiV1BaseUrl,
} from './api-config.ts';

/**
 * Transport foundation for FE workers.
 *
 * Prefer generated operation methods via `lib/generated-api.ts`
 * (`createPublicApiClient` / `createProtectedApi` wrapping
 * `api/clients/typescript/src/public-api.ts` and `protected-api.ts`).
 * Construct those with `requireGeneratedClientBaseUrl()` (origin) and pass
 * `await browserProtectedOptions({ scope })` for cookie+CSRF (+ admin scope).
 *
 * Use `apiRequest` / `apiRequestData` for paths not yet on the generated clients
 * (e.g. browser `/auth/*` via `lib/auth-api.ts`).
 *
 * Browser defaults: `credentials: 'include'`, CSRF bootstrap for mutating cookie-session calls.
 * Base URL comes only from env (`resolveApiV1BaseUrl`) — no hardcoded production host.
 */

export class ApiError extends Error {
  readonly status: number;
  readonly correlationId?: string;
  readonly code?: string;
  readonly details?: JsonObject;
  /** Validation field errors (`error.details.fields` or classic `errors`). */
  readonly errors?: Record<string, string[]>;
  readonly envelope?: ApiErrorEnvelope;

  constructor(
    status: number,
    message: string,
    correlationId?: string,
    init: {
      code?: string;
      details?: JsonObject;
      errors?: Record<string, string[]>;
      envelope?: ApiErrorEnvelope;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.correlationId = correlationId;
    this.code = init.code;
    this.details = init.details;
    this.errors = init.errors;
    this.envelope = init.envelope;
  }
}

function requireV1BaseUrl(): string {
  const baseUrl = resolveApiV1BaseUrl();
  if (!baseUrl) {
    throw new ApiError(
      503,
      'The platform API is not configured. Set FHC_LARAVEL_API_URL or NEXT_PUBLIC_FHC_API_URL (…/api/v1), or NEXT_PUBLIC_FHC_API_BASE_URL (origin only).',
    );
  }
  return baseUrl;
}

/** Plain CSRF token from GET /auth/csrf-cookie. Cookie is not readable cross-origin. */
let cachedCsrfToken: string | undefined;

function csrfTokenFromEnvelope(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') return undefined;
  const data = (body as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return undefined;
  const token = (data as { csrf_token?: unknown }).csrf_token;
  return typeof token === 'string' && token !== '' ? token : undefined;
}

/** Read the decrypted Laravel `XSRF-TOKEN` cookie (browser only; same-origin only). */
export function readXsrfToken(): string | undefined {
  if (!isBrowserRuntime()) return undefined;
  const prefix = `${XSRF_COOKIE_NAME}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(prefix)) continue;
    try {
      return decodeURIComponent(trimmed.slice(prefix.length));
    } catch {
      return trimmed.slice(prefix.length);
    }
  }
  return undefined;
}

/**
 * GET `/api/v1/auth/csrf-cookie` with credentials so Laravel sets
 * `family_house_connect_session` + `XSRF-TOKEN`. Uses `data.csrf_token` for
 * the `X-CSRF-TOKEN` header because the cookie is not visible to JS on another port.
 */
export async function ensureCsrfCookie(force = false): Promise<string | undefined> {
  if (!isBrowserRuntime()) return undefined;

  if (!force && cachedCsrfToken) return cachedCsrfToken;

  const baseUrl = requireV1BaseUrl();
  const response = await fetch(joinApiUrl(baseUrl, CSRF_COOKIE_PATH), {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  const correlationId =
    response.headers.get(CORRELATION_HEADER) ?? response.headers.get('x-correlation-id') ?? undefined;

  if (!response.ok) {
    throw await buildApiError(response, correlationId);
  }

  try {
    const token = csrfTokenFromEnvelope(await response.json());
    if (token) {
      cachedCsrfToken = token;
      return token;
    }
  } catch {
    /* cookie fallback via X-XSRF-TOKEN */
  }

  return cachedCsrfToken;
}

/**
 * Options for generated `FamilyHouseProtectedApiClient` methods:
 * credentials are already `include` on that client; this supplies CSRF + optional admin scope.
 */
export async function browserProtectedOptions(
  init: BrowserProtectedOptions & { bootstrapCsrf?: boolean } = {},
): Promise<BrowserProtectedOptions> {
  const { bootstrapCsrf = true, bearerToken, csrfToken: existingToken, ...rest } = init;
  let csrfToken = existingToken;

  if (!bearerToken && bootstrapCsrf && isBrowserRuntime() && !csrfToken) {
    csrfToken = await ensureCsrfCookie();
  }

  return {
    ...rest,
    bearerToken,
    csrfToken,
  };
}

function headersFromInit(init: ApiRequestInit): Headers {
  return new Headers(init.headers);
}

function isFormDataBody(body: BodyInit | null | undefined): boolean {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

/** Shared cookie-session fetch: CSRF, credentials, error envelope. Caller owns the Response body. */
async function executeApiRequest(path: string, init: ApiRequestInit = {}): Promise<Response> {
  const baseUrl = requireV1BaseUrl();
  const {
    xsrfToken: _xsrfToken,
    bootstrapCsrf: _bootstrapCsrf,
    correlationId,
    bearerToken,
    deviceIdentifier,
    scope,
    credentials,
    cache,
    ...rest
  } = init;

  const headers = headersFromInit(init);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  if (!headers.has('Accept-Language')) {
    const stored = readStoredLocale();
    const fromDocument =
      typeof document !== 'undefined' ? document.documentElement?.lang : '';
    headers.set('Accept-Language', stored ?? normalizeLocale(fromDocument || undefined));
  }
  if (rest.body != null && !headers.has('Content-Type') && !isFormDataBody(rest.body)) {
    headers.set('Content-Type', 'application/json');
  }
  if (correlationId) headers.set(CORRELATION_HEADER, correlationId);
  if (bearerToken) headers.set('Authorization', `Bearer ${bearerToken}`);
  if (deviceIdentifier) headers.set('X-Device-Identifier', deviceIdentifier);
  if (scope) {
    headers.set(SCOPE_TYPE_HEADER, scope.type);
    headers.set(SCOPE_ID_HEADER, scope.id);
  }

  await resolveCsrfHeader(init, headers);

  const response = await fetch(joinApiUrl(baseUrl, path), {
    ...rest,
    headers,
    credentials: credentials ?? 'include',
    cache: cache ?? 'no-store',
  });

  const responseCorrelationId =
    response.headers.get(CORRELATION_HEADER) ?? response.headers.get('x-correlation-id') ?? undefined;

  if (!response.ok) {
    throw await buildApiError(response, responseCorrelationId);
  }

  return response;
}

async function resolveCsrfHeader(init: ApiRequestInit, headers: Headers): Promise<void> {
  if (init.bearerToken || headers.has('Authorization')) return;
  if (headers.has(CSRF_HEADER_NAME) || headers.has(XSRF_HEADER_NAME)) return;

  const explicit = init.xsrfToken;
  if (explicit) {
    headers.set(CSRF_HEADER_NAME, explicit);
    return;
  }

  const shouldBootstrap =
    init.bootstrapCsrf !== false && isBrowserRuntime() && isMutatingMethod(init.method);

  if (!shouldBootstrap) {
    applyCsrfHeaders(headers, cachedCsrfToken);
    return;
  }

  const token = await ensureCsrfCookie();
  applyCsrfHeaders(headers, token);
}

function applyCsrfHeaders(headers: Headers, plainToken?: string): void {
  if (plainToken) headers.set(CSRF_HEADER_NAME, plainToken);
  const encrypted = readXsrfToken();
  if (encrypted) headers.set(XSRF_HEADER_NAME, encrypted);
}

function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  if (!value || typeof value !== 'object') return false;
  const error = (value as ApiErrorEnvelope).error;
  return !!error && typeof error === 'object' && typeof error.message === 'string';
}

function fieldErrorsFromDetails(details: JsonObject | undefined): Record<string, string[]> | undefined {
  if (!details) return undefined;
  const fields = details.fields;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return undefined;
  return fields as Record<string, string[]>;
}

async function buildApiError(response: Response, headerCorrelationId?: string): Promise<ApiError> {
  let correlationId = headerCorrelationId;
  let message = 'The authoritative API rejected this request.';
  let code: string | undefined;
  let details: JsonObject | undefined;
  let errors: Record<string, string[]> | undefined;
  let envelope: ApiErrorEnvelope | undefined;

  try {
    const body: unknown = await response.json();
    if (isApiErrorEnvelope(body)) {
      envelope = body;
      message = body.error.message || message;
      code = body.error.code;
      details = body.error.details;
      errors = fieldErrorsFromDetails(details);
      if (typeof body.correlation_id === 'string') correlationId = correlationId ?? body.correlation_id;
    } else if (body && typeof body === 'object') {
      const classic = body as LaravelMessageErrorBody;
      if (typeof classic.message === 'string' && classic.message.trim()) message = classic.message;
      if (classic.errors && typeof classic.errors === 'object') errors = classic.errors;
      if (typeof classic.correlation_id === 'string') correlationId = correlationId ?? classic.correlation_id;
    }
  } catch {
    /* non-JSON body */
  }

  return new ApiError(response.status, message, correlationId, { code, details, errors, envelope });
}

/**
 * Low-level JSON request against the Laravel `/api/v1` base.
 * Browser defaults: `credentials: 'include'`, CSRF for mutating cookie-session calls.
 * FormData bodies skip `Content-Type` so the runtime can set the multipart boundary.
 */
export async function apiRequest<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const response = await executeApiRequest(path, init);

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

/** Like `apiRequest` but unwraps `{ data }` from the FHC success envelope. */
export async function apiRequestData<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const envelope = await apiRequest<ApiSuccessEnvelope<T>>(path, init);
  return envelope.data;
}

/**
 * Multipart request (typically POST). Does not set JSON Content-Type.
 * Unwraps `{ data }` from the FHC success envelope.
 */
export async function apiRequestForm<T>(
  path: string,
  formData: FormData,
  init: Omit<ApiRequestInit, 'body'> = {},
): Promise<T> {
  return apiRequestData<T>(path, {
    method: 'POST',
    ...init,
    body: formData,
  });
}

/**
 * Cookie-session fetch that returns the raw `Response` (blobs / file downloads).
 * Still throws `ApiError` on non-OK JSON error envelopes.
 */
export async function apiRequestResponse(path: string, init: ApiRequestInit = {}): Promise<Response> {
  return executeApiRequest(path, init);
}

export function unwrapApiData<T>(envelope: ApiSuccessEnvelope<T>): T {
  return envelope.data;
}

/** Map thrown errors (including generated PublicApiError / ProtectedApiError shapes) into ApiError. */
export function toApiError(error: unknown): ApiError | null {
  if (error instanceof ApiError) return error;

  if (error && typeof error === 'object' && 'status' in error && 'envelope' in error) {
    const status = (error as { status: unknown }).status;
    const envelope = (error as { envelope: unknown }).envelope;
    if (typeof status === 'number' && isApiErrorEnvelope(envelope)) {
      return new ApiError(status, envelope.error.message, envelope.correlation_id, {
        code: envelope.error.code,
        details: envelope.error.details,
        errors: fieldErrorsFromDetails(envelope.error.details),
        envelope,
      });
    }
  }

  return null;
}

/**
 * Origin string for `new FamilyHousePublicApiClient(baseUrl)` /
 * `new FamilyHouseProtectedApiClient(baseUrl)` from `api/clients/typescript`.
 */
export function requireGeneratedClientBaseUrl(): string {
  const origin = resolveApiOrigin();
  if (!origin) {
    throw new ApiError(
      503,
      'Set NEXT_PUBLIC_FHC_API_BASE_URL (origin) or NEXT_PUBLIC_FHC_API_URL / FHC_LARAVEL_API_URL (…/api/v1).',
    );
  }
  return origin.endsWith('/') ? origin : `${origin}/`;
}
