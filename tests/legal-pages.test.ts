import assert from 'node:assert/strict';
import test from 'node:test';
import { legalPageBySlug, legalPages } from '../lib/legal-pages.ts';
import { legalPublicPages } from '../lib/site-routes.ts';

test('every footer legal page has published body copy and sections', () => {
  for (const page of legalPublicPages) {
    const copy = legalPageBySlug(page.slug);
    assert.ok(copy, `Missing legal copy for ${page.slug}`);
    assert.equal(copy?.title, page.title);
    assert.ok((copy?.body ?? '').length > 40, page.slug);
    assert.ok((copy?.sections.length ?? 0) >= 3, page.slug);
  }
  assert.equal(Object.keys(legalPages).length, legalPublicPages.length);
});
