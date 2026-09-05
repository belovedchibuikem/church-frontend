export type ContentCard = { title: string; body: string; href: string; icon?: string; meta?: string; status?: string; image?: string; action?: string };
export type Metric = { value: string; label: string; change?: string };
export type FaqItem = { q: string; a: string };
export type FormField = {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'tel' | 'date' | 'time' | 'select' | 'search-select' | 'geography' | 'textarea' | 'number' | 'password' | 'checkbox';
  options?: string[];
  catalog?: 'country' | 'region' | 'administrativeUnit' | 'location' | 'church' | 'homeChurch' | 'person' | 'nationality';
  value?: string;
  wide?: boolean;
};

/** Design fixtures below are used only when FHC_ENABLE_DESIGN_FIXTURES=true (see site-api). */

export const globalMetrics: Metric[] = [
  { value: '50,000+', label: 'Lives Impacted', change: '+12.4%' },
  { value: '1,842', label: 'Active Churches', change: '+8.1%' },
  { value: '147', label: 'Countries', change: '+3.2%' },
  { value: '2M+', label: 'Members', change: '+15.6%' },
];

export const pillars: ContentCard[] = [
  { title: 'Church', body: 'Find community, worship together, and grow in Jesus Christ through Family House churches worldwide.', href: '/church', icon: '⛪' },
  { title: 'Mission', body: 'Reach the lost and transform lives through crusades, compassion, and church planting.', href: '/mission', icon: '🌍' },
  { title: 'KCA', body: 'Kingdom-minded learning, leadership formation, and practical ministry training.', href: '/kca/gate', icon: '🎓' },
  { title: 'Press', body: 'Books, sermons, devotionals, and digital resources for every season of faith.', href: '/press', icon: '📖' },
];

export const homeActions: ContentCard[] = [
  { title: 'Find a Church', body: 'Locate a conventional, home, or online church near you.', href: '/find-church', icon: '⌖' },
  { title: 'Grow & Serve', body: 'Join a ministry, start serving, and deepen your walk with Christ.', href: '/account/journey', icon: '♡' },
  { title: 'Join a Community', body: 'Connect with believers who will walk with you in faith and purpose.', href: '/join-church', icon: '◎' },
  { title: 'Make an Impact', body: 'Give, pray, and partner with missions transforming nations.', href: '/give', icon: '✦' },
];

export const churches: ContentCard[] = [
  { title: 'Family House Church Ikeja', body: '12 Adeniyi Jones Ave, Ikeja · Pastor Daniel David · Sun 9:00 AM', href: '/churches/family-house-ikeja', meta: 'Conventional · 2.5 km', status: 'Certified', icon: '⛪', action: 'Join' },
  { title: 'Family House Home Church – Allen', body: 'Allen Ave, Ikeja · Leader Grace Ezekiel · Sun 5:00 PM', href: '/home-churches/family-house-allen', meta: 'Home Church · 3.1 km', status: 'Active', icon: '⌂', action: 'Request' },
  { title: 'Family House Online Church', body: 'Live worldwide · Next service Sunday 10:00 AM WAT', href: '/online-church/profile', meta: 'Online · Global', status: 'Live Ready', icon: '▶', action: 'Join Live' },
  { title: 'Family House Church Lekki', body: 'Lekki Phase 1 · Pastor Samuel Ade · Sun 8:00 AM & 10:30 AM', href: '/churches/family-house-lekki', meta: 'Conventional · 8.4 km', status: 'Certified', icon: '⛪', action: 'Join' },
];

export type EventItem = ContentCard & {
  when: string;
  where: string;
  tab: 'upcoming' | 'mine' | 'past';
  startsAt?: string;
};

