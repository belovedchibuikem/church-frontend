import type { AdminScreen } from './admin-routes';

export type AccessContext = {
  authenticated: boolean;
  mfaVerified: boolean;
  permissions: string[];
  scopes: string[];
};

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; reason: 'unauthenticated' | 'mfa-required' | 'permission-denied' | 'scope-denied' };

export type CapabilityScope = { type: string; key: string };

/** Fail-closed empty context (production: no session). */
export function emptyAccessContext(): AccessContext {
  return { authenticated: false, mfaVerified: false, permissions: [], scopes: [] };
}

/**
 * Design-review full-access fixture. Enabled only when FHC_ENABLE_DESIGN_FIXTURES=true.
 * Never used for production gating.
 */
export function designFixtureAccessContext(): AccessContext {
  return {
    authenticated: true,
    mfaVerified: true,
    permissions: ['*'],
    scopes: ['global', 'country:nigeria', 'region:lagos', 'local:ikeja'],
  };
}

/**
 * Map Laravel capability scope rows to AccessContext scope tokens.
 * - global scopes → `global` (matches evaluateAccess global checks)
 * - all scopes also as `type:key` (e.g. country:nigeria, global:platform)
 */
export function formatCapabilityScope(scope: CapabilityScope): string[] {
  const type = scope.type?.trim();
  const key = scope.key?.trim();
  if (!type || !key) return [];
  const token = `${type}:${key}`;
  return type === 'global' ? ['global', token] : [token];
}

export function hasGlobalPlatformScope(scopes: CapabilityScope[] | string[]): boolean {
  if (scopes.length === 0) return false;
  if (typeof scopes[0] === 'string') {
    return scopes.includes('global') || scopes.includes('global:platform');
  }
  return scopes.some((scope) => scope.type === 'global');
}

/** Church-tenant admins land on church operations instead of the global console. */
export function churchTenantHomePath(context: AccessContext): string | null {
  if (!context.authenticated) return null;
  if (hasGlobalPlatformScope(context.scopes)) return null;
  if (!context.scopes.some((scope) => scope.startsWith('church:'))) return null;
  if (!context.permissions.includes('church.churches.view') && !context.permissions.includes('*')) return null;
  return '/admin/church/dashboard';
}

/** Build AccessContext from GET /user/me success + GET /user/capabilities snapshot. */
export function accessContextFromCapabilities(
  snapshot: { permissions: string[]; scopes: CapabilityScope[] },
  options: { mfaVerified?: boolean } = {},
): AccessContext {
  const scopes = Array.from(new Set(snapshot.scopes.flatMap((scope) => formatCapabilityScope(scope))));
  const permissions = [...snapshot.permissions];
  // Live Laravel bundles use API codes (platform.configuration.manage, …) while the
  // admin screen catalog still uses UI codes (admin.dashboard.view, …). Platform
  // administrators keep a UI wildcard; church-tenant admins keep real permission codes
  // so they only see the church they are scoped to. Laravel APIs remain the real gate.
  if (
    hasAdministratorCapabilities(snapshot)
    && hasGlobalPlatformScope(snapshot.scopes ?? [])
    && !permissions.includes('*')
  ) {
    permissions.unshift('*');
  }
  return {
    authenticated: true,
    // /user/capabilities does not expose MFA age; Laravel still enforces EnsureRecentMfa on admin APIs.
    // Until a session probe exists, UI gating treats a live verified session as MFA-ready for navigation.
    // Pass mfaVerified: false explicitly when a caller knows recent MFA is missing.
    mfaVerified: options.mfaVerified ?? true,
    permissions,
    scopes,
  };
}

/**
 * True when the session holds a real administrator bundle permission.
 * Member self-service (sessions, MFA, preferences) is not enough to enter /admin.
 */
export function hasAdministratorCapabilities(snapshot: {
  permissions: string[];
  scopes?: CapabilityScope[];
}): boolean {
  if (snapshot.permissions.includes('*')) return true;
  return ADMINISTRATOR_CAPABILITY_SIGNALS.some((permission) => snapshot.permissions.includes(permission));
}

const ADMINISTRATOR_CAPABILITY_SIGNALS = [
  'identity.users.view',
  'platform.configuration.view',
  'platform.configuration.manage',
  'platform.files.manage',
  'organization.countries.view',
  'church.churches.view',
  'security.audit.view',
] as const;

