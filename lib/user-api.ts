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
    country?: string | null;
    region?: string | null;
    locality?: string | null;
    avatar_file_id?: string | null;
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
  avatar_file_asset_id?: string | null;
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
  is_mentor?: boolean;
  enrollment?: JsonObject | null;
  modules_total?: number;
  modules_with_progress?: number;
  curriculum_percent?: number;
  lessons_completed?: number;
  lessons_total?: number;
  chapters_completed?: number;
  chapters_total?: number;
  assignments_open?: number;
  assignments_due_soon?: number;
  attendance_recorded?: number;
  mentor?: JsonObject | null;
  certificate?: JsonObject | null;
  activity?: JsonObject | null;
};

export type KcaChapterSummary = {
  id?: string;
  lesson_id?: string | null;
  module_id?: string | null;
  code?: string | null;
  title?: string | null;
  sequence?: number | null;
  summary?: string | null;
  body?: string | null;
  content_url?: string | null;
  estimated_minutes?: number | null;
  completed?: boolean;
  unlocked?: boolean;
};

export type KcaModuleSummary = {
  id?: string;
  code?: string | null;
  title?: string | null;
  sequence?: number | null;
  is_active?: boolean;
  lessons_count?: number | null;
  lessons?: Array<{
    id?: string;
    code?: string | null;
    title?: string | null;
    sequence?: number | null;
    unlocked?: boolean;
    day_index?: number | null;
    lock_reason?: string;
    chapters_count?: number | null;
    chapters?: KcaChapterSummary[];
  }>;
};

export type KcaLessonDetail = {
  id?: string;
  module_id?: string | null;
  code?: string | null;
  title?: string | null;
  summary?: string | null;
  body?: string | null;
  content_url?: string | null;
  estimated_minutes?: number | null;
  sequence?: number | null;
  day_index?: number | null;
  lesson_type?: string | null;
  unlocked?: boolean;
  unlock_token?: string | null;
  requires_acknowledgement?: boolean;
  chapters?: KcaChapterSummary[];
};

export type KcaAssignmentSummary = {
  id?: string;
  title?: string | null;
  state?: string | null;
  assignment_kind?: string | null;
  due_at?: string | null;
  module?: { id?: string; code?: string | null; title?: string | null } | null;
  soul_tree?: {
    kind?: string;
    levels?: number[];
    required_souls?: number;
    recorded_souls?: number;
    complete?: boolean;
    open?: boolean;
    tree?: Array<JsonObject>;
  } | null;
};

export type UserPaymentTransaction = {
  id?: string;
  public_id?: string;
  payment_intent_id?: string | null;
  amount_minor?: number | null;
  currency?: string | null;
  purpose_code?: string | null;
  provider_code?: string | null;
  status?: string | null;
  occurred_at?: string | null;
  created_at?: string | null;
};

export type UserPaymentReceipt = {
  id?: string;
  public_id?: string;
  receipt_number?: string | null;
  payment_transaction_id?: string | null;
  payment_intent_id?: string | null;
  amount_minor?: number | null;
  currency?: string | null;
  purpose_code?: string | null;
  purpose_label?: string | null;
  provider_code?: string | null;
  settlement?: 'manual' | 'automatic' | string | null;
  status?: string | null;
  issued_at?: string | null;
  occurred_at?: string | null;
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
  'Your giving intent was recorded as pending. No payment provider is active yet. An administrator must paste Paystack, Flutterwave, or Stripe keys and activate them.';

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
  purpose_code?: string | null;
  proof_file_asset_id?: string | null;
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
  church_name?: string | null;
  home_church_id?: string | null;
  home_church_name?: string | null;
  status?: string | null;
  joined_at?: string | null;
  ended_at?: string | null;
};

export type RequestChurchMembershipInput = {
  home_church_id?: string | null;
  confirm_transfer?: boolean;
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

/** Member evidence submit uses POST /user/kca/assignments/{id}/evidence after storing a kca.evidence file. */
export const KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE =
  'Upload a file first, then submit it as evidence for this assignment.';

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
      ...(input.avatar_file_asset_id !== undefined
        ? { avatar_file_asset_id: input.avatar_file_asset_id }
        : {}),
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

/** POST /user/notifications/read-all */
export async function markAllUserNotificationsRead(): Promise<UserNotification[]> {
  const headers = new Headers(await serverSessionHeaders());
  const data = await apiRequestData<unknown>('user/notifications/read-all', {
    method: 'POST',
    headers,
  });
  return asList<UserNotification>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
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
        ...(input.confirm_transfer ? { confirm_transfer: true } : {}),
      }),
    },
  );
  return { ...membership, id: membership.id ?? membership.public_id };
}

