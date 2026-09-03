import type { catalogOptions, FormCatalogKey, LiveCatalogKey } from './form-catalogs';

export type FormFieldType = 'text' | 'email' | 'date' | 'datetime-local' | 'number' | 'select' | 'search-select' | 'textarea' | 'checkbox';

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
      { label: 'Learning days', name: 'duration_days', type: 'number', required: true, placeholder: '7', helpText: 'Required number of intentional daily bundles (kca_modules.duration_days)' },
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
      { label: 'Day index', name: 'day_index', type: 'number', placeholder: '1', helpText: 'Learning day 1..duration_days' },
      { label: 'Lesson type', name: 'lesson_type', type: 'text', placeholder: 'text' },
      { label: 'Summary', name: 'summary', type: 'text', placeholder: 'Short summary', wide: true },
      { label: 'Body', name: 'body', type: 'textarea', placeholder: 'Lesson body students read when the day unlocks', wide: true },
      { label: 'Content URL', name: 'content_url', type: 'text', placeholder: 'https://…', wide: true },
    ],
  },
  kca_chapter: {
    entity: 'KCA chapter',
    fields: [
      { label: 'Lesson', name: 'kca_lesson_id', type: 'search-select', catalog: 'kcaLesson', required: true, placeholder: 'Search lesson' },
      { label: 'Chapter title', name: 'title', type: 'text', required: true, placeholder: 'e.g. Chapter 1 — Identity' },
      { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. CH01' },
      { label: 'Sequence', name: 'sequence', type: 'number', required: true, placeholder: '1' },
      { label: 'Summary', name: 'summary', type: 'text', placeholder: 'Short summary', wide: true },
      { label: 'Body', name: 'body', type: 'textarea', placeholder: 'Chapter body students read inside the lesson', wide: true },
      { label: 'Content URL', name: 'content_url', type: 'text', placeholder: 'https://…', wide: true },
    ],
  },
  kca_assignment: {
    entity: 'KCA assignment',
    fields: [
      // Labels align with Assignments table; audience mirrors assessment bulk targeting
      { label: 'Assign to', name: 'audience', type: 'select', required: true, options: ['One student', 'A cohort', 'All enrolled students'], helpText: 'Creates one assignment per matching enrolled student.' },
      { label: 'Student', name: 'kca_enrollment_id', type: 'search-select', catalog: 'kcaEnrollment', placeholder: 'Search enrolled student (required for One student)' },
      { label: 'Cohort', name: 'cohort_id', type: 'search-select', catalog: 'kcaCohort', placeholder: 'Search cohort (required for A cohort)' },
      { label: 'Assignment', name: 'title', type: 'text', required: true, placeholder: 'e.g. Win three generations of souls' },
      { label: 'Module', name: 'kca_module_id', type: 'search-select', catalog: 'kcaModule', required: true, placeholder: 'Search module' },
      { label: 'Lesson', name: 'kca_lesson_id', type: 'search-select', catalog: 'kcaLesson', required: true, placeholder: 'Search lesson in the selected module' },
      { label: 'Type', name: 'assignment_kind', type: 'select', required: true, options: ['standard', 'written', 'practical', 'soul_winning'] },
      { label: 'Due Date', name: 'due_at', type: 'date' },
      { label: 'Soul tree levels', name: 'soul_tree_levels', type: 'text', placeholder: '3,2,4', wide: true, helpText: 'Required for Type = soul_winning (e.g. 3,2,4). Status stays open until the tree is complete.' },
    ],
  },
  kca_cohort: {
    entity: 'KCA cohort',
    fields: [
      { label: 'Cohort name', name: 'name', type: 'text', required: true, placeholder: 'e.g. 2026 Cohort A' },
      { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. 2026-A' },
      { label: 'KCA year', name: 'year_id', type: 'search-select', catalog: 'kcaYear', required: true, placeholder: 'Search academic year by name' },
      { label: 'Starts on', name: 'starts_on', type: 'date', required: true },
      { label: 'Ends on', name: 'ends_on', type: 'date', required: true },
      { label: 'Timezone', name: 'timezone', type: 'text', placeholder: 'Africa/Lagos', helpText: 'Cohort learning-day timezone (IANA). Defaults to UTC.' },
    ],
  },
  kca_year: {
    entity: 'KCA year',
    fields: [
      { label: 'Year name', name: 'name', type: 'text', required: true, placeholder: 'e.g. Foundation 2026' },
      { label: 'Code', name: 'code', type: 'text', required: true, placeholder: 'e.g. Y1-2026' },
      { label: 'Starts on', name: 'starts_on', type: 'date', required: true },
      { label: 'Ends on', name: 'ends_on', type: 'date', required: true },
    ],
  },
  kca_assessment: {
    entity: 'KCA assessment',
    fields: [
      { label: 'Who is this for?', name: 'audience', type: 'select', required: true, options: ['One student', 'A student year', 'All enrolled students'], helpText: 'Results are stored per enrollment. Year and all-students apply the same result to each matching student.' },
      { label: 'Student', name: 'kca_enrollment_id', type: 'search-select', catalog: 'kcaEnrollment', placeholder: 'Search student by name (required for one student)' },
      { label: 'KCA year', name: 'year_id', type: 'search-select', catalog: 'kcaYear', placeholder: 'Search year (required when assessing a year)' },
      { label: 'Module', name: 'kca_module_id', type: 'search-select', catalog: 'kcaModule', placeholder: 'Optional — assess a specific module' },
      { label: 'Lesson', name: 'kca_lesson_id', type: 'search-select', catalog: 'kcaLesson', placeholder: 'Optional — name this assessment after a lesson' },
      { label: 'Assessment name', name: 'assessment_code', type: 'text', required: true, placeholder: 'e.g. Identity final, Lesson 3 quiz' },
      { label: 'Result', name: 'result_code', type: 'select', required: true, options: ['pass', 'fail', 'distinction', 'incomplete'] },
      { label: 'Score', name: 'score', type: 'number', placeholder: '0–100' },
    ],
  },
  home_church: {
    entity: 'Home church',
    fields: [
      { label: 'Name', name: 'name', type: 'text', required: true, placeholder: 'Enter home church name' },
      { label: 'Parent church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Leader', name: 'leader_person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search leader' },
      { label: 'Administrative unit', name: 'administrative_unit_id', type: 'search-select', catalog: 'administrativeUnit', placeholder: 'Search unit', helpText: 'Set when the home church is created.' },
      { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location', helpText: 'Set when the home church is created.' },
      { label: 'Status', name: 'status', type: 'select', options: ['active', 'suspended', 'closed'], helpText: 'Use Suspend / Close to change status. This field is informational on edit.' },
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
      { label: 'Assignee', name: 'assigned_to_person_id', type: 'search-select', catalog: 'person', placeholder: 'Search assignee' },
      { label: 'Due at', name: 'due_at', type: 'date' },
      { label: 'Status', name: 'status', type: 'text', helpText: 'Use Complete to close this task. Status is read-only here.' },
    ],
  },
  prayer_request: {
    entity: 'Prayer request',
    fields: [
      { label: 'Subject', name: 'subject', type: 'text', required: true },
      { label: 'Body', name: 'body', type: 'textarea', wide: true, required: true },
      { label: 'Status', name: 'status', type: 'select', options: ['open', 'assigned', 'rejected', 'answered'] },
    ],
  },
  pastoral_need: {
    entity: 'Need',
    fields: [
      { label: 'Home church', name: 'home_church_id', type: 'search-select', catalog: 'homeChurch', placeholder: 'Search home church' },
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', placeholder: 'Search church' },
      { label: 'Contact person', name: 'person_id', type: 'search-select', catalog: 'person', placeholder: 'Optional contact' },
      { label: 'Category', name: 'category', type: 'text', required: true },
      { label: 'Summary', name: 'summary', type: 'textarea', wide: true, required: true },
      { label: 'Status', name: 'status', type: 'select', options: ['open', 'approved', 'rejected', 'closed'] },
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
      { label: 'Title', name: 'title', type: 'select', options: ['Senior Pastor', 'Associate Pastor', 'Assistant Pastor', 'Elder', 'Deacon', 'Church Administrator', 'Ministry Head'], required: true },
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
      { label: 'Male', name: 'males', type: 'number' },
      { label: 'Female', name: 'females', type: 'number' },
      { label: 'Children', name: 'children', type: 'number' },
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
      { label: 'Code', name: 'code', type: 'text' },
      { label: 'Theme', name: 'theme', type: 'text' },
      { label: 'Purpose', name: 'purpose', type: 'text', wide: true },
      { label: 'Description', name: 'description', type: 'textarea', wide: true },
      { label: 'Timezone', name: 'timezone', type: 'text', placeholder: 'Africa/Lagos' },
      { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location' },
      { label: 'Starts at', name: 'starts_at', type: 'date' },
      { label: 'Ends at', name: 'ends_at', type: 'date' },
    ],
  },
  soul: {
    entity: 'Soul journey',
    fields: [
      { label: 'Connected church', name: 'church_id', type: 'search-select', catalog: 'church', placeholder: 'Search church to connect' },
      { label: 'Status', name: 'status', type: 'select', options: ['captured', 'mentor_assigned', 'follow_up_active', 'follow_up_completed', 'converted'], helpText: 'Set to follow_up_completed to close the journey.' },
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
      { label: 'Admitted application', name: 'application_id', type: 'search-select', catalog: 'kcaApplication', required: true, placeholder: 'Search accepted application' },
      { label: 'Cohort', name: 'cohort_id', type: 'search-select', catalog: 'kcaCohort', required: true, placeholder: 'Search cohort' },
      { label: 'Registration number', name: 'registration_number', type: 'text', placeholder: 'Auto-assigned on enroll', helpText: 'Generated automatically when enrollment is submitted.' },
      { label: 'Starts on', name: 'starts_on', type: 'date', required: true },
    ],
  },
  kca_alumni: {
    entity: 'KCA alumni',
    fields: [
      { label: 'Student', name: 'kca_enrollment_id', type: 'search-select', catalog: 'kcaEnrollment', required: true, placeholder: 'Search enrolled KCA student' },
      { label: 'Certificate number', name: 'certificate_number', type: 'text', required: true, placeholder: 'e.g. KCA/CERT/2026/0042' },
      { label: 'Completion date', name: 'completion_on', type: 'date', required: true },
      { label: 'Verification code', name: 'verification_code', type: 'text', required: true, placeholder: 'Unique verification code' },
    ],
  },
  kca_application: {
    entity: 'KCA application',
    fields: [
      {
        label: 'Status',
        name: 'status',
        type: 'select',
        required: true,
        options: [
          'draft',
          'received',
          'information_required',
          'interview',
          'reviewed',
          'accepted',
          'provisionally_accepted',
          'deferred',
          'not_accepted',
          'withdrawn',
          'suspended',
          'revoked',
        ],
        helpText: 'Admission status is changed through the dedicated decision workflow, not a generic record update.',
      },
      {
        label: 'Reason code',
        name: 'reason_code',
        type: 'text',
        placeholder: 'e.g. deferred_capacity',
        helpText: 'Required for deferred, not accepted, suspended, and revoked.',
      },
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
      { label: 'Name', name: 'name', type: 'text', required: true, placeholder: 'Leaders Retreat' },
      {
        label: 'Category',
        name: 'category_code',
        type: 'select',
        required: true,
        options: ['general', 'training', 'youth', 'conference', 'retreat', 'outreach'],
        helpText: 'Stable lowercase category code used for filtering and reporting.',
      },
      { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location' },
      { label: 'Starts at', name: 'starts_at', type: 'datetime-local', required: true },
      { label: 'Ends at', name: 'ends_at', type: 'datetime-local', required: true },
      { label: 'Registration opens', name: 'registration_opens_at', type: 'datetime-local' },
      { label: 'Registration closes', name: 'registration_closes_at', type: 'datetime-local' },
      { label: 'Publish at', name: 'published_at', type: 'datetime-local', helpText: 'Leave blank to keep the event as a draft.' },
      { label: 'Fee (minor units)', name: 'fee_amount_minor', type: 'number', placeholder: '500000' },
      { label: 'Currency', name: 'fee_currency', type: 'text', placeholder: 'NGN' },
      { label: 'Capacity', name: 'capacity', type: 'number', placeholder: '250' },
    ],
  },
  kca_orientation_session: {
    entity: 'Orientation Session',
    fields: [
      { label: 'Name', name: 'name', type: 'text', required: true, placeholder: 'Batch 2024-06 Orientation' },
      { label: 'Cohort', name: 'cohort_id', type: 'search-select', catalog: 'kcaCohort', placeholder: 'Search cohort' },
      { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location' },
      { label: 'Venue label', name: 'venue_label', type: 'text', placeholder: 'Online (Zoom)', helpText: 'Use when no location record exists.' },
      { label: 'Starts at', name: 'starts_at', type: 'datetime-local', required: true },
      { label: 'Ends at', name: 'ends_at', type: 'datetime-local' },
      { label: 'Publish at', name: 'published_at', type: 'datetime-local', helpText: 'Leave blank to keep as draft.' },
      { label: 'Capacity', name: 'capacity', type: 'number', placeholder: '100' },
      { label: 'Notes', name: 'notes', type: 'textarea', wide: true },
    ],
  },
  press_publication: {
    entity: 'Publication',
    fields: [
      {
        label: 'Publication type',
        name: 'publication_type',
        type: 'select',
        required: true,
        options: ['document_pdf', 'book', 'sermon', 'devotional', 'bible_study'],
        helpText: 'Study Manuals are listed with Devotionals for readers, with the type marked on each title.',
      },
      { label: 'Title', name: 'title', type: 'text', required: true, placeholder: 'Publication title' },
      { label: 'Subtitle', name: 'subtitle', type: 'text', placeholder: 'Optional subtitle' },
      { label: 'Summary', name: 'summary', type: 'textarea', placeholder: 'Short public summary', wide: true },
      { label: 'Publisher', name: 'publisher_name', type: 'text', required: true, placeholder: 'Kingdom Press' },
      { label: 'Language', name: 'language_code', type: 'text', required: true, placeholder: 'en' },
      {
        label: 'Primary asset format',
        name: 'format',
        type: 'select',
        required: true,
        options: ['print', 'pdf', 'epub', 'audio', 'video'],
      },
      { label: 'Category', name: 'category', type: 'text', placeholder: 'Spiritual Growth' },
      { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Full description', wide: true },
      { label: 'Speaker / preacher', name: 'speaker', type: 'text', placeholder: 'Required for sermons' },
      { label: 'Preached date', name: 'preached_date', type: 'date' },
      { label: 'Reflection / body', name: 'reflection', type: 'textarea', placeholder: 'Required for devotionals', wide: true },
      { label: 'Passage', name: 'passage', type: 'text', placeholder: 'Required for study manuals' },
      { label: 'Edition', name: 'edition', type: 'text', placeholder: '1st' },
      { label: 'Publication date', name: 'publication_date', type: 'date' },
      { label: 'Save as draft', name: 'as_draft', type: 'checkbox' },
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
      { label: 'Role', name: 'role', type: 'select', options: ['author', 'speaker', 'editor', 'translator', 'reviewer', 'designer', 'contributor'] },
    ],
  },
  press_author: {
    entity: 'Author',
    fields: [
      { label: 'Display name', name: 'display_name', type: 'text', required: true },
      { label: 'Bio', name: 'bio', type: 'textarea', wide: true },
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
      { label: 'Transaction', name: 'payment_transaction_id', type: 'search-select', catalog: 'finance.payment_transactions', placeholder: 'Search transaction' },
      { label: 'Amount (minor units)', name: 'amount_minor', type: 'number', placeholder: '500000' },
      { label: 'Reason code', name: 'reason_code', type: 'text', placeholder: 'requested_by_admin' },
    ],
  },
  payment_intent: {
    entity: 'Payment intent',
    fields: [
      { label: 'Event registration', name: 'event_registration_id', type: 'search-select', catalog: 'events.registrations', placeholder: 'Search registration' },
    ],
  },
  safeguarding_incident: {
    entity: 'Safeguarding incident',
    fields: [
      { label: 'Concern type', name: 'concern_type', type: 'text', required: true, placeholder: 'e.g. report, concern, disclosure' },
      { label: 'Severity', name: 'severity', type: 'select', required: true, options: ['low', 'medium', 'high', 'critical'] },
      { label: 'Subject (person)', name: 'subject_person_id', type: 'search-select', catalog: 'person', placeholder: 'Search person (optional)' },
      { label: 'Occurred at', name: 'occurred_at', type: 'date' },
      { label: 'Restricted summary', name: 'restricted_summary', type: 'textarea', required: true, wide: true, placeholder: 'Need-to-know summary. Access is audited.' },
    ],
  },
  guardian_relationship: {
    entity: 'Guardian relationship',
    fields: [
      { label: 'Guardian', name: 'guardian_person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search guardian' },
      { label: 'Child', name: 'child_person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search child' },
      { label: 'Relationship type', name: 'relationship_type', type: 'select', required: true, options: ['parent', 'guardian', 'carer'] },
    ],
  },
  child_profile: {
    entity: 'Child profile',
    fields: [
      { label: 'Person', name: 'person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search child' },
      { label: 'Date of birth', name: 'date_of_birth', type: 'date' },
      { label: 'Minor status', name: 'minor_status', type: 'select', options: ['unknown', 'confirmed_minor', 'confirmed_adult'] },
      { label: 'Restrict direct communication', name: 'direct_communication_restricted', type: 'select', options: ['true', 'false'] },
      { label: 'Restrict media use', name: 'media_use_restricted', type: 'select', options: ['true', 'false'] },
    ],
  },
  privacy_request: {
    entity: 'Data-subject request',
    fields: [
      { label: 'Person', name: 'person_id', type: 'search-select', catalog: 'person', required: true, placeholder: 'Search person' },
      { label: 'Request type', name: 'request_type', type: 'select', required: true, options: ['export', 'correction', 'deletion', 'restriction'] },
      { label: 'Notes', name: 'notes', type: 'textarea', wide: true, placeholder: 'Optional request notes' },
    ],
  },
};

const routeEntityMap: Array<{ pattern: RegExp; entity: string }> = [
  { pattern: /^\/admin\/security\/safeguarding/, entity: 'safeguarding_incident' },
  { pattern: /^\/admin\/security\/guardian-consent/, entity: 'guardian_relationship' },
  { pattern: /^\/admin\/security\/(child-profiles|communication-restrictions)/, entity: 'child_profile' },
  { pattern: /^\/admin\/security\/(privacy-requests|data-export-requests|data-deletion-requests)/, entity: 'privacy_request' },
  { pattern: /^\/admin\/security$/, entity: 'safeguarding_incident' },
  { pattern: /\/admin\/kca\/modules\/new/, entity: 'kca_module' },
  { pattern: /\/admin\/kca\/modules/, entity: 'kca_module' },
  { pattern: /\/admin\/kca\/lessons/, entity: 'kca_lesson' },
  { pattern: /\/admin\/kca\/chapters/, entity: 'kca_chapter' },
  { pattern: /\/admin\/kca\/assignments/, entity: 'kca_assignment' },
  { pattern: /\/admin\/kca\/cohorts/, entity: 'kca_cohort' },
  { pattern: /\/admin\/kca\/years/, entity: 'kca_year' },
  { pattern: /\/admin\/kca\/assessments/, entity: 'kca_assessment' },
  { pattern: /\/admin\/kca\/alumni/, entity: 'kca_alumni' },
  { pattern: /\/admin\/kca\/lecturers/, entity: 'kca_lecturer_assignment' },
  { pattern: /\/admin\/kca\/mentors/, entity: 'kca_mentor_assignment' },
  { pattern: /\/admin\/kca\/orientation/, entity: 'kca_orientation_session' },
  { pattern: /\/admin\/kca\/students\/register/, entity: 'kca_application' },
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
  { pattern: /\/admin\/press\/authors/, entity: 'press_author' },
  { pattern: /\/admin\/press/, entity: 'press_publication' },
  { pattern: /\/admin\/finance\/refunds/, entity: 'payment_refund' },
  { pattern: /\/admin\/finance\/(tithes|offerings|projects|donations|event-payments|kca-payments|publication-payments)/, entity: 'payment_intent' },
  { pattern: /\/admin\/communications/, entity: 'communication' },
];

const screenEntityMap: Record<string, string> = {
  'P-01': 'event',
  'P-02': 'event',
  'P-03': 'event',
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
  'H-12b': 'kca_chapter',
  'H-14': 'kca_assignment',
  'H-03': 'kca_cohort',
  'H-04': 'kca_year',
  'H-17': 'kca_assessment',
  'H-20': 'kca_alumni',
  'H-01b': 'kca_application',
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
  'O-01': 'safeguarding_incident',
  'O-08': 'safeguarding_incident',
  'O-09': 'safeguarding_incident',
  'O-11': 'child_profile',
  'O-12': 'guardian_relationship',
  'O-13': 'child_profile',
  'O-16': 'privacy_request',
  'O-17': 'privacy_request',
  'O-18': 'privacy_request',
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
  Assignment: 'title',
  Code: 'code',
  Sequence: 'sequence',
  Status: 'is_active',
  Lecturer: 'lecturer_person_id',
  'Primary lecturer': 'lecturer_person_id',
  Year: 'year',
  Name: 'name',
  Module: 'kca_module_id',
  Lesson: 'kca_lesson_id',
  Student: 'kca_enrollment_id',
  Type: 'assignment_kind',
  'Due Date': 'due_at',
  enrollment_id: 'kca_enrollment_id',
  module_id: 'kca_module_id',
  lesson_id: 'kca_lesson_id',
  kind: 'assignment_kind',
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
  // Prefer labeled search-select values when catalog rows only expose display names.
  if (normalized.kca_enrollment_id && !normalized.kca_enrollment_id_label) {
    normalized.kca_enrollment_id_label = details.student_name || details.person_name || details.Student || '';
  }
  if (normalized.kca_module_id && !normalized.kca_module_id_label) {
    normalized.kca_module_id_label = details.module_title || details.Module || '';
  }
  if (normalized.kca_lesson_id && !normalized.kca_lesson_id_label) {
    normalized.kca_lesson_id_label = details.lesson_title || details.Lesson || '';
  }
  if (normalized.soul_tree_spec && !normalized.soul_tree_levels) {
    try {
      const parsed = JSON.parse(normalized.soul_tree_spec) as unknown;
      if (Array.isArray(parsed)) normalized.soul_tree_levels = parsed.join(',');
    } catch {
      const levels = normalized.soul_tree_spec.match(/\d+/g);
      if (levels?.length) normalized.soul_tree_levels = levels.join(',');
    }
  }
  if (normalized.due_at && normalized.due_at.includes('T')) {
    normalized.due_at = normalized.due_at.slice(0, 10);
  }
  return normalized;
}

export function defaultValueForField(field: AdminFormField, values: Record<string, string>): string | undefined {
  const direct = values[field.name];
  if (field.name === 'is_active' && values.status) return /inactive/i.test(values.status) ? 'Inactive' : 'Active';
  if (field.name === 'status' && (direct || values.Status)) {
    const raw = (direct ?? values.Status ?? '').toLowerCase();
    if (field.options?.some((option) => option.toLowerCase() === raw)) {
      return field.options.find((option) => option.toLowerCase() === raw) ?? raw;
    }
    return direct ?? values.Status;
  }
  if (direct !== undefined) return direct;
  return undefined;
}
