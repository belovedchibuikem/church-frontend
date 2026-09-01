import assert from 'node:assert/strict';
import test from 'node:test';
import { bibleChapterPath, bookAbbrev } from '../lib/bible-paths.ts';

test('bible chapter paths keep verse hash and version query', () => {
  assert.equal(bibleChapterPath('john', 3), '/bible/john/3');
  assert.equal(bibleChapterPath('john', 3, 16), '/bible/john/3#v16');
  assert.equal(bibleChapterPath('john', 3, 16, 'kjv'), '/bible/john/3?v=kjv#v16');
});

test('book abbreviations fall back to canon ids', () => {
  assert.equal(
    bookAbbrev({ id: 'jhn', slug: 'john', name: 'John', testament: 'nt', chapters: 21, abbrev: 'JHN' }),
    'JHN',
  );
  assert.equal(
    bookAbbrev({ id: 'gen', slug: 'genesis', name: 'Genesis', testament: 'ot', chapters: 50 }),
    'GEN',
  );
});
