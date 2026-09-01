import type { ContentCard, EventItem, FaqItem, Metric } from '@/lib/site-content';
import {
  churches as fixtureChurches,
  crusades as fixtureCrusades,
  eventCatalog as fixtureEvents,
  faqs as fixtureFaqs,
  globalMetrics as fixtureMetrics,
  homeActions as fixtureHomeActions,
  partners as fixturePartners,
  pillars as fixturePillars,
  pressResources as fixturePress,
  projects as fixtureProjects,
  schedule as fixtureSchedule,
  sectionCards as fixtureSectionCards,
  sermons as fixtureSermons,
  stories as fixtureStories,
} from '@/lib/site-content';
import {
  cardsFromPage,
  faqsFromPage,
  isContentPageNotFound,
  itemsOfKind,
  loadContentPage,
  loadContentPages,
  metricsFromPage,
  scheduleRowsFromPage,
  type ContentPage,
  type ContentPageItem,
  type ContentPageSummary,
} from '@/lib/content-api';
import { isPublicApiConfigured, publicRequest, PublicApiError } from '@/lib/public-api';
import type { JsonObject } from '@/lib/api-types';
import type { MapMarker, MapsBootstrap, MapProvider } from '@/components/interactive-map';

export type HealthData = { status: 'ok'; service: 'family-house-connect-api' };

/** Fixtures are allowed only when explicitly enabled (server or NEXT_PUBLIC mirror). */
export function designFixturesEnabled(): boolean {
  return (
    process.env.FHC_ENABLE_DESIGN_FIXTURES === 'true' ||
    process.env.NEXT_PUBLIC_FHC_ENABLE_DESIGN_FIXTURES === 'true'
  );
}

export type PublicLocation = {
  id: string;
  name: string;
  locality?: string | null;
  timezone?: string | null;
  country?: { id?: string; code?: string; name?: string } | null;
  administrative_unit?: { id: string; name: string } | null;
  coordinates?: { latitude: number; longitude: number } | null;
};

export type PublicChurch = {
  id: string;
  name: string;
  location: PublicLocation;
  published_at?: string | null;
  image_url?: string | null;
  home_churches?: Array<{
    id: string;
    name: string;
    status?: string | null;
    meeting_schedules?: Array<{ day?: string; time?: string; activity?: string }>;
  }>;
};

export type PublicEvent = {
  id: string;
  category: string | null;
  name: string;
  starts_at: string;
  ends_at: string;
  location: PublicLocation | null;
  fee: { amount_minor: number; currency: string } | null;
  image_url?: string | null;
};

export type PublicPressPublication = {
  id: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  summary?: string | null;
  category?: string | null;
  format?: string | null;
  publication_type?: string | null;
  availability?: string | null;
  publisher?: string | null;
  published_at?: string | null;
  image_url?: string | null;
  type_metadata?: Record<string, unknown> | null;
};

export type PublicCrusade = {
  id: string;
  name: string;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: PublicLocation | null;
  image_url?: string | null;
};

export type PublicMissionLocation = {
  id: string;
  name: string;
  locality?: string | null;
  timezone?: string | null;
  coordinates?: { latitude: number; longitude: number } | null;
  country?: { code: string; name: string } | null;
};

export const FAMILY_HOUSE_HOME_CHURCH_PREFIX = 'Family House Home Church';

export function composeHomeChurchName(familyName: string): string {
  const family = familyName.trim().replace(/\s+/g, ' ');
  if (!family) return FAMILY_HOUSE_HOME_CHURCH_PREFIX;
  return `${FAMILY_HOUSE_HOME_CHURCH_PREFIX} @ ${family} Residence`;
}

export type HomeChurchMeetingSchedule = { day: string; time: string; activity: string };

export type HomeChurchApplicationPayload = {
  church_id: string;
  location_id: string;
  administrative_unit_id: string;
  applicant: {
    given_name: string;
    middle_name?: string | null;
    family_name: string;
    preferred_name?: string | null;
  };
  proposed_name: string;
  residence_family_name: string;
  expected_participants: number;
  meeting_day: string;
  meeting_time: string;
  meeting_schedules: HomeChurchMeetingSchedule[];
  contact_email: string;
  contact_phone: string;
  guidelines_agreed: boolean | string;
  idempotency_key?: string;
};

export type HomeChurchApplicationResult = {
  application_id: string;
  status: string;
  received_at?: string | null;
};

