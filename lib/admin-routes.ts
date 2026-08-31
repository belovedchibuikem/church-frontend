import { ministryScreens } from './ministry-routes.ts';
import { kcaAdmissionsScreens } from './kca-admissions-routes.ts';
import { kcaLearningScreens } from './kca-learning-routes.ts';
import { missionScreens } from './mission-routes.ts';
import { platformScreens } from './platform-routes.ts';

export type AdminScreenKind =
  | 'login' | 'mfa' | 'dashboard' | 'scope-grid' | 'command' | 'feed'
  | 'tasks' | 'kpi' | 'table' | 'detail' | 'wizard' | 'profile'
  | 'permissions' | 'matrix' | 'form' | 'tree' | 'map' | 'quick-actions'
  | 'forbidden' | 'impersonation' | 'ministry-dashboard' | 'workflow'
  | 'activation' | 'operations' | 'journey' | 'approval' | 'settings'
  | 'finance' | 'reports' | 'restricted' | 'escalation';

export type Metric = { label: string; value: string; trend?: string; hint?: string };
export type Row = Record<string, string>;

export type AdminScreen = {
  id: string;
  batch: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' | 'O';
  route: string;
  title: string;
  subtitle: string;
  kind: AdminScreenKind;
  permission: string | 'public';
  scope: 'global' | 'assigned' | 'self';
  nav: 'dashboard' | 'scope' | 'command' | 'approvals' | 'alerts' | 'notifications' | 'activity' | 'audit' | 'tasks' | 'reports' | 'users' | 'access' | 'geography' | 'settings'
    | 'applications' | 'home-churches' | 'leaders' | 'members' | 'attendance'
    | 'activities' | 'needs' | 'finance' | 'churches' | 'departments'
    | 'small-groups' | 'evangelism' | 'people' | 'first-timers' | 'follow-up'
    | 'converts' | 'discipleship' | 'workers' | 'membership' | 'ministry-history'
    | 'prayer' | 'counselling' | 'testimonies' | 'safeguarding'
    | 'kca' | 'kca-applications' | 'kca-review' | 'kca-decisions' | 'kca-students' | 'kca-cohorts'
    | 'kca-years' | 'kca-mentors' | 'kca-lecturers' | 'kca-modules' | 'kca-learning'
    | 'kca-assessments' | 'kca-certification' | 'kca-alumni' | 'missions'
    | 'crusades' | 'souls' | 'mission-partners' | 'mission-follow-up' | 'mission-ai'
    | 'mission' | 'partners' | 'ai-assistant'
    | 'press' | 'publications' | 'authors' | 'manuscripts' | 'distribution' | 'assets' | 'translations' | 'press-sales' | 'press-analytics'
    | 'finance-transactions' | 'finance-payments' | 'finance-reconciliation' | 'finance-providers' | 'finance-reports' | 'finance-alerts'
    | 'platform-settings' | 'communications' | 'templates' | 'report-ai' | 'security' | 'privacy';
  action?: string;
  tabs?: string[];
  metrics?: Metric[];
  columns?: string[];
  rows?: Row[];
  details?: Row;
  items?: string[];
};

const users: Row[] = [
  { User: 'John Chinedu Doe', 'Email / Phone': 'john.doe@email.com', Role: 'Member', 'Church / Org': 'Grace Home Church', Status: 'Active', 'Last Active': 'May 12, 2024' },
  { User: 'Mary A. Johnson', 'Email / Phone': 'mary.j@email.com', Role: 'Admin', 'Church / Org': 'RCCG Lagos', Status: 'Active', 'Last Active': 'May 11, 2024' },
  { User: 'Pastor Samuel Okon', 'Email / Phone': 'samuel.okon@fhc.org', Role: 'Church Admin', 'Church / Org': 'Faith City Church', Status: 'Active', 'Last Active': 'May 11, 2024' },
  { User: 'Esther Williams', 'Email / Phone': 'esther.w@email.com', Role: 'Member', 'Church / Org': 'Home Church – Ikeja', Status: 'Active', 'Last Active': 'May 9, 2024' },
  { User: 'David K. Mensah', 'Email / Phone': 'david.m@email.com', Role: 'Leader', 'Church / Org': 'Youth Ministry', Status: 'Active', 'Last Active': 'May 9, 2024' },
];

const countries: Row[] = [
  { Country: '🇳🇬 Nigeria', Code: 'NG', Region: 'Africa', 'Time Zone': 'WAT (UTC+1)', Status: 'Active' },
  { Country: '🇬🇭 Ghana', Code: 'GH', Region: 'Africa', 'Time Zone': 'GMT (UTC+0)', Status: 'Active' },
  { Country: '🇰🇪 Kenya', Code: 'KE', Region: 'Africa', 'Time Zone': 'EAT (UTC+3)', Status: 'Active' },
  { Country: '🇿🇦 South Africa', Code: 'ZA', Region: 'Africa', 'Time Zone': 'SAST (UTC+2)', Status: 'Active' },
  { Country: '🇺🇸 United States', Code: 'US', Region: 'North America', 'Time Zone': 'EST (UTC-5)', Status: 'Active' },
  { Country: '🇬🇧 United Kingdom', Code: 'GB', Region: 'Europe', 'Time Zone': 'GMT (UTC+0)', Status: 'Active' },
  { Country: '🇨🇦 Canada', Code: 'CA', Region: 'Americas', 'Time Zone': 'AST (UTC-4)', Status: 'Active' },
];

const regions: Row[] = [
  { 'State Name': 'Lagos', Code: 'LA', Capital: 'Ikeja', Churches: '1,245', Status: 'Active' },
  { 'State Name': 'Kano', Code: 'KN', Capital: 'Kano', Churches: '845', Status: 'Active' },
  { 'State Name': 'Rivers', Code: 'RI', Capital: 'Port Harcourt', Churches: '732', Status: 'Active' },
  { 'State Name': 'Kaduna', Code: 'KD', Capital: 'Kaduna', Churches: '621', Status: 'Active' },
  { 'State Name': 'Oyo', Code: 'OY', Capital: 'Ibadan', Churches: '598', Status: 'Active' },
  { 'State Name': 'Delta', Code: 'DE', Capital: 'Asaba', Churches: '512', Status: 'Active' },
  { 'State Name': 'Ogun', Code: 'OG', Capital: 'Abeokuta', Churches: '489', Status: 'Active' },
];

