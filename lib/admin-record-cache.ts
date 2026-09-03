/**
 * In-memory cache of admin list records so View/Edit/Delete overlays can
 * prefill from the selected row without a GET-by-id endpoint.
 */

const ULID_PATTERN = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i;

const recordCache = new Map<string, Record<string, string>>();

function asText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? undefined : trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

/** Flatten an ops/API list item into form-friendly string details. */
export function mapOpsRecordToFormDetails(item: Record<string, unknown>): Record<string, string> {
  const details: Record<string, string> = {};

  for (const [key, value] of Object.entries(item)) {
    const text = asText(value);
    if (text !== undefined) details[key] = text;
  }

  const id = asText(item.id) ?? asText(item.public_id);
  if (id) details.id = id;

  // SearchSelect companion labels (field_name_label).
  const labelPairs: Array<[string, string]> = [
    ['location_id', 'location_name'],
    ['administrative_unit_id', 'administrative_unit_name'],
    ['church_id', 'church_name'],
    ['home_church_id', 'home_church_name'],
    ['person_id', 'person_name'],
    ['leader_person_id', 'leader_name'],
    ['country_id', 'country_name'],
    ['lecturer_person_id', 'lecturer_name'],
    ['mentor_person_id', 'mentor_name'],
    ['kca_module_id', 'module_title'],
    ['module_id', 'module_title'],
    ['kca_lesson_id', 'lesson_title'],
    ['lesson_id', 'lesson_title'],
    ['kca_cohort_id', 'cohort_name'],
    ['year_id', 'year_name'],
    ['kca_year_id', 'year_name'],
    ['kca_enrollment_id', 'student_name'],
    ['enrollment_id', 'student_name'],
  ];
  for (const [idKey, nameKey] of labelPairs) {
    const idValue = asText(item[idKey]);
    const labelValue = asText(item[nameKey]) ?? asText(item.person_name);
    if (idValue) details[idKey] = idValue;
    if (labelValue) details[`${idKey}_label`] = labelValue;
  }
  if (details.module_id && !details.kca_module_id) {
    details.kca_module_id = details.module_id;
    if (details.module_id_label) details.kca_module_id_label = details.module_id_label;
  }
  if (details.lesson_id && !details.kca_lesson_id) {
    details.kca_lesson_id = details.lesson_id;
    if (details.lesson_id_label) details.kca_lesson_id_label = details.lesson_id_label;
  }
  if (details.enrollment_id && !details.kca_enrollment_id) {
    details.kca_enrollment_id = details.enrollment_id;
    if (details.enrollment_id_label) details.kca_enrollment_id_label = details.enrollment_id_label;
  }
  if (asText(item.soul_tree_levels)) {
    details.soul_tree_levels = String(item.soul_tree_levels);
  } else if (item.soul_tree_spec && typeof item.soul_tree_spec === 'object' && !Array.isArray(item.soul_tree_spec)) {
    const levels = (item.soul_tree_spec as { levels?: unknown }).levels;
    if (Array.isArray(levels)) details.soul_tree_levels = levels.map(String).join(',');
  }

  // Friendly preview fields.
  if (asText(item.name)) details.Name = String(item.name);
  if (asText(item.location_name)) details.Location = String(item.location_name);
  if (asText(item.administrative_unit_name)) details.Region = String(item.administrative_unit_name);
  if (typeof item.is_active === 'boolean') {
    details.is_active = item.is_active ? 'Active' : 'Inactive';
  }
  if (item.published_at) {
    details.Status = 'Published';
  } else if (asText(item.status)) {
    details.Status = String(item.status);
  } else if ('published_at' in item) {
    details.Status = 'Draft';
  } else if ('is_active' in item) {
    details.Status = item.is_active === false ? 'Inactive' : 'Active';
  }
  if (asText(item.published_at)) details['Published at'] = String(item.published_at);

  // Church edit form: location_name is "new location" — clear it when an existing location is selected.
  if (details.location_id) {
    details.location_id_label = details.location_id_label || details.location_name || details.Location || '';
    delete details.location_name;
  }

  return details;
}

export function stashAdminRecords(items: Array<Record<string, unknown>>): void {
  for (const item of items) {
    const id = asText(item.id) ?? asText(item.public_id);
    if (!id || !ULID_PATTERN.test(id)) continue;
    recordCache.set(id, mapOpsRecordToFormDetails(item));
  }
}

export function stashAdminRecordDetails(id: string, details: Record<string, string>): void {
  if (!id || !ULID_PATTERN.test(id)) return;
  recordCache.set(id, { ...recordCache.get(id), ...details, id });
}

export function getAdminRecordDetails(recordOrId?: string | null): Record<string, string> | undefined {
  if (!recordOrId) return undefined;
  const trimmed = recordOrId.trim();
  if (ULID_PATTERN.test(trimmed)) return recordCache.get(trimmed);
  const match = trimmed.match(/[0-7][0-9A-HJKMNP-TV-Z]{25}/i);
  if (!match) return undefined;
  return recordCache.get(match[0]);
}

export function clearAdminRecordCache(): void {
  recordCache.clear();
}
