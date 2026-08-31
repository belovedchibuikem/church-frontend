import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_COUNTRY_CODE,
  FALLBACK_COUNTRIES,
  countrySelectOptions,
  formatLocationLine,
  isNigeria,
  localityLabelFor,
  namesToOptions,
  nigeriaLocalityNames,
  nigeriaStateNames,
} from '../lib/geography.ts';
import { draftFromFormData } from '../lib/auth-session.ts';
import { formFieldsFor } from '../lib/site-content.ts';

test('Nigeria catalogue includes all 36 states, FCT, and 770+ LGAs', () => {
  assert.ok(nigeriaStateNames().length >= 37);
  assert.ok(nigeriaStateNames().some((name) => /lagos/i.test(name)));
  assert.ok(nigeriaStateNames().some((name) => /kano/i.test(name)));
  assert.ok(nigeriaStateNames().some((name) => /federal capital/i.test(name)));
  const lgaCount = nigeriaStateNames().reduce((total, state) => total + nigeriaLocalityNames(state).length, 0);
  assert.ok(lgaCount >= 770);
  assert.ok(nigeriaLocalityNames('Lagos').includes('Ikeja'));
  assert.ok(nigeriaLocalityNames('Lagos State').includes('Ikeja'));
  assert.ok(nigeriaLocalityNames('Federal Capital Territory').includes('Bwari'));
});

test('Nigeria is the default country and uses an LGA label', () => {
  assert.equal(DEFAULT_COUNTRY_CODE, 'NG');
  assert.equal(isNigeria('ng'), true);
  assert.equal(localityLabelFor('NG'), 'LGA / City');
  assert.equal(localityLabelFor('GH'), 'City / Area');
  assert.ok(FALLBACK_COUNTRIES.some((country) => country.code === 'NG' && country.name === 'Nigeria'));
});

test('country and name helpers build searchable select options', () => {
  const options = countrySelectOptions([{ code: 'NG', name: 'Nigeria', flag: '🇳🇬' }]);
  assert.equal(options[0]?.value, 'NG');
  assert.match(options[0]?.label ?? '', /Nigeria/);
  assert.deepEqual(namesToOptions(['Ikeja', 'Surulere']), [
    { value: 'Ikeja', label: 'Ikeja' },
    { value: 'Surulere', label: 'Surulere' },
  ]);
});

test('formatLocationLine joins locality, region, and country', () => {
  assert.equal(
    formatLocationLine({
      locality: 'Ikeja',
      region: 'Lagos State',
      country: 'NG',
      countryLabel: 'Nigeria',
    }),
    'Ikeja, Lagos State, Nigeria',
  );
  assert.equal(formatLocationLine({ countryLabel: 'Nigeria' }), 'Nigeria');
});

test('draftFromFormData keeps location fields and ignores missing later-step keys', () => {
  const form = new FormData();
  form.set('email', 'ada@example.test');
  form.set('phone', '+2348012345678');
  form.set('country', 'ng');
  form.set('country_label', 'Nigeria');
  form.set('region', 'Lagos State');
  form.set('locality', 'Ikeja');

  const draft = draftFromFormData(form);
  assert.equal(draft.email, 'ada@example.test');
  assert.equal(draft.country, 'NG');
  assert.equal(draft.country_label, 'Nigeria');
  assert.equal(draft.region, 'Lagos State');
  assert.equal(draft.locality, 'Ikeja');
  assert.equal(draft.given_name, undefined);
  assert.equal(draft.password, undefined);
});

test('registration contact uses shared geography and review does not re-ask the same fields', () => {
  const contact = formFieldsFor('/register/contact');
  assert.equal(contact.some((field) => field.type === 'geography'), true);
  assert.equal(contact.some((field) => field.name === 'administrative_unit_id'), false);
  assert.deepEqual(formFieldsFor('/register/review'), []);
  assert.equal(formFieldsFor('/onboarding/location').some((field) => field.type === 'geography'), true);
});