const localAreas: Row[] = [
  { 'Local Area Name': 'Ikeja', Code: 'IKEJA', Type: 'LGA', Churches: '45', Status: 'Active' },
  { 'Local Area Name': 'Eti-Osa', Code: 'ETIOSA', Type: 'LGA', Churches: '62', Status: 'Active' },
  { 'Local Area Name': 'Surulere', Code: 'SURULERE', Type: 'LGA', Churches: '38', Status: 'Active' },
  { 'Local Area Name': 'Agege', Code: 'AGEGE', Type: 'LGA', Churches: '31', Status: 'Active' },
  { 'Local Area Name': 'Kosofe', Code: 'KOSOFE', Type: 'LGA', Churches: '27', Status: 'Active' },
  { 'Local Area Name': 'Alimosho', Code: 'ALIMOSHO', Type: 'LGA', Churches: '44', Status: 'Active' },
];

const roles: Row[] = [
  { 'Role Name': 'Global Super Admin', Type: 'System', Users: '4', Description: 'Full access to all modules', Status: 'Active' },
  { 'Role Name': 'Country Admin', Type: 'System', Users: '17', Description: 'Country-level administration', Status: 'Active' },
  { 'Role Name': 'Church Admin', Type: 'System', Users: '1,146', Description: 'Manage church and members', Status: 'Active' },
  { 'Role Name': 'Home Church Leader', Type: 'Custom', Users: '982', Description: 'Lead home church groups', Status: 'Active' },
  { 'Role Name': 'KCA Coordinator', Type: 'Custom', Users: '154', Description: 'Manage KCA students', Status: 'Active' },
];

const levels: Row[] = [
  { 'Level Name': 'Region', 'Level Code': 'REGION', 'Level Type': 'Region', Order: '1', Required: 'Yes', Status: 'Active' },
  { 'Level Name': 'State', 'Level Code': 'STATE', 'Level Type': 'State', Order: '2', Required: 'Yes', Status: 'Active' },
  { 'Level Name': 'Local Government', 'Level Code': 'LGA', 'Level Type': 'Local Government', Order: '3', Required: 'Yes', Status: 'Active' },
  { 'Level Name': 'District', 'Level Code': 'DISTRICT', 'Level Type': 'District', Order: '4', Required: 'No', Status: 'Active' },
  { 'Level Name': 'Ward', 'Level Code': 'WARD', 'Level Type': 'Ward', Order: '5', Required: 'No', Status: 'Active' },
  { 'Level Name': 'Community', 'Level Code': 'COMMUNITY', 'Level Type': 'Community', Order: '6', Required: 'No', Status: 'Active' },
];

const accessHistory: Row[] = [
  { 'Date & Time': 'May 17, 2024 09:43 AM', Action: 'Login', Module: 'System', Details: 'Login successful', 'IP Address': '197.210.4.12' },
  { 'Date & Time': 'May 15, 2024 09:10 AM', Action: 'View', Module: 'Finance', Details: 'Viewed event details', 'IP Address': '197.210.4.12' },
  { 'Date & Time': 'May 13, 2024 04:45 PM', Action: 'Create', Module: 'Prayer', Details: 'Submitted prayer request', 'IP Address': '197.210.4.12' },
  { 'Date & Time': 'May 11, 2024 08:15 AM', Action: 'Update', Module: 'Profile', Details: 'Updated profile information', 'IP Address': '197.210.4.12' },
  { 'Date & Time': 'May 10, 2024 11:04 PM', Action: 'Logout', Module: 'System', Details: 'Logged out', 'IP Address': '41.190.23.50' },
];

const feed = (labels: string[]): Row[] => labels.map((label, index) => ({ Item: label, Detail: ['Grace Home Fellowship · Lagos, Nigeria', 'Youth for Christ Crusade · Accra, Ghana', 'Kingdom Expansion 2024', 'Platform security notice'][index % 4], Time: ['2m ago', '5m ago', '1h ago', '3h ago'][index % 4] }));

