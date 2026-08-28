import { ApiError, apiRequest, ensureCsrfCookie as ensureCsrfCookieShared, toApiError } from '@/lib/api-client';
import {
  BROWSER_SESSION_COOKIE,
  CSRF_COOKIE_PATH,
  PUBLIC_API_V1_URL_ENV,
  resolveApiV1BaseUrl,
} from '@/lib/api-config';
import type { ApiErrorEnvelope, ApiSuccessEnvelope, JsonObject } from '@/lib/api-types';

/** Browser session cookie documented in OpenAPI (`cookieSession`). */
export { BROWSER_SESSION_COOKIE, CSRF_COOKIE_PATH };

export class AuthApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string[]> = {},
    public correlationId?: string,
  ) {
    super(message);
    this.name = 'AuthApiError';
  }

  /** First validation message for a field, if present. */
  fieldMessage(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }

  /** Flat list of validation messages for banners. */
  allFieldMessages(): string[] {
    return Object.values(this.fieldErrors).flat();
  }
}

export type BrowserUser = {
  person_id: string | null;
  email: string;
  email_verified_at: string | null;
  profile: {
    given_name: string | null;
    middle_name: string | null;
    family_name: string | null;
    preferred_name: string | null;
    country?: string | null;
    region?: string | null;
    locality?: string | null;
  };
};

export type AuthSessionMeta = {
  email_verification_required?: boolean;
  api_version?: string;
  timestamp?: string;
};

export type RegisterBrowserUserInput = {
  profile: {
    given_name: string;
    middle_name?: string | null;
    family_name: string;
    preferred_name?: string | null;
    country?: string | null;
    region?: string | null;
    locality?: string | null;
  };
  email: string;
  password: string;
  password_confirmation: string;
};

export type MfaEnrollment = {
  method_id: string;
  method_type: string;
  secret: string;
  provisioning_uri: string;
  recovery_codes: string[];
};

export type MfaConfirmResult = {
  method_id: string;
  method_type: string;
  verified_at: string;
  recovery_codes_remaining?: number;
};

export type MfaChallengeResult = {
  mfa_verified_at: string;
  valid_until: string;
};

type AuthRequestOptions = {
  method?: 'GET' | 'POST';
  body?: JsonObject;
  query?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
  /** Skip CSRF bootstrap (e.g. already ensured in the same flow). */
  skipCsrf?: boolean;
};

function requireBaseUrl(): string {
  const base = resolveApiV1BaseUrl();
  if (!base) {
    throw new AuthApiError(
      503,
      'API_NOT_CONFIGURED',
      `Set ${PUBLIC_API_V1_URL_ENV} (…/api/v1) or NEXT_PUBLIC_FHC_API_BASE_URL (origin) to use authentication.`,
    );
  }
  return base;
}

function parseFieldErrors(details: unknown): Record<string, string[]> {
  if (!details || typeof details !== 'object') return {};
  const fields = (details as { fields?: unknown }).fields;
  if (!fields || typeof fields !== 'object') return {};
  const out: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(fields as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      out[key] = value.map(String);
    } else if (typeof value === 'string') {
      out[key] = [value];
    }
  }
  return out;
}

function withQuery(path: string, query?: AuthRequestOptions['query']): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

function toAuthApiError(error: unknown): AuthApiError {
  if (error instanceof AuthApiError) return error;

  const apiError = error instanceof ApiError ? error : toApiError(error);
  if (apiError) {
    return new AuthApiError(
      apiError.status,
      apiError.code ?? 'REQUEST_FAILED',
      apiError.message,
      apiError.errors ?? parseFieldErrors(apiError.details),
      apiError.correlationId,
    );
  }

  if (error instanceof Error) {
    return new AuthApiError(503, 'NETWORK_ERROR', error.message);
  }

  return new AuthApiError(503, 'NETWORK_ERROR', 'Unable to reach the authentication API.');
}

/**
 * GET /auth/csrf-cookie — establishes `family_house_connect_session` + `XSRF-TOKEN`.
 * Delegates to the shared api-client bootstrap (credentials include).
 */
export async function ensureCsrfCookie(signal?: AbortSignal): Promise<void> {
  requireBaseUrl();
  try {
    await ensureCsrfCookieShared(false);
  } catch (error) {
    if (signal?.aborted) {
      throw new AuthApiError(499, 'ABORTED', 'CSRF bootstrap was aborted.');
    }
    throw toAuthApiError(error);
  }
}

async function authRequest<T>(path: string, options: AuthRequestOptions = {}): Promise<ApiSuccessEnvelope<T>> {
  requireBaseUrl();
  const method = options.method ?? 'GET';

  try {
    return await apiRequest<ApiSuccessEnvelope<T>>(withQuery(path, options.query), {
      method,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      credentials: 'include',
      cache: 'no-store',
      bootstrapCsrf: options.skipCsrf ? false : undefined,
    });
  } catch (error) {
    throw toAuthApiError(error);
  }
}

export async function loginBrowserUser(input: {
  email: string;
  password: string;
  remember?: boolean;
}): Promise<{ user: BrowserUser; meta: AuthSessionMeta }> {
  const body: JsonObject = {
    email: input.email.trim().toLowerCase(),
    password: input.password,
  };
  if (input.remember !== undefined) body.remember = input.remember;

  const envelope = await authRequest<BrowserUser>('auth/login', { method: 'POST', body });
  return { user: envelope.data, meta: envelope.meta as AuthSessionMeta };
}

