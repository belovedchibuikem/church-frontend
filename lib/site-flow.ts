/** Sequential frontend workflow targets (prototype navigation only). */
export const flowNext: Record<string, string> = {
  '/login': '/account',
  '/register': '/register/personal',
  '/register/personal': '/register/contact',
  '/register/contact': '/register/security',
  '/register/security': '/register/about',
  '/register/about': '/register/review',
  '/register/review': '/verify-email',
  '/verify-email': '/mfa/setup',
  '/otp': '/onboarding/language',
  '/verify-phone': '/verify-email',
  '/forgot-password': '/login',
  '/reset-password': '/login',
  '/mfa/setup': '/onboarding/role',
  '/account-recovery': '/forgot-password',
  '/onboarding/language': '/onboarding/location',
  '/onboarding/location': '/onboarding/profile',
  '/onboarding/profile': '/onboarding/role',
  '/onboarding/role': '/account',

  '/start-home-church': '/start-home-church/eligibility',
  '/start-home-church/eligibility': '/start-home-church/apply/personal',
  '/start-home-church/apply/personal': '/start-home-church/apply/location',
  '/start-home-church/apply/location': '/start-home-church/apply/meeting',
  '/start-home-church/apply/meeting': '/start-home-church/apply/participants',
  '/start-home-church/apply/participants': '/start-home-church/apply/motivation',
  '/start-home-church/apply/motivation': '/start-home-church/apply/contact',
  '/start-home-church/apply/contact': '/start-home-church/apply/commitment',
  '/start-home-church/apply/commitment': '/start-home-church/apply/review',
  '/start-home-church/apply/review': '/start-home-church/submitted',

  '/kca/enrol': '/kca/apply/church',
  '/kca/apply/church': '/kca/apply/walk-with-christ',
  '/kca/apply/walk-with-christ': '/kca/apply/why-join',
  '/kca/apply/why-join': '/kca/apply/interests',
  '/kca/apply/interests': '/kca/apply/commitment',
  '/kca/apply/commitment': '/kca/apply/declaration',
  '/kca/apply/declaration': '/kca/apply/guardian-consent',
  '/kca/apply/guardian-consent': '/kca/apply/recommendation',
  '/kca/apply/recommendation': '/kca/apply/review',
  '/kca/apply/review': '/kca/apply/status',

  '/events/kingdom-advancement-conference-2024/register': '/events/kingdom-advancement-conference-2024/checkout',
  '/events/kingdom-advancement-conference-2024/checkout': '/events/kingdom-advancement-conference-2024/ticket',
  '/events/youth-summit-2025/register': '/events/youth-summit-2025/checkout',
  '/events/youth-summit-2025/checkout': '/events/youth-summit-2025/ticket',
  '/events/leadership-training/register': '/events/leadership-training/checkout',
  '/events/leadership-training/checkout': '/events/leadership-training/ticket',
  '/events/prayer-fasting-week/register': '/events/prayer-fasting-week/checkout',
  '/events/prayer-fasting-week/checkout': '/events/prayer-fasting-week/ticket',
  '/events/kingdom-advancement-conference-2024/feedback': '/account/events',
  '/events/youth-summit-2025/feedback': '/account/events',
  '/events/leadership-training/feedback': '/account/events',
  '/events/prayer-fasting-week/feedback': '/account/events',

  '/give': '/give/payment',
  '/give/payment': '/give/receipt',
  '/mission/support': '/give/payment',
  '/mission/crusades/invite': '/mission/crusades/request/status',
  '/prayer/request': '/account/prayer-requests',
  '/account/prayer-requests/new': '/account/prayer-requests',
  '/account/need-requests/new': '/account/need-requests',
  '/account/testimonies/new': '/account/testimonies',
  '/account/giving/recurring': '/account/giving',
  '/join-church/register': '/account/church',
  '/first-time-visitor': '/account',
  '/churches/family-house-ikeja/contact': '/churches/family-house-ikeja',
  '/online-church/counselling': '/online-church/welcome',
  '/online-church/altar-call': '/online-church/welcome',
  '/contact': '/faq',
};

export const successHref: Record<string, string> = {
  '/start-home-church/submitted': '/account/applications/home-church',
  '/kca/apply/status': '/kca/admission-letter',
  '/give/receipt': '/account/giving',
  '/online-church/welcome': '/account',
};

export const heroPrimaryHref = (path: string, section: string, action?: string): string => {
  if (path === '/') return '/church';
  if (path === '/join-church') return '/join-church/register';
  if (path === '/no-church-nearby') return '/start-home-church';
  if (path === '/kca' || path === '/kca/gate') return '/kca/enrol';
  if (path === '/kca/why') return '/kca/enrol';
  if (path === '/mission') return '/mission/crusades/invite';
  if (path === '/mission/impact') return '/mission/crusades';
  if (path === '/mission/partners/loveworld-outreach') return '/mission/support';
  if (path === '/press') return '/press/publications';
  if (path === '/church') return '/find-church';
  if (path === '/find-church') return '/find-church/results';
  if (path === '/online-church') return '/online-church/live';
  if (section === 'KCA') return '/kca/enrol';
  if (section === 'Mission') return '/mission/crusades/invite';
  if (section === 'Church') return '/find-church';
  if (action?.toLowerCase().includes('register')) return `${path}/register`.replace('//', '/');
  return path;
};

export const kcaApplySteps = [
  ['/kca/apply/church', 'Church Info'],
  ['/kca/apply/walk-with-christ', 'Walk with Christ'],
  ['/kca/apply/why-join', 'Why Join'],
  ['/kca/apply/interests', 'Interests'],
  ['/kca/apply/commitment', 'Commitment'],
  ['/kca/apply/declaration', 'Declaration'],
  ['/kca/apply/guardian-consent', 'Guardian'],
  ['/kca/apply/recommendation', 'Recommendation'],
  ['/kca/apply/review', 'Review'],
] as const;

export const registerSteps = [
  ['/register/personal', 'Personal'],
  ['/register/contact', 'Contact'],
  ['/register/security', 'Security'],
  ['/register/about', 'About You'],
  ['/register/review', 'Review'],
] as const;

export const homeChurchSteps = [
  ['/start-home-church/apply/personal', 'Personal'],
  ['/start-home-church/apply/location', 'Location'],
  ['/start-home-church/apply/meeting', 'Meeting'],
  ['/start-home-church/apply/participants', 'Participants'],
  ['/start-home-church/apply/motivation', 'Motivation'],
  ['/start-home-church/apply/contact', 'Contact'],
  ['/start-home-church/apply/commitment', 'Commitment'],
  ['/start-home-church/apply/review', 'Review'],
] as const;
