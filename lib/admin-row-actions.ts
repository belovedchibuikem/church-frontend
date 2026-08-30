/**
 * Shared helpers so View/Edit/Delete behave consistently across admin modules.
 */

import { resolveEntityKey } from './admin-form-schemas';

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

/** Routes where Laravel exposes a real DELETE (or delete-like) mutation. */
const DELETABLE_ROUTE_PATTERNS: RegExp[] = [
  /^\/admin\/churches(?!\/)/,
  /\/first-timers/,
  /^\/admin\/people\/first-timers/,
  /\/converts/,
  /\/evangelism/,
  /\/departments/,
  /\/workers/,
  /\/leadership/,
  /\/leaders/,
  /\/disciples/,
  /\/counselling/,
  /\/testimonies/,
  /\/attendance/,
  /^\/admin\/kca\/lecturers/,
  /^\/admin\/kca\/mentors/,
  /\/content\/.*items/,
];

/** Routes where Laravel exposes create/update style mutations usable from Edit. */
const EDITABLE_ROUTE_PATTERNS: RegExp[] = [
  /^\/admin\/churches(?!\/)/,
  /\/first-timers/,
  /^\/admin\/home-churches(?!\/applications)/,
  /^\/admin\/kca\/modules/,
  /^\/admin\/kca\/lessons/,
  /^\/admin\/kca\/cohorts/,
  /^\/admin\/kca\/lecturers/,
  /^\/admin\/kca\/mentors/,
  /^\/admin\/kca\/applications/,
  /^\/admin\/kca\/review-queue/,
  /^\/admin\/people\/prayer-requests/,
  /^\/admin\/people\/needs/,
  /^\/admin\/people\/follow-up/,
  /^\/admin\/people\/first-timers/,
  /\/converts/,
  /\/evangelism/,
  /\/departments/,
  /\/workers/,
  /\/leadership/,
  /\/leaders/,
  /\/disciples/,
  /\/counselling/,
  /\/testimonies/,
  /\/attendance/,
  /^\/admin\/people$/,
  /^\/admin\/mission\/crusades/,
  /^\/admin\/mission\/souls/,
];

export function rowActionCapabilities(route: string): { canEdit: boolean; canDelete: boolean } {
  return {
    canEdit: EDITABLE_ROUTE_PATTERNS.some((pattern) => pattern.test(route)),
    canDelete: DELETABLE_ROUTE_PATTERNS.some((pattern) => pattern.test(route)),
  };
}

export function resolveRowEntityKey(route: string, screenId?: string, explicit?: string): string | undefined {
  return explicit || resolveEntityKey(route, screenId);
}

export function formatRowActionRecord(displayName: string | undefined, id: string | undefined): string {
  const name = (displayName ?? '').trim();
  const recordId = (id ?? '').trim();
  if (recordId && ULID.test(recordId)) {
    return name ? `${name} ${recordId}` : recordId;
  }
  return name || 'record';
}

/** Build editable field list from cached record details when no schema exists. */
export function fieldsFromRecordDetails(
  details: Record<string, string>,
): Array<{ label: string; name: string; type: 'text' | 'textarea'; wide?: boolean }> {
  const skip = new Set(['id', 'public_id', 'created_at', 'updated_at', 'published_at']);
  const fields: Array<{ label: string; name: string; type: 'text' | 'textarea'; wide?: boolean }> = [];
  for (const [key, value] of Object.entries(details)) {
    if (!value || value === '—') continue;
    if (skip.has(key)) continue;
    if (key.startsWith('__')) continue;
    if (key.endsWith('_label')) continue;
    if (/^[A-Z]/.test(key) && key.includes(' ')) continue; // friendly preview keys like "Record ID"
    if (key === 'Name' || key === 'Location' || key === 'Region' || key === 'Status') continue;
    const isLong = value.length > 80 || key.includes('note') || key.includes('summary') || key.includes('instruction');
    fields.push({
      label: key.replaceAll('_', ' ').replace(/\bid\b/gi, 'ID'),
      name: key,
      type: isLong ? 'textarea' : 'text',
      wide: isLong || key.endsWith('_id'),
    });
  }
  return fields.slice(0, 24);
}