export const eventCatalog: EventItem[] = [
  {
    title: 'Kingdom Advancement Conference 2024',
    body: 'Three days of worship, teaching, and Kingdom commissioning for the Family House network.',
    href: '/events/kingdom-advancement-conference-2024',
    meta: 'Conference',
    status: 'Registration Open',
    icon: '▣',
    when: 'May 30 – Jun 1, 2024 · 9:00 AM',
    where: 'Lagos Convention Centre',
    tab: 'upcoming',
    action: 'Register',
  },
  {
    title: 'Youth Summit 2025',
    body: 'A high-energy gathering for young believers to discover purpose and leadership.',
    href: '/events/youth-summit-2025',
    meta: 'Youth',
    status: 'Upcoming',
    icon: '⚡',
    when: 'Jun 8, 2025 · 10:00 AM',
    where: 'Lagos, Nigeria',
    tab: 'upcoming',
    action: 'Register',
  },
  {
    title: 'Leadership Training',
    body: 'Practical leadership formation for KCA students and church workers.',
    href: '/events/leadership-training',
    meta: 'Training',
    status: 'Upcoming',
    icon: '🎓',
    when: 'Jun 15, 2025 · 9:00 AM',
    where: 'Grace Center',
    tab: 'upcoming',
    action: 'Register',
  },
  {
    title: 'Prayer & Fasting Week',
    body: 'A dedicated week of corporate prayer, fasting, and spiritual renewal.',
    href: '/events/prayer-fasting-week',
    meta: 'Prayer',
    status: 'Online',
    icon: '🙏',
    when: 'Jun 23 – 29, 2025 · 6:00 PM',
    where: 'Online Church',
    tab: 'upcoming',
    action: 'Register',
  },
  {
    title: 'Sunday Celebration Service',
    body: 'Weekly live celebration with the global Family House family.',
    href: '/online-church/live',
    meta: 'Worship',
    status: 'This Week',
    icon: '♪',
    when: 'Every Sunday · 10:00 AM WAT',
    where: 'Online & Onsite',
    tab: 'mine',
    action: 'Join',
  },
  {
    title: 'Home Church Meeting · Allen',
    body: 'Your registered home church gathering.',
    href: '/account/home-church',
    meta: 'Home Church',
    status: 'Registered',
    icon: '⌂',
    when: 'Every Sunday · 5:00 PM',
    where: 'Allen Ave, Ikeja',
    tab: 'mine',
    action: 'Remind Me',
  },
  {
    title: 'Nairobi Kingdom Night',
    body: 'Completed mission night with worship and altar call.',
    href: '/mission/crusades/nairobi-kingdom-night',
    meta: 'Mission',
    status: 'Completed',
    icon: '🌍',
    when: 'Aug 18 – 20, 2024',
    where: 'Nairobi, Kenya',
    tab: 'past',
    action: 'Feedback',
  },
];

export const events = eventCatalog.filter((item) => item.tab === 'upcoming');

export const crusades: ContentCard[] = [
  { title: 'Lagos Mega Crusade', body: 'National Stadium · Lead: Missionary Paul Okoro · Jun 12–15', href: '/mission/crusades/lagos-mega-crusade', meta: 'Nigeria', status: 'Upcoming', icon: '🌍' },
  { title: 'Accra Harvest Gathering', body: 'Independence Square · Lead: Grace Mensah · Jul 4–6', href: '/mission/crusades/accra-harvest-gathering', meta: 'Ghana', status: 'Planning', icon: '🌍' },
  { title: 'Nairobi Kingdom Night', body: 'Uhuru Gardens · Lead: James Kariuki · Aug 18–20', href: '/mission/crusades/nairobi-kingdom-night', meta: 'Kenya', status: 'Completed', icon: '🌍' },
];

export const partners: ContentCard[] = [
  { title: 'LoveWorld Outreach', body: 'Evangelism · Discipleship · Media missions across Africa and Europe.', href: '/mission/partners/loveworld-outreach', meta: 'Partner since 2018', status: 'Active', icon: '🤝' },
  { title: 'Kingdom Builders Network', body: 'Church planting support and missionary care in 32 nations.', href: '/mission/partners/kingdom-builders-network', meta: 'Global Network', status: 'Active', icon: '🤝' },
  { title: 'Compassion Fields', body: 'Humanitarian relief, education, and community health programmes.', href: '/mission/partners/compassion-fields', meta: 'Aid Partner', status: 'Active', icon: '🤝' },
];

export const projects: ContentCard[] = [
  { title: 'Building Hope Church', body: 'Raised ₦12.4M of ₦18M · Church construction in Enugu.', href: '/mission/projects/building-hope-church', meta: '69% funded', status: 'In Progress', icon: '🏗' },
  { title: 'Clean Water for Villages', body: 'Raised ₦4.8M of ₦6M · Boreholes for mission communities.', href: '/mission/projects/clean-water-for-villages', meta: '80% funded', status: 'In Progress', icon: '💧' },
  { title: 'Missionary Care Fund', body: 'Raised ₦9.1M of ₦10M · Monthly support for field workers.', href: '/mission/projects/missionary-care-fund', meta: '91% funded', status: 'Almost There', icon: '❤' },
];

export const stories: ContentCard[] = [
  { title: 'A Miracle of Healing', body: 'After months of prayer at the Lagos crusade, Ada walked again — and now leads a home church.', href: '/mission/stories/a-miracle-of-healing', meta: 'Testimony', icon: '✦' },
  { title: 'From One Living Room to a Nation', body: 'What began with eight people in Ikeja is now a multiplying family across continents.', href: '/global-journey', meta: 'Journey', icon: '✦' },
  { title: 'Youth Who Found Purpose', body: 'KCA graduates planted three new fellowships in one academic year.', href: '/mission/stories/youth-who-found-purpose', meta: 'KCA Impact', icon: '✦' },
];

export const pressResources: ContentCard[] = [
  { title: 'Kingdom Leadership', body: 'A practical guide for leading with humility and spiritual authority.', href: '/press/kingdom-leadership', meta: 'Book · New Release', icon: '📘' },
  { title: 'Walking in Purpose', body: 'Discover God’s calling for your life and walk it out daily.', href: '/press/walking-in-purpose', meta: 'Book', icon: '📗' },
  { title: 'The Power of Prayer', body: 'Devotional readings to strengthen your prayer life.', href: '/press/the-power-of-prayer', meta: 'Devotional', icon: '📙' },
  { title: 'Gospel of John Study Manual', body: 'A guided weekly study through John. Type: Study Manual.', href: '/press/gospel-of-john-study', meta: 'Study Manual', icon: '📘' },
  { title: 'Sunday Sermon Archive', body: 'Watch and download messages from across the Family House network.', href: '/online-church/sermons', meta: 'Sermons', icon: '🎧' },
];

