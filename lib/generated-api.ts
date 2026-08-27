/**
 * Generated Family House Connect API clients.
 *
 * Instantiates `FamilyHousePublicApiClient` / `FamilyHouseProtectedApiClient`
 * from `api/clients/typescript`. Existing wrappers (`public-api.ts`,
 * `api-client.ts`, `*-api.ts`) stay the app-facing surface.
 *
 * Relative imports are used instead of a `file:` package: the TypeScript
 * client package (`@family-house-connect/public-api-client`) has no exports
 * map for public vs protected entrypoints.
 */
import { FamilyHousePublicApiClient } from '../../../../api/clients/typescript/src/public-api.ts';
import { FamilyHouseProtectedApiClient } from '../../../../api/clients/typescript/src/protected-api.ts';
import {
  browserProtectedOptions,
  requireGeneratedClientBaseUrl,
} from './api-client.ts';
import type { BrowserProtectedOptions } from './api-types.ts';

export {
  FamilyHousePublicApiClient,
  PublicApiError as GeneratedPublicApiError,
  type HealthData,
  type PublicApiRequestOptions,
  type SuccessEnvelope as PublicSuccessEnvelope,
} from '../../../../api/clients/typescript/src/public-api.ts';

export {
  FamilyHouseProtectedApiClient,
  ProtectedApiError as GeneratedProtectedApiError,
  type ProtectedRequestOptions,
} from '../../../../api/clients/typescript/src/protected-api.ts';

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