export type KcaCertificateVerification = {
  verified: boolean;
  certificate_number: string;
  completion_on: string;
  issued_at: string;
};

export type MapsPlace = {
  id: string;
  name: string;
  type: string;
  address?: string;
  coordinates: { latitude: number; longitude: number };
  href?: string;
  distance_km?: number;
};

export type LoadResult<T> =
  | { status: 'loading' }
  | { status: 'ready'; data: T; source: 'api' | 'fixtures' }
  | { status: 'empty'; message: string }
  | { status: 'error'; message: string; code?: string };

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items;
  }
  if (data && typeof data === 'object' && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: T[] }).data;
  }
  return [];
}

function formatWhen(startsAt?: string | null, endsAt?: string | null): string {
  if (!startsAt) return 'Schedule TBA';
  const start = new Date(startsAt);
  if (Number.isNaN(start.getTime())) return startsAt;
  const startLabel = start.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  if (!endsAt) return startLabel;
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return startLabel;
  return `${startLabel} – ${end.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`;
}

function locationLabel(location?: PublicLocation | null): string {
  if (!location) return 'Location TBA';
  return [location.name, location.locality, location.country?.name].filter(Boolean).join(' · ') || 'Location TBA';
}

export function churchToCard(church: PublicChurch): ContentCard {
  const place = locationLabel(church.location);
  return {
    title: church.name,
    body: place,
    href: `/churches/${church.id}`,
    meta: church.location.country?.name ? `Church · ${church.location.country.name}` : 'Church',
    status: 'Published',
    icon: '⛪',
    action: 'Join',
    image: church.image_url ?? undefined,
  };
}

export function eventToItem(event: PublicEvent): EventItem {
  const ends = new Date(event.ends_at);
  const past = !Number.isNaN(ends.getTime()) && ends.getTime() < Date.now();
  return {
    title: event.name,
    body: event.category ? `${event.category.replace(/_/g, ' ')} gathering with Family House.` : 'Family House event.',
    href: `/events/${event.id}`,
    meta: event.category ? event.category.replace(/_/g, ' ') : 'Event',
    status: past ? 'Completed' : 'Upcoming',
    icon: past ? '✓' : '▣',
    when: formatWhen(event.starts_at, event.ends_at),
    startsAt: event.starts_at,
    where: locationLabel(event.location),
    tab: past ? 'past' : 'upcoming',
    action: past ? 'View' : 'Register',
    image: event.image_url ?? undefined,
  };
}

export function pressPublicationTypeLabel(type?: string | null): string {
  switch ((type ?? '').toLowerCase()) {
    case 'bible_study':
      return 'Study Manual';
    case 'devotional':
      return 'Devotional';
    case 'document_pdf':
      return 'Document';
    case 'sermon':
      return 'Sermon';
    case 'book':
      return 'Book';
    default:
      return type && type.trim() !== '' ? type.replace(/_/g, ' ') : 'Press';
  }
}

export function isDevotionalFamilyType(type?: string | null): boolean {
  const value = (type ?? '').toLowerCase();
  return value === 'devotional' || value === 'bible_study';
}

export function pressToCard(publication: PublicPressPublication): ContentCard {
  return {
    title: publication.title,
    body: publication.subtitle || publication.summary || publication.description || 'Family House Press resource.',
    href: `/press/${publication.id}`,
    meta: [pressPublicationTypeLabel(publication.publication_type), publication.format, publication.category].filter(Boolean).join(' · ') || 'Press',
    status: publication.availability ?? undefined,
    icon: isDevotionalFamilyType(publication.publication_type) ? '📙' : '📘',
    action: 'Read',
    image: publication.image_url ?? undefined,
  };
}

export function crusadeToCard(crusade: PublicCrusade): ContentCard {
  const ends = crusade.ends_at ? new Date(crusade.ends_at) : null;
  const past = ends && !Number.isNaN(ends.getTime()) && ends.getTime() < Date.now();
  const upcoming = crusade.starts_at ? new Date(crusade.starts_at).getTime() > Date.now() : !past;
  return {
    title: crusade.name,
    body: `${locationLabel(crusade.location)} · ${formatWhen(crusade.starts_at, crusade.ends_at)}`,
    href: `/mission/crusades/${crusade.id}`,
    meta: crusade.location?.country?.name ?? 'Mission',
    status: past ? 'Completed' : upcoming ? 'Upcoming' : 'In Progress',
    icon: '🌍',
    action: past ? 'View Impact' : 'Support',
    image: crusade.image_url ?? undefined,
  };
}

