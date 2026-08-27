/**
 * Envelope and request types aligned with generated clients:
 * - api/clients/typescript/src/public-api.ts
 * - api/clients/typescript/src/protected-api.ts
 */

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

/** Success envelope from `App\Support\Api\ApiResponse::success` (matches generated clients). */
export type ApiSuccessEnvelope<T> = {
  data: T;
  meta: JsonObject;
  correlation_id: string;
};

/** Error envelope from `App\Support\Api\ApiResponse::error` (matches generated clients). */
export type ApiErrorEnvelope = {
  error: {
    code: string;
    message: string;
    details: JsonObject;
  };
  meta: JsonObject;
  correlation_id: string;
};

/** Classic Laravel `{ message, errors }` body (fallback when envelope is absent). */
export type LaravelMessageErrorBody = {
  message?: string;
  errors?: Record<string, string[]>;
  correlation_id?: string;
};

/** Admin / scoped protected calls need both headers (see maps settings, OpenAPI). */
export type ApiAdminScope = {
  type: string;
  id: string;
};

export type ApiRequestInit = RequestInit & {
  /**
   * Explicit XSRF token. In the browser, omitted tokens are read from `XSRF-TOKEN`
   * after `ensureCsrfCookie()` for mutating cookie-session calls.
   */
  xsrfToken?: string;
  /** Bootstrap CSRF for mutating browser calls. Default: true in the browser when no bearer. */
  bootstrapCsrf?: boolean;
  /** Echoed by Laravel as `X-Correlation-ID` / `correlation_id`. */
  correlationId?: string;
  /** Mobile-style bearer auth. When set, CSRF is skipped (API mirrors this rule). */
  bearerToken?: string;
  /** Device id for mobile credential APIs (`X-Device-Identifier`). */
  deviceIdentifier?: string;
  /** Admin scope headers (`X-Scope-Type` + `X-Scope-ID`). */
  scope?: ApiAdminScope;
};

/** Options shape compatible with generated `ProtectedRequestOptions`. */
export type BrowserProtectedOptions = {
  correlationId?: string;
  query?: Record<string, string | number | boolean | undefined>;
  csrfToken?: string;
  bearerToken?: string;
  deviceIdentifier?: string;
  scope?: ApiAdminScope;
  signal?: AbortSignal;
};
