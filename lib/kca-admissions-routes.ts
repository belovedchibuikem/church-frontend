import type { AdminScreen } from './admin-routes.ts';

const applicationRows = [
  { Applicant: 'Samuel David', Church: 'Lagos Mega Crusade', Batch: 'Batch 2024-06', Submitted: 'May 31, 2024', Status: 'Under Review' },
  { Applicant: 'Chinyere Nwosu', Church: 'Grace Church Abuja', Batch: 'Batch 2024-06', Submitted: 'May 30, 2024', Status: 'Under Review' },
  { Applicant: 'Daniel Ola', Church: 'Victory Fellowship', Batch: 'Batch 2024-06', Submitted: 'May 29, 2024', Status: 'Provisionally Accepted' },
  { Applicant: 'Esther Emmanuel', Church: 'Port Harcourt Outreach', Batch: 'Batch 2024-06', Submitted: 'May 28, 2024', Status: 'Under Review' },
  { Applicant: 'Joshua Mike', Church: 'The Covenant Place', Batch: 'Batch 2024-06', Submitted: 'May 27, 2024', Status: 'Deferred' },
  { Applicant: 'Peace Udo', Church: 'Bible City Church', Batch: 'Batch 2024-06', Submitted: 'May 25, 2024', Status: 'Under Review' },
  { Applicant: 'Michael James', Church: 'Faith Church Kano', Batch: 'Batch 2024-06', Submitted: 'May 25, 2024', Status: 'Not Accepted' },
  { Applicant: 'Gloria Bassey', Church: 'Dominion Chapel', Batch: 'Batch 2024-06', Submitted: 'May 24, 2024', Status: 'Under Review' },
];

const applicationSteps = [
  'Personal Information — Complete',
  'Church Information — Complete',
  'Walk With Christ — Complete',
  'Motivation / Interests — Complete',
  'Commitment — Complete',
  'Parent / Guardian Consent — Complete',
  'Leadership Recommendation — Complete',
  'Review — In progress',
];

