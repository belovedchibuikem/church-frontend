import {
  CORRELATION_HEADER,
  joinApiUrl,
  resolveApiBaseUrl,
} from '@/lib/api-config';
import type { ApiErrorEnvelope, ApiSuccessEnvelope, JsonObject } from '@/lib/api-types';

export class PublicApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: Record<string, unknown> = {},
    public correlationId?: string,
  ) {
    super(message);
    this.name = 'PublicApiError';
  }
}

export type PublicRequestOptions = {
  method?: 'GET' | 'POST';
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: JsonObject;
  idempotencyKey?: string;
  correlationId?: string;
  signal?: AbortSignal;
  /** Skip throwing when API base is missing; return null instead. */
  optional?: boolean;
};

function requireBaseUrl(): string {
  const base = resolveApiBaseUrl();
  if (!base) {
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  return base;
}

function buildUrl(path: string, query?: PublicRequestOptions['query']): string {
  const url = new URL(joinApiUrl(requireBaseUrl(), path));
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

export async function publicRequest<T>(path: string, options: PublicRequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  const correlationId = options.correlationId ?? (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : undefined);
  if (correlationId) headers[CORRELATION_HEADER] = correlationId;
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: 'no-store',
    });
  } catch (error) {
    throw new PublicApiError(
      503,
      'NETWORK_ERROR',
      error instanceof Error ? error.message : 'Unable to reach the public API.',
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiSuccessEnvelope<T>
    | ApiErrorEnvelope
    | null;

  if (!response.ok) {
    const envelope = payload && 'error' in payload ? payload : null;
    throw new PublicApiError(
      response.status,
      envelope?.error.code ?? 'REQUEST_FAILED',
      envelope?.error.message ?? 'The public API rejected this request.',
      (envelope?.error.details as Record<string, unknown> | undefined) ?? {},
      envelope?.correlation_id ?? response.headers.get('x-correlation-id') ?? undefined,
    );
  }

  if (!payload || !('data' in payload)) {
    throw new PublicApiError(502, 'INVALID_ENVELOPE', 'The public API returned an unexpected response.');
  }

  return (payload as ApiSuccessEnvelope<T>).data;
}

export async function publicRequestOptional<T>(
  path: string,
  options: PublicRequestOptions = {},
): Promise<T | null> {
  if (!resolveApiBaseUrl()) return null;
  try {
    return await publicRequest<T>(path, options);
  } catch (error) {
    if (error instanceof PublicApiError && error.code === 'API_NOT_CONFIGURED') return null;
    throw error;
  }
}

export function isPublicApiConfigured(): boolean {
  return resolveApiBaseUrl() !== null;
}