/** Member `/account/*` surfaces only require an authenticated (verified) session. */
export function evaluateMemberAccess(context: AccessContext): AccessDecision {
  if (!context.authenticated) return { allowed: false, reason: 'unauthenticated' };
  return { allowed: true };
}

export function evaluateAccess(screen: AdminScreen, context: AccessContext, requestedScope = 'global'): AccessDecision {
  if (screen.permission === 'public') return { allowed: true };
  if (!context.authenticated) return { allowed: false, reason: 'unauthenticated' };
  if (!context.mfaVerified) return { allowed: false, reason: 'mfa-required' };
  if (!context.permissions.includes('*') && !context.permissions.includes(screen.permission) && !hasAliasedPermission(screen.permission, context.permissions)) {
    return { allowed: false, reason: 'permission-denied' };
  }
  if (screen.scope === 'global' && !context.scopes.includes('global')) return { allowed: false, reason: 'scope-denied' };
  if (screen.scope === 'assigned' && !context.scopes.includes('global') && !context.scopes.includes(requestedScope)) {
    return { allowed: false, reason: 'scope-denied' };
  }
  return { allowed: true };
}

const SETTINGS_PERMISSION_ALIASES: Record<string, readonly string[]> = {
  'settings.platform.manage': ['platform.configuration.view', 'platform.configuration.manage'],
  'settings.ministry.manage': ['platform.configuration.view', 'platform.configuration.manage'],
  'settings.church.manage': ['platform.configuration.manage', 'platform.configuration.view'],
  'settings.home-church-rules.manage': ['church.home_churches.view', 'church.home_church_applications.review'],
  'settings.kca.manage': ['kca.governance.view', 'kca.governance.manage'],
  'settings.mission.manage': ['mission.crusades.view'],
  'settings.press.manage': ['press.publications.view', 'press.translations.view'],
  'settings.events.manage': ['events.events.view', 'events.events.manage'],
  'settings.payments.manage': ['platform.payments.view', 'platform.payments.manage'],
  'settings.notifications.manage': ['platform.communications.view', 'platform.communications.manage'],
  'settings.languages.manage': ['platform.configuration.view'],
  'settings.translation-governance.manage': ['press.translations.view', 'press.publications.view'],
  'settings.feature-flags.manage': ['platform.feature_flags.view', 'platform.feature_flags.manage'],
  'settings.maps.manage': ['platform.maps.view', 'platform.maps.manage'],
  'settings.media.manage': ['platform.files.view', 'platform.files.manage'],
  'settings.uploads.manage': ['platform.storage.manage', 'platform.files.manage'],
  'settings.system-information.manage': ['platform.configuration.view'],
  'settings.ai-api.manage': ['platform.advisory.request', 'platform.configuration.view', 'platform.configuration.manage'],
  'settings.branding.manage': ['platform.configuration.view', 'platform.configuration.manage'],
};

const GEOGRAPHY_PERMISSION_ALIASES: Record<string, readonly string[]> = {
  'organization.country.view': ['organization.countries.view'],
  'organization.level.manage': ['organization.countries.manage', 'organization.countries.view'],
  'organization.region.view': ['organization.units.view'],
  'organization.local_area.view': ['organization.units.view'],
  'organization.hierarchy.view': ['organization.units.view', 'organization.countries.view'],
  'organization.map.view': ['organization.locations.view'],
  'organization.location.view': ['organization.locations.view'],
  'organization.scope.assign': ['identity.scopes.assign'],
  'organization.settings.update': ['platform.configuration.manage'],
  'organization.organizations.view': ['organization.countries.view', 'organization.units.view'],
  'church.hierarchy.view': ['church.churches.view'],
  'home_church.hierarchy.view': ['church.home_churches.view'],
  'reports.territory.view': ['organization.units.view', 'organization.countries.view'],
};

