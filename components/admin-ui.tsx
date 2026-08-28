'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { hasAdministratorCapabilities, type AccessDecision } from '../lib/access-control';
import {
  challengeMfa,
  formatAuthError,
  isAuthApiConfigured,
  loginBrowserUser,
  logoutBrowserUser,
} from '../lib/auth-api';
import { fetchUserCapabilities } from '../lib/user-api';
import { adminScreens, type AdminScreen, type Metric } from '../lib/admin-routes';
import {
  AdminIdentityApiError,
  type AdminAccessDecision,
  type AdminAuditEvent,
  type AdminPermission,
  type AdminProfile,
  type AdminRole,
  type AdminScopeAssignment,
  type AdminUser,
  assignAdminRoleAssignmentScope,
  assignAdminUserRole,
  defaultAdminScope,
  fetchAdminProfile,
  formatAccountStatus,
  formatTimestamp,
  grantAdminRolePermission,
  identityApiConfigured,
  initialsFromAdminProfile,
  listAdminAccessDecisions,
  listAdminAuditEvents,
  listAdminPermissions,
  listAdminRoles,
  listAdminScopeAssignments,
  listAdminUsers,
  reactivateAdminUser,
  shouldUseDesignFixtures,
  shouldUseIdentityLiveData,
  suspendAdminUser,
} from '../lib/admin-identity-api';
import { KcaScreenContent } from './kca-ui';
import { MissionScreenContent } from './mission-ui';
import { PlatformScreenContent, DemoDatasetBanner } from './platform-ui';
import {
  breakdownToItems,
  dashboardModuleForScreen,
  formatRelativeTime,
} from '../lib/admin-dashboard-api';
import { useAdminDashboard } from '../lib/use-admin-dashboard';
import { AdminInteractionShell } from './admin-interaction-shell';
import { getAdminBreadcrumbs, getInteractionRouteMap, type AdminBreadcrumb } from '../lib/admin-navigation';
import { AppBrand } from './app-brand';
import { BrandingSettingsPanel } from './branding-settings-panel';
import { MapsSettingsPanel } from './maps-settings-panel';
import { PaymentsSettingsPanel } from './payments-settings-panel';
import { CommunicationsSettingsPanel } from './communications-settings-panel';
import { KcaSettingsPanel } from './platform-ui';
import { InteractiveMap } from './interactive-map';
import { HierarchyTreeView } from './hierarchy-tree-view';
import { SearchSelect } from './search-select';
import { TableRowActions } from './table-row-actions';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { getAdminModuleForRoute } from '../lib/admin-modules';
import { resolveEntityKey } from '../lib/admin-form-schemas';
import { catalogOptions, churchTypeOptions, statusOptions } from '../lib/form-catalogs';
import {
  assignPrayerRequest,
  completeFollowUpTask,
  createChurch,
  defaultOpsScope,
  listPastoralNeeds,
  listPrayerRequests,
  loadOpsDataset,
  operationsErrorMessage,
  opsRecordsToRows,
  registerFirstTimer,
  resolveOpsDataset,
  shouldUseOperationsLiveData,
  transitionHomeChurchApplication,
  transitionPastoralNeed,
  transitionPrayerRequest,
  type OpsDatasetKey,
  type PastoralNeedRecord,
  type PrayerRequestRecord,
} from '../lib/admin-operations-api';
import {
  countriesToSelectOptions,
  listCountries,
  listUnits,
  organizationErrorMessage,
  shouldUseOrganizationFixtures,
  unitsToSelectOptions,
  type AdminCountry,
  type AdminAdministrativeUnit,
} from '../lib/admin-organization-api';
import {
  catalogErrorMessage,
  catalogRecordsToRows,
  listCatalogDomain,
  resolveCatalogDataset,
  shouldUseCatalogLiveData,
} from '../lib/admin-catalog-api';
import { useLocale } from '@/components/locale-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';

const CATALOG_FEED_COLUMNS = ['Item', 'Detail', 'Time'];

type AdminTranslate = (key: string, options?: { defaultMessage?: string; vars?: Record<string, string | number> }) => string;

function adminChromeKey(label: string): string {
  switch (label) {
    case 'Dashboard':
      return 'common.dashboard';
    case 'Settings':
      return 'common.settings';
    case 'Search':
      return 'common.search';
    case 'Filters':
      return 'common.filters';
    case 'Save':
      return 'common.save';
    case 'Cancel':
      return 'common.cancel';
    case 'Logout':
      return 'common.logout';
    case 'Submit':
      return 'common.submit';
    case 'Back':
      return 'common.back';
    case 'Next':
      return 'common.next';
    case 'Church':
      return 'nav.church';
    case 'Mission':
      return 'nav.mission';
    case 'KCA':
      return 'nav.kca';
    case 'Press':
      return 'nav.press';
    case 'Events':
      return 'nav.events';
    case 'Notifications':
      return 'common.notifications';
    case 'Translations':
      return 'admin.translations';
    case 'View':
      return 'common.view';
    case 'Edit':
      return 'common.edit';
    case 'Delete':
      return 'common.delete';
    default: {
      const slug = label
        .replace(/&/g, ' And ')
        .replace(/[^A-Za-z0-9]+(.)/g, (_, char: string) => char.toUpperCase())
        .replace(/[^A-Za-z0-9]/g, '');
      return `admin.${slug.charAt(0).toLowerCase()}${slug.slice(1)}`;
    }
  }
}

function adminChrome(t: AdminTranslate, label: string): string {
  return t(adminChromeKey(label), { defaultMessage: label });
}

const navByBatch = {
  A: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['scope', '◎', 'Global Scope', '/admin/scope'], ['command', '⌕', 'Command Centre', '/admin/command'],
    ['approvals', '✓', 'Approvals', '/admin/approvals'], ['alerts', '!', 'Alerts', '/admin/alerts'], ['notifications', '•', 'Notifications', '/admin/notifications'],
    ['activity', '↻', 'Activity', '/admin/activity'], ['audit', '▦', 'Audit', '/admin/audit'], ['tasks', '□', 'Tasks', '/admin/tasks'],
    ['reports', '▣', 'Reports', '/admin/kpi'], ['settings', '◇', 'Settings', '/admin/geography/settings'],
  ],
  B: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['scope', '◎', 'Global Scope', '/admin/scope'], ['command', '⌕', 'Command Centre', '/admin/command'],
    ['users', '♙', 'Users', '/admin/users'], ['access', '◉', 'Roles & Permissions', '/admin/roles'], ['approvals', '✓', 'Approvals', '/admin/approvals'],
    ['activity', '▤', 'Content', '/admin/activity'], ['geography', '□', 'Churches', '/admin/geography/church-hierarchy'], ['tasks', '□', 'Events', '/admin/tasks'],
    ['reports', '▣', 'Giving', '/admin/kpi'], ['reports', '▣', 'Reports', '/admin/reports/country-performance'], ['settings', '◇', 'Settings', '/admin/geography/settings'],
  ],
  C: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['users', '♙', 'Users', '/admin/users'], ['access', '◉', 'Roles & Permissions', '/admin/roles'],
    ['geography', '◎', 'Geography', '/admin/geography'], ['geography', '↳', 'Global Dashboard', '/admin/geography'], ['geography', '·', 'Countries', '/admin/geography/countries'],
    ['geography', '·', 'Regions / States', '/admin/geography/countries/nigeria/regions'], ['geography', '·', 'Local Areas', '/admin/geography/countries/nigeria/regions/lagos/local-areas'],
    ['geography', '·', 'Hierarchy Tree', '/admin/geography/hierarchy'], ['geography', '▦', 'Organizations', '/admin/geography/church-hierarchy'],
    ['geography', '◊', 'Church Hierarchy', '/admin/geography/church-hierarchy'], ['geography', '◊', 'Home Church Hierarchy', '/admin/geography/home-church-hierarchy'],
    ['reports', '▣', 'Reports', '/admin/geography/reports'], ['settings', '◇', 'Settings', '/admin/geography/settings'],
  ],
  D: [
    ['dashboard', '⌂', 'Dashboard', '/admin/home-churches/dashboard'], ['applications', '▤', 'Applications', '/admin/home-churches/applications'],
    ['home-churches', '▣', 'Home Churches', '/admin/home-churches'], ['leaders', '♙', 'Leaders', '/admin/home-churches/grace-home-church'],
    ['members', '◉', 'Members', '/admin/home-churches/grace-home-church/members'], ['attendance', '▦', 'Attendance', '/admin/home-churches/grace-home-church/attendance'],
    ['activities', '◇', 'Activities', '/admin/home-churches/grace-home-church/activities'], ['needs', '□', 'Needs', '/admin/home-churches/grace-home-church/needs'],
    ['finance', '₦', 'Finance', '/admin/home-churches/grace-home-church/finance'], ['reports', '▤', 'Reports', '/admin/home-churches/grace-home-church/finance'],
    ['settings', '⚙', 'Settings', '/admin/home-churches/grace-home-church/status'],
  ],
  E: [
    ['dashboard', '⌂', 'Dashboard', '/admin/church/dashboard'], ['churches', '▣', 'Churches', '/admin/churches'],
    ['leaders', '♛', 'Leadership', '/admin/churches/the-covenant-place/leadership'], ['members', '◉', 'Members', '/admin/churches/the-covenant-place/members'],
    ['first-timers', '◇', 'First Timers', '/admin/churches/the-covenant-place/first-timers'], ['converts', '✓', 'Converts', '/admin/churches/the-covenant-place/converts'],
    ['discipleship', '◎', 'Disciples', '/admin/churches/the-covenant-place/disciples'], ['workers', '♙', 'Workers', '/admin/churches/the-covenant-place/workers'],
    ['departments', '▦', 'Departments', '/admin/churches/the-covenant-place/departments'],
    ['small-groups', '◎', 'Small Groups', '/admin/churches/the-covenant-place/small-groups'], ['evangelism', '◇', 'Evangelism', '/admin/churches/the-covenant-place/evangelism'],
    ['finance', '₦', 'Finance', '/admin/churches/the-covenant-place/finance'], ['reports', '▤', 'Reports', '/admin/churches/the-covenant-place/reports'],
    ['settings', '⚙', 'Settings', '/admin/churches/the-covenant-place/settings'],
  ],
  F: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['people', '◉', 'People', '/admin/people'], ['first-timers', '◇', 'First Timers', '/admin/people/first-timers'],
    ['follow-up', '↻', 'Follow-Up', '/admin/people/follow-up'], ['converts', '✓', 'Converts', '/admin/people/converts/mary-okafor'],
    ['discipleship', '◎', 'Discipleship', '/admin/people/journeys/membership/john-emmanuel'], ['membership', '▦', 'Membership', '/admin/people/journeys/membership/john-emmanuel'],
    ['workers', '♙', 'Workers', '/admin/people/journeys/worker/blessing-friday'], ['leaders', '♛', 'Leaders', '/admin/people/journeys/leadership/peter-okafor'],
    ['ministry-history', '▤', 'Ministry History', '/admin/people/ministry-history'], ['prayer', '◇', 'Prayer', '/admin/people/prayer-requests'],
    ['needs', '□', 'Needs', '/admin/people/needs'], ['counselling', '◌', 'Counselling', '/admin/people/counselling'],
    ['testimonies', '✦', 'Testimonies', '/admin/people/testimonies'], ['safeguarding', '!', 'Safeguarding', '/admin/people/safeguarding/escalation'],
    ['reports', '▣', 'Reports', '/admin/reports/country-performance'], ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  G: [
    ['dashboard', '⌂', 'Dashboard', '/admin/kca'], ['kca-applications', '▤', 'Applications', '/admin/kca/applications'],
    ['kca-review', '↻', 'Review Queue', '/admin/kca/review-queue'], ['kca-decisions', '✓', 'Decisions', '/admin/kca/applications/samuel-david/decision'],
    ['kca-students', '♙', 'Students', '/admin/kca/students'], ['kca-cohorts', '◎', 'Cohorts', '/admin/kca/cohorts'],
    ['kca-mentors', '♛', 'Mentors', '/admin/kca/mentors'], ['kca-lecturers', '▦', 'Lecturers', '/admin/kca/lecturers'],
    ['kca-modules', '◇', 'Modules', '/admin/kca/modules'], ['kca-learning', '▣', 'Learning', '/admin/kca/attendance'],
    ['kca-assessments', '□', 'Assessments', '/admin/kca/assessments/final'], ['kca-certification', '✓', 'Certifications', '/admin/kca/certificates'],
    ['kca-alumni', '♙', 'Alumni', '/admin/kca/alumni'], ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  H: [
    ['dashboard', '⌂', 'Dashboard', '/admin/kca'], ['kca-students', '♙', 'Students', '/admin/kca/students'],
    ['kca-cohorts', '◎', 'Cohorts', '/admin/kca/cohorts'], ['kca-years', '▥', 'KCA Years', '/admin/kca/years'],
    ['kca-mentors', '♛', 'Mentors', '/admin/kca/mentors'], ['kca-lecturers', '▦', 'Lecturers', '/admin/kca/lecturers'],
    ['kca-modules', '◇', 'Modules', '/admin/kca/modules'], ['kca-learning', '▣', 'Learning', '/admin/kca/attendance'],
    ['kca-assessments', '□', 'Assessments', '/admin/kca/assessments/final'], ['kca-certification', '✓', 'Certification', '/admin/kca/certificates'],
    ['kca-alumni', '♙', 'Alumni', '/admin/kca/alumni'], ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  I: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['mission', '◇', 'Mission', '/admin/mission'],
    ['crusades', '▣', 'Crusades', '/admin/mission/crusades'], ['souls', '♙', 'Souls', '/admin/mission/souls'],
    ['mission-follow-up', '↻', 'Follow-Up', '/admin/mission/follow-up'], ['partners', '◎', 'Partners', '/admin/mission/partners'],
    ['reports', '▤', 'Reports', '/admin/mission/reports'], ['ai-assistant', '✦', 'AI Assistant', '/admin/mission/ai-assistant'],
    ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  J: [
    ['press', '⌂', 'Dashboard', '/admin/press'], ['publications', '▣', 'Publications', '/admin/press/publications'],
    ['authors', '♙', 'Authors', '/admin/press/authors'], ['manuscripts', '▤', 'Manuscripts', '/admin/press/manuscripts'],
    ['manuscripts', '✓', 'Reviews', '/admin/press/manuscripts/power-of-covenant/editorial-review'], ['assets', '◇', 'Design', '/admin/press/assets'],
    ['distribution', '◎', 'Distribution', '/admin/press/distribution'], ['publications', '▦', 'Catalogue', '/admin/press/catalogue'],
    ['translations', '文', 'Translations', '/admin/press/translations'],
    ['press-sales', '₦', 'Sales', '/admin/press/sales'], ['press-analytics', '▤', 'Analytics', '/admin/press/analytics'],
    ['settings', '⚙', 'Settings', '/admin/settings/press'],
  ],
  K: [
    ['finance', '⌂', 'Dashboard', '/admin/finance'], ['finance-transactions', '▤', 'Transactions', '/admin/finance/transactions'],
    ['finance-reconciliation', '✓', 'Reconciliation', '/admin/finance/reconciliation'], ['finance-payments', '₦', 'Payments', '/admin/finance/event-payments'],
    ['finance-transactions', '▧', 'Receipts', '/admin/finance/receipts'], ['finance-transactions', '↻', 'Refunds', '/admin/finance/refunds'],
    ['finance-transactions', '!', 'Disputes', '/admin/finance/disputes'], ['finance-reports', '▤', 'Reports', '/admin/finance/reports'],
    ['finance-providers', '◇', 'Providers', '/admin/finance/providers'],
    ['finance-alerts', '◇', 'Alerts', '/admin/finance/alerts'], ['settings', '⚙', 'Settings', '/admin/settings/payments'],
  ],
  L: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['people', '♙', 'People', '/admin/people'], ['churches', '▣', 'Churches', '/admin/churches'],
    ['home-churches', '◎', 'Home Churches', '/admin/home-churches'], ['mission', '◇', 'Missions', '/admin/mission'], ['kca', '▦', 'KCA', '/admin/kca'],
    ['press', '▤', 'Press', '/admin/press'], ['finance', '₦', 'Finance', '/admin/finance'], ['communications', '◉', 'Communications', '/admin/communications'],
    ['reports', '▣', 'Reports & Analytics', '/admin/reports'], ['security', '!', 'Security', '/admin/security'], ['platform-settings', '⚙', 'Platform Settings', '/admin/settings/platform'],
  ],
  M: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['people', '♙', 'People', '/admin/people'], ['churches', '▣', 'Churches', '/admin/churches'],
    ['communications', '◉', 'Communications', '/admin/communications'], ['communications', '▤', 'Notifications', '/admin/communications/notifications'],
    ['communications', '✉', 'Broadcast', '/admin/communications/broadcasts/create'], ['communications', '◎', 'Audience', '/admin/communications/audiences/create'],
    ['communications', '◇', 'Announcements', '/admin/communications/announcements/create'], ['communications', '▤', 'Newsletter', '/admin/communications/newsletters/may-update'],
    ['communications', '@', 'Email', '/admin/communications/email/create'], ['communications', '◌', 'SMS', '/admin/communications/sms/create'],
    ['communications', '◉', 'WhatsApp', '/admin/communications/whatsapp/create'], ['communications', '↗', 'Push', '/admin/communications/push/create'],
    ['communications', '▣', 'In-App', '/admin/communications/in-app/create'], ['templates', '▦', 'Templates', '/admin/communications/templates'],
    ['communications', '↻', 'Delivery Queue', '/admin/communications/delivery-queue'], ['communications', '▤', 'Delivery Report', '/admin/communications/delivery-report'],
    ['communications', '!', 'Failed Messages', '/admin/communications/failed'], ['settings', '⚙', 'Settings', '/admin/communications/settings'],
  ],
  N: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['reports', '▣', 'Global Reports', '/admin/reports'], ['reports', '▤', 'Church Analytics', '/admin/reports/churches'],
    ['reports', '◎', 'Home Church Analytics', '/admin/reports/home-churches'], ['reports', '♙', 'Membership', '/admin/reports/membership'],
    ['reports', '◇', 'First Timers', '/admin/reports/first-timers'], ['reports', '✦', 'Evangelism', '/admin/reports/evangelism'],
    ['reports', '⌖', 'Missions', '/admin/reports/missions'], ['reports', '▦', 'KCA', '/admin/reports/kca'],
    ['reports', '♛', 'Mentors', '/admin/reports/mentors'], ['reports', '▤', 'Press', '/admin/reports/press'],
    ['reports', '₦', 'Finance', '/admin/reports/finance'], ['reports', '◎', 'Countries', '/admin/reports/countries'],
    ['reports', '⌘', 'Territories', '/admin/reports/territories'], ['reports', '↗', 'Trends', '/admin/reports/trends'],
    ['report-ai', '✦', 'Pastoral AI', '/admin/reports/pastoral-ai'], ['report-ai', '✦', 'Press AI', '/admin/reports/press-ai'],
  ],
  O: [
    ['dashboard', '⌂', 'Dashboard', '/admin'], ['security', '!', 'Security', '/admin/security'], ['audit', '▤', 'Audit Logs', '/admin/security/audit-logs'],
    ['security', '↻', 'Login History', '/admin/security/login-history'], ['security', '✓', 'Access Decisions', '/admin/security/access-decisions'],
    ['security', '!', 'Security Alerts', '/admin/security/alerts'], ['security', '▦', 'Data Classification', '/admin/security/data-classification'],
    ['safeguarding', '◇', 'Safeguarding', '/admin/security/safeguarding'], ['safeguarding', '▣', 'Cases', '/admin/security/safeguarding/cases'],
    ['safeguarding', '♙', 'Child Profiles', '/admin/security/child-profiles'], ['safeguarding', '✓', 'Guardian Consent', '/admin/security/guardian-consent'],
    ['security', '⊘', 'Restrictions', '/admin/security/communication-restrictions'], ['security', '▤', 'Pastoral Records', '/admin/security/pastoral-records'],
    ['security', '◉', 'Restricted Access', '/admin/security/restricted-access'], ['privacy', '↗', 'Data Exports', '/admin/security/data-export-requests'],
    ['privacy', '×', 'Data Deletion', '/admin/security/data-deletion-requests'], ['privacy', '▦', 'Privacy Requests', '/admin/security/privacy-requests'],
    ['settings', '⚙', 'Configuration', '/admin/security/configuration'],
  ],
} as const;

