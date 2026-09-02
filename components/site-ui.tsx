'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api-client';
import type { JsonObject } from '@/lib/api-types';
import type { SiteRoute } from '@/lib/site-routes';
import { isMemberNavActive, memberNavGroups } from '@/lib/site-routes';
import { AppBrand } from './app-brand';
import { useBranding } from './branding-provider';
import { GiveReceiptScreen, GiveRecurringScreen, GiveScreen } from '@/components/give-ui';
import { givingFundToPurpose } from '@/lib/giving-flow';
import {
  LiveAccountCalendar,
  LiveAnnouncementsPage,
  LiveAttendancePage,
  LiveDocumentsPage,
  LiveGivingHistoryPage,
  LiveGroupsPage,
  LiveHomeChurchApplicationPage,
  LiveJourneyPage,
  LiveMinistriesPage,
  LiveMissionMemberPage,
  LiveMyChurchPage,
  LiveMyEventsPage,
  LiveMyHomeChurchPage,
  LiveSpiritualGrowthPage,
  LiveTestimoniesPage,
  MemberHomePage,
} from '@/components/member-pages';
import { useAuth } from '@/components/auth-provider';
import { AuthScreen, MemberLogoutButton } from '@/components/auth-ui';
import { InteractiveMap, type MapMarker } from '@/components/interactive-map';
import { BibleExperience } from '@/components/bible-ui';
import { useLocale } from '@/components/locale-provider';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { localeMeta, supportedLocales, type TranslateOptions } from '@/lib/i18n/types.ts';
import { translateRouteCopy } from '@/lib/i18n.ts';
import {
  formFieldsFor,
  globalMetrics,
  kcaAssignments,
  kcaModules,
  listingFor,
  pillars,
  schedule,
  sectionCards,
  sermons,
  type ContentCard,
  type EventItem,
  type FaqItem,
  type FormField,
  type Metric,
} from '@/lib/site-content';
import {
  clearHomeChurchDraft,
  cmsListingLoader,
  composeHomeChurchName,
  designFixturesEnabled,
  draftToHomeChurchPayload,
  FAMILY_HOUSE_HOME_CHURCH_PREFIX,
  loadAboutPage,
  loadCmsPageMeta,
  loadCmsPageCards,
  loadChurch,
  loadChurches,
  loadCrusade,
  loadCrusades,
  loadEvent,
  loadEvents,
  loadFaqs,
  loadHealth,
  loadHomeMarketing,
  loadMapDestination,
  loadMissionLocations,
  loadOnlineChurchContent,
  loadPressPublication,
  loadPressPublications,
  loadDevotionalPublications,
  loadSectionLandingCards,
  loadSermons,
  pathEntityId,
  PUBLIC_CONTACT_INBOX_UNAVAILABLE_MESSAGE,
  publicErrorMessage,
  readHomeChurchDraft,
  submitHomeChurchApplication,
  verifyKcaCertificate,
  writeHomeChurchDraft,
} from '@/lib/site-api';
import {
  createGivingIntent,
  createUserMessageConversation,
  createUserNeed,
  createUserPrayer,
  DATA_SUBJECT_REQUEST_TYPES,
  displayNameFromUser,
  downloadPressPublication,
  downloadUserFile,
  EVENT_TICKET_UNAVAILABLE_MESSAGE,
  fetchCurrentUser,
  fetchEventTicket,
  fetchKcaAssignments,
  fetchKcaAttendance,
  fetchKcaDashboard,
  fetchKcaMe,
  fetchKcaCurrentApplication,
  fetchKcaMentor,
  fetchKcaModule,
  fetchKcaModules,
  fetchKcaLesson,
  fetchKcaAssignment,
  fetchKcaChapter,
  fetchKcaMentees,
  fetchKcaMentee,
  completeKcaChapter,
  createKcaStudyNote,
  recordKcaSoulWin,
  fetchKcaOrientation,
  completeKcaOrientationStage,
  completeKcaOrientation,
  fetchKcaPracticalService,
  fetchKcaDirectory,
  submitKcaEvidence,
  downloadKcaCertificatePdf,
  completeKcaLesson,
  type KcaLessonDetail,
  type KcaChapterSummary,
  fetchUserConsents,
  fetchUserConversationMessages,
  fetchUserDevices,
  fetchUserFiles,
  fetchUserMessageConversations,
  fetchUserNeeds,
  fetchUserNotifications,
  fetchUserPaymentIntents,
  fetchUserPaymentReceipt,
  fetchUserPaymentTransactions,
  fetchUserPrayers,
  fetchUserSecuritySessions,
  fetchUserSyncChanges,
  fetchUserSyncCheckpoint,
  formatMoneyMinor,
  formatUserApiError,
  GIVING_CHECKOUT_UNAVAILABLE_MESSAGE,
  grantUserConsent,
  initialsFromUser,
  isLocalManualGivingProvider,
  isPaymentGovernanceDenied,
  isRecentMfaRequiredError,
  markUserNotificationRead,
  PAYMENT_GOVERNANCE_DENIED_MESSAGE,
  recordEventFeedback,
  registerForEvent,
  requestChurchMembership,
  requestHomeChurchMembership,
  revokeUserDevice,
  revokeUserSecuritySession,
  sendUserConversationMessage,
  storeUserFile,
  submitKcaApplication,
  submitMissionInvitation,
  submitMissionSupportRequest,
  submitUserDataSubjectRequest,
  updateUserProfile,
  updateUserPreferences,
  updateUserSyncCheckpoint,
  withdrawUserConsent,
  type CurrentUser,
  type DataSubjectRequestType,
  type EventTicket,
  type KcaAssignmentSummary,
  type KcaDashboard,

  type KcaAccess,
  type KcaModuleSummary,
  type UserConsent,
  type UserDevice,
  type UserFileAsset,
  type UserMessage,
  type UserMessageConversation,
  type UserNotification,
  type UserPaymentIntent,
  type UserPreferences,
  type UserPrayer,
  type UserSecuritySession,
  type UserSyncChange,
} from '@/lib/user-api';
import { flowNext, successHref, heroPrimaryHref, kcaApplySteps, homeChurchSteps } from '@/lib/site-flow';
import { kcaHrefForDestination, kcaIsActivatedStudent, kcaPrimaryCta } from '@/lib/kca-access';
import { LiveWatchExperience } from '@/components/live-watch';
import { fetchCurrentLivestream } from '@/lib/livestream-api';
import { SearchSelect } from '@/components/search-select';
import { GeographySelect } from '@/components/geography-select';

type AsyncListState<T> =
  | { status: 'loading' }
  | { status: 'ready'; items: T[] }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string };

function DataStatus({ state, emptyLabel = 'Nothing to show yet.' }: { state: AsyncListState<unknown>; emptyLabel?: string }) {
  const { t } = useLocale();
  if (state.status === 'loading') return <p className="panel">{t('common.loading', { defaultMessage: 'Loading…' })}</p>;
  if (state.status === 'error') return <p className="panel">{state.message}</p>;
  if (state.status === 'empty') return <p className="panel">{state.message || emptyLabel}</p>;
  return null;
}