export const faqs: FaqItem[] = [
  { q: 'What is Family House Connect?', a: 'Family House Connect is a global ministry platform that unites churches, missions, Kingdom training, and resources so every believer can find community, grow, and serve.' },
  { q: 'How do I find a church near me?', a: 'Use Find a Church to search by city, region, or your current location. You can filter by conventional church, home church, online church, or mission location.' },
  { q: 'Can I start a church in my home?', a: 'Yes. Begin at Start a Home Church, confirm eligibility, and complete the guided application. A review team will walk with you through interview, approval, and activation.' },
  { q: 'How do I join KCA?', a: 'Open the KCA gate, choose Enroll Now, then complete the eight-step application covering church information, walk with Christ, interests, and commitments.' },
  { q: 'Where is my event calendar?', a: 'Open Events for Upcoming / My Events / Past, or go to My Calendar in your account for a month view of services and registered gatherings.' },
  { q: 'How can I give securely?', a: 'Use Give to choose an amount, fund, and payment method. Receipts and recurring giving are available in your member account after sign-in.' },
];

export const memberGlance: Metric[] = [
  { value: 'Grace Home', label: 'My Church' },
  { value: 'Level 3', label: 'Journey Growth' },
  { value: 'May 30', label: 'Next Event' },
  { value: '2 Active', label: 'Prayer Requests' },
];

export const memberActivity = [
  ['Joined Sunday Celebration', 'Yesterday · 10:24 AM', 'Attended'],
  ['Submitted prayer request', 'May 24 · Healing for Mum', 'In Prayer'],
  ['Completed Foundations of Faith', 'May 20 · KCA Module', 'Completed'],
  ['Gave to Mission Care Fund', 'May 18 · ₦5,000', 'Receipt Ready'],
];

export const memberEvents = [
  ['Kingdom Advancement Conference', 'May 30 · Lagos', 'Register', '/events/kingdom-advancement-conference-2024/register'],
  ['Home Church Meeting', 'Sun 5:00 PM · Allen', 'Remind Me', '/account/home-church'],
  ['Power in Prayer', 'Wed 7:00 PM · Online', 'Join', '/online-church/prayer'],
];

export const quickActions: ContentCard[] = [
  { title: 'Prayer Request', body: 'Share a need with the prayer team.', href: '/account/prayer-requests/new', icon: '🙏' },
  { title: 'Need Help', body: 'Request care or practical support.', href: '/account/need-requests/new', icon: '🛟' },
  { title: 'Calendar', body: 'See upcoming services and events.', href: '/account/calendar', icon: '📅' },
  { title: 'Give Online', body: 'Sow into church and mission work.', href: '/give', icon: '❤' },
];

export const sermons: ContentCard[] = [
  { title: 'Walking in God’s Purpose', body: 'Pastor Daniel David · May 19, 2024 · 48 min', href: '/online-church/sermons/walking-in-gods-purpose', meta: 'Latest', status: '48:12', icon: '▶' },
  { title: 'Faith That Moves Mountains', body: 'Pastor Grace Ezekiel · May 12, 2024 · 41 min', href: '/online-church/sermons/faith-that-moves-mountains', meta: 'Popular', status: '41:05', icon: '▶' },
  { title: 'The Power of Agreement', body: 'Pastor Samuel Ade · May 5, 2024 · 52 min', href: '/online-church/sermons/the-power-of-agreement', meta: 'Series', status: '52:30', icon: '▶' },
];

export const schedule: Array<[string, string, string, string]> = [
  ['Sunday Celebration', 'Sun · 10:00 AM WAT', 'Pastor Daniel David', '/online-church/live'],
  ['Devotionals', 'Tue · 7:00 PM WAT', 'Teacher Mary Okafor', '/press/devotionals'],
  ['Power in Prayer', 'Wed · 7:00 PM WAT', 'Prayer Team', '/online-church/prayer'],
  ['Youth Service', 'Fri · 6:00 PM WAT', 'Youth Pastors', '/online-church/youth'],
  ['Children Service', 'Sat · 10:00 AM WAT', 'FH Kids Team', '/online-church/children'],
];

export const journeySteps = ['Discover', 'Join', 'Member', 'Grow', 'Serve', 'Multiply'];

