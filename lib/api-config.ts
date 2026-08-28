/**
 * API URL and browser-auth constants for Family House Connect.
 *
 * Env conventions (both supported; prefer documenting both in .env):
 * - NEXT_PUBLIC_FHC_API_BASE_URL — origin only (e.g. `https://api.example.org`).
 *   Matches `api/clients/INTEGRATION.md` / generated TypeScript clients
 *   (`FamilyHousePublicApiClient` / `FamilyHouseProtectedApiClient`), which append `/api/v1/...`.
 * - NEXT_PUBLIC_FHC_API_URL — v1 base (e.g. `https://api.example.org/api/v1`).
 *   Used by browser fetches and this module’s `apiRequest` path joins.
 * - FHC_LARAVEL_API_URL — server-only v1 base (RSC / route handlers). Same shape as NEXT_PUBLIC_FHC_API_URL.
 *
 * Production: set these from deploy env. There is no localhost fallback — unresolved env → null.
 * Browser auth: cookie `family_house_connect_session` + CSRF via GET …/auth/csrf-cookie, then `X-XSRF-TOKEN`.
 * Local loopback: the browser talks to same-origin `/api/v1` (Vite/Next proxies to Laravel) so the
 * session cookie is first-party on the site port and survives refresh. RSC still uses FHC_LARAVEL_API_URL.
 */

/** Server-side Laravel `/api/v1` base (RSC / route handlers). */
export const SERVER_API_URL_ENV = 'FHC_LARAVEL_API_URL';

/** Browser `/api/v1` base (client components, cookie + CSRF). */
export const PUBLIC_API_V1_URL_ENV = 'NEXT_PUBLIC_FHC_API_URL';

/** Browser API origin for generated clients (`api/clients/typescript`). */
export const PUBLIC_API_BASE_URL_ENV = 'NEXT_PUBLIC_FHC_API_BASE_URL';

/** Relative to the v1 API base. Mounted via web.php → browser-auth.php. */
export const CSRF_COOKIE_PATH = 'auth/csrf-cookie';

/** OpenAPI cookieSession name for browser auth (Laravel `SESSION_COOKIE` should match in deploy). */
export const BROWSER_SESSION_COOKIE = 'family_house_connect_session';

export const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
export const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';
/** Plain session token from GET /auth/csrf-cookie (`data.csrf_token`). */
export const CSRF_HEADER_NAME = 'X-CSRF-TOKEN';
export const CORRELATION_HEADER = 'X-Correlation-ID';
export const SCOPE_TYPE_HEADER = 'X-Scope-Type';
export const SCOPE_ID_HEADER = 'X-Scope-ID';

const API_V1_SUFFIX = '/api/v1';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Origin for generated clients (`new FamilyHouse*ApiClient(origin)`).
 * Accepts host-only or `/api/v1` URLs from any of the supported env vars.
 */
export function resolveApiOrigin(): string | null {
  for (const value of apiEnvCandidates()) {
    const origin = toApiOrigin(value);
    if (origin) return preferSameOriginBrowserApi(alignLoopbackHost(origin));
  }
  return null;
}

/**
 * Absolute `/api/v1` base for `apiRequest` path joins (`…/api/v1` + `user/me`).
 * Accepts host-only or `/api/v1` URLs from any of the supported env vars.
 */
export function resolveApiV1BaseUrl(): string | null {
  for (const value of apiEnvCandidates()) {
    const v1 = toApiV1BaseUrl(value);
    if (v1) return preferSameOriginBrowserApi(alignLoopbackHost(v1));
  }
  return null;
}

/** @deprecated Prefer resolveApiV1BaseUrl — kept as a clear alias for callers. */
export function resolveApiBaseUrl(): string | null {
  return resolveApiV1BaseUrl();
}

function apiEnvCandidates(): Array<string | undefined> {
  if (typeof window === 'undefined') {
    return [
      process.env.FHC_LARAVEL_API_URL,
      process.env.NEXT_PUBLIC_FHC_API_URL,
      process.env.NEXT_PUBLIC_FHC_API_BASE_URL,
    ];
  }
  return [process.env.NEXT_PUBLIC_FHC_API_URL, process.env.NEXT_PUBLIC_FHC_API_BASE_URL];
}

