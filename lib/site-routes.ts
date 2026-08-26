export type SiteSurface = 'public' | 'auth' | 'workflow' | 'member';
export type SiteKind = 'landing' | 'listing' | 'detail' | 'form' | 'success' | 'dashboard' | 'settings' | 'media' | 'map' | 'document';

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
  Church: 'Find community, worship together, and grow in Christ.',
  Mission: 'Reaching the lost and transforming lives around the world.',
  KCA: 'Kingdom-minded learning, leadership, and practical ministry.',
  Events: 'Gather, worship, learn, and serve together.',
  Giving: 'Every seed advances the Kingdom and changes lives.',
  Account: 'Your personal Family House Connect experience.',
  Online: 'Worship, grow, and connect from anywhere.',
};

const make = (section: string, surface: SiteSurface, kind: SiteKind, rows: Array<[string, string, string?]>): SiteRoute[] =>
  rows.map(([path, title, action]) => ({ path, title, action, section, surface, kind, subtitle: subtitles[section] ?? 'Family House Connect' }));

export const siteRoutes: SiteRoute[] = [
  ...make('Home', 'public', 'landing', [['/', 'One Family. One Mission.', 'Explore Family House'], ['/about', 'About Family House'], ['/vision', 'Our Vision & Global Mission'], ['/global-mission', 'Global Kingdom Multiplication', 'Be Part of the Story'], ['/contact', 'Contact Us', 'Send Message'], ['/faq', 'Frequently Asked Questions'], ['/search', 'Search Family House']]),
  ...make('Church', 'public', 'landing', [['/church', 'Church', 'Find a Church'], ['/find-church', 'Find a Church Near You', 'Search'], ['/join-church', 'Join a Family House Church', 'Start Registration'], ['/no-church-nearby', 'No Church Nearby?', 'Start a Church in Your Home'], ['/global-journey', 'From One Family to Every Nation']]),
  ...make('Church', 'public', 'map', [['/find-church/map', 'Global Church Map'], ['/find-church/results', 'Search Results for “Lagos, Nigeria”'], ['/churches/family-house-ikeja/directions', 'Directions to Family House Church Ikeja']]),
  ...make('Church', 'public', 'detail', [['/churches/family-house-ikeja', 'Family House Church Ikeja', 'Join Church'], ['/home-churches/family-house-allen', 'Family House Home Church – Allen', 'Request to Join'], ['/online-church/profile', 'Family House Online Church', 'Join Online Church'], ['/churches/family-house-ikeja/contact', 'Request Church Contact', 'Send Request'], ['/join-church/register', 'Church Membership Registration', 'Continue'], ['/first-time-visitor', 'Welcome! First-Time Visitor', 'Complete Registration']]),
  ...make('Church', 'workflow', 'form', [['/start-home-church', 'Start a Church in Your Home', 'Start Your Application'], ['/start-home-church/eligibility', 'Is This For You?', 'I’m Eligible, Continue'], ['/start-home-church/apply/personal', 'Personal Details', 'Save & Continue'], ['/start-home-church/apply/location', 'Location', 'Save & Continue'], ['/start-home-church/apply/meeting', 'Meeting Information', 'Save & Continue'], ['/start-home-church/apply/participants', 'Expected Participants', 'Save & Continue'], ['/start-home-church/apply/motivation', 'Ministry Motivation', 'Save & Continue'], ['/start-home-church/apply/contact', 'Contact Information', 'Save & Continue'], ['/start-home-church/apply/commitment', 'Guidelines & Commitment', 'Save & Continue'], ['/start-home-church/apply/review', 'Review Your Application', 'Submit Application']]),
  ...make('Church', 'workflow', 'success', [['/start-home-church/submitted', 'Application Submitted!', 'Go to Dashboard']]),
  ...make('Account', 'member', 'dashboard', [['/account', 'Welcome back, John!'], ['/account/journey', 'My Kingdom Journey'], ['/account/church', 'My Church'], ['/account/home-church', 'My Home Church'], ['/account/ministry-history', 'My Ministry Journey'], ['/account/spiritual-growth', 'Spiritual Growth'], ['/account/ministries', 'My Ministries & Departments'], ['/account/attendance', 'Attendance History'], ['/account/prayer-requests', 'My Prayer Requests', 'New Prayer Request'], ['/account/need-requests', 'My Need Requests', 'New Need Request'], ['/account/testimonies', 'My Testimonies', 'Share a Testimony'], ['/account/messages', 'Messages'], ['/account/notifications', 'Notifications'], ['/account/downloads', 'Downloads'], ['/account/applications/home-church', 'My Application']]),
  ...make('Account', 'member', 'settings', [['/account/profile', 'Membership Profile', 'Edit Profile'], ['/account/settings', 'Account Settings', 'Save Changes'], ['/account/settings/profile', 'My Profile', 'Edit Profile'], ['/account/settings/security', 'Security Settings'], ['/account/settings/sessions', 'Active Sessions'], ['/account/settings/mfa', 'Multi-Factor Authentication'], ['/account/settings/privacy', 'Privacy Controls'], ['/account/settings/consents', 'Consent Management'], ['/account/settings/data-export', 'Data Export', 'Request Export'], ['/account/settings/delete', 'Account Deletion', 'Delete My Account'], ['/account/settings/notifications', 'Notification Channels'], ['/account/settings/communications', 'Communication Preferences', 'Save Preferences'], ['/account/settings/linked-accounts', 'Linked Guardian / Child Accounts'], ['/account/help', 'Help & Support', 'Contact Us']]),
  ...make('Auth', 'auth', 'form', [['/login', 'Welcome Back', 'Sign In'], ['/register', 'Create Your Account', 'Continue'], ['/verify-email', 'Verify Your Email', 'Resend Email'], ['/otp', 'Enter Verification Code', 'Verify Code'], ['/forgot-password', 'Forgot Password', 'Send Reset Link'], ['/reset-password', 'Reset Your Password', 'Reset Password'], ['/mfa/setup', 'Set Up Two-Factor Authentication', 'Verify and Enable'], ['/account-recovery', 'Account Recovery'], ['/onboarding/language', 'Choose Your Language', 'Continue'], ['/onboarding/location', 'Where Are You Located?', 'Continue'], ['/onboarding/profile', 'Let’s Set Up Your Profile', 'Continue']]),
  ...make('Events', 'public', 'listing', [['/events', 'Upcoming Events'], ['/events/kingdom-advancement-conference-2024', 'Kingdom Advancement Conference 2024', 'Register Now'], ['/events/kingdom-advancement-conference-2024/ticket', 'Your Ticket', 'Download'], ['/events/kingdom-advancement-conference-2024/feedback', 'We Value Your Feedback!', 'Submit Feedback'], ['/prayer', 'We Are Here to Pray With You']]),
  ...make('Events', 'workflow', 'form', [['/events/kingdom-advancement-conference-2024/register', 'Register for Kingdom Advancement Conference 2024', 'Continue'], ['/events/kingdom-advancement-conference-2024/checkout', 'Event Checkout', 'Pay Now'], ['/prayer/request', 'Submit a Prayer Request', 'Submit Prayer Request'], ['/give', 'Give Generously, Change Lives', 'Give Now'], ['/give/payment', 'Secure Payment', 'Pay ₦5,100']]),
  ...make('Giving', 'member', 'listing', [['/account/giving', 'My Giving History']]),
  ...make('Giving', 'member', 'form', [['/account/giving/recurring', 'Recurring Giving', 'Start Recurring Giving']]),
  ...make('Giving', 'workflow', 'success', [['/give/receipt', 'Thank You for Your Generosity!', 'Download Receipt']]),
  ...make('KCA', 'public', 'landing', [['/kca', 'Kingdom Change Agents', 'Apply Now'], ['/kca/why', 'Why Join KCA?']]),
  ...make('KCA', 'workflow', 'form', [['/kca/enrol', 'Begin Your KCA Journey', 'Start Application'], ['/kca/apply/church', 'Church Information'], ['/kca/apply/walk-with-christ', 'Walk with Christ'], ['/kca/apply/why-join', 'Why Do You Want to Join KCA?'], ['/kca/apply/interests', 'Kingdom Interests'], ['/kca/apply/commitment', 'Commitment'], ['/kca/apply/declaration', 'Personal Declaration'], ['/kca/apply/guardian-consent', 'Guardian Consent'], ['/kca/apply/recommendation', 'Leadership Recommendation'], ['/kca/apply/review', 'Review Your Application', 'Submit Application']]),
  ...make('KCA', 'workflow', 'success', [['/kca/apply/status', 'Congratulations!', 'View Admission Letter']]),
  ...make('KCA', 'member', 'dashboard', [['/account/kca', 'KCA Student Dashboard'], ['/account/kca/modules', 'My Modules'], ['/account/kca/modules/foundations-of-faith', 'Foundations of Faith'], ['/account/kca/assignments/personal-devotional-journal', 'Assignment: Personal Devotional Journal']]),
  ...make('KCA', 'member', 'document', [['/kca/admission-letter', 'Admission Letter', 'Download PDF'], ['/account/kca/certificate', 'Certificate of Completion', 'Download Certificate'], ['/kca/certificates/verify', 'Verify Certificate', 'Verify Certificate']]),
  ...make('Mission', 'public', 'landing', [['/mission', 'Reaching the World with the Love of Christ', 'Invite Us for a Crusade'], ['/mission/impact', 'Mission Impact'], ['/mission/partners/loveworld-outreach', 'LoveWorld Outreach', 'Partner With Us']]),
  ...make('Mission', 'public', 'listing', [['/mission/crusades', 'Crusades'], ['/mission/locations', 'Mission Locations'], ['/mission/partners', 'Mission Partners'], ['/mission/projects', 'Mission Projects'], ['/mission/giving', 'Mission Giving'], ['/mission/stories', 'Mission Stories']]),
  ...make('Mission', 'workflow', 'form', [['/mission/crusades/invite', 'Invite Us for a Crusade', 'Next Step'], ['/mission/crusades/request/review', 'Crusade Request Review', 'Approve'], ['/mission/crusades/request/status', 'Crusade Request', 'View Status'], ['/mission/support', 'Support a Mission', 'Donate Now']]),
  ...make('Online', 'public', 'media', [['/online-church', 'Welcome to Online Church', 'Watch Live'], ['/online-church/live', 'Sunday Celebration Service', 'Give'], ['/online-church/schedule', 'Service Schedule'], ['/online-church/sermons', 'Sermons'], ['/online-church/sermons/walking-in-gods-purpose', 'Walking in God’s Purpose', 'Watch Full Sermon'], ['/online-church/bible-study', 'Bible Study'], ['/online-church/prayer', 'Prayer Meeting', 'Join Prayer Meeting'], ['/online-church/children', 'Children Service', 'Watch Now'], ['/online-church/youth', 'Youth Service', 'Join Youth Service'], ['/online-church/counselling', 'Counselling Request', 'Next Step'], ['/online-church/altar-call', 'Digital Altar Call', 'Next: Tell Us About You'], ['/online-church/welcome', 'Welcome Home!', 'Connect With Us']]),
  ...make('Press', 'public', 'landing', [['/press', 'Family House Press', 'Explore Library']]),
];

export const findSiteRoute = (path: string) => siteRoutes.find((route) => route.path === path);
export const memberNavigation = [
  ['/account', 'Dashboard'], ['/account/journey', 'My Journey'], ['/account/church', 'My Church'], ['/account/home-church', 'My Home Church'], ['/account/prayer-requests', 'Prayer'], ['/account/need-requests', 'Needs'], ['/account/ministries', 'Ministries'], ['/account/messages', 'Messages'], ['/account/notifications', 'Notifications'], ['/account/downloads', 'Downloads'], ['/account/settings', 'Settings'],
] as const;
