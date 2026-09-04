'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/auth-provider';
import { emptyAccessContext, evaluateAccess, hasAdministratorCapabilities, type AccessContext, type AccessDecision } from '../lib/access-control';
import { AdminAccessProvider, useAdminAccess } from '../lib/admin-access-context';
import {
  challengeMfa,
  formatAuthError,
  isAuthApiConfigured,
  loginBrowserUser,
  logoutBrowserUser,
} from '../lib/auth-api';
import { fetchUserCapabilities, type CapabilitySnapshot } from '../lib/user-api';
import { adminScreens, getAdminScreen, type AdminScreen, type Metric } from '../lib/admin-routes';
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
import { PlatformScreenContent, DemoDatasetBanner, PlatformSettingsScreen } from './platform-ui';
import { ApprovalsInboxPanel } from './approvals-inbox-panel';
import {
  breakdownToItems,
  dashboardModuleForScreen,
  formatRelativeTime,
} from '../lib/admin-dashboard-api';
import { useAdminDashboard } from '../lib/use-admin-dashboard';
import { dashboardNavItems } from '../lib/admin-dashboard-nav';
import {
  DashboardQuickLinks,
  DashboardShell,
  LinkedMetricCards,
  SeriesBarChart,
} from './admin-dashboard-chrome';
import { AdminInteractionShell } from './admin-interaction-shell';
import { getAdminBreadcrumbs, getInteractionRouteMap, type AdminBreadcrumb } from '../lib/admin-navigation';
import { AppBrand } from './app-brand';
import { InteractiveMap } from './interactive-map';
import { HierarchyTreeView } from './hierarchy-tree-view';
import { GeographyScreenContent } from './geography-ops';
import { HomeChurchesScreenContent } from './home-churches-ops';
import { ChurchScreenContent } from './church-ops';
import { PeopleScreenContent } from './people-ops';
import { AdministrationAuditExport, AdministrationScreenContent } from './administration-ops';
import { SearchSelect } from './search-select';
import { EntitySearchSelect } from './entity-search-select';
import { TableRowActions } from './table-row-actions';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { getAdminModuleForRoute } from '../lib/admin-modules';
import { resolveEntityKey } from '../lib/admin-form-schemas';
import { catalogOptions, churchTypeOptions, statusOptions } from '../lib/form-catalogs';
import { formatRowActionRecord, rowActionCapabilities } from '../lib/admin-row-actions';
import {
  assignPrayerRequest,
  completeFollowUpTask,
  createChurch,
  createHomeChurch,
  defaultOpsScope,
  listFollowUpTasks,
  listHomeChurchApplications,
  listLeaders,
  listMissionInvitations,
  listMemberships,
  listPastoralNeeds,
  listPrayerRequests,
  listSouls,
  listWorkers,
  loadOpsDataset,
  operationsErrorMessage,
  opsRecordsToRows,
  registerFirstTimer,
  resolveOpsDataset,
  shouldUseOperationsLiveData,
  transitionHomeChurchApplication,
  transitionPastoralNeed,
  transitionPrayerRequest,
  type FollowUpTaskRecord,
  type OpsDatasetKey,
  type PastoralNeedRecord,
  type PrayerRequestRecord,
} from '../lib/admin-operations-api';
import { extractUlid } from '../lib/admin-mutation-dispatcher';
import { stashAdminRecords } from '../lib/admin-record-cache';
import {
  platformErrorMessage,
  queryPlatformSearch,
  type PlatformSearchHit,
} from '../lib/admin-platform-api';
import {
  countriesToSelectOptions,
  createLocation,
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
    ['geography', '·', 'Regions / States', '/admin/geography/regions'], ['geography', '·', 'Local Areas', '/admin/geography/local-areas'],
    ['geography', '·', 'Hierarchy Tree', '/admin/geography/hierarchy'], ['geography', '▦', 'Organizations', '/admin/geography/organizations'],
    ['geography', '◊', 'Church Hierarchy', '/admin/geography/church-hierarchy'], ['geography', '◊', 'Home Church Hierarchy', '/admin/geography/home-church-hierarchy'],
    ['geography', '⌖', 'Geography Map', '/admin/geography/map'], ['geography', '◎', 'Scope Assignment', '/admin/geography/scope-assignment'],
    ['reports', '▣', 'Reports', '/admin/geography/reports'], ['settings', '◇', 'Settings', '/admin/geography/settings'],
  ],
  D: [
    ['dashboard', '⌂', 'Dashboard', '/admin/home-churches/dashboard'],
    ['applications', '▤', 'Applications', '/admin/home-churches/applications'],
    ['home-churches', '▣', 'Home Churches', '/admin/home-churches'],
    ['leaders', '♙', 'Leaders', '/admin/home-churches/leaders'],
    ['members', '◉', 'Members', '/admin/home-churches/members'],
    ['attendance', '▦', 'Attendance', '/admin/home-churches/attendance'],
    ['activities', '◇', 'Activities', '/admin/home-churches/activities'],
    ['needs', '□', 'Needs', '/admin/home-churches/needs'],
    ['finance', '₦', 'Monthly Reports', '/admin/home-churches'],
    ['settings', '⚙', 'Suspend / Close', '/admin/home-churches'],
  ],
  E: [
    ['dashboard', '⌂', 'Dashboard', '/admin/church/dashboard'],
    ['churches', '▣', 'Churches', '/admin/churches'],
    ['leaders', '♛', 'Leadership', '/admin/church/leadership'],
    ['members', '◉', 'Members', '/admin/church/members'],
    ['first-timers', '◇', 'First Timers', '/admin/church/first-timers'],
    ['converts', '✓', 'Converts', '/admin/church/converts'],
    ['discipleship', '◎', 'Disciples', '/admin/church/disciples'],
    ['workers', '♙', 'Workers', '/admin/church/workers'],
    ['departments', '▦', 'Departments', '/admin/church/departments'],
    ['small-groups', '◎', 'Small Groups', '/admin/church/small-groups'],
    ['evangelism', '◇', 'Evangelism', '/admin/church/evangelism'],
    ['finance', '₦', 'Finance', '/admin/church/finance'],
    ['reports', '▤', 'Reports', '/admin/church/reports'],
    ['settings', '⚙', 'Settings', '/admin/church/settings'],
  ],
  F: [
    ['dashboard', '⌂', 'Dashboard', '/admin/people/dashboard'], ['people', '◉', 'People', '/admin/people'], ['first-timers', '◇', 'First Timers', '/admin/people/first-timers'],
    ['follow-up', '↻', 'Follow-Up', '/admin/people/follow-up'], ['converts', '✓', 'Converts', '/admin/people/converts'],
    ['discipleship', '◎', 'Discipleship', '/admin/people/discipleship'], ['workers', '♙', 'Workers', '/admin/people/workers'], ['leaders', '♛', 'Leaders', '/admin/people/leaders'],
    ['ministry-history', '▤', 'Ministry History', '/admin/people/ministry-history'], ['prayer', '◇', 'Prayer', '/admin/people/prayer-requests'],
    ['needs', '□', 'Needs', '/admin/people/needs'], ['counselling', '◌', 'Counselling', '/admin/people/counselling'],
    ['testimonies', '✦', 'Testimonies', '/admin/people/testimonies'], ['safeguarding', '!', 'Safeguarding', '/admin/people/safeguarding'],
    ['reports', '▣', 'Reports', '/admin/people/reports'], ['settings', '⚙', 'Settings', '/admin/people/settings'],
  ],
  G: [
    ['dashboard', '⌂', 'Dashboard', '/admin/kca'], ['kca-applications', '▤', 'Applications', '/admin/kca/applications'],
    ['kca-review', '↻', 'Review Queue', '/admin/kca/review-queue'], ['kca-decisions', '✓', 'Decisions', '/admin/kca/applications'],
    ['kca-students', '♙', 'Students', '/admin/kca/students'], ['kca-cohorts', '◎', 'Cohorts', '/admin/kca/cohorts'],
    ['kca-mentors', '♛', 'Mentors', '/admin/kca/mentors'], ['kca-lecturers', '▦', 'Lecturers', '/admin/kca/lecturers'],
    ['kca-modules', '◇', 'Modules', '/admin/kca/modules'], ['kca-learning', '▣', 'Learning', '/admin/kca/attendance'],
    ['kca-assignments', '▤', 'Assignments', '/admin/kca/assignments'],
    ['kca-assessments', '□', 'Assessments', '/admin/kca/assessments/final'], ['kca-certification', '✓', 'Certifications', '/admin/kca/certificates'],
    ['kca-alumni', '♙', 'Alumni', '/admin/kca/alumni'], ['settings', '⚙', 'Settings', '/admin/geography/settings'],
  ],
  H: [
    ['dashboard', '⌂', 'Dashboard', '/admin/kca'], ['kca-students', '♙', 'Students', '/admin/kca/students'],
    ['kca-cohorts', '◎', 'Cohorts', '/admin/kca/cohorts'], ['kca-years', '▥', 'KCA Years', '/admin/kca/years'],
    ['kca-mentors', '♛', 'Mentors', '/admin/kca/mentors'], ['kca-lecturers', '▦', 'Lecturers', '/admin/kca/lecturers'],
    ['kca-modules', '◇', 'Modules', '/admin/kca/modules'], ['kca-learning', '▣', 'Learning', '/admin/kca/attendance'],
    ['kca-assignments', '▤', 'Assignments', '/admin/kca/assignments'],
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
  P: [
    ['events', '▣', 'Events', '/admin/events'],
    ['events', '◇', 'Registrations', '/admin/events/registrations'],
    ['settings', '⚙', 'Settings', '/admin/settings/events'],
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
    ['communications', '✉', 'Broadcasts', '/admin/communications/broadcasts'], ['communications', '◎', 'Audiences', '/admin/communications/audiences'],
    ['communications', '✉', 'Compose', '/admin/communications/broadcasts/create'], ['communications', '◎', 'New Audience', '/admin/communications/audiences/create'],
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

const dashboardItems: EnterpriseNavItem[] = dashboardNavItems.map(({ icon, label, href }) => ({ icon, label, href }));

const reportItems: EnterpriseNavItem[] = [
  ...navItems(['N'], ['Dashboard']),
  { icon: '⌂', label: 'Home Church Reports', href: '/admin/home-churches' },
  { icon: '▣', label: 'Church Reports', href: '/admin/church/reports' },
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
  { id: 'events', icon: '▣', label: 'Events', items: navItems(['P'], ['Dashboard', 'Settings']) },
  { id: 'finance', icon: '₦', label: 'Finance', items: navItems(['K'], ['Dashboard', 'Reports', 'Settings']) },
  { id: 'communications', icon: '✉', label: 'Communications', items: navItems(['M'], ['Dashboard', 'Delivery Report', 'Settings', 'People', 'Churches']) },
  { id: 'reports', icon: '▦', label: 'Reports', items: reportItems },
  { id: 'security', icon: '!', label: 'Security', items: navItems(['O'], ['Dashboard']) },
  { id: 'settings', icon: '⚙', label: 'Settings', items: [
    { icon: '◆', label: 'Platform', href: '/admin/settings/platform' },
    { icon: '▣', label: 'Branding', href: '/admin/settings/branding' },
    { icon: '▤', label: 'Public Site CMS', href: '/admin/settings/public-site' },
    { icon: '▣', label: 'Ministry Settings', href: '/admin/settings/ministry' },
    { icon: '▣', label: 'Church Settings', href: '/admin/settings/church' },
    { icon: '⌂', label: 'Home Church Rules', href: '/admin/settings/home-church-rules' },
    { icon: '◇', label: 'KCA Settings', href: '/admin/settings/kca' },
    { icon: '⌖', label: 'Mission Settings', href: '/admin/settings/mission' },
    { icon: '▤', label: 'Press Settings', href: '/admin/settings/press' },
    { icon: '▣', label: 'Event Settings', href: '/admin/events' },
    { icon: '₦', label: 'Payment Settings', href: '/admin/settings/payments' },
    { icon: '✉', label: 'Notification Providers', href: '/admin/settings/notifications' },
    { icon: '◎', label: 'Languages', href: '/admin/settings/languages' },
    { icon: '▤', label: 'Translation Governance', href: '/admin/settings/translation-governance' },
    { icon: '⚑', label: 'Feature Flags', href: '/admin/settings/feature-flags' },
    { icon: '◎', label: 'Maps Providers', href: '/admin/settings/maps' },
    { icon: '▤', label: 'Media Library', href: '/admin/settings/media' },
    { icon: '▤', label: 'File / Upload', href: '/admin/settings/uploads' },
    { icon: '◆', label: 'System Information', href: '/admin/settings/system-information' },
    { icon: '◇', label: 'AI API', href: '/admin/settings/ai-api' },
    { icon: '✉', label: 'Communication Settings', href: '/admin/communications/settings' },
    { icon: '!', label: 'Security Configuration', href: '/admin/security/configuration' },
    { icon: '◎', label: 'Geography Settings', href: '/admin/geography/settings' },
  ] },
];

function navItemAllowed(href: string, access: AccessContext, requestedScope: string): boolean {
  if (access.permissions.includes('*')) return true;
  const screen = getAdminScreen(href);
  if (!screen) return false;
  return evaluateAccess(screen, access, requestedScope).allowed;
}

function Brand({ dark = true }: { dark?: boolean }) {
  return <AppBrand variant="admin" dark={dark} />;
}

function Sidebar({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const { access, requestedScope } = useAdminAccess();
  const groups = useMemo(
    () =>
      enterpriseNavGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => navItemAllowed(item.href, access, requestedScope)),
        }))
        .filter((group) => group.items.length > 0),
    [access, requestedScope],
  );
  const allItems = groups.flatMap((group) => group.items);
  const exact = allItems.filter((item) => item.href === screen.route);
  const prefix = allItems.filter((item) => item.href !== '/admin' && screen.route.startsWith(`${item.href}/`)).sort((left, right) => right.href.length - left.href.length);
  const activeHref = (exact[0] ?? prefix[0])?.href;
  return <aside className="admin-sidebar" id="admin-primary-navigation"><Link href="/admin" className="sidebar-brand-link" aria-label="Family House Connect admin home"><Brand /></Link><nav className="nav-list enterprise-nav" aria-label={t('admin.enterpriseNavAria', { defaultMessage: 'Enterprise administration navigation' })}>{groups.map((group) => {
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
  const homeChurchLiveOpsRoute = screen.batch === 'D' && screen.route.startsWith('/admin/home-churches') && screen.route !== '/admin/home-churches/dashboard' && !['wizard', 'workflow', 'activation'].includes(screen.kind);
  const showHeaderAction = !hideAction && !platformOwnsAction && !homeChurchLiveOpsRoute && (['G','H','I'].includes(screen.batch) || !['D','E','F'].includes(screen.batch) || ['table','operations','finance'].includes(screen.kind));
  return <><div className="page-header"><div><h1 className="page-title">{showNigeriaFlag && <span className="flag-ng" aria-label="Nigeria flag" />}{screen.title}</h1><p className="page-subtitle">{screen.subtitle}</p></div><div className="header-actions">{screen.action && showHeaderAction && screen.batch !== 'C' && <button type="button" className={screen.action.includes('Export') ? 'ghost-button' : 'primary-button'}>{screen.action}</button>}<button type="button" className="more-button" aria-label={t('admin.moreOptions', { defaultMessage: 'More options' })}>•••</button></div></div>{screen.tabs && !platformBatch && screen.batch !== 'C' && !['wizard', 'workflow'].includes(screen.kind) && !homeChurchLiveOpsRoute && <Tabs tabs={screen.tabs} />}</>;
}

function Tabs({ tabs }: { tabs: string[] }) {
  return <div className="tabs" role="tablist">{tabs.map((tab, index) => <button type="button" className={`tab ${index === 0 ? 'active' : ''}`} role="tab" aria-selected={index === 0} key={tab}>{tab}</button>)}</div>;
}

function MetricCards({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className="metric-grid">{metrics.map((metric, index) => <article className={`card metric-card ${index === 0 ? 'metric-selected' : ''}`} key={metric.label}><span className="metric-label">{metric.label}</span><div className="metric-row"><strong className={`metric-value ${index === 0 ? 'violet' : ''}`}>{metric.value}</strong>{metric.trend && <span className="trend">{metric.trend}</span>}</div></article>)}</div>;
}

function ChartCard({ title, value, green = false, bars = false, series }: { title: string; value?: string; green?: boolean; bars?: boolean; series?: Array<{ label: string; value: number }> }) {
  const points = series ?? [];
  const max = Math.max(1, ...points.map((point) => point.value));
  const barValues = points.map((point) => Math.round((point.value / max) * 100));
  const axisLabels = points.map((point) => point.label);
  return <article className="card chart-card"><h2 className="card-title">{title}</h2>{value && <><span className="chart-kicker">This period</span><strong className="chart-value">{value}</strong></>}{points.length === 0 ? <p className="maps-settings-lead">No series values in this period.</p> : bars ? <div className="bar-chart">{barValues.map((height, index) => <i key={axisLabels[index] ?? index} style={{ height: `${height}%` }} />)}</div> : <div className={`chart ${green ? 'green' : ''}`} />}<div className="chart-axis">{axisLabels.map((label) => <span key={label}>{label}</span>)}</div></article>;
}

function DashboardLiveNotice({ loading, error }: { loading?: boolean; error?: string | null }) {
  if (!loading && !error) return null;
  return <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>{loading ? 'Loading live dashboard data…' : error}</p>;
}

function pendingLiveApiMessage(route: string): string | null {
  return null;
}

function DashboardView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const churches = dashboard.data?.metrics.find((metric) => metric.label === 'Total Churches')?.value;
  const members = dashboard.data?.metrics.find((metric) => metric.label === 'Members')?.value;
  const countries = dashboard.data?.metrics.find((metric) => metric.label === 'Countries')?.value;
  return (
    <DashboardShell
      screenId={screen.id}
      href={screen.route}
      data={dashboard.data}
      loading={dashboard.loading}
      error={dashboard.error}
      onRetry={dashboard.retry}
      preset={dashboard.preset}
      onPresetChange={dashboard.setPreset}
      showModules
    >
      <DemoDatasetBanner />
      <LinkedMetricCards screenId={screen.id} metrics={dashboard.metrics} />
      <div className="dashboard-grid">
        <SeriesBarChart title="New Registrations" value={members} series={dashboard.data?.series} />
        <SeriesBarChart title="Church Growth" value={churches} series={dashboard.data?.series} />
        <SeriesBarChart title="Countries" value={countries} series={dashboard.data?.series} />
      </div>
    </DashboardShell>
  );
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
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAppMembers, setShowAppMembers] = useState(false);

  const refresh = useCallback(async () => {
    const scope = defaultAdminScope(requestedScope);
    setError(null);
    try {
      const result = await listAdminUsers({
        scope,
        status: suspendedOnly ? 'suspended' : undefined,
        search: search.trim() || undefined,
        page,
        perPage: 25,
        sort: '-created_at',
        excludeAppMembers: !suspendedOnly && !showAppMembers,
      });
      stashAdminRecords(
        result.data.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          status: user.account_status,
          person_id: user.person_id,
          created_at: user.created_at,
          suspended_at: user.suspended_at,
          suspension_reason: user.suspension_reason,
          roles: user.roles?.map((role) => role.name ?? role.code).filter(Boolean).join(', '),
        })),
      );
      setUsers(result.data);
      setTotal(result.pagination.total);
      setMessage(`Showing ${result.data.length} of ${result.pagination.total} users`);
    } catch (err) {
      setUsers([]);
      setTotal(0);
      setError(identityErrorMessage(err));
      setMessage('Live user directory unavailable');
    }
  }, [requestedScope, suspendedOnly, search, page, showAppMembers]);

  useEffect(() => {
    const handle = window.setTimeout(() => { void refresh(); }, 250);
    return () => window.clearTimeout(handle);
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
      <div className="table-toolbar">
        <input aria-label="Search users" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search name or email" />
        {!suspendedOnly ? (
          <label className="table-toolbar-filter">
            <input
              checked={showAppMembers}
              onChange={(event) => { setShowAppMembers(event.target.checked); setPage(1); }}
              type="checkbox"
            />
            <span>{t('admin.showAppMembers', { defaultMessage: 'Show app members' })}</span>
          </label>
        ) : null}
      </div>
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
                  <td><span className="mini-avatar">{(user.name ?? '').split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('') || '—'}</span>{user.name || '—'}</td>
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
                      <Link className="table-action" href={`/admin/users/${user.id}`}>View</Link>
                      <Link className="table-action" href={`/admin/users/${user.id}/edit`}>Edit</Link>
                      <TableRowActions
                        record={formatRowActionRecord(user.name, user.id)}
                        entityKey="user"
                        canEdit={false}
                        canDelete={false}
                      />
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
        stashAdminRecords(
          result.data.map((role) => ({
            id: role.id,
            name: role.name,
            code: role.code,
            permissions: String(role.permissions?.length ?? 0),
          })),
        );
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
          <thead><tr><th>{t('admin.roleName', { defaultMessage: 'Role Name' })}</th><th>{t('admin.code', { defaultMessage: 'Code' })}</th><th>{t('admin.permissions', { defaultMessage: 'Permissions' })}</th><th>{t('admin.status', { defaultMessage: 'Status' })}</th><th>{t('admin.actions', { defaultMessage: 'Actions' })}</th></tr></thead>
          <tbody>
            {roles.length === 0 ? (
              <tr><td colSpan={5}>{error ? t('admin.rolesUnavailable', { defaultMessage: 'Roles unavailable.' }) : t('admin.noRolesReturned', { defaultMessage: 'No roles returned.' })}</td></tr>
            ) : roles.map((role) => (
              <tr key={role.id}>
                <td>{role.name}</td>
                <td><code>{role.code}</code></td>
                <td>{role.permissions?.length ?? '—'}</td>
                <td><StatusBadge value={t('admin.active', { defaultMessage: 'Active' })} /></td>
                <td className="actions-cell">
                  <TableRowActions
                    record={formatRowActionRecord(role.name, role.id)}
                    entityKey="role"
                    canEdit={false}
                    canDelete={false}
                  />
                  <Link className="table-action" href={`/admin/roles/${role.id}`}>View</Link>
                </td>
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
      setMessage('The platform API is not configured.');
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
                defaultMessage: 'The platform API is not configured; scope assignment submit is blocked.',
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
          <button className="primary-button" type="submit" disabled={!apiReady || busy} title={apiReady ? undefined : t('admin.apiNotConfigured', { defaultMessage: 'The platform API is not configured', })}>
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
  const [liveItems, setLiveItems] = useState<Array<Record<string, unknown>>>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('Loading…');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const [createHomeChurchBusy, setCreateHomeChurchBusy] = useState(false);
  const [createHomeChurchMessage, setCreateHomeChurchMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    setMessage('Loading…');
    try {
      const result = await loadOpsDataset(dataset, { scope: defaultOpsScope(screen.scope), perPage: 25 });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      setLiveItems(result.items as Array<Record<string, unknown>>);
      setRows(opsRecordsToRows(dataset, result.items, columns));
      setTotal(result.pagination.total);
      setMessage(
        result.pagination.total === 0
          ? 'No records in this scope.'
          : `Showing ${result.items.length} of ${result.pagination.total} records`,
      );
    } catch (err) {
      setRows([]);
      setLiveItems([]);
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

  async function onCreateHomeChurch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const churchId = String(form.get('church_id') ?? '').trim();
    const leaderId = String(form.get('leader_person_id') ?? '').trim();
    const locationId = String(form.get('location_id') ?? '').trim();
    const unitId = String(form.get('administrative_unit_id') ?? '').trim();
    const name = String(form.get('name') ?? '').trim();
    if (!churchId || !leaderId || !locationId || !unitId || !name) {
      setCreateHomeChurchMessage('Church, leader, location, administrative unit, and name are required.');
      return;
    }
    if (![churchId, leaderId, locationId, unitId].every(isOpsPublicId)) {
      setCreateHomeChurchMessage('Select live church, leader, location, and administrative unit from search lists.');
      return;
    }
    setCreateHomeChurchBusy(true);
    setCreateHomeChurchMessage(null);
    setError(null);
    try {
      const record = await createHomeChurch(
        {
          church_id: churchId,
          leader_person_id: leaderId,
          location_id: locationId,
          administrative_unit_id: unitId,
          name,
        },
        defaultOpsScope(screen.scope),
      );
      setCreateHomeChurchMessage(`Created home church ${record.name} (${record.id}).`);
      formEl.reset();
      await refresh();
    } catch (err) {
      setCreateHomeChurchMessage(operationsErrorMessage(err, 'Home church creation failed.'));
    } finally {
      setCreateHomeChurchBusy(false);
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

  const liveMetrics = useMemo(() => {
    if (dataset !== 'first-timers') {
      return [{ label: 'Total', value: String(total) }, ...(screen.metrics ?? []).slice(1, 4)];
    }
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let todayCount = 0;
    let weekCount = 0;
    let followedCount = 0;
    for (const item of liveItems) {
      const registered = item.registered_at ? Date.parse(String(item.registered_at)) : Number.NaN;
      if (!Number.isNaN(registered)) {
        if (registered >= startOfToday.getTime()) todayCount += 1;
        if (registered >= weekAgo) weekCount += 1;
      }
      if (item.contacted_at) followedCount += 1;
    }
    const followedPct = liveItems.length === 0 ? 0 : Math.round((followedCount / liveItems.length) * 100);
    return [
      { label: 'Total', value: String(total) },
      { label: 'This Week', value: String(weekCount) },
      { label: 'Today', value: String(todayCount) },
      { label: 'Followed Up', value: `${followedPct}%` },
    ];
  }, [dataset, liveItems, screen.metrics, total]);

  return (
    <>
      <MetricCards metrics={liveMetrics} />
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
      {dataset === 'home-churches' ? (
        <form className="card form-card" onSubmit={(event) => void onCreateHomeChurch(event)}>
          <h2 className="section-title">{t('admin.createHomeChurch', { defaultMessage: 'Create home church' })}</h2>
          <p className="page-subtitle">{t('admin.createHomeChurchCopy', { defaultMessage: 'Directly register an active home church without going through the application workflow.' })}</p>
          <div className="form-grid">
            <label>
              <span>{t('admin.churchRequired', { defaultMessage: 'Church *' })}</span>
              <SearchSelect name="church_id" catalog="church" options={catalogOptions.church} placeholder={t('admin.searchChurch', { defaultMessage: 'Search church' })} />
            </label>
            <label>
              <span>{t('admin.leaderRequired', { defaultMessage: 'Leader *' })}</span>
              <SearchSelect name="leader_person_id" catalog="person" options={catalogOptions.person} placeholder={t('admin.searchPerson', { defaultMessage: 'Search person' })} />
            </label>
            <label>
              <span>{t('admin.locationRequired', { defaultMessage: 'Location *' })}</span>
              <SearchSelect name="location_id" catalog="location" options={catalogOptions.location} placeholder={t('admin.searchLocation', { defaultMessage: 'Search location' })} />
            </label>
            <label>
              <span>{t('admin.administrativeUnitRequired', { defaultMessage: 'Administrative unit *' })}</span>
              <SearchSelect name="administrative_unit_id" catalog="administrativeUnit" options={catalogOptions.administrativeUnit} placeholder={t('admin.searchAdministrativeUnit', { defaultMessage: 'Search administrative unit' })} />
            </label>
            <label className="full">
              <span>{t('admin.homeChurchName', { defaultMessage: 'Home church name *' })}</span>
              <input name="name" type="text" required maxLength={191} />
            </label>
          </div>
          {createHomeChurchMessage ? <p className="field-help" role="status">{createHomeChurchMessage}</p> : null}
          <div className="form-footer">
            <button className="primary-button" type="submit" disabled={createHomeChurchBusy}>
              {createHomeChurchBusy
                ? t('admin.creating', { defaultMessage: 'Creating…' })
                : t('admin.createHomeChurch', { defaultMessage: 'Create home church' })}
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
                        record={formatRowActionRecord(row[columns[0]], row.__id)}
                        entityKey={entityKey}
                        reviewLabel={reviewLabel}
                        {...rowActionCapabilities(screen.route)}
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
          stashAdminRecords(next as unknown as Array<Record<string, unknown>>);
          setCountries(next);
          setUnits([]);
          setMessage(next.length === 0 ? 'No countries yet. Open Hierarchy Tree to create one.' : `Showing ${next.length} countries`);
        } else {
          const next = await listUnits();
          if (cancelled) return;
          stashAdminRecords(next as unknown as Array<Record<string, unknown>>);
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {countries.length === 0 ? (
                <tr>
                  <td colSpan={5}>{error ? 'Countries unavailable.' : 'No countries returned.'}</td>
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
                    <td className="actions-cell">
                      <TableRowActions
                        record={formatRowActionRecord(country.name, country.id)}
                        canEdit={false}
                        canDelete={false}
                      />
                    </td>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {units.length === 0 ? (
                <tr>
                  <td colSpan={6}>{error ? 'Units unavailable.' : 'No units returned.'}</td>
                </tr>
              ) : (
                units.map((unit) => (
                  <tr key={unit.id}>
                    <td>{unit.name}</td>
                    <td>{unit.administrative_level?.name ?? '—'}</td>
                    <td>{unit.reference_code ?? '—'}</td>
                    <td>{unit.parent?.name ?? '—'}</td>
                    <td>{unit.country?.name ?? '—'}</td>
                    <td className="actions-cell">
                      <TableRowActions
                        record={formatRowActionRecord(unit.name, unit.id)}
                        canEdit={false}
                        canDelete={false}
                      />
                    </td>
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
  const mutationLabel =
    screen.route === '/admin/communications/delivery-queue' || screen.route === '/admin/communications/failed'
      ? 'Retry Delivery'
      : screen.route === '/admin/communications/broadcasts'
        ? 'Resolve Broadcast'
        : screen.route === '/admin/alerts' ||
            screen.route === '/admin/finance/alerts' ||
            screen.route === '/admin/security/alerts'
          ? 'Resolve Alert'
          : undefined;
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
        stashAdminRecords(result.items as Array<Record<string, unknown>>);
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
                      record={formatRowActionRecord(row[columns[0]], row.__id)}
                      entityKey={entityKey}
                      mutationLabel={mutationLabel}
                      {...rowActionCapabilities(screen.route)}
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

function CountryPerformanceLiveTable({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id) ?? 'geography', requestedScope);
  const columns = screen.columns ?? ['Country', 'Members', 'New Churches', 'Giving (USD)', 'Growth'];
  const rows = breakdownToItems(dashboard.data?.breakdown).map((item) => {
    const [country, value] = item.split(' — ');
    const mapped: Record<string, string> = {};
    for (const column of columns) {
      if (column === 'Country') mapped[column] = country ?? '—';
      else if (column === 'Growth' || column === 'Members' || column === 'New Churches' || column === 'Giving (USD)') {
        mapped[column] = value ?? '—';
      } else mapped[column] = '—';
    }
    return mapped;
  });

  return (
    <>
      <DashboardLiveNotice loading={dashboard.loading} error={dashboard.error} />
      <p className="maps-settings-lead" role="status">
        {t('admin.countryPerformanceLead', {
          defaultMessage: 'Country performance uses the live geography dashboard breakdown. Column-level metrics beyond that require a dedicated report API.',
        })}
      </p>
      <MetricCards metrics={dashboard.metrics} />
      <div className="card table-card">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {dashboard.error
                    ? t('errors.loadDashboard', { defaultMessage: 'Unable to load dashboard.' })
                    : t('admin.noCountryBreakdown', { defaultMessage: 'No country breakdown available.' })}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.Country}-${index}`}>
                  {columns.map((column) => (
                    <td key={column}>{column === 'Growth' ? <StatusBadge value={row[column] ?? '—'} /> : row[column]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function MinistryHistoryLivePanel({ screen }: { screen: AdminScreen }) {
  const scope = defaultOpsScope(screen.scope);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('Loading ministry history…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage('Loading ministry history…');
      try {
        const [memberships, workers, leaders] = await Promise.all([
          listMemberships({ scope, perPage: 50 }),
          listWorkers({ scope, perPage: 50 }),
          listLeaders({ scope, perPage: 50 }),
        ]);
        if (cancelled) return;
        const merged = [
          ...memberships.items.map((item) => ({
            activity: 'Membership',
            person: String(item.person_name ?? '—'),
            church: String(item.church_name ?? item.home_church_name ?? '—'),
            date: item.joined_at ? formatTimestamp(item.joined_at) : '—',
            status: String(item.status ?? '—'),
            sort: item.joined_at ? Date.parse(item.joined_at) : 0,
          })),
          ...workers.items.map((item) => ({
            activity: `Worker · ${String(item.title ?? item.role_type ?? 'Role')}`,
            person: String(item.person_name ?? '—'),
            church: String(item.church_name ?? '—'),
            date: item.started_at ? formatTimestamp(String(item.started_at)) : '—',
            status: String(item.status ?? '—'),
            sort: item.started_at ? Date.parse(String(item.started_at)) : 0,
          })),
          ...leaders.items.map((item) => ({
            activity: `Leader · ${String(item.title ?? item.role_type ?? 'Role')}`,
            person: String(item.person_name ?? '—'),
            church: String(item.church_name ?? '—'),
            date: item.started_at ? formatTimestamp(String(item.started_at)) : '—',
            status: String(item.status ?? '—'),
            sort: item.started_at ? Date.parse(String(item.started_at)) : 0,
          })),
        ].sort((a, b) => b.sort - a.sort);
        setRows(merged.map(({ activity, person, church, date, status }) => ({ Activity: activity, Person: person, Church: church, Date: date, Status: status })));
        setTotal(merged.length);
        setMessage(
          merged.length === 0
            ? 'No membership or role assignment records in this scope.'
            : `Showing ${merged.length} combined history records from memberships and role assignments.`,
        );
      } catch (err) {
        if (cancelled) return;
        setRows([]);
        setTotal(0);
        setError(operationsErrorMessage(err, 'Unable to load ministry history.'));
        setMessage('Live ministry history unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const columns = ['Activity', 'Person', 'Church', 'Date', 'Status'];
  return (
    <>
      <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>
        {error ?? 'Ministry history is derived from live memberships and role assignments. There is no separate journey-history API.'}
      </p>
      <MetricCards metrics={[{ label: 'Total Records', value: String(total) }, ...(screen.metrics ?? []).slice(1, 4)]} />
      <div className="card table-card">
        <table>
          <thead>
            <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={columns.length}>{message}</td></tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row.Activity}-${index}`}>
                  {columns.map((column) => (
                    <td key={column}>{column === 'Status' ? <StatusBadge value={row[column] ?? '—'} /> : row[column]}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
        <p className="maps-settings-lead" role="status">{message}</p>
      </div>
    </>
  );
}

function DataTable({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  if (!shouldUseDesignFixtures()) {
    if (screen.route === '/admin/reports/country-performance' || screen.id === 'A-13') {
      return <CountryPerformanceLiveTable screen={screen} requestedScope={requestedScope} />;
    }
    if (screen.route === '/admin/people/ministry-history' || screen.id === 'F-09') {
      return <MinistryHistoryLivePanel screen={screen} />;
    }
    if (screen.route === '/admin/users' || screen.route === '/admin/users/suspended') return <IdentityUsersTable screen={screen} requestedScope={requestedScope} />;
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
    if (screen.route === '/admin/approvals') {
      return <ApprovalsInboxPanel screen={screen} />;
    }
    if (screen.route === '/admin/activity') {
      return (
        <>
          <p className="maps-settings-lead" role="status">
            Recent activity uses live audit events. There is no separate activity-feed API.
          </p>
          <IdentityAuditEventsPanel />
        </>
      );
    }
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
  const [assignments, setAssignments] = useState<AdminScopeAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Loading scopes…');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await listAdminScopeAssignments({ perPage: 50, sort: '-created_at' });
        if (cancelled) return;
        setAssignments(result.data);
        setMessage(
          result.data.length === 0
            ? 'No scope assignments yet. Global remains available.'
            : `Loaded ${result.data.length} scope assignment(s).`,
        );
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setAssignments([]);
        setError(identityErrorMessage(err));
        setMessage('Unable to load live scope assignments.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = (screen.items ?? ['Global', 'Continent', 'Country', 'Region', 'Church Network', 'Mission Field']).map(
    (item, index) => ({
      label: item,
      href: `/admin/scope?scope=${encodeURIComponent(item.toLowerCase().replaceAll(' ', '-'))}`,
      icon: ['◉', '⚑', '◇', '▥', '♧', '⌖'][index] ?? '◉',
      copy: [
        'All countries and data',
        'View by continent',
        'Select a country',
        'View by region',
        'By denomination/network',
        'By mission location',
      ][index] ?? 'Open this scope',
    }),
  );

  return (
    <>
      <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>
        {error ?? message}
      </p>
      <div className="scope-current">
        Current Scope <strong>Global</strong>
      </div>
      <div className="scope-grid">
        {cards.map((card) => (
          <Link href={card.href} className="card scope-card" key={card.label}>
            <span className="scope-icon">{card.icon}</span>
            <strong>{card.label}</strong>
            <small>{card.copy}</small>
          </Link>
        ))}
      </div>
      {assignments.length > 0 ? (
        <div className="card table-card" style={{ marginTop: 18 }}>
          <h2 className="section-title">Live scope assignments</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Scope ID</th>
                <th>Role assignment</th>
              </tr>
            </thead>
            <tbody>
              {assignments.slice(0, 12).map((row) => (
                <tr key={row.id}>
                  <td>{row.scope?.type ?? '—'}</td>
                  <td>
                    <code>{row.scope?.id ?? '—'}</code>
                  </td>
                  <td>
                    <code>{row.role_assignment?.id ?? row.id}</code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}

function CommandView({ screen }: { screen: AdminScreen }) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<PlatformSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  async function runSearch(nextTerm = term, resourceType = filter) {
    const clean = nextTerm.trim();
    if (clean.length < 2) {
      setHits([]);
      setError(null);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const results = await queryPlatformSearch(clean, {
        resourceTypes: resourceType === 'all' ? [] : [resourceType.toLowerCase()],
        limit: 20,
      });
      setHits(results);
    } catch (err) {
      setHits([]);
      setError(platformErrorMessage(err, 'Platform search failed.'));
    } finally {
      setBusy(false);
    }
  }

  const commandLinks = [
    { label: 'Approve Home Church', href: '/admin/home-churches/applications', copy: 'Review and decide' },
    { label: 'View Country Report', href: '/admin/reports', copy: 'Open performance' },
    { label: 'Create Announcement', href: '/admin/communications', copy: 'Draft a message' },
    { label: 'Export Member List', href: '/admin/people', copy: 'Open people directory' },
    { label: 'Churches', href: '/admin/churches', copy: 'Manage churches' },
    { label: 'Generate Audit Report', href: '/admin/audit', copy: 'Create secure report' },
  ];

  return (
    <>
      <label className="command-search">
        <span>⌕</span>
        <input
          aria-label="Command search"
          placeholder="Search churches, members, events, giving, requests..."
          value={term}
          data-interaction-native="true"
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void runSearch();
            }
          }}
        />
        <button type="button" className="primary-button" data-interaction-native="true" disabled={busy} onClick={() => void runSearch()}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </label>
      <div className="chip-row">
        {['all', 'Church', 'Member', 'Event', 'Donation', 'Mission', 'User'].map((item) => (
          <button
            key={item}
            type="button"
            data-interaction-native="true"
            className={filter === item ? 'is-active' : undefined}
            onClick={() => {
              setFilter(item);
              void runSearch(term, item);
            }}
          >
            {item === 'all' ? 'All' : item}
          </button>
        ))}
      </div>
      {error ? <p className="field-help identity-error" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      {hits.length > 0 ? (
        <div className="card table-card" style={{ marginBottom: 18 }}>
          <h2 className="section-title">Search results</h2>
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>Summary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hits.map((hit) => (
                <tr key={`${hit.resource_type}-${hit.resource_id}`}>
                  <td>{hit.title}</td>
                  <td>{hit.resource_type}</td>
                  <td>{hit.summary ?? '—'}</td>
                  <td className="actions-cell">
                    <TableRowActions
                      record={formatRowActionRecord(hit.title, hit.resource_id)}
                      canEdit={false}
                      canDelete={false}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <h2 className="section-title">Popular Commands</h2>
      <div className="action-grid">
        {commandLinks.map((item) => (
          <Link className="card action-card" key={item.label} href={item.href}>
            <span>⌘</span>
            <strong>{item.label}</strong>
            <small>{item.copy}</small>
          </Link>
        ))}
      </div>
    </>
  );
}

function TasksView({ screen }: { screen: AdminScreen }) {
  type TaskItem = FollowUpTaskRecord & { source: 'follow_up' | 'applications' | 'invitations' | 'pastoral' };
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [total, setTotal] = useState(0);
  const [message, setMessage] = useState('Loading tasks…');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<'pending' | 'team' | 'completed'>('pending');

  const refresh = useCallback(async () => {
    if (!shouldUseOperationsLiveData()) {
      setTasks([]);
      setMessage('Operations API is not configured for live tasks.');
      return;
    }
    setError(null);
    setMessage('Loading tasks…');
    try {
      const scope = defaultOpsScope(screen.scope);
      const [followUps, applications, invitations, needs] = await Promise.all([
        listFollowUpTasks({ scope, perPage: 50 }),
        listHomeChurchApplications({ scope, perPage: 25 }),
        listMissionInvitations({ scope, perPage: 25 }),
        listPastoralNeeds({ scope, perPage: 25 }),
      ]);
      stashAdminRecords([
        ...(followUps.items as unknown as Array<Record<string, unknown>>),
        ...(applications.items as unknown as Array<Record<string, unknown>>),
        ...(invitations.items as unknown as Array<Record<string, unknown>>),
        ...(needs.items as unknown as Array<Record<string, unknown>>),
      ]);
      const derived: TaskItem[] = [
        ...followUps.items.map((task) => ({ ...task, source: 'follow_up' as const })),
        ...applications.items
          .filter((item) => !['active', 'approved', 'rejected', 'closed'].includes((item.status ?? '').toLowerCase()))
          .map((item) => ({
            id: item.id,
            person_name: item.applicant_name ?? item.proposed_name,
            assigned_to_name: null,
            type: 'home_church_application_review',
            status: item.status,
            due_at: item.status_changed_at ?? null,
            completed_at: null,
            completion_reason_code: null,
            source: 'applications' as const,
          })),
        ...invitations.items
          .filter((item) => (item.status ?? '').toLowerCase() !== 'accepted')
          .map((item) => ({
            id: item.id,
            person_name: item.requester_name ?? item.requested_location_name,
            assigned_to_name: null,
            type: 'mission_invitation_followup',
            status: item.status,
            due_at: item.status_changed_at ?? item.created_at ?? null,
            completed_at: null,
            completion_reason_code: null,
            source: 'invitations' as const,
          })),
        ...needs.items
          .filter((item) => (item.status ?? '').toLowerCase() !== 'resolved')
          .map((item) => ({
            id: item.id,
            person_name: item.person_name ?? item.category,
            assigned_to_name: null,
            type: 'pastoral_need_review',
            status: item.status,
            due_at: item.created_at ?? null,
            completed_at: null,
            completion_reason_code: null,
            source: 'pastoral' as const,
          })),
      ];
      setTasks(derived);
      setTotal(derived.length);
      setMessage(
        derived.length === 0
          ? 'No task items in this scope.'
          : `Loaded ${derived.length} task item(s) from follow-up, applications, invitations, and pastoral needs.`,
      );
    } catch (err) {
      setTasks([]);
      setTotal(0);
      setError(operationsErrorMessage(err, 'Unable to load task queues.'));
      setMessage('Live tasks unavailable');
    }
  }, [screen.scope]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function onComplete(task: FollowUpTaskRecord) {
    const reason = window.prompt('Completion reason code (e.g. contacted_successfully):', 'contacted_successfully');
    if (!reason) return;
    setBusyId(task.id);
    setError(null);
    try {
      await completeFollowUpTask(task.id, reason.trim(), defaultOpsScope(screen.scope));
      await refresh();
    } catch (err) {
      setError(operationsErrorMessage(err, 'Follow-up completion failed.'));
    } finally {
      setBusyId(null);
    }
  }

  const pending = tasks.filter((task) => !/completed|done|resolved|active|accepted/i.test(task.status ?? ''));
  const team = tasks.filter((task) => task.source !== 'follow_up' && !/completed|done|resolved|active|accepted/i.test(task.status ?? ''));
  const completed = tasks.filter((task) => /completed|done|resolved|active|accepted/i.test(task.status ?? ''));
  const visible = tab === 'pending' ? pending : tab === 'team' ? team : completed;

  return (
    <>
      <p className="maps-settings-lead" role="status">
        Tasks are aggregated from live operational queues (follow-up, applications, invitations, pastoral needs) because there is no standalone generic task entity.
      </p>
      <div className="chip-row" style={{ marginBottom: 12 }}>
        <button type="button" data-interaction-native="true" className={tab === 'pending' ? 'is-active' : undefined} onClick={() => setTab('pending')}>
          My Tasks ({pending.length})
        </button>
        <button type="button" data-interaction-native="true" className={tab === 'team' ? 'is-active' : undefined} onClick={() => setTab('team')}>
          Team Tasks ({team.length})
        </button>
        <button type="button" data-interaction-native="true" className={tab === 'completed' ? 'is-active' : undefined} onClick={() => setTab('completed')}>
          Completed ({completed.length})
        </button>
        <span className="field-help">Total {total}</span>
      </div>
      {error ? <p className="field-help identity-error" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="card task-list">
        {visible.length === 0 ? (
          <p className="maps-settings-lead">{message}</p>
        ) : (
          visible.map((task) => (
            <div className="task-item" key={task.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center' }}>
              <div>
                <strong>{task.person_name || task.type || 'Task item'}</strong>
                <small style={{ display: 'block' }}>
                  {task.assigned_to_name ? `Assigned to ${task.assigned_to_name}` : 'Unassigned'} · {task.status} · {task.source.replace('_', ' ')}
                </small>
                <time>{task.due_at ? formatTimestamp(task.due_at) : 'No due date'}</time>
              </div>
              <div className="row-actions">
                <TableRowActions
                  record={formatRowActionRecord(task.person_name ?? task.type, task.id)}
                  entityKey="follow_up_task"
                  canEdit={false}
                  canDelete={false}
                />
                {tab !== 'completed' && task.source === 'follow_up' ? (
                  <button
                    type="button"
                    className="table-action"
                    data-interaction-native="true"
                    disabled={busyId === task.id}
                    onClick={() => void onComplete(task)}
                  >
                    Complete
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function KpiView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const metrics = dashboard.metrics;
  const breakdownItems = breakdownToItems(dashboard.data?.breakdown);

  if (screen.route === '/admin/audit' && !shouldUseDesignFixtures()) {
    return <><MetricCards metrics={metrics} /><AdministrationAuditExport requestedScope={requestedScope} /><div className="analytics-grid kpi-two"><IdentityAuditEventsPanel compact requestedScope={requestedScope} /><ChartCard title="Audit Logs Trend" bars series={dashboard.data?.series} /></div></>;
  }
  if (screen.batch === 'A') {
    return (
      <DashboardShell screenId={screen.id} href={screen.route} data={dashboard.data} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.retry} preset={dashboard.preset} onPresetChange={dashboard.setPreset}>
        <LinkedMetricCards screenId={screen.id} metrics={metrics} />
        <div className="analytics-grid kpi-two">{screen.id === 'A-12' ? <><ChartCard title="Member Growth" bars series={dashboard.data?.series} /><ChartCard title="Giving Trend" bars series={dashboard.data?.series} /></> : <><div className="card list-card"><h2 className="card-title">Top Admin Actions</h2>{breakdownItems.length === 0 ? <p className="maps-settings-lead">No activity in this period.</p> : breakdownItems.map(item => <div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</div><ChartCard title="Audit Logs Trend" bars series={dashboard.data?.series} /></>}</div>
      </DashboardShell>
    );
  }
  const countryRanks = dashboard.data?.breakdown ?? [];
  return (
    <DashboardShell screenId={screen.id} href={screen.route} data={dashboard.data} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.retry} preset={dashboard.preset} onPresetChange={dashboard.setPreset}>
      <LinkedMetricCards screenId={screen.id} metrics={metrics} />
      <div className="analytics-grid">
        <div className="card list-card"><h2 className="card-title">Organization Overview</h2>{metrics.length === 0 ? <p className="maps-settings-lead">No organization totals in this period.</p> : metrics.map((metric) => <div className="rank-row" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong></div>)}</div>
        <ChartCard title="Churches Growth" bars series={dashboard.data?.series} />
        <div className="card list-card"><h2 className="card-title">Top Countries by Churches</h2>{countryRanks.length === 0 ? <p className="maps-settings-lead">No country church counts in this period.</p> : countryRanks.map((item) => <div className="bar-rank" key={item.label}><span>{item.label}</span><i style={{ width: `${Math.max(8, item.percent ?? 0)}%` }} /><strong>{item.value}</strong></div>)}</div>
        <ChartCard title="Growth Trend" bars series={dashboard.data?.series} />
      </div>
      <DashboardQuickLinks screenId={screen.id} />
    </DashboardShell>
  );
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
  const fixtures = shouldUseDesignFixtures();
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
              defaultValue={fixtures ? field.value : undefined}
              placeholder={`Search ${field.label.replace(' *', '')}`}
            />
          ) : field.type === 'select' ? (
            <select name={field.name} defaultValue={fixtures ? field.value : ''}>
              <option value="" disabled>
                Select {field.label.replace(' *', '')}
              </option>
              {field.options?.map((option) => (
                <option key={option} value={option}>
                {option === 'bible_study' ? 'Study Manual' : option === 'devotional' ? 'Devotional' : option}
                </option>
              ))}
            </select>
          ) : (
            <input name={field.name} type={field.type} defaultValue={fixtures ? field.value : undefined} />
          )}
        </label>
      ))}
      {!fixtures ? (
        <p className="field-help full" role="status">
          {t('admin.createUserLiveHint', {
            defaultMessage: 'Complete each wizard step. User creation submits through the live identity API when wired for this scope.',
          })}
        </p>
      ) : null}
    </div>
  );
}

function WizardView({ screen }: { screen: AdminScreen }) {
  const churchFields = [
    { label: 'Church Name *', name: 'name', type: 'text' as const },
    { label: 'Country *', name: 'country_id', type: 'search-select' as const, catalog: 'country' as const },
    { label: 'Administrative Unit *', name: 'administrative_unit_id', type: 'search-select' as const, catalog: 'administrativeUnit' as const },
    { label: 'Existing Location', name: 'location_id', type: 'search-select' as const, catalog: 'location' as const },
    { label: 'New Location Name', name: 'location_name', type: 'text' as const },
    { label: 'Address Line 1', name: 'address_line_one', type: 'text' as const },
    { label: 'Address Line 2', name: 'address_line_two', type: 'text' as const },
    { label: 'Locality / City', name: 'locality', type: 'text' as const },
    { label: 'Postal Code', name: 'postal_code', type: 'text' as const },
    { label: 'Timezone *', name: 'timezone', type: 'text' as const },
  ];
  const contactFields = [
    { label: 'Phone', name: 'phone', type: 'text' as const },
    { label: 'Email', name: 'email', type: 'email' as const },
    { label: 'Website', name: 'website', type: 'text' as const },
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
    const countryId = String(form.get('country_id') ?? '').trim();
    const unitId = String(form.get('administrative_unit_id') ?? '').trim();
    let locationId = String(form.get('location_id') ?? '').trim();
    const timezone = String(form.get('timezone') ?? '').trim() || 'Africa/Lagos';
    if (!name || !unitId) {
      setCreateMessage('Name and administrative unit are required.');
      return;
    }
    if (!locationId && !countryId) {
      setCreateMessage('Country is required when creating a new location for the church.');
      return;
    }
    setCreateBusy(true);
    setCreateMessage(null);
    try {
      if (!locationId) {
        const location = await createLocation({
          country_id: countryId,
          name: String(form.get('location_name') ?? '').trim() || `${name} location`,
          timezone,
          administrative_unit_id: unitId,
          address_line_one: String(form.get('address_line_one') ?? '').trim() || null,
          address_line_two: String(form.get('address_line_two') ?? '').trim() || null,
          locality: String(form.get('locality') ?? '').trim() || null,
          postal_code: String(form.get('postal_code') ?? '').trim() || null,
        }, { scope: defaultOpsScope(screen.scope) });
        locationId = location.id;
      }
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
  const [capabilities, setCapabilities] = useState<CapabilitySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwnAdminProfile) return;
    let cancelled = false;
    void Promise.all([fetchAdminProfile(), fetchUserCapabilities()])
      .then(([currentUser, snapshot]) => {
        if (!cancelled) {
          setUser(currentUser);
          setCapabilities(snapshot);
        }
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
  const permissionList = capabilities?.permissions ?? [];
  const roleAssignments = capabilities?.roles ?? [];
  const scopeList = capabilities?.scopes ?? [];

  return (
    <div className="profile-layout">
      <article className="card identity-card">
        <div className="portrait large">{initials}</div>
        <h2>{name}</h2>
        <StatusBadge value={status} />
      </article>
      <article className="card details-card profile-details">
        <dl>{Object.entries(details).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      </article>
      <article className="card account-card">
        <h2>{t('admin.myAccess', { defaultMessage: 'My access' })}</h2>
        {roleAssignments.length === 0 ? (
          <p>{t('admin.noRoleAssigned', { defaultMessage: 'No role assigned' })}</p>
        ) : (
          <ul className="access-role-list">
            {roleAssignments.map((role) => (
              <li key={role.code}>
                <strong>{role.name}</strong>
                <span>{role.code}</span>
                {role.scopes?.length ? (
                  <p>{role.scopes.map((scope) => `${scope.type}:${scope.key}`).join(', ')}</p>
                ) : (
                  <p>{t('admin.globalScope', { defaultMessage: 'Global scope' })}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        {scopeList.length > 0 ? (
          <p className="maps-settings-lead">
            {t('admin.assignedScopes', { defaultMessage: 'Assigned scopes' })}: {scopeList.map((scope) => `${scope.type}:${scope.key}`).join(' · ')}
          </p>
        ) : null}
        {permissionList.length > 0 ? (
          <>
            <h3>{t('admin.permissions', { defaultMessage: 'Permissions' })} ({permissionList.length})</h3>
            <ul className="permission-list compact">
              {permissionList.map((permission) => <li key={permission}>{permission}</li>)}
            </ul>
          </>
        ) : null}
      </article>
      <article className="card account-card">
        <h2>{t('admin.accountStatus', { defaultMessage: 'Account Status' })}</h2>
        <strong className="trend">{status}</strong>
        <p>{t('admin.lastActive', { defaultMessage: 'Last Active' })}<br /><b>{formatProfileDate(user.last_active_at)}</b></p>
        <p>{t('admin.memberSince', { defaultMessage: 'Member Since' })}<br /><b>{formatProfileDate(user.member_since)}</b></p>
      </article>
      <Link href="/account/profile" className="primary-button profile-save">{t('admin.updateProfile', { defaultMessage: 'Update Profile' })}</Link>
    </div>
  );
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
      setError('The platform API is not configured.');
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
        <button className="primary-button" type="submit" disabled={!apiReady || busy} title={apiReady ? undefined : t('admin.apiNotConfigured', { defaultMessage: 'The platform API is not configured', })}>
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
      setError('The platform API is not configured.');
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
              defaultMessage: 'The platform API is not configured; role assignment submit is blocked.',
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
        <button className="primary-button" type="submit" disabled={!apiReady || busy} title={apiReady ? undefined : t('admin.apiNotConfigured', { defaultMessage: 'The platform API is not configured', })}>
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
      setError('The platform API is not configured.');
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
          title={apiReady ? undefined : 'The platform API is not configured'}
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

function DonutVisual({ value = '0', label = 'Total', breakdown }: { value?: string; label?: string; breakdown?: Array<{ label: string; value: string; percent?: number }> }) {
  const segments = (breakdown ?? []).slice(0, 3).map((item) => ({ label: item.label, percent: item.percent ?? 0 }));
  return <div className="donut-wrap"><div className="donut-chart"><div><strong>{value}</strong><span>{label}</span></div></div><ul>{segments.length === 0 ? <li>No segments in this period</li> : segments.map((item) => <li key={item.label}><i />{item.label} <b>{item.percent}%</b></li>)}</ul></div>;
}

function MinistryDashboardView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const donut = dashboard.data?.donut;
  const activities = (dashboard.data?.recent_activities ?? []).map((activity) => ({
    title: activity.title,
    time: formatRelativeTime(activity.occurred_at),
  }));

  return (
    <DashboardShell screenId={screen.id} href={screen.route} data={dashboard.data} loading={dashboard.loading} error={dashboard.error} onRetry={dashboard.retry} preset={dashboard.preset} onPresetChange={dashboard.setPreset}>
      <LinkedMetricCards screenId={screen.id} metrics={dashboard.metrics} />
      <div className="ministry-dashboard-grid">
        <ChartCard title={screen.batch === 'D' ? 'Home Churches Growth (6 Months)' : screen.batch === 'F' ? 'People growth' : 'Membership Growth'} series={dashboard.data?.series} />
        <article className="card dashboard-donut"><h2 className="card-title">{screen.batch === 'D' ? 'Application Status' : screen.batch === 'F' ? 'People mix' : 'Attendance Overview'}</h2><DonutVisual value={donut?.value ?? '0'} label={donut?.label ?? (screen.batch === 'D' ? 'Total' : screen.batch === 'F' ? 'People' : 'Average')} breakdown={dashboard.data?.breakdown} /></article>
        <DashboardQuickLinks screenId={screen.id} />
        <article className="card compact-list"><h2 className="card-title">Recent Activities</h2>{activities.length === 0 ? <p className="maps-settings-lead">No recent activity in this scope.</p> : activities.map((item) => <div className="activity-row" key={`${item.title}-${item.time}`}><span>●</span><b>{item.title}</b><time>{item.time}</time></div>)}</article>
      </div>
      {dashboard.data?.definitions?.length ? (
        <article className="card" aria-label="Metric definitions">
          <h2 className="card-title">How these numbers are counted</h2>
          <ul>{dashboard.data.definitions.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      ) : null}
    </DashboardShell>
  );
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
              <label className="full"><span>Application *</span><EntitySearchSelect name="home_church_application_id" catalog="homeChurchApplication" required value={applicationId} onValueChange={setApplicationId} /></label>
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
  if (!shouldUseDesignFixtures() && opsDataset && shouldUseOperationsLiveData()) {
    if (screen.route.includes('small-groups') || opsDataset === 'groups') {
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
    if (screen.route.includes('/attendance') || opsDataset === 'attendance') {
      return (
        <>
          <MetricCards metrics={screen.metrics} />
          <OperationsLiveTable
            screen={{
              ...screen,
              columns: ['Home Church', 'Date', 'Male', 'Female', 'Children', 'Total'],
            }}
            dataset={opsDataset}
          />
        </>
      );
    }
    if (screen.route.includes('/activities') || opsDataset === 'announcements') {
      return (
        <>
          <MetricCards metrics={screen.metrics} />
          <OperationsLiveTable
            screen={{
              ...screen,
              columns: ['Title', 'Church', 'Date', 'Status'],
            }}
            dataset={opsDataset}
          />
        </>
      );
    }
  }
  const activityMode = screen.id === 'D-11';
  return <><MetricCards metrics={screen.metrics}/>{activityMode ? <div className="card activity-stack">{(screen.items ?? []).map((item,index)=>{const parts=item.split(' — ');return <article key={item}><time><b>{['May 25','May 19','May 12','May 5','Apr 28'][index]}</b></time><div><strong>{parts[0]}</strong><span>{parts[1]}</span></div><b>♙ {parts[2]}</b><StatusBadge value="Completed"/></article>})}<button className="ghost-button">View all activities</button></div> : <div className="operations-grid"><ChartCard title="Attendance Trend"/><article className="card dashboard-donut"><h2 className="card-title">Attendance by Service</h2><DonutVisual value={screen.id === 'D-10' ? '22' : '726'} label="Total"/></article><article className="card list-card operation-ranking"><h2 className="card-title">Top Services by Attendance</h2>{(screen.items ?? []).map(item=><div className="rank-row" key={item}><span>{item.split(' — ')[0]}</span><strong>{item.split(' — ')[1]}</strong></div>)}</article></div>}</>;
}

function JourneyView({ screen }: { screen: AdminScreen }) {
  const live = !shouldUseDesignFixtures() && shouldUseOperationsLiveData();
  const journeyKind = screen.route.includes('/membership')
    ? 'membership'
    : screen.route.includes('/worker')
      ? 'worker'
      : screen.route.includes('/leadership')
        ? 'leadership'
        : 'membership';
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('Loading journey context…');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    void (async () => {
      setError(null);
      setMessage('Loading journey context…');
      try {
        const scope = defaultOpsScope(screen.scope);
        const result =
          journeyKind === 'membership'
            ? await listMemberships({ scope, perPage: 1 })
            : journeyKind === 'worker'
              ? await listWorkers({ scope, perPage: 1 })
              : await listLeaders({ scope, perPage: 1 });
        if (cancelled) return;
        setRecord((result.items[0] as Record<string, unknown>) ?? null);
        setMessage(
          result.items[0]
            ? 'Progress is inferred from live membership/role records. There is no dedicated journey workflow API.'
            : 'No live records found for this journey type in the current scope.',
        );
      } catch (err) {
        if (cancelled) return;
        setRecord(null);
        setError(operationsErrorMessage(err, 'Unable to load journey context.'));
        setMessage('Live journey data unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [journeyKind, live, screen.scope]);

  if (live) {
    const personName = String(record?.person_name ?? 'Person');
    const stageLabel =
      journeyKind === 'membership'
        ? String(record?.status ?? 'Membership')
        : String(record?.title ?? record?.role_type ?? journeyKind);
    const progress = record ? (record.status === 'active' || record.status === 'Active' ? '60%' : '30%') : '0%';
    const steps =
      journeyKind === 'membership'
        ? ['Application / join — Inferred', 'Orientation — Unknown', 'Membership status — Live']
        : journeyKind === 'worker'
          ? ['Role assigned — Live', 'Training — Unknown', 'Active service — Inferred']
          : ['Identified — Inferred', 'Development — Unknown', 'Leadership role — Live'];
    return (
      <>
        <p className="maps-settings-lead" role={error ? 'alert' : 'status'} style={error ? { color: '#dc2626' } : undefined}>
          {error ?? message}
        </p>
        <div className="journey-rail">
          {steps.map((item, index) => (
            <div className={index === 0 ? 'complete' : index === 1 ? 'active' : ''} key={item}>
              <span>{index + 1}</span>
              <b>{item.split(' — ')[0]}</b>
            </div>
          ))}
        </div>
        <article className="card journey-card">
          <header>
            <div className="portrait">{personName.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div>
            <div>
              <h2>{personName}</h2>
              <p>Current {stageLabel}</p>
            </div>
            <strong>{progress}</strong>
          </header>
          <div className="progress-track"><i style={{ width: progress }} /></div>
          <div className="journey-list">
            {steps.map((item, index) => (
              <div key={item}>
                <span className={index === 0 ? 'done' : index === 1 ? 'doing' : ''}>{index === 0 ? '✓' : '●'}</span>
                <b>{item.split(' — ')[0]}</b>
                <StatusBadge value={item.split(' — ')[1] ?? 'Pending'} />
              </div>
            ))}
          </div>
        </article>
      </>
    );
  }

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

function SettingsView({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  if (screen.route.includes('/geography/settings') && !shouldUseOrganizationFixtures()) {
    return <GeographyScreenContent screen={screen} requestedScope={requestedScope} />;
  }
  if (
    screen.route.includes('/admin/settings')
    || screen.route.includes('/communications/settings')
    || screen.route.includes('/finance/providers')
    || screen.route.includes('/security/configuration')
  ) {
    return <PlatformSettingsScreen screen={screen} />;
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
  const { setSessionUser, clearSession, refresh } = useAuth();
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
      const { user, meta } = await loginBrowserUser({ email, password, remember });
      if (meta.email_verification_required) {
        setSessionUser(user);
        router.push('/verify-email');
        return;
      }
      const capabilities = await fetchUserCapabilities();
      if (!hasAdministratorCapabilities(capabilities)) {
        await logoutBrowserUser().catch(() => undefined);
        clearSession();
        setError(t('errors.notAdministrator', {
          defaultMessage: 'This account is not an administrator. Use member sign-in at /login, or sign in with an admin user.',
        }));
        return;
      }
      setSessionUser(user);
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
      await refresh();
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
          {!apiReady ? <small role="status">{t('auth.adminApiUrlHint', { defaultMessage: 'Set NEXT_PUBLIC_FHC_API_URL so admin sign-in can reach the platform API.' })}</small> : <small>{t('auth.needHelp', { defaultMessage: 'Need help?' })} <Link href="/contact">{t('auth.contactSupport', { defaultMessage: 'Contact Support' })}</Link></small>}
        </div>
      </form>
    </main>
  );
}

function ScreenContent({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  if (screen.batch === 'G' || screen.batch === 'H') return <KcaScreenContent screen={screen} requestedScope={requestedScope} />;
  if (screen.batch === 'I') return <MissionScreenContent screen={screen} requestedScope={requestedScope} />;
  if (['J','K','L','M','N','O','P'].includes(screen.batch)) return <PlatformScreenContent screen={screen} requestedScope={requestedScope} />;
  if (screen.batch === 'C' && screen.route !== '/admin/geography' && !screen.route.includes('/geography/scope')) {
    return <GeographyScreenContent screen={screen} requestedScope={requestedScope} />;
  }
  if (screen.batch === 'D' && screen.route !== '/admin/home-churches/dashboard') {
    return <HomeChurchesScreenContent screen={screen} requestedScope={requestedScope} />;
  }
  if (screen.batch === 'E' && screen.route !== '/admin/church/dashboard') {
    return <ChurchScreenContent screen={screen} requestedScope={requestedScope} />;
  }
  if (screen.batch === 'F' && screen.route !== '/admin/people/dashboard') {
    return <PeopleScreenContent screen={screen} requestedScope={requestedScope} />;
  }
  if ((screen.batch === 'A' || screen.batch === 'B') && screen.kind !== 'login' && screen.kind !== 'mfa') {
    const administration = AdministrationScreenContent({ screen, requestedScope });
    if (administration) return administration;
  }
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
    case 'settings': return <SettingsView screen={screen} requestedScope={requestedScope}/>;
    case 'finance': return <FinanceView screen={screen}/>;
    case 'reports': return <ReportsView screen={screen}/>;
    case 'restricted': return <RestrictedView screen={screen}/>;
    case 'escalation': return <EscalationView screen={screen}/>;
    case 'forbidden': return <ForbiddenView/>;
    default: return null;
  }
}

export function AdminScreenView({ screen, decision, requestedScope, returnTo, accessContext }: { screen: AdminScreen; decision: AccessDecision; requestedScope: string; returnTo?: string; accessContext?: AccessContext }) {
  const access = accessContext ?? emptyAccessContext();
  const breadcrumbs = getAdminBreadcrumbs(screen);
  const interactionProps = { route: screen.route, title: screen.title, permission: screen.permission, scope: requestedScope, screenKind: screen.kind, returnTo, tabs: screen.tabs, routes: getInteractionRouteMap(screen), records: screen.rows?.map((row) => Object.values(row).join(' · ')), details: screen.details, items: screen.items };
  if(screen.kind==='login'||screen.kind==='mfa') return <AuthView screen={screen} returnTo={returnTo}/>;
  const rendererOwnsHeader = new Set(['B-03','G-03','G-04','G-05','G-06','G-07','G-08','G-09','G-10','G-12','G-13','G-14','G-15','G-16','G-18','H-01b','H-02','H-06','H-08','H-10','H-13','H-17','H-19','H-20','I-03','I-04','I-06','I-07','I-09','I-11','I-17']).has(screen.id)
    || (/^\/admin\/home-churches\/[0-7][0-9A-HJKMNP-TV-Z]{25}/i.test(screen.route) && !screen.route.includes('/applications/'))
    || /^\/admin\/churches\/[0-7][0-9A-HJKMNP-TV-Z]{25}/i.test(screen.route);
  const rendererNeedsAction = new Set(['G-03']).has(screen.id);
  const rendererOwnsAction = new Set(['G-01','G-16','G-17','H-01','H-11','H-13','H-17','H-20','I-02','I-08','I-10','I-12','I-13','I-14','I-15','I-16','I-18','I-19','I-20','E-02']).has(screen.id);
  return <AdminAccessProvider value={{ access, requestedScope }}><AdminInteractionShell {...interactionProps}><div className="admin-shell"><Sidebar screen={screen}/><main className="admin-main"><Topbar screen={screen}/>{decision.allowed?<section className={`page batch-${screen.batch.toLowerCase()} ${rendererOwnsHeader ? 'renderer-header' : ''}`}><Breadcrumbs items={breadcrumbs}/>{!rendererOwnsHeader && <PageHeader screen={screen} hideAction={rendererOwnsAction}/>} {rendererNeedsAction && screen.action && <div className="renderer-action-row"><button type="button" className={screen.action.includes('Print') || screen.action.includes('Download') ? 'ghost-button' : 'primary-button'}>{screen.action}</button></div>}<ScreenContent screen={screen} requestedScope={requestedScope}/></section>:<ForbiddenView scope={requestedScope} reason={decision.reason}/>}</main></div></AdminInteractionShell></AdminAccessProvider>;
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
