import type { AdminFormField } from './admin-form-schemas.ts';

export type KcaRegistrationStep = {
  id: string;
  title: string;
  subtitle: string;
  fields: AdminFormField[];
};

export const kcaRegistrationSteps: KcaRegistrationStep[] = [
  {
    id: 'church',
    title: 'Church Information',
    subtitle: 'Identify the applicant and their church context.',
    fields: [
      { label: 'Existing person record', name: 'person_id', type: 'search-select', catalog: 'person', placeholder: 'Search person (optional if registering someone new)' },
      { label: 'Given name', name: 'given_name', type: 'text', required: true, placeholder: 'First name' },
      { label: 'Family name', name: 'family_name', type: 'text', required: true, placeholder: 'Last name' },
      { label: 'Email address', name: 'email', type: 'email', required: true, placeholder: 'name@example.org', helpText: 'Used for application contact and student login when enabled below.' },
      { label: 'Phone number', name: 'phone', type: 'text', placeholder: '+234' },
      { label: 'Create student login account', name: 'create_login', type: 'checkbox', placeholder: 'Create a member login so the student can sign in to KCA and member services.' },
      { label: 'Login password', name: 'password', type: 'password', placeholder: 'Minimum 8 characters', helpText: 'Required when creating a login account. Share securely with the student.' },
      { label: 'Confirm password', name: 'password_confirmation', type: 'password', placeholder: 'Re-enter password' },
      { label: 'Full name (application)', name: 'fullName', type: 'text', required: true, placeholder: 'As it should appear on the application' },
      { label: 'Home church', name: 'home_church_id', type: 'search-select', catalog: 'homeChurch', placeholder: 'Search home church' },
      { label: 'Sponsoring church', name: 'church_id', type: 'search-select', catalog: 'church', required: true, placeholder: 'Search church' },
      { label: 'Pastor / leader', name: 'pastor_id', type: 'search-select', catalog: 'person', placeholder: 'Search pastor or leader', wide: true },
    ],
  },
  {
    id: 'walk-with-christ',
    title: 'Walk With Christ',
    subtitle: 'Capture the applicant’s spiritual journey.',
    fields: [
      { label: 'Years walking with Christ', name: 'years', type: 'select', options: ['Less than 1', '1–3 years', '3–5 years', '5+ years'], required: true },
      { label: 'Baptised?', name: 'baptised', type: 'select', options: ['Yes', 'No', 'Preparing'], required: true },
      { label: 'Share your walk with Christ', name: 'story', type: 'textarea', required: true, wide: true, placeholder: 'Describe salvation, growth, and current walk with Christ.' },
    ],
  },
  {
    id: 'why-join',
    title: 'Why Join KCA',
    subtitle: 'Understand the applicant’s motivation.',
    fields: [
      { label: 'Why do you want to join KCA?', name: 'why', type: 'textarea', required: true, wide: true, placeholder: 'Explain ministry goals and expectations from KCA.' },
    ],
  },
  {
    id: 'interests',
    title: 'Kingdom Interests',
    subtitle: 'Record primary and secondary ministry interests.',
    fields: [
      { label: 'Primary interest', name: 'interest', type: 'select', required: true, options: ['Evangelism', 'Discipleship', 'Worship', 'Media', 'Children', 'Youth', 'Missions'] },
      { label: 'Secondary interest', name: 'interest2', type: 'select', options: ['Evangelism', 'Discipleship', 'Worship', 'Media', 'Children', 'Youth', 'Missions'] },
    ],
  },
  {
    id: 'commitment',
    title: 'Commitment',
    subtitle: 'Confirm programme expectations.',
    fields: [
      { label: 'Attendance & assignments commitment', name: 'attendance_commitment', type: 'checkbox', required: true, placeholder: 'Applicant commits to attend classes and complete assignments.' },
      { label: 'Conduct commitment', name: 'conduct_commitment', type: 'checkbox', required: true, placeholder: 'Applicant understands spiritual discipline requirements.' },
      { label: 'Communication commitment', name: 'communication_commitment', type: 'checkbox', required: true, placeholder: 'Applicant will notify leaders when unable to meet requirements.' },
    ],
  },
  {
    id: 'declaration',
    title: 'Personal Declaration',
    subtitle: 'Applicant declaration and signature.',
    fields: [
      { label: 'Declaration signature (full name)', name: 'declaration_signature', type: 'text', required: true, wide: true },
      { label: 'Declaration date', name: 'declaration_date', type: 'date', required: true },
      { label: 'Information is true and complete', name: 'declaration_confirmed', type: 'checkbox', required: true, placeholder: 'Applicant confirms accuracy of this application.' },
    ],
  },
  {
    id: 'guardian-consent',
    title: 'Parent / Guardian Consent',
    subtitle: 'Required where applicable for minors.',
    fields: [
      { label: 'Guardian / parent full name', name: 'guardian_name', type: 'text', placeholder: 'Leave blank if not applicable' },
      { label: 'Relationship to applicant', name: 'guardian_relationship', type: 'select', options: ['Parent', 'Guardian', 'Spouse', 'Other'] },
      { label: 'Guardian phone number', name: 'guardian_phone', type: 'text', placeholder: '+234' },
      { label: 'Guardian email address', name: 'guardian_email', type: 'email', placeholder: 'guardian@example.org' },
      { label: 'Guardian consent provided', name: 'guardian_consent', type: 'checkbox', placeholder: 'Guardian consent obtained where required.' },
    ],
  },
  {
    id: 'recommendation',
    title: 'Leadership Recommendation',
    subtitle: 'Request a leadership recommendation from the applicant’s pastor or leader.',
    fields: [
      { label: 'Recommender full name', name: 'recommender_name', type: 'text', required: true },
      { label: 'Position / ministry role', name: 'recommender_position', type: 'text', required: true },
      { label: 'Recommender phone number', name: 'recommender_phone', type: 'text', placeholder: '+234' },
      { label: 'Recommender email address', name: 'recommender_email', type: 'email', required: true },
    ],
  },
  {
    id: 'enrollment',
    title: 'Enrollment',
    subtitle: 'Optionally admit the student and assign a cohort immediately after submission.',
    fields: [
      { label: 'Admit and enroll now', name: 'admit_and_enroll', type: 'checkbox', placeholder: 'Accept the application and create a cohort enrollment in one step.' },
      { label: 'Cohort', name: 'cohort_id', type: 'search-select', catalog: 'kcaCohort', placeholder: 'Search cohort (required when enrolling)' },
      { label: 'Registration number', name: 'registration_number', type: 'text', placeholder: 'Auto-assigned on enroll', helpText: 'Generated automatically when you submit enrollment.' },
      { label: 'Starts on', name: 'starts_on', type: 'date' },
    ],
  },
];