export const kcaModules: ContentCard[] = [
  { title: 'Foundations of Faith', body: 'Module 1 · Scripture, salvation, and spiritual disciplines.', href: '/account/kca/modules/foundations-of-faith', meta: '68% complete', status: 'In Progress', icon: '📘', action: 'Continue' },
  { title: 'Prayer & Intercession', body: 'Module 2 · Build a consistent prayer lifestyle.', href: '/account/kca/modules/prayer-intercession', meta: 'Ready to start', status: 'Ready', icon: '🙏', action: 'Start' },
  { title: 'Evangelism Essentials', body: 'Module 3 · Share Christ with clarity and compassion.', href: '/account/kca/modules/evangelism-essentials', meta: 'Unlocks after module 2', status: 'Locked', icon: '🔒', action: 'View' },
  { title: 'Discipleship Pathways', body: 'Module 4 · Walk with new believers.', href: '/account/kca/modules', meta: 'Locked', status: 'Locked', icon: '🔒', action: 'View' },
  { title: 'Church Life & Service', body: 'Module 5 · Serve faithfully in local church.', href: '/account/kca/modules', meta: 'Locked', status: 'Locked', icon: '🔒', action: 'View' },
  { title: 'Leadership Character', body: 'Module 6 · Lead with humility and integrity.', href: '/account/kca/modules', meta: 'Locked', status: 'Locked', icon: '🔒', action: 'View' },
];

export const kcaAssignments: ContentCard[] = [
  { title: 'Personal Devotional Journal', body: 'Due May 31 · Evidence upload required', href: '/account/kca/assignments/personal-devotional-journal', meta: 'Pending', status: 'Due Soon', icon: '✎', action: 'Open' },
  { title: 'Prayer Watch Reflection', body: 'Due Jun 7 · 500-word reflection', href: '/account/kca/assignments', meta: 'Pending', status: 'Upcoming', icon: '✎', action: 'Open' },
  { title: 'Foundations Quiz 1', body: 'Submitted May 18 · Awaiting mentor review', href: '/account/kca/assignments', meta: 'Submitted', status: 'Under Review', icon: '✓', action: 'View' },
];

export const calendarDays = [
  { day: 1, label: '' },
  { day: 2, label: '' },
  { day: 3, label: 'Devotionals', href: '/press/devotionals' },
  { day: 4, label: 'Prayer', href: '/online-church/prayer' },
  { day: 5, label: '' },
  { day: 6, label: 'Youth', href: '/online-church/youth' },
  { day: 7, label: 'Kids', href: '/online-church/children' },
  { day: 8, label: 'Youth Summit', href: '/events/youth-summit-2025' },
  { day: 9, label: '' },
  { day: 10, label: '' },
  { day: 11, label: '' },
  { day: 12, label: '' },
  { day: 13, label: '' },
  { day: 14, label: '' },
  { day: 15, label: 'Leadership', href: '/events/leadership-training' },
  { day: 16, label: '' },
  { day: 17, label: '' },
  { day: 18, label: '' },
  { day: 19, label: '' },
  { day: 20, label: '' },
  { day: 21, label: '' },
  { day: 22, label: '' },
  { day: 23, label: 'Fasting', href: '/events/prayer-fasting-week' },
  { day: 24, label: '' },
  { day: 25, label: '' },
  { day: 26, label: '' },
  { day: 27, label: '' },
  { day: 28, label: '' },
  { day: 29, label: '' },
  { day: 30, label: 'Conference', href: '/events/kingdom-advancement-conference-2024' },
];

export const sectionCards: Record<string, ContentCard[]> = {
  Home: homeActions,
  Church: [
    { title: 'Find a Church', body: 'Search conventional, home, and online churches near you.', href: '/find-church', icon: '⌖' },
    { title: 'Start a Home Church', body: 'Host a Spirit-led gathering and multiply disciples.', href: '/start-home-church', icon: '⌂' },
    { title: 'Join Online Church', body: 'Worship live and grow with the global family.', href: '/online-church', icon: '▶' },
    { title: 'First-Time Visitor', body: 'Let us welcome you and help you take the next step.', href: '/first-time-visitor', icon: '✦' },
  ],
  Mission: [
    { title: 'Evangelism', body: 'Proclaim Christ through crusades and outreach.', href: '/mission/crusades', icon: '📣' },
    { title: 'Discipleship', body: 'Raise mature believers who multiply.', href: '/mission/impact', icon: '🌱' },
    { title: 'Humanitarian Aid', body: 'Meet practical needs with compassion.', href: '/mission/projects', icon: '🤲' },
    { title: 'Church Planting', body: 'Establish lasting gospel communities.', href: '/mission/locations', icon: '🏛' },
  ],
  KCA: [
    { title: 'Biblical Training', body: 'Build a strong foundation in Scripture and doctrine.', href: '/kca/why', icon: '📖' },
    { title: 'Practical Ministry', body: 'Serve with skill in real ministry environments.', href: '/kca/enrol', icon: '🛠' },
    { title: 'Kingdom Impact', body: 'Lead change in church, community, and nations.', href: '/kca/why', icon: '⚡' },
    { title: 'Student Dashboard', body: 'Continue modules, assignments, and mentorship.', href: '/account/kca', icon: '📊' },
  ],
  Press: pressResources,
  Events: events,
  Giving: [
    { title: 'Tithe', body: 'Honour God with the first fruits of your increase.', href: '/give', icon: '✝' },
    { title: 'Offering', body: 'Sow into local church work as a distinct gift.', href: '/give', icon: '❤' },
    { title: 'Mission Giving', body: 'Fuel crusades, projects, and field workers.', href: '/mission/giving', icon: '🌍' },
    { title: 'Recurring Giving', body: 'Set a faithful monthly seed.', href: '/account/giving/recurring', icon: '↻' },
    { title: 'Special Projects', body: 'Partner with a specific Kingdom assignment.', href: '/mission/projects', icon: '🎯' },
  ],
  Online: [
    { title: 'Watch Live', body: 'Join the live celebration service.', href: '/online-church/live', icon: '▶' },
    { title: 'Service Schedule', body: 'Plan your week with upcoming gatherings.', href: '/online-church/schedule', icon: '📅' },
    { title: 'Sermons', body: 'Catch up on messages anytime.', href: '/online-church/sermons', icon: '🎧' },
    { title: 'Devotionals', body: 'Daily readings and Study Manuals, with the type marked on each title.', href: '/press/devotionals', icon: '📙' },
    { title: 'Bible', body: 'Read Scripture and follow a 1, 2, or 3 year plan.', href: '/bible', icon: '📖' },
  ],
  Account: quickActions,
};

