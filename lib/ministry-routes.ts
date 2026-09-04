import type { AdminScreen, Row } from './admin-routes';

const homeChurches: Row[] = [
  { 'Home Church': 'Grace Home Church', Leader: 'Abuja Damilare', Location: 'Palm, Samuel Adeyemi', Members: '25', Status: 'Active' },
  { 'Home Church': 'Light House HC', Leader: 'Lagos Daniel', Location: 'St. Mary District', Members: '18', Status: 'Active' },
  { 'Home Church': 'Victory Home Fellowship', Leader: 'Blessing Daniel', Location: 'St. James Adeyemi', Members: '23', Status: 'Active' },
  { 'Home Church': 'Kingdom Builders HC', Leader: 'David Daniel', Location: 'Port Harcourt', Members: '30', Status: 'Active' },
  { 'Home Church': 'New Covenant HC', Leader: 'Emeka Ibrahim', Location: 'Mr. Faith Luka', Members: '17', Status: 'Active' },
  { 'Home Church': 'City Light HC', Leader: 'John Daniel', Location: 'Mr. Damilola Akin', Members: '20', Status: 'Closed' },
];

const churches: Row[] = [
  { 'Church Name': 'The Covenant Place, Lagos', Location: 'Lagos, Nigeria', Region: 'West', Members: '1,248', Status: 'Active' },
  { 'Church Name': 'Grace Family Church, Abuja', Location: 'Abuja, Nigeria', Region: 'North Central', Members: '856', Status: 'Active' },
  { 'Church Name': 'Victory House, Port Harcourt', Location: 'PH, Nigeria', Region: 'South South', Members: '642', Status: 'Active' },
  { 'Church Name': 'King’s Palace, Kano', Location: 'Kano, Nigeria', Region: 'North West', Members: '534', Status: 'Active' },
  { 'Church Name': 'Praise Centre, Ibadan', Location: 'Ibadan, Nigeria', Region: 'South West', Members: '421', Status: 'Active' },
  { 'Church Name': 'Living Faith, Enugu', Location: 'Enugu, Nigeria', Region: 'South East', Members: '389', Status: 'Active' },
];

const members: Row[] = [
  { Name: 'John Chinedu Doe', ID: 'TCP000048', Department: 'Youth', 'Joined Date': 'May 10, 2024', Status: 'Active' },
  { Name: 'Grace Eze', ID: 'TCP000047', Department: 'Women', 'Joined Date': 'May 10, 2024', Status: 'Active' },
  { Name: 'David Okoro', ID: 'TCP000046', Department: 'Men', 'Joined Date': 'May 8, 2024', Status: 'Active' },
  { Name: 'Blessing Udo', ID: 'TCP000045', Department: 'Choir', 'Joined Date': 'May 5, 2024', Status: 'Active' },
  { Name: 'Michael Williams', ID: 'TCP000044', Department: 'Ushering', 'Joined Date': 'May 3, 2024', Status: 'Active' },
];

const leaders: Row[] = [
  { Name: 'Pastor Samuel Adeyemi', Position: 'Lead Pastor', Department: 'Pastoral', Phone: '+234 803 254 1678', Status: 'Active' },
  { Name: 'Pastor Grace A.', Position: 'Associate Pastor', Department: 'Pastoral', Phone: '+234 802 544 1739', Status: 'Active' },
  { Name: 'Pastor Michael Okafor', Position: 'Youth Pastor', Department: 'Youth', Phone: '+234 801 456 7800', Status: 'Active' },
  { Name: 'Pastor Linda Eze', Position: 'Children Pastor', Department: 'Children', Phone: '+234 806 417 0990', Status: 'Active' },
  { Name: 'Elder David Williams', Position: 'Elder', Department: 'Eldership', Phone: '+234 806 878 1002', Status: 'Active' },
];

const firstTimers: Row[] = [
  { Name: 'Daniel Dandeli', Phone: '+234 810 123 4487', Church: 'The Covenant Place', 'Visit Date': 'May 30, 2024', Status: 'New' },
  { Name: 'Grace Monday', Phone: '+234 806 666 4099', Church: 'Grace Church', 'Visit Date': 'May 24, 2024', Status: 'New' },
  { Name: 'Tunde Adeboyo', Phone: '+234 803 770 4417', Church: 'Victory House', 'Visit Date': 'May 24, 2024', Status: 'Contacted' },
  { Name: 'Joy Naro', Phone: '+234 818 202 3344', Church: 'Faith Church', 'Visit Date': 'May 24, 2024', Status: 'Pending' },
  { Name: 'Peter Okafor', Phone: '+234 809 771 2534', Church: 'Light House', 'Visit Date': 'May 24, 2024', Status: 'New' },
];

const converts: Row[] = [
  { Name: 'Samuel Oji', 'Convert Date': 'May 25, 2024', Type: 'Baptism', Minister: 'Pastor Samuel', Status: 'Active' },
  { Name: 'Joy Isaiah', 'Convert Date': 'May 18, 2024', Type: 'Baptism', Minister: 'Pastor Grace', Status: 'Active' },
  { Name: 'David Barney', 'Convert Date': 'May 12, 2024', Type: 'Dedication', Minister: 'Pastor Linda', Status: 'Active' },
  { Name: 'Esther Jumbo', 'Convert Date': 'May 4, 2024', Type: 'Baptism', Minister: 'Pastor Samuel', Status: 'Active' },
];