export function missionLocationToCard(location: PublicMissionLocation): ContentCard {
  return {
    title: location.name,
    body: [location.locality, location.country?.name].filter(Boolean).join(' · ') || 'Mission location',
    href: `/mission/locations`,
    meta: location.country?.code ?? 'Mission',
    status: 'Active',
    icon: '🏛',
  };
}

export function placeToMarker(place: MapsPlace): MapMarker {
  return {
    id: place.id,
    name: place.name,
    latitude: place.coordinates.latitude,
    longitude: place.coordinates.longitude,
    type: place.type,
    href: place.href,
  };
}

function mapsConfigFromApi(data: Record<string, unknown>): MapsBootstrap {
  const center = (data.default_center as { latitude?: number; longitude?: number } | undefined) ?? {};
  const provider = (data.provider as MapProvider | undefined) ?? 'leaflet';
  const active = Boolean(data.active);
  const tileFromApi = (data.tile_url as string | null | undefined) ?? null;
  return {
    active,
    provider: provider === 'google' || provider === 'mapbox' || provider === 'leaflet' ? provider : 'leaflet',
    // Never invent Google/Mapbox keys — only echo what the public bootstrap returns.
    clientApiKey: active ? ((data.client_api_key as string | null | undefined) ?? null) : null,
    tileUrl: active
      ? tileFromApi ?? (provider === 'leaflet' ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' : null)
      : null,
    defaultCenter: {
      latitude: typeof center.latitude === 'number' ? center.latitude : 6.5244,
      longitude: typeof center.longitude === 'number' ? center.longitude : 3.3792,
    },
    defaultZoom: typeof data.default_zoom === 'number' ? data.default_zoom : 12,
  };
}

async function withFixtureFallback<T>(loader: () => Promise<T>, fixtures: () => T): Promise<{ data: T; source: 'api' | 'fixtures' }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) return { data: fixtures(), source: 'fixtures' };
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    return { data: await loader(), source: 'api' };
  } catch (error) {
    if (designFixturesEnabled()) return { data: fixtures(), source: 'fixtures' };
    throw error;
  }
}

/** Health check through the deployment-safe public API transport. */
export async function loadHealth(): Promise<{ data: HealthData; source: 'api' }> {
  if (!isPublicApiConfigured()) {
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  return { data: await publicRequest<HealthData>('health'), source: 'api' };
}

export async function loadChurches(query?: Record<string, string | number | undefined>): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return withFixtureFallback(
    async () => {
      const data = await publicRequest<unknown>('churches', {
        query: { per_page: query?.per_page ?? 50, ...query },
      });
      return asList<PublicChurch>(data).map(churchToCard);
    },
    () => fixtureChurches,
  );
}

export async function loadChurch(id: string): Promise<{ data: ContentCard; source: 'api' | 'fixtures'; raw?: PublicChurch }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return { data: fixtureChurches.find((item) => item.href.includes(id)) ?? fixtureChurches[0], source: 'fixtures' };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const church = await publicRequest<PublicChurch>(`churches/${encodeURIComponent(id)}`);
    return { data: churchToCard(church), source: 'api', raw: church };
  } catch (error) {
    if (designFixturesEnabled()) {
      return { data: fixtureChurches.find((item) => item.href.includes(id)) ?? fixtureChurches[0], source: 'fixtures' };
    }
    throw error;
  }
}

export async function loadEvent(id: string): Promise<{ data: EventItem; source: 'api' | 'fixtures'; raw?: PublicEvent }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return { data: fixtureEvents.find((item) => item.href.includes(id)) ?? fixtureEvents[0], source: 'fixtures' };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const event = await publicRequest<PublicEvent>(`events/${encodeURIComponent(id)}`);
    return { data: eventToItem(event), source: 'api', raw: event };
  } catch (error) {
    if (designFixturesEnabled()) {
      return { data: fixtureEvents.find((item) => item.href.includes(id)) ?? fixtureEvents[0], source: 'fixtures' };
    }
    throw error;
  }
}

export async function loadEvents(query?: Record<string, string | number | undefined>): Promise<{ data: EventItem[]; source: 'api' | 'fixtures' }> {
  return withFixtureFallback(
    async () => {
      const data = await publicRequest<unknown>('events', {
        query: { per_page: query?.per_page ?? 50, ...query },
      });
      return asList<PublicEvent>(data).map(eventToItem);
    },
    () => fixtureEvents,
  );
}

