import {
  apiRequest,
  apiRequestData,
  apiRequestForm,
  apiRequestResponse,
  ApiError,
  type ApiSuccessEnvelope,
} from './api-client.ts';
import { resolveApiV1BaseUrl } from './api-config.ts';
import type { ApiAdminScope, JsonObject, JsonValue } from './api-types.ts';

/** Global admin scope required by platform maps/storage and most platform settings calls. */
export const PLATFORM_GLOBAL_SCOPE: ApiAdminScope = { type: 'global', id: 'platform' };

export type AdminScope = ApiAdminScope;

export type PlatformConfiguration = {
  id: string;
  key: string;
  value_type: 'string' | 'integer' | 'boolean' | 'json';
  classification: 'internal' | 'confidential';
  environment: string;
  scope: AdminScope | null;
  value: JsonValue;
  has_value: boolean;
  updated_at: string | null;
};

export type UpsertPlatformConfigurationInput = {
  key: string;
  value_type: 'string' | 'integer' | 'boolean' | 'json';
  classification: 'internal' | 'confidential';
  value: JsonValue;
  environment: string;
  scope_type?: string | null;
  scope_id?: string | null;
};

export type FeatureFlag = {
  id: string;
  key: string;
  environment: string;
  scope: AdminScope | null;
  enabled: boolean;
  rollout_percentage: number;
  starts_at: string | null;
  ends_at: string | null;
  updated_at: string | null;
};

export type UpsertFeatureFlagInput = {
  key: string;
  environment: string;
  rollout_percentage: number;
  scope_type?: string | null;
  scope_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
};

export type ObjectStorageStatus = {
  provider: 's3';
  configured: boolean;
  active: boolean;
  credentials_configured: boolean;
  active_provider?: 'local' | 's3';
  region?: string | null;
  bucket?: string | null;
  endpoint?: string | null;
  url?: string | null;
  root_prefix?: string | null;
  use_path_style_endpoint?: boolean;
  configuration_revision?: number;
  validation?: {
    status?: string | null;
    failure_code?: string | null;
    attempted_at?: string | null;
    validated_at?: string | null;
  };
  validation_result?: {
    status?: string;
    failure_code?: string | null;
  };
  activated_at?: string | null;
};

export type ConfigureObjectStorageInput = {
  access_key_id: string;
  secret_access_key: string;
  region: string;
  bucket: string;
  endpoint?: string | null;
  url?: string | null;
  root_prefix?: string | null;
  use_path_style_endpoint?: boolean;
};

export type ObjectStorageDeactivation = {
  active_provider: 'local';
  object_storage_active: false;
};

export type MapsProvider = 'google' | 'mapbox' | 'leaflet';

export type MapsProviderStatus = {
  configured: boolean;
  active: boolean;
  active_provider: MapsProvider;
  providers: {
    google: { label?: string; requires_key?: boolean; key_configured: boolean };
    mapbox: { label?: string; requires_key?: boolean; key_configured: boolean };
    leaflet: { label?: string; requires_key?: boolean; key_configured: boolean; tile_url?: string };
  };
  default_center?: { latitude: number; longitude: number };
  default_zoom?: number;
  configuration_revision?: number;
  activated_at?: string | null;
};

export type ConfigureMapsProviderInput = {
  active_provider: MapsProvider;
  google_api_key?: string | null;
  mapbox_access_token?: string | null;
  leaflet_tile_url?: string | null;
  default_latitude?: number | null;
  default_longitude?: number | null;
  default_zoom?: number | null;
};

export type PaginationMeta = {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
};

/** Design fixtures are opt-in only; production mode never fabricates success. */
export function designFixturesEnabled(): boolean {
  return (
    process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true' ||
    process.env.NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES === 'true'
  );
}

export function platformApiConfigured(): boolean {
  return Boolean(resolveApiV1BaseUrl());
}

export class AdminPlatformApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly correlationId?: string;
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    code?: string,
    correlationId?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'AdminPlatformApiError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.details = details;
  }
}

function toPlatformError(error: unknown): never {
  if (error instanceof AdminPlatformApiError) throw error;
  if (error instanceof ApiError) {
    throw new AdminPlatformApiError(error.status, error.message, error.code, error.correlationId, error.details);
  }
  if (error instanceof Error) {
    throw new AdminPlatformApiError(500, error.message);
  }
  throw new AdminPlatformApiError(500, 'The platform admin API request failed.');
}

