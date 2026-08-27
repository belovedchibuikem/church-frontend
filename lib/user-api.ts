import {
  ApiError,
  apiRequestData,
  apiRequestForm,
  apiRequestResponse,
  type ApiSuccessEnvelope,
} from './api-client.ts';
import { BROWSER_SESSION_COOKIE, isBrowserRuntime } from './api-config.ts';
import { serializeForwardedCookies } from './laravel-dev-proxy.ts';
import type { JsonObject } from './api-types.ts';

export type UserPreferences = {
  locale: string;
  timezone: string;
  notification_channels: string[];
  updated_at?: string | null;
};

export type CurrentUser = {
  person_id: string | null;
  email: string;
  email_verified_at: string | null;
  profile: {
    given_name: string | null;
    middle_name: string | null;
    family_name: string | null;
    preferred_name: string | null;
  };
  preferences?: UserPreferences | null;
};

/** Capability snapshot from GET /user/capabilities. */
export type CapabilitySnapshot = {
  permissions: string[];
  scopes: Array<{ type: string; key: string }>;
};

export type UserConsent = {
  id: string;
  purpose: string;
  policy_version: string;
  source?: string | null;
  granted_at?: string | null;
  withdrawn_at?: string | null;
};

export type GrantConsentInput = {
  purpose: string;
  policy_version: string;
};

export type UpdatePreferencesInput = {
  locale: string;
  timezone: string;
  notification_channels: string[];
};

export type UpdateProfileInput = {
  given_name: string;
  middle_name?: string | null;
  family_name: string;
  preferred_name?: string | null;
};

export type UserSecuritySession = {
  id: string;
  device_id?: string | null;
  started_at?: string | null;
  last_seen_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
};

export type UserDevice = {
  id: string;
  label?: string | null;
  device_type?: string | null;
  platform?: string | null;
  app_version?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  revoked_at?: string | null;
};

export type AuthorizationCheckInput = {
  permission: string;
  scope_type?: string;
  scope_id?: string;
  resource_id?: string;
};

export type AuthorizationCheckResult = {
  allowed: boolean;
  state: 'allowed' | 'forbidden' | string;
  permission: string;
  canonical_permission: string;
  reason: string;
  scope?: { type: string; id: string };
  decision_id?: string;
};

export type UserNotification = {
  id?: string;
  public_id?: string;
  title?: string | null;
  body?: string | null;
  read_at?: string | null;
  created_at?: string | null;
};

export type UserPaymentIntent = {
  id?: string;
  public_id?: string;
  purpose_code?: string | null;
  amount_minor?: number | null;
  currency?: string | null;
  status?: string | null;
  provider_code?: string | null;
  client_payload?: JsonObject | null;
  created_at?: string | null;
  succeeded_at?: string | null;
};

export type KcaDashboard = {
  enrolled?: boolean;
  enrollment?: JsonObject | null;
  modules_total?: number;
  modules_with_progress?: number;
  assignments_open?: number;
  assignments_due_soon?: number;
  attendance_recorded?: number;
  mentor?: JsonObject | null;
  certificate?: JsonObject | null;
};

export type KcaModuleSummary = {
  id?: string;
  code?: string | null;
  title?: string | null;
  sequence?: number | null;
  is_active?: boolean;
  lessons_count?: number | null;
  lessons?: Array<{ id?: string; code?: string | null; title?: string | null; sequence?: number | null }>;
};

export type KcaAssignmentSummary = {
  id?: string;
  title?: string | null;
  state?: string | null;
  due_at?: string | null;
  module?: { id?: string; code?: string | null; title?: string | null } | null;
};

export type UserPaymentTransaction = {
  id?: string;
  public_id?: string;
  payment_intent_id?: string | null;
  amount_minor?: number | null;
  currency?: string | null;
  status?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
};

export type UserPaymentReceipt = {
  id?: string;
  public_id?: string;
  receipt_number?: string | null;
  payment_transaction_id?: string | null;
  issued_at?: string | null;
  created_at?: string | null;
};

export type CompleteGivingResult = {
  intent: UserPaymentIntent;
  transaction: UserPaymentTransaction;
  receipt: UserPaymentReceipt;
};

/** Local QA gateway only — never treat other provider codes as paid. */
export const LOCAL_MANUAL_PROVIDER = 'local_manual';

