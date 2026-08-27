/**
 * Generated Family House Connect API clients.
 *
 * This adapter intentionally lives within the web deployment root. Importing
 * TypeScript sources from `api/clients` crosses the Vercel/Vite project
 * boundary and fails SSR bundling; the app-facing API wrappers remain the
 * canonical integration surface.
 */
import {
  browserProtectedOptions,
  requireGeneratedClientBaseUrl,
} from './api-client.ts';
import type { BrowserProtectedOptions, JsonObject } from './api-types.ts';

export type HealthData = { status: 'ok'; service: 'family-house-connect-api' };
export type PublicApiRequestOptions = { signal?: AbortSignal };
export type ProtectedRequestOptions = BrowserProtectedOptions;
export type PublicSuccessEnvelope<T> = { data: T; meta: JsonObject; correlation_id: string };

export class GeneratedPublicApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly envelope: { error: { code: string; message: string; details?: JsonObject }; correlation_id: string },
  ) {
    super(envelope.error.message);
  }
}

export class GeneratedProtectedApiError extends Error {}

export class FamilyHousePublicApiClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: typeof fetch = globalThis.fetch) {}

  async getHealth(options: PublicApiRequestOptions = {}): Promise<PublicSuccessEnvelope<HealthData>> {
    const response = await this.fetcher(`${this.baseUrl.replace(/\/$/, '')}/api/v1/health`, {
      headers: { Accept: 'application/json' },
      signal: options.signal,
    });
    const body = await response.json() as PublicSuccessEnvelope<HealthData> | { error?: { code?: string; message?: string; details?: JsonObject }; correlation_id?: string };
    if (!response.ok || !('data' in body)) {
      const errorBody = body as { error?: { code?: string; message?: string; details?: JsonObject }; correlation_id?: string };
      throw new GeneratedPublicApiError(response.status, {
        error: {
          code: errorBody.error?.code ?? 'PUBLIC_API_ERROR',
          message: errorBody.error?.message ?? 'The public API request failed.',
          details: errorBody.error?.details,
        },
        correlation_id: errorBody.correlation_id ?? '',
      });
    }
    return body;
  }
}

export class FamilyHouseProtectedApiClient {
  constructor(private readonly baseUrl: string, private readonly fetcher: typeof fetch = globalThis.fetch) {}
}

export { browserProtectedOptions };

export function createPublicApiClient(
  fetcher: typeof fetch = globalThis.fetch,
): FamilyHousePublicApiClient {
  return new FamilyHousePublicApiClient(requireGeneratedClientBaseUrl(), fetcher);
}

export function createProtectedApiClient(
  fetcher: typeof fetch = globalThis.fetch,
): FamilyHouseProtectedApiClient {
  return new FamilyHouseProtectedApiClient(requireGeneratedClientBaseUrl(), fetcher);
}

/** Generated protected client plus cookie/CSRF (+ optional admin scope) options. */
export async function createProtectedApi(
  init: BrowserProtectedOptions & { bootstrapCsrf?: boolean } = {},
): Promise<{
  client: FamilyHouseProtectedApiClient;
  options: BrowserProtectedOptions;
}> {
  return {
    client: createProtectedApiClient(),
    options: await browserProtectedOptions(init),
  };
}