export function normalizeApiBaseUrl(value: string | undefined | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, '');
}

/** Strip a trailing `/api/v1` (any casing of path) to get the API host origin. */
export function toApiOrigin(value: string | undefined | null): string | null {
  const normalized = normalizeApiBaseUrl(value);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    const path = url.pathname.replace(/\/+$/, '') || '';
    if (path === '' || path === '/') {
      return url.origin;
    }
    if (/\/api\/v1$/i.test(path)) {
      return url.origin;
    }
    // Unexpected path — still return origin so generated clients can append /api/v1/...
    return url.origin;
  } catch {
    return null;
  }
}

/** Ensure a `/api/v1` absolute base whether the env is origin-only or already v1. */
export function toApiV1BaseUrl(value: string | undefined | null): string | null {
  const origin = toApiOrigin(value);
  if (!origin) return null;

  const normalized = normalizeApiBaseUrl(value);
  if (normalized) {
    try {
      const path = new URL(normalized).pathname.replace(/\/+$/, '') || '';
      if (/\/api\/v1$/i.test(path)) {
        return `${origin}${API_V1_SUFFIX}`;
      }
    } catch {
      /* fall through */
    }
  }

  return `${origin}${API_V1_SUFFIX}`;
}

/** Join `/api/v1` base + relative path without dropping the v1 prefix. */
export function joinApiUrl(baseUrl: string, path: string): string {
  const base = normalizeApiBaseUrl(baseUrl) ?? baseUrl;
  const relative = path.replace(/^\/+/, '');
  return `${base}/${relative}`;
}

export function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

/**
 * localhost and 127.0.0.1 are different sites. Cookie login fails if the page
 * is on one and the API env points at the other. Keep loopback hosts in lockstep.
 */
export function alignLoopbackHost(value: string): string {
  if (!isBrowserRuntime()) return value;
  try {
    const url = new URL(value);
    const pageHost = window.location.hostname;
    if (LOOPBACK_HOSTS.has(url.hostname) && LOOPBACK_HOSTS.has(pageHost) && url.hostname !== pageHost) {
      url.hostname = pageHost;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return value;
  }
}

/**
 * Browser-only API base rewrite for cookie sessions.
 *
 * Local: site :3000 + Laravel :8000 are cross-origin — rewrite to same-origin `/api/v1`
 * (Vite dev proxy → Laravel) so `family_house_connect_session` survives refresh/RSC.
 *
 * Production: frontend (e.g. Vercel) + API on another host has the same problem if the
 * browser calls the API origin directly. Rewrite to `${page.origin}/api/v1` and proxy
 * `/api/**` to Laravel in `nitro.config.ts` (see `.env.example`).
 */
export function preferSameOriginBrowserApi(value: string): string {
  if (!isBrowserRuntime()) return value;
  try {
    const url = new URL(value);
    const page = window.location;
    if (url.origin === page.origin) return value.replace(/\/$/, '');

    const path = url.pathname.replace(/\/+$/, '') || '';
    const isV1Base = path === '' || path === '/' || /\/api\/v1$/i.test(path);

    // Loopback cross-port (localhost:3000 ↔ localhost:8000).
    if (LOOPBACK_HOSTS.has(url.hostname) && LOOPBACK_HOSTS.has(page.hostname) && isV1Base) {
      return `${page.origin}/api/v1`;
    }

    // Split deploy: browser must not call the API host directly or RSC gating loses the session.
    if (isV1Base) {
      return `${page.origin}/api/v1`;
    }

    return value;
  } catch {
    return value;
  }
}

/** @deprecated Use preferSameOriginBrowserApi */
export const preferSameOriginLoopback = preferSameOriginBrowserApi;

export function isMutatingMethod(method: string | undefined): boolean {
  const normalized = (method ?? 'GET').toUpperCase();
  return normalized !== 'GET' && normalized !== 'HEAD' && normalized !== 'OPTIONS';
}
