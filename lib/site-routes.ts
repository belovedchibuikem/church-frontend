export type SiteSurface = 'public' | 'auth' | 'workflow' | 'member';
export type SiteKind =
  | 'landing'
  | 'listing'
  | 'detail'
  | 'form'
  | 'success'
  | 'dashboard'
  | 'settings'
  | 'media'
  | 'map'
  | 'document'
  | 'calendar'
  | 'hub';

export type SiteRoute = {
  path: string;
  title: string;
  subtitle: string;
  surface: SiteSurface;
  kind: SiteKind;
  section: string;
  action?: string;
};

const subtitles: Record<string, string> = {
  Church: 'Find community, worship together, and grow in Jesus Christ.',
  Mission: 'Reaching the lost and transforming lives around the world.',
  KCA: 'Kingdom-minded learning, leadership, and practical ministry.',
  Events: 'Gather, worship, learn, and serve together.',
  Giving: 'Every seed advances the Kingdom and changes lives.',
  Account: 'Your personal Family House Connect experience.',
  Online: 'Worship, grow, and connect from anywhere.',
  Home: 'One family. One mission.',
  Auth: 'Secure access to your Family House journey.',
  Press: 'Books, sermons, and devotionals for every season.',
};

const make = (section: string, surface: SiteSurface, kind: SiteKind, rows: Array<[string, string, string?]>): SiteRoute[] =>
  rows.map(([path, title, action]) => ({ path, title, action, section, surface, kind, subtitle: subtitles[section] ?? 'Family House Connect' }));

const eventFlow = (slug: string, title: string): SiteRoute[] => [
  ...make('Events', 'public', 'detail', [[`/events/${slug}`, title, 'Register Now']]),
  ...make('Events', 'workflow', 'form', [
    [`/events/${slug}/register`, `Register for ${title}`, 'Continue to Payment'],
    [`/events/${slug}/checkout`, `${title} Checkout`, 'Pay Now'],
    [`/events/${slug}/feedback`, `Feedback · ${title}`, 'Submit Feedback'],
  ]),
  ...make('Events', 'workflow', 'document', [[`/events/${slug}/ticket`, `Your Ticket · ${title}`, 'Download Ticket']]),
];