export const PAYMENT_GOVERNANCE_DENIED_MESSAGE =
  'Giving is not available right now — payment governance has not authorized this request.';

export const GIVING_CHECKOUT_UNAVAILABLE_MESSAGE =
  'Your giving intent was recorded as pending, but no approved payment provider is available yet. Real PSP checkout, webhooks, and refunds remain blocked (OD-009/010).';

export type UserPrayer = {
  id?: string;
  public_id?: string;
  subject?: string | null;
  body?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserPastoralNeed = {
  id?: string;
  public_id?: string;
  category?: string | null;
  summary?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserMessageConversation = {
  id?: string;
  public_id?: string;
  subject?: string | null;
  participant_ids?: string[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type UserMessage = {
  id?: string;
  public_id?: string;
  conversation_id?: string | null;
  sender_person_id?: string | null;
  body?: string | null;
  created_at?: string | null;
};

export type CreatePrayerInput = {
  subject: string;
  body: string;
};

export type CreatePastoralNeedInput = {
  category: string;
  summary: string;
};

export type CreateMessageConversationInput = {
  participant_person_ids: string[];
  first_message: string;
  subject?: string | null;
};

export type UserDashboard = {
  /** Full current-user projection from DashboardController. */
  profile?: CurrentUser;
  unread_notification_count?: number;
  recent_payment_intents?: UserPaymentIntent[];
  open_prayer_count?: number;
  upcoming_note?: string | null;
};

export type GivingIntentInput = {
  amount_minor: number;
  currency: string;
  note?: string | null;
  fund?: string | null;
};

export type EventRegistrationResult = {
  id?: string;
  public_id?: string;
  status?: string | null;
  event_id?: string | null;
  person_id?: string | null;
  registered_at?: string | null;
  confirmed_at?: string | null;
};

export type EventTicket = EventRegistrationResult & {
  ticket_url?: string | null;
  qr_payload?: string | null;
};

export type EventFeedbackResult = {
  id?: string;
  public_id?: string;
  registration_id?: string | null;
  rating?: number | null;
  submitted_at?: string | null;
};

export type RecordEventFeedbackInput = {
  registration_id: string;
  rating: number;
};

export const DATA_SUBJECT_REQUEST_TYPES = ['export', 'correction', 'deletion', 'restriction'] as const;
export type DataSubjectRequestType = (typeof DATA_SUBJECT_REQUEST_TYPES)[number];

export type SubmitDataSubjectRequestInput = {
  request_type: DataSubjectRequestType | string;
  idempotency_key: string;
  notes?: string | null;
};

export type UserDataSubjectRequest = {
  id?: string;
  public_id?: string;
  person_id?: string | null;
  request_type?: string | null;
  status?: string | null;
  requested_at?: string | null;
  reviewed_at?: string | null;
  completed_at?: string | null;
  export_expires_at?: string | null;
};

export type UserFileAsset = {
  id?: string;
  public_id?: string;
  owner_person_id?: string | null;
  purpose?: string | null;
  classification?: string | null;
  storage_provider?: string | null;
  disk_name?: string | null;
  detected_mime_type?: string | null;
  byte_size?: number | null;
  status?: string | null;
  malware_scan_status?: string | null;
  available_at?: string | null;
  created_at?: string | null;
};

export type UserSyncCheckpoint = {
  cursor: string | null;
  updated_at?: string | null;
};

export type UserSyncChange = {
  type: string;
  id: string;
  updated_at?: string | null;
};

export type UserSyncChanges = {
  changes: UserSyncChange[];
  next_cursor: string;
};

export type UserMembership = {
  id?: string;
  public_id?: string;
  person_id?: string | null;
  church_id?: string | null;
  home_church_id?: string | null;
  status?: string | null;
  joined_at?: string | null;
  ended_at?: string | null;
};

export type RequestChurchMembershipInput = {
  home_church_id?: string | null;
};

export type HomeChurchDashboard = {
  id?: string;
  public_id?: string;
  name?: string | null;
  status?: string | null;
  church_id?: string | null;
  leader_person_id?: string | null;
  members_count?: number | null;
} & JsonObject;

export type SubmitHomeChurchReportInput = {
  summary: string;
  period_code?: string | null;
};

export type HomeChurchReport = {
  id?: string;
  public_id?: string;
  summary?: string | null;
  period_code?: string | null;
  submitted_at?: string | null;
};

export const EVENT_TICKET_UNAVAILABLE_MESSAGE =
  'This registration ticket is not available. It may not exist yet, or the ticket API is not enabled.';

/** Member evidence submit / grading stay OD-008 — no user-api helper is exposed. */
export const KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE =
  'Evidence submit is not available yet (OD-008). Assignment review stays with your mentor and administrators.';

/** Forward browser session cookies on RSC/server fetches (credentials alone is not enough cross-origin). */
async function serverSessionHeaders(): Promise<HeadersInit | undefined> {
  if (isBrowserRuntime()) return undefined;

  // Dynamic import keeps this module safe for client components.
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const pairs = jar.getAll();
  if (pairs.length === 0) return undefined;
  return { Cookie: serializeForwardedCookies(pairs) };
}

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  return [];
}

function newIdempotencyKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * GET /user/me — cookie session.
 * Response envelope: `{ data, meta, correlation_id }`; returns `data`.
 */
export async function fetchCurrentUser(): Promise<CurrentUser> {
  return apiRequestData<CurrentUser>('user/me', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** PUT /user/profile — current member profile; recent MFA required. */
export async function updateUserProfile(input: UpdateProfileInput): Promise<CurrentUser> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<CurrentUser>('user/profile', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      given_name: input.given_name,
      middle_name: input.middle_name ?? null,
      family_name: input.family_name,
      preferred_name: input.preferred_name ?? null,
    }),
  });
}

/**
 * GET /user/capabilities — permissions + scope assignments.
 * Response envelope: `{ data: { permissions, scopes }, meta, correlation_id }`.
 */
export async function fetchUserCapabilities(): Promise<CapabilitySnapshot> {
  return apiRequestData<CapabilitySnapshot>('user/capabilities', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/**
 * POST /user/authorization/check — optional scoped decision.
 * Browser calls need CSRF (handled by apiRequest); server should forward Cookie + XSRF when available.
 */
export async function checkUserAuthorization(input: AuthorizationCheckInput): Promise<AuthorizationCheckResult> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<AuthorizationCheckResult>('user/authorization/check', {
    method: 'POST',
    headers,
    body: JSON.stringify(input),
  });
}

/** True when a Laravel browser session cookie is present on the incoming request. */
export async function hasBrowserSessionCookie(): Promise<boolean> {
  if (isBrowserRuntime()) {
    return typeof document !== 'undefined' && document.cookie.includes(`${BROWSER_SESSION_COOKIE}=`);
  }
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  return jar.get(BROWSER_SESSION_COOKIE) !== undefined;
}

/** GET /user/notifications */
export async function fetchUserNotifications(): Promise<UserNotification[]> {
  const data = await apiRequestData<unknown>('user/notifications', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserNotification>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** GET /user/payments/intents */
export async function fetchUserPaymentIntents(): Promise<UserPaymentIntent[]> {
  const data = await apiRequestData<unknown>('user/payments/intents', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserPaymentIntent>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** GET /user/payments/transactions */
export async function fetchUserPaymentTransactions(): Promise<UserPaymentTransaction[]> {
  const data = await apiRequestData<unknown>('user/payments/transactions', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserPaymentTransaction>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** GET /user/payments/receipts/{receipt} — single receipt by public id (no list endpoint). */
export async function fetchUserPaymentReceipt(receiptId: string): Promise<UserPaymentReceipt> {
  const data = await apiRequestData<UserPaymentReceipt>(
    `user/payments/receipts/${encodeURIComponent(receiptId)}`,
    {
      method: 'GET',
      headers: await serverSessionHeaders(),
    },
  );
  return { ...data, id: data.id ?? data.public_id };
}

/** GET /user/prayers */
export async function fetchUserPrayers(): Promise<UserPrayer[]> {
  const data = await apiRequestData<unknown>('user/prayers', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserPrayer>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** POST /user/prayers */
export async function createUserPrayer(input: CreatePrayerInput): Promise<UserPrayer> {
  const headers = new Headers(await serverSessionHeaders());
  const prayer = await apiRequestData<UserPrayer>('user/prayers', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      subject: input.subject,
      body: input.body,
    }),
  });
  return { ...prayer, id: prayer.id ?? prayer.public_id };
}

/** GET /user/needs */
export async function fetchUserNeeds(): Promise<UserPastoralNeed[]> {
  const data = await apiRequestData<unknown>('user/needs', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserPastoralNeed>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** POST /user/needs */
export async function createUserNeed(input: CreatePastoralNeedInput): Promise<UserPastoralNeed> {
  const headers = new Headers(await serverSessionHeaders());
  const need = await apiRequestData<UserPastoralNeed>('user/needs', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      category: input.category,
      summary: input.summary,
    }),
  });
  return { ...need, id: need.id ?? need.public_id };
}

/** GET /user/messages/conversations */
export async function fetchUserMessageConversations(): Promise<UserMessageConversation[]> {
  const data = await apiRequestData<unknown>('user/messages/conversations', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserMessageConversation>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** POST /user/messages/conversations */
export async function createUserMessageConversation(
  input: CreateMessageConversationInput,
): Promise<UserMessageConversation> {
  const headers = new Headers(await serverSessionHeaders());
  const conversation = await apiRequestData<UserMessageConversation>('user/messages/conversations', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      participant_person_ids: input.participant_person_ids,
      first_message: input.first_message,
      ...(input.subject != null && input.subject !== '' ? { subject: input.subject } : {}),
    }),
  });
  return { ...conversation, id: conversation.id ?? conversation.public_id };
}

/** GET /user/messages/conversations/{id}/messages */
export async function fetchUserConversationMessages(conversationId: string): Promise<UserMessage[]> {
  const data = await apiRequestData<unknown>(
    `user/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'GET',
      headers: await serverSessionHeaders(),
    },
  );
  return asList<UserMessage>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** POST /user/messages/conversations/{id}/messages */
export async function sendUserConversationMessage(conversationId: string, body: string): Promise<UserMessage> {
  const headers = new Headers(await serverSessionHeaders());
  const message = await apiRequestData<UserMessage>(
    `user/messages/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ body }),
    },
  );
  return { ...message, id: message.id ?? message.public_id };
}

/** POST /user/notifications/{id}/read */
export async function markUserNotificationRead(notificationId: string): Promise<UserNotification> {
  const headers = new Headers(await serverSessionHeaders());
  const notification = await apiRequestData<UserNotification>(
    `user/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      method: 'POST',
      headers,
    },
  );
  return { ...notification, id: notification.id ?? notification.public_id };
}

/** GET /user/dashboard — member home aggregate. */
export async function fetchUserDashboard(): Promise<UserDashboard> {
  return apiRequestData<UserDashboard>('user/dashboard', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** PUT /user/preferences — locale, timezone, notification channels. */
export async function updateUserPreferences(input: UpdatePreferencesInput): Promise<UserPreferences> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<UserPreferences>('user/preferences', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      locale: input.locale,
      timezone: input.timezone,
      notification_channels: input.notification_channels,
    }),
  });
}

/** GET /user/consents — own consent records (no MFA). */
export async function fetchUserConsents(): Promise<UserConsent[]> {
  const data = await apiRequestData<unknown>('user/consents', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserConsent>(data);
}

/** POST /user/consents — recent MFA required. */
export async function grantUserConsent(input: GrantConsentInput): Promise<UserConsent> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<UserConsent>('user/consents', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      purpose: input.purpose,
      policy_version: input.policy_version,
    }),
  });
}

/** DELETE /user/consents/{id} — recent MFA required. */
export async function withdrawUserConsent(consentId: string): Promise<UserConsent> {
  return apiRequestData<UserConsent>(`user/consents/${encodeURIComponent(consentId)}`, {
    method: 'DELETE',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/security/sessions — recent MFA required. */
export async function fetchUserSecuritySessions(): Promise<UserSecuritySession[]> {
  const data = await apiRequestData<unknown>('user/security/sessions', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserSecuritySession>(data);
}

/** DELETE /user/security/sessions/{id} — recent MFA required. */
export async function revokeUserSecuritySession(sessionId: string): Promise<UserSecuritySession> {
  return apiRequestData<UserSecuritySession>(`user/security/sessions/${encodeURIComponent(sessionId)}`, {
    method: 'DELETE',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/security/devices — recent MFA required. */
export async function fetchUserDevices(): Promise<UserDevice[]> {
  const data = await apiRequestData<unknown>('user/security/devices', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserDevice>(data);
}

/** DELETE /user/security/devices/{id} — recent MFA required. */
export async function revokeUserDevice(deviceId: string): Promise<UserDevice> {
  return apiRequestData<UserDevice>(`user/security/devices/${encodeURIComponent(deviceId)}`, {
    method: 'DELETE',
    headers: await serverSessionHeaders(),
  });
}

/** True when Laravel denied due to missing/stale recent MFA (403 AuthorizationException). */
export function isRecentMfaRequiredError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.status !== 403) return false;
  const haystack = `${error.code ?? ''} ${error.message}`;
  return /mfa|multi-factor/i.test(haystack) || error.code === 'RECENT_MFA_REQUIRED';
}

/**
 * POST /user/events/{event}/registrations
 * Requires an authenticated browser session with recent MFA (API middleware).
 */
export async function registerForEvent(
  eventId: string,
  idempotencyKey = newIdempotencyKey('event-reg'),
): Promise<EventRegistrationResult> {
  const headers = new Headers(await serverSessionHeaders());
  headers.set('Idempotency-Key', idempotencyKey);
  const registration = await apiRequestData<EventRegistrationResult>(
    `user/events/${encodeURIComponent(eventId)}/registrations`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ idempotency_key: idempotencyKey }),
    },
  );
  return { ...registration, id: registration.id ?? registration.public_id };
}

/** POST /user/events/feedback — recent MFA; own registration only. */
export async function recordEventFeedback(input: RecordEventFeedbackInput): Promise<EventFeedbackResult> {
  const headers = new Headers(await serverSessionHeaders());
  const feedback = await apiRequestData<EventFeedbackResult>('user/events/feedback', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      registration_id: input.registration_id,
      rating: input.rating,
    }),
  });
  return { ...feedback, id: feedback.id ?? feedback.public_id };
}

/**
 * GET /user/events/registrations/{id} — ticket for an existing registration.
 * Returns `null` on 404 (endpoint or registration not available).
 */
export async function fetchEventTicket(registrationId: string): Promise<EventTicket | null> {
  try {
    const ticket = await apiRequestData<EventTicket>(
      `user/events/registrations/${encodeURIComponent(registrationId)}`,
      {
        method: 'GET',
        headers: await serverSessionHeaders(),
      },
    );
    return { ...ticket, id: ticket.id ?? ticket.public_id };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

/** GET /user/sync/checkpoint */
export async function fetchUserSyncCheckpoint(): Promise<UserSyncCheckpoint> {
  return apiRequestData<UserSyncCheckpoint>('user/sync/checkpoint', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** PUT /user/sync/checkpoint */
export async function updateUserSyncCheckpoint(cursor: string): Promise<UserSyncCheckpoint> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<UserSyncCheckpoint>('user/sync/checkpoint', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ cursor }),
  });
}

/** GET /user/sync/changes?since= — ISO8601 cursor required by the API. */
export async function fetchUserSyncChanges(since: string): Promise<UserSyncChanges> {
  const data = await apiRequestData<UserSyncChanges | { items?: UserSyncChange[]; next_cursor?: string }>(
    `user/sync/changes?since=${encodeURIComponent(since)}`,
    {
      method: 'GET',
      headers: await serverSessionHeaders(),
    },
  );
  if (data && typeof data === 'object' && Array.isArray((data as UserSyncChanges).changes)) {
    return data as UserSyncChanges;
  }
  return {
    changes: asList<UserSyncChange>(data),
    next_cursor: (data as { next_cursor?: string })?.next_cursor ?? since,
  };
}

/** POST /user/privacy/data-subject-requests — recent MFA; `Idempotency-Key`. */
export async function submitUserDataSubjectRequest(
  input: SubmitDataSubjectRequestInput,
): Promise<UserDataSubjectRequest> {
  const headers = new Headers(await serverSessionHeaders());
  headers.set('Idempotency-Key', input.idempotency_key);
  const request = await apiRequestData<UserDataSubjectRequest>('user/privacy/data-subject-requests', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      request_type: input.request_type,
      idempotency_key: input.idempotency_key,
      ...(input.notes != null && input.notes !== '' ? { notes: input.notes } : {}),
    }),
  });
  return { ...request, id: request.id ?? request.public_id };
}

/**
 * POST /user/files — multipart (`file`, `purpose`, `classification`, `idempotency_key`).
 * Recent MFA. Appends an idempotency key when the FormData does not include one.
 */
export async function storeUserFile(formData: FormData): Promise<UserFileAsset> {
  const headers = new Headers(await serverSessionHeaders());
  let idempotencyKey = formData.get('idempotency_key');
  if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    idempotencyKey = newIdempotencyKey('file');
    formData.set('idempotency_key', idempotencyKey);
  }
  headers.set('Idempotency-Key', idempotencyKey);
  const asset = await apiRequestForm<UserFileAsset>('user/files', formData, { headers });
  return { ...asset, id: asset.id ?? asset.public_id };
}

/** GET /user/files — own file assets when the list endpoint is available. */
export async function fetchUserFiles(): Promise<UserFileAsset[]> {
  const data = await apiRequestData<unknown>('user/files', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserFileAsset>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/**
 * GET /user/files/{file} — streams an Available file owned by the current person.
 * Returns the raw `Response` so callers can `blob()`; throws `ApiError` on 404.
 */
export async function downloadUserFile(fileId: string, asAttachment = false): Promise<Response> {
  const headers = new Headers(await serverSessionHeaders());
  headers.set('Accept', 'application/octet-stream, application/json');
  const suffix = asAttachment ? '?download=1' : '';
  return apiRequestResponse(`user/files/${encodeURIComponent(fileId)}${suffix}`, {
    method: 'GET',
    headers,
  });
}

/** POST /user/churches/{church}/memberships */
export async function requestChurchMembership(
  churchId: string,
  input: RequestChurchMembershipInput = {},
): Promise<UserMembership> {
  const headers = new Headers(await serverSessionHeaders());
  const membership = await apiRequestData<UserMembership>(
    `user/churches/${encodeURIComponent(churchId)}/memberships`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...(input.home_church_id != null && input.home_church_id !== ''
          ? { home_church_id: input.home_church_id }
          : {}),
      }),
    },
  );
  return { ...membership, id: membership.id ?? membership.public_id };
}

/** GET /user/memberships */
export async function fetchUserMemberships(): Promise<UserMembership[]> {
  const data = await apiRequestData<unknown>('user/memberships', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserMembership>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** GET /user/home-churches/{id} */
export async function fetchHomeChurchDashboard(id: string): Promise<HomeChurchDashboard> {
  const data = await apiRequestData<HomeChurchDashboard>(
    `user/home-churches/${encodeURIComponent(id)}`,
    {
      method: 'GET',
      headers: await serverSessionHeaders(),
    },
  );
  const resolvedId = data.id ?? data.public_id;
  return resolvedId ? { ...data, id: resolvedId } : data;
}

/** POST /user/home-churches/{id}/reports */
export async function submitHomeChurchReport(
  id: string,
  input: SubmitHomeChurchReportInput,
): Promise<HomeChurchReport> {
  const headers = new Headers(await serverSessionHeaders());
  const report = await apiRequestData<HomeChurchReport>(
    `user/home-churches/${encodeURIComponent(id)}/reports`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        summary: input.summary,
        ...(input.period_code != null && input.period_code !== '' ? { period_code: input.period_code } : {}),
      }),
    },
  );
  return { ...report, id: report.id ?? report.public_id };
}

/**
 * GET /press/publications/{id}/download — binary asset.
 * Returns the raw `Response` so callers can `blob()` or stream; throws `ApiError` on failure.
 */
export async function downloadPressPublication(id: string): Promise<Response> {
  const headers = new Headers(await serverSessionHeaders());
  headers.set('Accept', 'application/octet-stream, application/pdf, application/json');
  return apiRequestResponse(`press/publications/${encodeURIComponent(id)}/download`, {
    method: 'GET',
    headers,
  });
}

/** POST /user/payments/giving-intents — governance may deny with 422 `PAYMENT_GOVERNANCE_DENIED`. */
export async function createGivingIntent(
  input: GivingIntentInput,
  idempotencyKey = newIdempotencyKey('giving'),
): Promise<UserPaymentIntent> {
  const headers = new Headers(await serverSessionHeaders());
  headers.set('Idempotency-Key', idempotencyKey);
  // API validates amount_minor + currency + idempotency_key only (note/fund are UI hints, ignored server-side).
  const body: JsonObject = {
    amount_minor: input.amount_minor,
    currency: input.currency.toUpperCase(),
    idempotency_key: idempotencyKey,
  };

  const intent = await apiRequestData<UserPaymentIntent>('user/payments/giving-intents', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { ...intent, id: intent.id ?? intent.public_id };
}

/** POST /user/payments/giving-intents/{id}/complete — local_manual gateway only. */
export async function completeGivingIntent(intentId: string): Promise<CompleteGivingResult> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<CompleteGivingResult>(
    `user/payments/giving-intents/${encodeURIComponent(intentId)}/complete`,
    {
      method: 'POST',
      headers,
    },
  );
}

export function isLocalManualGivingProvider(providerCode?: string | null): boolean {
  return providerCode === LOCAL_MANUAL_PROVIDER;
}

/** GET /user/kca/dashboard */
export async function fetchKcaDashboard(): Promise<KcaDashboard> {
  return apiRequestData<KcaDashboard>('user/kca/dashboard', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** POST /user/kca/applications — saves the authenticated member's KCA application. */
export async function submitKcaApplication(applicationData: Record<string, string>): Promise<{ id: string; status: string; received_at?: string }> {
  return apiRequestData('user/kca/applications', {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify({ application_data: applicationData }),
  });
}

/** GET /user/kca/modules */
export async function fetchKcaModules(): Promise<KcaModuleSummary[]> {
  const data = await apiRequestData<unknown>('user/kca/modules', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<KcaModuleSummary>(data);
}

/** GET /user/kca/modules/{module} */
export async function fetchKcaModule(moduleId: string): Promise<KcaModuleSummary> {
  return apiRequestData<KcaModuleSummary>(`user/kca/modules/${encodeURIComponent(moduleId)}`, {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/kca/assignments — read-only; evidence submit is OD-008. */
export async function fetchKcaAssignments(): Promise<KcaAssignmentSummary[]> {
  const data = await apiRequestData<unknown>('user/kca/assignments', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<KcaAssignmentSummary>(data);
}

/** GET /user/kca/mentor */
export async function fetchKcaMentor(): Promise<{ assigned?: boolean; mentor?: JsonObject | null; message?: string }> {
  return apiRequestData('user/kca/mentor', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/kca/attendance */
export async function fetchKcaAttendance(): Promise<JsonObject[]> {
  const data = await apiRequestData<unknown>('user/kca/attendance', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<JsonObject>(data);
}

export function formatMoneyMinor(amountMinor?: number | null, currency = 'NGN'): string {
  if (amountMinor == null || !Number.isFinite(amountMinor)) return '—';
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

export function displayNameFromUser(user: CurrentUser | null | undefined): string {
  if (!user) return 'Member';
  const preferred = user.profile?.preferred_name?.trim();
  if (preferred) return preferred;
  const given = user.profile?.given_name?.trim() ?? '';
  const family = user.profile?.family_name?.trim() ?? '';
  const full = `${given} ${family}`.trim();
  return full || user.email || 'Member';
}

export function initialsFromUser(user: CurrentUser | null | undefined): string {
  const name = displayNameFromUser(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  return (parts[0]?.slice(0, 2) ?? 'ME').toUpperCase();
}

export function isNotFoundError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isPaymentGovernanceDenied(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  if (error.code === 'PAYMENT_GOVERNANCE_DENIED') return true;
  if (error.status !== 422) return false;
  return /governance|not authorized|not enabled|giving payment/i.test(error.message);
}

export function formatByteSize(bytes?: number | null): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function formatUserApiError(error: unknown, fallback = 'Unable to complete this request.'): string {
  if (error instanceof ApiError) {
    if (isPaymentGovernanceDenied(error) || /governance/i.test(error.message)) {
      return error.message || PAYMENT_GOVERNANCE_DENIED_MESSAGE;
    }
    if (isRecentMfaRequiredError(error)) {
      return error.message || 'Recent multi-factor authentication is required. Complete MFA, then retry.';
    }
    if (error.status === 422) {
      if (error.errors) {
        const first = Object.values(error.errors).flat()[0];
        if (first) return first;
      }
      return error.message || 'Please check your input and try again.';
    }
    if (error.status === 401) {
      return 'Please sign in to continue.';
    }
    if (error.status === 403) {
      return error.message || 'You do not have permission to do that.';
    }
    if (error.status === 404) {
      return error.message || 'This item is not available.';
    }
    if (error.status === 409) {
      return error.message || 'Your account is not linked to a person profile yet.';
    }
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export type { ApiSuccessEnvelope };