function useAsyncList<T>(loader: () => Promise<{ data: T[] }>, deps: unknown[] = []): AsyncListState<T> {
  const [state, setState] = useState<AsyncListState<T>>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void loader()
      .then((result) => {
        if (cancelled) return;
        if (!result.data.length) setState({ status: 'empty', message: 'No published items yet.' });
        else setState({ status: 'ready', items: result.data });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', message: publicErrorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}

function useFixtures(): boolean {
  return designFixturesEnabled();
}

const EVENT_REGISTRATION_STORAGE = 'fhc.event-registration.';
const FILE_CLASSIFICATIONS = ['public', 'internal', 'confidential', 'restricted'] as const;
const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

function queryParam(name: string): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get(name)?.trim() ?? '';
}

function rememberEventRegistration(eventId: string, registrationId: string) {
  if (typeof window === 'undefined' || !eventId || !registrationId) return;
  try {
    window.sessionStorage.setItem(`${EVENT_REGISTRATION_STORAGE}${eventId}`, registrationId);
  } catch {
    /* ignore quota / private mode */
  }
}

function readRememberedEventRegistration(eventId: string): string {
  if (typeof window === 'undefined' || !eventId) return '';
  try {
    return window.sessionStorage.getItem(`${EVENT_REGISTRATION_STORAGE}${eventId}`) ?? '';
  } catch {
    return '';
  }
}

function parseEventFeedbackRating(raw: string): number | null {
  const match = raw.trim().match(/^([1-5])/);
  if (!match) return null;
  const rating = Number(match[1]);
  return rating >= 1 && rating <= 5 ? rating : null;
}

function newClientKey(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formFieldsForRoute(path: string): FormField[] {
  const fields = formFieldsFor(path);
  const withoutFixtureValues = (items: FormField[]) =>
    designFixturesEnabled() ? items : items.map(({ value: _value, ...rest }) => rest);

  if (path.includes('/join-church')) {
    return withoutFixtureValues([
      { label: 'Church', name: 'church_id', type: 'search-select', catalog: 'church', wide: true },
      { label: 'Home church (optional)', name: 'home_church_id', type: 'search-select', catalog: 'homeChurch' },
    ]);
  }
  if (path.includes('/events/') && path.includes('/feedback')) {
    return withoutFixtureValues([
      { label: 'Registration ID', name: 'registration_id', wide: true },
      ...fields,
    ]);
  }
  return withoutFixtureValues(fields);
}

function emptyListingMessage(path: string): string {
  if (path.includes('/mission/partners')) return 'No partners published yet.';
  if (path.includes('/mission/projects')) return 'No projects published yet.';
  if (path.includes('/mission/stories')) return 'No stories published yet.';
  if (path.includes('/online-church/sermons')) return 'No sermons published yet.';
  if (path.includes('/churches') || path.includes('/find-church') || path.includes('/home-churches')) {
    return 'No published churches yet.';
  }
  if (path.includes('/events')) return 'No events published yet.';
  if (path.includes('/press')) return 'No publications yet.';
  if (path.includes('/account/kca')) return 'KCA learning data is not available yet.';
  if (path.includes('/account/giving') || path.includes('/account/prayer') || path.includes('/account/need')) {
    return 'Nothing to show yet.';
  }
  if (path.includes('/account/messages')) return 'No conversations yet.';
  if (path.includes('/account/notifications')) return 'No notifications yet.';
  return 'No published items yet.';
}

const nav = [
  ['nav.home', 'Home', '/'],
  ['nav.church', 'Church', '/church'],
  ['nav.mission', 'Mission', '/mission'],
  ['nav.kca', 'KCA', '/kca'],
  ['nav.press', 'Press', '/press'],
  ['nav.online', 'Online', '/online-church'],
  ['nav.bible', 'Bible', '/bible'],
  ['nav.events', 'Events', '/events'],
  ['nav.give', 'Give', '/give'],
] as const;

const memberGroupKeys: Record<string, string> = {
  Overview: 'member.overview',
  Belong: 'member.belong',
  Gather: 'member.gather',
  Care: 'member.care',
  Steward: 'member.steward',
  Account: 'member.account',
};

const memberItemKeys: Record<string, string> = {
  '/account': 'member.dashboard',
  '/account/journey': 'member.myJourney',
  '/account/church': 'member.myChurch',
  '/account/home-church': 'member.homeChurch',
  '/account/groups': 'member.groups',
  '/account/announcements': 'member.announcements',
  '/account/documents': 'member.documents',
  '/account/kca': 'member.kca',
  '/account/events': 'member.events',
  '/account/calendar': 'member.calendar',
  '/bible': 'member.bible',
  '/account/prayer-requests': 'member.prayer',
  '/account/need-requests': 'member.needs',
  '/account/giving': 'member.giving',
  '/account/mission/invitations': 'member.mission',
  '/account/messages': 'member.messages',
  '/account/notifications': 'member.notifications',
  '/account/downloads': 'member.downloads',
  '/account/settings': 'member.settings',
};

function Logo() {
  return <AppBrand variant="site" href="/" />;
}

function BrandName() {
  const { app_name } = useBranding();
  return <>{app_name}</>;
}

function Header({ path }: { path: string }) {
  const pathname = path;
  const fixtures = useFixtures();
  const { t } = useLocale();
  const { user, ready } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const signedIn = Boolean(user) && !fixtures;
  const initials = user ? initialsFromUser(user) : '';

  return (
    <header className={`site-header${menuOpen ? ' menu-open' : ''}`}>
      <Logo />
      <button
        className="nav-toggle"
        type="button"
        aria-label={menuOpen ? t('common.closeMenu', { defaultMessage: 'Close menu' }) : t('common.openMenu', { defaultMessage: 'Open menu' })}
        aria-expanded={menuOpen}
        aria-controls="site-primary-nav"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <nav id="site-primary-nav">
        {nav.map(([key, fallback, href]) => (
          <Link className={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'active' : ''} href={href} key={href}>
            {t(key, { defaultMessage: fallback })}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link href="/search" aria-label={t('nav.search', { defaultMessage: 'Search' })}>
          ⌕
        </Link>
        <LocaleSwitcher />
        {!ready && !fixtures ? null : signedIn ? (
          <Link className="avatar" href="/account" aria-label={`${user ? displayNameFromUser(user) : t('nav.account', { defaultMessage: 'Account' })}`}>
            {initials}
          </Link>
        ) : (
          <>
            <Link className="site-button secondary small" href="/register">
              {t('common.register', { defaultMessage: 'Register' })}
            </Link>
            <Link className="site-button small" href="/login">
              {t('common.signIn', { defaultMessage: 'Sign In' })}
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname() ?? '';
  const fixtures = useFixtures();
  const { t } = useLocale();
  const { user } = useAuth();

  const name = fixtures ? 'John Doe' : displayNameFromUser(user);
  const initials = fixtures ? 'JD' : initialsFromUser(user);
  const email = fixtures ? 'john.doe@email.com' : (user?.email ?? '');

  return (
    <aside className="member-sidebar">
      <AppBrand variant="member" />
      <div className="member-person">
        <span className="avatar big">{initials}</span>
        <div>
          <b>{name}</b>
          {email ? <small>{email}</small> : null}
          <Link href="/account/profile">{t('member.viewProfile', { defaultMessage: 'View profile' })}</Link>
        </div>
      </div>
      <nav aria-label={t('member.navAria', { defaultMessage: 'Member' })}>
        {memberNavGroups.map((group) => (
          <div className="member-nav-group" key={group.label}>
            <p className="member-nav-label">{t(memberGroupKeys[group.label] ?? group.label, { defaultMessage: group.label })}</p>
            {group.items.map((item) => (
              <Link
                className={`member-nav-link${isMemberNavActive(pathname, item.href) ? ' active' : ''}`}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true">{item.icon}</span>
                {t(memberItemKeys[item.href] ?? item.label, { defaultMessage: item.label })}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <MemberLogoutButton />
    </aside>
  );
}

function homeChurchStepLabel(t: (key: string, options?: TranslateOptions) => string, label: string) {
  const keys: Record<string, string> = {
    Eligibility: 'homeChurch.eligibility',
    Overview: 'homeChurch.overview',
    Location: 'common.location',
    Personal: 'homeChurch.personal',
    Meeting: 'homeChurch.meeting',
    Participants: 'homeChurch.participants',
    Motivation: 'homeChurch.motivation',
    Contact: 'homeChurch.contact',
    Commitment: 'homeChurch.commitment',
    Review: 'homeChurch.review',
  };
  return t(keys[label] ?? `homeChurch.${label}`, { defaultMessage: label });
}

function HomeChurchApplicationSidebar({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const applicationSteps: ReadonlyArray<readonly [string, string]> = [
    ['/start-home-church/eligibility', 'Eligibility'],
    ...homeChurchSteps,
  ];
  const currentIndex = applicationSteps.findIndex(([path]) => path === route.path);

  return (
    <aside className="workflow-sidebar" aria-label={t('homeChurch.application', { defaultMessage: 'Home Church application' })}>
      <AppBrand variant="member" />
      <div className="workflow-sidebar-intro">
        <span className="eyebrow">{t('homeChurch.application', { defaultMessage: 'Home Church application' })}</span>
        <b>{t('homeChurch.applicationProgress', { defaultMessage: 'Application progress' })}</b>
        <small>{t('homeChurch.completeSteps', { defaultMessage: 'Complete each step to submit your request for pastoral review.' })}</small>
      </div>
      <nav>
        <Link className={route.path === '/start-home-church' ? 'active' : ''} href="/start-home-church">
          <span>⌂</span> {t('homeChurch.overview', { defaultMessage: 'Overview' })}
        </Link>
        {applicationSteps.map(([path, label], index) => (
          <Link className={path === route.path ? 'active' : ''} href={path} key={path}>
            <span>{index < currentIndex ? '✓' : index + 1}</span> {homeChurchStepLabel(t, label)}
          </Link>
        ))}
      </nav>
      <Link className="workflow-sidebar-help" href="/contact">
        {t('homeChurch.needHelp', { defaultMessage: 'Need help? Contact us' })}
      </Link>
    </aside>
  );
}

function Progress({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  if (route.surface === 'auth' || route.surface !== 'workflow') return null;

  const homeChurch = route.path.includes('/start-home-church/apply');
  const kca = route.path.includes('/kca/apply');
  const steps = homeChurch ? homeChurchSteps : kca ? kcaApplySteps : null;
  if (!steps) return null;

  const resolvedIndex = Math.max(
    0,
    steps.findIndex(([path]) => path === route.path),
  );

  return (
    <div className="workflow-progress">
      {steps.map(([path, label], i) => (
        <div className={i <= resolvedIndex ? 'done' : ''} key={path}>
          <span>{i < resolvedIndex ? '✓' : i + 1}</span>
          <small>{homeChurch ? homeChurchStepLabel(t, label) : label}</small>
        </div>
      ))}
    </div>
  );
}

function Metrics({ items }: { items?: Metric[] }) {
  const rows = items ?? (useFixtures() ? globalMetrics : []);
  if (!rows.length) return null;
  return (
    <div className="metric-grid">
      {rows.map((item) => (
        <article key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
          {item.change ? <em>{item.change}</em> : null}
        </article>
      ))}
    </div>
  );
}

function cmsSlugForRoute(route: SiteRoute): string | null {
  if (route.path === '/') return 'home';
  if (route.path === '/about') return 'about';
  if (route.path === '/vision' || route.path === '/global-mission' || route.path === '/global-journey') return 'vision';
  if (route.path === '/find-church') return 'church';
  if (route.path === '/prayer') return 'church';
  if (route.path === '/kca/gate') return 'kca';
  const slugs: Record<string, string> = {
    Church: 'church',
    Mission: 'mission',
    KCA: 'kca',
    Giving: 'giving',
    Online: 'online-church',
    Press: 'press',
    Events: 'events',
  };
  return slugs[route.section] ?? null;
}

function useCmsPageMeta(slug: string | null) {
  const fixtures = useFixtures();
  const [meta, setMeta] = useState<{ title: string | null; summary: string | null; imageUrl: string | null }>({
    title: null,
    summary: null,
    imageUrl: null,
  });
  useEffect(() => {
    if (fixtures || !slug) {
      setMeta({ title: null, summary: null, imageUrl: null });
      return;
    }
    let cancelled = false;
    void loadCmsPageMeta(slug)
      .then((next) => {
        if (!cancelled) setMeta(next);
      })
      .catch(() => {
        if (!cancelled) setMeta({ title: null, summary: null, imageUrl: null });
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures, slug]);
  return meta;
}

function useCmsHeroImage(slug: string | null) {
  return useCmsPageMeta(slug).imageUrl;
}

function DetailArt({ image, icon }: { image?: string; icon?: string }) {
  return (
    <div
      className={`detail-hero-art${image ? ' has-image' : ''}`}
      aria-hidden="true"
      style={image ? { backgroundImage: `url('${image}')` } : undefined}
    >
      {image ? null : <span>{icon ?? '✦'}</span>}
    </div>
  );
}

function CardGrid({ cards, columns = 4 }: { cards: ContentCard[]; columns?: number }) {
  const { t } = useLocale();
  return (
    <section className={`site-cards cols-${columns}`}>
      {cards.map((card) => (
        <article key={`${card.title}-${card.href}`}>
          {card.image ? (
            <div className="card-image-wrap">
              <img className="card-image" src={card.image} alt="" />
            </div>
          ) : (
            <span className="card-icon">{card.icon ?? '✦'}</span>
          )}
          <h3>{card.title}</h3>
          <p>{card.body}</p>
          {card.meta && !card.meta.trim().startsWith('{') ? <small className="card-meta">{card.meta}</small> : null}
          <Link href={card.href}>{card.action ? `${card.action} →` : t('common.explore', { defaultMessage: 'Explore →' })}</Link>
        </article>
      ))}
    </section>
  );
}

function BannerCta({ title, body, action, href }: { title: string; body: string; action: string; href: string }) {
  return (
    <section className="site-banner-cta">
      <div>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <Link className="site-button" href={href}>
        {action}
      </Link>
    </section>
  );
}

function Hero({
  route,
  imageUrl,
  title,
  subtitle,
}: {
  route: SiteRoute;
  imageUrl?: string | null;
  title?: string | null;
  subtitle?: string | null;
}) {
  const { t } = useLocale();
  const secondaryHref =
    route.section === 'KCA'
      ? '/kca/why'
      : route.section === 'Mission'
        ? '/mission/impact'
        : route.section === 'Church'
          ? '/start-home-church'
          : route.section === 'Press'
            ? '/online-church/sermons'
            : route.section === 'Events'
              ? '/account/calendar'
              : '/about';
  const secondaryLabel =
    route.section === 'KCA'
      ? t('landing.whyJoinKca', { defaultMessage: 'Why Join KCA?' })
      : route.section === 'Mission'
        ? t('landing.exploreMissions', { defaultMessage: 'Explore Missions' })
        : route.section === 'Church'
          ? t('landing.startHomeChurch', { defaultMessage: 'Start a Home Church' })
          : route.section === 'Press'
            ? t('landing.browseSermons', { defaultMessage: 'Browse Sermons' })
            : route.section === 'Events'
              ? t('landing.openCalendar', { defaultMessage: 'Open Calendar' })
              : t('common.learnMore', { defaultMessage: 'Learn More' });
  const primaryHref = heroPrimaryHref(route.path, route.section, route.action);
  return (
    <section className={`site-hero hero-${route.section.toLowerCase()}`}>
      <div>
        <span className="eyebrow"><BrandName /></span>
        <h1>{title || t(`routes.${route.path}`, { defaultMessage: route.title })}</h1>
        <p>{subtitle || t(`sections.${route.section}`, { defaultMessage: route.subtitle })}</p>
        <div className="hero-actions">
          <Link className="site-button" href={primaryHref}>
            {route.action ? t(`routes.action.${route.path}`, { defaultMessage: route.action }) : t('landing.exploreFamilyHouse', { defaultMessage: 'Explore Family House' })}
          </Link>
          <Link className="site-button secondary" href={secondaryHref}>
            {secondaryLabel}
          </Link>
        </div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div
          className="hero-visual-frame"
          style={imageUrl ? { backgroundImage: `linear-gradient(160deg,#1a1040aa,#1a104066), url('${imageUrl}')` } : undefined}
        >
          <span>✦</span>
          <b>{route.section === 'Home' ? t('landing.faithFamilyPurpose', { defaultMessage: 'Faith · Family · Purpose' }) : t(`sectionLabel.${route.section}`, { defaultMessage: route.section })}</b>
          <small>{t('landing.oneFamilyOneMission', { defaultMessage: 'One Family. One Mission.' })}</small>
        </div>
      </div>
    </section>
  );
}

function HomeLanding({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const fixtures = useFixtures();
  const [state, setState] = useState<AsyncListState<ContentCard>>({ status: 'loading' });
  const [metrics, setMetrics] = useState<Metric[]>(fixtures ? globalMetrics : []);
  const [pillarsCards, setPillars] = useState<ContentCard[]>(fixtures ? pillars : []);
  const [actionCards, setActions] = useState<ContentCard[]>(fixtures ? sectionCards.Home : []);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState<string | null>(null);
  const [heroSummary, setHeroSummary] = useState<string | null>(null);
  const [pillarHeading, setPillarHeading] = useState<{ eyebrow: string; title: string } | null>(null);
  const [actionHeading, setActionHeading] = useState<{ eyebrow: string; title: string } | null>(null);

  useEffect(() => {
    if (fixtures) {
      setState({ status: 'ready', items: pillars });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    void loadHealth().catch(() => undefined);
    void loadHomeMarketing()
      .then((result) => {
        if (cancelled) return;
        setMetrics(result.metrics);
        setPillars(result.pillars);
        setActions(result.actions.length ? result.actions : result.pillars);
        setHeroImage(result.heroImage ?? null);
        setHeroTitle(result.title ?? null);
        setHeroSummary(result.summary ?? null);
        setPillarHeading(result.pillarHeading ?? null);
        setActionHeading(result.actionHeading ?? null);
        if (!result.metrics.length && !result.pillars.length && !result.actions.length) {
          setState({ status: 'empty', message: 'Home content is not published yet.' });
        } else {
          setState({ status: 'ready', items: result.pillars });
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', message: publicErrorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures]);

  return (
    <>
      <Hero route={route} imageUrl={heroImage} title={heroTitle} subtitle={heroSummary} />
      {state.status === 'loading' || state.status === 'error' || state.status === 'empty' ? (
        <DataStatus state={state} emptyLabel={t('landing.homeNotPublished', { defaultMessage: 'Home content is not published yet.' })} />
      ) : null}
      {state.status === 'ready' || fixtures ? (
        <>
          <Metrics items={metrics} />
          <div className="section-block">
            <div className="section-heading">
              <span className="eyebrow">{pillarHeading?.eyebrow || t('landing.fourPillars', { defaultMessage: 'Our Four Pillars' })}</span>
              <h2>{pillarHeading?.title || t('landing.pillarsHeading', { defaultMessage: 'Everything you need to belong, grow, and multiply' })}</h2>
            </div>
            {pillarsCards.length ? <CardGrid cards={pillarsCards} /> : <p className="panel">{t('landing.noPillarCards', { defaultMessage: 'No pillar cards published yet.' })}</p>}
          </div>
          <div className="section-block">
            <div className="section-heading">
              <span className="eyebrow">{actionHeading?.eyebrow || t('landing.getStarted', { defaultMessage: 'Get Started' })}</span>
              <h2>{actionHeading?.title || t('landing.nextKingdomStep', { defaultMessage: 'Take your next Kingdom step' })}</h2>
            </div>
            {actionCards.length ? <CardGrid cards={actionCards} /> : <p className="panel">{t('landing.noGetStartedCards', { defaultMessage: 'No get-started cards published yet.' })}</p>}
          </div>
        </>
      ) : null}
      <BannerCta
        title={t('landing.findYourPlace', { defaultMessage: 'Ready to find your place in the family?' })}
        body={t('landing.findChurchCta', { defaultMessage: 'Search churches near you or join Online Church today.' })}
        action={t('landing.findAChurch', { defaultMessage: 'Find a Church' })}
        href="/find-church"
      />
    </>
  );
}

function AboutLanding({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const fixtures = useFixtures();
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState<string | null>(null);
  const [heroSubtitle, setHeroSubtitle] = useState<string | null>(null);
  const [state, setState] = useState<AsyncListState<ContentCard>>(
    fixtures ? { status: 'ready', items: [] } : { status: 'loading' },
  );
  const [summary, setSummary] = useState(
    fixtures
      ? 'Family House Connect unites local churches, home fellowships, online gatherings, missions, and Kingdom training into one connected experience. We exist so every believer can find community, grow in Jesus Christ, serve with purpose, and multiply disciples.'
      : '',
  );
  const [cards, setCards] = useState<ContentCard[]>(
    fixtures
      ? [
          { title: 'Build', body: 'Plant and strengthen churches that love God and people.', href: '/church', icon: '🏛' },
          { title: 'Equip', body: 'Train believers through KCA and practical ministry.', href: '/kca', icon: '🎓' },
          { title: 'Send', body: 'Mobilize teams for crusades, outreach, and compassion.', href: '/mission', icon: '🚀' },
          { title: 'Multiply', body: 'Raise disciples who raise disciples in every place.', href: '/global-journey', icon: '🌱' },
        ]
      : [],
  );

  useEffect(() => {
    if (fixtures) return;
    let cancelled = false;
    setState({ status: 'loading' });
    void loadAboutPage()
      .then((result) => {
        if (cancelled) return;
        const body = result.data?.body || result.data?.summary || '';
        setSummary(body);
        setHeroImage(result.data?.image_url ?? null);
        setHeroTitle(result.data?.title ?? null);
        setHeroSubtitle(result.data?.summary ?? null);
        setCards(result.cards);
        if (!body && !result.cards.length) setState({ status: 'empty', message: 'About content is not published yet.' });
        else setState({ status: 'ready', items: result.cards });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', message: publicErrorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures]);

  return (
    <>
      <Hero route={route} imageUrl={heroImage} title={heroTitle} subtitle={heroSubtitle} />
      <DataStatus state={state.status === 'ready' ? { status: 'ready', items: cards } : state} emptyLabel={t('landing.aboutNotPublished', { defaultMessage: 'About content is not published yet.' })} />
      {state.status === 'ready' || fixtures ? (
        <>
          <div className="split-panel">
            <section className="panel prose-panel">
              <span className="eyebrow">{t('landing.whoWeAre', { defaultMessage: 'Who We Are' })}</span>
              <h2>{route.title || t('landing.aboutHeading', { defaultMessage: 'A global family advancing the Kingdom together' })}</h2>
              <p>{summary || t('landing.aboutPlaceholder', { defaultMessage: 'About content will appear here when published.' })}</p>
              {fixtures ? (
                <ul className="check-list">
                  <li>{t('landing.aboutBulletCommunity', { defaultMessage: 'Biblical community across nations' })}</li>
                  <li>{t('landing.aboutBulletDiscipleship', { defaultMessage: 'Discipleship pathways for every season' })}</li>
                  <li>{t('landing.aboutBulletMission', { defaultMessage: 'Mission and compassion that transform lives' })}</li>
                  <li>{t('landing.aboutBulletTraining', { defaultMessage: 'Training that equips Kingdom change agents' })}</li>
                </ul>
              ) : null}
            </section>
            <aside className="panel identity-card">
              <h3>{t('landing.ourIdentity', { defaultMessage: 'Our Identity' })}</h3>
              {[
                t('landing.oneFamily', { defaultMessage: 'One Family' }),
                t('landing.oneFaith', { defaultMessage: 'One Faith' }),
                t('landing.oneMission', { defaultMessage: 'One Mission' }),
                t('landing.everyNation', { defaultMessage: 'Every Nation' }),
              ].map((item) => (
                <div key={item}>
                  <b>{item}</b>
                  <small>{t('landing.identityCopy', { defaultMessage: 'Rooted in Christ and expressed through local and global ministry.' })}</small>
                </div>
              ))}
            </aside>
          </div>
          {cards.length ? <CardGrid cards={cards} /> : null}
        </>
      ) : null}
    </>
  );
}

function VisionLanding({ route }: { route: SiteRoute }) {
  const fixtures = useFixtures();
  const cms = useCmsPageMeta('vision');
  const [summary, setSummary] = useState(
    fixtures
      ? 'A world where every household can encounter Christ, belong to a Family House, and multiply Kingdom impact.'
      : '',
  );
  const [cards, setCards] = useState<ContentCard[]>(
    fixtures
      ? [
          { title: 'Belong', body: 'Churches and home churches that make family real.', href: '/church', icon: '⛪' },
          { title: 'Grow', body: 'KCA, sermons, and pastoral care that form disciples.', href: '/kca/gate', icon: '🎓' },
          { title: 'Send', body: 'Missions and compassion that reach the lost.', href: '/mission', icon: '🌍' },
        ]
      : [],
  );

  useEffect(() => {
    if (fixtures) return;
    let cancelled = false;
    void loadCmsPageCards('vision', ['card', 'pillar'])
      .then((result) => {
        if (cancelled) return;
        setCards(result.data);
        if (result.page?.body || result.page?.summary) {
          setSummary(result.page.body || result.page.summary || '');
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [fixtures]);

  return (
    <>
      <Hero route={route} imageUrl={cms.imageUrl} title={cms.title} subtitle={cms.summary} />
      <div className="split-panel">
        <section className="panel">
          <h3>Our Vision</h3>
          <p>{summary || 'Vision content will appear here when published in the CMS.'}</p>
        </section>
        <section className="panel">
          <h3>Our Mission</h3>
          <p>To connect, disciple, and send believers through church, mission, training, and Spirit-filled resources.</p>
        </section>
      </div>
      {cards.length ? <CardGrid cards={cards} columns={3} /> : null}
      <blockquote className="verse-banner">
        <p>“Go ye therefore, and teach all nations…”</p>
        <cite>Matthew 28:19</cite>
      </blockquote>
      <Metrics />
      <InteractiveMap height={360} className="map-art-interactive" />
    </>
  );
}

function ContactLanding() {
  return (
    <div className="split-panel contact-layout">
      <section className="panel">
        <span className="eyebrow">Get in Touch</span>
        <h2>We would love to hear from you</h2>
        <div className="contact-details">
          <div>
            <b>Headquarters</b>
            <small>12 Adeniyi Jones Avenue, Ikeja, Lagos, Nigeria</small>
          </div>
          <div>
            <b>Email</b>
            <small>hello@familyhouseconnect.org</small>
          </div>
          <div>
            <b>Phone</b>
            <small>+234 801 000 2244</small>
          </div>
          <div>
            <b>Office Hours</b>
            <small>Mon–Fri · 9:00 AM – 5:00 PM WAT</small>
          </div>
        </div>
      </section>
      <FormScreen
        route={{
          path: '/contact',
          title: 'Contact Us',
          subtitle: 'Send Message',
          surface: 'public',
          kind: 'form',
          section: 'Home',
          action: 'Send Message',
        }}
      />
    </div>
  );
}

function FaqLanding() {
  const { t } = useLocale();
  const [open, setOpen] = useState(0);
  const [query, setQuery] = useState('');
  const faqState = useAsyncList(() => loadFaqs(), []);
  const rows = faqState.status === 'ready' ? faqState.items : [];
  const filtered = rows.filter((item) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q);
  });

  return (
    <div className="faq-layout">
      <div className="toolbar">
        <input
          aria-label={t('common.search', { defaultMessage: 'Search' })}
          placeholder="Search frequently asked questions..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="site-button" type="button" onClick={() => setOpen(0)}>
          {t('common.search', { defaultMessage: 'Search' })}
        </button>
      </div>
      <DataStatus state={faqState} emptyLabel="No FAQs published yet." />
      <div className="faq-list">
        {filtered.map((item, index) => (
          <button className={`faq-item ${open === index ? 'open' : ''}`} key={item.q} onClick={() => setOpen(index)} type="button">
            <span>
              <b>{item.q}</b>
              {open === index ? <p>{item.a}</p> : null}
            </span>
            <em>{open === index ? '−' : '+'}</em>
          </button>
        ))}
        {faqState.status === 'ready' && filtered.length === 0 ? <p className="panel">No FAQs match your search.</p> : null}
      </div>
    </div>
  );
}

function SearchLanding() {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [applied, setApplied] = useState('');
  const churchesState = useAsyncList(() => loadChurches({ per_page: 50 }), []);
  const eventsState = useAsyncList(() => loadEvents({ per_page: 50 }), []);
  const pressState = useAsyncList(() => loadPressPublications({ per_page: 50 }), []);
  const faqState = useAsyncList(() => loadFaqs(), []);
  const sermonsState = useAsyncList(() => loadSermons(), []);

  const results = useMemo(() => {
    const q = applied.trim().toLowerCase();
    const churchHits =
      churchesState.status === 'ready'
        ? churchesState.items.filter((item) => !q || item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q))
        : [];
    const eventHits =
      eventsState.status === 'ready'
        ? eventsState.items.filter((item) => !q || item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q))
        : [];
    const pressHits =
      pressState.status === 'ready'
        ? pressState.items.filter((item) => !q || item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q))
        : [];
    const faqHits =
      faqState.status === 'ready'
        ? faqState.items.filter((item) => !q || item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q))
        : [];
    const sermonHits =
      sermonsState.status === 'ready'
        ? sermonsState.items.filter((item) => !q || item.title.toLowerCase().includes(q) || item.body.toLowerCase().includes(q))
        : [];

    if (category === 'Churches') return churchHits.map((item) => ({ ...item, kind: 'Church' }));
    if (category === 'Events') return eventHits.map((item) => ({ ...item, kind: 'Event' }));
    if (category === 'Mission') return eventHits.filter((item) => (item.meta ?? '').toLowerCase().includes('mission')).map((item) => ({ ...item, kind: 'Mission' }));
    if (category === 'KCA') return faqHits.filter((item) => item.q.toLowerCase().includes('kca')).map((item) => ({ title: item.q, body: item.a, href: '/kca', status: 'FAQ', icon: '?', kind: 'KCA' }));
    if (category === 'Press') return pressHits.map((item) => ({ ...item, kind: 'Press' }));

    return [
      ...churchHits.map((item) => ({ ...item, kind: 'Church' })),
      ...eventHits.slice(0, 3).map((item) => ({ ...item, kind: 'Event' })),
      ...pressHits.slice(0, 2).map((item) => ({ ...item, kind: 'Press' })),
      ...sermonHits.slice(0, 2).map((item) => ({ ...item, kind: 'Sermon' })),
      ...faqHits.slice(0, 2).map((item) => ({ title: item.q, body: item.a, href: '/faq', status: 'FAQ', icon: '?', kind: 'FAQ' })),
    ];
  }, [applied, category, churchesState, eventsState, pressState, faqState, sermonsState]);

  const catalogueLoading =
    churchesState.status === 'loading' ||
    eventsState.status === 'loading' ||
    pressState.status === 'loading';
  const catalogueError =
    churchesState.status === 'error'
      ? churchesState.message
      : eventsState.status === 'error'
        ? eventsState.message
        : pressState.status === 'error'
          ? pressState.message
          : null;
  const catalogueReady =
    churchesState.status === 'ready' && eventsState.status === 'ready' && pressState.status === 'ready';

  return (
    <div className="search-layout">
      <div className="search-hero panel">
        <span className="search-orb">⌕</span>
        <h2>Search Family House</h2>
        <p>Find churches, events, sermons, missions, and resources.</p>
        <div className="toolbar">
          <input
            aria-label={t('nav.search', { defaultMessage: 'Search' })}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search churches, events, sermons..."
          />
          <button className="site-button" type="button" onClick={() => setApplied(query)}>
            {t('common.search', { defaultMessage: 'Search' })}
          </button>
        </div>
        <div className="chip-row">
          {['All', 'Churches', 'Events', 'Mission', 'KCA', 'Press'].map((chip) => (
            <button className={category === chip ? 'active' : ''} key={chip} type="button" onClick={() => setCategory(chip)}>
              {chip}
            </button>
          ))}
        </div>
      </div>
      <div className="split-panel">
        <section className="panel">
          <h3>Popular Searches</h3>
          <div className="chip-row wrap">
            {['Find a church in Lagos', 'KCA application', 'Online Church live', 'Give to missions', 'Start a home church'].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  setApplied(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <h3>Results</h3>
          {catalogueLoading ? <p>{t('common.loading', { defaultMessage: 'Loading…' })}</p> : null}
          {catalogueError ? <p>{catalogueError}</p> : null}
          {results.length === 0 && catalogueReady ? <p>No matches for “{applied}”.</p> : null}
          {results.map((item) => (
            <Link className="list-row" href={item.href} key={`${item.kind}-${item.title}`}>
              <span className="thumb">{item.icon ?? '⌕'}</span>
              <div>
                <b>{item.title}</b>
                <small>{item.body}</small>
              </div>
              <span className="status">{item.status ?? item.kind}</span>
            </Link>
          ))}
        </section>
      </div>
    </div>
  );
}

function FindChurchLanding({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const heroImage = useCmsHeroImage('church');
  const [chip, setChip] = useState('All');
  const [search, setSearch] = useState('');
  const [locating, setLocating] = useState(false);
  const churchesState = useAsyncList(() => loadChurches({ per_page: 50 }), []);
  const churches = churchesState.status === 'ready' ? churchesState.items : [];
  const filtered = churches.filter((church) => {
    const q = search.trim().toLowerCase();
    if (q && !church.title.toLowerCase().includes(q) && !church.body.toLowerCase().includes(q)) return false;
    if (chip === 'All' || chip === 'Mission Location') return true;
    if (chip === 'Conventional Church') return (church.meta ?? '').toLowerCase().includes('church');
    if (chip === 'Home Church') return (church.meta ?? '').toLowerCase().includes('home');
    if (chip === 'Online Church') return (church.meta ?? '').toLowerCase().includes('online');
    return true;
  });

  function useMyLocation() {
    if (!navigator.geolocation) {
      setSearch('');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSearch(`${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 12000 },
    );
  }

  return (
    <>
      <Hero route={{ ...route, title: 'Find a Church Near You', action: 'Search Churches' }} imageUrl={heroImage} />
      <div className="find-toolbar panel">
        <div className="chip-row">
          {['All', 'Conventional Church', 'Home Church', 'Online Church', 'Mission Location'].map((item) => (
            <button className={chip === item ? 'active' : ''} key={item} type="button" onClick={() => setChip(item)}>
              {item}
            </button>
          ))}
        </div>
        <div className="toolbar">
          <input
            aria-label={t('common.search', { defaultMessage: 'Search' })}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by city, region, country..."
          />
          <button className="site-button secondary" type="button" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          <Link className="site-button" href="/find-church/results">
            {t('common.search', { defaultMessage: 'Search' })}
          </Link>
        </div>
      </div>
      <InteractiveMap height={320} />
      <Metrics
        items={[
          { value: churchesState.status === 'ready' ? String(churches.length) : '—', label: 'Churches' },
          { value: '147', label: 'Countries' },
          { value: '2M+', label: 'Members' },
          { value: 'Many', label: 'Lives Transformed' },
        ]}
      />
      <section className="panel table-panel">
        <DataStatus state={churchesState} emptyLabel="No published churches yet." />
        {filtered.map((church) => (
          <Link className="list-row rich-row" href={church.href} key={church.href}>
            <span className="thumb">{church.image ? <img src={church.image} alt="" /> : church.icon}</span>
            <div>
              <b>{church.title}</b>
              <small>{church.body}</small>
              {church.meta ? <em className="row-meta">{church.meta}</em> : null}
            </div>
            {church.status ? <span className="status">{church.status}</span> : <span />}
            <span className="ghost-link">{church.action ?? 'View'}</span>
          </Link>
        ))}
      </section>
      <BannerCta title="No church nearby?" body="Start a home church or join Online Church while we grow in your city." action="Start a Home Church" href="/start-home-church" />
    </>
  );
}

function KcaGate() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'guest' | 'ready'>('loading');
  const [access, setAccess] = useState<KcaAccess | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaMe()
      .then((data) => {
        if (cancelled) return;
        setAccess(data);
        if (data.destination && data.destination !== 'overview') {
          const href = kcaHrefForDestination(data.destination);
          if (href !== '/kca' && href !== '/kca/gate') {
            router.replace(href);
            return;
          }
        }
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('guest');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'loading') return <p className="panel">Resolving your KCA status…</p>;

  const destination = access?.destination ?? 'overview';
  const applyHref = destination === 'resume_application' ? '/kca/apply/church' : '/kca/enrol';
  const cta = kcaPrimaryCta(destination);

  return (
    <div className="split-panel">
      <Link className="panel" href={applyHref} style={{ textDecoration: 'none' }}>
        <span className="card-icon">🎓</span>
        <h2>{cta.label}</h2>
        <p>{access?.next_step ?? 'Begin your Kingdom Change Agents application and start the journey of formation.'}</p>
        <span className="ghost-link">{access?.label ?? 'Start Application'}</span>
      </Link>
      {kcaIsActivatedStudent(destination) ? (
        <Link className="panel" href="/account/kca" style={{ textDecoration: 'none' }}>
          <span className="card-icon">📊</span>
          <h2>Continue to Dashboard</h2>
          <p>Open your student dashboard for modules, assignments, and mentorship.</p>
          <span className="ghost-link">Open Dashboard</span>
        </Link>
      ) : (
        <Link className="panel" href="/kca/apply/status" style={{ textDecoration: 'none' }}>
          <span className="card-icon">📋</span>
          <h2>Admission progress</h2>
          <p>Track your application without starting a second form.</p>
          <span className="ghost-link">View status</span>
        </Link>
      )}
    </div>
  );
}

function PrayerLanding({ route }: { route: SiteRoute }) {
  const heroImage = useCmsHeroImage('church');
  const eventsState = useAsyncList(() => loadEvents({ per_page: 8 }), []);
  return (
    <>
      <Hero route={{ ...route, action: 'Submit a Prayer Request' }} imageUrl={heroImage} />
      <BannerCta
        title="We are here to pray with you"
        body="Share your request and our prayer team will stand with you in faith."
        action="Submit a Prayer Request"
        href="/prayer/request"
      />
      <DataStatus state={eventsState} emptyLabel="No upcoming gatherings yet." />
      {eventsState.status === 'ready' ? <CardGrid cards={eventsState.items} columns={2} /> : null}
    </>
  );
}

function eventActionHref(item: EventItem) {
  const action = (item.action ?? '').toLowerCase();
  if (action === 'register') return `${item.href}/register`;
  if (action === 'feedback' && item.href.startsWith('/events/')) return `${item.href}/feedback`;
  return item.href;
}

function EventsHub({ route }: { route: SiteRoute }) {
  const cms = useCmsPageMeta('events');
  const [tab, setTab] = useState<'upcoming' | 'mine' | 'past'>('upcoming');
  const eventsState = useAsyncList(() => loadEvents({ per_page: 50 }), []);
  const catalog = eventsState.status === 'ready' ? eventsState.items : [];
  const featured = catalog[0];
  const rows = catalog.filter((item) => {
    if (tab === 'mine') return false;
    return item.tab === tab;
  });

  return (
    <>
      <Hero route={route} imageUrl={cms.imageUrl} title={cms.title} subtitle={cms.summary} />
      {eventsState.status !== 'ready' ? <DataStatus state={eventsState} emptyLabel="No events published yet." /> : null}
      {featured ? (
        <Link className="panel detail-hero" href={featured.href}>
          <DetailArt image={featured.image} icon={featured.icon} />
          <div>
            <div className="chip-row">
              <span className="status">{featured.status}</span>
              <span className="soft-chip">{featured.meta}</span>
            </div>
            <h2>{featured.title}</h2>
            <p>{featured.body}</p>
            <small>
              {featured.when} · {featured.where}
            </small>
          </div>
        </Link>
      ) : null}
      <div className="events-tabs tab-bar">
        {(
          [
            ['upcoming', 'Upcoming'],
            ['mine', 'My Events'],
            ['past', 'Past'],
          ] as const
        ).map(([key, label]) => (
          <button className={tab === key ? 'active' : ''} key={key} type="button" onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>
      <section className="panel table-panel">
        {tab === 'mine' ? <p className="panel" style={{ boxShadow: 'none' }}>Sign in to see events you registered for.</p> : null}
        {rows.map((item) => (
          <div className="list-row rich-row" key={`${item.tab}-${item.href}`}>
            <Link href={item.href} style={{ display: 'contents' }}>
              <span className="thumb">{item.icon}</span>
              <div>
                <b>{item.title}</b>
                <small>
                  {item.when} · {item.where}
                </small>
                {item.meta ? <em className="row-meta">{item.meta}</em> : null}
              </div>
            </Link>
            {item.status ? <span className="status">{item.status}</span> : <span />}
            <Link className="ghost-link" href={eventActionHref(item)}>
              {item.action ?? 'View'}
            </Link>
          </div>
        ))}
        {eventsState.status === 'ready' && rows.length === 0 && tab !== 'mine' ? <p>No {tab} events.</p> : null}
      </section>
      <BannerCta title="Need the full month view?" body="Open your personal calendar for services, trainings, and registered gatherings." action="Open Calendar" href="/account/calendar" />
    </>
  );
}

function EventDetail({ route }: { route: SiteRoute }) {
  const id = pathEntityId(route.path) ?? '';
  const [event, setEvent] = useState<EventItem | null>(null);
  const [state, setState] = useState<AsyncListState<EventItem>>({ status: 'loading' });
  const [registerBusy, setRegisterBusy] = useState(false);
  const [registerMessage, setRegisterMessage] = useState<string | null>(null);
  const ticketHref = `${route.path.replace(/\/(register|checkout|feedback|ticket)$/, '')}/ticket`;
  const basePath = route.path.replace(/\/(register|checkout|feedback|ticket)$/, '');

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void loadEvent(id)
      .then((result) => {
        if (cancelled) return;
        setEvent(result.data);
        setState({ status: 'ready', items: [result.data] });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', message: publicErrorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onRegister = async () => {
    setRegisterMessage(null);
    setRegisterBusy(true);
    try {
      const registration = await registerForEvent(id);
      const registrationId = registration.id ?? registration.public_id ?? '';
      if (registrationId) rememberEventRegistration(id, registrationId);
      setRegisterMessage('You are registered for this event.');
    } catch (error) {
      setRegisterMessage(
        isRecentMfaRequiredError(error)
          ? `${formatUserApiError(error, 'Recent MFA is required to register.')} Complete MFA, then try again.`
          : formatUserApiError(error, 'Unable to register for this event.'),
      );
    } finally {
      setRegisterBusy(false);
    }
  };

  if (state.status !== 'ready' || !event) {
    return <DataStatus state={state.status === 'ready' ? { status: 'empty', message: 'Event not found.' } : state} emptyLabel="Event not found." />;
  }

  return (
    <div className="detail-layout">
      <section className="detail-hero panel">
        <DetailArt image={event.image} icon={event.icon} />
        <div>
          <div className="chip-row">
            {event.status ? <span className="status">{event.status}</span> : null}
            {event.meta ? <span className="soft-chip">{event.meta}</span> : null}
          </div>
          <h2>{event.title || route.title}</h2>
          <p>{event.body}</p>
          <div className="info-grid">
            <div>
              <small>When</small>
              <b>{event.when}</b>
            </div>
            <div>
              <small>Where</small>
              <b>{event.where}</b>
            </div>
          </div>
          <div className="hero-actions">
            <button className="site-button" type="button" disabled={registerBusy} onClick={() => void onRegister()}>
              {registerBusy ? 'Registering…' : 'Register Now'}
            </button>
            <Link className="site-button secondary" href={`${basePath}/register`}>
              Registration form
            </Link>
            <Link className="site-button secondary" href={ticketHref}>
              View Ticket
            </Link>
          </div>
          {registerMessage ? <p className="panel" style={{ marginTop: 12 }}>{registerMessage}</p> : null}
        </div>
      </section>
      <div className="content-grid">
        <section className="panel">
          <h3>About</h3>
          <p>
            {event.body} Join believers from across the Family House network for worship, teaching, and Kingdom commissioning.
          </p>
        </section>
        <aside className="panel side-card">
          <h3>Capacity</h3>
          <div className="mini-art">▣</div>
          <b>Registration open</b>
          <p>Register early to secure your place. Online participation options may also be available for selected sessions.</p>
          <button className="site-button" type="button" disabled={registerBusy} onClick={() => void onRegister()}>
            {registerBusy ? 'Registering…' : 'Reserve My Spot'}
          </button>
        </aside>
      </div>
    </div>
  );
}

function CalendarView({ route }: { route: SiteRoute }) {
  return <LiveAccountCalendar route={route} />;
}

function listingLoaderFor(route: SiteRoute): (() => Promise<{ data: ContentCard[] }>) | null {
  const cms = cmsListingLoader(route.path);
  if (cms) return cms;
  if (route.path.includes('/mission/crusades')) return () => loadCrusades({ per_page: 50 });
  if (route.path.includes('/mission/locations')) return () => loadMissionLocations({ per_page: 50 });
  if (route.path.includes('/events') || route.path.includes('/account/events') || route.path === '/prayer') {
    return async () => {
      const result = await loadEvents({ per_page: 50 });
      return { data: result.data };
    };
  }
  if (route.path.includes('/find-church') || route.path.includes('/churches') || route.path.includes('/home-churches')) {
    return () => loadChurches({ per_page: 50 });
  }
  if (route.path.includes('/press/devotionals')) return () => loadDevotionalPublications();
  if (route.path.includes('/press')) return () => loadPressPublications({ per_page: 50 });
  if (route.path.includes('/account/giving')) {
    return async () => {
      const [intents, transactions] = await Promise.all([
        fetchUserPaymentIntents(),
        fetchUserPaymentTransactions(),
      ]);

      const txCards: ContentCard[] = transactions.map((tx) => ({
        title: 'Gift recorded',
        body: `${formatTimestamp(tx.occurred_at ?? tx.created_at)} · ${tx.purpose_code ?? 'Gift'}`,
        href: `/account/giving#tx-${tx.id ?? tx.public_id ?? 'unknown'}`,
        meta: formatMoneyMinor(tx.amount_minor, tx.currency ?? 'NGN'),
        status: tx.status ?? 'Recorded',
        icon: '🧾',
        action: 'View',
      }));

      const intentCards: ContentCard[] = intents.map((intent) => ({
        title: intent.purpose_code ?? 'Giving intent',
        body: `${intent.status ?? 'Pending'} · ${formatTimestamp(intent.created_at)}`,
        href: `/account/giving#intent-${intent.id ?? intent.public_id ?? 'unknown'}`,
        meta: formatMoneyMinor(intent.amount_minor, intent.currency ?? 'NGN'),
        status: intent.status ?? 'Pending',
        icon: '💝',
        action: 'View',
      }));

      // Prefer completed transactions first; intents show pending/governance-era history.
      const byDate = (a: ContentCard, b: ContentCard) => String(b.body).localeCompare(String(a.body));
      return { data: [...txCards.sort(byDate), ...intentCards.sort(byDate)] };
    };
  }
  if (route.path.includes('/account/prayer-requests')) {
    return async () => {
      const prayers = await fetchUserPrayers();
      return {
        data: prayers.map((prayer) => ({
          title: prayer.subject ?? 'Prayer request',
          body: prayer.body ?? '',
          href: '/account/prayer-requests',
          meta: prayer.status ?? undefined,
          status: prayer.status ?? undefined,
          icon: '🙏',
          action: 'View',
        })),
      };
    };
  }
  if (route.path.includes('/account/need-requests')) {
    return async () => {
      const needs = await fetchUserNeeds();
      return {
        data: needs.map((need) => ({
          title: need.category ?? 'Pastoral need',
          body: need.summary ?? '',
          href: '/account/need-requests',
          meta: need.status ?? undefined,
          status: need.status ?? undefined,
          icon: '🛟',
          action: 'View',
        })),
      };
    };
  }
  if (route.path.includes('/account/messages')) {
    return async () => {
      const conversations = await fetchUserMessageConversations();
      return {
        data: conversations.map((conversation) => ({
          title: conversation.subject ?? 'Conversation',
          body: conversation.updated_at ?? conversation.created_at ?? '',
          href: `/account/messages#${conversation.id ?? ''}`,
          meta: `${(conversation.participant_ids ?? []).length || '—'} participants`,
          status: 'Open',
          icon: '💬',
          action: 'Open',
        })),
      };
    };
  }
  if (route.path.includes('/account/notifications')) {
    return async () => {
      const notifications = await fetchUserNotifications();
      return {
        data: notifications.map((notification) => ({
          title: notification.title ?? 'Notification',
          body: notification.body ?? '',
          href: '/account/notifications',
          meta: notification.created_at ?? undefined,
          status: notification.read_at ? 'Read' : 'Unread',
          icon: '🔔',
          action: notification.read_at ? 'View' : 'Mark read',
        })),
      };
    };
  }
  if (route.path.includes('/account/kca') && !designFixturesEnabled()) {
    return async () => ({ data: [] as ContentCard[] });
  }
  if (designFixturesEnabled()) {
    return () => Promise.resolve({ data: listingFor(route.section, route.path) });
  }
  return async () => ({ data: [] as ContentCard[] });
}

function Listing({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const [filter, setFilter] = useState('all');
  const [applied, setApplied] = useState('all');
  const [devotionalKind, setDevotionalKind] = useState<'all' | 'devotional' | 'bible_study'>('all');
  const isDevotionals = route.path === '/press/devotionals';
  const apiLoader = listingLoaderFor(route);
  const listState = useAsyncList(
    () =>
      isDevotionals
        ? loadDevotionalPublications(devotionalKind)
        : apiLoader
          ? apiLoader()
          : designFixturesEnabled()
            ? Promise.resolve({ data: listingFor(route.section, route.path) })
            : Promise.resolve({ data: [] as ContentCard[] }),
    [route.path, route.section, isDevotionals, devotionalKind],
  );
  const rows = listState.status === 'ready' ? listState.items : [];
  const isMap = route.kind === 'map' || route.path.includes('/map') || route.path.includes('/directions');
  const isResults = route.path.includes('/results') || route.path.includes('/find-church');
  const isEvents = route.section === 'Events' || route.path.includes('/events') || route.path.includes('/account/events');
  const [destination, setDestination] = useState<MapMarker | null>(null);

  useEffect(() => {
    if (!isMap && !isResults) {
      setDestination(null);
      return;
    }
    let cancelled = false;
    void loadMapDestination(route.path)
      .then((marker) => {
        if (!cancelled) setDestination(marker);
      })
      .catch(() => {
        if (!cancelled) setDestination(null);
      });
    return () => {
      cancelled = true;
    };
  }, [route.path, isMap, isResults]);

  const visible = rows.filter((row) => {
    if (applied === 'all') return true;
    const status = (row.status ?? '').toLowerCase();
    if (applied === 'active') return status.includes('active') || status.includes('open') || status.includes('progress') || status.includes('live') || status.includes('published');
    if (applied === 'upcoming') return status.includes('upcoming') || status.includes('ready') || status.includes('week');
    return true;
  });

  return (
    <>
      <div className="toolbar">
        <input aria-label={t('common.search', { defaultMessage: 'Search' })} placeholder={`Search ${route.section.toLowerCase()}...`} />
        <select aria-label={t('common.filters', { defaultMessage: 'Filters' })} value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All Categories</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
        </select>
        <button className="site-button" type="button" onClick={() => setApplied(filter)}>
          {t('common.filters', { defaultMessage: 'Filters' })}
        </button>
      </div>
      {isDevotionals ? (
        <>
          <p className="muted" style={{ margin: '0 0 12px' }}>
            Daily devotionals and Study Manuals live here. The type is marked on every title.
          </p>
          <div className="bible-toggles" role="tablist" aria-label="Devotional type">
          {(
            [
              ['all', 'All'],
              ['devotional', 'Devotional'],
              ['bible_study', 'Study Manual'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={devotionalKind === id}
              className={devotionalKind === id ? 'is-active' : undefined}
              onClick={() => setDevotionalKind(id)}
            >
              {label}
            </button>
          ))}
        </div>
        </>
      ) : null}
      <div className={`content-grid ${isMap ? 'map-grid' : ''}`}>
        <section className="panel table-panel">
          <DataStatus state={listState} emptyLabel={emptyListingMessage(route.path)} />
          {visible.map((row) => {
            const registerHref = isEvents && (row.action ?? '').toLowerCase() === 'register' ? `${row.href}/register` : null;
            return (
              <div className="list-row rich-row" key={`${row.title}-${row.href}`}>
                <Link href={row.href} style={{ display: 'contents' }}>
                  <span className="thumb">{row.icon ?? route.section[0]}</span>
                  <div>
                    <b>{row.title}</b>
                    <small>{row.body}</small>
                    {row.meta ? <em className="row-meta">{row.meta}</em> : null}
                  </div>
                </Link>
                {row.status ? <span className="status">{row.status}</span> : <span />}
                {registerHref ? (
                  <Link className="ghost-link" href={registerHref}>
                    Register
                  </Link>
                ) : (row.action ?? '').toLowerCase() === 'join' ? (
                  <Link className="ghost-link" href={detailPrimaryHref({ ...route, path: row.href, action: 'Join' })} aria-label={`Join ${row.title}`}>
                    + Join
                  </Link>
                ) : (
                  <Link className="ghost-link" href={row.href}>
                    {row.action ?? 'View'}
                  </Link>
                )}
              </div>
            );
          })}
        </section>
        <aside className="panel side-card">
          {isMap || isResults ? (
            <>
              <h3>{isMap ? 'Live Map & Directions' : 'Map Preview'}</h3>
              <InteractiveMap
                mode={route.path.includes('/directions') ? 'directions' : 'explore'}
                destination={destination}
                height={280}
              />
              <b>{rows[0]?.title ?? 'Global Coverage'}</b>
              <p>
                {route.path.includes('/directions')
                  ? destination
                    ? 'Pan, zoom, and use your location for routing on the active maps provider.'
                    : 'Directions appear when a maps provider is activated and this place has coordinates.'
                  : 'Explore churches and mission points when a maps provider is activated (Google, Mapbox, or Leaflet).'}
              </p>
              <Link className="site-button" href={rows[0]?.href ?? '/find-church/map'}>
                {rows[0] ? 'Open Profile' : 'Open Full Map'}
              </Link>
            </>
          ) : (
            <>
              <h3>Featured</h3>
              <div className="mini-art">✦</div>
              <b>{rows[0]?.title ?? 'Kingdom Advancement'}</b>
              <p>{rows[0]?.body ?? 'Discover what God is doing through our global family.'}</p>
              <Link className="site-button" href={rows[0]?.href ?? '/events'}>
                View Details
              </Link>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

function detailPrimaryHref(route: SiteRoute): string {
  const action = (route.action ?? '').toLowerCase();
  if (action.includes('join')) {
    const churchId = pathEntityId(route.path);
    if (churchId && ULID_RE.test(churchId)) {
      return `/join-church/register?church=${encodeURIComponent(churchId)}`;
    }
    return '/join-church/register';
  }
  if (action.includes('partner') || action.includes('support')) return '/mission/support';
  if (action.includes('give')) return '/give';
  if (action.includes('register')) return `${route.path}/register`;
  if (action.includes('impact')) return '/mission/impact';
  if (action.includes('read')) return route.path;
  return heroPrimaryHref(route.path, route.section, route.action);
}

function Detail({ route }: { route: SiteRoute }) {
  const id = pathEntityId(route.path) ?? '';
  const [card, setCard] = useState<ContentCard | null>(null);
  const [state, setState] = useState<AsyncListState<ContentCard>>({ status: 'loading' });
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadDone, setDownloadDone] = useState(false);
  const isPress = route.path.startsWith('/press/');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (route.path.startsWith('/churches/')) return (await loadChurch(id)).data;
      if (route.path.startsWith('/events/')) return (await loadEvent(id)).data;
      if (route.path.startsWith('/press/')) return (await loadPressPublication(id)).data;
      if (route.path.includes('/mission/crusades/')) return (await loadCrusade(id)).data;
      if (!designFixturesEnabled()) {
        throw new Error('Content not found.');
      }
      const fallback =
        listingFor(route.section, route.path).find((item) => item.href === route.path) ??
        (route.section === 'Press' ? sermons.find((item) => item.href === route.path) : undefined);
      if (fallback) return fallback;
      throw new Error('Content not found.');
    };

    setState({ status: 'loading' });
    void load()
      .then((data) => {
        if (cancelled) return;
        setCard(data);
        setState({ status: 'ready', items: [data] });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', message: publicErrorMessage(error, 'Unable to load this page.') });
      });

    return () => {
      cancelled = true;
    };
  }, [id, route.path, route.section]);

  if (state.status !== 'ready' || !card) {
    return <DataStatus state={state.status === 'ready' ? { status: 'empty', message: 'Not found.' } : state} emptyLabel="Not found." />;
  }

  const contactHref = route.path.startsWith('/churches/') ? `${route.path}/contact` : '/contact';
  const directionsHref = route.path.startsWith('/churches/') ? `${route.path}/directions` : '/find-church/map';

  const onPressDownload = async () => {
    if (!id) {
      setDownloadError('Publication id is missing from this path.');
      return;
    }
    setDownloadBusy(true);
    setDownloadError(null);
    setDownloadDone(false);
    try {
      const response = await downloadPressPublication(id);
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        setDownloadError('Publication file download is not issued by the API yet.');
        return;
      }
      const blob = await response.blob();
      if (!blob.size) {
        setDownloadError('Publication file download is not issued by the API yet.');
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      const disposition = response.headers.get('content-disposition') ?? '';
      const named = disposition.match(/filename="?([^"]+)"?/i)?.[1];
      anchor.download = named || `${card?.title ?? 'publication'}.bin`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setDownloadDone(true);
    } catch (error) {
      setDownloadError(formatUserApiError(error, 'Unable to download this publication.'));
    } finally {
      setDownloadBusy(false);
    }
  };

  return (
    <div className="detail-layout">
      <section className="detail-hero panel">
        <DetailArt image={card.image} icon={card.icon ?? '✦'} />
        <div>
          <div className="chip-row">
            {card.status ? <span className="status">{card.status}</span> : null}
            {card.meta ? <span className="soft-chip">{card.meta}</span> : null}
          </div>
          <h2>{card.title || route.title}</h2>
          <p>{card.body}</p>
          <div className="hero-actions">
            {isPress ? (
              <button className="site-button" type="button" disabled={downloadBusy} onClick={() => void onPressDownload()}>
                {downloadBusy ? 'Downloading…' : downloadDone ? 'Download started' : (route.action ?? 'Download')}
              </button>
            ) : (
              <Link className="site-button" href={detailPrimaryHref(route)}>
                {route.action?.toLowerCase().includes('join') ? '+ Join' : (route.action ?? 'Join Church')}
              </Link>
            )}
            {route.section === 'Church' ? (
              <>
                <Link className="site-button secondary" href={contactHref}>
                  Request Contact
                </Link>
                <Link className="site-button secondary" href={directionsHref}>
                  Get Directions
                </Link>
              </>
            ) : (
              <Link className="site-button secondary" href={isPress ? '/press' : '/mission'}>
                {isPress ? 'Browse Press' : 'Explore Mission'}
              </Link>
            )}
          </div>
          {downloadError ? <p className="panel" style={{ marginTop: 12 }}>{downloadError}</p> : null}
        </div>
      </section>
      <div className="content-grid">
        <section className="panel">
          <h3>Overview</h3>
          <p>
            Family House communities and ministry initiatives create places of worship, discipleship, prayer, and care. Whether you join
            onsite or online, you will find biblical teaching, warm fellowship, and clear next steps for your faith journey.
          </p>
          <div className="info-grid">
            {[
              ['Location', card.body],
              ['Status', card.status ?? 'Published'],
              ['Category', card.meta ?? route.section],
              ['Next step', route.action ?? 'Explore'],
            ].map(([label, value]) => (
              <div key={label}>
                <small>{label}</small>
                <b>{value}</b>
              </div>
            ))}
          </div>
        </section>
        <aside className="panel side-card">
          <h3>Next Gathering</h3>
          <div className="mini-art">♪</div>
          <b>Sunday Celebration</b>
          <p>Join us this Sunday for worship, the Word, and fellowship.</p>
          <Link className="site-button" href="/online-church/live">
            Join Live
          </Link>
        </aside>
      </div>
    </div>
  );
}

function KcaEnrolStart() {
  const { t } = useLocale();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaMe()
      .then((access) => {
        if (cancelled) return;
        if (access.destination && access.destination !== 'overview' && access.destination !== 'resume_application') {
          router.replace(kcaHrefForDestination(access.destination));
          return;
        }
        setChecking(false);
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (checking) return <p className="panel">Checking application status…</p>;

  const bullets = [
    { icon: '📚', key: 'member.kca.twelveModules', fallback: '12 Powerful Modules' },
    { icon: '👥', key: 'member.kca.mentorshipAccountability', fallback: 'Mentorship & Accountability' },
    { icon: '✅', key: 'member.kca.assignmentsEvidence', fallback: 'Assignments & Evidence' },
    { icon: '🎓', key: 'member.kca.practicalMinistry', fallback: 'Practical Ministry Experience' },
    { icon: '🌍', key: 'member.kca.globalCertification', fallback: 'Global Certification' },
  ] as const;

  return (
    <div className="kca-enrol-start">
      <section className="panel kca-enrol-start-hero">
        <span className="kca-enrol-shield" aria-hidden="true">
          🛡
        </span>
        <h2>
          {t('member.kca.kingdomChangeAgents', { defaultMessage: 'Kingdom Change Agents' })}
        </h2>
        <p>
          {t('member.kca.discipleshipJourney', {
            defaultMessage: 'A discipleship journey. Not just a course.',
          })}
        </p>
        <ul className="kca-enrol-points">
          {bullets.map((item) => (
            <li key={item.key}>
              <span aria-hidden="true">{item.icon}</span>
              {t(item.key, { defaultMessage: item.fallback })}
            </li>
          ))}
        </ul>
        <div className="kca-enrol-actions">
          <Link className="site-button kca-enrol-primary" href="/kca/apply/church">
            {t('member.kca.enrollNow', { defaultMessage: 'Enroll Now' })}
          </Link>
          <Link className="ghost-link" href="/account/kca/modules">
            {t('member.kca.learnMore', { defaultMessage: 'Learn More' })}
          </Link>
        </div>
      </section>
      <aside className="panel kca-enrol-start-side">
        <span className="kca-enrol-start-icon">🎓</span>
        <h3>{t('member.kca.beforeYouApply', { defaultMessage: 'Before you apply' })}</h3>
        <p>
          {t('member.kca.beforeYouApplyCopy', {
            defaultMessage:
              'The application takes about 15 minutes. Progress is saved in this browser until you submit on the review step.',
          })}
        </p>
        <small>
          {t('member.kca.admissionsReviewCopy', {
            defaultMessage: 'Admissions reviews your application before enrollment is activated on your student dashboard.',
          })}
        </small>
      </aside>
    </div>
  );
}

function FormScreen({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSummary, setDraftSummary] = useState<Record<string, string>>({});
  const fields = formFieldsForRoute(route.path);
  const isAuth = route.surface === 'auth';
  const isHomeChurchStep = route.path.includes('/start-home-church/apply');
  const isHomeChurchMeeting = route.path.includes('/start-home-church/apply/meeting');
  const isHomeChurchReview = route.path.includes('/start-home-church/apply/review');
  const isKcaApply = route.path.includes('/kca/apply/');
  const isKcaApplyReview = route.path === '/kca/apply/review';
  const isMissionInvite = route.path.includes('/mission/crusades/invite');
  const isMissionSupport = route.path.includes('/mission/support');
  const isCertVerify = route.path.includes('/kca/certificates/verify');
  const isGive = route.path === '/give' || route.path.startsWith('/give/');
  const isEventRegister = route.path.includes('/events/') && route.path.includes('/register');
  const isEventFeedback = route.path.includes('/events/') && route.path.includes('/feedback');
  const isJoinChurch = route.path.includes('/join-church');
  const isAccountPrayer = route.path.includes('/account/prayer-requests');
  const isAccountNeed = route.path.includes('/account/need-requests');
  const isPublicPrayer = route.path === '/prayer' || route.path.startsWith('/prayer/');
  const isContact = route.path === '/contact' || route.path.endsWith('/contact');
  const isHomeChurchStart = route.path === '/start-home-church';

  useEffect(() => {
    if (isHomeChurchReview) setDraftSummary(readHomeChurchDraft());
  }, [isHomeChurchReview]);

  useEffect(() => {
    if (!isKcaApply) return;
    let cancelled = false;
    void fetchKcaCurrentApplication()
      .then((current) => {
        if (cancelled || !current) return;
        const status = String(current.status ?? '');
        if (status && status !== 'draft' && status !== 'information_required') {
          router.replace('/kca/apply/status');
          return;
        }
        const answers = current.application_data;
        if (answers && typeof answers === 'object') {
          const draftKey = 'fhc.kca-application.draft';
          try {
            const existing = JSON.parse(window.localStorage.getItem(draftKey) ?? '{}') as Record<string, string>;
            window.localStorage.setItem(draftKey, JSON.stringify({ ...existing, ...(answers as Record<string, string>) }));
          } catch {
            window.localStorage.setItem(draftKey, JSON.stringify(answers));
          }
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isKcaApply, router]);

  if (route.path === '/kca/enrol') {
    return <KcaEnrolStart />;
  }

  if (isHomeChurchStart) {
    return (
      <div className="home-church-start">
        <section className="panel home-church-start-hero">
          <span className="eyebrow">{t('homeChurch.applicationEyebrow', { defaultMessage: 'HOME CHURCH APPLICATION' })}</span>
          <h2>{t('homeChurch.startTitle', { defaultMessage: 'Start a Church in Your Home' })}</h2>
          <p>
            {t('homeChurch.startCopy', {
              defaultMessage:
                'Build a Christ-centred community for worship, discipleship, prayer, and care. Your application is submitted securely to the Family House Connect API after the review step.',
            })}
          </p>
          <div className="home-church-start-points">
            <span>✓ {t('homeChurch.pointAboutYou', { defaultMessage: 'Tell us about yourself' })}</span>
            <span>✓ {t('homeChurch.pointLocation', { defaultMessage: 'Choose your meeting location' })}</span>
            <span>✓ {t('homeChurch.pointReview', { defaultMessage: 'Submit for pastoral review' })}</span>
          </div>
          <Link className="site-button" href="/start-home-church/eligibility">
            {t('homeChurch.startApplication', { defaultMessage: 'Start your application' })}
          </Link>
        </section>
        <aside className="panel home-church-start-side">
          <span className="home-church-start-icon">⌂</span>
          <h3>{t('homeChurch.beforeYouBegin', { defaultMessage: 'Before you begin' })}</h3>
          <p>{t('homeChurch.beforeYouBeginCopy', { defaultMessage: 'Have your contact details, sponsoring church, proposed meeting location, and expected participant count ready.' })}</p>
          <small>{t('homeChurch.draftSavedLocally', { defaultMessage: 'Application progress is saved in this browser until it is submitted.' })}</small>
        </aside>
      </div>
    );
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    const formData = new FormData(form);
    const values: Record<string, string> = {};
    formData.forEach((value, key) => {
      if (typeof value === 'string') values[key] = value;
    });

    if (isHomeChurchStep && !isHomeChurchReview) {
      writeHomeChurchDraft(values);
      setDone(true);
      window.setTimeout(() => router.push(flowNext[route.path] ?? '/account'), 450);
      return;
    }

    if (isHomeChurchReview) {
      const draft = { ...readHomeChurchDraft(), ...values };
      writeHomeChurchDraft(draft);
      const payload = draftToHomeChurchPayload(draft);
      if (!payload) {
        setError('Your application is incomplete. Go back and fill required home church fields.');
        return;
      }
      setBusy(true);
      try {
        const idempotencyKey =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `home-church-${Date.now()}`;
        await submitHomeChurchApplication(payload, idempotencyKey);
        clearHomeChurchDraft();
        setDone(true);
        router.push(flowNext[route.path] ?? '/start-home-church/submitted');
      } catch (err) {
        setError(publicErrorMessage(err, 'Unable to submit your home church application.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isCertVerify) {
      const code = values.code?.trim();
      if (!code) {
        setError('Enter a certificate verification code.');
        return;
      }
      setBusy(true);
      try {
        const result = await verifyKcaCertificate(code);
        setDone(true);
        setError(null);
        form.dataset.verified = JSON.stringify(result);
        setDraftSummary({
          certificate_number: result.certificate_number,
          completion_on: result.completion_on,
          issued_at: result.issued_at,
        });
      } catch (err) {
        setError(publicErrorMessage(err, 'Certificate could not be verified.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isGive) {
      const amountMajor = Number(values.amount ?? '');
      if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
        setError('Enter a valid giving amount.');
        return;
      }
      setBusy(true);
      try {
        const intent = await createGivingIntent({
          amount_minor: Math.round(amountMajor * 100),
          currency: 'NGN',
          fund: values.fund || 'Offering',
          purpose_code: givingFundToPurpose(values.fund || 'Offering'),
          note: values.note || null,
        });
        const intentId = intent.id ?? intent.public_id;
        if (isLocalManualGivingProvider(intent.provider_code) && intentId) {
          setError('Upload a payment receipt on the Give payment page to complete a manual gift.');
          return;
        }

        const payloadInstructions =
          intent.client_payload && typeof intent.client_payload.instructions === 'string'
            ? intent.client_payload.instructions
            : null;
        setError(payloadInstructions || GIVING_CHECKOUT_UNAVAILABLE_MESSAGE);
      } catch (err) {
        if (isPaymentGovernanceDenied(err)) {
          setError(formatUserApiError(err, PAYMENT_GOVERNANCE_DENIED_MESSAGE));
        } else {
          setError(formatUserApiError(err, 'Unable to start giving.'));
        }
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isEventRegister) {
      const eventId = pathEntityId(route.path);
      if (!eventId) {
        setError('Event id is missing from this registration path.');
        return;
      }
      setBusy(true);
      try {
        const registration = await registerForEvent(eventId);
        const registrationId = registration.id ?? registration.public_id ?? '';
        if (registrationId) rememberEventRegistration(eventId, registrationId);
        setDone(true);
        const ticketQuery = registrationId ? `?registration=${encodeURIComponent(registrationId)}` : '';
        window.setTimeout(
          () => router.push(flowNext[route.path] ?? `${route.path.replace(/\/register$/, '')}/ticket${ticketQuery}`),
          450,
        );
      } catch (err) {
        setError(
          isRecentMfaRequiredError(err)
            ? `${formatUserApiError(err, 'Recent MFA is required to register.')} Complete MFA under Account → Settings, then retry.`
            : formatUserApiError(err, 'Unable to register for this event.'),
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isEventFeedback) {
      const eventId = pathEntityId(route.path) ?? '';
      const registrationId = ((values.registration_id ?? queryParam('registration')) || readRememberedEventRegistration(eventId)).trim();
      const rating = parseEventFeedbackRating(values.rating ?? '');
      if (!registrationId) {
        setError('A registration id is required. Open this form from your ticket after attendance is recorded.');
        return;
      }
      if (rating == null) {
        setError('Choose a rating from 1 to 5.');
        return;
      }
      setBusy(true);
      try {
        await recordEventFeedback({ registration_id: registrationId, rating });
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/account/events'), 450);
      } catch (err) {
        setError(
          isRecentMfaRequiredError(err)
            ? `${formatUserApiError(err, 'Recent MFA is required to submit feedback.')} Complete MFA under Account → Settings, then retry.`
            : formatUserApiError(err, 'Unable to submit event feedback.'),
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isJoinChurch) {
      const churchId = (values.church_id || queryParam('church')).trim();
      if (!churchId || !ULID_RE.test(churchId)) {
        setError('Select a published church to request membership. Membership is not recorded without a church id.');
        return;
      }
      const homeChurchId = (values.home_church_id ?? '').trim();
      setBusy(true);
      try {
        const join = async (confirm = false) => {
          if (homeChurchId && ULID_RE.test(homeChurchId) && !churchId) {
            await requestHomeChurchMembership(homeChurchId, { confirm_transfer: confirm });
            return;
          }
          await requestChurchMembership(churchId, {
            ...(homeChurchId && ULID_RE.test(homeChurchId) ? { home_church_id: homeChurchId } : {}),
            ...(confirm ? { confirm_transfer: true } : {}),
          });
        };
        await join(false);
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/account/church'), 450);
      } catch (err) {
        if (err instanceof ApiError && err.code === 'MEMBERSHIP_TRANSFER_REQUIRED') {
          if (window.confirm(err.message || 'You already belong to another church. Confirm to move your membership?')) {
            try {
              await requestChurchMembership(churchId, {
                ...(homeChurchId && ULID_RE.test(homeChurchId) ? { home_church_id: homeChurchId } : {}),
                confirm_transfer: true,
              });
              setDone(true);
              window.setTimeout(() => router.push(flowNext[route.path] ?? '/account/church'), 450);
              return;
            } catch (retryErr) {
              setError(formatUserApiError(retryErr, 'Unable to move your church membership.'));
              return;
            }
          }
          setError(err.message);
          return;
        }
        setError(formatUserApiError(err, 'Unable to request church membership.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isAccountPrayer) {
      const subject = (values.subject ?? values.category ?? '').trim();
      const body = (values.body ?? values.request ?? '').trim();
      if (!subject || !body) {
        setError('Subject and prayer request details are required.');
        return;
      }
      setBusy(true);
      try {
        await createUserPrayer({ subject, body });
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/account/prayer-requests'), 450);
      } catch (err) {
        setError(formatUserApiError(err, 'Unable to submit your prayer request.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isPublicPrayer) {
      const subject = (values.category ?? values.subject ?? 'Prayer request').trim();
      const body = (values.request ?? values.body ?? '').trim();
      if (!body) {
        setError('Enter your prayer request.');
        return;
      }
      setBusy(true);
      try {
        await createUserPrayer({ subject, body });
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/account/prayer-requests'), 450);
      } catch (err) {
        setError(
          formatUserApiError(
            err,
            'Unable to submit prayer. Sign in with a verified account to send requests to the prayer API.',
          ),
        );
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isAccountNeed) {
      const category = (values.category ?? '').trim();
      const summary = (values.summary ?? values.notes ?? values.body ?? '').trim();
      if (!category || !summary) {
        setError('Category and need summary are required.');
        return;
      }
      setBusy(true);
      try {
        await createUserNeed({ category, summary });
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/account/need-requests'), 450);
      } catch (err) {
        setError(formatUserApiError(err, 'Unable to submit your need request.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isContact) {
      // No public contact inbox API — do not fake success when fixtures are off.
      if (designFixturesEnabled()) {
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/contact'), 450);
        return;
      }
      setError(PUBLIC_CONTACT_INBOX_UNAVAILABLE_MESSAGE);
      return;
    }

    if (isKcaApply) {
      const draftKey = 'fhc.kca-application.draft';
      if (!isKcaApplyReview) {
        let existing: Record<string, string> = {};
        try {
          existing = JSON.parse(window.localStorage.getItem(draftKey) ?? '{}') as Record<string, string>;
        } catch {
          // An invalid local draft must not prevent the applicant from continuing.
        }
        const merged = { ...existing, ...values };
        window.localStorage.setItem(draftKey, JSON.stringify(merged));
        setBusy(true);
        try {
          await submitKcaApplication(merged, { finalize: false });
          setDone(true);
          window.setTimeout(() => router.push(flowNext[route.path] ?? '/kca/apply/status'), 450);
        } catch (err) {
          setError(formatUserApiError(err, 'Unable to save your KCA application draft.'));
        } finally {
          setBusy(false);
        }
        return;
      }
      let applicationData: Record<string, string> = {};
      try {
        applicationData = JSON.parse(window.localStorage.getItem(draftKey) ?? '{}') as Record<string, string>;
      } catch {
        setError('Your saved application draft is invalid. Return to the first step and enter your details again.');
        return;
      }
      applicationData = { ...applicationData, ...values };
      if (Object.keys(applicationData).length === 0) {
        setError('Complete your application details before submitting.');
        return;
      }
      setBusy(true);
      try {
        await submitKcaApplication(applicationData, { finalize: true });
        window.localStorage.removeItem(draftKey);
        setDone(true);
        router.push(flowNext[route.path] ?? '/kca/apply/status');
      } catch (err) {
        setError(formatUserApiError(err, 'Unable to submit your KCA application.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isMissionInvite) {
      const title = (values.title ?? '').trim();
      if (!title) {
        setError('Enter an event or project title.');
        return;
      }
      setBusy(true);
      try {
        await submitMissionInvitation({
          title,
          type: values.type,
          start: values.start,
          location: values.location,
          details: values.details,
        });
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/mission/crusades/request/status'), 450);
      } catch (err) {
        setError(formatUserApiError(err, 'Unable to submit the mission invitation. Sign in as a member and try again.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (isMissionSupport) {
      const title = (values.title ?? '').trim();
      if (!title) {
        setError('Enter a support request title.');
        return;
      }
      setBusy(true);
      try {
        await submitMissionSupportRequest({
          title,
          details: values.details,
          category: values.type,
        });
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/mission'), 450);
      } catch (err) {
        setError(formatUserApiError(err, 'Unable to submit the support request. Sign in as a member and try again.'));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (designFixturesEnabled()) {
      setDone(true);
      window.setTimeout(() => {
        router.push(flowNext[route.path] ?? '/account');
      }, 450);
      return;
    }

    setError(
      'This form is not connected to a live API yet. No submission was recorded.',
    );
  };

  const form = (
    <form className={`site-form ${isAuth ? 'auth-form' : ''}`} onSubmit={submit}>
      {!isAuth ? (
        <div className="form-intro">
          <h3>{route.title}</h3>
          <p>
            {isHomeChurchReview
              ? 'Confirm your details and submit your home church application.'
              : isCertVerify
                ? 'Enter the verification code printed on the certificate.'
                : isHomeChurchStep
                  ? 'Progress is saved in this browser until you submit on the review step.'
                  : isGive
                    ? 'Amounts create a giving intent when payment governance allows. Default deny returns a clear error — success only completes for the local_manual QA gateway.'
                    : 'Complete the details below to continue.'}
          </p>
        </div>
      ) : null}
      {isHomeChurchReview ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h4>Application summary</h4>
          {Object.keys(draftSummary).length === 0 ? <p>No saved draft yet. Complete the earlier steps first.</p> : null}
          {Object.entries(draftSummary)
            .filter(([key]) => !key.startsWith('notes'))
            .map(([key, value]) => (
              <div className="list-row" key={key}>
                <div>
                  <b>{key.replace(/\./g, ' · ')}</b>
                  <small>{value}</small>
                </div>
              </div>
            ))}
        </div>
      ) : null}
      {isCertVerify && done && draftSummary.certificate_number ? (
        <div className="panel" style={{ marginBottom: 16 }}>
          <h4>Verified</h4>
          <p>
            Certificate <b>{draftSummary.certificate_number}</b> · completed {draftSummary.completion_on} · issued{' '}
            {draftSummary.issued_at}
          </p>
        </div>
      ) : null}
      <div className="form-grid">
        {fields.map((field) => (
          <Field key={field.name} field={field} />
        ))}
      </div>
      {isHomeChurchMeeting ? <HomeChurchScheduleFields /> : null}
      {error ? (
        <p className="panel" role="alert" data-giving-error={isGive ? 'true' : undefined}>
          {error}
        </p>
      ) : null}
      {route.path.includes('/login') ? (
        <div className="auth-meta">
          <label>
            <input type="checkbox" defaultChecked /> Remember me
          </label>
          <Link href="/forgot-password">Forgot password?</Link>
        </div>
      ) : !isCertVerify && !isHomeChurchReview ? (
        <div className="choice-grid">
          {['I agree to the ministry guidelines', 'Keep me informed about next steps', 'Use my current profile information'].map((item) => (
            <label key={item}>
              <input type="checkbox" defaultChecked /> {item}
            </label>
          ))}
        </div>
      ) : null}
      <div className="form-actions">
        <button type="button" className="site-button secondary" onClick={() => router.back()} disabled={busy}>
          Back
        </button>
        <button className="site-button" type="submit" disabled={busy}>
          {busy ? 'Please wait…' : done ? 'Saved ✓' : (route.action ?? 'Save & Continue')}
        </button>
      </div>
      {route.path.includes('/login') ? (
        <div className="social-row">
          <span>Or continue with</span>
          <div>
            <button type="button">Google</button>
            <button type="button">Apple</button>
            <button type="button">Facebook</button>
          </div>
        </div>
      ) : null}
    </form>
  );

  if (!isAuth) return form;

  return (
    <div className="auth-shell">
      <aside className="auth-brand">
        <AppBrand variant="auth" />
        <h2>{route.path.includes('register') ? 'One Account. All Ministries.' : 'Welcome Back'}</h2>
        <p>{route.path.includes('forgot') || route.path.includes('reset') ? 'We will help you return to your Kingdom journey securely.' : 'Your church, mission, KCA, giving, and growth — in one place.'}</p>
        <ul className="check-list light">
          <li>One account across every ministry</li>
          <li>Secure access with optional MFA</li>
          <li>Your journey follows you everywhere</li>
        </ul>
      </aside>
      {form}
    </div>
  );
}

function HomeChurchScheduleFields() {
  const days = [
    ['sunday', 'Sun', 'Main service'],
    ['monday', 'Mon', 'Gathering'],
    ['tuesday', 'Tue', 'Gathering'],
    ['wednesday', 'Wed', 'Midweek service'],
    ['thursday', 'Thu', 'Gathering'],
    ['friday', 'Fri', 'Prayer meeting'],
    ['saturday', 'Sat', 'Fellowship'],
  ] as const;
  const times = ['09:00', '10:00', '17:00', '18:00', '19:00', '20:00'];
  const activities = ['Main service', 'Midweek service', 'Prayer meeting', 'Fellowship', 'Study Manuals', 'Gathering'];
  const draft = typeof window === 'undefined' ? {} : readHomeChurchDraft();
  let initial: Array<{ day: string; time: string; activity: string }> = [{ day: 'sunday', time: '09:00', activity: 'Main service' }];
  try {
    const parsed = JSON.parse(draft.meeting_schedules ?? '[]') as Array<{ day: string; time: string; activity: string }>;
    if (Array.isArray(parsed) && parsed.length > 0) initial = parsed;
  } catch {
    /* keep default */
  }
  const [rows, setRows] = useState(initial);
  const previewFamily = draft.residence_family_name || 'Onyeuwaoma John';

  return (
    <div className="panel" style={{ marginTop: 16 }}>
      <p className="field-help">
        Default name (not editable): <b>{FAMILY_HOUSE_HOME_CHURCH_PREFIX}</b>
      </p>
      <p>
        Combined name: <b>{composeHomeChurchName(previewFamily)}</b>
      </p>
      <h4 style={{ marginTop: 18 }}>Meeting days and times</h4>
      <p className="field-help">Select each gathering day and give it its own activity and time.</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
        {days.map(([value, label, activity]) => {
          const selected = rows.some((row) => row.day === value);
          return (
            <button
              type="button"
              key={value}
              className={selected ? 'site-button' : 'site-button secondary'}
              onClick={() => {
                setRows((current) =>
                  selected
                    ? current.filter((row) => row.day !== value)
                    : [...current, { day: value, time: value === 'sunday' ? '09:00' : '18:00', activity }],
                );
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
      {rows.map((row) => (
        <div key={row.day} className="form-grid" style={{ marginBottom: 12 }}>
          <label>
            <span>{row.day}</span>
            <select
              value={row.activity}
              onChange={(event) =>
                setRows((current) => current.map((item) => (item.day === row.day ? { ...item, activity: event.target.value } : item)))
              }
            >
              {activities.map((activity) => (
                <option key={activity} value={activity}>
                  {activity}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Time</span>
            <select
              value={row.time}
              onChange={(event) =>
                setRows((current) => current.map((item) => (item.day === row.day ? { ...item, time: event.target.value } : item)))
              }
            >
              {times.map((time) => (
                <option key={time} value={time}>
                  {time}
                </option>
              ))}
            </select>
          </label>
        </div>
      ))}
      <input name="meeting_schedules" type="hidden" value={JSON.stringify(rows)} />
    </div>
  );
}

function Field({ field }: { field: FormField }) {
  const className = field.wide ? 'wide' : undefined;
  if (field.type === 'checkbox') {
    return (
      <label className={`${className ?? ''} form-checkbox`.trim()}>
        <input name={field.name} type="checkbox" defaultChecked={field.value === 'true'} />
        <span>{field.label}</span>
      </label>
    );
  }
  if (field.type === 'textarea') {
    return (
      <label className={className}>
        {field.label}
        <textarea name={field.name} defaultValue={field.value} rows={5} />
      </label>
    );
  }
  if (field.type === 'geography') {
    return (
      <div className={className ?? 'wide'}>
        <GeographySelect defaultCountry={field.value || 'NG'} required />
      </div>
    );
  }
  if (field.type === 'search-select' && field.catalog) {
    return (
      <label className={className}>
        {field.label}
        <SearchSelect
          name={field.name}
          catalog={field.catalog}
          defaultValue={field.value}
          placeholder={`Search ${field.label.toLowerCase()}`}
        />
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <label className={className}>
        {field.label}
        <select name={field.name} defaultValue={field.value}>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </label>
    );
  }
  return (
    <label className={className}>
      {field.label}
      <input name={field.name} type={field.type ?? 'text'} defaultValue={field.value} />
    </label>
  );
}

function KcaUnavailable({ title = 'KCA learning', message }: { title?: string; message?: string }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <p>{message ?? 'Unable to load KCA data. Sign in and ensure your account is linked to a person enrollment.'}</p>
      <Link className="site-button" href="/account">
        Back to Dashboard
      </Link>
    </section>
  );
}

function KcaOrientationMember() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [orientation, setOrientation] = useState<import('@/lib/user-api').KcaOrientation | null>(null);

  async function reload() {
    const data = await fetchKcaOrientation();
    setOrientation(data);
    setState('ready');
  }

  useEffect(() => {
    let cancelled = false;
    void fetchKcaOrientation()
      .then((data) => {
        if (cancelled) return;
        setOrientation(data);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatUserApiError(err));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function markStageComplete(stageKey: string) {
    setBusy(true);
    setError(null);
    try {
      await completeKcaOrientationStage(stageKey);
      await reload();
    } catch (err) {
      setError(formatUserApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function submitOrientation() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await completeKcaOrientation();
      await reload();
      setMessage(`Orientation submitted. Application status: ${String(result.status ?? 'reviewed').replaceAll('_', ' ')}.`);
    } catch (err) {
      setError(formatUserApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (state === 'loading') return <p className="panel">Loading orientation…</p>;
  if (state === 'error' && !orientation) return <KcaUnavailable title="KCA Orientation" message={error ?? undefined} />;

  const allStagesComplete = (orientation?.stages ?? []).every((stage) => stage.completed);
  const canSubmit = orientation?.can_complete && allStagesComplete && !orientation?.orientation_completed_at;

  return (
    <section className="panel">
      <h3>KCA Orientation</h3>
      <p>{orientation?.welcome ?? 'Walk through each stage of orientation.'}</p>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
      <ul className="check-list">
        {(orientation?.stages ?? []).map((stage) => {
          const stageKey = stage.key ?? '';
          const href = stage.lesson_id
            ? `/account/kca/lessons/${stage.lesson_id}`
            : stage.module_id
              ? `/account/kca/modules/${stage.module_id}`
              : stage.key === 'mentors'
                ? '/account/kca/mentor'
                : stage.key === 'path'
                  ? '/account/kca/modules'
                  : `/account/kca/orientation/${stageKey}`;
          return (
            <li key={stage.key ?? stage.title}>
              <Link href={href}>
                <strong>{stage.completed ? '✓ ' : ''}{stage.title}</strong>
                {stage.subtitle ? ` — ${stage.subtitle}` : ''}
              </Link>
              {stage.body ? <p>{stage.body}</p> : null}
              {orientation?.can_complete && stageKey && !stage.completed ? (
                <button className="ghost-button" type="button" disabled={busy} onClick={() => void markStageComplete(stageKey)}>
                  Mark stage complete
                </button>
              ) : null}
            </li>
          );
        })}
      </ul>
      {canSubmit ? (
        <button className="site-button" type="button" disabled={busy} onClick={() => void submitOrientation()}>
          Submit orientation
        </button>
      ) : orientation?.orientation_completed_at ? (
        <p>Orientation completed. Track your admission progress from the application status page.</p>
      ) : null}
      <Link className="site-button ghost-button" href="/kca/apply/status">
        View admission progress
      </Link>
    </section>
  );
}

function KcaPracticalServiceMember() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<import('@/lib/user-api').KcaPracticalService | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaPracticalService()
      .then((data) => {
        if (cancelled) return;
        setPayload(data);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatUserApiError(err));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') return <p className="panel">Loading practical service…</p>;
  if (state === 'error') return <KcaUnavailable title="KCA Practical Service" message={error ?? undefined} />;

  return (
    <section className="panel">
      <h3>KCA Practical Service</h3>
      <p>Serve in at least two departments. Counts and hours come from your KCA assignments and attendance.</p>
      <p>
        {payload?.departments_count ?? 0} departments · {payload?.hours_served ?? 0} hours ·{' '}
        {payload?.on_track ? 'On track' : 'Keep serving'}
      </p>
      <ul className="check-list">
        {(payload?.departments ?? []).map((row) => (
          <li key={String(row.id)}>
            <Link href={row.id ? `/account/kca/assignments/${String(row.id)}` : '/account/kca/assignments'}>
              {String(row.title ?? 'Department')} — {String(row.state ?? '')}
            </Link>
          </li>
        ))}
      </ul>
      <Link className="site-button" href="/account/kca/assignments">
        Add another department
      </Link>
    </section>
  );
}

function KcaDirectoryMember() {
  const [scope, setScope] = useState('all');
  const [people, setPeople] = useState<Array<Record<string, unknown>>>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    void fetchKcaDirectory({ scope })
      .then((rows) => {
        if (cancelled) return;
        setPeople(rows as Array<Record<string, unknown>>);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatUserApiError(err));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  if (state === 'error') return <KcaUnavailable title="KCA Directory" message={error ?? undefined} />;

  return (
    <section className="panel">
      <h3>KCA Directory</h3>
      <p>View Kingdom Change Agents in your country, state, and LGA — and in other places.</p>
      <div className="chip-row">
        {[
          ['all', 'All'],
          ['own_country', 'My country'],
          ['own_state', 'My state'],
          ['own_lga', 'My LGA'],
          ['other_country', 'Other countries'],
          ['other_state', 'Other states'],
          ['other_lga', 'Other LGAs'],
        ].map(([value, label]) => (
          <button key={value} type="button" className={scope === value ? 'site-button' : 'ghost-link'} onClick={() => setScope(value)}>
            {label}
          </button>
        ))}
      </div>
      {state === 'loading' ? <p>Loading directory…</p> : null}
      <ul className="check-list">
        {people.map((person) => (
          <li key={String(person.id)}>
            {String(person.display_name ?? 'Member')}
            {[person.locality, person.region, person.country].filter(Boolean).length
              ? ` — ${[person.locality, person.region, person.country].filter(Boolean).join(', ')}`
              : ''}
          </li>
        ))}
      </ul>
    </section>
  );
}

function KcaStudentDashboard() {
  if (designFixturesEnabled()) return <KcaFixtureDashboard />;
  return <KcaLiveStudentDashboard />;
}

function KcaLiveStudentDashboard() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<KcaDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const access = await fetchKcaMe();
        if (cancelled) return;
        if (!kcaIsActivatedStudent(access.destination)) {
          router.replace(kcaHrefForDestination(access.destination));
          return;
        }
        const data = await fetchKcaDashboard();
        if (cancelled) return;
        setDashboard(data);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(formatUserApiError(err));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'loading') return <p className="panel">Loading KCA dashboard…</p>;
  if (state === 'error') return <KcaUnavailable title="KCA Student Dashboard" message={error ?? undefined} />;

  const total = dashboard?.lessons_total ?? dashboard?.modules_total ?? 0;
  const progress = dashboard?.lessons_completed ?? dashboard?.modules_with_progress ?? 0;
  const pct = dashboard?.curriculum_percent ?? (total > 0 ? Math.round((progress / total) * 100) : 0);
  const mentorName = dashboard?.mentor
    ? `${String(dashboard.mentor.preferred_name ?? dashboard.mentor.given_name ?? 'Mentor')} ${String(dashboard.mentor.family_name ?? '')}`.trim()
    : 'Unassigned';
  const activity = dashboard?.activity as Record<string, any> | undefined;
  const bible = activity?.bible?.enrollment;
  const notes = activity?.notes;
  const devotionals = activity?.devotionals;

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">KCA STUDENT</span>
          <h2>KCA Student Dashboard</h2>
          <p>Continue learning and track your formation journey.</p>
        </div>
        <div className="member-hero-actions">
          <Link className="site-button" href="/account/kca/modules">
            Continue Learning
          </Link>
          {dashboard?.is_mentor ? (
            <Link className="site-button secondary" href="/account/kca/mentees">
              My mentees
            </Link>
          ) : null}
        </div>
      </div>
      <section className="panel kca-progress">
        <header>
          <span>Module Progress</span>
          <strong>{pct}%</strong>
        </header>
        <i role="progressbar" aria-label="KCA progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <b style={{ width: `${pct}%` }} />
        </i>
        <small>
          {dashboard?.chapters_completed ?? 0}/{dashboard?.chapters_total ?? 0} chapters · {progress}/{total} lessons
        </small>
      </section>
      <div className="metric-grid">
        {[
          ['Modules', '/account/kca/modules', `${dashboard?.modules_with_progress ?? 0}/${dashboard?.modules_total ?? 0}`],
          ['Assignments', '/account/kca/assignments', String(dashboard?.assignments_open ?? 0)],
          ['Attendance', '/account/kca/attendance', String(dashboard?.attendance_recorded ?? 0)],
          ['Mentor', '/account/kca/mentor', mentorName],
          ['Bible plan', '/bible', bible ? `${bible.percent ?? 0}%` : 'Not enrolled'],
          ['Notes', '/account/kca', String(notes?.count ?? 0)],
          ['Devotionals', '/press/devotionals', String(devotionals?.count ?? 0)],
        ].map(([label, href, value]) => (
          <Link href={href} key={label} style={{ textDecoration: 'none' }}>
            <article>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          </Link>
        ))}
      </div>
      {Array.isArray(notes?.recent) && notes.recent.length > 0 ? (
        <section className="panel">
          <h3>Study notes</h3>
          {notes.recent.slice(0, 5).map((note: JsonObject) => (
            <div className="list-row" key={String(note.id)}>
              <div>
                <b>{String(note.title ?? 'Untitled note')}</b>
                <small>{String(note.body ?? '').slice(0, 160)}</small>
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {Array.isArray(devotionals?.recent) && devotionals.recent.length > 0 ? (
        <section className="panel">
          <h3>Devotionals</h3>
          {devotionals.recent.slice(0, 5).map((row: JsonObject) => (
            <div className="list-row" key={String(row.id)}>
              <div>
                <b>{String(row.title ?? 'Devotional')}</b>
                <small>{String(row.reflection ?? row.read_at ?? '')}</small>
              </div>
            </div>
          ))}
        </section>
      ) : null}
      {dashboard?.certificate ? (
        <Link className="panel" href="/account/kca/certificate" style={{ display: 'block', textDecoration: 'none' }}>
          <span className="eyebrow">CERTIFICATE</span>
          <h3>Certificate on file</h3>
          <p>Number: {String(dashboard.certificate.certificate_number ?? dashboard.certificate.id ?? '—')}</p>
        </Link>
      ) : null}
    </>
  );
}

function KcaFixtureDashboard() {
  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">KCA STUDENT</span>
          <h2>KCA Student Dashboard</h2>
          <p>Continue learning and track your formation journey.</p>
        </div>
        <Link className="site-button" href="/account/kca/modules/foundations-of-faith">
          Continue Learning
        </Link>
      </div>
      <section className="panel kca-progress">
        <header>
          <span>Overall Progress</span>
          <strong>68%</strong>
        </header>
        <i role="progressbar" aria-label="KCA progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={68}>
          <b style={{ width: '68%' }} />
        </i>
        <small>Foundations of Faith in progress · Keep going</small>
      </section>
      <div className="metric-grid">
        {[
          ['Modules', '/account/kca/modules', '4/12'],
          ['Assignments', '/account/kca/assignments', '2 Due'],
          ['Attendance', '/account/kca/attendance', '92%'],
          ['Mentor', '/account/kca/mentor', 'Active'],
        ].map(([label, href, value]) => (
          <Link href={href} key={label} style={{ textDecoration: 'none' }}>
            <article>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          </Link>
        ))}
      </div>
    </>
  );
}

function KcaModulesList() {
  if (designFixturesEnabled()) {
    return (
      <section className="panel table-panel">
        {kcaModules.map((module) => (
          <div className="list-row rich-row" key={module.title}>
            <Link href={module.href} style={{ display: 'contents' }}>
              <span className="thumb">{module.icon}</span>
              <div>
                <b>{module.title}</b>
                <small>{module.body}</small>
              </div>
            </Link>
            <Link className="ghost-link" href={module.href}>
              {module.action ?? 'Continue'}
            </Link>
          </div>
        ))}
      </section>
    );
  }
  return <KcaLiveModulesList />;
}

function KcaLiveModulesList() {
  const list = useAsyncList(async () => ({ data: await fetchKcaModules() }), []);
  if (list.status === 'error') return <KcaUnavailable title="My Modules" message={list.message} />;
  if (list.status !== 'ready') return <DataStatus state={list} emptyLabel="No active KCA modules published." />;

  return (
    <section className="panel table-panel">
      {list.items.map((module: KcaModuleSummary) => {
        const href = `/account/kca/modules/${module.id ?? ''}`;
        return (
          <div className="list-row rich-row" key={module.id ?? module.code}>
            <Link href={href} style={{ display: 'contents' }}>
              <span className="thumb">📘</span>
              <div>
                <b>{module.title ?? 'Untitled module'}</b>
                <small>
                  Module {module.sequence ?? '—'}
                  {module.lessons_count != null ? ` · ${module.lessons_count} lessons` : ''}
                </small>
              </div>
            </Link>
            <Link className="ghost-link" href={href}>
              Open
            </Link>
          </div>
        );
      })}
    </section>
  );
}

function KcaAssignmentsList() {
  if (designFixturesEnabled()) {
    return (
      <section className="panel table-panel">
        {kcaAssignments.map((item) => (
          <div className="list-row rich-row" key={item.title}>
            <Link href={item.href} style={{ display: 'contents' }}>
              <span className="thumb">{item.icon}</span>
              <div>
                <b>{item.title}</b>
                <small>{item.body}</small>
              </div>
            </Link>
            {item.status ? <span className="status">{item.status}</span> : <span />}
          </div>
        ))}
      </section>
    );
  }
  return <KcaLiveAssignmentsList />;
}

function KcaLiveAssignmentsList() {
  const [state, setState] = useState<AsyncListState<KcaAssignmentSummary>>({ status: 'loading' });
  useEffect(() => {
    let cancelled = false;
    void fetchKcaAssignments()
      .then((items) => {
        if (cancelled) return;
        setState(items.length ? { status: 'ready', items } : { status: 'empty', message: 'No assignments yet.' });
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: formatUserApiError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'error') return <KcaUnavailable title="My Assignments" message={state.message} />;
  if (state.status !== 'ready') return <DataStatus state={state} emptyLabel="No assignments for your enrollment." />;

  return (
    <section className="panel table-panel">
      {state.items.map((item) => {
        const href = item.id ? `/account/kca/assignments/${item.id}` : '/account/kca/assignments';
        return (
          <div className="list-row rich-row" key={item.id ?? item.title}>
            <Link href={href} style={{ display: 'contents' }}>
              <span className="thumb">📝</span>
              <div>
                <b>{item.title}</b>
                <small>
                  {item.module?.title ?? 'Module'}
                  {item.due_at ? ` · Due ${item.due_at}` : ''}
                </small>
              </div>
            </Link>
            <span className="status">{item.state ?? 'assigned'}</span>
            <Link className="ghost-link" href={href}>
              Open
            </Link>
          </div>
        );
      })}
    </section>
  );
}

function KcaMentorPanel() {
  if (designFixturesEnabled()) {
    return (
      <div className="split-panel">
        <section className="panel">
          <h3>Mentor Chat</h3>
          <p>Fixture mentor chat is design-only.</p>
        </section>
      </div>
    );
  }
  return <KcaLiveMentorPanel />;
}

function KcaLiveMentorPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ assigned?: boolean; mentor?: Record<string, unknown> | null; message?: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaMentor()
      .then((data) => {
        if (!cancelled) {
          setPayload(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatUserApiError(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <p className="panel">Loading mentor…</p>;
  if (error) return <KcaUnavailable title="KCA Mentor" message={error} />;

  const mentor = payload?.mentor;
  const name = mentor
    ? `${String(mentor.preferred_name ?? mentor.given_name ?? 'Mentor')} ${String(mentor.family_name ?? '')}`.trim()
    : 'Unassigned';

  return (
    <div className="split-panel">
      <section className="panel">
        <h3>Mentor</h3>
        {payload?.assigned ? (
          <p>
            Your mentor is <b>{name}</b>. Pastoral chat remains gated under OD-008 — use in-app messages when approved.
          </p>
        ) : (
          <p>{payload?.message ?? 'No mentor is currently assigned.'}</p>
        )}
      </section>
      <aside className="panel side-card">
        <h3>Your Mentor</h3>
        <div className="mini-art">🙏</div>
        <b>{name}</b>
        <Link className="site-button" href="/account/kca">
          Back to Dashboard
        </Link>
      </aside>
    </div>
  );
}

function KcaAttendanceList() {
  if (designFixturesEnabled()) {
    const sessions = [
      ['Foundations Live Session', 'May 12 · Present', '100%'],
      ['Prayer Lab', 'May 19 · Present', '100%'],
    ];
    return (
      <section className="panel">
        <h3>Session Attendance</h3>
        {sessions.map(([title, meta, score]) => (
          <div className="activity" key={title}>
            <span>✓</span>
            <div>
              <b>{title}</b>
              <small>{meta}</small>
            </div>
            <em>{score}</em>
          </div>
        ))}
      </section>
    );
  }
  return <KcaLiveAttendanceList />;
}

function KcaLiveAttendanceList() {
  const [state, setState] = useState<AsyncListState<{ id?: string; status?: string; session_on?: string; lesson?: { title?: string } }>>({
    status: 'loading',
  });
  useEffect(() => {
    let cancelled = false;
    void fetchKcaAttendance()
      .then((items) => {
        if (cancelled) return;
        setState(
          items.length
            ? { status: 'ready', items: items as Array<{ id?: string; status?: string; session_on?: string; lesson?: { title?: string } }> }
            : { status: 'empty', message: 'No attendance recorded yet.' },
        );
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: formatUserApiError(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === 'error') return <KcaUnavailable title="KCA Attendance" message={state.message} />;
  if (state.status !== 'ready') return <DataStatus state={state} emptyLabel="No attendance recorded yet." />;

  return (
    <section className="panel">
      <h3>Session Attendance</h3>
      {state.items.map((row) => (
        <div className="activity" key={row.id ?? `${row.session_on}-${row.lesson?.title}`}>
          <span>✓</span>
          <div>
            <b>{row.lesson?.title ?? 'Session'}</b>
            <small>
              {row.session_on ?? '—'} · {row.status ?? 'recorded'}
            </small>
          </div>
        </div>
      ))}
      <Link className="site-button" href="/account/kca" style={{ marginTop: 18, display: 'inline-flex' }}>
        Back to Dashboard
      </Link>
    </section>
  );
}

function KcaModuleDetail({ route }: { route: SiteRoute }) {
  if (designFixturesEnabled()) {
    const module = kcaModules.find((item) => item.href === route.path) ?? kcaModules[0];
    return (
      <>
        <div className="welcome">
          <div>
            <span className="eyebrow">{module?.status ?? 'MODULE'}</span>
            <h2>{route.title}</h2>
            <p>{module?.body}</p>
          </div>
        </div>
      </>
    );
  }
  return <KcaLiveModuleDetail route={route} />;
}

function KcaLiveModuleDetail({ route }: { route: SiteRoute }) {
  const moduleId = pathEntityId(route.path) ?? route.path.split('/').pop() ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [module, setModule] = useState<KcaModuleSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaModule(moduleId)
      .then((data) => {
        if (!cancelled) {
          setModule(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatUserApiError(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [moduleId]);

  if (loading) return <p className="panel">Loading module…</p>;
  if (error || !module) return <KcaUnavailable title={route.title} message={error ?? 'Module not found.'} />;

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">KCA MODULE</span>
          <h2>
            {module.code ? `${module.code} · ` : ''}
            {module.title}
          </h2>
          <p>Published curriculum: Module → Lesson → Chapter.</p>
        </div>
        <Link className="site-button" href="/account/kca/modules">
          All Modules
        </Link>
      </div>
      <section className="panel">
        {(module.lessons ?? []).length === 0 ? (
          <p>No lessons published for this module yet.</p>
        ) : (
          module.lessons!.map((lesson) => (
            <div className="list-row" key={lesson.id ?? lesson.code}>
              <span className="thumb">▶</span>
              <div>
                <b>
                  {lesson.code ? `${lesson.code} · ` : ''}
                  {lesson.title}
                </b>
                <small>
                  Lesson {lesson.sequence ?? '—'}
                  {lesson.chapters_count ? ` · ${lesson.chapters_count} chapters` : ''}
                  {lesson.unlocked === false ? ' · Locked' : ''}
                </small>
                {lesson.unlocked !== false && (lesson.chapters ?? []).length > 0 ? (
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {lesson.chapters!.map((chapter) => (
                      <li key={chapter.id ?? chapter.code}>
                        {chapter.id ? (
                          <Link href={`/account/kca/chapters/${chapter.id}`}>
                            Chapter {chapter.sequence ?? ''} · {chapter.title}
                          </Link>
                        ) : (
                          <>
                            Chapter {chapter.sequence ?? ''} · {chapter.title}
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              {lesson.id && lesson.unlocked !== false ? (
                <Link className="ghost-link" href={`/account/kca/lessons/${lesson.id}`}>
                  Open
                </Link>
              ) : null}
            </div>
          ))
        )}
      </section>
    </>
  );
}

function KcaLessonPlayer({ route }: { route: SiteRoute }) {
  const lessonId = pathEntityId(route.path) ?? route.path.split('/').pop() ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lesson, setLesson] = useState<KcaLessonDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaLesson(lessonId)
      .then((data) => {
        if (!cancelled) {
          setLesson(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatUserApiError(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function onComplete() {
    if (!lesson?.id) return;
    setBusy(true);
    setError(null);
    try {
      await completeKcaLesson(lesson.id, {
        acknowledged: true,
        unlockToken: lesson.unlock_token ?? undefined,
      });
      setDone(true);
    } catch (err) {
      setError(formatUserApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="panel">Loading lesson…</p>;
  if (error && !lesson) return <KcaUnavailable title={route.title} message={error} />;

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">KCA LESSON</span>
          <h2>{lesson?.title ?? route.title}</h2>
          <p>{lesson?.summary ?? 'Published lesson body from the API.'}</p>
        </div>
        <Link className="site-button" href="/account/kca/modules">
          Modules
        </Link>
      </div>
      {(lesson?.chapters ?? []).length > 0 ? (
        <section className="panel">
          <h3>Chapters</h3>
          {lesson!.chapters!.map((chapter) => (
            <div className="list-row" key={chapter.id ?? chapter.code}>
              <div>
                <b>
                  Chapter {chapter.sequence ?? ''} · {chapter.title}
                </b>
                <small>
                  {chapter.completed ? 'Completed' : chapter.unlocked === false ? 'Locked' : 'Open'}
                </small>
              </div>
              {chapter.id && chapter.unlocked !== false ? (
                <Link className="ghost-link" href={`/account/kca/chapters/${chapter.id}`}>
                  Open
                </Link>
              ) : null}
            </div>
          ))}
        </section>
      ) : (
        <section className="panel">
          {lesson?.content_url ? (
            <p>
              <a href={lesson.content_url} rel="noreferrer" target="_blank">
                Open linked resource
              </a>
            </p>
          ) : null}
          <div style={{ whiteSpace: 'pre-wrap' }}>{lesson?.body || 'This lesson has no body yet.'}</div>
          {error ? <p role="alert">{error}</p> : null}
          {done ? <p>Lesson marked complete.</p> : null}
          <button className="site-button" type="button" disabled={busy || done} onClick={() => void onComplete()}>
            {busy ? 'Saving…' : 'Mark complete'}
          </button>
        </section>
      )}
      {lesson?.id ? <KcaStudyNoteForm lessonId={lesson.id} /> : null}
    </>
  );
}

function KcaChapterPlayer({ route }: { route: SiteRoute }) {
  const chapterId = pathEntityId(route.path) ?? route.path.split('/').pop() ?? '';
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chapter, setChapter] = useState<KcaChapterSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaChapter(chapterId)
      .then((data) => {
        if (!cancelled) {
          setChapter(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(formatUserApiError(err));
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [chapterId]);

  async function onComplete() {
    if (!chapter?.id) return;
    setBusy(true);
    setError(null);
    try {
      await completeKcaChapter(chapter.id, { acknowledged: true });
      setDone(true);
    } catch (err) {
      setError(formatUserApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="panel">Loading chapter…</p>;
  if (error && !chapter) return <KcaUnavailable title={route.title} message={error} />;

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">KCA CHAPTER</span>
          <h2>{chapter?.title ?? route.title}</h2>
          <p>{chapter?.summary ?? 'Read this chapter, then continue.'}</p>
        </div>
        {chapter && 'lesson_id' in chapter && chapter.lesson_id ? (
          <Link className="site-button" href={`/account/kca/lessons/${String(chapter.lesson_id)}`}>
            Lesson
          </Link>
        ) : (
          <Link className="site-button" href="/account/kca/modules">
            Modules
          </Link>
        )}
      </div>
      <section className="panel">
        {chapter?.content_url ? (
          <p>
            <a href={chapter.content_url} rel="noreferrer" target="_blank">
              Open linked resource
            </a>
          </p>
        ) : null}
        <div style={{ whiteSpace: 'pre-wrap' }}>{chapter?.body || 'This chapter has no body yet.'}</div>
        {error ? <p role="alert">{error}</p> : null}
        {done ? <p>Chapter marked complete.</p> : null}
        <button className="site-button" type="button" disabled={busy || done} onClick={() => void onComplete()}>
          {busy ? 'Saving…' : 'Mark chapter complete'}
        </button>
      </section>
      {chapter?.id ? <KcaStudyNoteForm chapterId={chapter.id} /> : null}
    </>
  );
}

function KcaStudyNoteForm({ lessonId, chapterId }: { lessonId?: string; chapterId?: string }) {
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!body.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await createKcaStudyNote({ title: title.trim() || undefined, body: body.trim(), lessonId, chapterId });
      setBody('');
      setTitle('');
      setMessage('Note saved to your KCA dashboard.');
    } catch (err) {
      setError(formatUserApiError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel">
      <h3>Study notes</h3>
      <form onSubmit={(event) => void onSubmit(event)}>
        <label>
          Title
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Note
          <textarea value={body} onChange={(event) => setBody(event.target.value)} required rows={4} />
        </label>
        <button className="site-button" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save note'}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}

function KcaAssignmentDetail({ route }: { route: SiteRoute }) {
  const assignmentId = pathEntityId(route.path) ?? route.path.split('/').pop() ?? '';
  const [title, setTitle] = useState(route.title);
  const [stateLabel, setStateLabel] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<KcaAssignmentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [soulName, setSoulName] = useState('');
  const [soulFamily, setSoulFamily] = useState('');
  const [soulParent, setSoulParent] = useState('');

  useEffect(() => {
    let cancelled = false;
    void fetchKcaAssignment(assignmentId)
      .then((row) => {
        if (cancelled) return;
        setAssignment(row);
        setTitle(row.title ?? route.title);
        setStateLabel(row.state ?? null);
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err));
      });
    return () => {
      cancelled = true;
    };
  }, [assignmentId, route.title]);

  async function reloadAssignment() {
    const row = await fetchKcaAssignment(assignmentId);
    setAssignment(row);
    setStateLabel(row.state ?? null);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('evidence') as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      setError('Choose a file to upload as evidence.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('purpose', 'kca.evidence');
      form.set('classification', 'confidential');
      const asset = await storeUserFile(form);
      const assetId = asset.id ?? asset.public_id;
      if (!assetId) throw new Error('File upload did not return an id.');
      await submitKcaEvidence(assignmentId, assetId);
      setMessage('Evidence submitted.');
      setStateLabel('submitted');
    } catch (err) {
      setError(formatUserApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function onSoul(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!soulName.trim()) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await recordKcaSoulWin(assignmentId, {
        given_name: soulName.trim(),
        family_name: soulFamily.trim() || undefined,
        parent_id: soulParent.trim() || undefined,
      });
      setSoulName('');
      setSoulFamily('');
      setSoulParent('');
      setMessage('Soul recorded.');
      await reloadAssignment();
    } catch (err) {
      setError(formatUserApiError(err));
    } finally {
      setBusy(false);
    }
  }

  if (error && !stateLabel) return <KcaUnavailable title={route.title} message={error} />;
  const tree = assignment?.soul_tree;
  const soulOpen = tree?.open === true;

  return (
    <section className="panel">
      <h2>{title}</h2>
      <p>Status: {stateLabel ?? 'assigned'}</p>
      {tree ? (
        <>
          <p>
            Soul-winning tree: {tree.recorded_souls ?? 0}/{tree.required_souls ?? 0} souls
            {tree.levels?.length ? ` · levels ${tree.levels.join(' → ')}` : ''}
            {soulOpen ? ' · Open until the tree is complete' : ' · Tree complete'}
          </p>
          <SoulTreeList nodes={tree.tree ?? []} />
          {soulOpen ? (
            <form onSubmit={(event) => void onSoul(event)}>
              <label>
                Given name
                <input value={soulName} onChange={(event) => setSoulName(event.target.value)} required />
              </label>
              <label>
                Family name
                <input value={soulFamily} onChange={(event) => setSoulFamily(event.target.value)} />
              </label>
              <label>
                Parent soul id (blank for people you won)
                <input value={soulParent} onChange={(event) => setSoulParent(event.target.value)} placeholder="Leave blank for your direct souls" />
              </label>
              <button className="site-button" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Record soul'}
              </button>
            </form>
          ) : null}
        </>
      ) : null}
      <form onSubmit={(event) => void onSubmit(event)}>
        <label>
          Evidence file
          <input name="evidence" type="file" required={!soulOpen} disabled={soulOpen} />
        </label>
        <button className="site-button" type="submit" disabled={busy || soulOpen}>
          {soulOpen ? 'Complete the soul tree first' : busy ? 'Submitting…' : 'Submit evidence'}
        </button>
      </form>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p role="status">{message}</p> : null}
    </section>
  );
}

function SoulTreeList({ nodes }: { nodes: Array<JsonObject> }) {
  if (nodes.length === 0) return <p>No souls recorded yet.</p>;
  return (
    <ul>
      {nodes.map((node) => (
        <li key={String(node.id)}>
          {String(node.given_name ?? '')} {String(node.family_name ?? '')}{' '}
          <small>({String(node.id)})</small>
          {Array.isArray(node.children) && node.children.length > 0 ? (
            <SoulTreeList nodes={node.children as Array<JsonObject>} />
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function KcaMenteesPanel() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<JsonObject>>([]);
  const [selected, setSelected] = useState<JsonObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaMentees()
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatUserApiError(err));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') return <p className="panel">Loading mentees…</p>;
  if (state === 'error') return <KcaUnavailable title="My mentees" message={error ?? undefined} />;

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">KCA MENTOR</span>
          <h2>Mentee reports</h2>
          <p>Module progress, assignments, Bible reading, devotionals, and study notes.</p>
        </div>
      </div>
      <section className="panel table-panel">
        {rows.length === 0 ? <p>No mentees are assigned to you.</p> : null}
        {rows.map((row) => {
          const id = String(row.enrollment_id ?? '');
          const person = (row.person as JsonObject | undefined) ?? {};
          return (
            <div className="list-row" key={id}>
              <div>
                <b>{String(person.name ?? 'Student')}</b>
                <small>
                  Curriculum {String(row.curriculum_percent ?? 0)}% · Assignments open {String(row.assignments_open ?? 0)} ·
                  Notes {String(row.notes_count ?? 0)} · Devotionals {String(row.devotionals_count ?? 0)}
                  {row.bible_percent != null ? ` · Bible ${String(row.bible_percent)}%` : ''}
                </small>
              </div>
              {id ? (
                <button
                  className="ghost-link"
                  type="button"
                  onClick={() => {
                    void fetchKcaMentee(id).then(setSelected).catch((err) => setError(formatUserApiError(err)));
                  }}
                >
                  Open report
                </button>
              ) : null}
            </div>
          );
        })}
      </section>
      {selected ? (
        <section className="panel">
          <h3>{String((selected.person as JsonObject | undefined)?.name ?? 'Mentee report')}</h3>
          <p>Curriculum {String((selected.curriculum as JsonObject | undefined)?.percent ?? 0)}%</p>
          <p>Assignments open {String((selected.assignments as JsonObject | undefined)?.open ?? 0)}</p>
          <p>Notes {String((selected.notes as JsonObject | undefined)?.count ?? 0)}</p>
          <p>Devotionals {String((selected.devotionals as JsonObject | undefined)?.count ?? 0)}</p>
        </section>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </>
  );
}

function AccountMessagesPanel({ route }: { route: SiteRoute }) {
  const [listState, setListState] = useState<AsyncListState<UserMessageConversation>>({ status: 'loading' });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UserMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [composeParticipants, setComposeParticipants] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composing, setComposing] = useState(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setListState({ status: 'loading' });
    void fetchUserMessageConversations()
      .then((items) => {
        if (cancelled) return;
        if (!items.length) setListState({ status: 'empty', message: 'No conversations yet.' });
        else setListState({ status: 'ready', items });
      })
      .catch((error) => {
        if (cancelled) return;
        setListState({ status: 'error', message: formatUserApiError(error, 'Unable to load conversations.') });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setMessagesError(null);
      return;
    }
    let cancelled = false;
    setMessagesLoading(true);
    setMessagesError(null);
    void fetchUserConversationMessages(activeId)
      .then((items) => {
        if (!cancelled) setMessages(items);
      })
      .catch((error) => {
        if (!cancelled) setMessagesError(formatUserApiError(error, 'Unable to load messages.'));
      })
      .finally(() => {
        if (!cancelled) setMessagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  const sendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!activeId) return;
    const body = reply.trim();
    if (!body) {
      setSendError('Enter a message before sending.');
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const created = await sendUserConversationMessage(activeId, body);
      setMessages((prev) => [...prev, created]);
      setReply('');
    } catch (error) {
      setSendError(formatUserApiError(error, 'Unable to send message.'));
    } finally {
      setSending(false);
    }
  };

  const composeThread = async (event: FormEvent) => {
    event.preventDefault();
    const participant_person_ids = composeParticipants
      .split(/[\s,]+/)
      .map((id) => id.trim())
      .filter((id) => ULID_RE.test(id));
    const first_message = composeBody.trim();
    if (!participant_person_ids.length) {
      setComposeError('Enter at least one participant person ULID to start a thread.');
      return;
    }
    if (!first_message) {
      setComposeError('Enter a first message.');
      return;
    }
    setComposing(true);
    setComposeError(null);
    try {
      const created = await createUserMessageConversation({
        participant_person_ids,
        first_message,
        subject: composeSubject.trim() || null,
      });
      const id = created.id ?? created.public_id ?? '';
      setListState((prev) => {
        const items = prev.status === 'ready' ? prev.items : [];
        return { status: 'ready', items: [created, ...items] };
      });
      if (id) setActiveId(id);
      setComposeBody('');
      setComposeSubject('');
      setComposeOpen(false);
    } catch (error) {
      setComposeError(formatUserApiError(error, 'Unable to start a conversation.'));
    } finally {
      setComposing(false);
    }
  };

  return (
    <>
      <div className="welcome messages-hero">
        <div>
          <span className="eyebrow">MESSAGES</span>
          <h2>{route.title}</h2>
          <p>Connect with your Family House community through secure, in-app conversations.</p>
        </div>
        <button className="site-button" type="button" onClick={() => setComposeOpen((value) => !value)}>
          {composeOpen ? 'Close composer' : '+ New message'}
        </button>
      </div>
      <div className="messages-layout">
        <section className="panel messages-inbox">
          <header className="messages-panel-head">
            <div><h3>Conversations</h3><small>{listState.status === 'ready' ? `${listState.items.length} conversation${listState.items.length === 1 ? '' : 's'}` : 'Your inbox'}</small></div>
            <span className="messages-head-icon">💬</span>
          </header>
          <label className="messages-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search conversations" aria-label="Search conversations" /></label>
          {composeOpen ? <form className="message-compose" onSubmit={composeThread}>
            <header><strong>Start a conversation</strong><button type="button" onClick={() => setComposeOpen(false)} aria-label="Close composer">×</button></header>
            <label>
              Participant person ID(s)
              <input
                value={composeParticipants}
                onChange={(event) => setComposeParticipants(event.target.value)}
                placeholder="Enter person ULID, separated by commas"
              />
            </label>
            <label>
              Subject (optional)
              <input value={composeSubject} onChange={(event) => setComposeSubject(event.target.value)} />
            </label>
            <label className="wide">
              First message
              <textarea rows={3} value={composeBody} onChange={(event) => setComposeBody(event.target.value)} />
            </label>
            {composeError ? <p className="panel">{composeError}</p> : null}
            <button className="site-button" type="submit" disabled={composing}>
              {composing ? 'Starting…' : 'Start conversation'}
            </button>
          </form> : null}
          {listState.status === 'loading' ? <div className="messages-empty"><span>◌</span><b>Loading conversations…</b></div> : null}
          {listState.status === 'error' ? <div className="messages-empty is-error"><span>!</span><b>{listState.message}</b></div> : null}
          {listState.status === 'empty' ? <div className="messages-empty"><span>💬</span><b>No messages yet</b><small>Start a conversation to connect with someone in your community.</small></div> : null}
          {listState.status === 'ready'
            ? listState.items.filter((conversation) => (conversation.subject ?? 'Conversation').toLowerCase().includes(query.toLowerCase())).map((conversation) => {
                const id = conversation.id ?? conversation.public_id ?? '';
                return (
                  <button
                    className={`list-row message-thread-row ${activeId === id ? 'active' : ''}`}
                    key={id || conversation.subject}
                    type="button"
                    onClick={() => setActiveId(id || null)}
                  >
                    <span className="message-avatar">{(conversation.subject ?? 'C').slice(0, 2).toUpperCase()}</span>
                    <div>
                      <b>{conversation.subject ?? 'Conversation'}</b>
                      <small>{(conversation.participant_ids ?? []).length ? `${conversation.participant_ids!.length} participant${conversation.participant_ids!.length === 1 ? '' : 's'} · ` : ''}{conversation.updated_at ?? conversation.created_at ?? 'New conversation'}</small>
                    </div>
                    <em>{activeId === id ? 'Open' : '›'}</em>
                  </button>
                );
              })
            : null}
        </section>
        <section className="panel messages-thread">
          {!activeId ? <div className="messages-empty thread-placeholder"><span>✦</span><h3>Select a conversation</h3><small>Choose a conversation from your inbox to read and reply.</small></div> : <>
          <header className="messages-panel-head"><div><h3>{listState.status === 'ready' ? listState.items.find((item) => (item.id ?? item.public_id) === activeId)?.subject ?? 'Conversation' : 'Conversation'}</h3><small>Secure in-app messages</small></div><span className="message-avatar">💬</span></header>
          <div className="message-bubbles">
          {messagesLoading ? <p>Loading messages…</p> : null}
          {messagesError ? <p className="message-error">{messagesError}</p> : null}
          {!messagesLoading && !messagesError && messages.length === 0 ? <div className="messages-empty compact"><span>💬</span><b>No messages yet</b><small>Send the first reply below.</small></div> : null}
          {messages.map((message) => (
            <div className="message-bubble" key={message.id ?? message.created_at}>
              <div>
                <b>{message.sender_person_id ?? 'Participant'}</b>
                <p>{message.body}</p>
                <small>{message.created_at ?? ''}</small>
              </div>
            </div>
          ))}
          </div>
          {activeId ? (
            <form className="message-reply" onSubmit={sendReply}>
              <label>
                <span className="sr-only">Write a reply</span>
                <textarea name="body" rows={2} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a message…" />
              </label>
              {sendError ? <p className="panel">{sendError}</p> : null}
              <button className="site-button" type="submit" disabled={sending} aria-label="Send message">
                {sending ? '…' : '↑'} <span>Send</span>
              </button>
            </form>
          ) : null}
          </>}
        </section>
      </div>
    </>
  );
}

function AccountNotificationsPanel({ route }: { route: SiteRoute }) {
  const [state, setState] = useState<AsyncListState<UserNotification>>({ status: 'loading' });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = () => {
    setState({ status: 'loading' });
    return fetchUserNotifications()
      .then((items) => {
        if (!items.length) setState({ status: 'empty', message: 'No notifications yet.' });
        else setState({ status: 'ready', items });
      })
      .catch((error) => {
        setState({ status: 'error', message: formatUserApiError(error, 'Unable to load notifications.') });
      });
  };

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    void fetchUserNotifications()
      .then((items) => {
        if (cancelled) return;
        if (!items.length) setState({ status: 'empty', message: 'No notifications yet.' });
        else setState({ status: 'ready', items });
      })
      .catch((error) => {
        if (cancelled) return;
        setState({ status: 'error', message: formatUserApiError(error, 'Unable to load notifications.') });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const markRead = async (notificationId: string) => {
    setBusyId(notificationId);
    setActionError(null);
    try {
      const updated = await markUserNotificationRead(notificationId);
      setState((prev) => {
        if (prev.status !== 'ready') return prev;
        return {
          status: 'ready',
          items: prev.items.map((item) => {
            const id = item.id ?? item.public_id;
            return id === notificationId ? { ...item, ...updated, id: updated.id ?? updated.public_id ?? id } : item;
          }),
        };
      });
    } catch (error) {
      setActionError(formatUserApiError(error, 'Unable to mark notification as read.'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">NOTIFICATIONS</span>
          <h2>{route.title}</h2>
          <p>Alerts delivered to your account. Mark unread items as read when you have reviewed them.</p>
        </div>
        <button className="site-button secondary" type="button" onClick={() => void reload()}>
          Refresh
        </button>
      </div>
      <section className="panel">
        <DataStatus state={state} emptyLabel="No notifications yet." />
        {actionError ? <p>{actionError}</p> : null}
        {state.status === 'ready'
          ? state.items.map((notification) => {
              const id = notification.id ?? notification.public_id ?? '';
              const unread = !notification.read_at;
              return (
                <div className="list-row rich-row" key={id || notification.title}>
                  <span className="thumb">🔔</span>
                  <div>
                    <b>{notification.title ?? 'Notification'}</b>
                    <small>{notification.body ?? notification.created_at ?? ''}</small>
                  </div>
                  <span className="status">{unread ? 'Unread' : 'Read'}</span>
                  {unread && id ? (
                    <button className="ghost-link" type="button" disabled={busyId === id} onClick={() => void markRead(id)}>
                      {busyId === id ? 'Saving…' : 'Mark read'}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              );
            })
          : null}
      </section>
    </>
  );
}

function Dashboard({ route }: { route: SiteRoute }) {
  if (route.path === '/account/kca') return <KcaStudentDashboard />;
  if (route.path === '/account/kca/modules') return <KcaModulesList />;
  if (route.path === '/account/kca/assignments') return <KcaAssignmentsList />;
  if (route.path === '/account/kca/mentor') return <KcaMentorPanel />;
  if (route.path === '/account/kca/mentees') return <KcaMenteesPanel />;
  if (route.path === '/account/kca/attendance') return <KcaAttendanceList />;
  if (route.path.startsWith('/account/kca/modules/')) return <KcaModuleDetail route={route} />;
  if (route.path.startsWith('/account/kca/assignments/')) return <KcaAssignmentDetail route={route} />;
  if (route.path.startsWith('/account/kca/lessons/')) return <KcaLessonPlayer route={route} />;
  if (route.path.startsWith('/account/kca/chapters/')) return <KcaChapterPlayer route={route} />;
  if (route.path === '/account/kca/certificate') return <LiveCertificateDocument route={route} />;
  if (route.path === '/account/kca/orientation') return <KcaOrientationMember />;
  if (route.path === '/account/kca/practical-service') return <KcaPracticalServiceMember />;
  if (route.path === '/account/kca/directory') return <KcaDirectoryMember />;
  if (route.path.startsWith('/account/kca')) {
    if (!designFixturesEnabled()) {
      const message = route.path.includes('/certificate')
        ? undefined
        : route.path.includes('/lessons/')
          ? undefined
          : undefined;
      return <KcaUnavailable title={route.title} message={message} />;
    }
    return (
      <>
        <div className="welcome">
          <div>
            <span className="eyebrow">KCA STUDENT</span>
            <h2>{route.title}</h2>
            <p>Continue learning and track your formation journey.</p>
          </div>
          <Link className="site-button" href="/account/kca">
            Back to Dashboard
          </Link>
        </div>
        <CardGrid cards={kcaModules.slice(0, 4)} />
      </>
    );
  }

  if (route.path === '/account/church') return <LiveMyChurchPage route={route} />;
  if (route.path === '/account/home-church') return <LiveMyHomeChurchPage route={route} />;
  if (route.path === '/account/groups' || route.path.startsWith('/account/groups/')) return <LiveGroupsPage route={route} />;
  if (route.path === '/account/announcements') return <LiveAnnouncementsPage route={route} />;
  if (route.path === '/account/documents') return <LiveDocumentsPage route={route} />;
  if (route.path.startsWith('/account/mission')) return <LiveMissionMemberPage route={route} />;
  if (route.path === '/account/events') return <LiveMyEventsPage route={route} />;
  if (route.path === '/account/journey' || route.path.startsWith('/account/journey/')) return <LiveJourneyPage route={route} />;
  if (route.path === '/account/ministries' || route.path === '/account/ministry-history') {
    return <LiveMinistriesPage route={route} />;
  }
  if (route.path === '/account/spiritual-growth') return <LiveSpiritualGrowthPage route={route} />;
  if (route.path === '/account/attendance') return <LiveAttendancePage route={route} />;
  if (route.path === '/account/testimonies') return <LiveTestimoniesPage route={route} />;
  if (route.path === '/account/applications/home-church') return <LiveHomeChurchApplicationPage route={route} />;

  if (route.path === '/account/prayer-requests' || route.path === '/account/need-requests') {
    const newHref = route.path.includes('need') ? '/account/need-requests/new' : '/account/prayer-requests/new';
    return (
      <>
        <div className="welcome">
          <div>
            <span className="eyebrow">{route.path.includes('need') ? 'PASTORAL NEEDS' : 'PRAYER'}</span>
            <h2>{route.title}</h2>
            <p>Live requests from your Family House account.</p>
          </div>
          <Link className="site-button" href={newHref}>
            {route.action ?? 'New request'}
          </Link>
        </div>
        <Listing route={{ ...route, kind: 'listing' }} />
      </>
    );
  }
  if (route.path === '/account/messages') {
    return <AccountMessagesPanel route={route} />;
  }
  if (route.path === '/account/notifications') {
    return <AccountNotificationsPanel route={route} />;
  }
  if (route.path === '/account/downloads') {
    return (
      <>
        <div className="welcome">
          <div>
            <span className="eyebrow">DOWNLOADS</span>
            <h2>{route.title}</h2>
            <p>Store a file on your account. Publication downloads stay on each Press book page.</p>
          </div>
        </div>
        <LiveFileUploadPanel title="Account files" />
      </>
    );
  }

  return <MemberHomePage />;
}

const PREFERENCE_CHANNELS = [
  { id: 'email', label: 'Email notifications' },
  { id: 'sms', label: 'SMS notifications' },
  { id: 'in_app', label: 'In-app alerts' },
  { id: 'push', label: 'Push notifications' },
] as const;

function FixtureSettings({ route }: { route: SiteRoute }) {
  const [saved, setSaved] = useState(false);
  return (
    <div className="settings-panel">
      <section className="panel">
        <h3>{route.title}</h3>
        <p>Manage your personal information, preferences, and account security.</p>
        {['Email notifications', 'SMS notifications', 'Login alerts', 'Church announcements', 'Event reminders'].map((item, index) => (
          <label className="setting-row" key={item}>
            <span>
              <b>{item}</b>
              <small>Keep your account and journey up to date.</small>
            </span>
            <input type="checkbox" defaultChecked={index < 4} />
          </label>
        ))}
        <button className="site-button" onClick={() => setSaved(true)} type="button">
          {saved ? 'Changes Saved ✓' : (route.action ?? 'Save Changes')}
        </button>
      </section>
      <aside className="panel profile-card">
        <span className="avatar huge">JD</span>
        <h3>John Chinedu Doe</h3>
        <p>Member · Lagos, Nigeria</p>
        <span className="status">Verified</span>
      </aside>
    </div>
  );
}

function formatTimestamp(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function LiveProfilePanel({ user }: { user: CurrentUser }) {
  const { t } = useLocale();
  const name = displayNameFromUser(user);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    const fileId = user.profile.avatar_file_id?.trim();
    if (!fileId) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void downloadUserFile(fileId)
      .then(async (response) => {
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setAvatarUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user.profile.avatar_file_id]);

  return (
    <aside className="panel profile-card">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="avatar huge" src={avatarUrl} alt="" style={{ objectFit: 'cover' }} />
      ) : (
        <span className="avatar huge" data-profile-avatar="initials">{initialsFromUser(user)}</span>
      )}
      <h3>{name}</h3>
      <p>{user.email}</p>
      <span className="status">{user.email_verified_at ? 'Verified' : 'Unverified'}</span>
      <dl style={{ marginTop: '1rem', textAlign: 'left' }}>
        <div>
          <dt>{t('account.givenName')}</dt>
          <dd>{user.profile.given_name ?? '-'}</dd>
        </div>
        <div>
          <dt>{t('account.familyName')}</dt>
          <dd>{user.profile.family_name ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('account.preferredName')}</dt>
          <dd>{user.profile.preferred_name ?? '—'}</dd>
        </div>
        <div>
          <dt>Person ID</dt>
          <dd>{user.person_id ?? 'Not linked'}</dd>
        </div>
      </dl>
    </aside>
  );
}

function LiveHelpSupport({ title }: { title: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadFaqs()
      .then((result) => {
        if (cancelled) return;
        setFaqs(result.data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(publicErrorMessage(err));
        setFaqs([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="settings-panel">
      <section className="panel">
        <h3>{title}</h3>
        <p>
          Answers from the published Family House FAQ, plus ways to reach your church and support team.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '1rem' }}>
          <Link href="/contact" className="site-button">
            Contact us
          </Link>
          <Link href="/messages" className="site-button">
            Messages
          </Link>
          <Link href="/account/settings/privacy" className="site-button">
            Privacy &amp; security
          </Link>
        </div>
      </section>
      <section className="panel">
        <h3>Frequently asked questions</h3>
        {loading ? <p>Loading FAQ…</p> : null}
        {error ? <p role="alert">{error}</p> : null}
        {!loading && faqs.length === 0 ? (
          <p>No FAQ items are published yet. Use Contact us for direct support.</p>
        ) : null}
        <div className="faq-list">
          {faqs.map((item) => (
            <details key={item.q} className="faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

/* profile avatar preview helper kept next to edit form */
function LiveProfileForm({
  user,
  onUpdated,
}: {
  user: CurrentUser;
  onUpdated?: (next: CurrentUser) => void;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!photo) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  useEffect(() => {
    const fileId = user.profile.avatar_file_id?.trim();
    if (!fileId) {
      setAvatarUrl(null);
      return;
    }
    let cancelled = false;
    let objectUrl: string | null = null;
    void downloadUserFile(fileId)
      .then(async (response) => {
        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);
        if (!cancelled) setAvatarUrl(objectUrl);
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(null);
      });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [user.profile.avatar_file_id]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      let avatarId = user.profile.avatar_file_id ?? null;
      if (photo) {
        const formData = new FormData();
        formData.set('file', photo);
        formData.set('purpose', 'profile.avatar');
        formData.set('classification', 'internal');
        const asset = await storeUserFile(formData);
        avatarId = asset.id ?? asset.public_id ?? null;
      }
      const updated = await updateUserProfile({
        given_name: String(values.get('given_name') ?? '').trim(),
        middle_name: String(values.get('middle_name') ?? '').trim() || null,
        family_name: String(values.get('family_name') ?? '').trim(),
        preferred_name: String(values.get('preferred_name') ?? '').trim() || null,
        ...(avatarId ? { avatar_file_asset_id: avatarId } : {}),
      });
      setPhoto(null);
      setMessage('Your profile has been updated.');
      onUpdated?.(updated);
    } catch (requestError) {
      setError(
        isRecentMfaRequiredError(requestError)
          ? 'Recent multi-factor authentication is required before changing your profile or photo.'
          : formatUserApiError(requestError, 'Unable to update your profile.'),
      );
    } finally {
      setBusy(false);
    }
  };

  const shownPhoto = previewUrl ?? avatarUrl;

  return (
    <form className="panel site-form" onSubmit={(event) => void submit(event)}>
      <h3>Edit profile</h3>
      <p>Update your name and photo. Profile and photo changes require recent multi-factor authentication.</p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
        {shownPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={shownPhoto}
            alt=""
            width={88}
            height={88}
            style={{ borderRadius: '999px', objectFit: 'cover', border: '2px solid #e5e7eb' }}
          />
        ) : (
          <span className="avatar huge" data-profile-avatar="initials">{initialsFromUser(user)}</span>
        )}
        <label className="site-button" style={{ cursor: 'pointer' }}>
          {shownPhoto ? 'Replace photo' : 'Upload photo'}
          <input
            accept="image/*"
            type="file"
            hidden
            onChange={(event) => {
              setPhoto(event.target.files?.[0] ?? null);
            }}
          />
        </label>
      </div>
      <div className="form-grid">
        <label>
          {t('account.givenName')}
          <input defaultValue={user.profile.given_name ?? ''} name="given_name" required key={`given-${user.profile.given_name}`} />
        </label>
        <label>
          {t('account.middleName')}
          <input defaultValue={user.profile.middle_name ?? ''} name="middle_name" key={`middle-${user.profile.middle_name}`} />
        </label>
        <label>
          {t('account.familyName')}
          <input defaultValue={user.profile.family_name ?? ''} name="family_name" required key={`family-${user.profile.family_name}`} />
        </label>
        <label>
          {t('account.preferredName')}
          <input defaultValue={user.profile.preferred_name ?? ''} name="preferred_name" key={`preferred-${user.profile.preferred_name}`} />
        </label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      <button className="site-button" disabled={busy} type="submit">
        {busy ? 'Saving…' : t('account.saveProfile')}
      </button>
    </form>
  );
}

function LivePreferencesForm({
  initial,
  actionLabel,
}: {
  initial: UserPreferences | null;
  actionLabel: string;
}) {
  const { locale: activeLocale, setLocale: applyLocale, t } = useLocale();
  const [locale, setLocale] = useState(initial?.locale ?? activeLocale);
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'UTC');
  const [channels, setChannels] = useState<string[]>(initial?.notification_channels ?? ['email', 'in_app']);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocale(initial?.locale ?? activeLocale);
    setTimezone(initial?.timezone ?? 'UTC');
    setChannels(initial?.notification_channels ?? ['email', 'in_app']);
  }, [initial, activeLocale]);

  function toggleChannel(id: string) {
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await updateUserPreferences({
        locale: locale.trim(),
        timezone: timezone.trim(),
        notification_channels: channels,
      });
      setLocale(updated.locale);
      applyLocale(updated.locale);
      setTimezone(updated.timezone);
      setChannels(updated.notification_channels);
      setMessage(t('account.preferencesSaved'));
    } catch (err) {
      setError(formatUserApiError(err, t('account.unableToSavePreferences')));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <h3>{t('account.preferences')}</h3>
      <p>{t('account.preferencesCopy')}</p>
      <label className="setting-row">
        <span>
          <b>{t('account.locale')}</b>
          <small>{t('account.localeHelp')}</small>
        </span>
        <select
          value={supportedLocales.includes(locale as (typeof supportedLocales)[number]) ? locale : activeLocale}
          onChange={(e) => {
            setLocale(e.target.value);
            applyLocale(e.target.value);
          }}
        >
          {supportedLocales.map((code) => (
            <option key={code} value={code}>
              {localeMeta[code].endonym}
            </option>
          ))}
        </select>
      </label>
      <label className="setting-row">
        <span>
          <b>{t('account.timezone')}</b>
          <small>{t('account.timezoneHelp')}</small>
        </span>
        <input value={timezone} onChange={(e) => setTimezone(e.target.value)} type="text" />
      </label>
      {PREFERENCE_CHANNELS.map((channel) => (
        <label className="setting-row" key={channel.id}>
          <span>
            <b>{channel.label}</b>
            <small>Channel code: {channel.id}</small>
          </span>
          <input
            type="checkbox"
            checked={channels.includes(channel.id)}
            onChange={() => toggleChannel(channel.id)}
          />
        </label>
      ))}
      {error ? <p>{error}</p> : null}
      {message ? <p>{message}</p> : null}
      <button className="site-button" disabled={saving || channels.length === 0} onClick={() => void onSave()} type="button">
        {saving ? t('common.saving') : actionLabel}
      </button>
    </section>
  );
}

function LiveSecurityInventory() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [sessions, setSessions] = useState<UserSecuritySession[]>([]);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setActionError(null);
    try {
      const [sessionList, deviceList] = await Promise.all([fetchUserSecuritySessions(), fetchUserDevices()]);
      setSessions(sessionList);
      setDevices(deviceList);
      setMfaRequired(false);
    } catch (err) {
      setSessions([]);
      setDevices([]);
      setMfaRequired(isRecentMfaRequiredError(err));
      setError(formatUserApiError(err, 'Unable to load security inventory.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onRevokeSession(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await revokeUserSecuritySession(id);
      await load();
    } catch (err) {
      setActionError(formatUserApiError(err, 'Unable to revoke session.'));
      if (isRecentMfaRequiredError(err)) setMfaRequired(true);
    } finally {
      setBusyId(null);
    }
  }

  async function onRevokeDevice(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await revokeUserDevice(id);
      await load();
    } catch (err) {
      setActionError(formatUserApiError(err, 'Unable to revoke device.'));
      if (isRecentMfaRequiredError(err)) setMfaRequired(true);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <p className="panel">Loading security sessions and devices…</p>;

  return (
    <div className="dashboard-grid">
      <section className="panel">
        <h3>Active sessions</h3>
        <p>GET /user/security/sessions — recent MFA required.</p>
        {error ? <p>{error}</p> : null}
        {mfaRequired ? (
          <p>
            Complete a recent MFA challenge, then <Link href="/account/settings/mfa">return here</Link> to manage sessions.
          </p>
        ) : null}
        {actionError ? <p>{actionError}</p> : null}
        {!error && sessions.length === 0 ? <p>No sessions returned.</p> : null}
        {sessions.map((session) => (
          <div className="activity" key={session.id}>
            <span>◎</span>
            <div>
              <b>{session.id}</b>
              <small>
                Started {formatTimestamp(session.started_at)} · Last seen {formatTimestamp(session.last_seen_at)}
                {session.device_id ? ` · Device ${session.device_id}` : ''}
                {session.revoked_at ? ` · Revoked ${formatTimestamp(session.revoked_at)}` : ''}
              </small>
            </div>
            {!session.revoked_at ? (
              <button
                className="ghost-button"
                disabled={busyId === session.id}
                onClick={() => void onRevokeSession(session.id)}
                type="button"
              >
                {busyId === session.id ? 'Revoking…' : 'Revoke'}
              </button>
            ) : (
              <em>Revoked</em>
            )}
          </div>
        ))}
      </section>
      <section className="panel">
        <h3>Devices</h3>
        <p>GET /user/security/devices — recent MFA required.</p>
        {!error && devices.length === 0 ? <p>No devices returned.</p> : null}
        {devices.map((device) => (
          <div className="activity" key={device.id}>
            <span>▣</span>
            <div>
              <b>{device.label || device.platform || device.device_type || device.id}</b>
              <small>
                {device.platform ?? '—'} · Last seen {formatTimestamp(device.last_seen_at)}
                {device.revoked_at ? ` · Revoked ${formatTimestamp(device.revoked_at)}` : ''}
              </small>
            </div>
            {!device.revoked_at ? (
              <button
                className="ghost-button"
                disabled={busyId === device.id}
                onClick={() => void onRevokeDevice(device.id)}
                type="button"
              >
                {busyId === device.id ? 'Revoking…' : 'Revoke'}
              </button>
            ) : (
              <em>Revoked</em>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}

function LiveConsentsPanel() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [consents, setConsents] = useState<UserConsent[]>([]);
  const [purpose, setPurpose] = useState('communications.email');
  const [policyVersion, setPolicyVersion] = useState('2026.08');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setConsents(await fetchUserConsents());
    } catch (err) {
      setConsents([]);
      setError(formatUserApiError(err, 'Unable to load consents.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onGrant() {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await grantUserConsent({ purpose: purpose.trim(), policy_version: policyVersion.trim() });
      setActionMessage('Consent recorded.');
      await load();
    } catch (err) {
      setActionError(formatUserApiError(err, 'Unable to grant consent.'));
    } finally {
      setBusy(false);
    }
  }

  async function onWithdraw(id: string) {
    setBusy(true);
    setActionError(null);
    setActionMessage(null);
    try {
      await withdrawUserConsent(id);
      setActionMessage('Consent withdrawn.');
      await load();
    } catch (err) {
      setActionError(formatUserApiError(err, 'Unable to withdraw consent.'));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="panel">Loading consents…</p>;

  return (
    <div className="settings-panel">
      <section className="panel">
        <h3>Your consents</h3>
        <p>GET /user/consents. Grant and withdraw require recent MFA.</p>
        {error ? <p>{error}</p> : null}
        {actionError ? <p>{actionError}</p> : null}
        {actionMessage ? <p>{actionMessage}</p> : null}
        {!error && consents.length === 0 ? <p>No consent records yet.</p> : null}
        {consents.map((consent) => (
          <div className="activity" key={consent.id}>
            <span>○</span>
            <div>
              <b>{consent.purpose}</b>
              <small>
                Policy {consent.policy_version} · Granted {formatTimestamp(consent.granted_at)}
                {consent.withdrawn_at ? ` · Withdrawn ${formatTimestamp(consent.withdrawn_at)}` : ''}
              </small>
            </div>
            {!consent.withdrawn_at ? (
              <button className="ghost-button" disabled={busy} onClick={() => void onWithdraw(consent.id)} type="button">
                Withdraw
              </button>
            ) : (
              <em>Withdrawn</em>
            )}
          </div>
        ))}
      </section>
      <section className="panel">
        <h3>Grant consent</h3>
        <label className="setting-row">
          <span>
            <b>Purpose</b>
            <small>e.g. communications.email</small>
          </span>
          <input value={purpose} onChange={(e) => setPurpose(e.target.value)} type="text" />
        </label>
        <label className="setting-row">
          <span>
            <b>Policy version</b>
            <small>e.g. 2026.08</small>
          </span>
          <input value={policyVersion} onChange={(e) => setPolicyVersion(e.target.value)} type="text" />
        </label>
        <button className="site-button" disabled={busy} onClick={() => void onGrant()} type="button">
          {busy ? 'Saving…' : 'Grant consent'}
        </button>
      </section>
    </div>
  );
}

function SettingsGap({ title, detail }: { title: string; detail: string }) {
  return (
    <section className="panel">
      <h3>{title}</h3>
      <p>{detail}</p>
    </section>
  );
}

function LiveDataSubjectRequestForm({
  title,
  defaultType,
}: {
  title: string;
  defaultType: DataSubjectRequestType;
}) {
  const [requestType, setRequestType] = useState<DataSubjectRequestType>(defaultType);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await submitUserDataSubjectRequest({
        request_type: requestType,
        idempotency_key: newClientKey('dsr'),
        notes: notes.trim() || null,
      });
      const id = result.id ?? result.public_id;
      setMessage(
        `Request ${result.request_type ?? requestType} submitted${id ? ` (${id})` : ''}${
          result.status ? ` · ${result.status}` : ''
        }.`,
      );
    } catch (err) {
      setError(
        isRecentMfaRequiredError(err)
          ? `${formatUserApiError(err, 'Recent MFA is required.')} Complete MFA, then retry.`
          : formatUserApiError(err, 'Unable to submit this privacy request.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h3>{title}</h3>
      <p>POST /user/privacy/data-subject-requests (MFA-gated). Success only after the API accepts the request.</p>
      <form onSubmit={(event) => void onSubmit(event)}>
        <label className="setting-row">
          <span>
            <b>Request type</b>
            <small>export, correction, deletion, or restriction</small>
          </span>
          <select value={requestType} onChange={(event) => setRequestType(event.target.value as DataSubjectRequestType)}>
            {DATA_SUBJECT_REQUEST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="setting-row">
          <span>
            <b>Notes</b>
            <small>Optional context for administrators</small>
          </span>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {error ? <p>{error}</p> : null}
        {message ? <p>{message}</p> : null}
        <button className="site-button" disabled={busy} type="submit">
          {busy ? 'Submitting…' : 'Submit privacy request'}
        </button>
      </form>
    </section>
  );
}

function LiveFileUploadPanel({ title = 'Files' }: { title?: string }) {
  const [purpose, setPurpose] = useState('member.upload');
  const [classification, setClassification] = useState<(typeof FILE_CLASSIFICATIONS)[number]>('internal');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [assets, setAssets] = useState<UserFileAsset[] | null>(null);
  const [listNote, setListNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchUserFiles()
      .then((items) => {
        if (!cancelled) setAssets(items);
      })
      .catch((err) => {
        if (!cancelled) setListNote(formatUserApiError(err, 'File list is not available yet.'));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set('file', file);
      formData.set('purpose', purpose.trim() || 'member.upload');
      formData.set('classification', classification);
      const asset = await storeUserFile(formData);
      const id = asset.id ?? asset.public_id;
      setMessage(`File stored${id ? ` (${id})` : ''}${asset.status ? ` · ${asset.status}` : ''}.`);
      setAssets((prev) => [asset, ...(prev ?? [])]);
      setFile(null);
    } catch (err) {
      setError(
        isRecentMfaRequiredError(err)
          ? `${formatUserApiError(err, 'Recent MFA is required to upload.')} Complete MFA, then retry.`
          : formatUserApiError(err, 'Unable to store this file.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="panel">
      <h3>{title}</h3>
      <p>POST /user/files — multipart upload (MFA-gated). Listing uses GET /user/files when available.</p>
      <form onSubmit={(event) => void onSubmit(event)}>
        <label className="setting-row">
          <span>
            <b>File</b>
            <small>Sent as the `file` field</small>
          </span>
          <input
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>
        <label className="setting-row">
          <span>
            <b>Purpose</b>
            <small>e.g. member.upload</small>
          </span>
          <input value={purpose} onChange={(event) => setPurpose(event.target.value)} type="text" />
        </label>
        <label className="setting-row">
          <span>
            <b>Classification</b>
          </span>
          <select
            value={classification}
            onChange={(event) => setClassification(event.target.value as (typeof FILE_CLASSIFICATIONS)[number])}
          >
            {FILE_CLASSIFICATIONS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {error ? <p>{error}</p> : null}
        {message ? <p>{message}</p> : null}
        {listNote ? <p>{listNote}</p> : null}
        <button className="site-button" disabled={busy} type="submit">
          {busy ? 'Uploading…' : 'Upload file'}
        </button>
      </form>
      {assets && assets.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          {assets.map((asset) => (
            <div className="list-row" key={asset.id ?? asset.public_id}>
              <div>
                <b>{asset.purpose ?? 'File'}</b>
                <small>
                  {asset.classification ?? '—'} · {asset.status ?? 'stored'} · {asset.detected_mime_type ?? 'unknown type'}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LiveSyncPanel() {
  const [cursor, setCursor] = useState('');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [changes, setChanges] = useState<UserSyncChange[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCheckpoint = async () => {
    const checkpoint = await fetchUserSyncCheckpoint();
    setCursor(checkpoint.cursor ?? '');
    setUpdatedAt(checkpoint.updated_at ?? null);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadCheckpoint()
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err, 'Unable to load sync checkpoint.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const onFetchChanges = async () => {
    if (!cursor.trim()) {
      setError('A since cursor is required (ISO-8601 timestamp from your checkpoint).');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await fetchUserSyncChanges(cursor.trim());
      setChanges(result.changes ?? []);
      setNextCursor(result.next_cursor ?? null);
      setMessage(`${(result.changes ?? []).length} change(s) since checkpoint.`);
    } catch (err) {
      setError(formatUserApiError(err, 'Unable to load sync changes.'));
    } finally {
      setBusy(false);
    }
  };

  const onSaveCheckpoint = async () => {
    const next = (nextCursor ?? cursor).trim();
    if (!next) {
      setError('Enter a cursor before saving the checkpoint.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const saved = await updateUserSyncCheckpoint(next);
      setCursor(saved.cursor ?? next);
      setUpdatedAt(saved.updated_at ?? null);
      setMessage('Checkpoint saved.');
    } catch (err) {
      setError(formatUserApiError(err, 'Unable to update sync checkpoint.'));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <p className="panel">Loading sync checkpoint…</p>;

  return (
    <section className="panel">
      <h3>Offline sync</h3>
      <p>GET/PUT /user/sync/checkpoint and GET /user/sync/changes. No local cache is invented here.</p>
      <label className="setting-row">
        <span>
          <b>Cursor</b>
          <small>Last updated {formatTimestamp(updatedAt)}</small>
        </span>
        <input value={cursor} onChange={(event) => setCursor(event.target.value)} type="text" />
      </label>
      {error ? <p>{error}</p> : null}
      {message ? <p>{message}</p> : null}
      <div className="hero-actions">
        <button className="site-button" disabled={busy} onClick={() => void onFetchChanges()} type="button">
          {busy ? 'Working…' : 'Load changes'}
        </button>
        <button className="site-button secondary" disabled={busy} onClick={() => void onSaveCheckpoint()} type="button">
          Save checkpoint
        </button>
      </div>
      {changes.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          {changes.map((change) => (
            <div className="list-row" key={`${change.type}-${change.id}`}>
              <div>
                <b>{change.type}</b>
                <small>
                  {change.id} · {change.updated_at ?? ''}
                </small>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function LiveAccountSettings({ route }: { route: SiteRoute }) {
  const path = route.path;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<CurrentUser | null>(null);

  const needsProfile =
    path === '/account/profile' ||
    path === '/account/settings' ||
    path === '/account/settings/profile' ||
    path === '/account/settings/notifications' ||
    path === '/account/settings/communications' ||
    path === '/account/settings/privacy';

  useEffect(() => {
    if (!needsProfile) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchCurrentUser()
      .then((me) => {
        if (cancelled) return;
        setUser(me);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setUser(null);
        setError(formatUserApiError(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsProfile, path]);

  if (path === '/account/settings/sessions' || path === '/account/settings/security') {
    return <LiveSecurityInventory />;
  }

  if (path === '/account/settings/consents') {
    return <LiveConsentsPanel />;
  }

  if (path === '/account/settings/mfa') {
    return (
      <SettingsGap
        title={route.title}
        detail="MFA enrollment and challenge flows are handled under /auth and mobile MFA routes. This page does not invent MFA status — complete MFA during sign-in, then manage sessions under Active Sessions."
      />
    );
  }

  if (path === '/account/settings/data-export' || path === '/account/settings/delete') {
    return (
      <LiveDataSubjectRequestForm
        title={route.title}
        defaultType={path === '/account/settings/delete' ? 'deletion' : 'export'}
      />
    );
  }

  if (path === '/account/settings/linked-accounts') {
    return (
      <SettingsGap
        title={route.title}
        detail="Guardian/child linked accounts are not exposed on the member user API yet."
      />
    );
  }

  if (path === '/account/help') {
    return <LiveHelpSupport title={route.title} />;
  }

  if (loading) return <p className="panel">Loading your profile…</p>;
  if (error) return <p className="panel">{error}</p>;
  if (!user) return <p className="panel">Please sign in to manage your account.</p>;

  const prefs = user.preferences ?? null;
  const showPreferences =
    path === '/account/settings' ||
    path === '/account/settings/notifications' ||
    path === '/account/settings/communications' ||
    path === '/account/settings/privacy';

  return (
    <div className="settings-panel">
      {path === '/account/profile' || path === '/account/settings/profile' ? (
        <>
          <section className="panel">
            <h3>{route.title}</h3>
            <p>Live membership profile from your Family House account.</p>
            <dl>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Verified</dt>
                <dd>{user.email_verified_at ? formatTimestamp(user.email_verified_at) : 'Not verified'}</dd>
              </div>
            </dl>
            {prefs ? (
              <p>
                Locale {prefs.locale} · {prefs.timezone} · channels {(prefs.notification_channels ?? []).join(', ') || 'none'}
              </p>
            ) : (
              <p>No preference record yet — save preferences from Account Settings.</p>
            )}
          </section>
          <LiveProfileForm user={user} onUpdated={setUser} />
        </>
      ) : null}
      {showPreferences ? (
        <LivePreferencesForm initial={prefs} actionLabel={route.action ?? 'Save Preferences'} />
      ) : null}
      {path === '/account/settings/privacy' ? (
        <LiveDataSubjectRequestForm title="Data subject request" defaultType="export" />
      ) : null}
      {path === '/account/settings' ? (
        <>
          <LiveFileUploadPanel title="Upload a file" />
          <LiveSyncPanel />
        </>
      ) : null}
      <LiveProfilePanel user={user} />
    </div>
  );
}

function Settings({ route }: { route: SiteRoute }) {
  if (designFixturesEnabled()) return <FixtureSettings route={route} />;
  return <LiveAccountSettings route={route} />;
}

function Media({ route }: { route: SiteRoute }) {
  const pathname = usePathname() ?? '';
  const fixtures = designFixturesEnabled();
  const [onlineLoading, setOnlineLoading] = useState(!fixtures);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [heroTitle, setHeroTitle] = useState<string | null>(null);
  const [heroSummary, setHeroSummary] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<string | null>(null);
  const [liveTitle, setLiveTitle] = useState<string | null>(null);
  const [scheduleRows, setScheduleRows] = useState<Array<[string, string, string, string]>>(
    fixtures ? (schedule as Array<[string, string, string, string]>) : [],
  );
  const [overviewCards, setOverviewCards] = useState<ContentCard[]>(fixtures ? sectionCards.Online : []);
  const sermonsState = useAsyncList(() => loadSermons(), [route.path]);
  const tabs = [
    ['Overview', '/online-church'],
    ['Live', '/online-church/live'],
    ['Schedule', '/online-church/schedule'],
    ['Sermons', '/online-church/sermons'],
  ] as const;

  useEffect(() => {
    if (fixtures) return;
    let cancelled = false;
    setOnlineLoading(true);
    void Promise.allSettled([loadOnlineChurchContent(), fetchCurrentLivestream()])
      .then(([contentResult, liveResult]) => {
        if (cancelled) return;
        if (contentResult.status === 'fulfilled') {
          const result = contentResult.value;
          setScheduleRows(result.schedule);
          setOverviewCards(result.data.filter((item) => !(item.href ?? '').includes('/sermons/')));
          setHeroImage(result.page?.image_url ?? null);
          setHeroTitle(result.page?.title ?? null);
          setHeroSummary(result.page?.summary ?? null);
          setOnlineError(null);
        } else {
          setOnlineError(publicErrorMessage(contentResult.reason));
        }
        if (liveResult.status === 'fulfilled' && liveResult.value) {
          setLiveStatus(liveResult.value.status ?? null);
          setLiveTitle(liveResult.value.title ?? null);
          if (liveResult.value.thumbnail_url) setHeroImage(liveResult.value.thumbnail_url);
          if (liveResult.value.title) setHeroTitle(liveResult.value.title);
          if (liveResult.value.subtitle || liveResult.value.host_name) {
            setHeroSummary(
              [liveResult.value.church_name ?? liveResult.value.subtitle, liveResult.value.host_name]
                .filter(Boolean)
                .join(' · '),
            );
          }
        }
      })
      .finally(() => {
        if (!cancelled) setOnlineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures, route.path]);

  if (pathname.includes('/online-church/live')) {
    return (
      <>
        <div className="media-tabs tab-bar">
          {tabs.map(([label, href]) => (
            <Link className={pathname === href || (href !== '/online-church' && pathname.startsWith(href)) ? 'active' : ''} href={href} key={href}>
              {label}
            </Link>
          ))}
        </div>
        <LiveWatchExperience />
      </>
    );
  }

  const sermonCards = fixtures ? sermons : sermonsState.status === 'ready' ? sermonsState.items : [];
  const isLive = (liveStatus ?? '').toLowerCase() === 'live';

  return (
    <>
      <div
        className="media-stage"
        style={heroImage ? { backgroundImage: `linear-gradient(160deg,#1a1040cc,#1a104088), url('${heroImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="play">▶</div>
        <div>
          {isLive ? <span className="live">● LIVE</span> : <span className="live">{liveStatus ? liveStatus.toUpperCase() : 'ONLINE'}</span>}
          <h2>{liveTitle || heroTitle || route.title}</h2>
          <p>{heroSummary || 'Join the Family House Connect global family live and on demand.'}</p>
          <div className="hero-actions">
            <Link className="site-button" href="/online-church/live">
              {isLive ? 'Watch Live' : (route.action ?? 'Open Live')}
            </Link>
            <Link className="site-button secondary" href="/give">
              Give
            </Link>
          </div>
        </div>
      </div>
      <div className="media-tabs tab-bar">
        {tabs.map(([label, href]) => (
          <Link className={pathname === href || (href !== '/online-church' && pathname.startsWith(href)) ? 'active' : ''} href={href} key={href}>
            {label}
          </Link>
        ))}
      </div>
      {route.path.includes('/sermons') && !route.path.endsWith('/sermons') ? (
        <section className="panel">
          <h3>{route.title}</h3>
          <p>Watch the full message and share it with your home church.</p>
          <Link className="site-button" href="/online-church/live">
            {route.action ?? 'Watch Full Sermon'}
          </Link>
        </section>
      ) : null}
      <div className="section-block">
        <div className="section-heading">
          <h3>Upcoming This Week</h3>
        </div>
        {onlineLoading ? (
          <p className="panel">Loading schedule…</p>
        ) : onlineError ? (
          <p className="panel">{onlineError}</p>
        ) : (
          <div className="schedule-list panel">
            {scheduleRows.length === 0 ? (
              <p>No schedule items published yet.</p>
            ) : (
              scheduleRows.map(([title, time, lead, href]) => (
                <div className="schedule-row" key={title}>
                  <div>
                    <b>{title}</b>
                    <small>
                      {time} · {lead}
                    </small>
                  </div>
                  <Link className="site-button small" href={href}>
                    Join Live
                  </Link>
                </div>
              ))
            )}
          </div>
        )}
      </div>
      {route.path.includes('/sermons') ? (
        sermonsState.status !== 'ready' && !fixtures ? (
          <DataStatus state={sermonsState} emptyLabel="No sermons published yet." />
        ) : (
          <CardGrid cards={sermonCards} columns={2} />
        )
      ) : onlineLoading && !fixtures ? (
        <p className="panel">Loading overview…</p>
      ) : onlineError && !fixtures ? (
        <p className="panel">{onlineError}</p>
      ) : overviewCards.length === 0 && !fixtures ? (
        <p className="panel">No online church content published yet.</p>
      ) : (
        <CardGrid cards={overviewCards} columns={2} />
      )}
    </>
  );
}

function Document({ route }: { route: SiteRoute }) {
  if (route.path.includes('/kca/certificates/verify')) {
    return <FormScreen route={{ ...route, kind: 'form', action: 'Verify Certificate' }} />;
  }
  if (route.path === '/kca/admission-letter') {
    return <KcaAdmissionLetterDocument />;
  }
  if (route.path.includes('/events/') && route.path.includes('/ticket')) {
    if (designFixturesEnabled()) return <FixtureCertificateDocument route={route} />;
    return <LiveEventTicket route={route} />;
  }
  if (designFixturesEnabled()) {
    return <FixtureCertificateDocument route={route} />;
  }
  return <LiveCertificateDocument route={route} />;
}

function FixtureCertificateDocument({ route }: { route: SiteRoute }) {
  const [downloaded, setDownloaded] = useState(false);
  return (
    <div className="document-wrap">
      <div className="document">
        <span>⬡</span>
        <h5><BrandName /></h5>
        <h2>{route.title}</h2>
        <p>This is to certify that</p>
        <h1>John Chinedu Doe</h1>
        <p>has successfully completed the required programme and is in good standing with Family House Connect.</p>
        <div className="signatures">
          <i>Pastor Daniel David</i>
          <i>May 31, 2024</i>
        </div>
      </div>
      <button className="site-button" type="button" onClick={() => setDownloaded(true)}>
        {downloaded ? 'Download started (preview)' : (route.action ?? 'Download')}
      </button>
    </div>
  );
}

function KcaAdmissionLetterDocument() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<KcaAccess | null>(null);
  const [holder, setHolder] = useState('Applicant');

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchKcaMe(), fetchCurrentUser().catch(() => null)])
      .then(([me, user]) => {
        if (cancelled) return;
        setAccess(me);
        if (user) setHolder(displayNameFromUser(user) || 'Applicant');
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatUserApiError(err, 'Unable to load admission letter.'));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') return <p className="panel">Loading admission letter…</p>;
  if (state === 'error') return <KcaUnavailable title="Admission letter" message={error ?? undefined} />;

  if (access?.destination !== 'admission_letter' && access?.destination !== 'student_dashboard') {
    return (
      <section className="panel">
        <h3>Admission letter</h3>
        <p>{access?.next_step ?? 'An admission letter is issued after you are admitted.'}</p>
        <Link className="site-button" href={kcaHrefForDestination(access?.destination)}>
          View current status
        </Link>
      </section>
    );
  }

  return (
    <div className="document-wrap">
      <div className="document">
        <span>⬡</span>
        <h5><BrandName /></h5>
        <h2>Admission Letter</h2>
        <p>Dear {holder},</p>
        <p>
          You have been admitted to Kingdom Change Agents. Learning unlocks after your enrollment is
          activated by admissions.
        </p>
        <div className="signatures">
          <i>{String(access?.application?.id ?? 'Application on file')}</i>
          <i>{access?.label ?? 'Admitted'}</i>
        </div>
      </div>
    </div>
  );
}

function LiveEventTicket({ route }: { route: SiteRoute }) {
  const eventId = pathEntityId(route.path) ?? '';
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [holder, setHolder] = useState('Member');
  const [event, setEvent] = useState<EventItem | null>(null);
  const [ticket, setTicket] = useState<EventTicket | null>(null);

  useEffect(() => {
    let cancelled = false;
    const registrationId = queryParam('registration') || readRememberedEventRegistration(eventId);
    if (!registrationId) {
      setError('No registration id is available for this ticket. Register first, then return from the confirmation.');
      setState('empty');
      return;
    }
    void (async () => {
      try {
        const [loaded, user, eventResult] = await Promise.all([
          fetchEventTicket(registrationId),
          fetchCurrentUser().catch(() => null),
          eventId ? loadEvent(eventId).catch(() => null) : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (!loaded) {
          setError(EVENT_TICKET_UNAVAILABLE_MESSAGE);
          setState('empty');
          return;
        }
        setTicket(loaded);
        if (user) setHolder(displayNameFromUser(user));
        if (eventResult) setEvent(eventResult.data);
        setState('ready');
      } catch (err) {
        if (cancelled) return;
        setError(formatUserApiError(err, 'Unable to load event ticket.'));
        setState('error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (state === 'loading') return <p className="panel">Loading ticket…</p>;
  if (state === 'error' || state === 'empty' || !ticket) {
    return (
      <section className="panel">
        <h3>{route.title}</h3>
        <p>{error ?? EVENT_TICKET_UNAVAILABLE_MESSAGE}</p>
        <Link className="site-button" href="/events">
          Browse Events
        </Link>
      </section>
    );
  }

  const basePath = route.path.replace(/\/ticket$/, '');
  const feedbackHref = `${basePath}/feedback?registration=${encodeURIComponent(ticket.id ?? ticket.public_id ?? '')}`;
  return (
    <div className="document-wrap">
      <div className="document">
        <span>🎫</span>
        <h5><BrandName /></h5>
        <h2>{event?.title || route.title}</h2>
        <p>Admission confirmation for</p>
        <h1>{holder}</h1>
        <p>
          {event?.when ? `${event.when}` : 'Event registration'}
          {event?.where ? ` · ${event.where}` : ''}
        </p>
        <div className="signatures">
          <i>{ticket.status ?? 'Registration confirmed'}</i>
          <i>{ticket.id ? `Reg ${ticket.id.slice(0, 8)}…` : 'Ticket'}</i>
        </div>
      </div>
      <div className="hero-actions">
        <Link className="site-button" href={basePath}>
          Event details
        </Link>
        <Link className="site-button secondary" href={feedbackHref}>
          Submit feedback
        </Link>
        <Link className="site-button secondary" href="/account/events">
          My events
        </Link>
      </div>
      <p className="panel" style={{ marginTop: 12 }}>
        {ticket.ticket_url
          ? 'A ticket file URL was returned by the API. Open it from the confirmation above.'
          : 'PDF ticket download is not issued by the API yet. This confirmation reflects your live registration record.'}
      </p>
      {ticket.ticket_url ? (
        <p>
          <a className="site-button" href={ticket.ticket_url} rel="noreferrer" target="_blank">
            Open ticket file
          </a>
        </p>
      ) : null}
    </div>
  );
}

function LiveCertificateDocument({ route }: { route: SiteRoute }) {
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [holder, setHolder] = useState('Member');
  const [certNumber, setCertNumber] = useState<string | null>(null);
  const [issuedAt, setIssuedAt] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchCurrentUser(), fetchKcaDashboard()])
      .then(([user, dashboard]) => {
        if (cancelled) return;
        setHolder(displayNameFromUser(user) || 'Member');
        const cert = dashboard.certificate;
        if (!cert) {
          setState('empty');
          return;
        }
        setCertNumber(String(cert.certificate_number ?? cert.id ?? ''));
        setIssuedAt(cert.issued_at ? String(cert.issued_at) : null);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatUserApiError(err, 'Unable to load certificate.'));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') return <p className="panel">Loading certificate…</p>;
  if (state === 'error') {
    return (
      <section className="panel">
        <h3>{route.title}</h3>
        <p>{error}</p>
        <Link className="site-button" href="/account/kca">
          Back to KCA
        </Link>
      </section>
    );
  }
  if (state === 'empty') {
    return (
      <section className="panel">
        <h3>{route.title}</h3>
        <p>
          No KCA certificate is on file for your enrollment.
        </p>
        <Link className="site-button" href="/account/kca">
          Back to KCA
        </Link>
      </section>
    );
  }

  return (
    <div className="document-wrap">
      <div className="document">
        <span>⬡</span>
        <h5><BrandName /></h5>
        <h2>{route.title}</h2>
        <p>This is to certify that</p>
        <h1>{holder}</h1>
        <p>has a KCA certificate on file with Family House Connect.</p>
        <div className="signatures">
          <i>{certNumber ? `No. ${certNumber}` : 'Certificate on file'}</i>
          <i>{issuedAt ?? 'Issued'}</i>
        </div>
      </div>
      <p className="panel">
        <button
          className="site-button"
          type="button"
          onClick={() => {
            void (async () => {
              setDownloadError(null);
              try {
                const response = await downloadKcaCertificatePdf();
                if (!response.ok) {
                  setDownloadError('Certificate PDF is not available.');
                  return;
                }
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'kca-certificate.pdf';
                link.click();
                URL.revokeObjectURL(url);
              } catch (err) {
                setDownloadError(formatUserApiError(err, 'Unable to download certificate PDF.'));
              }
            })();
          }}
        >
          Download PDF
        </button>
      </p>
      {downloadError ? <p className="panel" role="alert">{downloadError}</p> : null}
    </div>
  );
}

function KcaAdmissionProgress() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [access, setAccess] = useState<KcaAccess | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    void fetchKcaMe()
      .then((data) => {
        if (cancelled) return;
        if (kcaIsActivatedStudent(data.destination)) {
          router.replace('/account/kca');
          return;
        }
        if (data.destination === 'overview') {
          router.replace('/kca');
          return;
        }
        if (data.destination === 'resume_application') {
          router.replace('/kca/apply/church');
          return;
        }
        setAccess(data);
        setState('ready');
      })
      .catch((err) => {
        if (cancelled) return;
        setError(formatUserApiError(err, 'Unable to load admission progress.'));
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (state === 'loading') return <p className="panel">Loading admission progress…</p>;
  if (state === 'error') return <KcaUnavailable title="Admission progress" message={error ?? undefined} />;

  const cta = kcaPrimaryCta(access?.destination);
  const timeline = access?.timeline ?? [];
  const application = access?.application;

  return (
    <section className="panel">
      <span className="eyebrow">{access?.label ?? 'Application'}</span>
      <h2>Admission progress</h2>
      <p>{access?.next_step}</p>
      {application ? (
        <dl>
          <div>
            <dt>Reference</dt>
            <dd>{String(application.id ?? 'Not provided')}</dd>
          </div>
          <div>
            <dt>Submitted</dt>
            <dd>{application.received_at ? String(application.received_at) : 'Not provided'}</dd>
          </div>
          <div>
            <dt>Stage</dt>
            <dd>{String(application.label ?? application.status ?? 'Not provided')}</dd>
          </div>
        </dl>
      ) : null}
      <h3>Timeline</h3>
      {timeline.length === 0 ? (
        <p>No admission events recorded yet.</p>
      ) : (
        <ul className="check-list">
          {timeline.map((event, index) => (
            <li key={`${String(event.at ?? index)}-${String(event.action ?? index)}`}>
              {String(event.action ?? 'update')}
              {event.at ? ` · ${String(event.at)}` : ''}
            </li>
          ))}
        </ul>
      )}
      <Link className="site-button" href={cta.href}>
        {cta.label}
      </Link>
    </section>
  );
}

function Success({ route }: { route: SiteRoute }) {
  if (route.path === '/give/receipt') return <GiveReceiptScreen route={route} />;
  if (route.path === '/kca/apply/status') return <KcaAdmissionProgress />;
  return (
    <div className="success-card">
      <span>✓</span>
      <h1>{route.title}</h1>
      <p>{route.subtitle}</p>
      <ul className="check-list center">
        <li>Your submission has been received</li>
        <li>A confirmation will appear in Messages</li>
        <li>Track next steps from your dashboard</li>
      </ul>
      <Link className="site-button" href={successHref[route.path] ?? '/account'}>
        {route.action ?? 'Go to Dashboard'}
      </Link>
    </div>
  );
}

function MissionLandingExtras() {
  const crusadesState = useAsyncList(() => loadCrusades({ per_page: 6 }), []);
  return (
    <>
      <div className="section-block">
        <div className="section-heading">
          <h3>Featured Crusades</h3>
        </div>
        <DataStatus state={crusadesState} emptyLabel="No crusades published yet." />
        {crusadesState.status === 'ready' ? <CardGrid cards={crusadesState.items} columns={3} /> : null}
      </div>
      <BannerCta title="Invite us for a crusade" body="Partner with Family House Mission to reach your city with the gospel." action="Invite Us" href="/mission/crusades/invite" />
    </>
  );
}

function EventsLandingExtras() {
  const eventsState = useAsyncList(() => loadEvents({ per_page: 6 }), []);
  return (
    <>
      <DataStatus state={eventsState} emptyLabel="No events published yet." />
      {eventsState.status === 'ready' ? <CardGrid cards={eventsState.items} columns={2} /> : null}
    </>
  );
}

function PressLandingExtras() {
  const pressState = useAsyncList(() => loadPressPublications({ per_page: 6 }), []);
  return (
    <>
      <div className="section-heading">
        <h3>Devotionals</h3>
        <Link href="/press/devotionals">Open devotionals and Study Manuals</Link>
      </div>
      <p className="muted">Daily devotionals and Study Manuals share this shelf. Each title shows its type.</p>
      <DataStatus state={pressState} emptyLabel="No publications yet." />
      {pressState.status === 'ready' ? <CardGrid cards={pressState.items} /> : null}
    </>
  );
}

function ChurchLandingExtras() {
  const churchesState = useAsyncList(() => loadChurches({ per_page: 6 }), []);
  return (
    <>
      <DataStatus state={churchesState} emptyLabel="No published churches yet." />
      {churchesState.status === 'ready' ? <CardGrid cards={churchesState.items} columns={2} /> : null}
    </>
  );
}

function SectionLandingCards({ section }: { section: string }) {
  const fixtures = useFixtures();
  const listState = useAsyncList(() => loadSectionLandingCards(section).then((r) => ({ data: r.data })), [section]);

  if (fixtures) {
    const cards = sectionCards[section] ?? sectionCards.Home;
    return cards.length ? <CardGrid cards={cards} /> : null;
  }

  return (
    <>
      <DataStatus state={listState} emptyLabel={`No ${section.toLowerCase()} content published yet.`} />
      {listState.status === 'ready' ? <CardGrid cards={listState.items} /> : null}
    </>
  );
}

function KcaGateLanding({ route }: { route: SiteRoute }) {
  const cms = useCmsPageMeta('kca');
  return (
    <>
      <Hero route={route} imageUrl={cms.imageUrl} title={cms.title} subtitle={cms.summary} />
      <KcaGate />
    </>
  );
}

function Landing({ route }: { route: SiteRoute }) {
  if (route.path === '/') return <HomeLanding route={route} />;
  if (route.path === '/about') return <AboutLanding route={route} />;
  if (route.path === '/vision' || route.path === '/global-mission' || route.path === '/global-journey') return <VisionLanding route={route} />;
  if (route.path === '/contact') return <ContactLanding />;
  if (route.path === '/faq') return <FaqLanding />;
  if (route.path === '/search') return <SearchLanding />;
  if (route.path === '/find-church') return <FindChurchLanding route={route} />;
  if (route.path === '/kca' || route.path === '/kca/gate') return <KcaGateLanding route={route} />;
  if (route.path === '/prayer') return <PrayerLanding route={route} />;
  return <SectionHeroLanding route={route} />;
}

function SectionHeroLanding({ route }: { route: SiteRoute }) {
  const cms = useCmsPageMeta(cmsSlugForRoute(route));
  return (
    <>
      <Hero route={route} imageUrl={cms.imageUrl} title={cms.title} subtitle={cms.summary} />
      <Metrics />
      {route.section === 'Press' ? (
        <PressLandingExtras />
      ) : route.section === 'Events' ? (
        <EventsLandingExtras />
      ) : route.section === 'Church' ? (
        <div className="card-stack">
          <SectionLandingCards section={route.section} />
          <ChurchLandingExtras />
        </div>
      ) : (
        <SectionLandingCards section={route.section} />
      )}
      {route.section === 'Mission' ? <MissionLandingExtras /> : null}
      <BannerCta
        title="Belong to the family"
        body="Create your account to track journey, giving, prayer, and ministry involvement."
        action="Create Account"
        href="/register"
      />
    </>
  );
}

export function SiteScreen({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const heading = translateRouteCopy(t, route);
  const isMember = route.surface === 'member';
  const hasHomeChurchWorkflowSidebar = route.path === '/start-home-church' || route.path.startsWith('/start-home-church/apply/');
  const hasSidebar = isMember || hasHomeChurchWorkflowSidebar;
  const hideHeading =
    route.kind === 'landing' ||
    route.kind === 'media' ||
    route.kind === 'success' ||
    route.kind === 'hub' ||
    route.kind === 'bible' ||
    route.kind === 'calendar' ||
    route.surface === 'auth' ||
    route.path === '/account/kca' ||
    route.path === '/kca/enrol' ||
    route.path === '/give' ||
    route.path.startsWith('/give/') ||
    route.path === '/mission/support' ||
    (isMember &&
      (route.kind === 'dashboard' ||
        route.kind === 'listing' ||
        route.kind === 'settings' ||
        route.path.startsWith('/account/')));

  const content = useMemo(() => {
    if (route.path === '/give' || route.path === '/give/payment' || route.path === '/mission/support') {
      return <GiveScreen route={route} />;
    }
    if (route.path === '/account/giving/recurring') return <GiveRecurringScreen route={route} />;
    if (route.path === '/account/giving') return <LiveGivingHistoryPage route={route} />;
    if (route.kind === 'bible' || route.path === '/bible' || route.path.startsWith('/bible/')) {
      return <BibleExperience route={route} />;
    }
    if (route.kind === 'landing') return <Landing route={route} />;
    if (route.kind === 'hub' || route.path === '/events') return <EventsHub route={route} />;
    if (route.kind === 'calendar') return <CalendarView route={route} />;
    if (route.kind === 'detail') return route.section === 'Events' ? <EventDetail route={route} /> : <Detail route={route} />;
    if (route.kind === 'listing' || route.kind === 'map') return <Listing route={route} />;
    if (route.kind === 'form') return route.surface === 'auth' ? <AuthScreen route={route} /> : <FormScreen route={route} />;
    if (route.kind === 'success') return <Success route={route} />;
    if (route.kind === 'dashboard') return <Dashboard route={route} />;
    if (route.kind === 'settings') return <Settings route={route} />;
    if (route.kind === 'media') return <Media route={route} />;
    return <Document route={route} />;
  }, [route]);

  return (
    <div className={`site-app surface-${route.surface}`}>
      <Header path={route.path} />
      <Progress route={route} />
      <div className={hasSidebar ? 'member-layout' : 'site-layout'}>
        {isMember ? <Sidebar /> : null}
        {hasHomeChurchWorkflowSidebar ? <HomeChurchApplicationSidebar route={route} /> : null}
        <main className="site-main">
          {!hideHeading ? (
            <div className="page-heading">
              <span className="eyebrow">{route.section}</span>
              <h1>{heading.title}</h1>
              <p>{heading.subtitle}</p>
            </div>
          ) : null}
          {content}
        </main>
      </div>
      <footer>
        <Logo />
        <p>{t('footer.tagline', { defaultMessage: 'One Family. One Mission. Transforming nations for Christ.' })}</p>
        <span>
          {t('footer.copyright', {
            vars: { year: new Date().getFullYear() },
            defaultMessage: '© {year} Family House Connect',
          })}
        </span>
      </footer>
    </div>
  );
}
