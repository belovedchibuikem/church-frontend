import assert from 'node:assert/strict';
import test from 'node:test';
import { attendanceCounts } from '../lib/attendance-counts.ts';

test('attendanceCounts uses gender breakdown when present', () => {
  const counts = attendanceCounts({ males: 11, females: 7, children: 7, total: 25 });
  assert.deepEqual(counts, { males: 11, females: 7, children: 7, total: 25 });
});

test('attendanceCounts falls back to adults when gender columns are missing', () => {
  const counts = attendanceCounts({ adults: 18, children: 7 });
  assert.deepEqual(counts, { males: 18, females: 0, children: 7, total: 25 });
});

test('attendanceCounts computes total when API omits it', () => {
  const counts = attendanceCounts({ males: 5, females: 4, children: 3 });
  assert.equal(counts.total, 12);
});