export const formFieldsFor = (path: string): FormField[] => {
  if (path.includes('/login')) return [
    { label: 'Email or Phone Number', name: 'identity', type: 'text', value: 'john.doe@email.com' },
    { label: 'Password', name: 'password', type: 'password', value: '••••••••' },
  ];
  if (path === '/register') return [];
  if (path.includes('/register/personal')) return [
    { label: 'First Name', name: 'firstName', value: 'John' },
    { label: 'Last Name', name: 'lastName', value: 'Doe' },
    { label: 'Date of Birth', name: 'dob', type: 'date', value: '1994-05-12' },
    { label: 'Gender', name: 'gender', type: 'select', options: ['Male', 'Female', 'Prefer not to say'], value: 'Male' },
  ];
  if (path.includes('/register/contact')) return [
    { label: 'Email Address', name: 'email', type: 'email', value: 'john.doe@email.com' },
    { label: 'Phone Number', name: 'phone', type: 'tel', value: '+234 801 234 5678' },
    { label: 'Location', name: 'location', type: 'geography', wide: true, value: 'NG' },
  ];
  if (path.includes('/register/security')) return [
    { label: 'Password', name: 'password', type: 'password', value: 'Kingdom@2024' },
    { label: 'Confirm Password', name: 'confirm', type: 'password', value: 'Kingdom@2024' },
  ];
  if (path.includes('/register/about') || path.includes('/onboarding/profile')) return [
    { label: 'About You', name: 'about', type: 'textarea', value: 'I am excited to grow with Family House Connect.', wide: true },
    { label: 'What best describes you?', name: 'role', type: 'select', options: ['Member', 'First-time visitor', 'Worker / Volunteer', 'KCA Student', 'Leader / Pastor'], value: 'Member' },
  ];
  if (path.includes('/register/review')) return [];
  if (path.includes('/otp') || path.includes('/verify-phone')) return [];
  if (path.includes('/verify-email')) return [];
  if (path.includes('/forgot-password')) return [{ label: 'Email or Phone Number', name: 'identity', value: 'john.doe@email.com', wide: true }];
  if (path.includes('/reset-password')) return [
    { label: 'New Password', name: 'password', type: 'password', value: 'Kingdom@2024' },
    { label: 'Confirm New Password', name: 'confirm', type: 'password', value: 'Kingdom@2024' },
  ];
  if (path.includes('/mfa/setup')) return [{ label: '6-digit authenticator code', name: 'code', value: '482915', wide: true }];
  if (path.includes('/onboarding/language')) return [];
  if (path.includes('/onboarding/role')) return [];
  if (path.includes('/start-home-church/apply/personal')) return [
    { label: 'Given Name', name: 'applicant.given_name', value: 'John' },
    { label: 'Middle Name', name: 'applicant.middle_name', value: 'Chinedu' },
    { label: 'Family Name', name: 'applicant.family_name', value: 'Doe' },
    { label: 'Preferred Name', name: 'applicant.preferred_name', value: 'John' },
    { label: 'Contact Email', name: 'contact_email', type: 'email', value: 'john.doe@email.com' },
    { label: 'Contact Phone', name: 'contact_phone', type: 'tel', value: '+2348012345678' },
    { label: 'Sponsoring Church', name: 'church_id', type: 'search-select', catalog: 'church', value: '01JCHURCHIKEJA', wide: true },
  ];
  if (path.includes('/onboarding/location')) return [
    { label: 'Location', name: 'location', type: 'geography', wide: true, value: 'NG' },
  ];
  if (path.includes('/start-home-church/apply/location')) return [
    { label: 'Location', name: 'location', type: 'geography', wide: true, value: 'NG' },
    { label: 'Location Name', name: 'location_name', value: 'Ikeja Meeting Point', wide: true },
    { label: 'Address Line', name: 'address_line_one', value: '12 Allen Avenue', wide: true },
    { label: 'Meeting Location', name: 'location_id', type: 'search-select', catalog: 'location', value: '01JLOCADENIYI', wide: true },
  ];
  if (path.includes('/start-home-church/apply/meeting')) return [
    { label: 'Family name for the residence', name: 'residence_family_name', value: 'Onyeuwaoma John', wide: true },
    { label: 'Expected Participants', name: 'expected_participants', type: 'number', value: '25' },
  ];
  if (path.includes('/start-home-church/apply/participants')) return [
    { label: 'Expected Participants', name: 'expected_participants', type: 'number', value: '25', wide: true },
  ];
  if (path.includes('/start-home-church/apply/motivation')) return [
    { label: 'Additional notes (optional)', name: 'notes', type: 'textarea', value: 'I want to create a warm place for discipleship in my neighbourhood.', wide: true },
  ];
  if (path.includes('/start-home-church/apply/contact')) return [
    { label: 'Contact Email', name: 'contact_email', type: 'email', value: 'john.doe@email.com' },
    { label: 'Contact Phone', name: 'contact_phone', type: 'tel', value: '+2348012345678' },
  ];
  if (path.includes('/start-home-church/apply/commitment')) return [
    { label: 'I agree to the home church guidelines', name: 'guidelines_agreed', type: 'select', options: ['yes', 'no'], value: 'yes', wide: true },
  ];
  if (path.includes('/start-home-church/apply/review')) return [];
  if (path.includes('/kca/certificates/verify')) return [
    { label: 'Certificate verification code', name: 'code', value: '', wide: true },
  ];
  if (path.includes('/kca/apply/church')) return [
    { label: 'Full Name', name: 'fullName', value: 'Samuel David' },
    { label: 'Email Address', name: 'email', type: 'email', value: 'samuel.david@email.com' },
    { label: 'Home Church', name: 'home_church_id', type: 'search-select', catalog: 'homeChurch', value: '01JHCHOMEALLEN' },
    { label: 'Sponsoring Church', name: 'church_id', type: 'search-select', catalog: 'church', value: '01JCHURCHIKEJA' },
    { label: 'Pastor / Leader', name: 'pastor_id', type: 'search-select', catalog: 'person', value: '01JPERSONDAN', wide: true },
  ];
  if (path.includes('/kca/apply/walk-with-christ')) return [
    { label: 'Years Walking with Christ', name: 'years', type: 'select', options: ['Less than 1', '1–3 years', '3–5 years', '5+ years'], value: '3–5 years' },
    { label: 'Baptised?', name: 'baptised', type: 'select', options: ['Yes', 'No', 'Preparing'], value: 'Yes' },
    { label: 'Share your walk with Christ', name: 'story', type: 'textarea', value: 'I gave my life to Christ in 2019 and serve in the youth ministry.', wide: true },
  ];
  if (path.includes('/kca/apply/why-join')) return [
    { label: 'Why do you want to join KCA?', name: 'why', type: 'textarea', value: 'I want to be equipped for practical ministry and Kingdom leadership.', wide: true },
  ];
  if (path.includes('/kca/apply/interests')) return [
    { label: 'Primary Interest', name: 'interest', type: 'select', options: ['Evangelism', 'Discipleship', 'Worship', 'Media', 'Children', 'Youth', 'Missions'], value: 'Evangelism' },
    { label: 'Secondary Interest', name: 'interest2', type: 'select', options: ['Evangelism', 'Discipleship', 'Worship', 'Media', 'Children', 'Youth', 'Missions'], value: 'Discipleship' },
  ];
  if (path.includes('/kca/apply/commitment')) return [
    { label: 'I commit to attend classes, complete assignments, and participate in practical ministry.', name: 'attendance_commitment', type: 'checkbox', wide: true },
    { label: 'I understand that KCA requires spiritual discipline, integrity, and active participation.', name: 'conduct_commitment', type: 'checkbox', wide: true },
    { label: 'I will notify my leader if I am unable to meet a programme requirement.', name: 'communication_commitment', type: 'checkbox', wide: true },
  ];
  if (path.includes('/kca/apply/declaration')) return [
    { label: 'Full name (declaration signature)', name: 'declaration_signature', value: '', wide: true },
    { label: 'Declaration date', name: 'declaration_date', type: 'date', value: '' },
    { label: 'I confirm that the information in this application is true and complete.', name: 'declaration_confirmed', type: 'checkbox', wide: true },
  ];
  if (path.includes('/kca/apply/guardian-consent')) return [
    { label: 'Guardian / Parent full name', name: 'guardian_name', value: '' },
    { label: 'Relationship to applicant', name: 'guardian_relationship', type: 'select', options: ['Parent', 'Guardian', 'Spouse', 'Other'], value: 'Parent' },
    { label: 'Guardian phone number', name: 'guardian_phone', type: 'tel', value: '' },
    { label: 'Guardian email address', name: 'guardian_email', type: 'email', value: '' },
    { label: 'Guardian consent is required only where applicable.', name: 'guardian_consent', type: 'checkbox', wide: true },
  ];
  if (path.includes('/kca/apply/recommendation')) return [
      { label: 'Recommender full name', name: 'recommender_name', value: '' },
      { label: 'Position / ministry role', name: 'recommender_position', value: '' },
      { label: 'Recommender phone number', name: 'recommender_phone', type: 'tel', value: '' },
      { label: 'Recommender email address', name: 'recommender_email', type: 'email', value: '' },
  ];
  if (path.includes('/events/') && path.includes('/register')) return [
    { label: 'Full Name', name: 'fullName', value: 'John Chinedu Doe' },
    { label: 'Email Address', name: 'email', type: 'email', value: 'john.doe@email.com' },
    { label: 'Ticket Type', name: 'ticket', type: 'select', options: ['General Admission', 'Student', 'VIP', 'Group'], value: 'General Admission' },
    { label: 'Phone Number', name: 'phone', type: 'tel', value: '+234 801 234 5678' },
    { label: 'Special Requests', name: 'notes', type: 'textarea', value: 'I will attend with two family members.', wide: true },
  ];
  if (path.includes('/events/') && path.includes('/checkout')) return [
    { label: 'Amount (₦)', name: 'amount', type: 'number', value: '2000' },
    { label: 'Payment Method', name: 'method', type: 'select', options: ['Card', 'Bank Transfer', 'USSD', 'Mobile Money'], value: 'Card' },
    { label: 'Billing Email', name: 'email', type: 'email', value: 'john.doe@email.com' },
  ];
  if (path.includes('/events/') && path.includes('/feedback')) return [
    { label: 'Overall Rating', name: 'rating', type: 'select', options: ['5 - Excellent', '4 - Good', '3 - Fair', '2 - Poor', '1 - Very Poor'], value: '5 - Excellent' },
    { label: 'What did you enjoy?', name: 'enjoyed', type: 'textarea', value: 'The worship and practical teaching were outstanding.', wide: true },
    { label: 'What can we improve?', name: 'improve', type: 'textarea', value: 'More breakout sessions for first-timers.', wide: true },
  ];
  if (path.includes('/give')) return [
    { label: 'Give To', name: 'fund', type: 'select', options: ['Tithe', 'Offering', 'Mission Care Fund', 'Building Hope Church', 'KCA Scholarship'], value: 'Tithe' },
    { label: 'Amount (₦)', name: 'amount', type: 'number', value: '5100' },
    { label: 'Payment Method', name: 'method', type: 'select', options: ['Card', 'Bank Transfer', 'USSD', 'Wallet'], value: 'Card' },
    { label: 'Dedication / Note', name: 'note', type: 'textarea', value: 'For Kingdom advancement.', wide: true },
  ];
  if (path.includes('/account/prayer-requests')) return [
    { label: 'Subject', name: 'subject', value: 'Healing for Mum', wide: true },
    { label: 'Prayer Request', name: 'body', type: 'textarea', value: 'Please pray for complete healing and strength for my mother.', wide: true },
  ];
  if (path.includes('/account/need-requests')) return [
    { label: 'Category', name: 'category', type: 'select', options: ['Healing', 'Family', 'Provision', 'Guidance', 'Education', 'Other'], value: 'Provision', wide: true },
    { label: 'Need Summary', name: 'summary', type: 'textarea', value: 'I need pastoral support for a practical family need this month.', wide: true },
  ];
  if (path.includes('/account/testimonies')) return [
    { label: 'Title', name: 'title', value: '', wide: true },
    { label: 'Testimony', name: 'body', type: 'textarea', value: '', wide: true },
  ];
  if (path.includes('/prayer')) return [
    { label: 'Full Name', name: 'fullName', value: 'John Chinedu Doe' },
    { label: 'Email Address', name: 'email', type: 'email', value: 'john.doe@email.com' },
    { label: 'Prayer Category', name: 'category', type: 'select', options: ['Healing', 'Family', 'Provision', 'Guidance', 'Other'], value: 'Healing' },
    { label: 'Phone Number', name: 'phone', type: 'tel', value: '+234 801 234 5678' },
    { label: 'Prayer Request', name: 'request', type: 'textarea', value: 'Please pray for complete healing and strength for my mother.', wide: true },
  ];
  if (path.includes('/contact')) return [
    { label: 'Full Name', name: 'fullName', value: 'John Chinedu Doe' },
    { label: 'Email Address', name: 'email', type: 'email', value: 'john.doe@email.com' },
    { label: 'Phone Number', name: 'phone', type: 'tel', value: '+234 801 234 5678' },
    { label: 'Subject', name: 'subject', type: 'select', options: ['General Enquiry', 'Church Membership', 'Partnership', 'Support'], value: 'General Enquiry' },
    { label: 'Message', name: 'message', type: 'textarea', value: 'I would like to learn more about joining a Family House church in my city.', wide: true },
  ];
  if (path.includes('/mission/crusades/invite') || path.includes('/mission/support')) return [
    { label: 'Event / Project Title', name: 'title', value: '' },
    { label: 'Event Type', name: 'type', type: 'select', options: ['Crusade', 'Outreach', 'Conference', 'Medical Mission'], value: 'Crusade' },
    { label: 'Preferred Start Date', name: 'start', type: 'date', value: '' },
    { label: 'Location', name: 'location', value: '' },
    { label: 'Request Details', name: 'details', type: 'textarea', value: '', wide: true },
  ];
  if (path.includes('/online-church/altar-call')) return [
    { label: 'I have decided to', name: 'decision', type: 'select', options: ['Accept Jesus Christ as Lord and Saviour', 'Rededicate my life to Christ', 'Request baptism', 'Join a church'], value: 'Accept Jesus Christ as Lord and Saviour' },
    { label: 'Full Name', name: 'fullName', value: 'John Chinedu Doe' },
    { label: 'Email / Phone', name: 'contact', value: 'john.doe@email.com' },
    { label: 'Tell us more', name: 'notes', type: 'textarea', value: 'I want to grow and be connected to a local church.', wide: true },
  ];
  if (path.includes('/online-church/counselling')) return [
    { label: 'Full Name', name: 'fullName', value: 'John Chinedu Doe' },
    { label: 'Preferred Type', name: 'type', type: 'select', options: ['Pastoral', 'Marriage', 'Youth', 'General Guidance'], value: 'Pastoral' },
    { label: 'Preferred Date', name: 'date', type: 'date', value: '2024-06-10' },
    { label: 'Brief Description', name: 'notes', type: 'textarea', value: 'I would appreciate guidance for the next season of my life.', wide: true },
  ];
  return [
    { label: 'Full Name', name: 'fullName', value: 'John Chinedu Doe' },
    { label: 'Email Address', name: 'email', type: 'email', value: 'john.doe@email.com' },
    { label: 'Phone Number', name: 'phone', type: 'tel', value: '+234 801 234 5678' },
    { label: 'Location', name: 'location', type: 'select', options: ['Lagos, Nigeria', 'Abuja, Nigeria', 'Accra, Ghana'], value: 'Lagos, Nigeria' },
    { label: 'Tell us more', name: 'notes', type: 'textarea', value: 'I would like to take the next step in my Kingdom journey.', wide: true },
  ];
};

