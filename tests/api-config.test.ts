import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { preferSameOriginLoopback } from '../lib/api-config.ts';

const originalWindow = globalThis.window;

afterEach(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window');
  } else {
    Object.defineProperty(globalThis, 'window', { value: originalWindow, configurable: true, writable: true });
  }
});

test('preferSameOriginLoopback keeps server URLs unchanged', () => {
  Reflect.deleteProperty(globalThis, 'window');
  assert.equal(
    preferSameOriginLoopback('http://localhost:8000/api/v1'),
    'http://localhost:8000/api/v1',
  );
});

test('preferSameOriginLoopback rewrites cross-port loopback to the page origin', () => {
  Object.defineProperty(globalThis, 'window', {
    value: { location: { origin: 'http://localhost:3000', hostname: 'localhost' } },
    configurable: true,
    writable: true,
  });
  assert.equal(
    preferSameOriginLoopback('http://localhost:8000/api/v1'),
    'http://localhost:3000/api/v1',
  );
  assert.equal(
    preferSameOriginLoopback('http://localhost:3000/api/v1'),
    'http://localhost:3000/api/v1',
  );
});