export async function loadPressPublications(query?: Record<string, string | number | undefined>): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return withFixtureFallback(
    async () => {
      const data = await publicRequest<unknown>('press/publications', {
        query: { per_page: query?.per_page ?? 50, ...query },
      });
      return asList<PublicPressPublication>(data).map(pressToCard);
    },
    () => fixturePress,
  );
}

export async function loadDevotionalPublications(kind?: 'devotional' | 'bible_study' | 'all'): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  const wanted = kind && kind !== 'all' ? [kind] : (['devotional', 'bible_study'] as const);
  const results = await Promise.all(
    wanted.map((type) => loadPressPublications({ per_page: 50, 'filter[publication_type]': type })),
  );
  const seen = new Set<string>();
  const data: ContentCard[] = [];
  for (const result of results) {
    for (const card of result.data) {
      if (seen.has(card.href)) continue;
      seen.add(card.href);
      data.push(card);
    }
  }
  const fixtures = results.some((result) => result.source === 'fixtures');
  const filtered = fixtures
    ? data.filter((card) => {
        const meta = (card.meta ?? '').toLowerCase();
        return meta.includes('devotional') || meta.includes('study manual');
      })
    : data;
  return { data: filtered, source: results[0]?.source ?? 'api' };
}

export async function loadPressPublication(id: string): Promise<{ data: ContentCard; source: 'api' | 'fixtures'; raw?: PublicPressPublication }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return { data: fixturePress.find((item) => item.href.includes(id)) ?? fixturePress[0], source: 'fixtures' };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const publication = await publicRequest<PublicPressPublication>(`press/publications/${encodeURIComponent(id)}`);
    return { data: pressToCard(publication), source: 'api', raw: publication };
  } catch (error) {
    if (designFixturesEnabled()) {
      return { data: fixturePress.find((item) => item.href.includes(id)) ?? fixturePress[0], source: 'fixtures' };
    }
    throw error;
  }
}

export async function loadCrusades(query?: Record<string, string | number | undefined>): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return withFixtureFallback(
    async () => {
      const data = await publicRequest<unknown>('mission/crusades', {
        query: { per_page: query?.per_page ?? 50, ...query },
      });
      return asList<PublicCrusade>(data).map(crusadeToCard);
    },
    () => fixtureCrusades,
  );
}

export async function loadCrusade(id: string): Promise<{ data: ContentCard; source: 'api' | 'fixtures'; raw?: PublicCrusade }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return { data: fixtureCrusades.find((item) => item.href.includes(id)) ?? fixtureCrusades[0], source: 'fixtures' };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const crusade = await publicRequest<PublicCrusade>(`mission/crusades/${encodeURIComponent(id)}`);
    return { data: crusadeToCard(crusade), source: 'api', raw: crusade };
  } catch (error) {
    if (designFixturesEnabled()) {
      return { data: fixtureCrusades.find((item) => item.href.includes(id)) ?? fixtureCrusades[0], source: 'fixtures' };
    }
    throw error;
  }
}

export async function loadMissionLocations(query?: Record<string, string | number | undefined>): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return withFixtureFallback(
    async () => {
      const data = await publicRequest<unknown>('mission/locations', {
        query: { per_page: query?.per_page ?? 50, ...query },
      });
      return asList<PublicMissionLocation>(data).map(missionLocationToCard);
    },
    () => fixtureCrusades,
  );
}

const FIXTURE_MAP_MARKERS: MapMarker[] = [
  { id: 'ikeja', name: 'Family House Church Ikeja', latitude: 6.6018, longitude: 3.3515, type: 'church', href: '/churches/family-house-ikeja' },
  { id: 'lekki', name: 'Family House Church Lekki', latitude: 6.4474, longitude: 3.4723, type: 'church', href: '/churches/family-house-lekki' },
];

/** Inactive / unconfigured bootstrap — no tiles, keys, or pins. */
function inactiveMapsBootstrap(): MapsBootstrap {
  return {
    active: false,
    provider: 'leaflet',
    clientApiKey: null,
    tileUrl: null,
    defaultCenter: { latitude: 6.5244, longitude: 3.3792 },
    defaultZoom: 12,
  };
}