type NavBatch = keyof typeof navByBatch;
type EnterpriseNavItem = { icon: string; label: string; href: string };
type EnterpriseNavGroup = { id: string; icon: string; label: string; items: EnterpriseNavItem[] };

function navItems(batches: NavBatch[], excludedLabels: string[] = []): EnterpriseNavItem[] {
  const seen = new Set<string>();
  const items: EnterpriseNavItem[] = [];
  batches.forEach((batch) => {
    const entries = navByBatch[batch] as readonly (readonly [string, string, string, string])[];
    entries.forEach(([, icon, label, href]) => {
      if (excludedLabels.includes(label) || seen.has(href)) return;
      seen.add(href);
      items.push({ icon, label, href });
    });
  });
  return items;
}

const dashboardItems: EnterpriseNavItem[] = [
  { icon: '◆', label: 'Global Admin', href: '/admin' },
  { icon: '◎', label: 'Geography', href: '/admin/geography' },
  { icon: '⌂', label: 'Home Churches', href: '/admin/home-churches/dashboard' },
  { icon: '▣', label: 'Church', href: '/admin/church/dashboard' },
  { icon: '◇', label: 'KCA', href: '/admin/kca' },
  { icon: '⌖', label: 'Mission', href: '/admin/mission' },
  { icon: '▤', label: 'Press', href: '/admin/press' },
  { icon: '₦', label: 'Finance', href: '/admin/finance' },
  { icon: '◉', label: 'Communications', href: '/admin/communications' },
  { icon: '▦', label: 'Reports & Analytics', href: '/admin/reports' },
  { icon: '!', label: 'Security', href: '/admin/security' },
];

const reportItems: EnterpriseNavItem[] = [
  ...navItems(['N'], ['Dashboard']),
  { icon: '⌂', label: 'Home Church Reports', href: '/admin/home-churches/grace-home-church/finance' },
  { icon: '▣', label: 'Church Reports', href: '/admin/churches/the-covenant-place/reports' },
  { icon: '⌖', label: 'Mission Reports', href: '/admin/mission/reports' },
  { icon: '▤', label: 'Press Analytics', href: '/admin/press/analytics' },
  { icon: '₦', label: 'Finance Reports', href: '/admin/finance/reports' },
  { icon: '✉', label: 'Delivery Reports', href: '/admin/communications/delivery-report' },
];

const enterpriseNavGroups: EnterpriseNavGroup[] = [
  { id: 'dashboards', icon: '⌂', label: 'Dashboards', items: dashboardItems },
  { id: 'administration', icon: '◆', label: 'Administration', items: navItems(['A', 'B'], ['Dashboard', 'Reports', 'Settings', 'Churches', 'Events', 'Giving', 'Content']) },
  { id: 'geography', icon: '◎', label: 'Geography', items: navItems(['C'], ['Dashboard', 'Users', 'Roles & Permissions', 'Reports', 'Settings']) },
  { id: 'home-churches', icon: '⌂', label: 'Home Churches', items: navItems(['D'], ['Dashboard', 'Reports', 'Settings', 'Finance']) },
  { id: 'churches', icon: '▣', label: 'Churches', items: navItems(['E'], ['Dashboard', 'Reports', 'Settings', 'Finance']) },
  { id: 'people', icon: '♙', label: 'People', items: navItems(['F'], ['Dashboard', 'Reports', 'Settings']) },
  { id: 'kca', icon: '◇', label: 'KCA', items: navItems(['G', 'H'], ['Dashboard', 'Settings']) },
  { id: 'mission', icon: '⌖', label: 'Mission', items: navItems(['I'], ['Dashboard', 'Reports', 'Settings']) },
  { id: 'press', icon: '▤', label: 'Press', items: navItems(['J'], ['Dashboard', 'Analytics', 'Settings']) },
  { id: 'finance', icon: '₦', label: 'Finance', items: navItems(['K'], ['Dashboard', 'Reports', 'Settings']) },
  { id: 'communications', icon: '✉', label: 'Communications', items: navItems(['M'], ['Dashboard', 'Delivery Report', 'Settings', 'People', 'Churches']) },
  { id: 'reports', icon: '▦', label: 'Reports', items: reportItems },
  { id: 'security', icon: '!', label: 'Security', items: navItems(['O'], ['Dashboard']) },
  { id: 'settings', icon: '⚙', label: 'Settings', items: [
    { icon: '◆', label: 'Platform', href: '/admin/settings/platform' },
    { icon: '▣', label: 'Branding', href: '/admin/settings/branding' },
    { icon: '⌂', label: 'Home Church Rules', href: '/admin/home-churches/grace-home-church/status' },
    { icon: '▣', label: 'Church Settings', href: '/admin/churches/the-covenant-place/settings' },
    { icon: '◇', label: 'KCA Settings', href: '/admin/settings/kca' },
    { icon: '⌖', label: 'Mission Settings', href: '/admin/settings/mission' },
    { icon: '▤', label: 'Press Settings', href: '/admin/settings/press' },
    { icon: '₦', label: 'Payment Settings', href: '/admin/settings/payments' },
    { icon: '✉', label: 'Communication Settings', href: '/admin/communications/settings' },
    { icon: '!', label: 'Security Configuration', href: '/admin/security/configuration' },
    { icon: '◎', label: 'Geography Settings', href: '/admin/geography/settings' },
  ] },
];

function Brand({ dark = true }: { dark?: boolean }) {
  return <AppBrand variant="admin" dark={dark} />;
}

