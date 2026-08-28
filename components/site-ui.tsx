'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { SiteRoute } from '@/lib/site-routes';
import { isMemberNavActive, memberNavGroups } from '@/lib/site-routes';
import { AppBrand } from './app-brand';
import { useBranding } from './branding-provider';
import { GiveReceiptScreen, GiveRecurringScreen, GiveScreen } from '@/components/give-ui';
import {
  LiveAccountCalendar,
  LiveAttendancePage,
  LiveGivingHistoryPage,
  LiveHomeChurchApplicationPage,
  LiveJourneyPage,
  LiveMinistriesPage,
  LiveMyChurchPage,
  LiveMyEventsPage,
  LiveMyHomeChurchPage,
  LiveSpiritualGrowthPage,
  LiveTestimoniesPage,
  MemberHomePage,
} from '@/components/member-pages';
import { AuthScreen, MemberLogoutButton } from '@/components/auth-ui';
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
  designFixturesEnabled,
  draftToHomeChurchPayload,
  loadAboutPage,
  loadCmsHeroImage,
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
  completeGivingIntent,
  createUserMessageConversation,
  createUserNeed,
  createUserPrayer,
  DATA_SUBJECT_REQUEST_TYPES,
  displayNameFromUser,
  downloadPressPublication,
  EVENT_TICKET_UNAVAILABLE_MESSAGE,
  fetchCurrentUser,
  fetchEventTicket,
  fetchKcaAssignments,
  fetchKcaAttendance,
  fetchKcaDashboard,
  fetchKcaMentor,
  fetchKcaModule,
  fetchKcaModules,
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
  KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE,
  markUserNotificationRead,
  PAYMENT_GOVERNANCE_DENIED_MESSAGE,
  recordEventFeedback,
  registerForEvent,
  requestChurchMembership,
  revokeUserDevice,
  revokeUserSecuritySession,
  sendUserConversationMessage,
  storeUserFile,
  submitKcaApplication,
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
import { InteractiveMap, type MapMarker } from '@/components/interactive-map';
import { SearchSelect } from '@/components/search-select';
import { GeographySelect } from '@/components/geography-select';

type AsyncListState<T> =
  | { status: 'loading' }
  | { status: 'ready'; items: T[] }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string };

function DataStatus({ state, emptyLabel = 'Nothing to show yet.' }: { state: AsyncListState<unknown>; emptyLabel?: string }) {
  if (state.status === 'loading') return <p className="panel">Loading…</p>;
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
  ['Home', '/'],
  ['Church', '/church'],
  ['Mission', '/mission'],
  ['KCA', '/kca'],
  ['Press', '/press'],
  ['Online', '/online-church'],
  ['Events', '/events'],
  ['Give', '/give'],
] as const;

function Logo() {
  return <AppBrand variant="site" href="/" />;
}

function BrandName() {
  const { app_name } = useBranding();
  return <>{app_name}</>;
}

