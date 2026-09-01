import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogForIdField, labelForIdField } from '../lib/id-field-catalog.ts';

test('entity id fields map to searchable catalogs', () => {
  assert.equal(catalogForIdField('church_id'), 'church');
  assert.equal(catalogForIdField('churchId'), 'church');
  assert.equal(catalogForIdField('person_id'), 'person');
  assert.equal(catalogForIdField('memberId'), 'person');
  assert.equal(catalogForIdField('leader_person_id'), 'person');
  assert.equal(catalogForIdField('home_church_id'), 'homeChurch');
  assert.equal(catalogForIdField('first_timer_id'), 'firstTimer');
  assert.equal(catalogForIdField('assigned_to_user_id'), 'user');
  assert.equal(catalogForIdField('payment_transaction_id'), 'finance.payment_transactions');
  assert.equal(catalogForIdField('event_registration_id'), 'events.registrations');
  assert.equal(catalogForIdField('crusade_id'), 'crusade');
  assert.equal(catalogForIdField('mission_team_assignment_id'), 'missionTeamAssignment');
  assert.equal(catalogForIdField('year_id'), 'kcaYear');
  assert.equal(catalogForIdField('kca_lesson_id'), 'kcaLesson');
  assert.equal(catalogForIdField('kca_chapter_id'), 'kcaChapter');
});

test('config strings that end in id are not treated as record pickers', () => {
  assert.equal(catalogForIdField('sms_sender_id'), undefined);
  assert.equal(catalogForIdField('whatsapp_phone_number_id'), undefined);
  assert.equal(catalogForIdField('title'), undefined);
});

test('id field labels drop the raw id wording', () => {
  assert.equal(labelForIdField('church_id', 'Church id *'), 'Church');
  assert.equal(labelForIdField('person_id'), 'Person');
});