export async function loadMapsBootstrap(query?: {
  type?: 'church' | 'home_church' | 'all';
  near_lat?: number;
  near_lng?: number;
  radius_km?: number;
  limit?: number;
}): Promise<{ config: MapsBootstrap; markers: MapMarker[]; source: 'api' | 'fixtures' }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return {
        config: {
          ...inactiveMapsBootstrap(),
          active: true,
          tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        },
        markers: FIXTURE_MAP_MARKERS,
        source: 'fixtures',
      };
    }
    // Fixtures off → clear unavailable, never invent pins or vendor keys.
    return { config: inactiveMapsBootstrap(), markers: [], source: 'api' };
  }

  try {
    const [configData, placesData] = await Promise.all([
      publicRequest<Record<string, unknown>>('maps/configuration'),
      publicRequest<unknown>('maps/places', {
        query: {
          type: query?.type ?? 'all',
          near_lat: query?.near_lat,
          near_lng: query?.near_lng,
          radius_km: query?.radius_km,
          limit: query?.limit ?? 100,
        },
      }),
    ]);

    const config = mapsConfigFromApi(configData);
    // Only surface place pins when a provider is activated; inactive → empty (not fake pins).
    const markers = config.active ? asList<MapsPlace>(placesData).map(placeToMarker) : [];
    return { config, markers, source: 'api' };
  } catch (error) {
    if (designFixturesEnabled()) {
      return {
        config: {
          ...inactiveMapsBootstrap(),
          active: true,
          tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        },
        markers: FIXTURE_MAP_MARKERS,
        source: 'fixtures',
      };
    }
    throw error;
  }
}

/** Resolve a directions destination from live maps places (no hardcoded fixture coords). */
export async function loadMapDestination(path: string): Promise<MapMarker | null> {
  const bootstrap = await loadMapsBootstrap({ type: 'all', limit: 100 });
  if (!bootstrap.config.active && bootstrap.source !== 'fixtures') return null;

  const profilePath = path.replace(/\/(directions|contact|register|join)$/i, '');
  const entityId = pathEntityId(profilePath);
  const match =
    bootstrap.markers.find((marker) => marker.href && (path === marker.href || path.startsWith(`${marker.href}/`))) ??
    bootstrap.markers.find((marker) => entityId != null && marker.id === entityId) ??
    bootstrap.markers.find((marker) => entityId != null && path.includes(marker.id));

  return match ?? null;
}

