import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  isLoopbackHostname,
  laravelDevProxyOrigin,
  serializeForwardedCookies,
} from '../lib/laravel-dev-proxy.ts';

test('laravelDevProxyOrigin strips /api/v1 and preserves loopback host', () => {
  assert.equal(laravelDevProxyOrigin('http://localhost:8000/api/v1'), 'http://localhost:8000');
  assert.equal(laravelDevProxyOrigin('http://127.0.0.1:8000/api/v1'), 'http://127.0.0.1:8000');
  assert.equal(laravelDevProxyOrigin('http://127.0.0.1:8000'), 'http://127.0.0.1:8000');
  assert.equal(laravelDevProxyOrigin(undefined), 'http://localhost:8000');
});

test('isLoopbackHostname covers local hosts', () => {
  assert.equal(isLoopbackHostname('localhost'), true);
  assert.equal(isLoopbackHostname('127.0.0.1'), true);
  assert.equal(isLoopbackHostname('example.test'), false);
});

test('serializeForwardedCookies encodes values for the Cookie header', () => {
  assert.equal(
    serializeForwardedCookies([{ name: 'family_house_connect_session', value: 'abc=def' }]),
    'family_house_connect_session=abc%3Ddef',
  );
});