export const adminScreens: AdminScreen[] = [
  { id: 'A-01', batch: 'A', route: '/admin/login', title: 'Welcome Back', subtitle: 'Sign in to your admin account', kind: 'login', permission: 'public', scope: 'self', nav: 'dashboard' },
  { id: 'A-02', batch: 'A', route: '/admin/mfa', title: 'Multi-Factor Authentication', subtitle: 'Enter the 6-digit code from your authenticator app', kind: 'mfa', permission: 'public', scope: 'self', nav: 'dashboard' },
  { id: 'A-03', batch: 'A', route: '/admin', title: 'Welcome, Admin 👋', subtitle: 'Here’s what’s happening across the global Kingdom.', kind: 'dashboard', permission: 'admin.dashboard.view', scope: 'assigned', nav: 'dashboard', metrics: [{ label: 'Total Churches', value: '24,518', trend: '+4.2%' }, { label: 'Home Churches', value: '8,642', trend: '+5.0%' }, { label: 'Members', value: '1,248,792', trend: '+4.3%' }, { label: 'Countries', value: '198', trend: '+1' }] },
  { id: 'A-04', batch: 'A', route: '/admin/scope', title: 'Global Scope', subtitle: 'Select the scope you want to manage', kind: 'scope-grid', permission: 'organization.scope.select', scope: 'assigned', nav: 'scope', items: ['Global', 'Continent', 'Country', 'Region', 'Church Network', 'Mission Field'] },
  { id: 'A-05', batch: 'A', route: '/admin/command', title: 'Command Centre', subtitle: 'Find anything. Take action. Get answers.', kind: 'command', permission: 'admin.command.use', scope: 'assigned', nav: 'command', items: ['Approve Home Church', 'Export Member List', 'View Country Report', 'Export Mentor List', 'Create Announcement', 'Generate Audit Report'] },
  { id: 'A-06', batch: 'A', route: '/admin/approvals', title: 'Approval Inbox', subtitle: 'Review requests awaiting a decision.', kind: 'feed', permission: 'approval.queue.view', scope: 'assigned', nav: 'approvals', tabs: ['All (24)', 'Churches (6)', 'Memberships (4)', 'Events (8)', 'Content (2)', 'Other (4)'], rows: feed(['Home Church Application', 'Mission Crusade Request', 'Membership Registration', 'Event Registration Approval']) },
  { id: 'A-07', batch: 'A', route: '/admin/alerts', title: 'Alerts Centre', subtitle: 'Operational and security issues requiring attention.', kind: 'feed', permission: 'alerts.view', scope: 'assigned', nav: 'alerts', tabs: ['All', 'Critical (3)', 'Warning (8)', 'Info (15)'], rows: feed(['Payment Failure Spike', 'Server Performance Warning', 'Unusual Login Activity', 'Large Withdrawal Request', 'Church Verification Pending']) },
  { id: 'A-07b', batch: 'A', route: '/admin/alerts/rules', title: 'Alert Rules', subtitle: 'Configure thresholds and routing for operational alerts.', kind: 'table', permission: 'reporting.alert_rules.view', scope: 'global', nav: 'alerts', action: '+ Create Alert Rule', columns: ['Name', 'Type', 'Status', 'Updated'], rows: [{ Name: 'Payment Failure Spike', Type: 'threshold', Status: 'Active', Updated: 'May 31, 2024' }, { Name: 'Unusual Login Activity', Type: 'anomaly', Status: 'Active', Updated: 'May 30, 2024' }] },
  { id: 'A-08', batch: 'A', route: '/admin/notifications', title: 'Notifications', subtitle: 'Your latest platform updates.', kind: 'feed', permission: 'notifications.view', scope: 'self', nav: 'notifications', tabs: ['All', 'Unread (8)', 'Announcements', 'System', 'Messages'], rows: feed(['New member registered', 'New prayer request submitted', 'Home Church approved', 'New giving received', 'System maintenance scheduled', 'New message from Pastor Daniel']) },
  { id: 'A-09', batch: 'A', route: '/admin/activity', title: 'Recent Activity', subtitle: 'See what’s happening across the platform.', kind: 'feed', permission: 'activity.view', scope: 'assigned', nav: 'activity', rows: feed(['Pastor John Doe approved a home church', 'Admin Mary updated church profile', 'New member registered', 'Payment of $800 received', 'Crusade request submitted', 'New event created']) },
  { id: 'A-10', batch: 'A', route: '/admin/audit', title: 'Audit Summary', subtitle: 'Overview of system audit and compliance.', kind: 'kpi', permission: 'security.audit.view', scope: 'global', nav: 'audit', metrics: [{ label: 'Total Audit Logs', value: '256,832' }, { label: 'Admin Actions', value: '18,542' }, { label: 'Data Changes', value: '12,371' }, { label: 'Login Events', value: '225,919' }], items: ['Church Approvals — 3,254', 'Member Approvals — 2,031', 'Content Management — 1,994', 'User Management — 1,732', 'Financial Actions — 1,421'] },
  { id: 'A-11', batch: 'A', route: '/admin/tasks', title: 'Tasks', subtitle: 'Manage your daily operational work.', kind: 'tasks', permission: 'tasks.view', scope: 'self', nav: 'tasks', action: '+ New Task', tabs: ['My Tasks (8)', 'Team Tasks (24)', 'Completed'], items: ['Review pending church applications', 'Approve national field reports', 'Validate large giving transactions', 'Update country coordinator list', 'Review user access requests', 'Generate weekly KPI report', 'Follow up on payment disputes', 'Review content submissions'] },
  { id: 'A-12', batch: 'A', route: '/admin/kpi', title: 'Global KPI Overview', subtitle: 'Measure global ministry performance.', kind: 'kpi', permission: 'reports.view', scope: 'global', nav: 'reports', metrics: [{ label: 'Total Members', value: '1.25M', trend: '+8.5%' }, { label: 'Active Members', value: '632K', trend: '+4.8%' }, { label: 'New Churches', value: '512', trend: '+7%' }, { label: 'Total Giving (USD)', value: '$1.25M', trend: '+8.7%' }] },
  { id: 'A-13', batch: 'A', route: '/admin/reports/country-performance', title: 'Country Performance', subtitle: 'Compare performance across countries.', kind: 'table', permission: 'reports.view', scope: 'global', nav: 'reports', action: 'Export', columns: ['Country', 'Members', 'New Churches', 'Giving (USD)', 'Growth'], rows: [{ Country: 'Nigeria', Members: '246,302', 'New Churches': '120', 'Giving (USD)': '$284,500', Growth: '+12.4%' }, { Country: 'Ghana', Members: '98,471', 'New Churches': '66', 'Giving (USD)': '$98,340', Growth: '+10.2%' }, { Country: 'United States', Members: '87,451', 'New Churches': '45', 'Giving (USD)': '$164,300', Growth: '+8.7%' }, { Country: 'Kenya', Members: '76,302', 'New Churches': '58', 'Giving (USD)': '$56,710', Growth: '+7.3%' }, { Country: 'South Africa', Members: '64,218', 'New Churches': '34', 'Giving (USD)': '$48,650', Growth: '+7.1%' }, { Country: 'Canada', Members: '43,051', 'New Churches': '22', 'Giving (USD)': '$60,450', Growth: '+6.5%' }, { Country: 'United Kingdom', Members: '31,245', 'New Churches': '18', 'Giving (USD)': '$60,710', Growth: '+5.3%' }] },
  { id: 'A-14', batch: 'A', route: '/admin/quick-actions', title: 'Quick Actions', subtitle: 'Shortcuts to common admin actions.', kind: 'quick-actions', permission: 'admin.actions.view', scope: 'assigned', nav: 'dashboard', items: ['Create Announcement', 'Add New Church', 'Approve Requests', 'Create Event', 'Generate Report', 'Manage Users', 'System Settings', 'Support Tickets'] },
  { id: 'A-15', batch: 'A', route: '/admin/profile', title: 'Admin Profile', subtitle: 'Manage your admin account.', kind: 'profile', permission: 'member.self.manage', scope: 'self', nav: 'dashboard', action: 'Update Profile' },
  { id: 'A-16', batch: 'A', route: '/admin/forbidden', title: 'Permission Denied', subtitle: 'You don’t have permission to access this resource in the current scope.', kind: 'forbidden', permission: 'public', scope: 'self', nav: 'dashboard' },

  { id: 'B-01', batch: 'B', route: '/admin/users', title: 'Users', subtitle: 'Manage all platform users across the global scope.', kind: 'table', permission: 'identity.users.view', scope: 'assigned', nav: 'users', action: '+ Create User', metrics: [{ label: 'All Users', value: '24,580' }, { label: 'Active', value: '21,344' }, { label: 'Suspended', value: '1,235' }, { label: 'Pending', value: '2,001' }], columns: ['User', 'Email / Phone', 'Role', 'Church / Org', 'Status', 'Last Active'], rows: users },
  { id: 'B-02', batch: 'B', route: '/admin/users/john-chinedu-doe', title: 'John Chinedu Doe', subtitle: 'Member · Active', kind: 'detail', permission: 'identity.users.view', scope: 'assigned', nav: 'users', tabs: ['Overview', 'Profile', 'Roles & Permissions', 'Activity', 'Giving', 'Churches', 'More'], details: { 'Member ID': 'FHC-0002315', Email: 'john.doe@email.com', Phone: '+234 803 123 4478', Location: 'Lagos, Nigeria', 'Member Of': 'Grace Home Church', 'Account Status': 'Active', 'Last Active': 'May 12, 2024 09:34 AM', 'Total Logins': '166' }, items: ['Member — Home Church Member', 'Grace Home Church — Member', 'Kingdom Family — Member'] },
  { id: 'B-03', batch: 'B', route: '/admin/users/create', title: 'Create User', subtitle: 'Create a new scoped platform account.', kind: 'wizard', permission: 'identity.user.create', scope: 'assigned', nav: 'users', tabs: ['Details', 'Roles & Permissions', 'Church / Scope', 'Review'], action: 'Next: Roles & Permissions' },
  { id: 'B-04', batch: 'B', route: '/admin/users/john-chinedu-doe/edit', title: 'Edit User', subtitle: 'Update profile and account access.', kind: 'wizard', permission: 'identity.user.update', scope: 'assigned', nav: 'users', tabs: ['Details', 'Roles & Permissions', 'Church / Scope', 'Review'], action: 'Save Changes' },
  { id: 'B-05', batch: 'B', route: '/admin/users/grace-ezekiel/profile', title: '360° Profile', subtitle: 'A complete member and spiritual journey overview.', kind: 'profile', permission: 'people.member.view', scope: 'assigned', nav: 'users', tabs: ['Overview', 'Activity', 'Roles (3)', 'Churches (2)', 'Giving', 'Events (14)', 'More'], details: { Name: 'Grace Ezekiel', Status: 'Active', Email: 'grace.ezekiel@email.com', Phone: '+234 801 234 4700', Location: 'Lagos, Nigeria', 'Member Since': 'Jan 15, 2022', 'Spiritual Journey': 'KCA Student · Level 2', 'Prayer Team': 'Christian Maturity', 'Events Attended': '14', 'Prayer Requests': '3', Testimonies: '2', 'Giving This Year': '₦48,000' } },
  { id: 'B-06', batch: 'B', route: '/admin/users/grace-ezekiel/sessions', title: 'User Sessions', subtitle: 'View and manage active sessions for Grace Ezekiel.', kind: 'table', permission: 'security.session.view', scope: 'assigned', nav: 'users', metrics: [{ label: 'Active Sessions', value: '2' }, { label: 'Other Devices', value: '1' }, { label: 'Total Logins (30 Days)', value: '18' }, { label: 'Last Login', value: 'May 17, 2024' }], columns: ['Device / Browser', 'Location', 'IP Address', 'Login Time', 'Status'], rows: [{ 'Device / Browser': 'Chrome on Windows', Location: 'Lagos, Nigeria', 'IP Address': '197.210.4.12', 'Login Time': 'May 17, 2024 09:24 AM', Status: 'Current' }, { 'Device / Browser': 'Mobile App (Android)', Location: 'Lagos, Nigeria', 'IP Address': '197.210.4.19', 'Login Time': 'May 17, 2024 08:15 AM', Status: 'Active' }, { 'Device / Browser': 'Safari on iPhone', Location: 'Lagos, Nigeria', 'IP Address': '102.89.23.12', 'Login Time': 'May 16, 2024 07:10 PM', Status: 'Logged out' }] },
  { id: 'B-07', batch: 'B', route: '/admin/roles', title: 'Roles', subtitle: 'Manage system roles and their responsibilities.', kind: 'table', permission: 'identity.roles.view', scope: 'assigned', nav: 'access', action: '+ Create Role', metrics: [{ label: 'Total Roles', value: '28' }, { label: 'System Roles', value: '12' }, { label: 'Custom Roles', value: '16' }, { label: 'Active', value: '26' }], columns: ['Role Name', 'Type', 'Users', 'Description', 'Status'], rows: roles },
  { id: 'B-08', batch: 'B', route: '/admin/roles/church-admin', title: 'Church Admin', subtitle: 'Custom role · Active', kind: 'detail', permission: 'identity.roles.view', scope: 'assigned', nav: 'access', tabs: ['Permissions (104)', 'Users (146)', 'Scope Rules', 'Activity'], details: { Users: '1,146', Created: 'May 10, 2022', 'Last Updated': 'Mar 2, 2024', Description: 'Can manage church information, members, events, and giving within assigned church.' }, items: ['Church Management — 14/20', 'Member Management — 24/34', 'Events — 15/15', 'Giving & Finance — 12/20', 'Reports — 8/12', 'Settings — 6/6'] },
  { id: 'B-09', batch: 'B', route: '/admin/roles/create', title: 'Create Role', subtitle: 'Define a permission and scope-aware role.', kind: 'wizard', permission: 'identity.role.create', scope: 'assigned', nav: 'access', tabs: ['Basic Info', 'Permissions', 'Scope', 'Review'], action: 'Next: Permissions' },
  { id: 'B-10', batch: 'B', route: '/admin/permissions', title: 'Permissions', subtitle: 'Manage all system permissions.', kind: 'permissions', permission: 'identity.permissions.view', scope: 'global', nav: 'access', items: ['Dashboard', 'Users', 'Churches', 'Events', 'Giving', 'KCA', 'Reports', 'Settings'] },
  { id: 'B-11', batch: 'B', route: '/admin/permissions/matrix', title: 'Permission Matrix', subtitle: 'Compare roles and their permissions.', kind: 'matrix', permission: 'identity.permissions.view', scope: 'global', nav: 'access' },
  { id: 'B-12', batch: 'B', route: '/admin/access/scope-assignments', title: 'Scope Assignments', subtitle: 'Define scope hierarchy access for roles or users.', kind: 'form', permission: 'identity.scopes.view', scope: 'assigned', nav: 'access', tabs: ['By Role', 'By User'], action: 'Save Scope' },
  { id: 'B-13', batch: 'B', route: '/admin/access/user-role-assignment', title: 'Assign Roles to Users', subtitle: 'Assign roles and scope to John Chinedu Doe.', kind: 'form', permission: 'identity.role.assign', scope: 'assigned', nav: 'access', action: 'Save Assignments' },
  { id: 'B-14', batch: 'B', route: '/admin/users/suspended', title: 'Suspended / Disabled Accounts', subtitle: 'View and manage suspended or disabled accounts.', kind: 'table', permission: 'identity.users.view', scope: 'assigned', nav: 'users', metrics: [{ label: 'Suspended', value: '1,235' }, { label: 'Disabled', value: '342' }, { label: 'Locked', value: '87' }, { label: 'Pending Review', value: '56' }], columns: ['User', 'Reason', 'Suspended On', 'Status'], rows: [{ User: 'Mufutau Tunde', Reason: 'Policy violation', 'Suspended On': 'May 10, 2024', Status: 'Suspended' }, { User: 'Linda Johnson', Reason: 'Inappropriate content', 'Suspended On': 'May 8, 2024', Status: 'Suspended' }, { User: 'David Ezeani', Reason: 'Multiple failed logins', 'Suspended On': 'May 7, 2024', Status: 'Locked' }, { User: 'Ayo M. Peter', Reason: 'Payment dispute', 'Suspended On': 'May 4, 2024', Status: 'Suspended' }] },
  { id: 'B-15', batch: 'B', route: '/admin/access/history', title: 'Access History', subtitle: 'Track user access and administrative actions.', kind: 'table', permission: 'security.access_decisions.view', scope: 'assigned', nav: 'access', columns: ['Date & Time', 'Action', 'Module', 'Details', 'IP Address'], rows: accessHistory },
  { id: 'B-16', batch: 'B', route: '/admin/access/impersonation', title: 'Support Access (Impersonation)', subtitle: 'Controlled support access with explicit approval.', kind: 'impersonation', permission: 'security.impersonation.request', scope: 'global', nav: 'access', action: 'Request Access' },

  { id: 'C-01', batch: 'C', route: '/admin/geography', title: 'Global Organization Dashboard', subtitle: 'Overview of the global church organization.', kind: 'kpi', permission: 'organization.view', scope: 'global', nav: 'geography', metrics: [{ label: 'Countries', value: '87', trend: '+3 this month' }, { label: 'Regions / States', value: '1,246', trend: '+26 this month' }, { label: 'Local Areas', value: '12,834', trend: '+343 this month' }, { label: 'Churches', value: '24,518', trend: '+83 this month' }], items: ['Active Churches — 24,518', 'Home Churches — 18,642', 'Members — 1,638,732', 'Leaders — 98,431'] },
  { id: 'C-02', batch: 'C', route: '/admin/geography/countries', title: 'Countries', subtitle: 'Manage countries in the global organization.', kind: 'table', permission: 'organization.country.view', scope: 'global', nav: 'geography', action: '+ Add Country', columns: ['Country', 'Code', 'Region', 'Time Zone', 'Status'], rows: countries },
  { id: 'C-03', batch: 'C', route: '/admin/geography/countries/nigeria', title: 'Nigeria', subtitle: 'Country profile and organization statistics.', kind: 'detail', permission: 'organization.country.view', scope: 'assigned', nav: 'geography', tabs: ['Overview', 'Administrative Levels', 'Regions / States (36)', 'Local Areas (774)', 'Statistics', 'Settings'], details: { 'Country Name': 'Nigeria', 'Country Code': 'NG', Region: 'Africa', Capital: 'Abuja', 'Time Zone': 'WAT (UTC+1)', Population: '201,804,392', Language: 'English', Status: 'Active', Created: 'Jan 12, 2023' }, items: ['Regions / States — 36', 'Local Areas — 774', 'Churches — 6,254', 'Home Churches — 4,820', 'Members — 438,831', 'Leaders — 32,419'] },
  { id: 'C-04', batch: 'C', route: '/admin/geography/countries/nigeria/levels', title: 'Administrative Level Configuration', subtitle: 'Configure administrative levels used in Nigeria.', kind: 'table', permission: 'organization.level.manage', scope: 'assigned', nav: 'geography', action: '+ Add Level', columns: ['Level Name', 'Level Code', 'Level Type', 'Order', 'Required', 'Status'], rows: levels },
  { id: 'C-05', batch: 'C', route: '/admin/geography/countries/nigeria/regions', title: 'Regions / States', subtitle: 'Nigeria has 36 regions / states.', kind: 'table', permission: 'organization.region.view', scope: 'assigned', nav: 'geography', action: '+ Add Region / State', columns: ['State Name', 'Code', 'Capital', 'Churches', 'Status'], rows: regions },
  { id: 'C-06', batch: 'C', route: '/admin/geography/countries/nigeria/regions/lagos', title: 'Lagos State', subtitle: 'Regional organization profile.', kind: 'detail', permission: 'organization.region.view', scope: 'assigned', nav: 'geography', tabs: ['Overview', 'Local Areas (57)', 'Churches (1,245)', 'Statistics', 'Details'], details: { 'State Name': 'Lagos', 'State Code': 'LA', Capital: 'Ikeja', Population: '14,368,000', 'Area (km²)': '3,577', Region: 'South West', Status: 'Active' }, items: ['Local Areas — 57', 'Home Churches — 892', 'Churches — 1,245', 'Members — 89,621', 'Leaders — 6,421'] },
  { id: 'C-07', batch: 'C', route: '/admin/geography/countries/nigeria/regions/lagos/local-areas', title: 'Local Areas', subtitle: 'Lagos State has 57 local areas.', kind: 'table', permission: 'organization.local_area.view', scope: 'assigned', nav: 'geography', action: '+ Add Local Area', columns: ['Local Area Name', 'Code', 'Type', 'Churches', 'Status'], rows: localAreas },
  { id: 'C-08', batch: 'C', route: '/admin/geography/local-areas/ikeja', title: 'Ikeja Local Government', subtitle: 'Local administrative area profile.', kind: 'detail', permission: 'organization.local_area.view', scope: 'assigned', nav: 'geography', tabs: ['Overview', 'Churches (45)', 'Home Churches (36)', 'Statistics', 'Details'], details: { Name: 'Ikeja', Code: 'IKEJA', Type: 'Local Government', State: 'Lagos', Population: '371,000', 'Area (km²)': '16', Status: 'Active' }, items: ['Churches — 45', 'Home Churches — 36', 'Members — 6,481', 'Leaders — 512'] },
  { id: 'C-09', batch: 'C', route: '/admin/geography/hierarchy', title: 'Hierarchy Tree', subtitle: 'Visualize the administrative hierarchy.', kind: 'tree', permission: 'organization.hierarchy.view', scope: 'assigned', nav: 'geography', action: 'Expand All', items: ['Nigeria', 'Lagos State', 'Ikeja LGA', 'Ikeja Ward A', 'Ikeja Ward B', 'Ikeja Ward C', 'Surulere LGA', 'Eti-Osa LGA'] },
  { id: 'C-10', batch: 'C', route: '/admin/geography/map', title: 'Geography Map', subtitle: 'Interactive map of global locations.', kind: 'map', permission: 'organization.map.view', scope: 'assigned', nav: 'geography' },
  { id: 'C-11', batch: 'C', route: '/admin/geography/locations/ikeja-ward-a', title: 'Ikeja Ward A', subtitle: 'Location overview and map boundary.', kind: 'map', permission: 'organization.location.view', scope: 'assigned', nav: 'geography', tabs: ['Overview', 'Churches (8)', 'Home Churches (14)', 'Details', 'Map'], details: { Name: 'Ikeja Ward A', Code: 'IKEJA_WA', Level: 'Ward', 'Local Area': 'Ikeja LGA', State: 'Lagos', Coordinates: '6.6018° N, 3.3515° E', Status: 'Active' } },
  { id: 'C-12', batch: 'C', route: '/admin/geography/scope-assignment', title: 'Scope Assignment', subtitle: 'Assign administrative scope to users or roles.', kind: 'form', permission: 'organization.scope.assign', scope: 'assigned', nav: 'geography', tabs: ['By User', 'By Role'], action: 'Save Assignments' },
  { id: 'C-13', batch: 'C', route: '/admin/geography/church-hierarchy', title: 'Church Hierarchy', subtitle: 'Organizational structure of churches.', kind: 'tree', permission: 'church.hierarchy.view', scope: 'assigned', nav: 'geography', action: 'Expand All', items: ['The Kingdom Church (Global)', 'Africa', 'Nigeria', 'Lagos State', 'Ikeja LGA', 'The Covenant Place', 'Grace House Church', 'Faith Chapel'] },
  { id: 'C-14', batch: 'C', route: '/admin/geography/home-church-hierarchy', title: 'Home Church Hierarchy', subtitle: 'Structure of home churches under main churches.', kind: 'tree', permission: 'home_church.hierarchy.view', scope: 'assigned', nav: 'geography', action: 'Expand All', items: ['The Covenant Place (Main Church)', 'Home Churches', 'Victory Home Church', 'Hope Home Church', 'Blessed Home Church', 'Faith Home Church', 'Love Home Church'] },
  { id: 'C-15', batch: 'C', route: '/admin/geography/reports', title: 'Territory Reports', subtitle: 'Performance insights by geography.', kind: 'kpi', permission: 'reports.territory.view', scope: 'assigned', nav: 'reports', action: 'Export', metrics: [{ label: 'Churches', value: '45', trend: '+3' }, { label: 'Home Churches', value: '36', trend: '+2' }, { label: 'Members', value: '6,421', trend: '+245' }, { label: 'Leaders', value: '512', trend: '+18' }], items: ['Ikeja Ward A — 1,345', 'Ikeja Ward B — 1,212', 'Ikeja Ward C — 986', 'Ikeja Ward D — 842', 'Ikeja Ward E — 650'] },
  { id: 'C-16', batch: 'C', route: '/admin/geography/settings', title: 'Geography Settings', subtitle: 'Configure global geography settings.', kind: 'form', permission: 'organization.settings.update', scope: 'global', nav: 'settings', tabs: ['General', 'Levels', 'Terminology', 'Import / Export', 'Advanced'], action: 'Save Settings' },
  { id: 'C-17', batch: 'C', route: '/admin/geography/regions', title: 'Regions / States', subtitle: 'Root administrative units across countries.', kind: 'table', permission: 'organization.region.view', scope: 'assigned', nav: 'geography', action: '+ Add Region / State', columns: ['Name', 'Level', 'Code', 'Country', 'Status'] },
  { id: 'C-18', batch: 'C', route: '/admin/geography/local-areas', title: 'Local Areas', subtitle: 'Child administrative units (LGA and equivalents).', kind: 'table', permission: 'organization.local_area.view', scope: 'assigned', nav: 'geography', action: '+ Add Local Area', columns: ['Name', 'Level', 'Code', 'Parent', 'Country'] },
  { id: 'C-19', batch: 'C', route: '/admin/geography/organizations', title: 'Organizations', subtitle: 'Churches and their geographic coverage — distinct from civic locations.', kind: 'table', permission: 'church.churches.view', scope: 'assigned', nav: 'geography', action: '+ Add Organization', columns: ['Name', 'Status', 'Coverage', 'Country', 'Home Churches'] },
  ...ministryScreens,
  ...kcaAdmissionsScreens,
  ...kcaLearningScreens,
  ...missionScreens,
  ...platformScreens,
];

