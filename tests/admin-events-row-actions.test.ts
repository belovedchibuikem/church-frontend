import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';

test('event settings and events catalogue expose edit and delete row actions', async () => {
  const rowActions = await readFile(new URL('../lib/admin-row-actions.ts', import.meta.url), 'utf8');
  assert.match(rowActions, /\/\^\\\/admin\\\/events\//);
  assert.match(rowActions, /\/\^\\\/admin\\\/settings\\\/events\//);

  const schemas = await readFile(new URL('../lib/admin-form-schemas.ts', import.meta.url), 'utf8');
  assert.match(schemas, /\\\/admin\\\/settings\\\/events/);
  assert.match(schemas, /entity: 'event'/);
});

test('event row actions navigate to detail and dispatch live mutations', async () => {
  const shell = await readFile(new URL('../components/admin-interaction-shell.tsx', import.meta.url), 'utf8');
  assert.match(shell, /\/admin\/settings\/events/);
  assert.match(shell, /navigate\(`\/admin\/events\/\$\{recordId\}`\)/);
  assert.match(shell, /edit=1/);

  const dispatcher = await readFile(new URL('../lib/admin-mutation-dispatcher.ts', import.meta.url), 'utf8');
  assert.match(dispatcher, /\/admin\/settings\/events/);
  assert.match(dispatcher, /labelIs\(label, \/edit\|update\|save\/\)/);
  assert.match(dispatcher, /labelIs\(label, \/delete\/\)/);
  assert.match(dispatcher, /method: 'DELETE'/);

  const eventsUi = await readFile(new URL('../components/events-ui.tsx', import.meta.url), 'utf8');
  assert.match(eventsUi, /searchParams\.get\('edit'\) === '1'/);
});
