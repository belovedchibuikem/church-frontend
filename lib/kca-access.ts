export type KcaDestination =
  | 'overview'
  | 'resume_application'
  | 'admission_progress'
  | 'information_required'
  | 'orientation'
  | 'provisional_offer'
  | 'admission_letter'
  | 'student_dashboard'
  | 'deferred'
  | 'not_admitted'
  | 'withdrawn'
  | 'restricted';

export function kcaHrefForDestination(destination?: string | null): string {
  switch (destination) {
    case 'student_dashboard':
      return '/account/kca';
    case 'resume_application':
      return '/kca/apply/church';
    case 'admission_progress':
    case 'information_required':
    case 'provisional_offer':
    case 'deferred':
    case 'not_admitted':
    case 'withdrawn':
    case 'restricted':
      return '/kca/apply/status';
    case 'orientation':
      return '/account/kca/orientation';
    case 'admission_letter':
      return '/kca/admission-letter';
    case 'overview':
    default:
      return '/kca';
  }
}

export function kcaIsActivatedStudent(destination?: string | null): boolean {
  return destination === 'student_dashboard';
}

export function kcaPrimaryCta(destination?: string | null): { href: string; label: string } {
  switch (destination) {
    case 'student_dashboard':
      return { href: '/account/kca/modules', label: 'Continue learning' };
    case 'resume_application':
      return { href: '/kca/apply/church', label: 'Resume application' };
    case 'information_required':
      return { href: '/kca/apply/review', label: 'Provide requested information' };
    case 'orientation':
      return { href: '/account/kca/orientation', label: 'Open orientation' };
    case 'admission_letter':
      return { href: '/kca/admission-letter', label: 'View admission letter' };
    case 'provisional_offer':
      return { href: '/kca/apply/status', label: 'Review conditions' };
    case 'overview':
      return { href: '/kca/enrol', label: 'Apply now' };
    default:
      return { href: '/kca/apply/status', label: 'View admission status' };
  }
}