export async function submitHomeChurchApplication(
  payload: HomeChurchApplicationPayload,
  idempotencyKey: string,
): Promise<HomeChurchApplicationResult> {
  const body: JsonObject = {
    church_id: payload.church_id,
    location_id: payload.location_id,
    administrative_unit_id: payload.administrative_unit_id,
    applicant: {
      given_name: payload.applicant.given_name,
      middle_name: payload.applicant.middle_name ?? null,
      family_name: payload.applicant.family_name,
      preferred_name: payload.applicant.preferred_name ?? null,
    },
    proposed_name: payload.proposed_name,
    residence_family_name: payload.residence_family_name,
    expected_participants: payload.expected_participants,
    meeting_day: payload.meeting_day,
    meeting_time: payload.meeting_time,
    meeting_schedules: payload.meeting_schedules,
    contact_email: payload.contact_email,
    contact_phone: payload.contact_phone,
    guidelines_agreed: payload.guidelines_agreed === true || payload.guidelines_agreed === 'yes' || payload.guidelines_agreed === 'true' || payload.guidelines_agreed === '1',
    idempotency_key: idempotencyKey,
  };

  return publicRequest<HomeChurchApplicationResult>('home-church-applications', {
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export async function verifyKcaCertificate(code: string): Promise<KcaCertificateVerification> {
  return publicRequest<KcaCertificateVerification>('kca/certificates/verify', {
    query: { code },
  });
}

/** There is no public contact-inbox write API on /api/v1. Do not treat form POST as delivered. */
export const PUBLIC_CONTACT_INBOX_UNAVAILABLE_MESSAGE =
  'Contact form delivery is not connected to a Laravel inbox API yet. Email hello@familyhouseconnect.org directly.';

export function publicErrorMessage(error: unknown, fallback = 'Unable to load this content right now.'): string {
  if (error instanceof PublicApiError) {
    if (error.code === 'API_NOT_CONFIGURED') return 'Public API is not configured. Set NEXT_PUBLIC_FHC_API_URL.';
    return error.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export const HOME_CHURCH_DRAFT_KEY = 'fhc.home-church-application.draft';

export function readHomeChurchDraft(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(HOME_CHURCH_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function writeHomeChurchDraft(patch: Record<string, string>): Record<string, string> {
  const next = { ...readHomeChurchDraft(), ...patch };
  window.sessionStorage.setItem(HOME_CHURCH_DRAFT_KEY, JSON.stringify(next));
  return next;
}

export function clearHomeChurchDraft(): void {
  window.sessionStorage.removeItem(HOME_CHURCH_DRAFT_KEY);
}

export function draftToHomeChurchPayload(draft: Record<string, string>): HomeChurchApplicationPayload | null {
  const churchId = draft['church_id'];
  const locationId = draft['location_id'];
  const unitId = draft['administrative_unit_id'];
  const given = draft['applicant.given_name'];
  const family = draft['applicant.family_name'];
  const familyResidence = (draft['residence_family_name'] ?? '').trim();
  const proposed = familyResidence ? composeHomeChurchName(familyResidence) : (draft['proposed_name'] ?? '').trim();
  const participants = Number(draft['expected_participants'] ?? '');
  let schedules: HomeChurchMeetingSchedule[] = [];
  try {
    const parsed = JSON.parse(draft['meeting_schedules'] ?? '[]') as HomeChurchMeetingSchedule[];
    if (Array.isArray(parsed)) schedules = parsed.filter((row) => row?.day && row?.time);
  } catch {
    schedules = [];
  }
  const meetingDay = schedules[0]?.day ?? draft['meeting_day'];
  const meetingTime = schedules[0]?.time ?? draft['meeting_time'];
  const email = draft['contact_email'];
  const phone = draft['contact_phone'];
  const guidelines = draft['guidelines_agreed'] ?? 'yes';

  if (!churchId || !locationId || !unitId || !given || !family || !proposed || !meetingDay || !meetingTime || !email || !phone) {
    return null;
  }
  if (!Number.isFinite(participants) || participants < 1) return null;

  return {
    church_id: churchId,
    location_id: locationId,
    administrative_unit_id: unitId,
    applicant: {
      given_name: given,
      middle_name: draft['applicant.middle_name'] || null,
      family_name: family,
      preferred_name: draft['applicant.preferred_name'] || null,
    },
    proposed_name: proposed,
    residence_family_name: familyResidence || family,
    expected_participants: participants,
    meeting_day: meetingDay,
    meeting_time: meetingTime,
    meeting_schedules: schedules.length > 0 ? schedules : [{ day: meetingDay, time: meetingTime, activity: 'Gathering' }],
    contact_email: email,
    contact_phone: phone,
    guidelines_agreed: guidelines,
  };
}

export function pathEntityId(path: string): string | null {
  const parts = path.split('/').filter(Boolean);
  if (!parts.length) return null;
  const workflow = new Set(['directions', 'contact', 'register', 'join']);
  let index = parts.length - 1;
  if (workflow.has(parts[index]!.toLowerCase()) && parts.length >= 2) {
    index -= 1;
  }
  const last = parts[index]!;
  if (/^[0-9A-HJKMNP-TV-Z]{26}$/i.test(last)) return last;
  // workflow suffixes already stripped; keep slug ids (e.g. family-house-ikeja)
  return last;
}

/** CMS slug → fixture fallback when design fixtures are explicitly enabled. */
const CMS_CARD_FIXTURES: Record<string, () => ContentCard[]> = {
  home: () => [...fixturePillars, ...fixtureHomeActions],
  about: () => [
    { title: 'Build', body: 'Plant and strengthen churches that love God and people.', href: '/church', icon: '🏛' },
    { title: 'Equip', body: 'Train believers through KCA and practical ministry.', href: '/kca', icon: '🎓' },
    { title: 'Send', body: 'Mobilize teams for crusades, outreach, and compassion.', href: '/mission', icon: '🚀' },
    { title: 'Multiply', body: 'Raise disciples who raise disciples in every place.', href: '/global-journey', icon: '🌱' },
  ],
  sermons: () => fixtureSermons,
  partners: () => fixturePartners,
  projects: () => fixtureProjects,
  stories: () => fixtureStories,
  'online-church': () => fixtureSermons,
};

async function loadCmsPageOrThrow(slug: string): Promise<ContentPage> {
  const result = await loadContentPage(slug);
  return result.data;
}

function headingCopy(page: ContentPage | null | undefined, section: string, index: number): { eyebrow: string; title: string } | null {
  const items = itemsOfKind(page, 'heading');
  const match = items.find((item) => {
    const meta = item.meta;
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return false;
    return String((meta as Record<string, unknown>).section ?? '') === section;
  });
  const item: ContentPageItem | undefined = match ?? items[index];
  if (!item) return null;
  const eyebrow = (item.title ?? '').trim();
  const title = (item.body ?? '').trim();
  if (!eyebrow && !title) return null;
  return { eyebrow, title };
}

export async function loadCmsPageMeta(slug: string): Promise<{ title: string | null; summary: string | null; imageUrl: string | null }> {
  if (designFixturesEnabled() || !isPublicApiConfigured()) {
    return { title: null, summary: null, imageUrl: null };
  }
  try {
    const page = await loadCmsPageOrThrow(slug);
    return {
      title: page.title?.trim() || null,
      summary: page.summary?.trim() || null,
      imageUrl: page.image_url ?? null,
    };
  } catch (error) {
    if (isContentPageNotFound(error)) return { title: null, summary: null, imageUrl: null };
    throw error;
  }
}

/** Single-fetch CMS cards for a published page slug. */
export async function loadCmsPageCards(
  slug: string,
  kinds: string | string[] = 'card',
): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures'; page: ContentPage | null }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return { data: CMS_CARD_FIXTURES[slug]?.() ?? [], source: 'fixtures', page: null };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const page = await loadCmsPageOrThrow(slug);
    return { data: cardsFromPage(page, kinds), source: 'api', page };
  } catch (error) {
    if (designFixturesEnabled()) {
      return { data: CMS_CARD_FIXTURES[slug]?.() ?? [], source: 'fixtures', page: null };
    }
    if (isContentPageNotFound(error)) {
      return { data: [], source: 'api', page: null };
    }
    throw error;
  }
}

export async function loadFaqs(): Promise<{ data: FaqItem[]; source: 'api' | 'fixtures' }> {
  return withFixtureFallback(
    async () => {
      try {
        return faqsFromPage(await loadCmsPageOrThrow('faq'));
      } catch (error) {
        if (isContentPageNotFound(error)) return [];
        throw error;
      }
    },
    () => fixtureFaqs,
  );
}

export async function loadHomeMetrics(): Promise<{ data: Metric[]; source: 'api' | 'fixtures' }> {
  return withFixtureFallback(
    async () => {
      try {
        return metricsFromPage(await loadCmsPageOrThrow('home'));
      } catch (error) {
        if (isContentPageNotFound(error)) return [];
        throw error;
      }
    },
    () => fixtureMetrics,
  );
}

export async function loadHomeMarketing(): Promise<{
  metrics: Metric[];
  pillars: ContentCard[];
  actions: ContentCard[];
  heroImage?: string | null;
  title?: string | null;
  summary?: string | null;
  pillarHeading?: { eyebrow: string; title: string } | null;
  actionHeading?: { eyebrow: string; title: string } | null;
  source: 'api' | 'fixtures';
}> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return { metrics: fixtureMetrics, pillars: fixturePillars, actions: fixtureHomeActions, heroImage: null, source: 'fixtures' };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const page = await loadCmsPageOrThrow('home');
    const metrics = metricsFromPage(page);
    const pillars = cardsFromPage(page, ['pillar']);
    const actions = cardsFromPage(page, ['card']);
    const heroImage = page.image_url ?? null;
    const title = page.title?.trim() || null;
    const summary = page.summary?.trim() || null;
    const pillarHeading = headingCopy(page, 'pillars', 0);
    const actionHeading = headingCopy(page, 'actions', 1);
    if (!pillars.length && actions.length) {
      return {
        metrics,
        pillars: actions.slice(0, 4),
        actions: actions.slice(4),
        heroImage,
        title,
        summary,
        pillarHeading,
        actionHeading,
        source: 'api',
      };
    }
    return { metrics, pillars, actions, heroImage, title, summary, pillarHeading, actionHeading, source: 'api' };
  } catch (error) {
    if (designFixturesEnabled()) {
      return { metrics: fixtureMetrics, pillars: fixturePillars, actions: fixtureHomeActions, heroImage: null, source: 'fixtures' };
    }
    if (isContentPageNotFound(error)) {
      return { metrics: [], pillars: [], actions: [], heroImage: null, source: 'api' };
    }
    throw error;
  }
}

export async function loadSermons(): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return loadCmsPageCards('sermons', ['sermon', 'card']).then((r) => ({ data: r.data, source: r.source }));
}

export async function loadPartners(): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return loadCmsPageCards('partners', ['partner', 'card']).then((r) => ({ data: r.data, source: r.source }));
}

export async function loadProjects(): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return loadCmsPageCards('projects', ['card', 'project']).then((r) => ({ data: r.data, source: r.source }));
}