const disciples: Row[] = [
  { Name: 'Chuka Onwu', Group: 'Men Discipleship', Mentor: 'Elder David', Stage: 'Stage 2', Status: 'Active' },
  { Name: 'Mary Oshale', Group: 'Women Discipleship', Mentor: 'Sister Mercy', Stage: 'Stage 3', Status: 'Active' },
  { Name: 'Tobi Adewale', Group: 'Youth Discipleship', Mentor: 'Pastor Michael', Stage: 'Stage 1', Status: 'Active' },
  { Name: 'Grace Chin', Group: 'New Converts', Mentor: 'Pastor Grace', Stage: 'Stage 2', Status: 'Active' },
  { Name: 'Jonathan Daniel', Group: 'Men Discipleship', Mentor: 'Elder John', Stage: 'Stage 3', Status: 'Graduated' },
];

const workers: Row[] = [
  { Name: 'Bola Adekunle', Department: 'Choir', Role: 'Singer', Joined: 'Jan 8, 2023', Status: 'Active' },
  { Name: 'Victoria James', Department: 'Choir', Role: 'Choir Member', Joined: 'Mar 5, 2023', Status: 'Active' },
  { Name: 'James Stevens', Department: 'Media', Role: 'Media Team', Joined: 'Feb 20, 2023', Status: 'Active' },
  { Name: 'Mercy Johnson', Department: 'Intercessors', Role: 'Prayer Warrior', Joined: 'Apr 10, 2023', Status: 'Active' },
  { Name: 'Tunde Damilola', Department: 'Security', Role: 'Security Team', Joined: 'Jan 25, 2023', Status: 'On Leave' },
];

const departments: Row[] = [
  { 'Group Name': 'Victory House Cell', Leader: 'Grace Eze', Members: '12', 'Meeting Day': 'Fridays', Status: 'Active' },
  { 'Group Name': 'Faith Builders', Leader: 'David Okoro', Members: '10', 'Meeting Day': 'Sundays', Status: 'Active' },
  { 'Group Name': 'King’s Kids', Leader: 'Linda Eze', Members: '8', 'Meeting Day': 'Saturdays', Status: 'Active' },
  { 'Group Name': 'Living Streams', Leader: 'Michael Okafor', Members: '14', 'Meeting Day': 'Thursdays', Status: 'Active' },
  { 'Group Name': 'Prayer Warriors', Leader: 'Mercy Adeyemi', Members: '9', 'Meeting Day': 'Wednesdays', Status: 'Active' },
];

const activities: Row[] = [
  { Activity: 'Street Outreach', Date: 'May 25, 2024', Location: 'Lekki Phase 1', 'Souls Reached': '156', Decisions: '28' },
  { Activity: 'Campus Outreach', Date: 'May 18, 2024', Location: 'Unilag', 'Souls Reached': '98', Decisions: '14' },
  { Activity: 'Door to Door', Date: 'May 11, 2024', Location: 'Ajah', 'Souls Reached': '78', Decisions: '12' },
  { Activity: 'Market Outreach', Date: 'May 5, 2024', Location: 'Lekki Market', 'Souls Reached': '80', Decisions: '14' },
];

const needs: Row[] = [
  { Request: 'School fees support', 'Requested By': 'Esther James', Date: 'May 31, 2024', Status: 'Pending' },
  { Request: 'Food supplies', 'Requested By': 'Chika Obi', Date: 'May 30, 2024', Status: 'Approved' },
  { Request: 'Medical support', 'Requested By': 'Mary Okafor', Date: 'May 27, 2024', Status: 'Pending' },
  { Request: 'Rent support', 'Requested By': 'Daniel Dandeli', Date: 'May 20, 2024', Status: 'Approved' },
  { Request: 'Business startup', 'Requested By': 'Tunde Adeboyo', Date: 'May 18, 2024', Status: 'Pending' },
];

const prayerRequests: Row[] = [
  { Request: 'Healing for my mother', 'Requested By': 'Mary Okafor', Date: 'May 30, 2024', Status: 'In Prayer' },
  { Request: 'Financial breakthrough', 'Requested By': 'Daniel Dandeli', Date: 'May 29, 2024', Status: 'Pending' },
  { Request: 'Wisdom and direction', 'Requested By': 'Grace Monday', Date: 'May 29, 2024', Status: 'In Prayer' },
  { Request: 'Safe delivery', 'Requested By': 'Joy Naro', Date: 'May 28, 2024', Status: 'Answered' },
  { Request: 'Job opportunity', 'Requested By': 'Tunde Adeboyo', Date: 'May 28, 2024', Status: 'In Prayer' },
];

const counselling: Row[] = [
  { Client: 'Amaka & Steve', Counselor: 'Pastor Linda', 'Last Updated': 'May 31, 2024', Status: 'In Progress' },
  { Client: 'Family Conflict', Counselor: 'Sister Mary', 'Last Updated': 'May 30, 2024', Status: 'Open' },
  { Client: 'Relationship Issue', Counselor: 'Mrs. John', 'Last Updated': 'May 29, 2024', Status: 'In Progress' },
  { Client: 'Grace & Liam', Counselor: 'Pastor Tunde', 'Last Updated': 'May 29, 2024', Status: 'Open' },
  { Client: 'Anger Management', Counselor: 'Sister Mary', 'Last Updated': 'In Progress', Status: 'In Progress' },
];

