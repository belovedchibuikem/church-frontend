import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_APP_NAME, defaultPublicBranding } from '../lib/branding.ts';

test('public branding defaults keep the product name until an admin upload exists', () => {
  assert.equal(DEFAULT_APP_NAME, 'Family House Connect');
  assert.deepEqual(defaultPublicBranding(), {
    app_name: 'Family House Connect',
    logo_url: null,
    favicon_url: null,
  });
});