function withScope(scope: AdminScope = PLATFORM_GLOBAL_SCOPE) {
  return { scope, credentials: 'include' as const };
}

function listQuery(params?: {
  search?: string;
  environment?: string;
  classification?: string;
  enabled?: boolean;
  sort?: string;
  page?: number;
  per_page?: number;
}): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.search) search.set('filter[search]', params.search);
  if (params.environment) search.set('filter[environment]', params.environment);
  if (params.classification) search.set('filter[classification]', params.classification);
  if (params.enabled !== undefined) search.set('filter[enabled]', String(params.enabled));
  if (params.sort) search.set('sort', params.sort);
  if (params.page !== undefined) search.set('page', String(params.page));
  if (params.per_page !== undefined) search.set('per_page', String(params.per_page));
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

async function platformGet<T>(path: string, scope?: AdminScope): Promise<{ data: T; meta: JsonObject }> {
  try {
    const envelope = await apiRequest<ApiSuccessEnvelope<T>>(path, withScope(scope));
    return { data: envelope.data, meta: (envelope.meta ?? {}) as JsonObject };
  } catch (error) {
    toPlatformError(error);
  }
}

async function platformMutate<T>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  body?: unknown,
  scope?: AdminScope,
): Promise<T> {
  try {
    return await apiRequestData<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      ...withScope(scope),
    });
  } catch (error) {
    toPlatformError(error);
  }
}

export async function listConfigurations(
  params?: {
    search?: string;
    environment?: string;
    classification?: string;
    sort?: string;
    page?: number;
    per_page?: number;
  },
  scope?: AdminScope,
): Promise<{ items: PlatformConfiguration[]; pagination?: PaginationMeta }> {
  const result = await platformGet<PlatformConfiguration[]>(
    `admin/platform/configurations${listQuery(params)}`,
    scope,
  );
  return {
    items: Array.isArray(result.data) ? result.data : [],
    pagination: result.meta.pagination as PaginationMeta | undefined,
  };
}

export async function upsertConfiguration(
  body: UpsertPlatformConfigurationInput,
  scope?: AdminScope,
): Promise<PlatformConfiguration> {
  return platformMutate<PlatformConfiguration>('PUT', 'admin/platform/configurations', body, scope);
}

export async function listFeatureFlags(
  params?: {
    search?: string;
    environment?: string;
    enabled?: boolean;
    sort?: string;
    page?: number;
    per_page?: number;
  },
  scope?: AdminScope,
): Promise<{ items: FeatureFlag[]; pagination?: PaginationMeta }> {
  const result = await platformGet<FeatureFlag[]>(`admin/platform/feature-flags${listQuery(params)}`, scope);
  return {
    items: Array.isArray(result.data) ? result.data : [],
    pagination: result.meta.pagination as PaginationMeta | undefined,
  };
}

export async function upsertFeatureFlag(body: UpsertFeatureFlagInput, scope?: AdminScope): Promise<FeatureFlag> {
  return platformMutate<FeatureFlag>('PUT', 'admin/platform/feature-flags', body, scope);
}

export async function enableFeatureFlag(featureFlagId: string, scope?: AdminScope): Promise<FeatureFlag> {
  return platformMutate<FeatureFlag>(
    'POST',
    `admin/platform/feature-flags/${encodeURIComponent(featureFlagId)}/enabled`,
    undefined,
    scope,
  );
}

export async function disableFeatureFlag(featureFlagId: string, scope?: AdminScope): Promise<FeatureFlag> {
  return platformMutate<FeatureFlag>(
    'DELETE',
    `admin/platform/feature-flags/${encodeURIComponent(featureFlagId)}/enabled`,
    undefined,
    scope,
  );
}

