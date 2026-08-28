import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { preferSameOriginBrowserApi } from '../lib/api-config.ts';

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true, writable: true });
  }
});

test('preferSameOriginBrowserApi keeps server URLs unchanged', () => {
  Reflect.deleteProperty(globalThis, 'window');
  assert.equal(
    preferSameOriginBrowserApi('http://localhost:8000/api/v1'),
    'http://localhost:8000/api/v1',
  );
});

test('preferSameOriginBrowserApi rewrites cross-port loopback to the page origin', () => {
  Object.defineProperty(globalThis, 'window', {
    value: { location: { origin: 'http://localhost:3000', hostname: 'localhost' } },
    configurable: true,
    writable: true,
  });
  assert.equal(
    preferSameOriginBrowserApi('http://localhost:8000/api/v1'),
    'http://localhost:3000/api/v1',
  );
  assert.equal(
    preferSameOriginBrowserApi('http://localhost:3000/api/v1'),
    'http://localhost:3000/api/v1',
  );
});

test('preferSameOriginBrowserApi rewrites split production hosts to same-origin /api/v1', () => {
  Object.defineProperty(globalThis, 'window', {
    value: { location: { origin: 'https://familyconnect-vert.vercel.app', hostname: 'familyconnect-vert.vercel.app' } },
    configurable: true,
    writable: true,
  });
  assert.equal(
    preferSameOriginBrowserApi('https://familyconnect.katakarra.com/api/v1'),
    'https://familyconnect-vert.vercel.app/api/v1',
  );
});