const kcaRegistrationRootFields = new Set([
  'person_id',
  'given_name',
  'family_name',
  'email',
  'phone',
  'create_login',
  'password',
  'password_confirmation',
  'application_id',
  'admit_and_enroll',
  'cohort_id',
  'registration_number',
  'starts_on',
]);

export function flattenKcaRegistrationPayload(values: Record<string, string>): {
  application_id?: string;
  person_id?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  phone?: string;
  create_login?: boolean;
  password?: string;
  password_confirmation?: string;
  admit_and_enroll?: boolean;
  cohort_id?: string;
  registration_number?: string;
  starts_on?: string;
  application_data: Record<string, string>;
} {
  const applicationId = values.application_id?.trim() || undefined;
  const personId = values.person_id?.trim() || undefined;
  const givenName = values.given_name?.trim() || undefined;
  const familyName = values.family_name?.trim() || undefined;
  const email = values.email?.trim() || undefined;
  const phone = values.phone?.trim() || undefined;
  const createLogin = values.create_login === 'true';
  const password = values.password?.trim() || undefined;
  const passwordConfirmation = values.password_confirmation?.trim() || undefined;
  const admitAndEnroll = values.admit_and_enroll === 'true';
  const cohortId = values.cohort_id?.trim() || undefined;
  const registrationNumber = values.registration_number?.trim() || undefined;
  const startsOn = values.starts_on?.trim() || undefined;
  const applicationData: Record<string, string> = {};

  for (const step of kcaRegistrationSteps) {
    for (const field of step.fields) {
      if (kcaRegistrationRootFields.has(field.name)) continue;
      const value = values[field.name];
      if (value !== undefined && value !== '') {
        applicationData[field.name] = value;
      }
    }
  }

  if (givenName && familyName && !applicationData.fullName) {
    applicationData.fullName = `${givenName} ${familyName}`.trim();
  }
  if (email && !applicationData.email) {
    applicationData.email = email;
  }

  if (phone) {
    applicationData.phone = phone;
  }

  return {
    application_id: applicationId,
    person_id: personId,
    given_name: personId || applicationId ? undefined : givenName,
    family_name: personId || applicationId ? undefined : familyName,
    email,
    phone,
    create_login: createLogin,
    password: createLogin ? password : undefined,
    password_confirmation: createLogin ? passwordConfirmation : undefined,
    admit_and_enroll: admitAndEnroll,
    cohort_id: cohortId,
    registration_number: registrationNumber,
    starts_on: startsOn,
    application_data: applicationData,
  };
}
