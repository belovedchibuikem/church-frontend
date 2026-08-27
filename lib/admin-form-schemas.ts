import type { catalogOptions, FormCatalogKey, LiveCatalogKey } from './form-catalogs';

export type FormFieldType = 'text' | 'email' | 'date' | 'number' | 'select' | 'search-select' | 'textarea' | 'checkbox';

export type AdminFormField = {
  label: string;
  name: string;
  type?: FormFieldType;
  options?: string[];
  /** Prefer FormCatalogKey for static fixtures; LiveCatalogKey enables domain catalog search. */
  catalog?: FormCatalogKey | LiveCatalogKey;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
  helpText?: string;
};

export type AdminFormSchema = {
  entity: string;
  fields: AdminFormField[];
};

/** Form schemas aligned with Laravel model fillable columns. */
export const adminFormSchemas: Record<string, AdminFormSchema> = {
  kca_module: {
    entity: 'KCA module',
    fields: [
      { label: 'Module title', name: 'title', type: 'text', required: true, placeholder: 'e.g. Identity in Christ' },
      { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. Y1-M01', helpText: 'Unique module code stored in kca_modules.code' },
      { label: 'Sequence', name: 'sequence', type: 'number', required: true, placeholder: '1', helpText: 'Order within the curriculum (kca_modules.sequence)' },
      { label: 'Status', name: 'is_active', type: 'select', required: true, options: ['Active', 'Inactive'] },
      { label: 'Primary lecturer', name: 'lecturer_person_id', type: 'search-select', catalog: 'person', placeholder: 'Search lecturer (kca_lecturer_assignments)', wide: true },
    ],
  },
  kca_lesson: {
    entity: 'KCA lesson',
    fields: [
      { label: 'Module', name: 'kca_module_id', type: 'search-select', catalog: 'kcaModule', required: true, placeholder: 'Search module' },
      { label: 'Lesson title', name: 'title', type: 'text', required: true, placeholder: 'e.g. Who Am I in Christ?' },
      { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. L01' },
      { label: 'Sequence', name: 'sequence', type: 'number', required: true, placeholder: '1' },
    ],
  },
  kca_cohort: {
    entity: 'KCA cohort',
    fields: [
      { label: 'Cohort name', name: 'name', type: 'text', required: true, placeholder: 'e.g. 2024 Cohort A' },
      { label: 'Year', name: 'year', type: 'number', required: true, placeholder: '2024' },
      { label: 'Region', name: 'region_id', type: 'search-select', catalog: 'region', placeholder: 'Search region' },
      { label: 'Start date', name: 'starts_at', type: 'date', required: true },
      { label: 'Status', name: 'status', type: 'select', options: ['Active', 'Completed', 'Archived'] },
    ],
  },
  home_church: {
    entity: 'Home church',
    fields: [
      { label: 'Name', name: 'name', type: 'text', required: true, placeholder: 'Enter home church name' },
      { label: 'Parent church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Leader', name: 'leader_person_id', type: 'search-select', catalog: 'person', placeholder: 'Search leader' },
      { label: 'Administrative unit', name: 'administrative_unit_id', type: 'search-select', catalog: 'administrativeUnit', placeholder: 'Search unit' },
      { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location' },
      { label: 'Status', name: 'status', type: 'select', options: ['Active', 'Suspended', 'Closed'] },
    ],
  },
  church: {
    entity: 'Church',
    fields: [
      { label: 'Name', name: 'name', type: 'text', required: true, placeholder: 'Enter church name' },
      { label: 'Administrative unit', name: 'administrative_unit_id', type: 'search-select', catalog: 'administrativeUnit', placeholder: 'Search unit' },
      { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location' },
      { label: 'Church type', name: 'church_type', type: 'select', options: ['Conventional', 'Home', 'Online', 'Mission'] },
      { label: 'Status', name: 'status', type: 'select', options: ['Active', 'Pending', 'Suspended', 'Closed'] },
    ],
  },
  person: {
    entity: 'Person',
    fields: [
      { label: 'Given name', name: 'given_name', type: 'text', required: true, placeholder: 'First name' },
      { label: 'Family name', name: 'family_name', type: 'text', required: true, placeholder: 'Last name' },
      { label: 'Email', name: 'email', type: 'email', placeholder: 'name@example.org' },
      { label: 'Phone', name: 'phone', type: 'text', placeholder: '+234' },
      { label: 'Gender', name: 'gender', type: 'select', options: ['Male', 'Female', 'Prefer not to say'] },
    ],
  },
};

const routeEntityMap: Array<{ pattern: RegExp; entity: string }> = [
  { pattern: /\/admin\/kca\/modules\/new/, entity: 'kca_module' },
  { pattern: /\/admin\/kca\/modules/, entity: 'kca_module' },
  { pattern: /\/admin\/kca\/lessons/, entity: 'kca_lesson' },
  { pattern: /\/admin\/kca\/cohorts/, entity: 'kca_cohort' },
  { pattern: /\/admin\/home-churches/, entity: 'home_church' },
  { pattern: /\/admin\/churches/, entity: 'church' },
  { pattern: /\/admin\/(members|people|users)/, entity: 'person' },
];

const screenEntityMap: Record<string, string> = {
  'H-09': 'kca_module',
  'H-10': 'kca_module',
  'H-12': 'kca_lesson',
  'H-03': 'kca_cohort',
};

export function resolveEntityKey(route: string, screenId?: string): string | undefined {
  if (screenId && screenEntityMap[screenId]) return screenEntityMap[screenId];
  return routeEntityMap.find(({ pattern }) => pattern.test(route))?.entity;
}

export function fieldsForEntity(entityKey: string): AdminFormField[] {
  return adminFormSchemas[entityKey]?.fields ?? [];
}

/** Map legacy display labels to DB column names for edit defaults. */
const legacyDetailAliases: Record<string, string> = {
  'Module Title': 'title',
  Title: 'title',
  Code: 'code',
  Sequence: 'sequence',
  Status: 'is_active',
  Lecturer: 'lecturer_person_id',
  'Primary lecturer': 'lecturer_person_id',
  Year: 'year',
  Name: 'name',
  Module: 'kca_module_id',
};

export function normalizeDetailValues(details: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    const mapped = legacyDetailAliases[key] ?? key;
    if (mapped === 'is_active') {
      normalized[mapped] = /inactive|false|0/i.test(value) ? 'Inactive' : 'Active';
    } else {
      normalized[mapped] = value;
    }
  }
  return normalized;
}

export function defaultValueForField(field: AdminFormField, values: Record<string, string>): string | undefined {
  const direct = values[field.name];
  if (direct !== undefined) return direct;
  if (field.name === 'is_active' && values.status) return /inactive/i.test(values.status) ? 'Inactive' : 'Active';
  return undefined;
}