function Sidebar({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const allItems = enterpriseNavGroups.flatMap((group) => group.items);
  const exact = allItems.filter((item) => item.href === screen.route);
  const prefix = allItems.filter((item) => item.href !== '/admin' && screen.route.startsWith(`${item.href}/`)).sort((left, right) => right.href.length - left.href.length);
  const activeHref = (exact[0] ?? prefix[0])?.href;
  return <aside className="admin-sidebar" id="admin-primary-navigation"><Link href="/admin" className="sidebar-brand-link" aria-label="Family House Connect admin home"><Brand /></Link><nav className="nav-list enterprise-nav" aria-label={t('admin.enterpriseNavAria', { defaultMessage: 'Enterprise administration navigation' })}>{enterpriseNavGroups.map((group) => {
    const groupActive = group.items.some((item) => item.href === activeHref);
    const groupLabel = adminChrome(t, group.label);
    return <details className={`enterprise-nav-group ${groupActive ? 'active' : ''}`} data-nav-group={group.id} data-nav-active={groupActive ? 'true' : 'false'} open={groupActive} key={group.id}>
      <summary data-nav-group-summary={group.id} aria-label={`${groupLabel} menu`}><span className="nav-icon" aria-hidden="true">{group.icon}</span><span className="nav-group-label">{groupLabel}</span><span className="nav-chevron" aria-hidden="true">⌄</span></summary>
      <div className="enterprise-nav-items">{group.items.map((item) => {
        const active = item.href === activeHref;
        const itemLabel = adminChrome(t, item.label);
        return <Link className={`nav-item nav-subitem ${active ? 'active' : ''}`} href={item.href} key={`${group.id}-${item.href}`} aria-label={`${groupLabel}: ${itemLabel}`} aria-current={active ? 'page' : undefined}><span className="nav-icon nav-subicon" aria-hidden="true">{item.icon}</span><span className="nav-label">{itemLabel}</span></Link>;
      })}</div>
    </details>;
  })}</nav></aside>;
}

function Topbar({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const adminModule = getAdminModuleForRoute(screen.route);
  const allModules = t('admin.allModules', { defaultMessage: 'All modules' });
  const previewDirectory = t('admin.previewDirectory', { defaultMessage: 'Preview directory' });
  const previewDirectoryAria = t('admin.previewDirectoryAria', { defaultMessage: 'Preview-only screen directory' });
  const liveProfile = shouldUseIdentityLiveData();
  const [avatarInitials, setAvatarInitials] = useState(() => (liveProfile ? '…' : 'JD'));

  useEffect(() => {
    if (!liveProfile) {
      setAvatarInitials('JD');
      return;
    }
    let cancelled = false;
    void fetchAdminProfile()
      .then((profile) => {
        if (!cancelled) setAvatarInitials(initialsFromAdminProfile(profile));
      })
      .catch(() => {
        if (!cancelled) setAvatarInitials('AD');
      });
    return () => {
      cancelled = true;
    };
  }, [liveProfile]);

  return <header className="topbar"><button className="top-icon navigation-toggle" type="button" aria-label={t('admin.toggleNavigation', { defaultMessage: 'Toggle navigation' })} aria-controls="admin-primary-navigation" aria-expanded="false" data-admin-intent="toggle-navigation">☰</button><button className="module-launcher-button" type="button" aria-label={allModules} data-admin-intent="module-launcher" aria-controls="admin-module-launcher" aria-expanded="false"><span aria-hidden="true">▦</span><b>{allModules}</b></button><span className="current-module-label"><small>{t('admin.currentModule', { defaultMessage: 'Current module' })}</small><strong>{adminChrome(t, adminModule.label)}</strong></span><span className="topbar-spacer"/><Link href="/admin/screens" className="screen-index-link" aria-label={previewDirectoryAria} title={previewDirectoryAria}>{previewDirectory}</Link><LocaleSwitcher /><button className="top-icon" type="button" aria-label={t('common.notifications', { defaultMessage: 'Notifications' })}>♧</button><button className="top-icon" type="button" aria-label={t('admin.unreadAlerts', { defaultMessage: 'Unread alerts' })}>♧<span className="dot" /></button><button className="avatar" type="button" aria-label={t('admin.profileMenu', { defaultMessage: 'Admin profile menu' })} data-admin-intent="profile-menu">{avatarInitials}</button></header>;
}

function Breadcrumbs({ items }: { items: AdminBreadcrumb[] }) {
  const { t } = useLocale();
  if (items.length < 2) return null;
  return <nav className="admin-breadcrumbs" aria-label={t('admin.breadcrumb', { defaultMessage: 'Breadcrumb' })}>{items.map((item, index) => index === items.length - 1 ? <span aria-current="page" key={item.route}>{item.label}</span> : <Link href={item.route} key={item.route}>{item.label}</Link>)}</nav>;
}

function StatusBadge({ value }: { value: string }) {
  const tone = /active|current|approved|yes|\+/.test(value.toLowerCase()) ? 'success' : /suspend|locked|reject|critical/.test(value.toLowerCase()) ? 'danger' : 'neutral';
  return <span className={`status-badge ${tone}`}>{value}</span>;
}

function PageHeader({ screen, hideAction = false }: { screen: AdminScreen; hideAction?: boolean }) {
  const { t } = useLocale();
  const showNigeriaFlag = screen.id === 'C-03' || screen.id === 'C-11';
  const platformBatch = ['J','K','L','M','N','O'].includes(screen.batch);
  const platformOwnsAction = platformBatch && ['form','wizard','workflow','approval','settings','detail','profile'].includes(screen.kind);
  const showHeaderAction = !hideAction && !platformOwnsAction && (['G','H','I'].includes(screen.batch) || !['D','E','F'].includes(screen.batch) || ['table','operations','finance'].includes(screen.kind));
  return <><div className="page-header"><div><h1 className="page-title">{showNigeriaFlag && <span className="flag-ng" aria-label="Nigeria flag" />}{screen.title}</h1><p className="page-subtitle">{screen.subtitle}</p></div><div className="header-actions">{screen.action && showHeaderAction && <button type="button" className={screen.action.includes('Export') ? 'ghost-button' : 'primary-button'}>{screen.action}</button>}<button type="button" className="more-button" aria-label={t('admin.moreOptions', { defaultMessage: 'More options' })}>•••</button></div></div>{screen.tabs && !platformBatch && !['wizard', 'workflow'].includes(screen.kind) && <Tabs tabs={screen.tabs} />}</>;
}

function Tabs({ tabs }: { tabs: string[] }) {
  return <div className="tabs" role="tablist">{tabs.map((tab, index) => <button type="button" className={`tab ${index === 0 ? 'active' : ''}`} role="tab" aria-selected={index === 0} key={tab}>{tab}</button>)}</div>;
}

function MetricCards({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className="metric-grid">{metrics.map((metric, index) => <article className={`card metric-card ${index === 0 ? 'metric-selected' : ''}`} key={metric.label}><span className="metric-label">{metric.label}</span><div className="metric-row"><strong className={`metric-value ${index === 0 ? 'violet' : ''}`}>{metric.value}</strong>{metric.trend && <span className="trend">{metric.trend}</span>}</div></article>)}</div>;
}

function ChartCard({ title, value, green = false, bars = false, series }: { title: string; value?: string; green?: boolean; bars?: boolean; series?: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...(series?.map((point) => point.value) ?? [1]));
  const barValues = series?.length
    ? series.map((point) => Math.max(8, Math.round((point.value / max) * 100)))
    : [46, 78, 54, 92, 63, 88, 66, 96, 72, 86, 70, 98];
  const axisLabels = series?.length ? series.map((point) => point.label) : ['May 1', 'May 7', 'May 13'];
  return <article className="card chart-card"><h2 className="card-title">{title}</h2>{value && <><span className="chart-kicker">This {title.includes('Giving') ? 'Week' : 'Month'}</span><strong className="chart-value">{value}</strong></>}{bars ? <div className="bar-chart">{barValues.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div> : <div className={`chart ${green ? 'green' : ''}`} />}<div className="chart-axis">{axisLabels.map((label) => <span key={label}>{label}</span>)}</div></article>;
}

function DashboardLiveNotice({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (!loading && !error) return null;
  return <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>{loading ? 'Loading live dashboard data…' : error}</p>;
}

function pendingLiveApiMessage(route: string): string | null {
  if (route.includes('/converts')) {
    return 'Convert and baptism records are not registered in the protected API yet. Use First Timers and Follow-Up for live pastoral intake.';
  }
  if (route.includes('/evangelism')) {
    return 'Church evangelism activities are not registered in the protected API yet. Mission soul capture is available under Mission Operations.';
  }
  return null;
}

function DashboardView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const metrics = dashboard.live ? dashboard.metrics : screen.metrics;
  const receipts = dashboard.data?.metrics.find((metric) => metric.label === 'Total Receipts')?.value;
  const members = dashboard.data?.metrics.find((metric) => metric.label === 'Members')?.value;
  return <><DemoDatasetBanner /><DashboardLiveNotice loading={dashboard.loading} error={dashboard.error} /><MetricCards metrics={metrics} /><div className="dashboard-grid"><ChartCard title="New Registrations" value={members} series={dashboard.data?.series} bars /><ChartCard title="Giving (USD)" value={receipts ?? dashboard.data?.metrics[0]?.value} series={dashboard.data?.series} bars /><ChartCard title="Active Users" value={dashboard.data?.metrics.find((metric) => metric.label === 'Countries')?.value} green series={dashboard.data?.series} /></div></>;
}

function SearchBar({ placeholder }: { placeholder?: string }) {
  const { t } = useLocale();
  return (
    <div className="search-row">
      <label className="search-box">
        <span>⌕</span>
        <input
          aria-label={t('common.search', { defaultMessage: 'Search' })}
          placeholder={placeholder ?? t('common.searchPlaceholder', { defaultMessage: 'Search by name, email, phone or ID...' })}
        />
      </label>
      <button className="filter-button">▽ {t('common.filters', { defaultMessage: 'Filters' })}</button>
    </div>
  );
}

function identityErrorMessage(error: unknown): string {
  if (error instanceof AdminIdentityApiError) {
    if (error.status === 401) return 'Sign in with an admin session to load this directory.';
    if (error.status === 403) return error.message || 'Permission or recent MFA verification required for this action.';
    return error.message + (error.correlationId ? ` (${error.correlationId})` : '');
  }
  return 'Unable to reach the admin identity API.';
}

const IDENTITY_SCOPE_TYPE_VALUES = [
  { value: 'administrative_unit', label: 'Administrative unit' },
  { value: 'country', label: 'Country' },
  { value: 'church', label: 'Church' },
  { value: 'home_church', label: 'Home church' },
] as const;

function mapIdentityScopeType(value: string): string {
  const normalized = value.trim();
  if (normalized === 'Administrative Scope') return 'administrative_unit';
  if (normalized === 'Church Scope') return 'church';
  if (normalized === 'Home Church Scope') return 'home_church';
  return normalized;
}

function resolveIdentityScopeId(form: FormData, scopeType: string): string {
  if (scopeType === 'country') return String(form.get('country_id') ?? '').trim();
  if (scopeType === 'church') return String(form.get('church_id') ?? '').trim();
  if (scopeType === 'home_church') return String(form.get('home_church_id') ?? '').trim();
  return String(form.get('administrative_unit_id') ?? form.get('scope_id') ?? '').trim();
}

function roleAssignmentOptions(users: AdminUser[]): Array<{ value: string; label: string }> {
  return users.flatMap((user) =>
    (user.roles ?? [])
      .filter((role) => Boolean(role.assignment_id))
      .map((role) => ({
        value: role.assignment_id,
        label: `${user.name} · ${role.name || role.code}`,
      })),
  );
}

function IdentityLoadState({ message, tone = 'neutral' }: { message: string; tone?: 'neutral' | 'danger' }) {
  return <p className={`field-help${tone === 'danger' ? ' identity-error' : ''}`} role="status" style={tone === 'danger' ? { color: '#dc2626' } : undefined}>{message}</p>;
}

function IdentityUsersTable({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const suspendedOnly = screen.route.includes('/suspended');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('Loading users…');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const scope = defaultAdminScope(requestedScope);
    setError(null);
    try {
      const result = await listAdminUsers({
        scope,
        status: suspendedOnly ? 'suspended' : undefined,
        perPage: 25,
        sort: '-created_at',
      });
      setUsers(result.data);
      setTotal(result.pagination.total);
      setMessage(`Showing ${result.data.length} of ${result.pagination.total} users`);
    } catch (err) {
      setUsers([]);
      setTotal(0);
      setError(identityErrorMessage(err));
      setMessage('Live user directory unavailable');
    }
  }, [requestedScope, suspendedOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onSuspend(user: AdminUser) {
    const reason = window.prompt(`Suspension reason code for ${user.name} (e.g. security.review):`, 'security.review');
    if (!reason) return;
    if (!window.confirm(`Suspend ${user.name}? They will lose access until reactivated.`)) return;
    setBusyId(user.id);
    setError(null);
    try {
      await suspendAdminUser(user.id, reason.trim(), defaultAdminScope(requestedScope));
      await refresh();
    } catch (err) {
      setError(identityErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onReactivate(user: AdminUser) {
    if (!window.confirm(`Reactivate ${user.name}?`)) return;
    setBusyId(user.id);
    setError(null);
    try {
      await reactivateAdminUser(user.id, defaultAdminScope(requestedScope));
      await refresh();
    } catch (err) {
      setError(identityErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  const metrics = [
    { label: suspendedOnly ? t('admin.suspended', { defaultMessage: 'Suspended' }) : t('admin.loaded', { defaultMessage: 'Loaded' }), value: String(total) },
    { label: t('admin.activePage', { defaultMessage: 'Active (page)' }), value: String(users.filter((user) => user.account_status === 'active').length) },
    { label: t('admin.suspendedPage', { defaultMessage: 'Suspended (page)' }), value: String(users.filter((user) => user.account_status === 'suspended').length) },
    { label: t('admin.verifiedEmail', { defaultMessage: 'Verified email' }), value: String(users.filter((user) => Boolean(user.email_verified_at)).length) },
  ];
  const userColumns = suspendedOnly
    ? [
        t('admin.user', { defaultMessage: 'User' }),
        t('admin.email', { defaultMessage: 'Email' }),
        t('admin.reason', { defaultMessage: 'Reason' }),
        t('admin.suspendedOn', { defaultMessage: 'Suspended On' }),
        t('admin.status', { defaultMessage: 'Status' }),
      ]
    : [
        t('admin.user', { defaultMessage: 'User' }),
        t('admin.email', { defaultMessage: 'Email' }),
        t('admin.role', { defaultMessage: 'Role' }),
        t('admin.status', { defaultMessage: 'Status' }),
        t('admin.created', { defaultMessage: 'Created' }),
      ];

  return (
    <>
      <MetricCards metrics={metrics} />
      <div className="table-toolbar"><SearchBar /></div>
      {error && <IdentityLoadState message={error} tone="danger" />}
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              {userColumns.map((column) => (
                <th key={column}>{column}</th>
              ))}
              <th>{t('admin.actions', { defaultMessage: 'Actions' })}</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={6}>{error ? t('admin.noUsersLoaded', { defaultMessage: 'No users loaded.' }) : t('admin.noUsersInScope', { defaultMessage: 'No users match this scope.' })}</td></tr>
            ) : users.map((user) => {
              const role = user.roles?.[0]?.name ?? user.roles?.[0]?.code ?? '—';
              return (
                <tr key={user.id}>
                  <td><span className="mini-avatar">{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>{user.name}</td>
                  <td>{user.email}</td>
                  {suspendedOnly ? (
                    <>
                      <td>{user.suspension_reason ?? '—'}</td>
                      <td>{formatTimestamp(user.suspended_at)}</td>
                    </>
                  ) : (
                    <td>{role}</td>
                  )}
                  <td><StatusBadge value={formatAccountStatus(user.account_status)} /></td>
                  {!suspendedOnly && <td>{formatTimestamp(user.created_at)}</td>}
                  <td className="actions-cell">
                    <div className="row-actions">
                      {user.account_status === 'suspended' ? (
                        <button type="button" className="table-action" data-interaction-native="true" disabled={busyId === user.id} onClick={() => void onReactivate(user)}>{t('admin.reactivate', { defaultMessage: 'Reactivate' })}</button>
                      ) : (
                        <button type="button" className="table-action is-danger" data-interaction-native="true" disabled={busyId === user.id} onClick={() => void onSuspend(user)}>{t('admin.suspend', { defaultMessage: 'Suspend' })}</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="pagination"><span>{message}</span></div>
      </div>
    </>
  );
}

function IdentityRolesTable({ requestedScope }: { requestedScope?: string }) {
  const { t } = useLocale();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listAdminRoles({ scope: defaultAdminScope(requestedScope), perPage: 50, sort: 'code' });
        if (cancelled) return;
        setRoles(result.data);
        setTotal(result.pagination.total);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setRoles([]);
        setError(identityErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [requestedScope]);

  return (
    <>
      <MetricCards metrics={[
        { label: t('admin.totalRoles', { defaultMessage: 'Total Roles' }), value: String(total) },
        { label: t('admin.loaded', { defaultMessage: 'Loaded' }), value: String(roles.length) },
        { label: t('admin.systemCatalogue', { defaultMessage: 'System catalogue' }), value: t('admin.readOnly', { defaultMessage: 'Read-only' }) },
        { label: t('admin.source', { defaultMessage: 'Source' }), value: t('admin.api', { defaultMessage: 'API' }) },
      ]} />
      {error && <IdentityLoadState message={error} tone="danger" />}
      <div className="card table-card">
        <table>
          <thead><tr><th>{t('admin.roleName', { defaultMessage: 'Role Name' })}</th><th>{t('admin.code', { defaultMessage: 'Code' })}</th><th>{t('admin.permissions', { defaultMessage: 'Permissions' })}</th><th>{t('admin.status', { defaultMessage: 'Status' })}</th></tr></thead>
          <tbody>
            {roles.length === 0 ? (
              <tr><td colSpan={4}>{error ? t('admin.rolesUnavailable', { defaultMessage: 'Roles unavailable.' }) : t('admin.noRolesReturned', { defaultMessage: 'No roles returned.' })}</td></tr>
            ) : roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td><code>{role.code}</code></td>
                <td>{role.permissions?.length ?? '—'}</td>
                <td><StatusBadge value={t('admin.active', { defaultMessage: 'Active' })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span>{t('admin.showingRolesReadOnly', { vars: { count: roles.length, total }, defaultMessage: `Showing ${roles.length} of ${total} roles (create/update not exposed by API)` })}</span></div>
      </div>
    </>
  );
}

function IdentityAccessDecisionsTable({ requestedScope }: { requestedScope?: string }) {
  const { t } = useLocale();
  const [rows, setRows] = useState<AdminAccessDecision[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listAdminAccessDecisions({ scope: defaultAdminScope(requestedScope), perPage: 25 });
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.pagination.total);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(identityErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [requestedScope]);

  return (
    <>
      {error && <IdentityLoadState message={error} tone="danger" />}
      <div className="card table-card">
        <table>
          <thead><tr><th>{t('admin.dateTime', { defaultMessage: 'Date & Time' })}</th><th>{t('admin.actor', { defaultMessage: 'Actor' })}</th><th>{t('admin.permission', { defaultMessage: 'Permission' })}</th><th>{t('admin.scope', { defaultMessage: 'Scope' })}</th><th>{t('admin.result', { defaultMessage: 'Result' })}</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5}>{error ? t('admin.accessDecisionsUnavailable', { defaultMessage: 'Access decisions unavailable.' }) : t('admin.noAccessDecisions', { defaultMessage: 'No access decisions yet.' })}</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{formatTimestamp(row.decided_at)}</td>
                <td>{row.actor_user_id ?? '—'}</td>
                <td><code>{row.permission_code}</code></td>
                <td>{row.scope_type ? `${row.scope_type}:${row.scope_id ?? ''}` : '—'}</td>
                <td><StatusBadge value={row.allowed ? t('admin.allowed', { defaultMessage: 'Allowed' }) : t('admin.denied', { defaultMessage: 'Denied' })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span>{t('admin.showingAccessDecisions', { vars: { count: rows.length, total }, defaultMessage: `Showing ${rows.length} of ${total} access decisions` })}</span></div>
      </div>
    </>
  );
}

function IdentityAuditEventsPanel({ compact = false, requestedScope }: { compact?: boolean; requestedScope?: string }) {
  const { t } = useLocale();
  const [rows, setRows] = useState<AdminAuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listAdminAuditEvents({ scope: defaultAdminScope(requestedScope), perPage: compact ? 8 : 25 });
        if (cancelled) return;
        setRows(result.data);
        setTotal(result.pagination.total);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(identityErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [compact, requestedScope]);

  if (compact) {
    return (
      <div className="card list-card">
        <h2 className="card-title">{t('admin.recentAuditEvents', { defaultMessage: 'Recent Audit Events' })}</h2>
        {error && <IdentityLoadState message={error} tone="danger" />}
        {(rows.length ? rows : []).map((row) => (
          <div className="rank-row" key={row.id}>
            <span>{row.action}</span>
            <strong>{formatTimestamp(row.occurred_at)}</strong>
          </div>
        ))}
        {!error && rows.length === 0 && <p className="field-help">{t('admin.noAuditEvents', { defaultMessage: 'No audit events yet.' })}</p>}
        <p className="field-help">{t('admin.totalRecorded', { vars: { total }, defaultMessage: `Total recorded: ${total}` })}</p>
      </div>
    );
  }

  return (
    <>
      {error && <IdentityLoadState message={error} tone="danger" />}
      <div className="card table-card">
        <table>
          <thead><tr><th>{t('admin.occurred', { defaultMessage: 'Occurred' })}</th><th>{t('admin.actor', { defaultMessage: 'Actor' })}</th><th>{t('admin.action', { defaultMessage: 'Action' })}</th><th>{t('admin.target', { defaultMessage: 'Target' })}</th><th>{t('admin.scope', { defaultMessage: 'Scope' })}</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5}>{error ? t('admin.auditEventsUnavailable', { defaultMessage: 'Audit events unavailable.' }) : t('admin.noAuditEvents', { defaultMessage: 'No audit events yet.' })}</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{formatTimestamp(row.occurred_at)}</td>
                <td>{row.actor_user_id ?? '—'}</td>
                <td><code>{row.action}</code></td>
                <td>{row.target_type ? `${row.target_type}:${row.target_id ?? ''}` : '—'}</td>
                <td>{row.scope_type ? `${row.scope_type}:${row.scope_id ?? ''}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span>{t('admin.showingAuditEvents', { vars: { count: rows.length, total }, defaultMessage: `Showing ${rows.length} of ${total} audit events` })}</span></div>
      </div>
    </>
  );
}

function IdentityScopeAssignmentsView({ requestedScope }: { requestedScope?: string }) {
  const { t } = useLocale();
  const [rows, setRows] = useState<AdminScopeAssignment[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const apiReady = identityApiConfigured();
  const assignments = roleAssignmentOptions(users);

  const refresh = useCallback(async () => {
    const scope = defaultAdminScope(requestedScope);
    try {
      const [result, userResult] = await Promise.all([
        listAdminScopeAssignments({ scope, perPage: 25 }),
        listAdminUsers({ scope, perPage: 50, sort: '-created_at' }),
      ]);
      setRows(result.data);
      setTotal(result.pagination.total);
      setUsers(userResult.data);
      setError(null);
    } catch (err) {
      setRows([]);
      setUsers([]);
      setError(identityErrorMessage(err));
    }
  }, [requestedScope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onAssignScope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiReady) {
      setMessage('The Laravel API is not configured.');
      return;
    }
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const roleAssignmentId = String(form.get('role_assignment_id') ?? '').trim();
    const scopeType = mapIdentityScopeType(String(form.get('scope_type') ?? ''));
    const scopeId = resolveIdentityScopeId(form, scopeType);
    if (!roleAssignmentId || !scopeType || !scopeId) {
      setMessage('Role assignment, scope type, and a live scope record ULID are required.');
      return;
    }
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const created = await assignAdminRoleAssignmentScope(
        roleAssignmentId,
        { scope_type: scopeType, scope_id: scopeId },
        defaultAdminScope(requestedScope),
      );
      setMessage(`Assigned ${created.scope_type ?? scopeType}:${created.scope_key ?? scopeId} (${created.id}).`);
      formEl.reset();
      await refresh();
    } catch (err) {
      setError(identityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="card settings-card" onSubmit={(event) => void onAssignScope(event)}>
        <p className="maps-settings-lead">
          {apiReady
            ? t('admin.assignScopeCopy', {
                defaultMessage: 'Assign a scope to an existing role assignment. Scope record values must be live ULIDs.',
              })
            : t('admin.assignScopeBlocked', {
                defaultMessage: 'The Laravel API is not configured; scope assignment submit is blocked.',
              })}
        </p>
        <div className="form-grid">
          <label>
            <span>{t('admin.roleAssignmentRequired', { defaultMessage: 'Role assignment *' })}</span>
            <select name="role_assignment_id" defaultValue="" required disabled={!apiReady || assignments.length === 0}>
              <option value="" disabled>
                {assignments.length
                  ? t('admin.selectRoleAssignment', { defaultMessage: 'Select a live role assignment' })
                  : t('admin.noRoleAssignmentsLoaded', { defaultMessage: 'No live role assignments loaded' })}
              </option>
              {assignments.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t('admin.scopeTypeRequired', { defaultMessage: 'Scope Type *' })}</span>
            <select name="scope_type" defaultValue="administrative_unit" disabled={!apiReady}>
              {IDENTITY_SCOPE_TYPE_VALUES.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="full">
            <span>{t('admin.country', { defaultMessage: 'Country' })}</span>
            <SearchSelect name="country_id" catalog="country" options={catalogOptions.country} placeholder={t('admin.searchCountry', { defaultMessage: 'Search country' })} disabled={!apiReady} />
          </label>
          <label className="full">
            <span>{t('admin.administrativeUnit', { defaultMessage: 'Administrative Unit' })}</span>
            <SearchSelect name="administrative_unit_id" catalog="administrativeUnit" options={catalogOptions.administrativeUnit} placeholder={t('admin.searchAdministrativeUnit', { defaultMessage: 'Search administrative unit' })} disabled={!apiReady} />
          </label>
          <label>
            <span>{t('admin.church', { defaultMessage: 'Church' })}</span>
            <SearchSelect name="church_id" catalog="church" options={catalogOptions.church} placeholder={t('admin.searchChurch', { defaultMessage: 'Search church' })} disabled={!apiReady} />
          </label>
          <label>
            <span>{t('admin.homeChurch', { defaultMessage: 'Home church' })}</span>
            <SearchSelect name="home_church_id" catalog="homeChurch" options={catalogOptions.homeChurch} placeholder={t('admin.searchHomeChurch', { defaultMessage: 'Search home church' })} disabled={!apiReady} />
          </label>
        </div>
        {message ? <p className="field-help" role="status">{message}</p> : null}
        <div className="form-footer">
          <button className="primary-button" type="submit" disabled={!apiReady || busy} title={apiReady ? undefined : t('admin.apiNotConfigured', { defaultMessage: 'The Laravel API is not configured' })}>
            {busy ? t('admin.assigning', { defaultMessage: 'Assigning…' }) : t('admin.assignScope', { defaultMessage: 'Assign Scope' })}
          </button>
        </div>
      </form>
      {error && <IdentityLoadState message={error} tone="danger" />}
      <div className="card table-card">
        <table>
          <thead><tr><th>{t('admin.user', { defaultMessage: 'User' })}</th><th>{t('admin.role', { defaultMessage: 'Role' })}</th><th>{t('admin.scope', { defaultMessage: 'Scope' })}</th><th>{t('admin.assigned', { defaultMessage: 'Assigned' })}</th></tr></thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4}>{error ? t('admin.scopeAssignmentsUnavailable', { defaultMessage: 'Scope assignments unavailable.' }) : t('admin.noScopeAssignments', { defaultMessage: 'No scope assignments in this scope.' })}</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td>{row.role_assignment?.user.name ?? '—'}<br /><small>{row.role_assignment?.user.email}</small></td>
                <td>{row.role_assignment?.role.name ?? row.role_assignment?.role.code ?? '—'}</td>
                <td><code>{row.scope.type}:{row.scope.id}</code></td>
                <td>{formatTimestamp(row.assigned_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination"><span>{t('admin.showingAssignments', { vars: { count: rows.length, total }, defaultMessage: `Showing ${rows.length} of ${total} assignments` })}</span></div>
      </div>
    </>
  );
}

function isOpsPublicId(value: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(value.trim());
}

function OperationsLiveTable({ screen, dataset }: { screen: AdminScreen; dataset: OpsDatasetKey }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const entityKey = resolveEntityKey(screen.route, screen.id);
  const reviewLabel = screen.nav === 'applications' ? 'Review' : undefined;
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('Loading…');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setMessage('Loading…');
    try {
      const result = await loadOpsDataset(dataset, { scope: defaultOpsScope(screen.scope), perPage: 25 });
      setRows(opsRecordsToRows(dataset, result.items, columns));
      setTotal(result.pagination.total);
      setMessage(
        result.pagination.total === 0
          ? 'No records in this scope.'
          : `Showing ${result.items.length} of ${result.pagination.total} records`,
      );
    } catch (err) {
      setRows([]);
      setTotal(0);
      setError(operationsErrorMessage(err, 'Unable to load church/mission operations.'));
      setMessage('Live operations data unavailable');
    }
  }, [columns, dataset, screen.scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onRegisterFirstTimer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const personId = String(form.get('person_id') ?? '').trim();
    const churchId = String(form.get('church_id') ?? '').trim();
    const homeChurchId = String(form.get('home_church_id') ?? '').trim();
    const followUpPersonId = String(form.get('assigned_follow_up_person_id') ?? '').trim();
    const registeredAtRaw = String(form.get('registered_at') ?? '').trim();
    if (!personId || !churchId) {
      setRegisterMessage('Person and church are required.');
      return;
    }
    if (!isOpsPublicId(personId) || !isOpsPublicId(churchId)) {
      setRegisterMessage('Select a live person and church from the search lists.');
      return;
    }
    if (homeChurchId && !isOpsPublicId(homeChurchId)) {
      setRegisterMessage('Home church id must be a live public id (ULID).');
      return;
    }
    if (followUpPersonId && !isOpsPublicId(followUpPersonId)) {
      setRegisterMessage('Select a live follow-up person from the search list.');
      return;
    }
    let registeredAt: string | null = null;
    if (registeredAtRaw) {
      const parsed = new Date(registeredAtRaw);
      if (Number.isNaN(parsed.getTime())) {
        setRegisterMessage('registered_at must be a valid date.');
        return;
      }
      registeredAt = parsed.toISOString();
    }
    setRegisterBusy(true);
    setRegisterMessage(null);
    setError(null);
    try {
      const record = await registerFirstTimer(
        {
          person_id: personId,
          church_id: churchId,
          home_church_id: homeChurchId || null,
          assigned_follow_up_person_id: followUpPersonId || null,
          registered_at: registeredAt,
        },
        defaultOpsScope(screen.scope),
      );
      setRegisterMessage(`Registered first timer ${record.id}.`);
      formEl.reset();
      await refresh();
    } catch (err) {
      setRegisterMessage(operationsErrorMessage(err, 'First-timer registration failed.'));
    } finally {
      setRegisterBusy(false);
    }
  }

  async function onCompleteFollowUp(row: Record<string, string>) {
    const taskId = row.__id;
    if (!taskId || taskId === '—') return;
    const reason = window.prompt('Completion reason code (e.g. contacted_successfully):', 'contacted_successfully');
    if (!reason) return;
    setBusyId(taskId);
    setError(null);
    try {
      await completeFollowUpTask(taskId, reason.trim(), defaultOpsScope(screen.scope));
      await refresh();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Follow-up completion failed.'));
    } finally {
      setBusyId(null);
    }
  }

  async function onTransitionApplication(row: Record<string, string>) {
    const applicationId = row.__id;
    if (!applicationId || applicationId === '—') return;
    const status = window.prompt(
      'Transition status (draft|submitted|under_review|interview_orientation|approved|active|rejected|suspended|closed):',
      'submitted',
    );
    if (!status) return;
    const reason = window.prompt('Reason code (e.g. application_received):', 'application_received');
    if (!reason) return;
    setBusyId(applicationId);
    setError(null);
    try {
      await transitionHomeChurchApplication(
        applicationId,
        { status: status.trim(), reason_code: reason.trim() },
        defaultOpsScope(screen.scope),
      );
      await refresh();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Application transition failed.'));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <MetricCards metrics={[{ label: 'Total', value: String(total) }, ...(screen.metrics ?? []).slice(1, 4)]} />
      {dataset === 'first-timers' ? (
        <form className="card form-card" onSubmit={(event) => void onRegisterFirstTimer(event)}>
          <h2 className="section-title">{t('admin.registerFirstTimer', { defaultMessage: 'Register first timer' })}</h2>
          <p className="page-subtitle">{t('admin.registerFirstTimerCopy', { defaultMessage: 'Choose a person and church from live records. Empty catalogs are not treated as success.' })}</p>
          <div className="form-grid">
            <label>
              <span>{t('admin.personRequired', { defaultMessage: 'Person *' })}</span>
              <SearchSelect name="person_id" catalog="person" options={catalogOptions.person} placeholder={t('admin.searchPerson', { defaultMessage: 'Search person' })} />
            </label>
            <label>
              <span>{t('admin.churchRequired', { defaultMessage: 'Church *' })}</span>
              <SearchSelect name="church_id" catalog="church" options={catalogOptions.church} placeholder={t('admin.searchChurch', { defaultMessage: 'Search church' })} />
            </label>
            <label>
              <span>{t('admin.homeChurch', { defaultMessage: 'Home church' })}</span>
              <SearchSelect name="home_church_id" catalog="homeChurch" options={catalogOptions.homeChurch} placeholder={t('admin.searchHomeChurch', { defaultMessage: 'Search home church' })} />
            </label>
            <label>
              <span>{t('admin.followUpPerson', { defaultMessage: 'Follow-up person' })}</span>
              <SearchSelect name="assigned_follow_up_person_id" catalog="person" options={catalogOptions.person} placeholder={t('admin.optionalFollowUpPerson', { defaultMessage: 'Optional follow-up person' })} />
            </label>
            <label>
              <span>{t('admin.registeredAt', { defaultMessage: 'Registered at' })}</span>
              <input name="registered_at" type="datetime-local" />
            </label>
          </div>
          {registerMessage ? <p className="field-help" role="status">{registerMessage}</p> : null}
          <div className="form-footer">
            <button className="primary-button" type="submit" disabled={registerBusy}>
              {registerBusy
                ? t('admin.registering', { defaultMessage: 'Registering…' })
                : t('admin.registerFirstTimer', { defaultMessage: 'Register first timer' })}
            </button>
          </div>
        </form>
      ) : null}
      <div className="table-toolbar"><SearchBar placeholder="Search records…" /></div>
      {error ? <p className="field-help identity-error" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="card table-card">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>{t('admin.actions', { defaultMessage: 'Actions' })}</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length + 1}>{error ? t('admin.unableToLoadRecords', { defaultMessage: 'Unable to load records.' }) : message}</td></tr>
            ) : (
              rows.map((row) => (
                <tr key={row.__id}>
                  {columns.map((column) => (
                    <td key={column}>
                      {column === 'Status' ? (
                        <StatusBadge value={row[column] ?? '—'} />
                      ) : (
                        <>
                          {['User', 'Name', 'Applicant Name', 'Home Church', 'Church Name'].includes(column) ? (
                            <span className="mini-avatar">{(row[column] ?? '?').split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                          ) : null}
                          {row[column]}
                        </>
                      )}
                    </td>
                  ))}
                  <td className="actions-cell">
                    <div className="row-actions">
                      <TableRowActions
                        record={`${row[columns[0]] ?? ''} ${row.__id ?? ''}`.trim()}
                        entityKey={entityKey}
                        reviewLabel={reviewLabel}
                      />
                      {dataset === 'prayer-requests' && row.__id && row.__id !== '—' ? (
                        <Link href={`/admin/people/prayer-requests/${row.__id}/assign`} className="table-action">
                          Assign
                        </Link>
                      ) : null}
                      {dataset === 'pastoral-needs' && row.__id && row.__id !== '—' ? (
                        <Link href={`/admin/people/needs/${row.__id}/review`} className="table-action">
                          Review
                        </Link>
                      ) : null}
                      {dataset === 'home-church-applications' ? (
                        <button
                          type="button"
                          className="table-action"
                          data-interaction-native="true"
                          disabled={busyId === row.__id}
                          onClick={() => void onTransitionApplication(row)}
                        >
                          Transition
                        </button>
                      ) : null}
                      {dataset === 'follow-up-tasks' ? (
                        <button
                          type="button"
                          className="table-action"
                          data-interaction-native="true"
                          disabled={busyId === row.__id}
                          onClick={() => void onCompleteFollowUp(row)}
                        >
                          Complete
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="pagination"><span>{message}</span></div>
      </div>
    </>
  );
}

function isOrganizationCatalogRoute(route: string): boolean {
  return (
    route === '/admin/geography/countries' ||
    (route.includes('/geography/countries/') &&
      (route.includes('/levels') || route.includes('/regions') || route.includes('/local-areas')))
  );
}

function OrganizationCatalogTable({ screen }: { screen: AdminScreen }) {
  const [countries, setCountries] = useState<AdminCountry[]>([]);
  const [units, setUnits] = useState<AdminAdministrativeUnit[]>([]);
  const [message, setMessage] = useState('Loading organization catalog…');
  const [error, setError] = useState<string | null>(null);
  const isCountries = screen.route === '/admin/geography/countries' || screen.route.includes('/levels');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage('Loading organization catalog…');
      try {
        if (isCountries) {
          const next = await listCountries();
          if (cancelled) return;
          setCountries(next);
          setUnits([]);
          setMessage(next.length === 0 ? 'No countries yet. Open Hierarchy Tree to create one.' : `Showing ${next.length} countries`);
        } else {
          const next = await listUnits();
          if (cancelled) return;
          setUnits(next);
          setCountries([]);
          setMessage(next.length === 0 ? 'No administrative units yet. Open Hierarchy Tree to create one.' : `Showing ${next.length} units`);
        }
      } catch (err) {
        if (cancelled) return;
        setCountries([]);
        setUnits([]);
        setError(organizationErrorMessage(err));
        setMessage('Organization catalog unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isCountries, screen.route]);

  return (
    <>
      <p className="maps-settings-lead">{error ?? message}</p>
      <div className="card table-card">
        {isCountries ? (
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Code</th>
                <th>Id</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {countries.length === 0 ? (
                <tr>
                  <td colSpan={4}>{error ? 'Countries unavailable.' : 'No countries returned.'}</td>
                </tr>
              ) : (
                countries.map((country) => (
                  <tr key={country.id}>
                    <td>{country.name}</td>
                    <td>{country.iso_code}</td>
                    <td>
                      <code>{country.id}</code>
                    </td>
                    <td>{country.created_at ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Unit</th>
                <th>Level</th>
                <th>Code</th>
                <th>Parent</th>
                <th>Country</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={5}>{error ? 'Units unavailable.' : 'No units returned.'}</td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.name}</td>
                    <td>{unit.administrative_level?.name ?? '—'}</td>
                    <td>{unit.reference_code ?? '—'}</td>
                    <td>{unit.parent?.name ?? '—'}</td>
                    <td>{unit.country?.name ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
        <div className="pagination">
          <span>Use Hierarchy Tree to create countries, levels, units, and locations</span>
        </div>
      </div>
    </>
  );
}

function CatalogLiveTable({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const columns = screen.columns ?? [];
  const columnKey = columns.join('\0');
  const dataset = resolveCatalogDataset(screen);
  const entityKey = resolveEntityKey(screen.route, screen.id);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [message, setMessage] = useState('Loading catalog…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dataset) return;
    const mappedColumns = columnKey ? columnKey.split('\0') : [];
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage('Loading catalog…');
      try {
        const result = await listCatalogDomain(dataset, { perPage: 25 });
        if (cancelled) return;
        setRows(catalogRecordsToRows(result.items as Record<string, unknown>[], mappedColumns));
        setMessage(
          result.pagination.total === 0
            ? 'No catalog records in this scope.'
            : `Showing ${result.items.length} of ${result.pagination.total} records`,
        );
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setError(catalogErrorMessage(err, 'Unable to load domain catalog.'));
        setMessage('Live catalog unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [columnKey, dataset]);

  return (
    <>
      {error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {!error ? <p className="maps-settings-lead" role="status">{message}</p> : null}
      <div className="card table-card">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}<th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1) + 1}>{error ? 'Unable to load records.' : message}</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.__id}>
                  {columns.map((column) => (
                    <td key={column}>
                      {column === 'Status' ? (
                        <StatusBadge value={row[column] ?? '—'} />
                      ) : (
                        <>
                          {['User', 'Name', 'Applicant Name', 'Home Church', 'Church Name', 'Title', 'Message', 'Item'].includes(column) ? (
                            <span className="mini-avatar">{(row[column] ?? '?').split(' ').map((part) => part[0]).slice(0, 2).join('')}</span>
                          ) : null}
                          {row[column]}
                        </>
                      )}
                    </td>
                  ))}
                  <td className="actions-cell">
                    <TableRowActions
                      record={`${row[columns[0]] ?? ''} ${row.__id ?? ''}`.trim()}
                      entityKey={entityKey}
                      canEdit={false}
                      canDelete={false}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="pagination"><span>{message}</span></div>
      </div>
    </>
  );
}

function DataTable({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  if (!shouldUseDesignFixtures()) {
    if (screen.route === '/admin/users' || screen.route === '/admin/users/suspended' || screen.route === '/admin/people') return <IdentityUsersTable screen={screen} requestedScope={requestedScope} />;
    if (screen.route === '/admin/roles') return <IdentityRolesTable requestedScope={requestedScope} />;
    if (screen.route === '/admin/access/history') return <IdentityAccessDecisionsTable requestedScope={requestedScope} />;
    const opsDataset = resolveOpsDataset(screen);
    if (opsDataset && shouldUseOperationsLiveData()) return <OperationsLiveTable screen={screen} dataset={opsDataset} />;
    if (screen.batch === 'C' && isOrganizationCatalogRoute(screen.route)) {
      return <OrganizationCatalogTable screen={screen} />;
    }
    if (shouldUseCatalogLiveData() && resolveCatalogDataset(screen)) {
      return <CatalogLiveTable screen={screen} />;
    }
    const columns = screen.columns ?? [];
    const pendingApi = pendingLiveApiMessage(screen.route);
    return (
      <>
        <p className="maps-settings-lead" role="status">
          {pendingApi ?? 'No live list API is wired for this screen. Design fixtures are disabled.'}
        </p>
        <div className="card table-card">
          <table>
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={Math.max(columns.length, 1)}>Live data unavailable for this route.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    );
  }
  if (!shouldUseOrganizationFixtures() && screen.batch === 'C' && isOrganizationCatalogRoute(screen.route)) {
    return <OrganizationCatalogTable screen={screen} />;
  }
  const columns = screen.columns ?? [];
  const entityKey = resolveEntityKey(screen.route, screen.id);
  const reviewLabel = screen.nav === 'applications' ? 'Review' : undefined;
  return <><MetricCards metrics={screen.metrics} /><div className="table-toolbar"><SearchBar placeholder={screen.batch === 'C' ? 'Search records...' : undefined} /></div><div className="card table-card"><table><thead><tr>{columns.map(column=><th key={column}>{column}</th>)}<th>Actions</th></tr></thead><tbody>{(screen.rows ?? []).map((row,index)=><tr key={index}>{columns.map(column=><td key={column}>{column === 'Status' || column === 'Growth' || column === 'Required' ? <StatusBadge value={row[column]} /> : <>{['User','Name','Applicant Name','Home Church','Church Name'].includes(column) && <span className="mini-avatar">{row[column].split(' ').map(part=>part[0]).slice(0,2).join('')}</span>}{row[column]}</>}</td>)}<td className="actions-cell"><TableRowActions record={String(row[columns[0]] ?? 'record')} entityKey={entityKey} reviewLabel={reviewLabel} /></td></tr>)}</tbody></table><div className="pagination"><span>Showing 1 to {(screen.rows ?? []).length} of {screen.metrics?.[0]?.value ?? (screen.rows ?? []).length} records</span><span>‹　<b>1</b>　2　3　›</span></div></div></>;
}

function FeedView({ screen }: { screen: AdminScreen }) {
  if (!shouldUseDesignFixtures()) {
    if (shouldUseCatalogLiveData() && resolveCatalogDataset(screen)) {
      const columns = screen.columns?.length ? screen.columns : CATALOG_FEED_COLUMNS;
      return <CatalogLiveTable screen={{ ...screen, columns }} />;
    }
    return (
      <>
        <p className="maps-settings-lead" role="status">
          No live list API is wired for this screen. Design fixtures are disabled.
        </p>
        <div className="card feed-card">
          <p>Live data unavailable for this route.</p>
        </div>
      </>
    );
  }
  return <div className="card feed-card">{(screen.rows ?? []).map((row,index)=><article className="feed-item" key={index}><span className={`feed-icon tone-${index%4}`}>{screen.nav === 'alerts' ? '!' : screen.nav === 'notifications' ? '•' : '✓'}</span><div><strong>{row.Item}</strong><p>{row.Detail}</p></div><time>{row.Time}</time>{screen.nav === 'approvals' && <div className="row-actions"><button>Review</button><button>Reject</button></div>}</article>)}</div>;
}

function ScopeGrid({ screen }: { screen: AdminScreen }) {
  return <><div className="scope-current">Current Scope <strong>Global⌄</strong></div><div className="scope-grid">{(screen.items ?? []).map((item,index)=><Link href={`/admin/scope?scope=${item.toLowerCase()}`} className="card scope-card" key={item}><span className="scope-icon">{['◉','⚑','◇','▥','♧','⌖'][index]}</span><strong>{item}</strong><small>{['All countries and data','View by continent','Select a country','View by region','By denomination/network','By mission location'][index]}</small></Link>)}</div></>;
}

function CommandView({ screen }: { screen: AdminScreen }) {
  return <><label className="command-search"><span>⌕</span><input aria-label="Command search" placeholder="Search churches, members, events, giving, requests..." /></label><div className="chip-row">{['Church','Member','Event','Donation','Mission','User'].map(item=><button key={item}>{item}</button>)}</div><h2 className="section-title">Popular Commands</h2><div className="action-grid">{(screen.items ?? []).map((item,index)=><button className="card action-card" key={item}><span>⌘</span><strong>{item}</strong><small>{['Review and decide','Download scoped data','Open performance','Download scoped data','Draft a message','Create secure report'][index]}</small></button>)}</div></>;
}

function TasksView({ screen }: { screen: AdminScreen }) {
  return <div className="card task-list">{(screen.items ?? []).map((item,index)=><label className="task-item" key={item}><input type="checkbox" /><span>{item}</span><small>Assigned to You</small><time>{index<2?'Today':index===2?'Tomorrow':'May 13, 2024'}</time></label>)}</div>;
}

function KpiView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const metrics = dashboard.live ? dashboard.metrics : screen.metrics;
  const breakdownItems = dashboard.live
    ? breakdownToItems(dashboard.data?.breakdown)
    : (screen.items ?? ['Active Churches — 24,518', 'Home Churches — 18,642', 'Members — 1,638,732', 'Leaders — 98,431']);
  const topCountries = dashboard.live
    ? breakdownToItems(dashboard.data?.breakdown)
    : ['Nigeria — 4,354', 'Ghana — 2,491', 'Kenya — 1,637', 'South Africa — 1,348'];

  if (screen.route === '/admin/audit' && !shouldUseDesignFixtures()) {
    return <><MetricCards metrics={metrics} /><div className="analytics-grid kpi-two"><IdentityAuditEventsPanel compact requestedScope={requestedScope} /><ChartCard title="Audit Logs Trend" bars series={dashboard.data?.series} /></div></>;
  }
  if (screen.batch === 'A') {
    return <><DashboardLiveNotice loading={dashboard.loading} error={dashboard.error} /><MetricCards metrics={metrics} /><div className="analytics-grid kpi-two">{screen.id === 'A-12' ? <><ChartCard title="Member Growth" series={dashboard.data?.series} /><ChartCard title="Giving Trend (USD)" bars series={dashboard.data?.series} /></> : <><div className="card list-card"><h2 className="card-title">Top Admin Actions</h2>{(screen.items ?? []).map(item => <div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</div><ChartCard title="Audit Logs Trend" bars series={dashboard.data?.series} /></>}</div></>;
  }
  return <><DashboardLiveNotice loading={dashboard.loading} error={dashboard.error} /><MetricCards metrics={metrics} /><div className="analytics-grid"><div className="card list-card"><h2 className="card-title">Organization Overview</h2>{breakdownItems.map(item => <div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</div><ChartCard title="Churches Growth" series={dashboard.data?.series} /><div className="card list-card"><h2 className="card-title">Top Countries by Churches</h2>{topCountries.map((item, index) => <div className="bar-rank" key={item}><span>{item.split(' — ')[0]}</span><i style={{ width: `${92 - index * 15}%` }} /><strong>{item.split(' — ')[1]}</strong></div>)}</div><ChartCard title="Giving Trend (USD)" bars series={dashboard.data?.series} /></div></>;
}

function DetailView({ screen }: { screen: AdminScreen }) {
  const entries = Object.entries(screen.details ?? {});
  if (['D','E','F'].includes(screen.batch)) {
    const personDetail = screen.batch === 'F';
    return <div className={`ministry-detail ${personDetail ? 'person-detail' : ''}`}>
      {personDetail && <article className="card person-summary"><div className="portrait">{screen.title.split(' ').map(part=>part[0]).slice(0,2).join('')}</div><div><h2>{screen.title}</h2><StatusBadge value={screen.subtitle}/><p>☎ +234 810 123 4487　 ✉ {screen.title.toLowerCase().replaceAll(' ', '.')}@email.com</p></div></article>}
      <article className="card details-card ministry-information"><h2 className="card-title">{personDetail ? 'Personal Information' : 'Information'}</h2><dl>{entries.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article>
      <article className="card details-card ministry-about"><h2 className="card-title">{screen.nav === 'applications' ? 'About Us' : personDetail ? 'First Visit Information' : 'About Us'}</h2><p>{screen.nav === 'applications' ? 'We are a group of believers meeting at home for fellowship, worship, and the study of God’s Word. Our heart is to reach our neighbors and make disciples of Jesus Christ.' : personDetail ? 'A complete record of first contact, interests, spiritual decisions and next steps.' : 'A growing community committed to fellowship, discipleship, service and meaningful impact.'}</p>{(screen.items ?? []).map(item=><div className="document-row" key={item}><span>▧　{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1] ?? 'View'}</strong></div>)}</article>
      {!personDetail && <article className="card ministry-stat-strip">{(screen.items ?? ['Total Members — 98','Leaders — 6','Small Groups — 3']).slice(0,4).map(item=><div key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</article>}
      {screen.action && <button className="primary-button ministry-detail-action">{screen.action}</button>}
    </div>;
  }
  return <div className="detail-grid"><article className="card identity-card"><div className="portrait">{screen.title.split(' ').map(part=>part[0]).slice(0,2).join('')}</div><h2>{screen.title}</h2><StatusBadge value="Active" /><button className="ghost-button">Change Photo</button></article><article className="card details-card"><h2 className="card-title">{screen.batch === 'C' ? 'Information' : 'Details'}</h2><dl>{entries.map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card details-card"><h2 className="card-title">{screen.batch === 'C' ? 'Statistics' : 'Roles'}</h2>{(screen.items ?? []).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1] ?? 'Member'}</strong></div>)}</article><ChartCard title="Growth (Last 12 Months)" /></div>;
}

const formFields = [
  { label: 'First Name *', name: 'firstName', type: 'text' as const, value: 'Grace' },
  { label: 'Last Name *', name: 'lastName', type: 'text' as const, value: 'Ezekiel' },
  { label: 'Email Address *', name: 'email', type: 'email' as const, value: 'grace.ezekiel@email.com' },
  { label: 'Phone Number *', name: 'phone', type: 'tel' as const, value: '+234 803 545 6789' },
  { label: 'Gender', name: 'gender', type: 'select' as const, options: ['Male', 'Female', 'Prefer not to say'], value: 'Female' },
  { label: 'Date of Birth', name: 'dob', type: 'date' as const, value: '1992-06-12' },
  { label: 'Username', name: 'username', type: 'text' as const, value: 'grace.ezekiel' },
  { label: 'Status', name: 'status', type: 'select' as const, options: statusOptions, value: 'Active' },
  { label: 'Scope Type', name: 'scopeType', type: 'select' as const, options: ['Administrative Scope', 'Church Scope', 'Home Church Scope'], value: 'Administrative Scope' },
  { label: 'Assign Country', name: 'country', type: 'search-select' as const, catalog: 'country' as const, value: 'ng' },
];

function FormFields() {
  const { t } = useLocale();
  return (
    <div className="form-grid">
      {formFields.map((field) => (
        <label key={field.name}>
          <span>{field.label}</span>
          {field.type === 'search-select' ? (
            <SearchSelect
              name={field.name}
              catalog={field.catalog}
              options={catalogOptions[field.catalog]}
              defaultValue={field.value}
              placeholder={`Search ${field.label.replace(' *', '')}`}
            />
          ) : field.type === 'select' ? (
            <select name={field.name} defaultValue={field.value}>
              <option value="" disabled>
                Select {field.label.replace(' *', '')}
              </option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          ) : (
            <input name={field.name} type={field.type} defaultValue={field.value} />
          )}
        </label>
      ))}
    </div>
  );
}

function WizardView({ screen }: { screen: AdminScreen }) {
  const churchFields = [
    { label: 'Church Name *', name: 'name', type: 'text' as const },
    { label: 'Short Name', name: 'shortName', type: 'text' as const },
    { label: 'Church Type', name: 'churchType', type: 'select' as const, options: churchTypeOptions },
    { label: 'Denomination (Optional)', name: 'denomination', type: 'text' as const },
    { label: 'Established Date', name: 'establishedDate', type: 'date' as const },
    { label: 'Country', name: 'country', type: 'search-select' as const, catalog: 'country' as const },
    { label: 'Administrative Unit', name: 'administrative_unit_id', type: 'search-select' as const, catalog: 'administrativeUnit' as const },
    { label: 'Location', name: 'location_id', type: 'search-select' as const, catalog: 'location' as const },
    { label: 'Status', name: 'status', type: 'select' as const, options: statusOptions },
  ];
  const contactFields = [
    { label: 'Phone *', name: 'phone', type: 'text' as const },
    { label: 'Email *', name: 'email', type: 'email' as const },
    { label: 'Website', name: 'website', type: 'text' as const },
    { label: 'Meeting address', name: 'address', type: 'textarea' as const },
  ];
  const steps = screen.tabs ?? ['Details'];
  const wizard = useAdminWizardStep(steps);
  const stepTitle = wizard.currentLabel || (screen.batch === 'E' ? 'Basic Information' : screen.title.includes('Role') ? 'Role Information' : 'Personal Information');
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [createBusy, setCreateBusy] = useState(false);
  const liveChurchCreate = shouldUseOperationsLiveData() && screen.batch === 'E';

  async function submitChurchCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!liveChurchCreate) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const locationId = String(form.get('location_id') ?? '').trim();
    const unitId = String(form.get('administrative_unit_id') ?? '').trim();
    if (!name || !locationId || !unitId) {
      setCreateMessage('Name, location, and administrative unit are required.');
      return;
    }
    setCreateBusy(true);
    setCreateMessage(null);
    try {
      const church = await createChurch(
        { name, location_id: locationId, administrative_unit_id: unitId },
        defaultOpsScope(screen.scope),
      );
      setCreateMessage(`Created church ${church.name} (${church.id}).`);
    } catch (err) {
      setCreateMessage(operationsErrorMessage(err, 'Unable to create church.'));
    } finally {
      setCreateBusy(false);
    }
  }

  return (
    <div data-admin-wizard="true">
      <AdminWizardStepper steps={steps} currentStep={wizard.currentStep} />
      <form className="card form-card" onSubmit={(event) => void submitChurchCreate(event)}>
        <h2 className="section-title">{stepTitle}</h2>

        {wizard.currentStep === 0 && (
          screen.batch === 'E' ? (
            <div className="form-grid">
              {churchFields.map((field) => (
                <label key={field.name}>
                  <span>{field.label}</span>
                  {field.type === 'search-select' ? (
                    <SearchSelect name={field.name} catalog={field.catalog} options={catalogOptions[field.catalog]} placeholder={`Search ${field.label.replace(' *', '')}`} />
                  ) : field.type === 'select' ? (
                    <select name={field.name} defaultValue=""><option value="" disabled>Select {field.label.replace(' *', '')}</option>{field.options?.map((option) => <option key={option}>{option}</option>)}</select>
                  ) : (
                    <input name={field.name} type={field.type} placeholder={`Enter ${field.label.replace(' *', '').toLowerCase()}`} />
                  )}
                </label>
              ))}
            </div>
          ) : (
            <FormFields />
          )
        )}

        {wizard.currentStep === 1 && (
          <div className="form-grid">
            {(screen.batch === 'E' ? contactFields : [{ label: 'Role name *', name: 'roleName', type: 'text' as const }, { label: 'Description', name: 'description', type: 'textarea' as const }]).map((field) => (
              <label className={field.type === 'textarea' ? 'full' : ''} key={field.name}>
                <span>{field.label}</span>
                {field.type === 'textarea' ? <textarea name={field.name} rows={4} /> : <input name={field.name} type={field.type} />}
              </label>
            ))}
          </div>
        )}

        {wizard.currentStep === 2 && (
          <div className="form-grid">
            <label className="full"><span>Leader / owner *</span><SearchSelect name="owner_id" catalog="person" options={catalogOptions.person} placeholder="Search responsible person" /></label>
            <label className="full"><span>Scope notes</span><textarea rows={4} placeholder="Describe the assignment scope..." /></label>
          </div>
        )}

        {wizard.currentStep >= 3 && (
          <dl className="wizard-review-summary">
            {Object.entries(screen.details ?? { Name: screen.title, Status: 'Draft' }).map(([key, value]) => (
              <div key={key}><dt>{key}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        )}

        {createMessage ? <p className="field-help" role="status">{createMessage}</p> : null}
        {liveChurchCreate && wizard.currentStep === 0 ? (
          <div className="form-footer">
            <button className="primary-button" type="submit" disabled={createBusy}>
              {createBusy ? 'Creating…' : 'Create church'}
            </button>
          </div>
        ) : (
          <AdminWizardFooter wizard={wizard} nextLabel={screen.action} finishLabel={screen.action?.includes('Save') ? screen.action : 'Submit'} />
        )}
      </form>
    </div>
  );
}

function formatProfileDate(value?: string | null): string {
  if (!value) return 'Not available';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function ProfileView({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const isOwnAdminProfile = screen.route === '/admin/profile';
  const [user, setUser] = useState<AdminProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwnAdminProfile) return;
    let cancelled = false;
    void fetchAdminProfile()
      .then((currentUser) => {
        if (!cancelled) setUser(currentUser);
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load your profile.');
      });
    return () => { cancelled = true; };
  }, [isOwnAdminProfile]);

  if (!isOwnAdminProfile) {
    return <div className="profile-layout"><article className="card identity-card"><div className="portrait large">GE</div><h2>{t('admin.profileUnavailable', { defaultMessage: 'Profile details unavailable' })}</h2></article></div>;
  }

  if (error) return <div className="card empty-state" role="alert">{error}</div>;
  if (!user) return <div className="card empty-state" role="status">{t('admin.loadingProfile', { defaultMessage: 'Loading your profile…' })}</div>;

  const legalName = [user.profile.given_name, user.profile.middle_name, user.profile.family_name]
    .filter((part): part is string => Boolean(part?.trim()))
    .join(' ');
  const name = user.profile.preferred_name?.trim() || legalName || user.email;
  const status = user.account_status ?? 'unknown';
  const details: Record<string, string> = {
    [t('admin.fullName', { defaultMessage: 'Full Name' })]: name,
    [t('auth.emailAddress', { defaultMessage: 'Email Address' })]: user.email,
    [t('admin.role', { defaultMessage: 'Role' })]: user.roles?.join(', ') || t('admin.noRoleAssigned', { defaultMessage: 'No role assigned' }),
    [t('account.timezone', { defaultMessage: 'Timezone' })]: user.preferences?.timezone || t('common.notProvided', { defaultMessage: 'Not provided' }),
    [t('common.language', { defaultMessage: 'Language' })]: user.preferences?.locale || t('common.notProvided', { defaultMessage: 'Not provided' }),
    [t('admin.accountStatus', { defaultMessage: 'Account Status' })]: status,
    [t('admin.lastActive', { defaultMessage: 'Last Active' })]: formatProfileDate(user.last_active_at),
    [t('admin.memberSince', { defaultMessage: 'Member Since' })]: formatProfileDate(user.member_since),
  };

  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'ME';

  return <div className="profile-layout"><article className="card identity-card"><div className="portrait large">{initials}</div><h2>{name}</h2><StatusBadge value={status} /></article><article className="card details-card profile-details"><dl>{Object.entries(details).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card account-card"><h2>{t('admin.accountStatus', { defaultMessage: 'Account Status' })}</h2><strong className="trend">{status}</strong><p>{t('admin.lastActive', { defaultMessage: 'Last Active' })}<br/><b>{formatProfileDate(user.last_active_at)}</b></p><p>{t('admin.memberSince', { defaultMessage: 'Member Since' })}<br/><b>{formatProfileDate(user.member_since)}</b></p></article><Link href="/account/profile" className="primary-button profile-save">{t('admin.updateProfile', { defaultMessage: 'Update Profile' })}</Link></div>;
}

function PermissionsView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState('all');
  const live = !shouldUseDesignFixtures();

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await listAdminPermissions({ scope: defaultAdminScope(requestedScope), perPage: 100, sort: 'code' });
        if (cancelled) return;
        setPermissions(result.data);
        setTotal(result.pagination.total);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setPermissions([]);
        setError(identityErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [live, requestedScope]);

  if (!live) {
  const actions=['View','Create','Edit','Delete'];
  return <div className="permission-layout"><aside className="card module-list"><strong>Modules</strong>{(screen.items ?? []).map((item,index)=><button className={index===0?'active':''} key={item}>{item}</button>)}</aside><div className="card permission-table"><div className="permission-head"><strong>Permissions (42)</strong>{actions.map(action=><b key={action}>{action}</b>)}</div>{['View Users','Create Users','Edit Users','Delete Users','Reset Passwords'].map((item,row)=><div className="permission-row" key={item}><span>◉　{item}</span>{actions.map((action,col)=><input aria-label={`${action} ${item}`} type="checkbox" defaultChecked={row<3||col<2} key={action}/>)}</div>)}</div></div>;
  }

  const modules = Array.from(new Set(permissions.map((permission) => permission.code.split('.')[0] || 'other'))).sort();
  const filtered = moduleFilter === 'all' ? permissions : permissions.filter((permission) => permission.code.startsWith(`${moduleFilter}.`));

  return (
    <div className="permission-layout">
      <aside className="card module-list">
        <strong>{t('admin.modules', { defaultMessage: 'Modules' })}</strong>
        <button type="button" className={moduleFilter === 'all' ? 'active' : ''} onClick={() => setModuleFilter('all')}>{t('common.all', { defaultMessage: 'All' })}</button>
        {modules.map((module) => (
          <button type="button" className={moduleFilter === module ? 'active' : ''} key={module} onClick={() => setModuleFilter(module)}>{module}</button>
        ))}
      </aside>
      <div className="card permission-table">
        <div className="permission-head" style={{ gridTemplateColumns: '1fr 220px' }}><strong>{t('admin.permissionsCount', { vars: { total }, defaultMessage: `Permissions (${total})` })}</strong><b>{t('admin.id', { defaultMessage: 'Id' })}</b></div>
        {error && <IdentityLoadState message={error} tone="danger" />}
        {filtered.map((permission) => (
          <div className="permission-row" style={{ gridTemplateColumns: '1fr 220px' }} key={permission.id}>
            <span>◉　{permission.code}</span>
            <code>{permission.id}</code>
          </div>
        ))}
        {!error && filtered.length === 0 && <IdentityLoadState message={t('admin.noPermissionsInModule', { defaultMessage: 'No permissions in this module.' })} />}
        <IdentityRoleGrantForm requestedScope={requestedScope} permissions={permissions} />
      </div>
    </div>
  );
}

function MatrixView() {
  const roles=['Global Admin','Country Admin','Church Admin','Home Church Leader','Member'];
  return <div className="card matrix-card"><div className="matrix-row matrix-head"><strong>Permission</strong>{roles.map(role=><b key={role}>{role}</b>)}</div>{['View Churches','Create Church','Edit Church','Delete Church','Approve Church','Assign Church Admin'].map((permission,row)=><div className="matrix-row" key={permission}><span>{permission}</span>{roles.map((role,col)=><i className={col+row<7?'yes':'no'} key={role}>{col+row<7?'●':'○'}</i>)}</div>)}</div>;
}

function IdentityRoleGrantForm({
  requestedScope,
  permissions,
}: {
  requestedScope?: string;
  permissions: AdminPermission[];
}) {
  const { t } = useLocale();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const apiReady = identityApiConfigured();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listAdminRoles({ scope: defaultAdminScope(requestedScope), perPage: 50, sort: 'code' });
        if (cancelled) return;
        setRoles(result.data);
      } catch (err) {
        if (cancelled) return;
        setRoles([]);
        setError(identityErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [requestedScope]);

  async function onGrant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiReady) {
      setError('The Laravel API is not configured.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const roleId = String(form.get('role_id') ?? '').trim();
    const permissionId = String(form.get('permission_id') ?? '').trim();
    if (!roleId || !permissionId) {
      setError('A live role ULID and permission ULID are required.');
      setMessage(null);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const grant = await grantAdminRolePermission(
        roleId,
        { permission_id: permissionId },
        defaultAdminScope(requestedScope),
      );
      setMessage(`Granted ${grant.permission_code ?? permissionId} on role ${grant.role_id ?? roleId} (${grant.id}).`);
    } catch (err) {
      setError(identityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="form-grid" style={{ marginTop: 16 }} onSubmit={(event) => void onGrant(event)}>
      <label>
        <span>{t('admin.roleRequired', { defaultMessage: 'Role *' })}</span>
        <select name="role_id" defaultValue="" required disabled={!apiReady || roles.length === 0}>
          <option value="" disabled>{roles.length ? t('admin.selectLiveRole', { defaultMessage: 'Select a live role' }) : t('admin.noLiveRolesLoaded', { defaultMessage: 'No live roles loaded' })}</option>
          {roles.map((role) => (
            <option key={role.id} value={role.id}>{role.name} ({role.code})</option>
          ))}
        </select>
      </label>
      <label>
        <span>{t('admin.permissionRequired', { defaultMessage: 'Permission *' })}</span>
        <select name="permission_id" defaultValue="" required disabled={!apiReady || permissions.length === 0}>
          <option value="" disabled>{permissions.length ? t('admin.selectLivePermission', { defaultMessage: 'Select a live permission' }) : t('admin.noLivePermissionsLoaded', { defaultMessage: 'No live permissions loaded' })}</option>
          {permissions.map((permission) => (
            <option key={permission.id} value={permission.id}>{permission.code}</option>
          ))}
        </select>
      </label>
      {error ? <IdentityLoadState message={error} tone="danger" /> : null}
      {message ? <p className="field-help" role="status">{message}</p> : null}
      <div className="form-footer">
        <button className="primary-button" type="submit" disabled={!apiReady || busy} title={apiReady ? undefined : t('admin.apiNotConfigured', { defaultMessage: 'The Laravel API is not configured' })}>
          {busy ? t('admin.granting', { defaultMessage: 'Granting…' }) : t('admin.grantPermission', { defaultMessage: 'Grant permission' })}
        </button>
      </div>
    </form>
  );
}

function IdentityUserRoleAssignForm({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const apiReady = identityApiConfigured();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const scope = defaultAdminScope(requestedScope);
      try {
        const [userResult, roleResult] = await Promise.all([
          listAdminUsers({ scope, perPage: 50, sort: '-created_at' }),
          listAdminRoles({ scope, perPage: 50, sort: 'code' }),
        ]);
        if (cancelled) return;
        setUsers(userResult.data);
        setRoles(roleResult.data);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setUsers([]);
        setRoles([]);
        setError(identityErrorMessage(err));
      }
    })();
    return () => { cancelled = true; };
  }, [requestedScope]);

  async function onAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiReady) {
      setError('The Laravel API is not configured.');
      return;
    }
    const form = new FormData(event.currentTarget);
    const userId = String(form.get('user_id') ?? '').trim();
    const roleId = String(form.get('role_id') ?? '').trim();
    const expiresRaw = String(form.get('expires_at') ?? '').trim();
    const expiresAt = expiresRaw ? new Date(expiresRaw) : null;
    if (!userId || !roleId) {
      setError('A live user ULID and role ULID are required.');
      setMessage(null);
      return;
    }
    if (expiresRaw && (!expiresAt || Number.isNaN(expiresAt.getTime()))) {
      setError('expires_at must be a valid date.');
      setMessage(null);
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const assignment = await assignAdminUserRole(
        userId,
        { role_id: roleId, expires_at: expiresAt ? expiresAt.toISOString() : null },
        defaultAdminScope(requestedScope),
      );
      setMessage(`Assigned role ${assignment.role_code ?? assignment.role_id ?? roleId} (${assignment.id}).`);
    } catch (err) {
      setError(identityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card" onSubmit={(event) => void onAssign(event)}>
      <p className="maps-settings-lead">
        {apiReady
          ? t('admin.assignRoleCopy', {
              defaultMessage: 'Assign a live catalogue role to a live user. Submit calls POST /admin/users/{user}/role-assignments.',
            })
          : t('admin.assignRoleBlocked', {
              defaultMessage: 'The Laravel API is not configured; role assignment submit is blocked.',
            })}
      </p>
      <div className="form-grid">
        <label>
          <span>{t('admin.userRequired', { defaultMessage: 'User *' })}</span>
          <select name="user_id" defaultValue="" required disabled={!apiReady || users.length === 0}>
            <option value="" disabled>{users.length ? t('admin.selectLiveUser', { defaultMessage: 'Select a live user' }) : t('admin.noLiveUsersLoaded', { defaultMessage: 'No live users loaded' })}</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('admin.roleRequired', { defaultMessage: 'Role *' })}</span>
          <select name="role_id" defaultValue="" required disabled={!apiReady || roles.length === 0}>
            <option value="" disabled>{roles.length ? t('admin.selectLiveRole', { defaultMessage: 'Select a live role' }) : t('admin.noLiveRolesLoaded', { defaultMessage: 'No live roles loaded' })}</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>{role.name} ({role.code})</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('admin.expiresAt', { defaultMessage: 'Expires at' })}</span>
          <input name="expires_at" type="datetime-local" disabled={!apiReady} />
        </label>
      </div>
      {error ? <IdentityLoadState message={error} tone="danger" /> : null}
      {message ? <p className="field-help" role="status">{message}</p> : null}
      <div className="form-footer">
        <button className="ghost-button" type="button">{t('common.cancel', { defaultMessage: 'Cancel' })}</button>
        <button className="primary-button" type="submit" disabled={!apiReady || busy} title={apiReady ? undefined : t('admin.apiNotConfigured', { defaultMessage: 'The Laravel API is not configured' })}>
          {busy ? t('common.saving', { defaultMessage: 'Saving…' }) : screen.action ?? t('admin.saveAssignments', { defaultMessage: 'Save Assignments' })}
        </button>
      </div>
    </form>
  );
}

function OrganizationScopeForm({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const [countryOptions, setCountryOptions] = useState(catalogOptions.country);
  const [unitOptions, setUnitOptions] = useState(catalogOptions.administrativeUnit);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [message, setMessage] = useState('Loading organization catalogs…');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const apiReady = identityApiConfigured();
  const assignments = roleAssignmentOptions(users);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [countries, units, userResult] = await Promise.all([
          listCountries(),
          listUnits(),
          listAdminUsers({ scope: defaultAdminScope(requestedScope), perPage: 50, sort: '-created_at' }),
        ]);
        if (cancelled) return;
        setCountryOptions(countriesToSelectOptions(countries));
        setUnitOptions(unitsToSelectOptions(units));
        setUsers(userResult.data);
        setMessage(
          countries.length || units.length
            ? 'Live organization catalogs loaded. Submit assigns a scope to a live role assignment.'
            : 'No organization records yet. Scope submit still requires a live role assignment ULID and scope record ULID.',
        );
        setError(null);
      } catch (caught) {
        if (cancelled) return;
        setMessage(organizationErrorMessage(caught));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [requestedScope]);

  async function onAssignScope(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!apiReady) {
      setError('The Laravel API is not configured.');
      return;
    }
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const roleAssignmentId = String(form.get('role_assignment_id') ?? '').trim();
    const scopeType = mapIdentityScopeType(String(form.get('scope_type') ?? ''));
    const scopeId = resolveIdentityScopeId(form, scopeType);
    if (!roleAssignmentId || !scopeType || !scopeId) {
      setError('Role assignment, scope type, and a live scope record ULID are required.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await assignAdminRoleAssignmentScope(
        roleAssignmentId,
        { scope_type: scopeType, scope_id: scopeId },
        defaultAdminScope(requestedScope),
      );
      setMessage(`Assigned ${created.scope_type ?? scopeType}:${created.scope_key ?? scopeId} (${created.id}).`);
      formEl.reset();
    } catch (err) {
      setError(identityErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card settings-card" onSubmit={(event) => void onAssignScope(event)}>
      <p className="maps-settings-lead">{message}</p>
      <div className="form-grid">
        <label>
          <span>Role assignment *</span>
          <select name="role_assignment_id" defaultValue="" required disabled={!apiReady || assignments.length === 0}>
            <option value="" disabled>
              {assignments.length ? 'Select a live role assignment' : 'No live role assignments loaded'}
            </option>
            {assignments.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Scope Type *</span>
          <select name="scope_type" defaultValue="administrative_unit" disabled={!apiReady}>
            {IDENTITY_SCOPE_TYPE_VALUES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="full">
          <span>Country</span>
          <SearchSelect name="country_id" catalog="country" options={countryOptions} placeholder="Search country" disabled={!apiReady} />
        </label>
        <label className="full">
          <span>Administrative Unit *</span>
          <SearchSelect name="administrative_unit_id" catalog="administrativeUnit" options={unitOptions} placeholder="Search administrative unit" disabled={!apiReady} />
        </label>
        <label>
          <span>Church</span>
          <SearchSelect name="church_id" catalog="church" options={catalogOptions.church} placeholder="Search church" disabled={!apiReady} />
        </label>
        <label>
          <span>Home church</span>
          <SearchSelect name="home_church_id" catalog="homeChurch" options={catalogOptions.homeChurch} placeholder="Search home church" disabled={!apiReady} />
        </label>
        <label className="full">
          <span>Access Level</span>
          <select name="access_level" defaultValue="Full Access" disabled>
            <option>Full Access</option>
            <option>Read Only</option>
            <option>Manage Users</option>
          </select>
        </label>
        <label className="full switch-row">
          <input type="checkbox" name="allow_manage_users" defaultChecked disabled />
          <span>Allow Manage Users in this Scope (not sent; API has no access-level field)</span>
        </label>
      </div>
      {error ? <IdentityLoadState message={error} tone="danger" /> : null}
      <div className="form-footer">
        <button className="ghost-button" type="button">Cancel</button>
        <button
          className="primary-button"
          type="submit"
          disabled={!apiReady || busy}
          title={apiReady ? undefined : 'The Laravel API is not configured'}
        >
          {busy ? 'Assigning…' : screen.action ?? 'Assign Scope'}
        </button>
      </div>
    </form>
  );
}

function FormView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  if (screen.route === '/admin/access/scope-assignments' && !shouldUseDesignFixtures()) {
    return <IdentityScopeAssignmentsView requestedScope={requestedScope} />;
  }
  if (screen.route === '/admin/access/user-role-assignment' && !shouldUseDesignFixtures()) {
    return <IdentityUserRoleAssignForm screen={screen} requestedScope={requestedScope} />;
  }
  if (!shouldUseOrganizationFixtures() && (screen.route.includes('/geography/scope') || screen.id === 'C-12')) {
    return <OrganizationScopeForm screen={screen} requestedScope={requestedScope} />;
  }
  const fixtures = shouldUseDesignFixtures();
  return (
    <div className="card settings-card">
      {!fixtures ? (
        <p className="maps-settings-lead" role="status">
          No live create/update API is wired for this form. Design fixtures are disabled; submit is blocked.
        </p>
      ) : null}
      <div className="form-grid">
        <label>
          <span>Select User *</span>
          <SearchSelect
            name="user_id"
            catalog="person"
            options={catalogOptions.person}
            defaultValue={fixtures ? '01JPERSONJOHN' : undefined}
            placeholder="Search people"
            disabled={!fixtures}
          />
        </label>
        <label>
          <span>Scope Type *</span>
          <select name="scope_type" defaultValue="Administrative Scope" disabled={!fixtures}>
            <option>Administrative Scope</option>
            <option>Church Scope</option>
            <option>Home Church Scope</option>
          </select>
        </label>
        <label className="full">
          <span>Administrative Unit *</span>
          <SearchSelect
            name="administrative_unit_id"
            catalog="administrativeUnit"
            options={catalogOptions.administrativeUnit}
            defaultValue={fixtures ? '01JADMINIKEJA' : undefined}
            placeholder="Search administrative unit"
            disabled={!fixtures}
          />
        </label>
        <label className="full">
          <span>Access Level</span>
          <select name="access_level" defaultValue="Full Access" disabled={!fixtures}>
            <option>Full Access</option>
            <option>Read Only</option>
            <option>Manage Users</option>
          </select>
        </label>
        <label className="full switch-row">
          <input type="checkbox" name="allow_manage_users" defaultChecked disabled={!fixtures} />
          <span>Allow Manage Users in this Scope</span>
        </label>
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button">Cancel</button>
        <button className="primary-button" type="button" disabled={!fixtures} title={fixtures ? undefined : 'No live mutation API for this form'}>
          {screen.action}
        </button>
      </div>
    </div>
  );
}

function TreeView({ screen }: { screen: AdminScreen }) {
  return <HierarchyTreeView route={screen.route} title={screen.title} />;
}

function MapView({ screen }: { screen: AdminScreen }) {
  return (
    <>
      <div className="map-filters">
        <button type="button">All Countries⌄</button>
        <button type="button">All Levels⌄</button>
        <button type="button">All Status⌄</button>
        <span><i className="high"/>High Activity</span>
        <span><i/>Medium Activity</span>
        <span><i className="low"/>Low Activity</span>
      </div>
      <div className={`card map-card ${screen.details ? 'location-map' : ''}`}>
        <InteractiveMap height={520} className="admin-interactive-map" />
        {screen.details ? (
          <aside className="map-info">
            <h2>Location Information</h2>
            <dl>
              {Object.entries(screen.details).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        ) : null}
      </div>
    </>
  );
}

function DonutVisual({ value = '726', label = 'Average', breakdown }: { value?: string; label?: string; breakdown?: Array<{ label: string; value: string; percent?: number }> }) {
  const segments = breakdown?.length
    ? breakdown.slice(0, 3).map((item) => ({ label: item.label, percent: item.percent ?? 0 }))
    : [
      { label: 'Adults', percent: 64 },
      { label: 'Youth', percent: 21 },
      { label: 'Children', percent: 15 },
    ];
  return <div className="donut-wrap"><div className="donut-chart"><div><strong>{value}</strong><span>{label}</span></div></div><ul>{segments.map((item) => <li key={item.label}><i />{item.label} <b>{item.percent}%</b></li>)}</ul></div>;
}

function MinistryDashboardView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const metrics = dashboard.live ? dashboard.metrics : screen.metrics;
  const donut = dashboard.data?.donut;
  const activities = dashboard.live
    ? (dashboard.data?.recent_activities ?? []).map((activity) => ({
      title: activity.title,
      time: formatRelativeTime(activity.occurred_at),
    }))
    : ['New member added', 'Attendance recorded', 'Application reviewed', 'First timer registered'].map((item, index) => ({ title: item, time: `${index + 1}h ago` }));

  return <><DashboardLiveNotice loading={dashboard.loading} error={dashboard.error} /><MetricCards metrics={metrics} /><div className="ministry-dashboard-grid"><ChartCard title={screen.batch === 'D' ? 'Home Churches Growth (6 Months)' : 'Membership Growth'} series={dashboard.data?.series} /><article className="card dashboard-donut"><h2 className="card-title">{screen.batch === 'D' ? 'Application Status' : 'Attendance Overview'}</h2><DonutVisual value={donut?.value ?? (screen.batch === 'D' ? '24' : '726')} label={donut?.label ?? (screen.batch === 'D' ? 'Total' : 'Average')} breakdown={dashboard.data?.breakdown} /></article><article className="card compact-list"><h2 className="card-title">Quick Actions</h2>{(screen.items ?? []).slice(0, 4).map((item, index) => <button key={item}><span>{['▣', '▦', '◇', '▤'][index]}</span>{item}</button>)}</article><article className="card compact-list"><h2 className="card-title">Recent Activities</h2>{activities.map((item) => <div className="activity-row" key={item.title}><span>●</span><b>{item.title}</b><time>{item.time}</time></div>)}</article></div></>;
}

function WorkflowView({ screen }: { screen: AdminScreen }) {
  const decision = screen.details?.Decision;
  const steps = screen.tabs ?? [];
  const wizard = useAdminWizardStep(steps);
  const routeApplicationId = screen.route.match(/^\/admin\/home-churches\/applications\/([^/]+)\//)?.[1] ?? '';
  const [applicationId, setApplicationId] = useState(extractUlid(routeApplicationId) ?? routeApplicationId);
  const [transitionStatus, setTransitionStatus] = useState('submitted');
  const [reasonCode, setReasonCode] = useState('application_received');
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const liveWorkflow = shouldUseOperationsLiveData() && screen.nav === 'applications';

  async function submitTransition() {
    if (!applicationId.trim()) {
      setWorkflowMessage('Enter the home church application public id (ULID).');
      return;
    }
    setWorkflowBusy(true);
    setWorkflowMessage(null);
    try {
      const updated = await transitionHomeChurchApplication(
        applicationId.trim(),
        { status: transitionStatus, reason_code: reasonCode.trim() },
        defaultOpsScope(screen.scope),
      );
      setWorkflowMessage(`Transitioned to ${updated.status}.`);
    } catch (err) {
      setWorkflowMessage(operationsErrorMessage(err, 'Application transition failed.'));
    } finally {
      setWorkflowBusy(false);
    }
  }

  return (
    <div className="workflow-layout" data-admin-wizard="true">
      <aside className="workflow-steps">
        <AdminWizardStepper steps={steps} currentStep={decision ? 2 : wizard.currentStep} itemClassName="" activeClassName="active" completeClassName="done" />
      </aside>
      <article className="card workflow-card">
        {liveWorkflow ? (
          <>
            <h2>Application transition</h2>
            <p className="page-subtitle">Call `POST /admin/church/home-church-applications/&#123;id&#125;/transitions` with credentials and scope.</p>
            <div className="form-grid">
              <label className="full"><span>Application id *</span><input value={applicationId} onChange={(event) => setApplicationId(event.target.value)} placeholder="01J…" /></label>
              <label>
                <span>Status *</span>
                <select value={transitionStatus} onChange={(event) => setTransitionStatus(event.target.value)}>
                  {['draft', 'submitted', 'under_review', 'interview_orientation', 'approved', 'active', 'rejected', 'suspended', 'closed'].map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label><span>Reason code *</span><input value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} /></label>
            </div>
            {workflowMessage ? <p className="field-help" role="status">{workflowMessage}</p> : null}
            <div className="form-footer">
              <button className="primary-button" type="button" data-interaction-native="true" disabled={workflowBusy} onClick={() => void submitTransition()}>
                {workflowBusy ? 'Submitting…' : 'Submit transition'}
              </button>
            </div>
          </>
        ) : decision ? (
          <>
            <h2>Decision</h2>
            <div className="decision-box danger"><span>⊖</span><div><strong>{decision}</strong><p>This application does not meet the requirements.</p></div></div>
            <div className="workflow-form">{Object.entries(screen.details ?? {}).filter(([key]) => key !== 'Decision').map(([key, value]) => <label key={key}><span>{key}</span>{key === 'Comments' ? <textarea defaultValue={value} /> : key === 'Notify Applicant' ? <input type="checkbox" defaultChecked /> : <select defaultValue={value}><option>{value}</option></select>}</label>)}</div>
          </>
        ) : (
          <>
            {wizard.currentStep === 0 && (
              <>
                <h2>Review Checklist</h2>
                <div className="checklist">{(screen.items ?? []).map((item, index) => <div key={item}><span>{item.split(' — ')[0]}</span><StatusBadge value={item.split(' — ')[1]} />{index > 4 && <i />}</div>)}</div>
                <label className="comment-label"><span>Comments</span><textarea placeholder="Enter review comments..." /></label>
              </>
            )}
            {wizard.currentStep === 1 && (
              <>
                <h2>Interview / Orientation</h2>
                <div className="form-grid">
                  <label><span>Interview date</span><input type="date" defaultValue="2024-05-30" /></label>
                  <label><span>Interviewer</span><SearchSelect name="interviewer_id" catalog="person" options={catalogOptions.person} placeholder="Search interviewer" /></label>
                  <label className="full"><span>Orientation notes</span><textarea rows={4} placeholder="Record interview outcomes..." /></label>
                </div>
              </>
            )}
            {wizard.currentStep === 2 && (
              <>
                <h2>Approval Decision</h2>
                <div className="form-grid">
                  <label><span>Decision</span><select defaultValue="Approve"><option>Approve</option><option>Defer</option><option>Reject</option></select></label>
                  <label className="full"><span>Decision notes</span><textarea rows={4} placeholder="Explain the decision..." /></label>
                </div>
              </>
            )}
            {wizard.currentStep >= 3 && (
              <>
                <h2>Activation</h2>
                <dl className="wizard-review-summary">{Object.entries(screen.details ?? { Status: 'Ready to activate' }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
              </>
            )}
          </>
        )}
        {!liveWorkflow && !decision && <AdminWizardFooter wizard={wizard} nextLabel={screen.action} finishLabel="Activate home church" />}
        {!liveWorkflow && decision && <div className="form-footer"><button className="ghost-button">Back</button><button className="danger-button">{screen.action}</button></div>}
      </article>
    </div>
  );
}

function ActivationView({ screen }: { screen: AdminScreen }) {
  return <div className="card activation-card"><div className="approval-hero"><span>✓</span><h2>Application Approved!</h2><p>The home church has been approved. Activate their ID and grant access.</p></div><dl>{Object.entries(screen.details ?? {}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{key === 'Access Status' ? <StatusBadge value={value}/> : value}</dd></div>)}</dl><button className="primary-button">{screen.action}</button></div>;
}

function OperationsView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const opsDataset = resolveOpsDataset(screen);
  if (opsDataset && shouldUseOperationsLiveData() && screen.route.includes('small-groups')) {
    return (
      <OperationsLiveTable
        screen={{
          ...screen,
          columns: ['Home Church', 'Leader', 'Location', 'Members', 'Status'],
        }}
        dataset={opsDataset}
      />
    );
  }
  const activityMode = screen.id === 'D-11';
  return <><MetricCards metrics={screen.metrics}/>{activityMode ? <div className="card activity-stack">{(screen.items ?? []).map((item,index)=>{const parts=item.split(' — ');return <article key={item}><time><b>{['May 25','May 19','May 12','May 5','Apr 28'][index]}</b></time><div><strong>{parts[0]}</strong><span>{parts[1]}</span></div><b>♙ {parts[2]}</b><StatusBadge value="Completed"/></article>})}<button className="ghost-button">View all activities</button></div> : <div className="operations-grid"><ChartCard title="Attendance Trend"/><article className="card dashboard-donut"><h2 className="card-title">Attendance by Service</h2><DonutVisual value={screen.id === 'D-10' ? '22' : '726'} label="Total"/></article><article className="card list-card operation-ranking"><h2 className="card-title">Top Services by Attendance</h2>{(screen.items ?? []).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</article></div>}</>;
}

function JourneyView({ screen }: { screen: AdminScreen }) {
  const details = screen.details ?? {};
  return <><div className="journey-rail">{(screen.items ?? []).map((item,index)=><div className={index<2?'complete':index===2?'active':''} key={item}><span>{index+1}</span><b>{item.split(' — ')[0]}</b></div>)}</div><article className="card journey-card"><header><div className="portrait">{details.Name?.split(' ').map(part=>part[0]).slice(0,2).join('')}</div><div><h2>{details.Name}</h2><p>Current {details.Stage}</p></div><strong>{details.Progress}</strong></header><div className="progress-track"><i style={{width:details.Progress}}/></div><div className="journey-list">{(screen.items ?? []).map((item,index)=><div key={item}><span className={index<2?'done':index===2?'doing':''}>{index<2?'✓':'●'}</span><b>{item.split(' — ')[0]}</b><StatusBadge value={item.split(' — ')[1]}/></div>)}</div><button className="primary-button">View Journey Details</button></article></>;
}

function ApprovalView({ screen }: { screen: AdminScreen }) {
  const isPrayer = screen.nav === 'prayer' || screen.title.includes('Prayer');
  const live = shouldUseOperationsLiveData();
  const recordId = pastoralRecordIdFromRoute(screen.route);
  const [prayer, setPrayer] = useState<PrayerRequestRecord | null>(null);
  const [need, setNeed] = useState<PastoralNeedRecord | null>(null);
  const [loaded, setLoaded] = useState(!live);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      setLoaded(false);
      try {
        if (isPrayer) {
          const result = await listPrayerRequests({ perPage: 100, scope: defaultOpsScope(screen.scope) });
          const match = recordId ? result.items.find((item) => item.id === recordId) : result.items[0] ?? null;
          if (!cancelled) setPrayer(match ?? null);
        } else {
          const result = await listPastoralNeeds({ perPage: 100, scope: defaultOpsScope(screen.scope) });
          const match = recordId ? result.items.find((item) => item.id === recordId) : result.items[0] ?? null;
          if (!cancelled) setNeed(match ?? null);
        }
      } catch (err) {
        if (!cancelled) setError(operationsErrorMessage(err, 'Unable to load this request.'));
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPrayer, live, recordId, screen.scope]);

  async function onTransition(status: string) {
    const id = isPrayer ? prayer?.id : need?.id;
    if (!id) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (isPrayer) {
        const updated = await transitionPrayerRequest(id, status, defaultOpsScope(screen.scope));
        setPrayer(updated);
        setMessage(status === 'rejected' ? 'Prayer request rejected.' : `Prayer request marked ${status}.`);
      } else {
        const updated = await transitionPastoralNeed(id, status, defaultOpsScope(screen.scope));
        setNeed(updated);
        setMessage(status === 'rejected' ? 'Need request rejected.' : `Need request marked ${status}.`);
      }
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to update this request.'));
    } finally {
      setBusy(false);
    }
  }

  async function onAssign(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prayer?.id) return;
    const data = new FormData(event.currentTarget);
    const assignedTo = String(data.get('assigned_to_person_id') ?? '').trim();
    if (!assignedTo) {
      setError('Select an intercessor before assigning this prayer request.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await assignPrayerRequest(
        prayer.id,
        { assigned_to_person_id: assignedTo, note: String(data.get('note') ?? '').trim() || undefined },
        defaultOpsScope(screen.scope),
      );
      setPrayer(updated);
      setMessage(`Prayer request assigned to ${updated.assigned_to_name || 'the selected intercessor'}.`);
    } catch (err) {
      setError(operationsErrorMessage(err, 'Unable to assign this prayer request.'));
    } finally {
      setBusy(false);
    }
  }

  if (live) {
    const empty = loaded && (isPrayer ? prayer === null : need === null);
    return (
      <div className="approval-grid">
        <article className="card approval-details">
          <h2>{isPrayer ? 'Request' : 'Need Details'}</h2>
          {error ? <p className="field-help identity-error" role="alert">{error}</p> : null}
          {!loaded && !error ? <p className="field-help">Loading…</p> : null}
          {empty && !error ? <p className="field-help">No live {isPrayer ? 'prayer requests' : 'need requests'} in this scope.</p> : null}
          {isPrayer && prayer ? (
            <>
              <div><span>Request</span><strong>{prayer.subject}</strong></div>
              <div><span>Requested By</span><strong>{prayer.person_name || '—'}</strong></div>
              <div><span>Requested on</span><strong>{prayer.created_at ? new Date(prayer.created_at).toLocaleDateString() : '—'}</strong></div>
              <div><span>Status</span><strong>{prayer.status}</strong></div>
            </>
          ) : null}
          {!isPrayer && need ? (
            <>
              <div><span>Need</span><strong>{need.summary}</strong></div>
              <div><span>Requested By</span><strong>{need.person_name || '—'}</strong></div>
              <div><span>Category</span><strong>{need.category}</strong></div>
              <div><span>Requested on</span><strong>{need.created_at ? new Date(need.created_at).toLocaleDateString() : '—'}</strong></div>
              <div><span>Status</span><strong>{need.status}</strong></div>
            </>
          ) : null}
        </article>
        <form className="card approval-review" onSubmit={isPrayer ? onAssign : undefined}>
          <h2>{isPrayer ? 'Assign To' : 'Review'}</h2>
          {isPrayer && prayer ? (
            <>
              <label>
                <span>Details</span>
                <textarea readOnly rows={5} value={prayer.body} />
              </label>
              <label>
                <span>Assign to intercessor</span>
                <SearchSelect name="assigned_to_person_id" catalog="person" placeholder="Search intercessor" />
              </label>
              <label>
                <span>Assignment note (optional)</span>
                <textarea name="note" rows={3} placeholder="Add pastoral context for the intercessor." />
              </label>
            </>
          ) : null}
          {!isPrayer && need ? (
            <label>
              <span>Details</span>
              <textarea readOnly rows={5} value={need.summary} />
            </label>
          ) : null}
          <p className="field-help">
            {isPrayer ? 'Assignment records the intercessor, note, and timestamp in the live prayer workflow.' : 'Review updates the live request status.'}
          </p>
          {message ? <p className="field-help" role="status">{message}</p> : null}
          <div className="form-footer">
            <button className="danger-button" type="button" data-interaction-native="true" disabled={busy || empty} onClick={() => void onTransition('rejected')}>
              {busy ? 'Saving…' : 'Reject'}
            </button>
            <button
              className="primary-button"
              type={isPrayer ? 'submit' : 'button'}
              data-interaction-native="true"
              disabled={busy || empty}
              onClick={isPrayer ? undefined : () => void onTransition('approved')}
            >
              {busy ? 'Saving…' : screen.action ?? (isPrayer ? 'Assign Prayer' : 'Approve')}
            </button>
          </div>
        </form>
      </div>
    );
  }

  const entries = Object.entries(screen.details ?? {});
  return (
    <div className="approval-grid">
      <article className="card approval-details">
        <h2>{isPrayer ? 'Request' : 'Need Details'}</h2>
        {entries.slice(0, Math.ceil(entries.length / 2)).map(([key, value]) => (
          <div key={key}><span>{key}</span><strong>{value}</strong></div>
        ))}
      </article>
      <article className="card approval-review">
        <h2>{isPrayer ? 'Assign To' : 'Review'}</h2>
        {entries.slice(Math.ceil(entries.length / 2)).map(([key, value]) => (
          <label key={key}>
            <span>{key}</span>
            {/Details|Notes/.test(key) ? <textarea defaultValue={/Notes/.test(key) ? '' : value} placeholder={/Notes/.test(key) ? 'Enter a note for the intercessor…' : undefined} /> : <div className="token-input"><b>{value}</b></div>}
          </label>
        ))}
        <div className="form-footer">
          <button className="danger-button" type="button">Reject</button>
          <button className="primary-button" type="button">{screen.action}</button>
        </div>
      </article>
    </div>
  );
}

function pastoralRecordIdFromRoute(route: string): string | null {
  const match = route.match(/\/(?:prayer-requests|needs)\/([^/]+)\//);
  if (!match) return null;
  return /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/i.test(match[1]) ? match[1] : null;
}

function SettingsView({ screen }: { screen: AdminScreen }) {
  if (screen.route.includes('/settings/maps')) {
    return <MapsSettingsPanel />;
  }
  if (screen.route.includes('/settings/payments') || screen.route.includes('/finance/providers')) {
    return <PaymentsSettingsPanel />;
  }
  if (screen.route.includes('/communications/settings')) {
    return <CommunicationsSettingsPanel />;
  }
  if (screen.route.includes('/settings/kca')) {
    return <KcaSettingsPanel />;
  }
  if (screen.route.includes('/settings/branding')) {
    return <BrandingSettingsPanel />;
  }
  if (screen.route.includes('/geography/settings') && !shouldUseOrganizationFixtures()) {
    return <HierarchyTreeView route="/admin/geography/hierarchy" title={screen.title} />;
  }
  const destructive = screen.id === 'D-14';
  const fixtures = shouldUseDesignFixtures();
  return (
    <div className="card settings-card ministry-settings">
      {!fixtures ? (
        <p className="maps-settings-lead" role="status">
          No dedicated live settings endpoint for this screen. Changes are not persisted; platform maps/config/flags/storage use their wired admin APIs.
        </p>
      ) : null}
      <div className="form-grid">
        {Object.entries(screen.details ?? {}).map(([key, value], index) => (
          <label className={index > 2 ? 'full' : ''} key={key}>
            <span>{key}</span>
            {/Notes/.test(key) ? (
              <textarea defaultValue={value} disabled={!fixtures} />
            ) : key.includes('Allow') || key.includes('Enable') || key.includes('Auto') ? (
              <span className="setting-toggle">
                <input type="checkbox" defaultChecked={value === 'Yes'} disabled={!fixtures} />
                <i />
              </span>
            ) : (
              <select defaultValue={value} disabled={!fixtures}>
                <option>{value}</option>
              </select>
            )}
          </label>
        ))}
      </div>
      <div className="form-footer">
        <button className="ghost-button" type="button">Cancel</button>
        <button
          className={destructive ? 'danger-button' : 'primary-button'}
          type="button"
          disabled={!fixtures}
          title={fixtures ? undefined : 'No live settings API for this screen'}
        >
          {screen.action}
        </button>
      </div>
    </div>
  );
}

function FinanceView({ screen }: { screen: AdminScreen }) {
  return <><MetricCards metrics={screen.metrics}/><div className="finance-grid"><article className="card dashboard-donut"><h2 className="card-title">Income by Category</h2><DonutVisual value="100%" label="Income"/></article>{screen.batch === 'E' ? <ChartCard title="Income vs Expense" bars/> : <article className="card compact-list"><h2 className="card-title">Recent Transactions</h2>{['Tithes — ₦80,000','Offering — ₦70,000','Seed — ₦10,000','Giving — ₦10,000'].map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</article>}</div><button className="ghost-button wide-report">View Full Finance Report</button></>;
}

function ReportsView({ screen }: { screen: AdminScreen }) {
  return <div className="reports-grid"><article className="card report-list"><h2>Popular Reports</h2>{(screen.items ?? []).map(item=><button key={item}>▧　{item}</button>)}</article><article className="card report-list"><h2>Recent Reports</h2>{['Membership Report · May 2024','Attendance Report · May 2024','First Timers Report · May 2024','Tithes Report · May 2024'].map(item=><div key={item}><span>▧</span><b>{item}</b></div>)}</article><button className="primary-button">{screen.action}</button></div>;
}

function RestrictedView({ screen }: { screen: AdminScreen }) {
  return <><div className="restricted-heading"><span>Restricted Case</span><StatusBadge value="In Progress"/></div><div className="card restricted-card"><div><h2>Case Information</h2>{Object.entries(screen.details ?? {}).slice(0,5).map(([key,value])=><p key={key}><span>{key}</span><b>{value}</b></p>)}</div><div><h2>Client Information</h2>{Object.entries(screen.details ?? {}).slice(5).map(([key,value])=><p key={key}><span>{key}</span><b>{value}</b></p>)}</div></div><div className="restricted-warning">⊘　This case contains restricted information. Unauthorized access is prohibited and will be logged.</div></>;
}

function EscalationView({ screen }: { screen: AdminScreen }) {
  return <div className="escalation-grid"><article className="card details-card"><h2>Report Details</h2><dl>{Object.entries(screen.details ?? {}).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></article><article className="card escalation-actions"><h2>Actions</h2>{(screen.items ?? []).map(item=><div key={item}><span>◇</span><b>{item.split(' — ')[0]}</b><StatusBadge value={item.split(' — ')[1]}/></div>)}</article><button className="danger-button">{screen.action}</button></div>;
}

function QuickActions({ screen }: { screen: AdminScreen }) {
  return <div className="quick-grid">{(screen.items ?? []).map((item,index)=><button className="card quick-card" key={item}><span>{['✉','▦','✓','□','▤','♙','⚙','?'][index]}</span><strong>{item}</strong><small>{['Send a platform-wide announcement','Register a new church manually','View and approve pending items','Add a new event to the platform','Create custom reports and analytics','Add or manage admin and staff users','Configure platform preferences','Manage connected support tickets'][index]}</small></button>)}</div>;
}

function Impersonation({ screen }: { screen: AdminScreen }) {
  return <><div className="warning-card"><strong>Impersonation is a powerful tool and must be used responsibly.</strong><ul><li>Use only for troubleshooting and support.</li><li>Ensure you have explicit approval.</li><li>All impersonation sessions are logged.</li><li>Do not access sensitive personal information unnecessarily.</li></ul></div><div className="support-grid"><div className="card settings-card"><h2>Request Impersonation Access</h2><FormFields /><button className="primary-button">{screen.action}</button></div><div className="card feed-card"><h2>My Access Requests</h2>{['John Chinedu Doe — Pending','Grace Ezekiel — Pending'].map(item=><div className="feed-item" key={item}><span className="feed-icon">♙</span><strong>{item}</strong><StatusBadge value="Pending" /></div>)}</div></div></>;
}

export function ForbiddenView({ scope = 'Global', reason = 'permission-denied' }: { scope?: string; reason?: string }) {
  const { t } = useLocale();
  if (reason === 'unauthenticated') {
    return (
      <div className="forbidden-view">
        <div className="shield-lock">▣</div>
        <h1>{t('auth.signInRequired', { defaultMessage: 'Sign in required' })}</h1>
        <p>{t('auth.adminSignInContinue', { defaultMessage: 'Sign in with an administrator account to continue.' })}</p>
        <Link href="/admin/login?returnTo=%2Fadmin" className="primary-button link-button">
          {t('auth.adminSignIn', { defaultMessage: 'Admin Sign In' })}
        </Link>
      </div>
    );
  }
  return (
    <div className="forbidden-view">
      <div className="shield-lock">▣</div>
      <h1>{t('errors.permissionDenied', { defaultMessage: 'Permission Denied' })}</h1>
      <p>
        {t('errors.noPermissionInScope', {
          defaultMessage: 'You don’t have permission to access this resource in the current scope.',
        })}
      </p>
      <dl>
        <div>
          <dt>{t('errors.currentScope', { defaultMessage: 'Current Scope:' })}</dt>
          <dd>{scope}</dd>
        </div>
        <div>
          <dt>{t('errors.accessResult', { defaultMessage: 'Access Result:' })}</dt>
          <dd>{reason.replace('-', ' ')}</dd>
        </div>
      </dl>
      <Link href="/admin" className="primary-button link-button">
        {t('common.backToDashboard', { defaultMessage: 'Back to Dashboard' })}
      </Link>
    </div>
  );
}

function adminReturnDestination(returnTo?: string): string {
  if (returnTo && returnTo.startsWith('/admin') && !returnTo.startsWith('//')) return returnTo;
  return '/admin';
}

function AuthView({ screen, returnTo }: { screen: AdminScreen; returnTo?: string }) {
  const router = useRouter();
  const { t } = useLocale();
  const apiReady = isAuthApiConfigured();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const dest = adminReturnDestination(returnTo);
  const authNotConfigured = t('errors.authNotConfigured', { defaultMessage: 'Authentication is not configured.' });

  async function onLogin(event: FormEvent) {
    event.preventDefault();
    if (!apiReady) {
      setError(authNotConfigured);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const { meta } = await loginBrowserUser({ email, password, remember });
      if (meta.email_verification_required) {
        router.push('/verify-email');
        return;
      }
      const capabilities = await fetchUserCapabilities();
      if (!hasAdministratorCapabilities(capabilities)) {
        await logoutBrowserUser().catch(() => undefined);
        setError(t('errors.notAdministrator', {
          defaultMessage: 'This account is not an administrator. Use member sign-in at /login, or sign in with an admin user.',
        }));
        return;
      }
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onMfa(event: FormEvent) {
    event.preventDefault();
    if (!apiReady) {
      setError(authNotConfigured);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await challengeMfa({ code: otp.join('') });
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  if (screen.kind === 'mfa') {
    return (
      <main className="auth-page">
        <header className="auth-header"><Brand dark={false}/><span>{t('auth.adminPortal', { defaultMessage: 'Admin Portal' })}</span></header>
        <form className="card mfa-card" onSubmit={(event) => void onMfa(event)}>
          <div className="mfa-icon">◇</div>
          <h1>{t('auth.mfaTitle', { defaultMessage: screen.title })}</h1>
          <p>{t('auth.mfaCopy', { defaultMessage: screen.subtitle })}</p>
          {error ? <p className="auth-banner auth-banner-error" role="alert">{error}</p> : null}
          <div className="otp-row">
            {otp.map((digit, index) => (
              <input
                aria-label={t('auth.otpDigit', { defaultMessage: 'Digit {n}', vars: { n: index + 1 } })}
                value={digit}
                maxLength={1}
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                key={index}
                onChange={(event) => {
                  const value = event.target.value.replace(/\D/g, '').slice(-1);
                  setOtp((prev) => prev.map((item, itemIndex) => (itemIndex === index ? value : item)));
                }}
              />
            ))}
          </div>
          <div className="auth-links">
            <Link href="/admin/login">{t('auth.backToAdminSignIn', { defaultMessage: 'Back to admin sign in' })}</Link>
          </div>
          <button className="primary-button" type="submit" disabled={busy || otp.join('').length !== 6}>
            {busy ? t('auth.verifying', { defaultMessage: 'Verifying…' }) : t('auth.verifyAndContinue', { defaultMessage: 'Verify & Continue' })}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="login-page">
      <aside className="login-visual">
        <Brand/>
        <div className="login-copy">
          <h1>{t('auth.adminPortal', { defaultMessage: 'Admin Portal' })}</h1>
          <p>{t('auth.adminTagline', { defaultMessage: 'Kingdom. Connection. Impact.' })}</p>
          <blockquote>
            {t('auth.greatCommissionLine1', { defaultMessage: '“Go and make disciples' })}
            <br/>
            {t('auth.greatCommissionLine2', { defaultMessage: 'of all nations.”' })}
            <small>{t('auth.matthew2819', { defaultMessage: 'Matthew 28:19' })}</small>
          </blockquote>
        </div>
        <div className="city-lights"/>
      </aside>
      <form className="login-form" onSubmit={(event) => void onLogin(event)}>
        <div>
          <h1>{t('auth.welcomeBack', { defaultMessage: screen.title })}</h1>
          <p>{t('auth.adminSignInCopy', { defaultMessage: screen.subtitle })}</p>
          {error ? <p className="auth-banner auth-banner-error" role="alert">{error}</p> : null}
          <label>{t('auth.emailAddress', { defaultMessage: 'Email Address' })}<input type="email" name="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy} /></label>
          <label>{t('auth.password', { defaultMessage: 'Password' })}<input type="password" name="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy} /></label>
          <div className="remember">
            <label><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} disabled={busy}/> {t('auth.rememberMe', { defaultMessage: 'Remember me' })}</label>
            <Link href="/forgot-password">{t('auth.forgotPassword', { defaultMessage: 'Forgot password?' })}</Link>
          </div>
          <button className="primary-button" type="submit" data-interaction-native="true" disabled={busy || !apiReady}>{busy ? t('auth.signingIn', { defaultMessage: 'Signing in…' }) : t('auth.signIn', { defaultMessage: 'Sign In' })}</button>
          {!apiReady ? <small role="status">{t('auth.adminApiUrlHint', { defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL so admin sign-in can reach Laravel.' })}</small> : <small>{t('auth.needHelp', { defaultMessage: 'Need help?' })} <Link href="/contact">{t('auth.contactSupport', { defaultMessage: 'Contact Support' })}</Link></small>}
        </div>
      </form>
    </main>
  );
}

function ScreenContent({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  if (screen.batch === 'G' || screen.batch === 'H') return <KcaScreenContent screen={screen} requestedScope={requestedScope} />;
  if (screen.batch === 'I') return <MissionScreenContent screen={screen} requestedScope={requestedScope} />;
  if (['J','K','L','M','N','O'].includes(screen.batch)) return <PlatformScreenContent screen={screen} requestedScope={requestedScope} />;
  switch(screen.kind){
    case 'dashboard': return <DashboardView screen={screen} requestedScope={requestedScope} />;
    case 'scope-grid': return <ScopeGrid screen={screen}/>;
    case 'command': return <CommandView screen={screen}/>;
    case 'feed': return <FeedView screen={screen}/>;
    case 'tasks': return <TasksView screen={screen}/>;
    case 'kpi': return <KpiView screen={screen} requestedScope={requestedScope}/>;
    case 'table': return <DataTable screen={screen} requestedScope={requestedScope}/>;
    case 'detail': return <DetailView screen={screen}/>;
    case 'wizard': return <WizardView screen={screen}/>;
    case 'profile': return <ProfileView screen={screen}/>;
    case 'permissions': return <PermissionsView screen={screen} requestedScope={requestedScope}/>;
    case 'matrix': return <MatrixView/>;
    case 'form': return <FormView screen={screen} requestedScope={requestedScope}/>;
    case 'tree': return <TreeView screen={screen}/>;
    case 'map': return <MapView screen={screen}/>;
    case 'quick-actions': return <QuickActions screen={screen}/>;
    case 'impersonation': return <Impersonation screen={screen}/>;
    case 'ministry-dashboard': return <MinistryDashboardView screen={screen} requestedScope={requestedScope} />;
    case 'workflow': return <WorkflowView screen={screen}/>;
    case 'activation': return <ActivationView screen={screen}/>;
    case 'operations': return <OperationsView screen={screen} requestedScope={requestedScope}/>;
    case 'journey': return <JourneyView screen={screen}/>;
    case 'approval': return <ApprovalView screen={screen}/>;
    case 'settings': return <SettingsView screen={screen}/>;
    case 'finance': return <FinanceView screen={screen}/>;
    case 'reports': return <ReportsView screen={screen}/>;
    case 'restricted': return <RestrictedView screen={screen}/>;
    case 'escalation': return <EscalationView screen={screen}/>;
    case 'forbidden': return <ForbiddenView/>;
    default: return null;
  }
}

export function AdminScreenView({ screen, decision, requestedScope, returnTo }: { screen: AdminScreen; decision: AccessDecision; requestedScope: string; returnTo?: string }) {
  const breadcrumbs = getAdminBreadcrumbs(screen);
  const interactionProps = { route: screen.route, title: screen.title, permission: screen.permission, scope: requestedScope, screenKind: screen.kind, returnTo, tabs: screen.tabs, routes: getInteractionRouteMap(screen), records: screen.rows?.map((row) => Object.values(row).join(' · ')), details: screen.details, items: screen.items };
  if(screen.kind==='login'||screen.kind==='mfa') return <AuthView screen={screen} returnTo={returnTo}/>;
  const rendererOwnsHeader = new Set(['G-03','G-04','G-05','G-06','G-07','G-08','G-09','G-10','G-12','G-13','G-14','G-15','G-16','G-18','H-02','H-06','H-08','H-10','H-19','I-03','I-04','I-06','I-07','I-09','I-11','I-17']).has(screen.id);
  const rendererNeedsAction = new Set(['G-03','G-16']).has(screen.id);
  const rendererOwnsAction = new Set(['G-01','G-17','H-11','I-02','I-08','I-10','I-12','I-13','I-14','I-15','I-16','I-18','I-19','I-20']).has(screen.id);
  return <AdminInteractionShell {...interactionProps}><div className="admin-shell"><Sidebar screen={screen}/><main className="admin-main"><Topbar screen={screen}/>{decision.allowed?<section className={`page batch-${screen.batch.toLowerCase()} ${rendererOwnsHeader ? 'renderer-header' : ''}`}><Breadcrumbs items={breadcrumbs}/>{!rendererOwnsHeader && <PageHeader screen={screen} hideAction={rendererOwnsAction}/>} {rendererNeedsAction && screen.action && <div className="renderer-action-row"><button type="button" className={screen.action.includes('Print') || screen.action.includes('Download') ? 'ghost-button' : 'primary-button'}>{screen.action}</button></div>}<ScreenContent screen={screen} requestedScope={requestedScope}/></section>:<ForbiddenView scope={requestedScope} reason={decision.reason}/>}</main></div></AdminInteractionShell>;
}

const batchNames = {
  A: 'Global Administration',
  B: 'Identity & Access',
  C: 'Geography & Organization',
  D: 'Home Church Administration',
  E: 'Church Operations',
  F: 'People & Ministry Care',
  G: 'KCA Admissions',
  H: 'KCA Learning',
  I: 'Mission Operations',
  J: 'Kingdom Press',
  K: 'Finance Operations',
  L: 'Platform Settings',
  M: 'Communications',
  N: 'Reports & Analytics',
  O: 'Security & Privacy',
} as const;

export function AdminScreenIndex() {
  const batches = Object.keys(batchNames) as Array<keyof typeof batchNames>;
  return <div className="admin-shell"><main className="screen-library"><header className="screen-library-header"><div><Brand dark={false}/><span className="preview-pill">Static design preview</span></div><Link href="/admin" className="primary-button link-button">Open Dashboard</Link></header><section className="screen-library-intro"><p className="eyebrow">Family House Connect · Admin Portal</p><h1>All Designed Screens</h1><p>Open any of the {adminScreens.length} front-end screens below. Every page uses static fixture data and is available directly from this directory.</p><div className="library-summary"><strong>{adminScreens.length}</strong><span>reference screens</span><strong>{batches.length}</strong><span>design groups</span></div></section>{batches.map(batch => { const screens = adminScreens.filter(screen => screen.batch === batch); return <section className="screen-group" key={batch}><div className="screen-group-title"><span>{batch}</span><div><h2>{batchNames[batch]}</h2><p>{screens.length} screens</p></div></div><div className="screen-card-grid">{screens.map(screen => <Link href={screen.route} className="screen-link-card" key={screen.id}><span className="screen-id">{screen.id}</span><strong>{screen.title}</strong><small>{screen.subtitle}</small><code>{screen.route}</code><i>Open screen →</i></Link>)}</div></section>; })}</main></div>;
}