const DASHBOARD_PERMISSION_ALIASES: Record<string, readonly string[]> = {
  'admin.dashboard.view': ['identity.users.view', 'platform.configuration.view', 'security.audit.view', 'church.churches.view'],
  'organization.view': ['organization.countries.view'],
  'home_church.dashboard.view': ['church.home_churches.view'],
  'home_church.application.view': ['church.home_church_applications.review'],
  'home_church.application.review': ['church.home_church_applications.review', 'church.home_church_applications.manage'],
  'home_church.application.decide': ['church.home_church_applications.review'],
  'home_church.application.activate': ['church.home_church_applications.review'],
  'home_church.view': ['church.home_churches.view'],
  'home_church.member.view': ['church.home_churches.view', 'church.churches.view'],
  'home_church.attendance.view': ['church.home_churches.view'],
  'home_church.activity.view': ['church.churches.view', 'church.home_churches.view'],
  'home_church.need.view': ['church.follow_up.view'],
  'home_church.finance.view': ['church.home_churches.view'],
  'home_church.status.update': ['church.home_church_applications.manage'],
  'church.dashboard.view': ['church.churches.view'],
  'church.view': ['church.churches.view'],
  'church.update': ['church.churches.manage'],
  'church.leader.view': ['church.churches.view'],
  'church.member.view': ['church.churches.view'],
  'people.directory.view': ['church.churches.view'],
  'people.follow_up.view': ['church.follow_up.view'],
  'people.journey.view': ['church.churches.view'],
  'people.history.view': ['church.churches.view'],
  'people.need.view': ['church.follow_up.view'],
  'people.need.approve': ['church.follow_up.complete'],
  'counselling.case.view': ['church.follow_up.view'],
  'counselling.case.restricted': ['church.follow_up.complete', 'safeguarding.incidents.report'],
  'testimony.view': ['church.churches.view'],
  'safeguarding.escalate': ['safeguarding.incidents.report'],
  'people.first_timer.view': ['church.first_timers.view'],
  'people.convert.view': ['church.churches.view'],
  'people.disciple.view': ['church.churches.view'],
  'church.worker.view': ['church.churches.view'],
  'church.department.view': ['church.churches.view'],
  'church.small_group.view': ['church.churches.view'],
  'church.evangelism.view': ['church.churches.view'],
  'church.report.view': ['church.churches.view'],
  'church.finance.view': ['church.finance.view', 'church.churches.view', 'finance.payment_intents.view'],
  'church.settings.update': ['church.churches.manage', 'platform.configuration.manage'],
  'kca.dashboard.view': ['kca.enrollments.view', 'kca.applications.view'],
  'kca.application.view': ['kca.applications.view'],
  'kca.application.update': ['kca.applications.transition', 'kca.applications.manage'],
  'kca.student.view': ['kca.enrollments.view'],
  'kca.student.create': ['kca.enrollments.manage'],
  'kca.student.update': ['kca.enrollments.manage'],
  'kca.student.delete': ['kca.enrollments.manage'],
  'kca.cohort.view': ['kca.enrollments.view'],
  'kca.mentor.view': ['kca.enrollments.view'],
  'kca.lecturer.view': ['kca.enrollments.view'],
  'kca.lecturer.assess': ['kca.assessments.record', 'kca.attendance.record', 'kca.evidence.review'],
  'kca.module.view': ['kca.enrollments.view'],
  'kca.learning.view': ['kca.enrollments.view'],
  'kca.assessment.view': ['kca.enrollments.view', 'kca.assessments.view'],
  'kca.assessment.record': ['kca.assessments.record'],
  'kca.certificate.view': ['kca.certificates.view'],
  'kca.alumni.view': ['kca.certificates.view', 'kca.enrollments.view'],
  'kca.year.view': ['kca.enrollments.view'],
  'kca.module.create': ['kca.modules.manage'],
  'kca.module.update': ['kca.modules.manage'],
  'kca.lesson.view': ['kca.enrollments.view'],
  'kca.attendance.view': ['kca.enrollments.view', 'kca.attendance.record'],
  'kca.assignment.view': ['kca.enrollments.view'],
  'kca.evidence.review': ['kca.evidence.review', 'kca.assignments.view'],
  'kca.intervention.view': ['kca.enrollments.view'],
  'mission.dashboard.view': ['mission.crusades.view'],
  'mission.crusade.view': ['mission.crusades.view'],
  'mission.crusade.create': ['mission.crusades.manage'],
  'mission.crusade.update': ['mission.crusades.manage'],
  'mission.invitation.view': ['mission.invitations.manage'],
  'mission.invitation.review': ['mission.invitations.transition'],
  'mission.soul.view': ['mission.souls.view'],
  'mission.soul.create': ['mission.souls.capture'],
  'mission.partner.view': ['mission.crusades.view'],
  'mission.followup.view': ['mission.follow_up.record'],
  'press.dashboard.view': ['press.publications.view'],
  'press.publication.view': ['press.publications.view'],
  'press.publication.create': ['press.publications.manage'],
  'press.publication.update': ['press.publications.manage'],
  'press.author.view': ['press.publications.view'],
  'press.manuscript.view': ['press.publications.view'],
  'press.manuscript.editorial-review.manage': ['press.publications.transition'],
  'press.manuscript.theological-review.manage': ['press.publications.transition'],
  'press.manuscript.copy-editing.manage': ['press.publications.transition'],
  'press.manuscript.design.manage': ['press.publications.transition'],
  'press.manuscript.isbn.manage': ['press.publications.assign_isbn'],
  'press.manuscript.approval.manage': ['press.publications.transition'],
  'press.distribution.view': ['press.publications.view'],
  'press.asset.view': ['press.publications.view', 'platform.files.view'],
  'press.translation.view': ['press.translations.view'],
  'press.translation.review': ['press.translations.transition'],
  'press.sales.view': ['finance.payment_intents.view'],
  'press.analytics.view': ['press.publications.view'],
  'finance.dashboard.view': ['finance.payment_intents.view'],
  'finance.transaction.view': ['finance.payment_transactions.view'],
  'finance.payment.view': ['finance.payment_intents.view'],
  'finance.reconciliation.view': ['finance.payment_reconciliations.view'],
  'finance.receipts.view': ['finance.payment_receipts.view'],
  'finance.refunds.view': ['finance.payment_refunds.view'],
  'finance.disputes.view': ['finance.payment_disputes.view'],
  'finance.providers.view': ['platform.payments.view'],
  'finance.reports.view': ['finance.payment_intents.view'],
  'finance.alerts.view': ['reporting.alert_occurrences.view'],
  'communications.dashboard.view': ['communications.templates.view', 'communications.broadcasts.view', 'platform.communications.view'],
  'communications.notification.view': ['communications.notifications.view'],
  'communications.broadcast.view': ['communications.broadcasts.view'],
  'communications.broadcast.create': ['communications.broadcasts.prepare'],
  'communications.audience.view': ['communications.audiences.view'],
  'communications.audience.create': ['communications.audiences.manage'],
  'communications.template.view': ['communications.templates.view'],
  'communications.delivery.view': ['communications.deliveries.view'],
  'communications.delivery.manage': ['communications.deliveries.attempt', 'communications.deliveries.view'],
  'communications.settings.manage': ['platform.communications.manage', 'platform.communications.view'],
  'communications.announcements.send': ['communications.broadcasts.prepare'],
  'communications.newsletters.send': ['communications.broadcasts.prepare'],
  'communications.email.send': ['communications.broadcasts.prepare'],
  'communications.sms.send': ['communications.broadcasts.prepare'],
  'communications.whatsapp.send': ['communications.broadcasts.prepare'],
  'communications.push.send': ['communications.broadcasts.prepare'],
  'communications.in-app.send': ['communications.broadcasts.prepare'],
  'reports.global.view': ['reporting.alert_rules.view', 'organization.countries.view'],
  'reports.churches.view': ['church.churches.view'],
  'reports.home-churches.view': ['church.home_churches.view'],
  'reports.membership.view': ['church.churches.view'],
  'reports.first-timers.view': ['church.first_timers.view', 'church.churches.view'],
  'reports.evangelism.view': ['church.churches.view'],
  'reports.missions.view': ['mission.crusades.view'],
  'reports.kca.view': ['kca.enrollments.view', 'kca.applications.view'],
  'reports.mentors.view': ['kca.enrollments.view'],
  'reports.press.view': ['press.publications.view'],
  'reports.finance.view': ['finance.payment_intents.view'],
  'reports.countries.view': ['organization.countries.view'],
  'reports.territories.view': ['organization.units.view', 'organization.countries.view'],
  'reports.trends.view': ['reporting.alert_rules.view', 'organization.countries.view'],
  'reports.pastoral-ai.view': ['platform.advisory.request', 'reporting.alert_rules.view', 'church.churches.view'],
  'reports.press-ai.view': ['platform.advisory.request', 'press.publications.view'],
  'security.dashboard.view': ['security.audit.view', 'security.access_decisions.view'],
  'security.login.view': ['identity.security.sessions.view', 'security.audit.view'],
  'security.decision.view': ['security.access_decisions.view'],
  'security.alert.view': ['reporting.alert_occurrences.view', 'security.audit.view'],
  'security.classification.manage': ['platform.configuration.view', 'security.audit.view'],
  'safeguarding.dashboard.view': ['safeguarding.incidents.report', 'security.audit.view'],
  'safeguarding.case.view': ['safeguarding.incidents.report'],
  'safeguarding.case.view_restricted': ['safeguarding.incidents.report'],
  'safeguarding.child.view': ['safeguarding.guardians.register', 'safeguarding.incidents.report'],
  'safeguarding.consent.view': ['safeguarding.guardians.register'],
  'security.restriction.manage': ['safeguarding.guardians.register', 'security.audit.view', 'communications.templates.view'],
  'pastoral.record.view_restricted': ['church.follow_up.complete', 'church.follow_up.view', 'safeguarding.incidents.report'],
  'security.restricted_access.view': ['security.audit.view'],
  'privacy.export.view': ['privacy.data_subject_requests.view'],
  'privacy.deletion.view': ['privacy.data_subject_requests.view'],
  'privacy.request.view': ['privacy.data_subject_requests.view'],
  'security.settings.manage': ['platform.configuration.manage', 'platform.configuration.view'],
  ...SETTINGS_PERMISSION_ALIASES,
  ...GEOGRAPHY_PERMISSION_ALIASES,
};