export async function loadStories(): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures' }> {
  return loadCmsPageCards('stories', ['card', 'story']).then((r) => ({ data: r.data, source: r.source }));
}

export async function loadAboutPage(): Promise<{ data: ContentPage | null; source: 'api' | 'fixtures'; cards: ContentCard[] }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return { data: null, source: 'fixtures', cards: CMS_CARD_FIXTURES.about!() };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const page = await loadCmsPageOrThrow('about');
    return { data: page, source: 'api', cards: cardsFromPage(page, ['card']) };
  } catch (error) {
    if (designFixturesEnabled()) {
      return { data: null, source: 'fixtures', cards: CMS_CARD_FIXTURES.about!() };
    }
    if (isContentPageNotFound(error)) {
      return { data: null, source: 'api', cards: [] };
    }
    throw error;
  }
}

export async function loadOnlineChurchContent(): Promise<{
  data: ContentCard[];
  schedule: Array<[string, string, string, string]>;
  source: 'api' | 'fixtures';
  page: ContentPage | null;
}> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) {
      return {
        data: fixtureSermons,
        schedule: fixtureSchedule as Array<[string, string, string, string]>,
        source: 'fixtures',
        page: null,
      };
    }
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const page = await loadCmsPageOrThrow('online-church');
    return {
      data: cardsFromPage(page, ['sermon', 'card']),
      schedule: scheduleRowsFromPage(page),
      source: 'api',
      page,
    };
  } catch (error) {
    if (designFixturesEnabled()) {
      return {
        data: fixtureSermons,
        schedule: fixtureSchedule as Array<[string, string, string, string]>,
        source: 'fixtures',
        page: null,
      };
    }
    if (isContentPageNotFound(error)) {
      return { data: [], schedule: [], source: 'api', page: null };
    }
    throw error;
  }
}

