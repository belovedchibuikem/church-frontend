import type { LiveCatalogKey } from './form-catalogs';

/** Vendor / config strings that happen to end in `_id` but are not record pickers. */
const NON_ENTITY_ID_FIELDS = new Set([
  'sms_sender_id',
  'sender_id',
  'whatsapp_phone_number_id',
  'phone_number_id',
  'language_code',
  'currency_code',
  'timezone',
]);

function snakeFieldName(name: string): string {
  const withId = name.replace(/Id$/, '_id');
  return withId.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Map a form field name to a searchable catalog. The submitted value remains the record id.
 */
export function catalogForIdField(name: string): LiveCatalogKey | undefined {
  if (!name || NON_ENTITY_ID_FIELDS.has(name)) return undefined;
  const n = snakeFieldName(name);
  if (!n.endsWith('_id') && n !== 'member_id') return undefined;

  if (n === 'home_church_id' || n.endsWith('_home_church_id')) return 'homeChurch';
  if (n === 'church_id' || n.endsWith('_church_id')) return 'church';
  if (
    n === 'person_id' ||
    n.endsWith('_person_id') ||
    n === 'member_id' ||
    n === 'owner_id' ||
    n === 'assignee_id' ||
    n === 'interviewer_id'
  ) {
    return 'person';
  }
  if (n === 'location_id') return 'location';
  if (n === 'administrative_unit_id' || n === 'region_id') return 'administrativeUnit';
  if (n === 'country_id') return 'country';
  if (n === 'first_timer_id') return 'firstTimer';
  if (n === 'user_id' || n.endsWith('_user_id')) return 'user';
  if (n === 'kca_module_id' || n === 'module_id' || n === 'prerequisite_module_id') return 'kcaModule';
  if (n === 'kca_lesson_id' || n === 'lesson_id') return 'kcaLesson';
  if (n === 'kca_cohort_id' || n === 'cohort_id') return 'kcaCohort';
  if (n === 'year_id' || n === 'kca_year_id') return 'kcaYear';
  if (n === 'kca_enrollment_id') return 'kcaEnrollment';
  if (n === 'payment_transaction_id') return 'finance.payment_transactions';
  if (n === 'event_registration_id') return 'events.registrations';
  if (n === 'crusade_id') return 'crusade';
  if (n === 'mission_team_assignment_id' || n === 'mentor_assignment_id') return 'missionTeamAssignment';
  if (n === 'soul_id') return 'soul';
  if (n === 'home_church_application_id') return 'homeChurchApplication';
  return undefined;
}

export function placeholderForIdField(name: string): string {
  const catalog = catalogForIdField(name);
  const labels: Record<string, string> = {
    person: 'Type a name to search people',
    church: 'Type a church name to search',
    homeChurch: 'Search home church',
    location: 'Search location',
    administrativeUnit: 'Search administrative unit',
    country: 'Search country',
    firstTimer: 'Search first timer',
    user: 'Search user',
    kcaModule: 'Search module by name',
    kcaLesson: 'Search lesson by name',
    kcaCohort: 'Search cohort by name',
    kcaYear: 'Search academic year by name',
    kcaEnrollment: 'Search student by name',
    crusade: 'Search crusade',
    missionTeamAssignment: 'Search team assignment',
    soul: 'Search soul',
    homeChurchApplication: 'Search application',
    'finance.payment_transactions': 'Search transaction',
    'events.registrations': 'Search registration',
  };
  return (catalog && labels[catalog]) || 'Search and select…';
}

export function labelForIdField(name: string, fallback?: string): string {
  if (fallback && !/\bid\b/i.test(fallback)) return fallback;
  const n = snakeFieldName(name).replace(/_id$/, '');
  const titled = n.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
  return titled || fallback || 'Record';
}