export function normalizeAdminRoute(slug?: string[]): string {
  return slug?.length ? `/admin/${slug.join('/')}` : '/admin';
}

export function getAdminScreen(route: string): AdminScreen | undefined {
  const exact = adminScreens.find((screen) => screen.route === route);
  if (exact) return exact;

  const prayerAssign = route.match(/^\/admin\/people\/prayer-requests\/([^/]+)\/assign$/);
  if (prayerAssign) {
    const list = adminScreens.find((screen) => screen.id === 'F-10');
    if (!list) return undefined;
    return {
      ...list,
      route,
      kind: 'approval',
      title: 'Prayer Assignment',
      subtitle: 'Assign prayer requests to intercessors.',
      action: 'Assign Prayer',
    };
  }

  const needReview = route.match(/^\/admin\/people\/needs\/([^/]+)\/review$/);
  if (needReview) {
    const review = adminScreens.find((screen) => screen.id === 'F-12');
    if (!review) return undefined;
    return { ...review, route };
  }

  const peopleNested = route.match(/^\/admin\/people\/([0-7][0-9A-HJKMNP-TV-Z]{25})(?:\/(edit))?$/i);
  if (peopleNested) {
    const template = adminScreens.find((screen) => screen.id === 'F-01');
    if (!template) return undefined;
    return { ...template, id: 'F-01', route, title: 'Person', subtitle: peopleNested[1], kind: 'detail', nav: 'people' };
  }

  const counsellingDetail = route.match(/^\/admin\/people\/counselling\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (counsellingDetail) {
    const template = adminScreens.find((screen) => screen.id === 'F-14');
    if (!template) return undefined;
    return { ...template, route, title: 'Counselling case', subtitle: counsellingDetail[1], kind: 'restricted' };
  }

  const kcaApplicationDecision = route.match(/^\/admin\/kca\/applications\/([^/]+)\/decision$/);
  if (kcaApplicationDecision) {
    const template = adminScreens.find((screen) => screen.id === 'G-12');
    if (!template) return undefined;
    return {
      ...template,
      route,
      title: 'Admission Decision',
      subtitle: 'Review the live application and submit an admission decision.',
    };
  }

  const kcaApplicationDetail = route.match(/^\/admin\/kca\/applications\/([^/]+)$/);
  if (kcaApplicationDetail && kcaApplicationDetail[1] !== 'samuel-david') {
    const template = adminScreens.find((screen) => screen.id === 'G-03');
    if (!template) return undefined;
    return {
      ...template,
      route,
      title: 'Application Review',
      subtitle: 'Live KCA applicant profile and section progress.',
    };
  }

  const homeChurchDecision = route.match(/^\/admin\/home-churches\/applications\/([^/]+)\/decision$/);
  if (homeChurchDecision) {
    const template = adminScreens.find((screen) => screen.id === 'D-05');
    if (!template) return undefined;
    return {
      ...template,
      route,
      title: 'Application Decision',
      subtitle: 'Submit a live home church application transition.',
      kind: 'workflow',
    };
  }

  const homeChurchReview = route.match(/^\/admin\/home-churches\/applications\/([^/]+)\/review$/);
  if (homeChurchReview) {
    const template = adminScreens.find((screen) => screen.id === 'D-04');
    if (!template) return undefined;
    return { ...template, route, kind: 'workflow', title: 'Review Application', subtitle: homeChurchReview[1] };
  }

  const homeChurchActivation = route.match(/^\/admin\/home-churches\/applications\/([^/]+)\/activation$/);
  if (homeChurchActivation) {
    const template = adminScreens.find((screen) => screen.id === 'D-06');
    if (!template) return undefined;
    return { ...template, route, subtitle: homeChurchActivation[1] };
  }

  const homeChurchApplicationDetail = route.match(/^\/admin\/home-churches\/applications\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (homeChurchApplicationDetail) {
    const template = adminScreens.find((screen) => screen.id === 'D-03');
    if (!template) return undefined;
    return { ...template, route, title: 'Home Church Application', subtitle: homeChurchApplicationDetail[1], kind: 'detail' };
  }

  const homeChurchNested = route.match(/^\/admin\/home-churches\/([0-7][0-9A-HJKMNP-TV-Z]{25})(?:\/(members|attendance|activities|needs|finance|status))?$/i);
  if (homeChurchNested) {
    const suffix = homeChurchNested[2];
    const idMap: Record<string, string> = {
      members: 'D-09',
      attendance: 'D-10',
      activities: 'D-11',
      needs: 'D-12',
      finance: 'D-13',
      status: 'D-14',
    };
    const template = adminScreens.find((screen) => screen.id === (suffix ? idMap[suffix] : 'D-08'));
    if (!template) return undefined;
    return { ...template, route, subtitle: homeChurchNested[1] };
  }

  const financeTransactionDetail = route.match(/^\/admin\/finance\/transactions\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (financeTransactionDetail) {
    const template = adminScreens.find((screen) => screen.id === 'K-03') ?? adminScreens.find((screen) => screen.route === '/admin/finance/transactions');
    if (!template) return undefined;
    return {
      ...template,
      id: 'K-03',
      route,
      kind: 'detail',
      title: 'Transaction Detail',
      subtitle: financeTransactionDetail[1],
      action: 'Send Receipt',
      details: {
        'Transaction ID': financeTransactionDetail[1],
        Status: 'Loading',
      },
    };
  }

  const safeguardingCaseDetail = route.match(/^\/admin\/security\/safeguarding\/cases\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (safeguardingCaseDetail) {
    const template = adminScreens.find((screen) => screen.id === 'O-10')
      ?? adminScreens.find((screen) => screen.route === '/admin/security/safeguarding/cases');
    if (!template) return undefined;
    return {
      ...template,
      id: 'O-10',
      route,
      kind: 'restricted',
      title: 'Safeguarding Case',
      subtitle: safeguardingCaseDetail[1],
      rows: undefined,
      details: {
        Type: 'Loading',
        Status: 'Loading',
        'Reference Code': safeguardingCaseDetail[1],
      },
    };
  }

  const auditEventDetail = route.match(/^\/admin\/security\/audit-logs\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (auditEventDetail) {
    const template = adminScreens.find((screen) => screen.id === 'O-03')
      ?? adminScreens.find((screen) => screen.route === '/admin/security/audit-logs');
    if (!template) return undefined;
    return {
      ...template,
      id: 'O-03',
      route,
      kind: 'detail',
      title: 'Audit Detail',
      subtitle: auditEventDetail[1],
      action: 'Download',
      details: {
        Action: 'Loading',
        Resource: auditEventDetail[1],
      },
    };
  }

  const countryLocalAreas = route.match(/^\/admin\/geography\/countries\/([^/]+)\/local-areas$/);
  if (countryLocalAreas) {
    const template = adminScreens.find((screen) => screen.id === 'C-18');
    if (!template) return undefined;
    return { ...template, route, title: 'Local Areas', subtitle: `Child administrative units for ${countryLocalAreas[1]}.` };
  }

  const countryLevels = route.match(/^\/admin\/geography\/countries\/([^/]+)\/levels$/);
  if (countryLevels) {
    const template = adminScreens.find((screen) => screen.id === 'C-04');
    if (!template) return undefined;
    return { ...template, route, title: 'Administrative Level Configuration', subtitle: `Configure administrative levels for ${countryLevels[1]}.` };
  }

  const countryRegions = route.match(/^\/admin\/geography\/countries\/([^/]+)\/regions$/);
  if (countryRegions) {
    const template = adminScreens.find((screen) => screen.id === 'C-05');
    if (!template) return undefined;
    return { ...template, route, title: 'Regions / States', subtitle: `Root administrative units for ${countryRegions[1]}.` };
  }

  const countryDetail = route.match(/^\/admin\/geography\/countries\/([^/]+)$/);
  if (countryDetail && countryDetail[1] !== 'nigeria') {
    const template = adminScreens.find((screen) => screen.id === 'C-03');
    if (!template) return undefined;
    return { ...template, route, title: countryDetail[1].toUpperCase(), subtitle: 'Country profile and organization statistics.' };
  }

  const unitChildren = route.match(/^\/admin\/geography\/units\/([^/]+)\/local-areas$/);
  if (unitChildren) {
    const template = adminScreens.find((screen) => screen.id === 'C-07');
    if (!template) return undefined;
    return { ...template, route, title: 'Local Areas', subtitle: 'Child administrative units.' };
  }

  const unitDetail = route.match(/^\/admin\/geography\/units\/([^/]+)$/);
  if (unitDetail) {
    const template = adminScreens.find((screen) => screen.id === 'C-06');
    if (!template) return undefined;
    return { ...template, route, title: 'Administrative Unit', subtitle: 'Regional organization profile.', kind: 'detail' };
  }

  const locationDetail = route.match(/^\/admin\/geography\/locations\/([^/]+)$/);
  if (locationDetail && locationDetail[1] !== 'ikeja-ward-a') {
    const template = adminScreens.find((screen) => screen.id === 'C-11');
    if (!template) return undefined;
    return { ...template, route, title: 'Location', subtitle: 'Location overview and map boundary.', kind: 'map' };
  }

  const organizationDetail = route.match(/^\/admin\/geography\/organizations\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (organizationDetail) {
    const template = adminScreens.find((screen) => screen.id === 'C-19');
    if (!template) return undefined;
    return { ...template, route, title: 'Organization', subtitle: organizationDetail[1], kind: 'detail' };
  }

  const pressPublicationDetail = route.match(/^\/admin\/press\/publications\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (pressPublicationDetail) {
    const template = adminScreens.find((screen) => screen.id === 'J-03');
    if (!template) return undefined;
    return {
      ...template,
      route,
      title: 'Publication',
      subtitle: pressPublicationDetail[1],
      kind: 'detail',
      details: {
        Status: 'Loading',
        'Publication ID': pressPublicationDetail[1],
      },
    };
  }

  const pressAuthorDetail = route.match(/^\/admin\/press\/authors\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (pressAuthorDetail) {
    const template = adminScreens.find((screen) => screen.id === 'J-06');
    if (!template) return undefined;
    return { ...template, route, title: 'Author', subtitle: pressAuthorDetail[1], kind: 'profile' };
  }

  const churchNested = route.match(/^\/admin\/churches\/([0-7][0-9A-HJKMNP-TV-Z]{25})(?:\/(edit|leadership|members|first-timers|converts|disciples|workers|departments|small-groups|evangelism|attendance|reports|finance|settings))?$/i);
  if (churchNested) {
    const suffix = churchNested[2];
    const idMap: Record<string, string> = {
      edit: 'E-04',
      leadership: 'E-05',
      members: 'E-06',
      'first-timers': 'E-07',
      converts: 'E-08',
      disciples: 'E-09',
      workers: 'E-10',
      departments: 'E-11',
      'small-groups': 'E-12',
      evangelism: 'E-13',
      attendance: 'E-30',
      reports: 'E-14',
      finance: 'E-15',
      settings: 'E-16',
    };
    const template = adminScreens.find((screen) => screen.id === (suffix ? idMap[suffix] : 'E-03'));
    if (!template) return undefined;
    return { ...template, route, subtitle: churchNested[1], kind: suffix === 'edit' ? 'wizard' : template.kind };
  }

  const userNested = route.match(/^\/admin\/users\/([0-7][0-9A-HJKMNP-TV-Z]{25})(?:\/(edit|sessions|profile))?$/i);
  if (userNested && userNested[1] !== 'john-chinedu-doe') {
    const suffix = userNested[2];
    const template = adminScreens.find((screen) => screen.id === (suffix === 'edit' ? 'B-04' : suffix === 'sessions' ? 'B-06' : suffix === 'profile' ? 'B-05' : 'B-02'));
    if (!template) return undefined;
    return { ...template, route, title: suffix === 'edit' ? 'Edit User' : suffix === 'sessions' ? 'User Sessions' : 'User', subtitle: userNested[1], kind: suffix === 'edit' ? 'wizard' : suffix === 'sessions' ? 'table' : 'detail' };
  }

  const roleDetail = route.match(/^\/admin\/roles\/([0-7][0-9A-HJKMNP-TV-Z]{25})$/i);
  if (roleDetail) {
    const template = adminScreens.find((screen) => screen.id === 'B-08');
    if (!template) return undefined;
    return { ...template, route, title: 'Role', subtitle: roleDetail[1], kind: 'detail' };
  }

  return undefined;
}