export async function registerBrowserUser(
  input: RegisterBrowserUserInput,
): Promise<{ user: BrowserUser; meta: AuthSessionMeta }> {
  const envelope = await authRequest<BrowserUser>('auth/register', {
    method: 'POST',
    body: {
      profile: {
        given_name: input.profile.given_name.trim(),
        middle_name: input.profile.middle_name?.trim() || null,
        family_name: input.profile.family_name.trim(),
        preferred_name: input.profile.preferred_name?.trim() || null,
        country: input.profile.country?.trim().toUpperCase() || null,
        region: input.profile.region?.trim() || null,
        locality: input.profile.locality?.trim() || null,
      },
      email: input.email.trim().toLowerCase(),
      password: input.password,
      password_confirmation: input.password_confirmation,
    },
  });
  return { user: envelope.data, meta: envelope.meta as AuthSessionMeta };
}

export async function requestPasswordReset(email: string): Promise<void> {
  await authRequest<{ password_reset_request_accepted: boolean }>('auth/password/forgot', {
    method: 'POST',
    body: { email: email.trim().toLowerCase() },
  });
}

export async function resetPassword(input: {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}): Promise<void> {
  await authRequest<{ password_reset: boolean }>('auth/password/reset', {
    method: 'POST',
    body: {
      email: input.email.trim().toLowerCase(),
      token: input.token,
      password: input.password,
      password_confirmation: input.password_confirmation,
    },
  });
}

export async function logoutBrowserUser(): Promise<void> {
  await authRequest<{ authenticated: boolean }>('auth/logout', { method: 'POST' });
  // Force a fresh CSRF bootstrap on the next mutating call after session end.
  await ensureCsrfCookieShared(true).catch(() => undefined);
}

export async function sendEmailVerificationNotification(): Promise<void> {
  await authRequest<{ verification_request_accepted: boolean }>('auth/email/verification-notification', {
    method: 'POST',
  });
}

/**
 * GET /auth/email/verify/{id}/{hash}?expires=&signature=
 * Consumes Laravel's signed verification URL (same shape as the email link).
 */
export async function verifyEmail(input: {
  id: string;
  hash: string;
  expires: string;
  signature: string;
}): Promise<void> {
  await authRequest<{ email_verified: boolean }>(
    `auth/email/verify/${encodeURIComponent(input.id)}/${encodeURIComponent(input.hash)}`,
    {
      method: 'GET',
      query: {
        expires: input.expires,
        signature: input.signature,
      },
    },
  );
}

/**
 * GET /user/me — requires an active verified cookie session.
 * Used to confirm email verification and member session state (no fake success).
 */
export async function fetchBrowserUser(): Promise<BrowserUser> {
  const envelope = await authRequest<BrowserUser>('user/me', { method: 'GET' });
  return envelope.data;
}

export async function setupMfaTotp(label?: string): Promise<MfaEnrollment> {
  const body: JsonObject = {};
  if (label?.trim()) body.label = label.trim();
  const envelope = await authRequest<MfaEnrollment>('auth/mfa/totp/setup', { method: 'POST', body });
  return envelope.data;
}

export async function confirmMfaTotp(input: { method_id: string; code: string }): Promise<MfaConfirmResult> {
  const envelope = await authRequest<MfaConfirmResult>('auth/mfa/totp/confirm', {
    method: 'POST',
    body: { method_id: input.method_id, code: input.code },
  });
  return envelope.data;
}

export async function challengeMfa(input: {
  code?: string;
  recovery_code?: string;
  method_id?: string;
}): Promise<MfaChallengeResult> {
  const body: JsonObject = {};
  if (input.code) body.code = input.code;
  if (input.recovery_code) body.recovery_code = input.recovery_code;
  if (input.method_id) body.method_id = input.method_id;
  const envelope = await authRequest<MfaChallengeResult>('auth/mfa/challenge', { method: 'POST', body });
  return envelope.data;
}

export function isAuthApiConfigured(): boolean {
  return resolveApiV1BaseUrl() !== null;
}

export function formatAuthError(error: unknown): string {
  if (error instanceof AuthApiError) {
    if (error.code === 'CSRF_TOKEN_MISMATCH') {
      return 'Your sign-in session expired. Hard-refresh the page (Ctrl+Shift+R), then sign in again.';
    }
    const fields = error.allFieldMessages();
    if (fields.length) return fields[0] ?? error.message;
    return error.message;
  }
  if (error instanceof ApiError) {
    if (error.code === 'CSRF_TOKEN_MISMATCH') {
      return 'Your sign-in session expired. Hard-refresh the page (Ctrl+Shift+R), then sign in again.';
    }
    if (error.errors) {
      const first = Object.values(error.errors).flat()[0];
      if (first) return first;
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

/** Narrow envelope helper for callers that already hold a parsed body. */
export function authErrorFromEnvelope(status: number, envelope: ApiErrorEnvelope): AuthApiError {
  return new AuthApiError(
    status,
    envelope.error.code,
    envelope.error.message,
    parseFieldErrors(envelope.error.details),
    envelope.correlation_id,
  );
}
