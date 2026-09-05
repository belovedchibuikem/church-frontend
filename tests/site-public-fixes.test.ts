import assert from 'node:assert/strict';
import test from 'node:test';
import { CHURCH_LEADERSHIP_TITLES } from '../lib/church-leadership.ts';
import { heroPrimaryHref } from '../lib/site-flow.ts';

test('church leadership titles include resident pastor and associate pastor', () => {
  for (const title of ['Resident Pastor', 'Associate Pastor', 'Evangelist', 'Deaconess', 'President', 'Minister', 'Prophet']) {
    assert.ok(CHURCH_LEADERSHIP_TITLES.includes(title as (typeof CHURCH_LEADERSHIP_TITLES)[number]), title);
  }
});

test('KCA and Press hero buttons point at live routes', () => {
  assert.equal(heroPrimaryHref('/kca', 'KCA', 'Apply Now'), '/kca/enrol');
  assert.equal(heroPrimaryHref('/kca/why', 'KCA', 'Start Application'), '/kca/enrol');
  assert.equal(heroPrimaryHref('/press', 'Press', 'Explore Library'), '/press/publications');
});