export const listingFor = (section: string, path: string): ContentCard[] => {
  if (path.includes('/mission/partners')) return partners;
  if (path.includes('/mission/projects')) return projects;
  if (path.includes('/mission/stories')) return stories;
  if (path.includes('/mission/crusades') || path.includes('/mission/locations')) return crusades;
  if (path.includes('/events') || path === '/prayer') return events;
  if (path.includes('/find-church') || path.includes('/churches') || path.includes('/home-churches')) return churches;
  if (path.includes('/online-church/sermons')) return sermons;
  if (path.includes('/press/devotionals')) {
    return pressResources.filter((item) => {
      const meta = (item.meta ?? '').toLowerCase();
      return meta.includes('devotional') || meta.includes('study manual');
    });
  }
  if (path.includes('/press')) return pressResources;
  if (path.includes('/account/giving')) return [
    { title: 'Mission Care Fund', body: 'May 18, 2024 · One-time · Receipt ready', href: '/give/receipt', meta: '₦5,000', status: 'Completed', icon: '🧾' },
    { title: 'Offering', body: 'May 5, 2024 · Recurring · Grace Home Church', href: '/account/giving', meta: '₦10,000', status: 'Completed', icon: '🧾' },
    { title: 'Building Hope Church', body: 'Apr 22, 2024 · Special Project', href: '/mission/projects/building-hope-church', meta: '₦15,000', status: 'Completed', icon: '🧾' },
  ];
  if (path.includes('/account/kca/modules')) return kcaModules;
  if (path.includes('/account/kca/assignments')) return kcaAssignments;
  if (path.includes('/account/events')) return eventCatalog.filter((item) => item.tab === 'mine' || item.tab === 'upcoming');
  if (path.includes('/account/prayer-requests')) return [
    { title: 'Healing for my mother', body: 'Submitted May 24 · Care team praying', href: '/account/prayer-requests', meta: 'Healing', status: 'In Prayer', icon: '🙏', action: 'View' },
    { title: 'Guidance for work', body: 'Submitted May 10 · Follow-up scheduled', href: '/account/prayer-requests', meta: 'Guidance', status: 'In Prayer', icon: '🙏', action: 'View' },
  ];
  if (path.includes('/account/need-requests')) return [
    { title: 'School fees support', body: 'Submitted May 20 · Pastoral care reviewing', href: '/account/need-requests', meta: 'Education', status: 'Open', icon: '🛟', action: 'View' },
    { title: 'Transport assistance', body: 'Submitted May 8 · Follow-up scheduled', href: '/account/need-requests', meta: 'Provision', status: 'Open', icon: '🛟', action: 'View' },
  ];
  if (path.includes('/account/messages')) return [
    { title: 'Care team', body: 'Last update May 24', href: '/account/messages', meta: '2 participants', status: 'Open', icon: '💬', action: 'Open' },
  ];
  if (path.includes('/account/notifications')) return [
    { title: 'Prayer request received', body: 'Your prayer team is standing with you.', href: '/account/notifications', meta: 'May 24', status: 'Unread', icon: '🔔', action: 'Mark read' },
  ];
  return sectionCards[section] ?? homeActions;
};