/** Resolve listing content for paths that previously always used site-content fixtures. */
export function cmsListingLoader(path: string): (() => Promise<{ data: ContentCard[] }>) | null {
  if (path.includes('/mission/partners')) return () => loadPartners();
  if (path.includes('/mission/projects')) return () => loadProjects();
  if (path.includes('/mission/stories')) return () => loadStories();
  if (path.includes('/online-church/sermons')) return () => loadSermons();
  return null;
}

/** Public section landing → CMS page slug (GET /content/pages/{slug}). */
const SECTION_CMS_SLUG: Record<string, string> = {
  Church: 'church',
  Mission: 'mission',
  KCA: 'kca',
  Giving: 'giving',
  Online: 'online-church',
  Press: 'press',
  Events: 'events',
};

export async function loadCmsHeroImage(slug: string): Promise<string | null> {
  if (designFixturesEnabled() || !isPublicApiConfigured()) return null;
  try {
    const page = await loadCmsPageOrThrow(slug);
    return page.image_url ?? null;
  } catch (error) {
    if (isContentPageNotFound(error)) return null;
    throw error;
  }
}

/**
 * Section landing cards: live CMS when fixtures are off; site-content fixtures only when enabled.
 * Missing CMS page → empty list (UI empty state), not fixture cards.
 */
export async function loadSectionLandingCards(
  section: string,
): Promise<{ data: ContentCard[]; source: 'api' | 'fixtures'; page: ContentPage | null }> {
  if (designFixturesEnabled()) {
    return { data: fixtureSectionCards[section] ?? [], source: 'fixtures', page: null };
  }
  const slug = SECTION_CMS_SLUG[section];
  if (!slug) {
    return { data: [], source: 'api', page: null };
  }
  if (!isPublicApiConfigured()) {
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    const page = await loadCmsPageOrThrow(slug);
    return { data: cardsFromPage(page, ['card', 'pillar']), source: 'api', page };
  } catch (error) {
    if (isContentPageNotFound(error)) {
      return { data: [], source: 'api', page: null };
    }
    throw error;
  }
}

/** Published CMS page index from GET /content/pages. Fixtures only when explicitly enabled. */
export async function loadPublishedPages(): Promise<{ data: ContentPageSummary[]; source: 'api' | 'fixtures' }> {
  if (!isPublicApiConfigured()) {
    if (designFixturesEnabled()) return { data: [], source: 'fixtures' };
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  try {
    return await loadContentPages();
  } catch (error) {
    if (designFixturesEnabled()) return { data: [], source: 'fixtures' };
    throw error;
  }
}