export const siteRoutes: SiteRoute[] = [
  ...make('Home', 'public', 'landing', [
    ['/', 'One Family. One Mission.', 'Explore Family House'],
    ['/about', 'About Family House'],
    ['/vision', 'Our Vision & Global Mission'],
    ['/global-mission', 'Global Kingdom Multiplication', 'Be Part of the Story'],
    ['/contact', 'Contact Us', 'Send Message'],
    ['/faq', 'Frequently Asked Questions'],
    ['/search', 'Search Family House'],
  ]),
  ...make('Church', 'public', 'landing', [
    ['/church', 'Church', 'Find a Church'],
    ['/find-church', 'Find a Church Near You', 'Search'],
    ['/join-church', 'Join a Family House Church', 'Start Registration'],
    ['/no-church-nearby', 'No Church Nearby?', 'Start a Church in Your Home'],
    ['/global-journey', 'From One Family to Every Nation'],
  ]),
  ...make('Church', 'public', 'map', [
    ['/find-church/map', 'Global Church Map'],
    ['/find-church/results', 'Search Results for “Lagos, Nigeria”'],
    ['/churches/family-house-ikeja/directions', 'Directions to Family House Church Ikeja'],
    ['/churches/family-house-lekki/directions', 'Directions to Family House Church Lekki'],
  ]),
  ...make('Church', 'public', 'detail', [
    ['/churches/family-house-ikeja', 'Family House Church Ikeja', 'Join Church'],
    ['/churches/family-house-lekki', 'Family House Church Lekki', 'Join Church'],
    ['/home-churches/family-house-allen', 'Family House Home Church – Allen', 'Request to Join'],
    ['/online-church/profile', 'Family House Online Church', 'Join Online Church'],
  ]),
  ...make('Church', 'workflow', 'form', [
    ['/churches/family-house-ikeja/contact', 'Request Church Contact', 'Send Request'],
    ['/join-church/register', 'Church Membership Registration', 'Continue'],
    ['/first-time-visitor', 'Welcome! First-Time Visitor', 'Complete Registration'],
    ['/start-home-church', 'Start a Church in Your Home', 'Start Your Application'],
    ['/start-home-church/eligibility', 'Is This For You?', 'I’m Eligible, Continue'],
    ['/start-home-church/apply/personal', 'Personal Details', 'Save & Continue'],
    ['/start-home-church/apply/location', 'Location', 'Save & Continue'],
    ['/start-home-church/apply/meeting', 'Meeting Information', 'Save & Continue'],
    ['/start-home-church/apply/participants', 'Expected Participants', 'Save & Continue'],
    ['/start-home-church/apply/motivation', 'Ministry Motivation', 'Save & Continue'],
    ['/start-home-church/apply/contact', 'Contact Information', 'Save & Continue'],
    ['/start-home-church/apply/commitment', 'Guidelines & Commitment', 'Save & Continue'],
    ['/start-home-church/apply/review', 'Review Your Application', 'Submit Application'],
  ]),
  ...make('Church', 'workflow', 'success', [['/start-home-church/submitted', 'Application Submitted!', 'Track My Application']]),
  ...make('Account', 'member', 'dashboard', [
    ['/account', 'Welcome back, John!'],
    ['/account/journey', 'My Kingdom Journey'],
    ['/account/church', 'My Church'],
    ['/account/home-church', 'My Home Church'],
    ['/account/ministry-history', 'My Ministry Journey'],
    ['/account/spiritual-growth', 'Spiritual Growth'],
    ['/account/ministries', 'My Ministries & Departments'],
    ['/account/attendance', 'Attendance History'],
    ['/account/prayer-requests', 'My Prayer Requests', 'New Prayer Request'],
    ['/account/need-requests', 'My Need Requests', 'New Need Request'],
    ['/account/testimonies', 'My Testimonies', 'Share a Testimony'],
    ['/account/messages', 'Messages'],
    ['/account/notifications', 'Notifications'],
    ['/account/downloads', 'Downloads'],
    ['/account/applications/home-church', 'My Application'],
    ['/account/events', 'My Events'],
  ]),
  ...make('Account', 'member', 'calendar', [['/account/calendar', 'My Calendar']]),
  ...make('Account', 'member', 'form', [
    ['/account/prayer-requests/new', 'New Prayer Request', 'Submit Prayer Request'],
    ['/account/need-requests/new', 'New Need Request', 'Submit Need Request'],
    ['/account/testimonies/new', 'Share a Testimony', 'Publish Testimony'],
  ]),
  ...make('Account', 'member', 'settings', [
    ['/account/profile', 'Membership Profile', 'Edit Profile'],
    ['/account/settings', 'Account Settings', 'Save Changes'],
    ['/account/settings/profile', 'My Profile', 'Edit Profile'],
    ['/account/settings/security', 'Security Settings'],
    ['/account/settings/sessions', 'Active Sessions'],
    ['/account/settings/mfa', 'Multi-Factor Authentication'],
    ['/account/settings/privacy', 'Privacy Controls'],
    ['/account/settings/consents', 'Consent Management'],
    ['/account/settings/data-export', 'Data Export', 'Request Export'],
    ['/account/settings/delete', 'Account Deletion', 'Delete My Account'],
    ['/account/settings/notifications', 'Notification Channels'],
    ['/account/settings/communications', 'Communication Preferences', 'Save Preferences'],
    ['/account/settings/linked-accounts', 'Linked Guardian / Child Accounts'],
    ['/account/help', 'Help & Support', 'Contact Us'],
  ]),
  ...make('Auth', 'auth', 'form', [
    ['/login', 'Welcome Back', 'Sign In'],
    ['/register', 'Create Your Account', 'Continue'],
    ['/register/personal', 'Personal Information', 'Continue'],
    ['/register/contact', 'Contact Information', 'Continue'],
    ['/register/security', 'Account Security', 'Continue'],
    ['/register/about', 'About You', 'Continue'],
    ['/register/review', 'Review & Confirm', 'Create Account'],
    ['/verify-email', 'Verify Your Email', 'Resend Email'],
    ['/verify-phone', 'Verify Your Phone', 'Verify Code'],
    ['/otp', 'Enter Verification Code', 'Verify Code'],
    ['/forgot-password', 'Forgot Password', 'Send Reset Link'],
    ['/reset-password', 'Reset Your Password', 'Reset Password'],
    ['/mfa/setup', 'Set Up Two-Factor Authentication', 'Verify and Enable'],
    ['/account-recovery', 'Account Recovery', 'Continue'],
    ['/onboarding/language', 'Choose Your Language', 'Continue'],
    ['/onboarding/location', 'Where Are You Located?', 'Continue'],
    ['/onboarding/profile', 'Let’s Set Up Your Profile', 'Continue'],
    ['/onboarding/role', 'How will you use Family House?', 'Continue'],
  ]),
  ...make('Events', 'public', 'hub', [['/events', 'Events', 'View Calendar']]),
  ...eventFlow('kingdom-advancement-conference-2024', 'Kingdom Advancement Conference 2024'),
  ...eventFlow('youth-summit-2025', 'Youth Summit 2025'),
  ...eventFlow('leadership-training', 'Leadership Training'),
  ...eventFlow('prayer-fasting-week', 'Prayer & Fasting Week'),
  ...make('Events', 'public', 'landing', [['/prayer', 'We Are Here to Pray With You', 'Submit a Prayer Request']]),
  ...make('Events', 'workflow', 'form', [['/prayer/request', 'Submit a Prayer Request', 'Submit Prayer Request']]),
  ...make('Events', 'workflow', 'form', [
    ['/give', 'Give Generously, Change Lives', 'Give Now'],
    ['/give/payment', 'Secure Payment', 'Pay ₦5,100'],
  ]),
  ...make('Giving', 'member', 'listing', [['/account/giving', 'My Giving History']]),
  ...make('Giving', 'member', 'form', [['/account/giving/recurring', 'Recurring Giving', 'Start Recurring Giving']]),
  ...make('Giving', 'workflow', 'success', [['/give/receipt', 'Thank You for Your Generosity!', 'View Giving History']]),
  ...make('KCA', 'public', 'landing', [
    ['/kca', 'Kingdom Change Agents', 'Apply Now'],
    ['/kca/gate', 'Enter KCA', 'Enroll Now'],
    ['/kca/why', 'Why Join KCA?', 'Start Application'],
  ]),
  ...make('KCA', 'workflow', 'form', [
    ['/kca/enrol', 'Kingdom Change Agents', 'Enroll Now'],
    ['/kca/apply/church', 'Church Information', 'Save & Continue'],
    ['/kca/apply/walk-with-christ', 'Walk with Christ', 'Save & Continue'],
    ['/kca/apply/why-join', 'Why Do You Want to Join KCA?', 'Save & Continue'],
    ['/kca/apply/interests', 'Kingdom Interests', 'Save & Continue'],
    ['/kca/apply/commitment', 'Commitment', 'Save & Continue'],
    ['/kca/apply/declaration', 'Personal Declaration', 'Save & Continue'],
    ['/kca/apply/guardian-consent', 'Guardian Consent', 'Save & Continue'],
    ['/kca/apply/recommendation', 'Leadership Recommendation', 'Save & Continue'],
    ['/kca/apply/review', 'Review Your Application', 'Submit Application'],
  ]),
  ...make('KCA', 'workflow', 'success', [['/kca/apply/status', 'Congratulations!', 'View Admission Letter']]),
  ...make('KCA', 'member', 'dashboard', [
    ['/account/kca', 'KCA Student Dashboard'],
    ['/account/kca/modules', 'My Modules'],
    ['/account/kca/modules/foundations-of-faith', 'Foundations of Faith'],
    ['/account/kca/modules/prayer-intercession', 'Prayer & Intercession'],
    ['/account/kca/modules/evangelism-essentials', 'Evangelism Essentials'],
    ['/account/kca/lessons/foundations-lesson-1', 'Lesson: The Authority of Scripture'],
    ['/account/kca/assignments', 'My Assignments'],
    ['/account/kca/assignments/personal-devotional-journal', 'Assignment: Personal Devotional Journal'],
    ['/account/kca/mentor', 'My Mentor'],
    ['/account/kca/attendance', 'KCA Attendance'],
    ['/account/kca/orientation', 'KCA Orientation'],
  ]),
  ...make('KCA', 'member', 'document', [
    ['/kca/admission-letter', 'Admission Letter', 'Download PDF'],
    ['/account/kca/certificate', 'Certificate of Completion', 'Download Certificate'],
    ['/kca/certificates/verify', 'Verify Certificate', 'Verify Certificate'],
  ]),
  ...make('Mission', 'public', 'landing', [
    ['/mission', 'Reaching the World with the Love of Jesus Christ', 'Invite Us for a Crusade'],
    ['/mission/impact', 'Mission Impact'],
  ]),
  ...make('Mission', 'public', 'detail', [
    ['/mission/partners/loveworld-outreach', 'LoveWorld Outreach', 'Partner With Us'],
    ['/mission/partners/kingdom-builders-network', 'Kingdom Builders Network', 'Partner With Us'],
    ['/mission/partners/compassion-fields', 'Compassion Fields', 'Partner With Us'],
    ['/mission/crusades/lagos-mega-crusade', 'Lagos Mega Crusade', 'Support This Crusade'],
    ['/mission/crusades/accra-harvest-gathering', 'Accra Harvest Gathering', 'Support This Crusade'],
    ['/mission/crusades/nairobi-kingdom-night', 'Nairobi Kingdom Night', 'View Impact'],
    ['/mission/projects/building-hope-church', 'Building Hope Church', 'Give to Project'],
    ['/mission/projects/clean-water-for-villages', 'Clean Water for Villages', 'Give to Project'],
    ['/mission/projects/missionary-care-fund', 'Missionary Care Fund', 'Give to Project'],
    ['/mission/stories/a-miracle-of-healing', 'A Miracle of Healing'],
    ['/mission/stories/youth-who-found-purpose', 'Youth Who Found Purpose'],
  ]),
  ...make('Mission', 'public', 'listing', [
    ['/mission/crusades', 'Crusades'],
    ['/mission/locations', 'Mission Locations'],
    ['/mission/partners', 'Mission Partners'],
    ['/mission/projects', 'Mission Projects'],
    ['/mission/giving', 'Mission Giving'],
    ['/mission/stories', 'Mission Stories'],
  ]),
  ...make('Mission', 'workflow', 'form', [
    ['/mission/crusades/invite', 'Invite Us for a Crusade', 'Next Step'],
    ['/mission/crusades/request/review', 'Crusade Request Review', 'Approve'],
    ['/mission/crusades/request/status', 'Crusade Request', 'View Status'],
    ['/mission/support', 'Support a Mission', 'Donate Now'],
  ]),
  ...make('Online', 'public', 'media', [
    ['/online-church', 'Welcome to Online Church', 'Watch Live'],
    ['/online-church/live', 'Sunday Celebration Service', 'Give'],
    ['/online-church/schedule', 'Service Schedule'],
    ['/online-church/sermons', 'Sermons'],
    ['/online-church/sermons/walking-in-gods-purpose', 'Walking in God’s Purpose', 'Watch Full Sermon'],
    ['/online-church/sermons/faith-that-moves-mountains', 'Faith That Moves Mountains', 'Watch Full Sermon'],
    ['/online-church/sermons/the-power-of-agreement', 'The Power of Agreement', 'Watch Full Sermon'],
    ['/online-church/bible-study', 'Bible Study'],
    ['/online-church/prayer', 'Prayer Meeting', 'Join Prayer Meeting'],
    ['/online-church/children', 'Children Service', 'Watch Now'],
    ['/online-church/youth', 'Youth Service', 'Join Youth Service'],
  ]),
  ...make('Online', 'workflow', 'form', [
    ['/online-church/counselling', 'Counselling Request', 'Next Step'],
    ['/online-church/altar-call', 'Digital Altar Call', 'Next: Tell Us About You'],
  ]),
  ...make('Online', 'workflow', 'success', [['/online-church/welcome', 'Welcome Home!', 'Connect With Us']]),
  ...make('Press', 'public', 'landing', [['/press', 'Family House Press', 'Explore Library']]),
  ...make('Press', 'public', 'detail', [
    ['/press/kingdom-leadership', 'Kingdom Leadership', 'Read Now'],
    ['/press/walking-in-purpose', 'Walking in Purpose', 'Read Now'],
    ['/press/the-power-of-prayer', 'The Power of Prayer', 'Read Now'],
  ]),
];

