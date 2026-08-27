import assert from 'node:assert/strict';
import test from 'node:test';
import {
  emptyGivingDraft,
  parseGivingAmountMajor,
  readGivingDraft,
  writeGivingDraft,
  writeGivingReceiptSnapshot,
  readGivingReceiptSnapshot,
  GIVING_DRAFT_KEY,
  GIVING_RECEIPT_KEY,
} from '../lib/giving-flow.ts';

test('parseGivingAmountMajor rejects empty and non-positive values', () => {
  assert.equal(parseGivingAmountMajor(''), null);
  assert.equal(parseGivingAmountMajor('0'), null);
  assert.equal(parseGivingAmountMajor('-12'), null);
  assert.equal(parseGivingAmountMajor('abc'), null);
  assert.equal(parseGivingAmountMajor('5100'), 5100);
  assert.equal(parseGivingAmountMajor('5,100'), 5100);
});

test('giving draft and receipt snapshots round-trip through sessionStorage', () => {
  const store = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    value: {
      sessionStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    },
    configurable: true,
  });

  const draft = { ...emptyGivingDraft(), amount: '2500', fund: 'Tithe', note: 'For mum' };
  writeGivingDraft(draft);
  assert.equal(store.has(GIVING_DRAFT_KEY), true);
  assert.deepEqual(readGivingDraft(), { ...draft, currency: 'NGN' });

  writeGivingReceiptSnapshot({
    receiptId: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
    receiptNumber: 'FHC-ABC',
    intentId: '01ARZ3NDEKTSV4RRFFQ69G5FBW',
    amountMinor: 250000,
    currency: 'NGN',
    fund: 'Tithe',
    note: 'For mum',
    method: 'Card',
    issuedAt: '2026-08-27T10:00:00Z',
    status: 'completed',
  });
  assert.equal(store.has(GIVING_RECEIPT_KEY), true);
  const snap = readGivingReceiptSnapshot();
  assert.equal(snap?.amountMinor, 250000);
  assert.equal(snap?.receiptNumber, 'FHC-ABC');
});