export async function getObjectStorage(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<ObjectStorageStatus> {
  return (await platformGet<ObjectStorageStatus>('admin/platform/storage/object-storage', scope)).data;
}

export async function configureObjectStorage(
  body: ConfigureObjectStorageInput,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<ObjectStorageStatus> {
  return platformMutate<ObjectStorageStatus>('PUT', 'admin/platform/storage/object-storage', body, scope);
}

export async function validateObjectStorage(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<ObjectStorageStatus> {
  return platformMutate<ObjectStorageStatus>('POST', 'admin/platform/storage/object-storage/validation', undefined, scope);
}

export async function activateObjectStorage(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<ObjectStorageStatus> {
  return platformMutate<ObjectStorageStatus>('POST', 'admin/platform/storage/object-storage/activation', undefined, scope);
}

export async function deactivateObjectStorage(
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<ObjectStorageDeactivation> {
  return platformMutate<ObjectStorageDeactivation>(
    'DELETE',
    'admin/platform/storage/object-storage/activation',
    undefined,
    scope,
  );
}

export async function getMapsProvider(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<MapsProviderStatus> {
  return (await platformGet<MapsProviderStatus>('admin/platform/maps', scope)).data;
}

export async function configureMapsProvider(
  body: ConfigureMapsProviderInput,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<MapsProviderStatus> {
  return platformMutate<MapsProviderStatus>('PUT', 'admin/platform/maps', body, scope);
}

export async function activateMapsProvider(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<MapsProviderStatus> {
  return platformMutate<MapsProviderStatus>('POST', 'admin/platform/maps/activation', undefined, scope);
}

export async function deactivateMapsProvider(
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<{ active: boolean; active_provider: MapsProvider }> {
  return platformMutate<{ active: boolean; active_provider: MapsProvider }>(
    'DELETE',
    'admin/platform/maps/activation',
    undefined,
    scope,
  );
}

export type PaymentProviderId = 'paystack' | 'flutterwave' | 'stripe';

export type PaymentProviderStatus = {
  configured: boolean;
  active: boolean;
  active_provider?: PaymentProviderId | null;
  providers: {
    paystack: { label?: string; credentials_configured: boolean };
    flutterwave: { label?: string; credentials_configured: boolean };
    stripe: { label?: string; credentials_configured: boolean };
  };
  allowed_purpose_codes?: string[];
  allowed_currencies?: string[];
  configuration_revision?: number;
  activated_at?: string | null;
};

export type ConfigurePaymentProviderInput = {
  active_provider: PaymentProviderId;
  paystack_secret_key?: string;
  paystack_public_key?: string;
  paystack_webhook_secret?: string;
  flutterwave_secret_key?: string;
  flutterwave_public_key?: string;
  flutterwave_webhook_secret?: string;
  stripe_secret_key?: string;
  stripe_publishable_key?: string;
  stripe_webhook_secret?: string;
  allowed_purpose_codes?: string[];
  allowed_currencies?: string[];
};

export async function getPaymentProvider(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<PaymentProviderStatus> {
  return (await platformGet<PaymentProviderStatus>('admin/platform/payments', scope)).data;
}

export async function configurePaymentProvider(
  body: ConfigurePaymentProviderInput,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<PaymentProviderStatus> {
  return platformMutate<PaymentProviderStatus>('PUT', 'admin/platform/payments', body, scope);
}

export async function activatePaymentProvider(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<PaymentProviderStatus> {
  return platformMutate<PaymentProviderStatus>('POST', 'admin/platform/payments/activation', undefined, scope);
}

export async function deactivatePaymentProvider(
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<{ active: boolean }> {
  return platformMutate<{ active: boolean }>('DELETE', 'admin/platform/payments/activation', undefined, scope);
}

export type CommunicationProviderStatus = {
  configured: boolean;
  active: boolean;
  email: {
    provider: string;
    sender_name?: string | null;
    sender_address?: string | null;
    credentials_configured: boolean;
    smtp?: {
      host?: string | null;
      port?: number | null;
      username?: string | null;
      encryption?: string | null;
      password_configured?: boolean;
    };
  };
  sms: { provider: string; sender_id?: string | null; credentials_configured: boolean };
  whatsapp: { provider: string; phone_number_id?: string | null; credentials_configured: boolean };
  push: { provider: string; credentials_configured: boolean };
  consent_required_channels?: string[];
  retry?: { max_attempts: number; backoff_seconds: number };
  configuration_revision?: number;
  activated_at?: string | null;
};

export async function getCommunicationProvider(
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<CommunicationProviderStatus> {
  return (await platformGet<CommunicationProviderStatus>('admin/platform/communications', scope)).data;
}

export async function configureCommunicationProvider(
  body: Record<string, unknown>,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<CommunicationProviderStatus> {
  return platformMutate<CommunicationProviderStatus>('PUT', 'admin/platform/communications', body, scope);
}

export async function activateCommunicationProvider(
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<CommunicationProviderStatus> {
  return platformMutate<CommunicationProviderStatus>('POST', 'admin/platform/communications/activation', undefined, scope);
}

export async function deactivateCommunicationProvider(
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<{ active: boolean }> {
  return platformMutate<{ active: boolean }>('DELETE', 'admin/platform/communications/activation', undefined, scope);
}

export type KcaGovernanceStatus = {
  configured: boolean;
  pass_threshold_percent: number;
  attendance_threshold_percent: number;
  require_final_assessment: boolean;
  require_signed_pdf: boolean;
  certificate_signer_name?: string | null;
  certificate_signer_title?: string | null;
  admission_signer_name?: string | null;
  admission_signer_title?: string | null;
  admission_reference_prefix?: string | null;
  admission_letter_body_template?: string | null;
  admission_letter_template_default?: string | null;
  admission_letter_template_placeholders?: string | null;
  admission_programme_commencement?: string | null;
  admission_programme_completion?: string | null;
  admission_programme_venue?: string | null;
  admission_programme_schedule?: string | null;
  admission_programme_mentor?: string | null;
  admission_letterhead_file_asset_id?: string | null;
  admission_signature_file_asset_id?: string | null;
  configuration_revision?: number;
};

export async function getKcaGovernance(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<KcaGovernanceStatus> {
  return (await platformGet<KcaGovernanceStatus>('admin/kca/governance', scope)).data;
}

export async function configureKcaGovernance(
  body: Partial<KcaGovernanceStatus> & {
    pass_threshold_percent: number;
    attendance_threshold_percent: number;
  },
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<KcaGovernanceStatus> {
  return platformMutate<KcaGovernanceStatus>('PUT', 'admin/kca/governance', body, scope);
}

export type KcaAdmissionLetter = {
  id: string | null;
  application_id?: string;
  reference_code: string | null;
  applicant_name: string;
  church_name?: string | null;
  batch_label?: string | null;
  letter_body?: string | null;
  signer_name?: string | null;
  signer_title?: string | null;
  letterhead_file_asset_id?: string | null;
  signature_file_asset_id?: string | null;
  issued_at?: string | null;
  status?: string;
  acceptance_status?: 'pending' | 'accepted';
  applicant_accepted_at?: string | null;
  applicant_signature_name?: string | null;
  requires_guardian_confirmation?: boolean;
};

export async function getKcaAdmissionLetter(
  applicationId: string,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<KcaAdmissionLetter> {
  return (await platformGet<KcaAdmissionLetter>(
    `admin/kca/applications/${encodeURIComponent(applicationId)}/admission-letter`,
    scope,
  )).data;
}

export async function issueKcaAdmissionLetter(
  applicationId: string,
  body: Partial<KcaAdmissionLetter> = {},
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<KcaAdmissionLetter> {
  return platformMutate<KcaAdmissionLetter>(
    'POST',
    `admin/kca/applications/${encodeURIComponent(applicationId)}/admission-letter/issue`,
    body,
    scope,
  );
}

export async function fetchKcaAdmissionLetterAssetBlob(
  applicationId: string,
  fileAssetId: string,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<Blob> {
  const response = await apiRequestResponse(
    `admin/kca/applications/${encodeURIComponent(applicationId)}/admission-letter/assets/${encodeURIComponent(fileAssetId)}`,
    withScope(scope),
  );

  return response.blob();
}

export async function uploadPlatformGovernanceFile(
  file: File,
  purpose: 'kca_admission_letterhead' | 'kca_admission_signature',
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<{ id: string }> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('purpose', purpose);
  formData.append('classification', 'internal');
  formData.append('idempotency_key', crypto.randomUUID());
  const asset = await apiRequestForm<{ id: string }>('admin/platform/files', formData, {
    ...withScope(scope),
    headers: { 'Idempotency-Key': crypto.randomUUID() },
  });
  try {
    await platformMutate('POST', `admin/platform/files/${encodeURIComponent(asset.id)}/approval`, undefined, scope);
  } catch {
    // Asset may already be approved or approval may be handled on governance save.
  }
  return { id: asset.id };
}

export type AdminBrandingStatus = {
  app_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  configured: boolean;
  configuration_revision: number;
  logo: {
    id: string;
    detected_mime_type?: string | null;
    byte_size?: number | null;
    original_filename?: string | null;
  } | null;
  favicon: {
    id: string;
    detected_mime_type?: string | null;
    byte_size?: number | null;
    original_filename?: string | null;
  } | null;
};

export async function getPlatformBranding(
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<AdminBrandingStatus> {
  return (await platformGet<AdminBrandingStatus>('admin/platform/branding', scope)).data;
}

export async function updatePlatformBranding(
  appName: string,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<AdminBrandingStatus> {
  return platformMutate<AdminBrandingStatus>('PUT', 'admin/platform/branding', { app_name: appName }, scope);
}

export async function uploadPlatformBrandAsset(
  kind: 'logo' | 'favicon',
  file: File,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<AdminBrandingStatus> {
  const formData = new FormData();
  formData.append('file', file);
  try {
    return await apiRequestForm<AdminBrandingStatus>(`admin/platform/branding/${kind}`, formData, {
      ...withScope(scope),
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  } catch (error) {
    toPlatformError(error);
  }
}

export async function removePlatformBrandAsset(
  kind: 'logo' | 'favicon',
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<AdminBrandingStatus> {
  return platformMutate<AdminBrandingStatus>(
    'DELETE',
    `admin/platform/branding/${kind}`,
    undefined,
    scope,
  );
}

export type MediaAttachment = {
  id: string;
  role: string;
  sort_order?: number;
  image_url?: string | null;
  attachable?: { type?: string; id?: string | null; label?: string | null };
  file?: {
    id: string;
    purpose?: string;
    detected_mime_type?: string;
    byte_size?: number;
    original_filename?: string | null;
    status?: string;
  } | null;
  updated_at?: string | null;
};

export type DemoDatasetStatus = {
  seeded: boolean;
  dataset_key?: string;
  seeded_at?: string | null;
  summary?: Record<string, unknown>;
  confirmation_phrase?: string;
  accounts?: Array<{ email: string; name: string; role: string }>;
  password_hint?: string | null;
};

export async function listMediaAttachments(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<MediaAttachment[]> {
  const result = await platformGet<MediaAttachment[]>('admin/platform/media', scope);
  return Array.isArray(result.data) ? result.data : [];
}

export async function attachMedia(
  body: { attachable_type: string; attachable_id: string; file_asset_id: string; role: string },
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<MediaAttachment> {
  return platformMutate<MediaAttachment>('POST', 'admin/platform/media', body, scope);
}

export async function uploadMediaAttachment(
  formData: FormData,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<MediaAttachment> {
  try {
    return await apiRequestForm<MediaAttachment>('admin/platform/media/uploads', formData, {
      ...withScope(scope),
      headers: { 'Idempotency-Key': crypto.randomUUID() },
    });
  } catch (error) {
    toPlatformError(error);
  }
}

export async function removeMediaAttachment(
  mediaId: string,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<{ removed: boolean }> {
  return platformMutate<{ removed: boolean }>(
    'DELETE',
    `admin/platform/media/${encodeURIComponent(mediaId)}`,
    undefined,
    scope,
  );
}

export async function getDemoDataset(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<DemoDatasetStatus> {
  return (await platformGet<DemoDatasetStatus>('admin/platform/demo', scope)).data;
}

export async function wipeDemoDataset(
  confirmation = 'ERASE DEMO',
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<{ wiped: boolean; deleted_records?: number; restored_cms?: boolean }> {
  return platformMutate('POST', 'admin/platform/demo/wipe', { confirmation }, scope);
}

export type PlatformSearchHit = {
  resource_type: string;
  resource_id: string;
  title: string;
  summary?: string | null;
  classification?: string | null;
  metadata?: JsonObject | null;
};

export async function queryPlatformSearch(
  term: string,
  options: { resourceTypes?: string[]; limit?: number; scope?: AdminScope } = {},
): Promise<PlatformSearchHit[]> {
  return platformMutate<PlatformSearchHit[]>(
    'POST',
    'admin/platform/search/queries',
    {
      term,
      resource_types: options.resourceTypes ?? [],
      limit: options.limit ?? 20,
    },
    options.scope ?? PLATFORM_GLOBAL_SCOPE,
  );
}

export function isPlatformResourceMissing(error: unknown): boolean {
  if (error instanceof AdminPlatformApiError || error instanceof ApiError) {
    return error.status === 404 || error.code === 'RESOURCE_NOT_FOUND';
  }
  return false;
}

export function platformErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AdminPlatformApiError) {
    return error.code ? `${error.message} (${error.code})` : error.message;
  }
  if (error instanceof ApiError) {
    return error.code ? `${error.message} (${error.code})` : error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