const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

/** Resolve a static catalogue route, or synthesize detail/workflow routes for live ULID ids. */
export const findSiteRoute = (path: string): SiteRoute | undefined => {
  const exact = siteRoutes.find((route) => route.path === path);
  if (exact) return exact;

  const churchMatch = path.match(/^\/churches\/([0-9A-HJKMNP-TV-Z]{26})(?:\/(directions|contact))?$/i);
  if (churchMatch) {
    const suffix = churchMatch[2];
    if (suffix === 'directions') {
      return { path, title: 'Church Directions', subtitle: subtitles.Church, surface: 'public', kind: 'map', section: 'Church' };
    }
    if (suffix === 'contact') {
      return { path, title: 'Request Church Contact', action: 'Send Request', subtitle: subtitles.Church, surface: 'workflow', kind: 'form', section: 'Church' };
    }
    return { path, title: 'Church Profile', action: 'Join Church', subtitle: subtitles.Church, surface: 'public', kind: 'detail', section: 'Church' };
  }

  const eventMatch = path.match(/^\/events\/([0-9A-HJKMNP-TV-Z]{26})(?:\/(register|checkout|feedback|ticket))?$/i);
  if (eventMatch) {
    const suffix = eventMatch[2];
    if (suffix === 'ticket') {
      return { path, title: 'Your Ticket', action: 'Download Ticket', subtitle: subtitles.Events, surface: 'workflow', kind: 'document', section: 'Events' };
    }
    if (suffix) {
      return { path, title: `Event ${suffix}`, action: 'Continue', subtitle: subtitles.Events, surface: 'workflow', kind: 'form', section: 'Events' };
    }
    return { path, title: 'Event Details', action: 'Register Now', subtitle: subtitles.Events, surface: 'public', kind: 'detail', section: 'Events' };
  }

  const pressMatch = path.match(/^\/press\/([0-9A-HJKMNP-TV-Z]{26})$/i);
  if (pressMatch) {
    return { path, title: 'Publication', action: 'Read Now', subtitle: subtitles.Press, surface: 'public', kind: 'detail', section: 'Press' };
  }

  const crusadeMatch = path.match(/^\/mission\/crusades\/([0-9A-HJKMNP-TV-Z]{26})$/i);
  if (crusadeMatch) {
    return { path, title: 'Crusade Details', action: 'Support This Crusade', subtitle: subtitles.Mission, surface: 'public', kind: 'detail', section: 'Mission' };
  }

  const kcaModuleMatch = path.match(/^\/account\/kca\/modules\/([0-9A-HJKMNP-TV-Z]{26})$/i);
  if (kcaModuleMatch) {
    return {
      path,
      title: 'KCA Module',
      action: 'View lessons',
      subtitle: subtitles.KCA,
      surface: 'member',
      kind: 'detail',
      section: 'KCA',
    };
  }

  const kcaLessonMatch = path.match(/^\/account\/kca\/lessons\/([0-9A-HJKMNP-TV-Z]{26})$/i);
  if (kcaLessonMatch) {
    return {
      path,
      title: 'KCA Lesson',
      action: 'Continue',
      subtitle: subtitles.KCA,
      surface: 'member',
      kind: 'detail',
      section: 'KCA',
    };
  }

  const kcaAssignmentMatch = path.match(/^\/account\/kca\/assignments\/([0-9A-HJKMNP-TV-Z]{26})$/i);
  if (kcaAssignmentMatch) {
    return {
      path,
      title: 'KCA Assignment',
      action: 'View assignment',
      subtitle: subtitles.KCA,
      surface: 'member',
      kind: 'detail',
      section: 'KCA',
    };
  }

  const homeChurchMatch = path.match(/^\/home-churches\/([0-9A-HJKMNP-TV-Z]{26})$/i);
  if (homeChurchMatch || (path.startsWith('/home-churches/') && ULID.test(path.split('/').pop() ?? ''))) {
    return { path, title: 'Home Church', action: 'Request to Join', subtitle: subtitles.Church, surface: 'public', kind: 'detail', section: 'Church' };
  }

  return undefined;
};