export const kcaAdmissionsScreens: AdminScreen[] = [
  {
    id: 'G-01', batch: 'G', route: '/admin/kca', title: 'Kingdom Change Agents',
    subtitle: 'Admissions and enrollment overview.', kind: 'dashboard',
    permission: 'kca.dashboard.view', scope: 'assigned', nav: 'dashboard',
    metrics: [
      { label: 'Total Applications', value: '2,458', trend: '+8% vs Apr' },
      { label: 'Under Review', value: '856', trend: '+12% vs Apr' },
      { label: 'Provisionally Accepted', value: '324', trend: '+6% vs Apr' },
      { label: 'Students Enrolled', value: '185', trend: '+11% vs Apr' },
    ],
    tabs: ['Last 6 Months', 'By Status'],
    items: [
      'Under Review — 856 (34.8%)',
      'Provisionally Accepted — 324 (13.2%)',
      'Deferred — 216 (8.8%)',
      'Not Accepted — 171 (7.0%)',
      'Withdrawn — 98 (4.0%)',
      'Other — 793 (32.2%)',
    ],
    rows: applicationRows.slice(0, 5), action: 'View Review Queue',
  },
  {
    id: 'G-02', batch: 'G', route: '/admin/kca/applications', title: 'Applications',
    subtitle: 'Manage KCA admission applications.', kind: 'table',
    permission: 'kca.application.view', scope: 'assigned', nav: 'kca-applications', action: 'Export',
    tabs: ['All Status', 'All Batches', 'All Regions'],
    columns: ['Applicant', 'Church', 'Batch', 'Submitted', 'Status'], rows: applicationRows,
  },
  {
    id: 'G-03', batch: 'G', route: '/admin/kca/applications/samuel-david', title: 'Samuel David',
    subtitle: 'Application ID: KCA-2024-000124 · Under Review', kind: 'detail',
    permission: 'kca.application.view', scope: 'assigned', nav: 'kca-applications', action: 'Print',
    tabs: ['Overview', 'Application', 'Documents', 'Timeline', 'Notes'],
    details: {
      Batch: 'Batch 2024-06', Church: 'Lagos Mega Crusade', Location: 'Lagos, Nigeria', Age: '17',
      Gender: 'Male', Phone: '+234 806 123 4567', Email: 'samuel.david@email.com',
      'Current Status': 'Under Review', 'Status Since': 'May 31, 2024', 'Assigned To': 'Pastor Daniel David',
      Progress: '7 of 9 sections completed · 78%',
    },
    items: applicationSteps,
  },
  {
    id: 'G-04', batch: 'G', route: '/admin/kca/applications/samuel-david/personal-information',
    title: 'Personal Information', subtitle: 'Application step 1 of 9.', kind: 'form',
    permission: 'kca.application.update', scope: 'assigned', nav: 'kca-applications', action: 'Save & Continue',
    tabs: ['Personal Information', 'Church Information', 'Walk With Christ', 'Motivation / Interests', 'Commitment', 'Parent Consent', 'Leadership Recommendation', 'Review', 'Decision'],
    details: {
      'Full Name': 'Samuel David', 'Date of Birth': '2007-06-12', Age: '17', Gender: 'Male',
      Phone: '+234 806 123 4567', Email: 'samuel.david@email.com',
      Address: '12 Adeyemi James Avenue, Ikeja, Lagos', City: 'Lagos', State: 'Lagos',
    },
  },
  {
    id: 'G-05', batch: 'G', route: '/admin/kca/applications/samuel-david/church-information',
    title: 'Church Information', subtitle: 'Tell us about your church.', kind: 'form',
    permission: 'kca.application.update', scope: 'assigned', nav: 'kca-applications', action: 'Save & Continue',
    tabs: ['Personal Information', 'Church Information', 'Walk With Christ', 'Motivation / Interests', 'Commitment', 'Parent Consent', 'Leadership Recommendation', 'Review', 'Decision'],
    details: {
      Church: 'Lagos Mega Crusade', 'Pastor Name': 'Pastor Daniel',
      'How long have you been a member?': '2 years', 'Pastor / Leader': 'Pastor Samuel',
      'Ministry / Group': 'Youth', 'Year Joined': '2022',
      'Church Address': 'Church Centre, Victoria Island, Lagos',
    },
  },
  {
    id: 'G-06', batch: 'G', route: '/admin/kca/applications/samuel-david/walk-with-christ',
    title: 'Walk With Christ', subtitle: 'Help us understand your relationship with Jesus Christ.', kind: 'form',
    permission: 'kca.application.update', scope: 'assigned', nav: 'kca-applications', action: 'Save & Continue',
    details: {
      'When did you give your life to Christ?': '2020',
      'How did you come to know Jesus Christ?': 'Through a friend’s invitation',
      'Personal decision time': 'Yes', 'Bible reading frequency': 'Daily',
      'Greatest spiritual growth area': 'Understanding God’s word and applying it daily',
      'Current challenge': 'Consistency in prayer and resisting peer pressure',
    },
  },
  {
    id: 'G-07', batch: 'G', route: '/admin/kca/applications/samuel-david/motivation-interests',
    title: 'Motivation / Interests', subtitle: 'Why do you want to join KCA?', kind: 'form',
    permission: 'kca.application.update', scope: 'assigned', nav: 'kca-applications', action: 'Save & Continue',
    details: {
      Motivation: 'I want to grow in my leadership, deepen my faith and impact my generation.',
      Interests: 'Leadership, Evangelism, Teaching',
      'Other interest': 'Community Development',
      Hope: 'Knowledge, practical skills, and mentors to help me fulfil God’s purpose.',
    },
  },
  {
    id: 'G-08', batch: 'G', route: '/admin/kca/applications/samuel-david/commitment',
    title: 'Commitment', subtitle: 'KCA requires commitment and discipline.', kind: 'form',
    permission: 'kca.application.update', scope: 'assigned', nav: 'kca-applications', action: 'Save & Continue',
    details: {
      'Commit to full KCA program': 'Yes', 'Attend all mandatory sessions': 'Yes',
      'Manage time for KCA': 'I will prioritise my time, reduce distractions and plan my weeks.',
      'Agree to KCA code of conduct': 'Yes, I agree', 'Name to confirm': 'Samuel David',
    },
  },
  {
    id: 'G-09', batch: 'G', route: '/admin/kca/applications/samuel-david/parent-consent',
    title: 'Parent / Guardian Consent', subtitle: 'Consent from a parent or guardian is required.', kind: 'form',
    permission: 'kca.application.update', scope: 'assigned', nav: 'kca-applications', action: 'Save & Continue',
    details: {
      'Parent / Guardian Name': 'Mr. James David', Phone: '+234 806 123 4567',
      Email: 'james.david@email.com', Relationship: 'Father',
      Consent: 'I give consent for my child, Samuel David, to apply and participate in the KCA program.',
      Signature: 'James David', Date: 'May 31, 2024',
    },
  },
  {
    id: 'G-10', batch: 'G', route: '/admin/kca/applications/samuel-david/leadership-recommendation',
    title: 'Leadership Recommendation', subtitle: 'Recommendation from your pastor or leader.', kind: 'form',
    permission: 'kca.application.update', scope: 'assigned', nav: 'kca-applications', action: 'Save & Continue',
    details: {
      "Recommender's Name": 'Pastor Daniel David', Position: 'Senior Pastor', Church: 'Lagos Mega Crusade',
      'How long have you known the applicant?': '2 years',
      Recommendation: 'Samuel is faithful, teachable and has shown great potential in leadership.',
      'Recommend this applicant for KCA?': 'Yes', Signature: 'Daniel David', Date: 'May 31, 2024',
    },
  },
  {
    id: 'G-11', batch: 'G', route: '/admin/kca/review-queue', title: 'Review Queue',
    subtitle: 'Review and process applications.', kind: 'table',
    permission: 'kca.application.review', scope: 'assigned', nav: 'kca-review',
    metrics: [
      { label: 'Upcoming Sessions', value: '3' }, { label: 'Total Students', value: '185' },
      { label: 'Attended', value: '162' }, { label: 'Completion Rate', value: '87%' },
    ],
    columns: ['Session', 'Date', 'Time', 'Venue', 'Students'],
    rows: [
      { Session: 'Batch 2024-06 Orientation', Date: 'Jun 6, 2024', Time: '9:00 AM', Venue: 'The Covenant Place', Students: '72' },
      { Session: 'Batch 2024-06 Orientation', Date: 'Jun 8, 2024', Time: '4:00 PM', Venue: 'Online (Zoom)', Students: '58' },
      { Session: 'Batch 2024-06 Make-up', Date: 'Jun 11, 2024', Time: '10:00 AM', Venue: 'The Covenant Place', Students: '55' },
    ],
  },
  {
    id: 'G-12', batch: 'G', route: '/admin/kca/applications/samuel-david/decision',
    title: 'Admission Decision', subtitle: 'Review and decide this application.', kind: 'approval',
    permission: 'kca.application.decide', scope: 'assigned', nav: 'kca-decisions', action: 'Make Decision',
    details: {
      Applicant: 'Samuel David', 'Application ID': 'KCA-2024-000124', Batch: 'Batch 2024-06',
      Decision: 'Provisionally Accept', 'Admission decision': 'Select an admission decision for this applicant.',
      Notes: 'Write your review notes here...',
    },
    items: [...applicationSteps, 'Decision options — Provisionally Accept · Defer · Not Accept'],
  },
  {
    id: 'G-13', batch: 'G', route: '/admin/kca/applications/samuel-david/provisionally-accepted',
    title: 'Provisionally Accepted', subtitle: 'This applicant has been provisionally accepted into KCA.', kind: 'activation',
    permission: 'kca.application.view', scope: 'assigned', nav: 'kca-decisions', action: 'Download Admission Letter',
    details: {
      Applicant: 'Samuel David', 'Application ID': 'KCA-2024-000124', Batch: 'Batch 2024-06',
      'Decision Date': 'May 31, 2024', 'Next Step': 'Issue Admission Letter',
    },
    items: ['Download Admission Letter', 'View Another Record'],
  },
  {
    id: 'G-14', batch: 'G', route: '/admin/kca/applications/samuel-david/deferred',
    title: 'Deferred', subtitle: 'This application has been deferred.', kind: 'activation',
    permission: 'kca.application.view', scope: 'assigned', nav: 'kca-decisions', action: 'Notify Applicant',
    details: {
      Applicant: 'Samuel David', 'Application ID': 'KCA-2024-000124', Batch: 'Batch 2024-06',
      'Decision Date': 'May 31, 2024',
      Reason: 'More information required', 'Review Again On': 'Jun 15, 2024',
    },
    items: ['Notify Applicant', 'View Application'],
  },
  {
    id: 'G-15', batch: 'G', route: '/admin/kca/applications/samuel-david/not-accepted',
    title: 'Not Accepted', subtitle: 'This application was not accepted.', kind: 'activation',
    permission: 'kca.application.view', scope: 'assigned', nav: 'kca-decisions', action: 'Notify Applicant',
    details: {
      Applicant: 'Samuel David', 'Application ID': 'KCA-2024-000124', Batch: 'Batch 2024-06',
      'Decision Date': 'May 31, 2024',
      Reason: 'Does not meet the requirements',
    },
    items: ['Notify Applicant', 'View Applicant Record'],
  },
  {
    id: 'G-16', batch: 'G', route: '/admin/kca/applications/samuel-david/admission-letter',
    title: 'Admission Letter', subtitle: 'Kingdom Change Agents provisional admission.', kind: 'detail',
    permission: 'kca.application.view', scope: 'assigned', nav: 'kca-decisions', action: 'Download PDF',
    details: {
      Date: 'May 31, 2024', To: 'Samuel David', From: 'Pastor Daniel David · KCA Admissions Team',
      Subject: 'Provisional Admission into Kingdom Change Agents — Batch 2024-06',
      'Next Steps': 'Attend the orientation program · Complete registration · Prepare for the program',
      'Certificate ID': 'KCA-CERT-0000-0001', Status: 'Issued',
    },
  },
  {
    id: 'G-17', batch: 'G', route: '/admin/kca/orientation', title: 'Orientation',
    subtitle: 'Manage orientation sessions and attendance.', kind: 'operations',
    permission: 'kca.orientation.manage', scope: 'assigned', nav: 'kca-students', action: '+ New Orientation',
    columns: ['Name', 'Date', 'Time', 'Venue', 'Students', 'Status'],
  },
  {
    id: 'G-17b', batch: 'G', route: '/admin/kca/orientation/create', title: 'New Orientation Session',
    subtitle: 'Schedule an orientation session for a KCA cohort.', kind: 'form',
    permission: 'kca.orientation.manage', scope: 'assigned', nav: 'kca-students', action: 'Create Session',
  },
  {
    id: 'G-17c', batch: 'G', route: '/admin/kca/orientation/sample-session', title: 'Orientation Session',
    subtitle: 'Review session details and attendance.', kind: 'detail',
    permission: 'kca.orientation.manage', scope: 'assigned', nav: 'kca-students',
    details: { Status: 'Loading' },
  },
  {
    id: 'G-18', batch: 'G', route: '/admin/kca/applications/samuel-david/record-created',
    title: 'Student Record Created', subtitle: 'Student record has been successfully created.', kind: 'activation',
    permission: 'kca.student.create', scope: 'assigned', nav: 'kca-students', action: 'View Student Profile',
    details: {
      'Student ID': 'KCA20241014', Name: 'Samuel David', Batch: 'Batch 2024-06',
      Status: 'Active Student', 'Date Created': 'May 31, 2024',
    },
    items: ['View Student Profile', 'Access Student Record'],
  },
];
