import assert from 'node:assert/strict';
import { afterEach, before, test } from 'node:test';
import { ApiError } from '../lib/api-client.ts';
import {
  downloadPressPublication,
  fetchEventTicket,
  formatByteSize,
  formatUserApiError,
  isNotFoundError,
  isPaymentGovernanceDenied,
  KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE,
  requestChurchMembership,
} from '../lib/user-api.ts';

process.env.FHC_LARAVEL_API_URL ??= 'http://example.test/api/v1';
process.env.NEXT_PUBLIC_FHC_API_URL ??= 'http://example.test/api/v1';

const PUBLICATION_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FAV';
const REGISTRATION_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FBW';
const CHURCH_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FCX';
const MEMBERSHIP_ULID = '01ARZ3NDEKTSV4RRFFQ69G5FDY';

type FetchCall = {
  url: string;
  method: string;
  body: string | null;
};

const originalFetch = globalThis.fetch;
let fetchCalls: FetchCall[] = [];

before(() => {
  process.env.NEXT_PUBLIC_FHC_API_URL = 'http://example.test/api/v1';
  process.env.FHC_LARAVEL_API_URL = 'http://example.test/api/v1';
  const cookieBox = { value: 'XSRF-TOKEN=test-xsrf' };
  Object.defineProperty(globalThis, 'window', { value: {}, configurable: true, writable: true });
  Object.defineProperty(globalThis, 'document', {
    value: {
      get cookie() {
        return cookieBox.value;
      },
      set cookie(next: string) {
        cookieBox.value = next;
      },
    },
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  fetchCalls = [];
});

function installFetch(handler: (call: FetchCall) => Response): FetchCall[] {
  fetchCalls = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const call: FetchCall = {
      url,
      method: String(init?.method ?? 'GET').toUpperCase(),
      body: typeof init?.body === 'string' ? init.body : init?.body == null ? null : String(init.body),
    };
    fetchCalls.push(call);
    return handler(call);
  }) as typeof fetch;
  return fetchCalls;
}

test('user-api keeps OD-008 evidence submit gated', () => {
  assert.match(KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE, /OD-008/);
  assert.doesNotMatch(KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE, /submitted successfully/i);
});

test('formatUserApiError and not-found helpers stay honest', () => {
  const missing = new ApiError(404, 'This item is not available.', 'corr-1', { code: 'RESOURCE_NOT_FOUND' });
  assert.equal(isNotFoundError(missing), true);
  assert.equal(formatUserApiError(missing), 'This item is not available.');

  const governance = new ApiError(422, 'Payment governance has not enabled giving payment intents.', 'corr-2', {
    code: 'PAYMENT_GOVERNANCE_DENIED',
  });
  assert.equal(isPaymentGovernanceDenied(governance), true);
  assert.match(formatUserApiError(governance), /governance/i);
  assert.equal(formatByteSize(200), '200 B');
});

test('requestChurchMembership posts to /user/churches/{id}/memberships', async () => {
  installFetch((call) => {
    if (call.url.includes('/auth/csrf-cookie')) {
      return new Response(JSON.stringify({ data: { csrf_cookie: true, csrf_token: 'test-csrf' }, meta: {} }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    assert.match(call.url, new RegExp(`/user/churches/${CHURCH_ULID}/memberships$`));
    assert.equal(call.method, 'POST');
    return new Response(
      JSON.stringify({
        data: { id: MEMBERSHIP_ULID, church_id: CHURCH_ULID, status: 'active' },
        meta: {},
        correlation_id: 'corr-mem',
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  });

  const membership = await requestChurchMembership(CHURCH_ULID);
  assert.equal(membership.id, MEMBERSHIP_ULID);
  assert.equal(membership.status, 'active');
});

test('fetchEventTicket returns the registration ticket and maps 404 to null', async () => {
  installFetch((call) => {
    assert.match(call.url, new RegExp(`/user/events/registrations/${REGISTRATION_ULID}$`));
    assert.equal(call.method, 'GET');
    return new Response(
      JSON.stringify({
        data: { id: REGISTRATION_ULID, status: 'confirmed' },
        meta: {},
        correlation_id: 'corr-ticket',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  });

  const ticket = await fetchEventTicket(REGISTRATION_ULID);
  assert.equal(ticket?.id, REGISTRATION_ULID);
  assert.equal(ticket?.status, 'confirmed');

  installFetch(() => {
    return new Response(
      JSON.stringify({
        error: { code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.', details: {} },
        meta: {},
        correlation_id: 'corr-404',
      }),
      { status: 404, headers: { 'content-type': 'application/json' } },
    );
  });

  const missing = await fetchEventTicket(REGISTRATION_ULID);
  assert.equal(missing, null);
});

test('downloadPressPublication returns 200 bytes and throws on 404 JSON', async () => {
  const payload = Buffer.alloc(200, 0x41);
  installFetch((call) => {
    assert.match(call.url, new RegExp(`/press/publications/${PUBLICATION_ULID}/download$`));
    assert.equal(call.method, 'GET');
    return new Response(payload, {
      status: 200,
      headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="Hope.pdf"' },
    });
  });

  const ok = await downloadPressPublication(PUBLICATION_ULID);
  assert.equal(ok.status, 200);
  assert.equal((await ok.arrayBuffer()).byteLength, 200);

  installFetch(() => {
    return new Response(
      JSON.stringify({
        error: { code: 'RESOURCE_NOT_FOUND', message: 'The requested resource was not found.', details: {} },
        meta: {},
        correlation_id: 'corr-press-404',
      }),
      { status: 404, headers: { 'content-type': 'application/json' } },
    );
  });

  await assert.rejects(
    () => downloadPressPublication(PUBLICATION_ULID),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 404);
      assert.equal(error.code, 'RESOURCE_NOT_FOUND');
      return true;
    },
  );
});