export const memberNavGroups = [
  {
    label: 'Overview',
    items: [
      { href: '/account', label: 'Dashboard', icon: '⌂' },
      { href: '/account/journey', label: 'My Journey', icon: '◎' },
    ],
  },
  {
    label: 'Belong',
    items: [
      { href: '/account/church', label: 'My Church', icon: '⛪' },
      { href: '/account/home-church', label: 'Home Church', icon: '⌂' },
      { href: '/account/kca', label: 'KCA', icon: '🎓' },
    ],
  },
  {
    label: 'Gather',
    items: [
      { href: '/account/events', label: 'Events', icon: '▣' },
      { href: '/account/calendar', label: 'Calendar', icon: '📅' },
    ],
  },
  {
    label: 'Care',
    items: [
      { href: '/account/prayer-requests', label: 'Prayer', icon: '🙏' },
      { href: '/account/need-requests', label: 'Needs', icon: '🛟' },
    ],
  },
  {
    label: 'Steward',
    items: [
      { href: '/account/giving', label: 'Giving', icon: '💝' },
      { href: '/account/messages', label: 'Messages', icon: '💬' },
      { href: '/account/notifications', label: 'Notifications', icon: '🔔' },
      { href: '/account/downloads', label: 'Downloads', icon: '⬇' },
    ],
  },
  {
    label: 'Account',
    items: [{ href: '/account/settings', label: 'Settings', icon: '⚙' }],
  },
] as const;

export const memberNavigation = memberNavGroups.flatMap((group) =>
  group.items.map((item) => [item.href, item.label] as const),
);

export const isMemberNavActive = (pathname: string, href: string): boolean => {
  if (href === '/account') return pathname === '/account';
  return pathname === href || pathname.startsWith(`${href}/`);
};