function Header() {
  const pathname = usePathname();
  const fixtures = useFixtures();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (fixtures) return;
    let cancelled = false;
    void fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures]);

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
        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={menuOpen}
        aria-controls="site-primary-nav"
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? '✕' : '☰'}
      </button>
      <nav id="site-primary-nav">
        {nav.map(([label, href]) => (
          <Link className={pathname === href || (href !== '/' && pathname.startsWith(href)) ? 'active' : ''} href={href} key={href}>
            {label}
          </Link>
        ))}
      </nav>
      <div className="header-actions">
        <Link href="/search" aria-label="Search">
          ⌕
        </Link>
        {signedIn ? (
          <Link className="avatar" href="/account" aria-label={`${user ? displayNameFromUser(user) : 'Account'}`}>
            {initials}
          </Link>
        ) : (
          <>
            <Link className="site-button secondary small" href="/register">
              Register
            </Link>
            <Link className="site-button small" href="/login">
              Sign In
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const fixtures = useFixtures();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (fixtures) return;
    let cancelled = false;
    void fetchCurrentUser()
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures]);

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
          <Link href="/account/profile">View profile</Link>
        </div>
      </div>
      <nav aria-label="Member">
        {memberNavGroups.map((group) => (
          <div className="member-nav-group" key={group.label}>
            <p className="member-nav-label">{group.label}</p>
            {group.items.map((item) => (
              <Link
                className={`member-nav-link${isMemberNavActive(pathname, item.href) ? ' active' : ''}`}
                href={item.href}
                key={item.href}
              >
                <span aria-hidden="true">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <MemberLogoutButton />
    </aside>
  );
}

function HomeChurchApplicationSidebar({ route }: { route: SiteRoute }) {
  const applicationSteps: ReadonlyArray<readonly [string, string]> = [
    ['/start-home-church/eligibility', 'Eligibility'],
    ...homeChurchSteps,
  ];
  const currentIndex = applicationSteps.findIndex(([path]) => path === route.path);

  return (
    <aside className="workflow-sidebar" aria-label="Home Church application">
      <AppBrand variant="member" />
      <div className="workflow-sidebar-intro">
        <span className="eyebrow">HOME CHURCH</span>
        <b>Application progress</b>
        <small>Complete each step to submit your request for pastoral review.</small>
      </div>
      <nav>
        <Link className={route.path === '/start-home-church' ? 'active' : ''} href="/start-home-church">
          <span>⌂</span> Overview
        </Link>
        {applicationSteps.map(([path, label], index) => (
          <Link className={path === route.path ? 'active' : ''} href={path} key={path}>
            <span>{index < currentIndex ? '✓' : index + 1}</span> {label}
          </Link>
        ))}
      </nav>
      <Link className="workflow-sidebar-help" href="/contact">
        Need help? Contact us
      </Link>
    </aside>
  );
}

function Progress({ route }: { route: SiteRoute }) {
  if (route.surface === 'auth' || route.surface !== 'workflow') return null;

  const homeChurch = route.path.includes('/start-home-church/apply');
  const kca = route.path.includes('/kca/apply') || route.path === '/kca/enrol';
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
          <small>{label}</small>
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
    Events: 'home',
  };
  return slugs[route.section] ?? null;
}

function useCmsHeroImage(slug: string | null) {
  const fixtures = useFixtures();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  useEffect(() => {
    if (fixtures || !slug) {
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    void loadCmsHeroImage(slug)
      .then((url) => {
        if (!cancelled) setImageUrl(url);
      })
      .catch(() => {
        if (!cancelled) setImageUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures, slug]);
  return imageUrl;
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
          <Link href={card.href}>{card.action ? `${card.action} →` : 'Explore →'}</Link>
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

function Hero({ route, imageUrl }: { route: SiteRoute; imageUrl?: string | null }) {
  const secondary =
    route.section === 'KCA'
      ? ['/kca/why', 'Why Join KCA?']
      : route.section === 'Mission'
        ? ['/mission/impact', 'Explore Missions']
        : route.section === 'Church'
          ? ['/start-home-church', 'Start a Home Church']
          : route.section === 'Press'
            ? ['/online-church/sermons', 'Browse Sermons']
            : route.section === 'Events'
              ? ['/account/calendar', 'Open Calendar']
              : ['/about', 'Learn More'];
  const primaryHref = heroPrimaryHref(route.path, route.section, route.action);
  return (
    <section className={`site-hero hero-${route.section.toLowerCase()}`}>
      <div>
        <span className="eyebrow"><BrandName /></span>
        <h1>{route.title}</h1>
        <p>{route.subtitle}</p>
        <div className="hero-actions">
          <Link className="site-button" href={primaryHref}>
            {route.action ?? 'Explore Family House'}
          </Link>
          <Link className="site-button secondary" href={secondary[0]}>
            {secondary[1]}
          </Link>
        </div>
      </div>
      <div className="hero-visual" aria-hidden="true">
        <div
          className="hero-visual-frame"
          style={imageUrl ? { backgroundImage: `linear-gradient(160deg,#1a1040aa,#1a104066), url('${imageUrl}')` } : undefined}
        >
          <span>✦</span>
          <b>{route.section === 'Home' ? 'Faith · Family · Purpose' : route.section}</b>
          <small>One Family. One Mission.</small>
        </div>
      </div>
    </section>
  );
}

function HomeLanding({ route }: { route: SiteRoute }) {
  const fixtures = useFixtures();
  const [state, setState] = useState<AsyncListState<ContentCard>>({ status: 'loading' });
  const [metrics, setMetrics] = useState<Metric[]>(fixtures ? globalMetrics : []);
  const [pillarsCards, setPillars] = useState<ContentCard[]>(fixtures ? pillars : []);
  const [actionCards, setActions] = useState<ContentCard[]>(fixtures ? sectionCards.Home : []);
  const [heroImage, setHeroImage] = useState<string | null>(null);

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
      <Hero route={route} imageUrl={heroImage} />
      {state.status === 'loading' || state.status === 'error' || state.status === 'empty' ? (
        <DataStatus state={state} emptyLabel="Home content is not published yet." />
      ) : null}
      {state.status === 'ready' || fixtures ? (
        <>
          <Metrics items={metrics} />
          <div className="section-block">
            <div className="section-heading">
              <span className="eyebrow">Our Four Pillars</span>
              <h2>Everything you need to belong, grow, and multiply</h2>
            </div>
            {pillarsCards.length ? <CardGrid cards={pillarsCards} /> : <p className="panel">No pillar cards published yet.</p>}
          </div>
          <div className="section-block">
            <div className="section-heading">
              <span className="eyebrow">Get Started</span>
              <h2>Take your next Kingdom step</h2>
            </div>
            {actionCards.length ? <CardGrid cards={actionCards} /> : <p className="panel">No get-started cards published yet.</p>}
          </div>
        </>
      ) : null}
      <BannerCta title="Ready to find your place in the family?" body="Search churches near you or join Online Church today." action="Find a Church" href="/find-church" />
    </>
  );
}

function AboutLanding({ route }: { route: SiteRoute }) {
  const fixtures = useFixtures();
  const [heroImage, setHeroImage] = useState<string | null>(null);
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
      <Hero route={route} imageUrl={heroImage} />
      <DataStatus state={state.status === 'ready' ? { status: 'ready', items: cards } : state} emptyLabel="About content is not published yet." />
      {state.status === 'ready' || fixtures ? (
        <>
          <div className="split-panel">
            <section className="panel prose-panel">
              <span className="eyebrow">Who We Are</span>
              <h2>{route.title || 'A global family advancing the Kingdom together'}</h2>
              <p>{summary || 'About content will appear here when published.'}</p>
              {fixtures ? (
                <ul className="check-list">
                  <li>Biblical community across nations</li>
                  <li>Discipleship pathways for every season</li>
                  <li>Mission and compassion that transform lives</li>
                  <li>Training that equips Kingdom change agents</li>
                </ul>
              ) : null}
            </section>
            <aside className="panel identity-card">
              <h3>Our Identity</h3>
              {['One Family', 'One Faith', 'One Mission', 'Every Nation'].map((item) => (
                <div key={item}>
                  <b>{item}</b>
                  <small>Rooted in Christ and expressed through local and global ministry.</small>
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
  const heroImage = useCmsHeroImage('vision');
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
      <Hero route={route} imageUrl={heroImage} />
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
          aria-label="Search FAQ"
          placeholder="Search frequently asked questions..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button className="site-button" type="button" onClick={() => setOpen(0)}>
          Search
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
            aria-label="Global search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search churches, events, sermons..."
          />
          <button className="site-button" type="button" onClick={() => setApplied(query)}>
            Search
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
          {catalogueLoading ? <p>Loading…</p> : null}
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
            aria-label="Search churches"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by city, region, country..."
          />
          <button className="site-button secondary" type="button" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : 'Use my location'}
          </button>
          <Link className="site-button" href="/find-church/results">
            Search
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
  return (
    <div className="split-panel">
      <Link className="panel" href="/kca/enrol" style={{ textDecoration: 'none' }}>
        <span className="card-icon">🎓</span>
        <h2>Enroll Now</h2>
        <p>Begin your Kingdom Change Agents application and start the journey of formation.</p>
        <span className="ghost-link">Start Application</span>
      </Link>
      <Link className="panel" href="/account/kca" style={{ textDecoration: 'none' }}>
        <span className="card-icon">📊</span>
        <h2>Continue to Dashboard</h2>
        <p>Already enrolled? Open your student dashboard for modules, assignments, and mentorship.</p>
        <span className="ghost-link">Open Dashboard</span>
      </Link>
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
  const heroImage = useCmsHeroImage('home');
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
      <Hero route={route} imageUrl={heroImage} />
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
  if (route.path.includes('/press')) return () => loadPressPublications({ per_page: 50 });
  if (route.path.includes('/account/giving')) {
    return async () => {
      const [intents, transactions] = await Promise.all([
        fetchUserPaymentIntents(),
        fetchUserPaymentTransactions(),
      ]);

      const txCards: ContentCard[] = transactions.map((tx) => ({
        title: 'Gift recorded',
        body: `${tx.occurred_at ?? tx.created_at ?? ''} · Intent ${tx.payment_intent_id ?? '—'}`.trim(),
        href: `/account/giving#tx-${tx.id ?? tx.public_id ?? 'unknown'}`,
        meta: formatMoneyMinor(tx.amount_minor, tx.currency ?? 'NGN'),
        status: tx.status ?? 'Recorded',
        icon: '🧾',
        action: 'View',
      }));

      const intentCards: ContentCard[] = intents.map((intent) => ({
        title: intent.purpose_code ?? 'Giving intent',
        body: `${intent.status ?? 'Pending'} · ${intent.created_at ?? ''}`.trim(),
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
  const [filter, setFilter] = useState('all');
  const [applied, setApplied] = useState('all');
  const apiLoader = listingLoaderFor(route);
  const listState = useAsyncList(
    () =>
      apiLoader
        ? apiLoader()
        : designFixturesEnabled()
          ? Promise.resolve({ data: listingFor(route.section, route.path) })
          : Promise.resolve({ data: [] as ContentCard[] }),
    [route.path, route.section],
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
        <input aria-label="Search" placeholder={`Search ${route.section.toLowerCase()}...`} />
        <select aria-label="Filter" value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="all">All Categories</option>
          <option value="active">Active</option>
          <option value="upcoming">Upcoming</option>
        </select>
        <button className="site-button" type="button" onClick={() => setApplied(filter)}>
          Filter
        </button>
      </div>
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
                {route.action ?? 'Join Church'}
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

function FormScreen({ route }: { route: SiteRoute }) {
  const router = useRouter();
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSummary, setDraftSummary] = useState<Record<string, string>>({});
  const fields = formFieldsForRoute(route.path);
  const isAuth = route.surface === 'auth';
  const isHomeChurchStep = route.path.includes('/start-home-church/apply');
  const isHomeChurchReview = route.path.includes('/start-home-church/apply/review');
  const isKcaApply = route.path.includes('/kca/apply/');
  const isKcaApplyReview = route.path === '/kca/apply/review';
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

  if (isHomeChurchStart) {
    return (
      <div className="home-church-start">
        <section className="panel home-church-start-hero">
          <span className="eyebrow">HOME CHURCH APPLICATION</span>
          <h2>Start a Church in Your Home</h2>
          <p>
            Build a Christ-centred community for worship, discipleship, prayer, and care. Your application is submitted
            securely to the Family House Connect API after the review step.
          </p>
          <div className="home-church-start-points">
            <span>✓ Tell us about yourself</span>
            <span>✓ Choose your meeting location</span>
            <span>✓ Submit for pastoral review</span>
          </div>
          <Link className="site-button" href="/start-home-church/eligibility">
            Start your application
          </Link>
        </section>
        <aside className="panel home-church-start-side">
          <span className="home-church-start-icon">⌂</span>
          <h3>Before you begin</h3>
          <p>Have your contact details, sponsoring church, proposed meeting location, and expected participant count ready.</p>
          <small>Application progress is saved in this browser until it is submitted.</small>
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
          fund: values.fund || null,
          note: values.note || null,
        });
        const intentId = intent.id ?? intent.public_id;
        // local_manual only — DenyAll is 422 above; other providers must not fake paid success.
        if (isLocalManualGivingProvider(intent.provider_code) && intentId) {
          const completed = await completeGivingIntent(intentId);
          const receiptId = completed.receipt?.id ?? completed.receipt?.public_id;
          if (receiptId) {
            try {
              await fetchUserPaymentReceipt(receiptId);
            } catch {
              // Receipt show is best-effort; history still lists transactions/intents.
            }
          }
          setDone(true);
          const receiptQuery = receiptId ? `?receipt=${encodeURIComponent(receiptId)}` : '';
          window.setTimeout(() => router.push(`/give/receipt${receiptQuery}`), 450);
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
        await requestChurchMembership(churchId, homeChurchId ? { home_church_id: homeChurchId } : {});
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/account/church'), 450);
      } catch (err) {
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

    if (isKcaApply || route.path === '/kca/enrol') {
      const draftKey = 'fhc.kca-application.draft';
      if (!isKcaApplyReview) {
        let existing: Record<string, string> = {};
        try {
          existing = JSON.parse(window.localStorage.getItem(draftKey) ?? '{}') as Record<string, string>;
        } catch {
          // An invalid local draft must not prevent the applicant from continuing.
        }
        window.localStorage.setItem(draftKey, JSON.stringify({ ...existing, ...values }));
        setDone(true);
        window.setTimeout(() => router.push(flowNext[route.path] ?? '/kca/apply/status'), 450);
        return;
      }
      let applicationData: Record<string, string> = {};
      try {
        applicationData = JSON.parse(window.localStorage.getItem(draftKey) ?? '{}') as Record<string, string>;
      } catch {
        setError('Your saved application draft is invalid. Return to the first step and enter your details again.');
        return;
      }
      if (Object.keys(applicationData).length === 0) {
        setError('Complete your application details before submitting.');
        return;
      }
      setBusy(true);
      try {
        await submitKcaApplication(applicationData);
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

function KcaStudentDashboard() {
  if (designFixturesEnabled()) return <KcaFixtureDashboard />;
  return <KcaLiveStudentDashboard />;
}

function KcaLiveStudentDashboard() {
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<KcaDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaDashboard()
      .then((data) => {
        if (cancelled) return;
        setDashboard(data);
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

  if (state === 'loading') return <p className="panel">Loading KCA dashboard…</p>;
  if (state === 'error') return <KcaUnavailable title="KCA Student Dashboard" message={error ?? undefined} />;

  const total = dashboard?.modules_total ?? 0;
  const progress = dashboard?.modules_with_progress ?? 0;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
  const mentorName = dashboard?.mentor
    ? `${String(dashboard.mentor.preferred_name ?? dashboard.mentor.given_name ?? 'Mentor')} ${String(dashboard.mentor.family_name ?? '')}`.trim()
    : 'Unassigned';

  return (
    <>
      <div className="welcome">
        <div>
          <span className="eyebrow">KCA STUDENT</span>
          <h2>KCA Student Dashboard</h2>
          <p>
            {dashboard?.enrolled
              ? 'Continue learning and track your formation journey.'
              : 'You are not enrolled yet. Browse published modules while admissions completes.'}
          </p>
        </div>
        <Link className="site-button" href="/account/kca/modules">
          Browse Modules
        </Link>
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
          {progress}/{total} modules with activity
        </small>
      </section>
      <div className="metric-grid">
        {[
          ['Modules', '/account/kca/modules', `${progress}/${total}`],
          ['Assignments', '/account/kca/assignments', String(dashboard?.assignments_open ?? 0)],
          ['Attendance', '/account/kca/attendance', String(dashboard?.attendance_recorded ?? 0)],
          ['Mentor', '/account/kca/mentor', mentorName],
        ].map(([label, href, value]) => (
          <Link href={href} key={label} style={{ textDecoration: 'none' }}>
            <article>
              <strong>{value}</strong>
              <span>{label}</span>
            </article>
          </Link>
        ))}
      </div>
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
      <p className="panel" style={{ marginTop: 12 }}>
        {KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE}
      </p>
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
          <p>Published curriculum lessons for this module.</p>
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
                <small>Lesson {lesson.sequence ?? '—'}</small>
              </div>
            </div>
          ))
        )}
      </section>
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
  if (route.path === '/account/kca/attendance') return <KcaAttendanceList />;
  if (route.path.startsWith('/account/kca/modules/')) return <KcaModuleDetail route={route} />;
  if (route.path.startsWith('/account/kca/assignments/')) {
    if (!designFixturesEnabled()) {
      return (
        <KcaUnavailable title={route.title} message={KCA_EVIDENCE_SUBMIT_UNAVAILABLE_MESSAGE} />
      );
    }
  }
  if (route.path.startsWith('/account/kca')) {
    if (!designFixturesEnabled()) {
      const message = route.path.includes('/certificate')
        ? 'Certificate download stays unavailable until member issuance delivery is approved (OD-008).'
        : route.path.includes('/lessons/')
          ? 'Individual lesson players are not exposed on the member API yet. Open the parent module for published lessons.'
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
  if (route.path === '/account/events') return <LiveMyEventsPage route={route} />;
  if (route.path === '/account/journey') return <LiveJourneyPage route={route} />;
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
  const name = displayNameFromUser(user);
  return (
    <aside className="panel profile-card">
      <span className="avatar huge">{initialsFromUser(user)}</span>
      <h3>{name}</h3>
      <p>{user.email}</p>
      <span className="status">{user.email_verified_at ? 'Verified' : 'Unverified'}</span>
      <dl style={{ marginTop: '1rem', textAlign: 'left' }}>
        <div>
          <dt>Given name</dt>
          <dd>{user.profile.given_name ?? '—'}</dd>
        </div>
        <div>
          <dt>Family name</dt>
          <dd>{user.profile.family_name ?? '—'}</dd>
        </div>
        <div>
          <dt>Preferred name</dt>
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

function LiveProfileForm({ user }: { user: CurrentUser }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await updateUserProfile({
        given_name: String(values.get('given_name') ?? '').trim(),
        middle_name: String(values.get('middle_name') ?? '').trim() || null,
        family_name: String(values.get('family_name') ?? '').trim(),
        preferred_name: String(values.get('preferred_name') ?? '').trim() || null,
      });
      setMessage('Your profile has been updated.');
    } catch (requestError) {
      setError(
        isRecentMfaRequiredError(requestError)
          ? 'Recent multi-factor authentication is required before changing your profile.'
          : formatUserApiError(requestError, 'Unable to update your profile.'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="panel site-form" onSubmit={(event) => void submit(event)}>
      <h3>Edit profile</h3>
      <p>Profile changes require recent multi-factor authentication.</p>
      <div className="form-grid">
        <label>
          Given name
          <input defaultValue={user.profile.given_name ?? ''} name="given_name" required />
        </label>
        <label>
          Middle name
          <input defaultValue={user.profile.middle_name ?? ''} name="middle_name" />
        </label>
        <label>
          Family name
          <input defaultValue={user.profile.family_name ?? ''} name="family_name" required />
        </label>
        <label>
          Preferred name
          <input defaultValue={user.profile.preferred_name ?? ''} name="preferred_name" />
        </label>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {message ? <p>{message}</p> : null}
      <button className="site-button" disabled={busy} type="submit">
        {busy ? 'Saving…' : 'Save profile'}
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
  const [locale, setLocale] = useState(initial?.locale ?? 'en');
  const [timezone, setTimezone] = useState(initial?.timezone ?? 'UTC');
  const [channels, setChannels] = useState<string[]>(initial?.notification_channels ?? ['email', 'in_app']);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocale(initial?.locale ?? 'en');
    setTimezone(initial?.timezone ?? 'UTC');
    setChannels(initial?.notification_channels ?? ['email', 'in_app']);
  }, [initial]);

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
      setTimezone(updated.timezone);
      setChannels(updated.notification_channels);
      setMessage('Preferences saved.');
    } catch (err) {
      setError(formatUserApiError(err, 'Unable to save preferences.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="panel">
      <h3>Preferences</h3>
      <p>Locale, timezone, and notification channels from PUT /user/preferences.</p>
      <label className="setting-row">
        <span>
          <b>Locale</b>
          <small>BCP 47 tag (e.g. en-NG)</small>
        </span>
        <input value={locale} onChange={(e) => setLocale(e.target.value)} type="text" />
      </label>
      <label className="setting-row">
        <span>
          <b>Timezone</b>
          <small>IANA timezone (e.g. Africa/Lagos)</small>
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
        {saving ? 'Saving…' : actionLabel}
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
    return (
      <SettingsGap
        title={route.title}
        detail="Help content is not served from /user APIs. Use published support pages or contact your church administrators."
      />
    );
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
          <LiveProfileForm user={user} />
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
  const pathname = usePathname();
  const fixtures = designFixturesEnabled();
  const [onlineLoading, setOnlineLoading] = useState(!fixtures);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [heroImage, setHeroImage] = useState<string | null>(null);
  const [scheduleRows, setScheduleRows] = useState<Array<[string, string, string, string]>>(
    fixtures ? (schedule as Array<[string, string, string, string]>) : [],
  );
  const [overviewCards, setOverviewCards] = useState<ContentCard[]>(fixtures ? sectionCards.Online : []);
  const sermonsState = useAsyncList(() => loadSermons(), [route.path]);
  const tabs = [
    ['Overview', '/online-church'],
    ['Schedule', '/online-church/schedule'],
    ['Sermons', '/online-church/sermons'],
    ['Bible Study', '/online-church/bible-study'],
  ] as const;

  useEffect(() => {
    if (fixtures) return;
    let cancelled = false;
    setOnlineLoading(true);
    void loadOnlineChurchContent()
      .then((result) => {
        if (cancelled) return;
        setScheduleRows(result.schedule);
        setOverviewCards(result.data.filter((item) => !item.href.includes('/sermons/')));
        setHeroImage(result.page?.image_url ?? null);
        setOnlineError(null);
      })
      .catch((error) => {
        if (!cancelled) setOnlineError(publicErrorMessage(error));
      })
      .finally(() => {
        if (!cancelled) setOnlineLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fixtures, route.path]);

  const sermonCards = fixtures ? sermons : sermonsState.status === 'ready' ? sermonsState.items : [];

  return (
    <>
      <div
        className="media-stage"
        style={heroImage ? { backgroundImage: `linear-gradient(160deg,#1a1040cc,#1a104088), url('${heroImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
      >
        <div className="play">▶</div>
        <div>
          <span className="live">● LIVE</span>
          <h2>{route.title}</h2>
          <p>Join the Family House Connect global family live and on demand.</p>
          <div className="hero-actions">
            <Link className="site-button" href="/online-church/live">
              {route.action ?? 'Watch Live'}
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
          No KCA certificate is on file for your enrollment. Issuance remains gated by OD-008
          governance — this screen does not invent a certificate.
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
        Download/print of signed PDF remains unavailable until certificate delivery APIs are approved.
      </p>
    </div>
  );
}

function Success({ route }: { route: SiteRoute }) {
  if (route.path === '/give/receipt') return <GiveReceiptScreen route={route} />;
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
  const heroImage = useCmsHeroImage('kca');
  return (
    <>
      <Hero route={route} imageUrl={heroImage} />
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
  if (route.path === '/kca/gate') return <KcaGateLanding route={route} />;
  if (route.path === '/prayer') return <PrayerLanding route={route} />;
  return <SectionHeroLanding route={route} />;
}

function SectionHeroLanding({ route }: { route: SiteRoute }) {
  const heroImage = useCmsHeroImage(cmsSlugForRoute(route));
  return (
    <>
      <Hero route={route} imageUrl={heroImage} />
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
  const isMember = route.surface === 'member';
  const hasHomeChurchWorkflowSidebar = route.path === '/start-home-church' || route.path.startsWith('/start-home-church/apply/');
  const hasSidebar = isMember || hasHomeChurchWorkflowSidebar;
  const hideHeading =
    route.kind === 'landing' ||
    route.kind === 'media' ||
    route.kind === 'success' ||
    route.kind === 'hub' ||
    route.kind === 'calendar' ||
    route.surface === 'auth' ||
    route.path === '/account/kca' ||
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
      <Header />
      <Progress route={route} />
      <div className={hasSidebar ? 'member-layout' : 'site-layout'}>
        {isMember ? <Sidebar /> : null}
        {hasHomeChurchWorkflowSidebar ? <HomeChurchApplicationSidebar route={route} /> : null}
        <main className="site-main">
          {!hideHeading ? (
            <div className="page-heading">
              <span className="eyebrow">{route.section}</span>
              <h1>{route.title}</h1>
              <p>{route.subtitle}</p>
            </div>
          ) : null}
          {content}
        </main>
      </div>
      <footer>
        <Logo />
        <p>One Family. One Mission. Transforming nations for Christ.</p>
        <span>© 2026 Family House Connect</span>
      </footer>
    </div>
  );
}
