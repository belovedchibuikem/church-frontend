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
      { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. 2024-A' },
      { label: 'KCA year', name: 'year_id', type: 'search-select', catalog: 'kcaYear', required: true, placeholder: 'Search academic year' },
      { label: 'Starts on', name: 'starts_on', type: 'date', required: true },
      { label: 'Ends on', name: 'ends_on', type: 'date', required: true },
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
      { label: 'Country', name: 'country_id', type: 'search-select', catalog: 'country', placeholder: 'Search country', helpText: 'Required when creating a new location (not selecting an existing one).' },
      { label: 'Administrative unit', name: 'administrative_unit_id', type: 'search-select', catalog: 'administrativeUnit', required: true, placeholder: 'Search unit', helpText: 'Org branch that owns this church (state/zone). Select Country first to narrow results. Type to search the API.' },
      { label: 'Existing location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location (or create below)' },
      { label: 'New location name', name: 'location_name', type: 'text', placeholder: 'e.g. Ikeja Campus', helpText: 'Required when no existing location is selected.' },
      { label: 'Address line 1', name: 'address_line_one', type: 'text', placeholder: 'Street address', wide: true },
      { label: 'Address line 2', name: 'address_line_two', type: 'text', placeholder: 'Suite, landmark (optional)', wide: true },
      { label: 'Locality / city', name: 'locality', type: 'text', placeholder: 'City or town' },
      { label: 'Postal code', name: 'postal_code', type: 'text', placeholder: 'Postal code' },
      { label: 'Timezone', name: 'timezone', type: 'text', placeholder: 'Africa/Lagos', helpText: 'Defaults to Africa/Lagos when creating a location.' },
    ],
  },
  kca_lecturer_assignment: {
    entity: 'Lecturer assignment',
    fields: [
      { label: 'Lecturer', name: 'lecturer_person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search lecturer person' },
      { label: 'Module', name: 'kca_module_id', type: 'search-select', catalog: 'kcaModule', required: true, placeholder: 'Search module' },
      { label: 'Cohort', name: 'kca_cohort_id', type: 'search-select', catalog: 'kcaCohort', required: true, placeholder: 'Search cohort' },
      { label: 'Starts at', name: 'starts_at', type: 'date', required: true },
      { label: 'Ends at', name: 'ends_at', type: 'date' },
    ],
  },
  kca_mentor_assignment: {
    entity: 'Mentor assignment',
    fields: [
      { label: 'Mentor', name: 'mentor_person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search mentor person' },
      { label: 'Enrollment', name: 'kca_enrollment_id', type: 'search-select', catalog: 'kcaEnrollment', required: true, placeholder: 'Search student enrollment' },
      { label: 'Starts at', name: 'starts_at', type: 'date', required: true },
      { label: 'Ends at', name: 'ends_at', type: 'date' },
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
  first_timer: {
    entity: 'First timer',
    fields: [
      { label: 'Person', name: 'person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search person' },
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Home church', name: 'home_church_id', type: 'search-select', catalog: 'homeChurch', placeholder: 'Search home church' },
      { label: 'Registered at', name: 'registered_at', type: 'date' },
      { label: 'Person name', name: 'person_name', type: 'text', placeholder: 'Display name' },
      { label: 'Church name', name: 'church_name', type: 'text', placeholder: 'Church' },
    ],
  },
  follow_up_task: {
    entity: 'Follow-up task',
    fields: [
      { label: 'Person', name: 'person_name', type: 'text' },
      { label: 'Type', name: 'type', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
      { label: 'Due at', name: 'due_at', type: 'text' },
      { label: 'Assignee', name: 'assigned_to_name', type: 'text' },
    ],
  },
  prayer_request: {
    entity: 'Prayer request',
    fields: [
      { label: 'Person', name: 'person_name', type: 'text' },
      { label: 'Summary', name: 'summary', type: 'textarea', wide: true },
      { label: 'Status', name: 'status', type: 'text' },
      { label: 'Category', name: 'category', type: 'text' },
    ],
  },
  pastoral_need: {
    entity: 'Pastoral need',
    fields: [
      { label: 'Person', name: 'person_name', type: 'text' },
      { label: 'Summary', name: 'summary', type: 'textarea', wide: true },
      { label: 'Category', name: 'category', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
    ],
  },
  convert: {
    entity: 'Convert',
    fields: [
      { label: 'Person', name: 'person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search person' },
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Home church', name: 'home_church_id', type: 'search-select', catalog: 'homeChurch', placeholder: 'Search home church' },
      { label: 'Converted at', name: 'converted_at', type: 'date' },
      { label: 'Baptized at', name: 'baptized_at', type: 'date' },
      { label: 'Source', name: 'source', type: 'text', placeholder: 'Altar call, crusade…' },
      { label: 'Status', name: 'status', type: 'select', options: ['active', 'discipled', 'member', 'inactive'] },
      { label: 'Notes', name: 'notes', type: 'textarea', wide: true },
    ],
  },
  evangelism_activity: {
    entity: 'Evangelism activity',
    fields: [
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Title', name: 'title', type: 'text', required: true, placeholder: 'Outreach title' },
      { label: 'Activity type', name: 'activity_type', type: 'text', placeholder: 'outreach' },
      { label: 'Souls reached', name: 'souls_reached', type: 'text' },
      { label: 'Decisions', name: 'decisions', type: 'text' },
      { label: 'Occurred at', name: 'occurred_at', type: 'date' },
      { label: 'Status', name: 'status', type: 'select', options: ['planned', 'completed', 'cancelled'] },
      { label: 'Notes', name: 'notes', type: 'textarea', wide: true },
    ],
  },
  department: {
    entity: 'Department',
    fields: [
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Name', name: 'name', type: 'text', required: true },
      { label: 'Description', name: 'description', type: 'textarea', wide: true },
      { label: 'Leader', name: 'leader_person_id', type: 'search-select', catalog: 'person', placeholder: 'Search leader' },
      { label: 'Status', name: 'status', type: 'select', options: ['active', 'inactive'] },
    ],
  },
  church_role_assignment: {
    entity: 'Role assignment',
    fields: [
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Person', name: 'person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search person' },
      { label: 'Role type', name: 'role_type', type: 'select', options: ['worker', 'leader', 'disciple'], required: true },
      { label: 'Title', name: 'title', type: 'text', required: true, placeholder: 'Usher, Pastor…' },
      { label: 'Status', name: 'status', type: 'select', options: ['active', 'training', 'inactive'] },
      { label: 'Started at', name: 'started_at', type: 'date' },
    ],
  },
  counselling_case: {
    entity: 'Counselling case',
    fields: [
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Client', name: 'client_person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search client' },
      { label: 'Counselor', name: 'counselor_person_id', type: 'search-select', catalog: 'person', placeholder: 'Search counselor' },
      { label: 'Case type', name: 'case_type', type: 'text', placeholder: 'general' },
      { label: 'Status', name: 'status', type: 'select', options: ['open', 'in_progress', 'closed'] },
      { label: 'Summary', name: 'summary', type: 'textarea', wide: true },
      { label: 'Opened at', name: 'opened_at', type: 'date' },
    ],
  },
  testimony: {
    entity: 'Testimony',
    fields: [
      { label: 'Person', name: 'person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search person' },
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', placeholder: 'Search church' },
      { label: 'Title', name: 'title', type: 'text', required: true },
      { label: 'Body', name: 'body', type: 'textarea', wide: true, required: true },
      { label: 'Status', name: 'status', type: 'select', options: ['pending', 'approved', 'published', 'rejected'] },
      { label: 'Submitted at', name: 'submitted_at', type: 'date' },
      { label: 'Published at', name: 'published_at', type: 'date' },
    ],
  },
  attendance_record: {
    entity: 'Attendance',
    fields: [
      { label: 'Home church', name: 'home_church_id', type: 'search-select', catalog: 'homeChurch', required: true, placeholder: 'Search home church' },
      { label: 'Service date', name: 'service_date', type: 'date', required: true },
      { label: 'Adults', name: 'adults', type: 'text' },
      { label: 'Children', name: 'children', type: 'text' },
      { label: 'First timers', name: 'first_timers', type: 'text' },
      { label: 'Notes', name: 'notes', type: 'textarea', wide: true },
    ],
  },
  person_directory: {
    entity: 'Person',
    fields: [
      { label: 'Phone', name: 'phone', type: 'text', placeholder: '+234…' },
      { label: 'Given name', name: 'given_name', type: 'text' },
      { label: 'Family name', name: 'family_name', type: 'text' },
    ],
  },
  crusade: {
    entity: 'Crusade',
    fields: [
      { label: 'Name', name: 'name', type: 'text', required: true },
      { label: 'Location', name: 'location_name', type: 'text' },
      { label: 'Starts at', name: 'starts_at', type: 'text' },
      { label: 'Ends at', name: 'ends_at', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
    ],
  },
  soul: {
    entity: 'Soul journey',
    fields: [
      { label: 'Person', name: 'person_name', type: 'text' },
      { label: 'Crusade', name: 'crusade_name', type: 'text' },
      { label: 'Connected church', name: 'connected_church_name', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
      { label: 'Captured at', name: 'captured_at', type: 'text' },
    ],
  },
  mission_invitation: {
    entity: 'Mission invitation',
    fields: [
      { label: 'Crusade', name: 'crusade_name', type: 'text' },
      { label: 'Invitee', name: 'person_name', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
    ],
  },
  home_church_application: {
    entity: 'Home church application',
    fields: [
      { label: 'Proposed name', name: 'proposed_name', type: 'text' },
      { label: 'Applicant', name: 'applicant_name', type: 'text' },
      { label: 'Church', name: 'church_name', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
    ],
  },
  kca_enrollment: {
    entity: 'KCA enrollment',
    fields: [
      { label: 'Student', name: 'person_name', type: 'text' },
      { label: 'Cohort', name: 'cohort_name', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
    ],
  },
  kca_application: {
    entity: 'KCA application',
    fields: [
      { label: 'Applicant', name: 'person_name', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
      { label: 'Submitted at', name: 'submitted_at', type: 'text' },
    ],
  },
  kca_certificate: {
    entity: 'KCA certificate',
    fields: [
      { label: 'Student', name: 'person_name', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
      { label: 'Issued at', name: 'issued_at', type: 'text' },
    ],
  },
  event: {
    entity: 'Event',
    fields: [
      { label: 'Title', name: 'title', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
      { label: 'Starts at', name: 'starts_at', type: 'text' },
    ],
  },
  press_publication: {
    entity: 'Publication',
    fields: [
      { label: 'Title', name: 'title', type: 'text', placeholder: 'Publication title' },
      { label: 'Subtitle', name: 'subtitle', type: 'text', placeholder: 'Optional subtitle' },
      { label: 'Publisher', name: 'publisher_name', type: 'text', placeholder: 'Kingdom Press' },
      { label: 'Language', name: 'language_code', type: 'text', placeholder: 'en' },
      {
        label: 'Format',
        name: 'format',
        type: 'select',
        options: ['print', 'pdf', 'epub', 'audio', 'video'],
      },
      { label: 'Category', name: 'category', type: 'text', placeholder: 'Spiritual Growth' },
      { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Short description', wide: true },
      { label: 'Edition', name: 'edition', type: 'text', placeholder: '1st' },
      { label: 'Publication date', name: 'publication_date', type: 'date' },
      { label: 'Price (minor units)', name: 'price_minor', type: 'number', placeholder: '350000' },
      { label: 'Currency', name: 'currency_code', type: 'text', placeholder: 'NGN' },
    ],
  },
  press_translation: {
    entity: 'Translation',
    fields: [
      { label: 'Target language', name: 'target_language_code', type: 'text', placeholder: 'fr' },
      { label: 'Translated title', name: 'translated_title', type: 'text' },
      { label: 'Translated subtitle', name: 'translated_subtitle', type: 'text' },
      { label: 'Translated description', name: 'translated_description', type: 'textarea', wide: true },
    ],
  },
  press_contributor: {
    entity: 'Contributor',
    fields: [
      { label: 'Person', name: 'person_id', type: 'search-select', catalog: 'person', placeholder: 'Search person' },
      { label: 'Role', name: 'role', type: 'select', options: ['author', 'editor'] },
    ],
  },
  communication: {
    entity: 'Communication',
    fields: [
      { label: 'Title', name: 'title', type: 'text' },
      { label: 'Channel', name: 'channel', type: 'text' },
      { label: 'Status', name: 'status', type: 'text' },
    ],
  },
  payment_refund: {
    entity: 'Refund',
    fields: [
      { label: 'Transaction', name: 'payment_transaction_id', type: 'text', placeholder: 'Transaction ULID' },
      { label: 'Amount (minor units)', name: 'amount_minor', type: 'number', placeholder: '500000' },
      { label: 'Reason code', name: 'reason_code', type: 'text', placeholder: 'requested_by_admin' },
    ],
  },
  payment_intent: {
    entity: 'Payment intent',
    fields: [
      { label: 'Event registration', name: 'event_registration_id', type: 'text', placeholder: 'Registration ULID' },
    ],
  },
};

const routeEntityMap: Array<{ pattern: RegExp; entity: string }> = [
  { pattern: /\/admin\/kca\/modules\/new/, entity: 'kca_module' },
  { pattern: /\/admin\/kca\/modules/, entity: 'kca_module' },
  { pattern: /\/admin\/kca\/lessons/, entity: 'kca_lesson' },
  { pattern: /\/admin\/kca\/cohorts/, entity: 'kca_cohort' },
  { pattern: /\/admin\/kca\/years/, entity: 'kca_cohort' },
  { pattern: /\/admin\/kca\/lecturers/, entity: 'kca_lecturer_assignment' },
  { pattern: /\/admin\/kca\/mentors/, entity: 'kca_mentor_assignment' },
  { pattern: /\/admin\/kca\/students/, entity: 'kca_enrollment' },
  { pattern: /\/admin\/kca\/applications/, entity: 'kca_application' },
  { pattern: /\/admin\/kca\/certificates/, entity: 'kca_certificate' },
  { pattern: /\/admin\/home-churches\/applications/, entity: 'home_church_application' },
  { pattern: /\/admin\/home-churches/, entity: 'home_church' },
  { pattern: /\/admin\/churches/, entity: 'church' },
  { pattern: /\/admin\/people\/first-timers|\/first-timers/, entity: 'first_timer' },
  { pattern: /\/admin\/people\/follow-up/, entity: 'follow_up_task' },
  { pattern: /\/admin\/people\/prayer-requests/, entity: 'prayer_request' },
  { pattern: /\/admin\/people\/needs/, entity: 'pastoral_need' },
  { pattern: /\/converts/, entity: 'convert' },
  { pattern: /\/evangelism/, entity: 'evangelism_activity' },
  { pattern: /\/departments/, entity: 'department' },
  { pattern: /\/workers|\/leadership|\/leaders|\/disciples|\/discipleship/, entity: 'church_role_assignment' },
  { pattern: /\/counselling/, entity: 'counselling_case' },
  { pattern: /\/testimonies/, entity: 'testimony' },
  { pattern: /\/attendance/, entity: 'attendance_record' },
  { pattern: /\/admin\/people$/, entity: 'person_directory' },
  { pattern: /\/admin\/mission\/crusades/, entity: 'crusade' },
  { pattern: /\/admin\/mission\/souls|\/mentor-assignments/, entity: 'soul' },
  { pattern: /\/admin\/mission\/invitations/, entity: 'mission_invitation' },
  { pattern: /\/admin\/(members|users)/, entity: 'person' },
  { pattern: /\/admin\/events/, entity: 'event' },
  { pattern: /\/admin\/press\/translations/, entity: 'press_translation' },
  { pattern: /\/admin\/press\/authors/, entity: 'press_contributor' },
  { pattern: /\/admin\/press/, entity: 'press_publication' },
  { pattern: /\/admin\/finance\/refunds/, entity: 'payment_refund' },
  { pattern: /\/admin\/finance\/(tithes|offerings|projects|donations|event-payments|kca-payments|publication-payments)/, entity: 'payment_intent' },
  { pattern: /\/admin\/communications/, entity: 'communication' },
];

const screenEntityMap: Record<string, string> = {
  'J-02': 'press_publication',
  'J-04': 'press_publication',
  'J-05': 'press_contributor',
  'J-07': 'press_publication',
  'J-16': 'press_translation',
  'J-18': 'press_publication',
  'K-13': 'payment_refund',
  'H-09': 'kca_module',
  'H-10': 'kca_module',
  'H-12': 'kca_lesson',
  'H-03': 'kca_cohort',
  'H-05': 'kca_mentor_assignment',
  'H-07': 'kca_lecturer_assignment',
  'E-02': 'church',
  'D-07': 'home_church',
  'D-02': 'home_church_application',
  'E-07': 'first_timer',
  'F-02': 'first_timer',
  'F-01': 'person_directory',
  'F-04': 'follow_up_task',
  'F-10': 'prayer_request',
  'F-11': 'pastoral_need',
  'F-13': 'counselling_case',
  'F-15': 'testimony',
  'E-08': 'convert',
  'E-10': 'church_role_assignment',
  'E-11': 'department',
  'E-13': 'evangelism_activity',
  'D-10': 'attendance_record',
  'I-02': 'crusade',
  'I-10': 'soul',
  'I-13': 'soul',
  'I-05': 'mission_invitation',
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