const ADMINISTRATION_PERMISSION_ALIASES: Record<string, readonly string[]> = {
  'organization.scope.select': ['organization.countries.view', 'identity.scopes.view', 'identity.users.view'],
  'member.self.manage': ['identity.users.view', 'identity.users.manage'],
  'admin.command.use': ['platform.search.query', 'identity.users.view'],
  'approval.queue.view': ['church.home_churches.view', 'reporting.alert_occurrences.view', 'identity.users.view'],
  'alerts.view': ['reporting.alert_occurrences.view'],
  'notifications.view': ['communications.notifications.create', 'member.self.manage', 'identity.users.view'],
  'activity.view': ['security.audit.view'],
  'tasks.view': ['administration.work_items.view', 'church.follow_up.view'],
  'admin.actions.view': ['identity.users.view', 'platform.configuration.view'],
  'identity.user.create': ['identity.users.manage'],
  'identity.user.update': ['identity.users.manage'],
  'identity.role.create': ['identity.roles.manage'],
  'people.member.view': ['identity.users.view'],
  'security.session.view': ['identity.security.sessions.view'],
  'security.impersonation.request': ['security.audit.view'],
  'reports.view': ['organization.countries.view', 'reporting.alert_rules.view'],
};

function hasAliasedPermission(permission: string, granted: string[]): boolean {
  return (DASHBOARD_PERMISSION_ALIASES[permission] ?? ADMINISTRATION_PERMISSION_ALIASES[permission] ?? []).some((code) => granted.includes(code));
}