/** POST /user/home-churches/{homeChurch}/memberships */
export async function requestHomeChurchMembership(
  homeChurchId: string,
  input: { confirm_transfer?: boolean } = {},
): Promise<UserMembership> {
  const headers = new Headers(await serverSessionHeaders());
  const membership = await apiRequestData<UserMembership>(
    `user/home-churches/${encodeURIComponent(homeChurchId)}/memberships`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ...(input.confirm_transfer ? { confirm_transfer: true } : {}),
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

export type UserChurchGroup = {
  id?: string;
  public_id?: string;
  name?: string | null;
  description?: string | null;
  church_id?: string | null;
  church_name?: string | null;
  member_count?: number | null;
  membership_status?: string | null;
  capacity?: number | null;
};

export type UserChurchAnnouncement = {
  id?: string;
  public_id?: string;
  title?: string | null;
  body?: string | null;
  church_id?: string | null;
  church_name?: string | null;
  published_at?: string | null;
};

export type UserChurchDocument = {
  id?: string;
  public_id?: string;
  title?: string | null;
  description?: string | null;
  church_id?: string | null;
  church_name?: string | null;
  file_asset_id?: string | null;
  published_at?: string | null;
};

export type UserMissionSupportRequest = {
  id?: string;
  public_id?: string;
  title?: string | null;
  details?: string | null;
  category?: string | null;
  status?: string | null;
};

/** GET /user/groups — published groups for the member's active churches. */
export async function fetchUserGroups(): Promise<UserChurchGroup[]> {
  const data = await apiRequestData<unknown>('user/groups', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserChurchGroup>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** GET /user/groups/{group} */
export async function fetchUserGroup(groupId: string): Promise<UserChurchGroup> {
  const group = await apiRequestData<UserChurchGroup>(`user/groups/${encodeURIComponent(groupId)}`, {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return { ...group, id: group.id ?? group.public_id };
}

/** POST /user/groups/{group}/join */
export async function joinUserGroup(groupId: string): Promise<{ id?: string; group_id?: string; status?: string }> {
  return apiRequestData(`user/groups/${encodeURIComponent(groupId)}/join`, {
    method: 'POST',
    headers: await serverSessionHeaders(),
  });
}

/** POST /user/groups/{group}/leave */
export async function leaveUserGroup(groupId: string): Promise<{ id?: string; group_id?: string; status?: string }> {
  return apiRequestData(`user/groups/${encodeURIComponent(groupId)}/leave`, {
    method: 'POST',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/announcements */
export async function fetchUserAnnouncements(): Promise<UserChurchAnnouncement[]> {
  const data = await apiRequestData<unknown>('user/announcements', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserChurchAnnouncement>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** GET /user/documents */
export async function fetchUserDocuments(): Promise<UserChurchDocument[]> {
  const data = await apiRequestData<unknown>('user/documents', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserChurchDocument>(data).map((item) => ({
    ...item,
    id: item.id ?? item.public_id,
  }));
}

/** GET /user/mission/support-requests */
export async function fetchMissionSupportRequests(): Promise<UserMissionSupportRequest[]> {
  const data = await apiRequestData<unknown>('user/mission/support-requests', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<UserMissionSupportRequest>(data).map((item) => ({
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
    purpose_code: input.purpose_code ?? 'offering',
    idempotency_key: idempotencyKey,
  };
  if (input.proof_file_asset_id) body.proof_file_asset_id = input.proof_file_asset_id;

  const intent = await apiRequestData<UserPaymentIntent>('user/payments/giving-intents', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  return { ...intent, id: intent.id ?? intent.public_id };
}

/** POST /user/payments/giving-intents/{id}/complete — local_manual gateway only. */
export async function completeGivingIntent(intentId: string, proofFileAssetId: string): Promise<CompleteGivingResult> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<CompleteGivingResult>(
    `user/payments/giving-intents/${encodeURIComponent(intentId)}/complete`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ proof_file_asset_id: proofFileAssetId }),
    },
  );
}

export function isLocalManualGivingProvider(providerCode?: string | null): boolean {
  return providerCode === LOCAL_MANUAL_PROVIDER;
}

export function hostedCheckoutUrl(intent: UserPaymentIntent): string | null {
  const url = intent.client_payload?.checkout_url;
  return typeof url === 'string' && url.startsWith('https://') ? url : null;
}

/** GET /user/payments/intents/{id} */
export async function fetchUserPaymentIntent(intentId: string): Promise<UserPaymentIntent> {
  const headers = new Headers(await serverSessionHeaders());
  const intent = await apiRequestData<UserPaymentIntent>(
    `user/payments/intents/${encodeURIComponent(intentId)}`,
    { method: 'GET', headers },
  );
  return { ...intent, id: intent.id ?? intent.public_id };
}

export type KcaAccess = {
  state?: string;
  destination?: string;
  label?: string;
  next_step?: string;
  permitted_actions?: string[];
  application?: JsonObject | null;
  enrollment?: JsonObject | null;
  timeline?: Array<JsonObject>;
};

/** GET /user/kca/me */
export async function fetchKcaMe(): Promise<KcaAccess> {
  return apiRequestData<KcaAccess>('user/kca/me', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/kca/dashboard */
export async function fetchKcaDashboard(): Promise<KcaDashboard> {
  return apiRequestData<KcaDashboard>('user/kca/dashboard', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/kca/applications/current */
export async function fetchKcaCurrentApplication(): Promise<JsonObject | null> {
  return apiRequestData<JsonObject | null>('user/kca/applications/current', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

export async function submitMissionInvitation(input: {
  title: string;
  type?: string;
  start?: string;
  location?: string;
  details?: string;
  idempotencyKey?: string;
}): Promise<{ id: string; status: string }> {
  const idempotencyKey =
    input.idempotencyKey ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `mission-invite-${Date.now()}`);
  return apiRequestData('user/mission/invitations', {
    method: 'POST',
    headers: {
      ...(await serverSessionHeaders()),
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      title: input.title,
      type: input.type,
      start: input.start,
      location: input.location,
      details: input.details,
      idempotency_key: idempotencyKey,
    }),
  });
}

export async function fetchMissionInvitations(): Promise<Array<{ id: string; status: string }>> {
  const data = await apiRequestData<unknown>('user/mission/invitations', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<{ id: string; status: string }>(data);
}

export async function submitMissionSupportRequest(input: {
  title: string;
  details?: string;
  category?: string;
}): Promise<{ id: string; status: string }> {
  return apiRequestData('user/mission/support-requests', {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify(input),
  });
}
export async function submitKcaApplication(
  applicationData: Record<string, string>,
  options: { finalize?: boolean } = {},
): Promise<{ id: string; status: string; received_at?: string }> {
  return apiRequestData('user/kca/applications', {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify({
      application_data: applicationData,
      finalize: options.finalize ?? true,
    }),
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

/** POST /user/kca/lessons/{id}/complete */
export async function completeKcaLesson(
  lessonId: string,
  options: { acknowledged?: boolean; idempotencyKey?: string; unlockToken?: string } = {},
): Promise<{ id?: string; completed_at?: string }> {
  return apiRequestData(`user/kca/lessons/${encodeURIComponent(lessonId)}/complete`, {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify({
      acknowledged: options.acknowledged ?? true,
      idempotency_key: options.idempotencyKey ?? undefined,
      unlock_token: options.unlockToken ?? undefined,
    }),
  });
}

/** GET /user/kca/lessons/{id} — published body only when the daily bundle is unlocked. */
export async function fetchKcaLesson(lessonId: string): Promise<KcaLessonDetail> {
  return apiRequestData<KcaLessonDetail>(`user/kca/lessons/${encodeURIComponent(lessonId)}`, {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

export async function fetchKcaChapter(chapterId: string): Promise<KcaChapterSummary> {
  return apiRequestData<KcaChapterSummary>(`user/kca/chapters/${encodeURIComponent(chapterId)}`, {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

export async function completeKcaChapter(
  chapterId: string,
  options: { acknowledged?: boolean; idempotencyKey?: string; unlockToken?: string } = {},
): Promise<{ id?: string; completed_at?: string }> {
  return apiRequestData(`user/kca/chapters/${encodeURIComponent(chapterId)}/complete`, {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify({
      acknowledged: options.acknowledged ?? true,
      idempotency_key: options.idempotencyKey ?? undefined,
      unlock_token: options.unlockToken ?? undefined,
    }),
  });
}

export async function createKcaStudyNote(input: {
  title?: string;
  body: string;
  lessonId?: string;
  chapterId?: string;
}): Promise<{ id?: string }> {
  return apiRequestData('user/kca/notes', {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify({
      title: input.title,
      body: input.body,
      lesson_id: input.lessonId,
      chapter_id: input.chapterId,
    }),
  });
}

export async function createKcaDevotionalReading(input: {
  title: string;
  source?: string;
  reflection?: string;
}): Promise<{ id?: string }> {
  return apiRequestData('user/kca/devotionals', {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify(input),
  });
}

export async function recordKcaSoulWin(
  assignmentId: string,
  input: { given_name: string; family_name?: string; phone?: string; email?: string; notes?: string; parent_id?: string },
): Promise<{ id?: string; soul_tree?: KcaAssignmentSummary['soul_tree'] }> {
  return apiRequestData(`user/kca/assignments/${encodeURIComponent(assignmentId)}/souls`, {
    method: 'POST',
    headers: await serverSessionHeaders(),
    body: JSON.stringify(input),
  });
}

export async function fetchKcaMentees(): Promise<Array<JsonObject>> {
  const data = await apiRequestData<unknown>('user/kca/mentees', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<JsonObject>(data);
}

export async function fetchKcaMentee(enrollmentId: string): Promise<JsonObject> {
  return apiRequestData<JsonObject>(`user/kca/mentees/${encodeURIComponent(enrollmentId)}`, {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}
export async function fetchKcaModule(moduleId: string): Promise<KcaModuleSummary> {
  return apiRequestData<KcaModuleSummary>(`user/kca/modules/${encodeURIComponent(moduleId)}`, {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

/** GET /user/kca/assignments — evidence submit is POST /user/kca/assignments/{id}/evidence. */
export async function fetchKcaAssignments(): Promise<KcaAssignmentSummary[]> {
  const data = await apiRequestData<unknown>('user/kca/assignments', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
  return asList<KcaAssignmentSummary>(data);
}

export async function fetchKcaAssignment(assignmentId: string): Promise<KcaAssignmentSummary> {
  return apiRequestData<KcaAssignmentSummary>(`user/kca/assignments/${encodeURIComponent(assignmentId)}`, {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

export async function submitKcaEvidence(
  assignmentId: string,
  fileAssetId: string,
  idempotencyKey?: string,
): Promise<{ id?: string; submitted_at?: string }> {
  const key = idempotencyKey ?? newIdempotencyKey('kca-evidence');
  const headers = new Headers(await serverSessionHeaders());
  headers.set('Idempotency-Key', key);
  return apiRequestData(`user/kca/assignments/${encodeURIComponent(assignmentId)}/evidence`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      file_asset_id: fileAssetId,
      idempotency_key: key,
    }),
  });
}

export async function downloadKcaCertificatePdf(): Promise<Response> {
  const headers = new Headers(await serverSessionHeaders());
  headers.set('Accept', 'application/pdf, application/json');
  return apiRequestResponse('user/kca/certificates/current/download', {
    method: 'GET',
    headers,
  });
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

export type KcaOrientationStage = {
  key?: string;
  title?: string;
  subtitle?: string;
  body?: string | null;
  module_id?: string | null;
  lesson_id?: string | null;
  modules?: Array<JsonObject>;
  mentor?: JsonObject | null;
};

export type KcaOrientation = {
  enrolled?: boolean;
  welcome?: string;
  stages?: KcaOrientationStage[];
};

export async function fetchKcaOrientation(): Promise<KcaOrientation> {
  return apiRequestData<KcaOrientation>('user/kca/orientation', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

export type KcaPracticalService = {
  enrolled?: boolean;
  departments?: Array<JsonObject>;
  departments_count?: number;
  hours_served?: number;
  status?: string;
  on_track?: boolean;
};

export async function fetchKcaPracticalService(): Promise<KcaPracticalService> {
  return apiRequestData<KcaPracticalService>('user/kca/practical-service', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

export async function fetchKcaDirectory(filters: {
  q?: string;
  scope?: string;
  country?: string;
  region?: string;
  locality?: string;
} = {}): Promise<JsonObject[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.scope) params.set('scope', filters.scope);
  if (filters.country) params.set('country', filters.country);
  if (filters.region) params.set('region', filters.region);
  if (filters.locality) params.set('locality', filters.locality);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const data = await apiRequestData<unknown>(`user/kca/directory${suffix}`, {
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