export const ministryScreens: AdminScreen[] = [
  { id: 'D-01', batch: 'D', route: '/admin/home-churches/dashboard', title: 'Home Church Dashboard', subtitle: 'The Covenant Place, Lagos', kind: 'ministry-dashboard', permission: 'home_church.dashboard.view', scope: 'assigned', nav: 'dashboard', metrics: [{ label: 'Total Home Churches', value: '128', trend: '+8%' }, { label: 'Total Members', value: '3,456', trend: '+12%' }, { label: 'New Applications', value: '24', trend: '+16%' }, { label: 'Active This Week', value: '86', trend: '+10%' }], items: ['Grace Home Church', 'Light House HC', 'Victory Home Fellowship'] },
  { id: 'D-02', batch: 'D', route: '/admin/home-churches/applications', title: 'Home Church Applications', subtitle: 'Manage and review home church applications.', kind: 'table', permission: 'home_church.application.view', scope: 'assigned', nav: 'applications' },
  { id: 'D-03', batch: 'D', route: '/admin/home-churches/applications/grace-home-church', title: 'Grace Home Church', subtitle: 'Submitted on May 30, 2024 at 10:04 AM', kind: 'detail', permission: 'home_church.application.view', scope: 'assigned', nav: 'applications', action: 'Review Application', tabs: ['Overview', 'Leaders', 'Members', 'Documents', 'History'], details: { Location: 'Abuja, Nigeria', District: 'Abuja District', Applicant: 'Pastor Samuel Adeyemi', Phone: '+234 806 123 4567', Email: 'samuel.adeyemi@email.com', 'Member ID': '25', 'Meeting Day': 'Sundays', 'Meeting Time': '5:00 PM', Venue: 'Applicant’s Residence' }, items: ['Application Form — PDF', 'Leaders List — PDF', 'Meeting Address Proof — JPG', 'Group Photo — JPG'] },
  { id: 'D-04', batch: 'D', route: '/admin/home-churches/applications/grace-home-church/review', title: 'Review Application', subtitle: 'Step 1 of 4', kind: 'workflow', permission: 'home_church.application.review', scope: 'assigned', nav: 'applications', action: 'Save & Next', tabs: ['Review Details', 'Interview/Orientation', 'Approval Decision', 'Activation'], items: ['Application Form — Submitted', 'Leaders Information — Complete', 'Meeting Location — Complete', 'Group Members (Min. 10) — Complete', 'Documents Uploaded — Complete', 'Doctrine Alignment — Pending', 'Home Church Training — Pending'] },
  { id: 'D-05', batch: 'D', route: '/admin/home-churches/applications/grace-home-church/decision', title: 'Interview / Orientation', subtitle: 'Step 3 of 4', kind: 'workflow', permission: 'home_church.application.decide', scope: 'assigned', nav: 'applications', action: 'Submit Decision', tabs: ['Review Details', 'Interview/Orientation', 'Approval Decision', 'Activation'], details: { Decision: 'Reject', Reason: 'Incomplete requirements', Comments: 'Please complete the leader training and submit updated leader list.', 'Notify Applicant': 'Yes' } },
  { id: 'D-06', batch: 'D', route: '/admin/home-churches/applications/grace-home-church/activation', title: 'Activate Home Church ID', subtitle: 'Step 4 of 4', kind: 'activation', permission: 'home_church.application.activate', scope: 'assigned', nav: 'applications', action: 'Activate ID & Send Credentials', details: { 'Home Church ID': 'HC-0004-0087', 'Activation Date': 'June 2, 2024', 'Access Status': 'Not Activated' } },
  { id: 'D-07', batch: 'D', route: '/admin/home-churches', title: 'Home Churches', subtitle: 'Manage all active home churches.', kind: 'table', permission: 'home_church.view', scope: 'assigned', nav: 'home-churches', action: '+ Add Home Church', columns: ['Home Church', 'Leader', 'Location', 'Members', 'Status'], rows: homeChurches },
  { id: 'D-08', batch: 'D', route: '/admin/home-churches/grace-home-church', title: 'Grace Home Church', subtitle: 'Home Church ID: HC-0004-0087', kind: 'detail', permission: 'home_church.view', scope: 'assigned', nav: 'home-churches', tabs: ['Overview', 'Leaders', 'Members', 'Attendance', 'Activities', 'Finance', 'Reports'], details: { District: 'Abuja District', Leader: 'Pastor Samuel Adeyemi', Phone: '+234 806 123 4567', Email: 'samuel.adeyemi@email.com', Location: 'Jabi, Abuja, Nigeria', 'Meeting Day': 'Sundays', 'Meeting Time': '5:00 PM', Members: '25', 'Date Established': 'Jun 2, 2024', Status: 'Active' }, items: ['Total Members — 98', 'Leaders — 6', 'Small Groups — 3'] },
  { id: 'D-09', batch: 'D', route: '/admin/home-churches/grace-home-church/members', title: 'Members', subtitle: 'Manage home church members.', kind: 'table', permission: 'home_church.member.view', scope: 'assigned', nav: 'members', action: '+ Add Member', metrics: [{ label: 'Total Members', value: '25' }, { label: 'Male', value: '12' }, { label: 'Female', value: '13' }, { label: 'New This Month', value: '4' }], columns: ['Name', 'Phone', 'Joined On', 'Group', 'Status'], rows: members.map((row, index) => ({ Name: row.Name, Phone: ['+234 801 202 3333', '+234 800 333 4444', '+234 803 444 8888', '+234 804 555 6666', '+234 805 666 7777'][index], 'Joined On': row['Joined Date'], Group: ['Faith Group', 'Faith Group', 'Hope Group', 'Hope Group', 'Love Group'][index], Status: row.Status })) },
  { id: 'D-10', batch: 'D', route: '/admin/home-churches/grace-home-church/attendance', title: 'Attendance', subtitle: 'Track attendance records.', kind: 'operations', permission: 'home_church.attendance.view', scope: 'assigned', nav: 'attendance', metrics: [{ label: 'Average Attendance', value: '22' }, { label: 'Total Services', value: '4' }, { label: 'Highest Attendance', value: '28' }, { label: 'Lowest Attendance', value: '18' }], items: ['Sunday Service — 76%', 'Prayer Meeting — 72%', 'Study Manuals — 64%', 'Other — 8%'] },
  { id: 'D-11', batch: 'D', route: '/admin/home-churches/grace-home-church/activities', title: 'Activities', subtitle: 'Manage home church activities.', kind: 'operations', permission: 'home_church.activity.view', scope: 'assigned', nav: 'activities', action: '+ Add Activity', items: ['Outreach in Jabi Market — Outreach — 12', 'Prayer & Fasting — Spiritual — 16', 'Study Manuals: Book of John — Teaching — 22', 'Home Fellowship — Fellowship — 25', 'Evangelism Training — Training — 10'] },
  { id: 'D-12', batch: 'D', route: '/admin/home-churches/grace-home-church/needs', title: 'Needs', subtitle: 'Record needs and support requests.', kind: 'table', permission: 'home_church.need.view', scope: 'assigned', nav: 'needs', action: '+ Add Need', tabs: ['Active Needs (5)', 'Completed (4)'], columns: ['Need', 'Owner', 'Due Date', 'Status'], rows: [{ Need: 'Bibles (20 copies)', Owner: 'Pastor Samuel', 'Due Date': 'May 30, 2024', Status: 'Review' }, { Need: 'Materials', Owner: 'Pastor Samuel', 'Due Date': 'May 30, 2024', Status: 'Submitted' }, { Need: 'Whiteboard', Owner: 'Sister Mary', 'Due Date': 'May 30, 2024', Status: 'In Progress' }, { Need: 'Repair', Owner: 'Bro John', 'Due Date': 'May 30, 2024', Status: 'In Progress' }, { Need: 'Equipment', Owner: 'Bro John', 'Due Date': 'May 30, 2024', Status: 'In Progress' }] },
  { id: 'D-13', batch: 'D', route: '/admin/home-churches/grace-home-church/finance', title: 'Monthly Reports', subtitle: 'View and manage monthly reports.', kind: 'finance', permission: 'home_church.finance.view', scope: 'assigned', nav: 'finance', action: 'Export', metrics: [{ label: 'Total Income', value: '₦450,000', trend: '+12%' }, { label: 'Total Expenses', value: '₦320,000', trend: '-4%' }, { label: 'Balance', value: '₦130,000', trend: '+20%' }], items: ['Tithes — 60%', 'Offerings — 20%', 'Seed — 10%', 'Other — 8%'] },
  { id: 'D-14', batch: 'D', route: '/admin/home-churches/grace-home-church/status', title: 'Suspend / Close Home Church', subtitle: 'Manage status of home church.', kind: 'settings', permission: 'home_church.status.update', scope: 'assigned', nav: 'home-churches', action: 'Confirm Action', tabs: ['Suspend', 'Close'], details: { 'Home Church': 'Grace Home Church', Action: 'Suspend', Reason: 'Select reason', 'Effective Date': 'May 31, 2024', Notes: 'Enter additional notes...' } },
  { id: 'D-15', batch: 'D', route: '/admin/home-churches/leaders', title: 'Leaders', subtitle: 'Primary leaders across home churches.', kind: 'table', permission: 'home_church.view', scope: 'assigned', nav: 'leaders', columns: ['Home Church', 'Leader', 'Status', 'Members'] },
  { id: 'D-16', batch: 'D', route: '/admin/home-churches/applications/new', title: 'New Home Church Application', subtitle: 'Create an authorised application in draft, then submit through the review workspace.', kind: 'form', permission: 'home_church.application.review', scope: 'assigned', nav: 'applications', action: 'Save Draft' },
  { id: 'D-17', batch: 'D', route: '/admin/home-churches/members', title: 'Members', subtitle: 'Home church memberships in the current scope.', kind: 'table', permission: 'home_church.member.view', scope: 'assigned', nav: 'members', columns: ['Name', 'Home Church', 'Status'] },
  { id: 'D-18', batch: 'D', route: '/admin/home-churches/attendance', title: 'Attendance', subtitle: 'Home church attendance sessions in the current scope.', kind: 'operations', permission: 'home_church.attendance.view', scope: 'assigned', nav: 'attendance' },
  { id: 'D-19', batch: 'D', route: '/admin/home-churches/activities', title: 'Activities', subtitle: 'Outreach, study and fellowship tagged to home churches.', kind: 'operations', permission: 'home_church.activity.view', scope: 'assigned', nav: 'activities' },
  { id: 'D-20', batch: 'D', route: '/admin/home-churches/needs', title: 'Needs', subtitle: 'Church and home church needs in the current scope.', kind: 'table', permission: 'home_church.need.view', scope: 'assigned', nav: 'needs', columns: ['Title', 'Scope', 'Category', 'Contact', 'Status'] },

  { id: 'E-01', batch: 'E', route: '/admin/church/dashboard', title: 'Church Dashboard', subtitle: 'The Covenant Place, Lagos', kind: 'ministry-dashboard', permission: 'church.dashboard.view', scope: 'assigned', nav: 'dashboard', metrics: [{ label: 'Total Members', value: '1,248', trend: '+8%' }, { label: 'First Timers', value: '156', trend: '+18%' }, { label: 'Converts', value: '98', trend: '+17%' }, { label: 'Attendance (Avg)', value: '726', trend: '+8%' }], items: ['Add Member', 'Record Attendance', 'Add First Timer', 'Create Report'] },
  { id: 'E-02', batch: 'E', route: '/admin/churches', title: 'Churches', subtitle: 'Manage all churches in your organization.', kind: 'table', permission: 'church.view', scope: 'assigned', nav: 'churches', action: '+ Add Church', columns: ['Church Name', 'Location', 'Region', 'Members', 'Status'], rows: churches },
  { id: 'E-03', batch: 'E', route: '/admin/churches/the-covenant-place', title: 'The Covenant Place, Lagos', subtitle: 'Church profile and performance.', kind: 'detail', permission: 'church.view', scope: 'assigned', nav: 'churches', tabs: ['Overview', 'Profile', 'Leadership', 'Members', 'Departments', 'Finance', 'More'], details: { Address: '125 Kingdom Way, Lekki Phase 1, Lagos, Nigeria', Phone: '+234 801 234 5678', Email: 'info@covenantplace.org', 'Lead Pastor': 'Pastor Samuel Adeyemi', Established: 'Jan 12, 2010', Type: 'Parish' }, items: ['Total Members — 1,268', 'Attendance (Avg) — 726', 'Departments — 12', 'Small Groups — 24'] },
  { id: 'E-04', batch: 'E', route: '/admin/churches/the-covenant-place/edit', title: 'Create Church', subtitle: 'Step 1 of 4 · Basic Information.', kind: 'wizard', permission: 'church.update', scope: 'assigned', nav: 'churches', action: 'Next: Contact & Location', tabs: ['Basic Info', 'Contact & Location', 'Leadership', 'Review'] },
  { id: 'E-05', batch: 'E', route: '/admin/churches/the-covenant-place/leadership', title: 'Church Leadership', subtitle: 'Manage church leaders and ministry heads.', kind: 'table', permission: 'church.leader.view', scope: 'assigned', nav: 'leaders', action: '+ Add Leader', tabs: ['Pastoral Team', 'Ministry Heads', 'Elders', 'Deacons'], columns: ['Name', 'Position', 'Department', 'Phone', 'Status'], rows: leaders },
  { id: 'E-06', batch: 'E', route: '/admin/churches/the-covenant-place/members', title: 'Members', subtitle: 'Manage all church members.', kind: 'table', permission: 'church.member.view', scope: 'assigned', nav: 'members', action: '+ Add Member', metrics: [{ label: 'Total', value: '1,248', trend: '+17%' }, { label: 'Active', value: '1,102', trend: '+8%' }, { label: 'Inactive', value: '96', trend: '+7%' }, { label: 'Visitors', value: '50', trend: '+4%' }], columns: ['Name', 'Member ID', 'Department', 'Joined Date', 'Status'], rows: members },
  { id: 'E-07', batch: 'E', route: '/admin/churches/the-covenant-place/first-timers', title: 'First Timers', subtitle: 'People who are visiting for the first time.', kind: 'table', permission: 'people.first_timer.view', scope: 'assigned', nav: 'first-timers', metrics: [{ label: 'This Month', value: '156', trend: '+18%' }, { label: 'This Week', value: '28' }, { label: 'Today', value: '5' }, { label: 'Followed Up', value: '67%' }], columns: ['Name', 'Phone', 'Email', 'First Visit', 'Follow Up', 'Status'], rows: firstTimers.map((row, index) => ({ Name: row.Name, Phone: row.Phone, Email: `${row.Name.toLowerCase().replaceAll(' ', '.')}@email.com`, 'First Visit': row['Visit Date'], 'Follow Up': index % 2 ? 'Yes' : 'No', Status: row.Status })) },
  { id: 'E-08', batch: 'E', route: '/admin/churches/the-covenant-place/converts', title: 'Converts', subtitle: 'New believers and baptism records.', kind: 'table', permission: 'people.convert.view', scope: 'assigned', nav: 'converts', action: '+ Add Convert', metrics: [{ label: 'This Year', value: '98', trend: '+15%' }, { label: 'Baptized', value: '76' }, { label: 'Dedications', value: '22' }], columns: ['Name', 'Convert Date', 'Type', 'Minister', 'Status'], rows: converts },
  { id: 'E-09', batch: 'E', route: '/admin/churches/the-covenant-place/disciples', title: 'Disciples', subtitle: 'Members in discipleship and follow-up.', kind: 'table', permission: 'people.disciple.view', scope: 'assigned', nav: 'discipleship', metrics: [{ label: 'Total Disciples', value: '186' }, { label: 'Active', value: '152', trend: '82%' }, { label: 'Graduated', value: '24', trend: '13%' }, { label: 'Paused', value: '10', trend: '5%' }], columns: ['Name', 'Discipleship Group', 'Mentor', 'Stage', 'Status'], rows: disciples },
  { id: 'E-10', batch: 'E', route: '/admin/churches/the-covenant-place/workers', title: 'Workers', subtitle: 'Active workers and volunteers.', kind: 'table', permission: 'church.worker.view', scope: 'assigned', nav: 'workers', action: '+ Add Worker', metrics: [{ label: 'Total Workers', value: '234', trend: '+12%' }, { label: 'Active', value: '210', trend: '90%' }, { label: 'On Leave', value: '14' }, { label: 'Inactive', value: '10' }], columns: ['Name', 'Department', 'Role', 'Joined', 'Status'], rows: workers },
  { id: 'E-11', batch: 'E', route: '/admin/churches/the-covenant-place/departments', title: 'Departments', subtitle: 'Church departments and ministry units.', kind: 'table', permission: 'church.department.view', scope: 'assigned', nav: 'departments', action: '+ Add Department', metrics: [{ label: 'Total Groups', value: '24' }, { label: 'Children Ministry', value: '21' }, { label: 'Women Ministry', value: '34' }, { label: 'Members', value: '166' }], columns: ['Group Name', 'Leader', 'Members', 'Meeting Day', 'Status'], rows: departments },
  { id: 'E-12', batch: 'E', route: '/admin/churches/the-covenant-place/small-groups', title: 'Small Groups', subtitle: 'Home cells and small fellowship analytics.', kind: 'operations', permission: 'church.small_group.view', scope: 'assigned', nav: 'small-groups', action: '+ Add Small Group', metrics: [{ label: 'Average Attendance', value: '726', trend: '+8%' }, { label: 'Total Services', value: '18' }, { label: 'Highest Attendance', value: '1,024' }, { label: 'New Visitors', value: '156' }], items: ['Sunday 1st Service — 1,024', 'Sunday 2nd Service — 856', 'Midweek Service — 412'] },
  { id: 'E-13', batch: 'E', route: '/admin/churches/the-covenant-place/evangelism', title: 'Evangelism', subtitle: 'Outreach and evangelism activities.', kind: 'table', permission: 'church.evangelism.view', scope: 'assigned', nav: 'evangelism', action: '+ Add Activity', metrics: [{ label: 'Souls Reached', value: '412' }, { label: 'Decisions', value: '68' }, { label: 'Follow Ups', value: '124' }, { label: 'Teams', value: '16' }], columns: ['Activity', 'Date', 'Location', 'Souls Reached', 'Decisions'], rows: activities },
  { id: 'E-14', batch: 'E', route: '/admin/churches/the-covenant-place/reports', title: 'Reports', subtitle: 'Generate and download reports.', kind: 'reports', permission: 'church.report.view', scope: 'assigned', nav: 'reports', action: 'Create Custom Report', items: ['Church Membership Report', 'Attendance Report', 'First Timers Report', 'Converts Report', 'Workers Report', 'Tithe Report', 'Offering Report', 'Departments Report', 'Small Groups Report'] },
  { id: 'E-15', batch: 'E', route: '/admin/churches/the-covenant-place/finance', title: 'Church Finance', subtitle: 'Financial departments and financials.', kind: 'finance', permission: 'church.finance.view', scope: 'assigned', nav: 'finance', metrics: [{ label: 'Total Income', value: '₦6,450,320', trend: '+12%' }, { label: 'Total Expenses', value: '₦3,210,450', trend: '-5%' }, { label: 'Balance', value: '₦5,239,870' }, { label: 'Budget', value: '₦9,000,000', trend: '54%' }], items: ['Tithes — 52%', 'Offerings — 20%', 'Seed — 20%', 'Other — 8%'] },
  { id: 'E-16', batch: 'E', route: '/admin/churches/the-covenant-place/settings', title: 'Church Settings', subtitle: 'Manage church settings and preferences.', kind: 'settings', permission: 'church.settings.update', scope: 'assigned', nav: 'settings', action: 'Save Changes', tabs: ['General', 'Web & Branding', 'Meeting Services', 'Membership', 'Giving & Finance', 'Integrations', 'Advanced'], details: { 'Church Name': 'The Covenant Place, Lagos', 'Time Zone': '(GMT+01:00) West Africa Time', 'Date Format': 'DD/MM/YYYY', Currency: 'Nigerian Naira (₦)', 'Allow Online Registration': 'Yes', 'Enable Member Directory': 'Yes', 'Auto Approve New Members': 'No' } },
  { id: 'E-17', batch: 'E', route: '/admin/church/leadership', title: 'Leadership', subtitle: 'Leaders across churches in the current scope.', kind: 'table', permission: 'church.leader.view', scope: 'assigned', nav: 'leaders' },
  { id: 'E-18', batch: 'E', route: '/admin/church/members', title: 'Members', subtitle: 'Memberships in the current scope.', kind: 'table', permission: 'church.member.view', scope: 'assigned', nav: 'members' },
  { id: 'E-19', batch: 'E', route: '/admin/church/first-timers', title: 'First Timers', subtitle: 'First-timer registrations in the current scope.', kind: 'table', permission: 'people.first_timer.view', scope: 'assigned', nav: 'first-timers' },
  { id: 'E-20', batch: 'E', route: '/admin/church/converts', title: 'Converts', subtitle: 'Conversion records in the current scope.', kind: 'table', permission: 'people.convert.view', scope: 'assigned', nav: 'converts' },
  { id: 'E-21', batch: 'E', route: '/admin/church/disciples', title: 'Disciples', subtitle: 'Discipleship assignments in the current scope.', kind: 'table', permission: 'people.disciple.view', scope: 'assigned', nav: 'discipleship' },
  { id: 'E-22', batch: 'E', route: '/admin/church/workers', title: 'Workers', subtitle: 'Worker assignments in the current scope.', kind: 'table', permission: 'church.worker.view', scope: 'assigned', nav: 'workers' },
  { id: 'E-23', batch: 'E', route: '/admin/church/departments', title: 'Departments', subtitle: 'Departments in the current scope.', kind: 'table', permission: 'church.department.view', scope: 'assigned', nav: 'departments' },
  { id: 'E-24', batch: 'E', route: '/admin/church/small-groups', title: 'Small Groups', subtitle: 'Small groups in the current scope.', kind: 'operations', permission: 'church.small_group.view', scope: 'assigned', nav: 'small-groups' },
  { id: 'E-25', batch: 'E', route: '/admin/church/evangelism', title: 'Evangelism', subtitle: 'Outreach activities in the current scope.', kind: 'table', permission: 'church.evangelism.view', scope: 'assigned', nav: 'evangelism' },
  { id: 'E-26', batch: 'E', route: '/admin/church/reports', title: 'Reports', subtitle: 'Live scoped church totals.', kind: 'reports', permission: 'church.report.view', scope: 'assigned', nav: 'reports' },
  { id: 'E-27', batch: 'E', route: '/admin/church/finance', title: 'Church Finance', subtitle: 'Record and review giving for this church.', kind: 'finance', permission: 'church.finance.view', scope: 'assigned', nav: 'finance' },
  { id: 'E-28', batch: 'E', route: '/admin/church/settings', title: 'Church Settings', subtitle: 'Operational church configuration.', kind: 'settings', permission: 'church.settings.update', scope: 'assigned', nav: 'settings' },
  { id: 'E-29', batch: 'E', route: '/admin/churches/new', title: 'Add Church', subtitle: 'Create a church in the current scope.', kind: 'table', permission: 'church.update', scope: 'assigned', nav: 'churches' },
  { id: 'E-30', batch: 'E', route: '/admin/church/attendance', title: 'Attendance', subtitle: 'Home-church session attendance in the current church scope.', kind: 'operations', permission: 'home_church.attendance.view', scope: 'assigned', nav: 'attendance' },
  { id: 'E-31', batch: 'E', route: '/admin/church/needs', title: 'Needs', subtitle: 'Church and home church needs in the current scope.', kind: 'table', permission: 'church.follow_up.view', scope: 'assigned', nav: 'needs', columns: ['Title', 'Scope', 'Category', 'Contact', 'Status'] },

  { id: 'F-01', batch: 'F', route: '/admin/people', title: 'People Directory', subtitle: 'Canonical people in the current scope — one row per person.', kind: 'table', permission: 'people.directory.view', scope: 'assigned', nav: 'people', columns: ['Name', 'ID', 'Type', 'Church', 'Status', 'Last Contact'] },
  { id: 'F-02', batch: 'F', route: '/admin/people/first-timers', title: 'First Timer Queue', subtitle: 'People who visited for the first time and need follow-up.', kind: 'table', permission: 'people.first_timer.view', scope: 'assigned', nav: 'first-timers', columns: ['Name', 'Phone', 'Church', 'Visit Date', 'Status'] },
  { id: 'F-03', batch: 'F', route: '/admin/people/first-timers/daniel-dandeli', title: 'First timer record', subtitle: 'Opens the live first-timer queue. Use View on a row for Person 360°.', kind: 'table', permission: 'people.first_timer.view', scope: 'assigned', nav: 'first-timers' },
  { id: 'F-04', batch: 'F', route: '/admin/people/follow-up', title: 'Follow-Up Queue', subtitle: 'People to follow up based on previous interactions.', kind: 'table', permission: 'people.follow_up.view', scope: 'assigned', nav: 'follow-up', action: 'Assign Follow-Up', columns: ['Name', 'Last Contact', 'Next Follow-up', 'Owner', 'Status'] },
  { id: 'F-05', batch: 'F', route: '/admin/people/converts/mary-okafor', title: 'Convert record', subtitle: 'Opens the live converts register. Use View on a row for Person 360°.', kind: 'table', permission: 'people.convert.view', scope: 'assigned', nav: 'converts' },
  { id: 'F-06', batch: 'F', route: '/admin/people/journeys/membership/john-emmanuel', title: 'Membership Journey', subtitle: 'Disciple and membership role assignments in this scope.', kind: 'table', permission: 'people.journey.view', scope: 'assigned', nav: 'membership' },
  { id: 'F-07', batch: 'F', route: '/admin/people/journeys/worker/blessing-friday', title: 'Worker Journey', subtitle: 'Worker role assignments in this scope.', kind: 'table', permission: 'people.journey.view', scope: 'assigned', nav: 'workers' },
  { id: 'F-08', batch: 'F', route: '/admin/people/journeys/leadership/peter-okafor', title: 'Leadership Journey', subtitle: 'Leadership appointments in this scope.', kind: 'table', permission: 'people.journey.view', scope: 'assigned', nav: 'leaders' },
  { id: 'F-09', batch: 'F', route: '/admin/people/ministry-history', title: 'Ministry History', subtitle: 'Timeline of first-timer, worker and leadership records.', kind: 'table', permission: 'people.history.view', scope: 'assigned', nav: 'ministry-history', columns: ['Person', 'Church', 'Status'] },
  { id: 'F-10', batch: 'F', route: '/admin/people/prayer-requests', title: 'Prayer Requests', subtitle: 'Assign prayer requests to intercessors. Request bodies are not listed.', kind: 'table', permission: 'church.follow_up.view', scope: 'assigned', nav: 'prayer', columns: ['Request', 'Requested By', 'Date', 'Status'] },
  { id: 'F-11', batch: 'F', route: '/admin/people/needs', title: 'Need Requests', subtitle: 'People requesting needs support.', kind: 'table', permission: 'people.need.view', scope: 'assigned', nav: 'needs', action: '+ New Need Request', columns: ['Request', 'Requested By', 'Date', 'Status'] },
  { id: 'F-12', batch: 'F', route: '/admin/people/needs/school-fees-support/review', title: 'Need Approval', subtitle: 'Review and approve need requests from the live queue.', kind: 'table', permission: 'people.need.approve', scope: 'assigned', nav: 'needs', action: 'Approve' },
  { id: 'F-13', batch: 'F', route: '/admin/people/counselling', title: 'Counselling Cases', subtitle: 'Restricted counselling cases. Client identity is hidden in the list.', kind: 'table', permission: 'counselling.case.view', scope: 'assigned', nav: 'counselling', action: '+ New Case', columns: ['Case', 'Type', 'Client', 'Status'] },
  { id: 'F-14', batch: 'F', route: '/admin/people/counselling/case-c-2024-0012', title: 'Counselling case', subtitle: 'Restricted case detail requires assigned counselling access.', kind: 'restricted', permission: 'counselling.case.restricted', scope: 'assigned', nav: 'counselling' },
  { id: 'F-15', batch: 'F', route: '/admin/people/testimonies', title: 'Testimonies', subtitle: 'View and manage testimonies. Private body text is not listed.', kind: 'table', permission: 'testimony.view', scope: 'assigned', nav: 'testimonies', action: '+ Submit Testimony', columns: ['Testimony', 'By', 'Date', 'Status'] },
  { id: 'F-16', batch: 'F', route: '/admin/people/safeguarding/escalation', title: 'Safeguarding Escalation', subtitle: 'Report and manage safeguarding concerns.', kind: 'escalation', permission: 'safeguarding.escalate', scope: 'assigned', nav: 'safeguarding', action: 'Escalate Now' },
  { id: 'F-17', batch: 'F', route: '/admin/people/dashboard', title: 'People Dashboard', subtitle: 'Distinct-person counts with documented Active, New and Converted definitions.', kind: 'ministry-dashboard', permission: 'people.directory.view', scope: 'assigned', nav: 'dashboard' },
  { id: 'F-18', batch: 'F', route: '/admin/people/converts', title: 'Converts', subtitle: 'Conversion records — one person, no duplicate identities.', kind: 'table', permission: 'people.convert.view', scope: 'assigned', nav: 'converts' },
  { id: 'F-19', batch: 'F', route: '/admin/people/discipleship', title: 'Discipleship', subtitle: 'Disciple role assignments in the current scope.', kind: 'table', permission: 'people.disciple.view', scope: 'assigned', nav: 'discipleship' },
  { id: 'F-20', batch: 'F', route: '/admin/people/workers', title: 'Workers', subtitle: 'Worker role assignments in the current scope.', kind: 'table', permission: 'church.worker.view', scope: 'assigned', nav: 'workers' },
  { id: 'F-21', batch: 'F', route: '/admin/people/leaders', title: 'Leaders', subtitle: 'Leadership appointments in the current scope.', kind: 'table', permission: 'church.leader.view', scope: 'assigned', nav: 'leaders' },
  { id: 'F-22', batch: 'F', route: '/admin/people/safeguarding', title: 'Safeguarding', subtitle: 'Restricted incident list. Summaries are not shown here.', kind: 'escalation', permission: 'safeguarding.escalate', scope: 'assigned', nav: 'safeguarding' },
  { id: 'F-23', batch: 'F', route: '/admin/people/reports', title: 'People Reports', subtitle: 'Live scoped list totals that must match directory cards.', kind: 'reports', permission: 'people.directory.view', scope: 'assigned', nav: 'reports' },
  { id: 'F-24', batch: 'F', route: '/admin/people/settings', title: 'People Settings', subtitle: 'Follow-up timing and pastoral configuration.', kind: 'settings', permission: 'church.settings.update', scope: 'assigned', nav: 'settings' },
];