function safeAdminReturnPath(value: string): string {
  if (!value.startsWith('/admin') || value.startsWith('//') || value.includes('\\')) {
    return '/admin';
  }
  return value;
}

/** Admin login URL used when a guest hits administration. */
export function guestAdminLoginUrl(returnPath = '/admin'): string {
  return `/admin/login?returnTo=${encodeURIComponent(safeAdminReturnPath(returnPath))}`;
}

/**
 * Guests must reach the admin login page — never the member `/login` page,
 * and never the dashboard with an access-denied panel.
 */
export function resolveAdminGuestLoginRedirect(input: {
  authenticated: boolean;
  route: string;
  screenKind: AdminScreen['kind'] | 'index';
  decision: AccessDecision | { allowed: true };
  returnTo?: string;
  scope?: string;
}): string | null {
  if (input.authenticated) return null;
  if (input.screenKind === 'login') return null;

  if (input.screenKind === 'mfa') {
    return guestAdminLoginUrl(input.returnTo ?? '/admin');
  }

  const deniedAsGuest =
    !input.decision.allowed && input.decision.reason === 'unauthenticated';

  if (!deniedAsGuest && input.screenKind !== 'index') {
    return null;
  }

  const returnPath = input.scope
    ? `${input.route}?scope=${encodeURIComponent(input.scope)}`
    : input.route;

  return guestAdminLoginUrl(returnPath);
}
