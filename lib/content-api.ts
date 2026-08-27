import type { ContentCard, FaqItem, Metric } from '@/lib/site-content';
import { isPublicApiConfigured, publicRequest, PublicApiError } from '@/lib/public-api';

/** Published CMS page from GET /api/v1/content/pages/{slug}. */
export type ContentPage = {
  id?: string;
  public_id?: string;
  slug: string;
  title: string;
  summary?: string | null;
  body?: string | null;
  locale?: string | null;
  published_at?: string | null;
  image_url?: string | null;
  items?: ContentPageItem[];
};

/** Item kinds: faq | sermon | partner | metric | card | schedule | … */
export type ContentPageItem = {
  id?: string;
  public_id?: string;
  kind: string;
  title?: string | null;
  body?: string | null;
  href?: string | null;
  sort_order?: number | null;
  published_at?: string | null;
  /** JSON meta may be object or string depending on serializer. */
  meta?: string | Record<string, unknown> | null;
  icon?: string | null;
  status?: string | null;
  action?: string | null;
  value?: string | null;
  label?: string | null;
  change?: string | null;
  q?: string | null;
  a?: string | null;
  when?: string | null;
  where?: string | null;
  lead?: string | null;
  image_url?: string | null;
};

export type ContentPageSummary = {
  id?: string;
  public_id?: string;
  slug: string;
  title: string;
  summary?: string | null;
  published_at?: string | null;
};

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

const PUBLIC_META_KEYS = ['label', 'status', 'category', 'duration', 'when', 'lead'] as const;
const INTERNAL_META_KEYS = new Set(['icon', 'image', 'image_url', 'file_asset_id', 'href', 'action']);

function asMetaObject(meta: ContentPageItem['meta']): Record<string, unknown> | null {
  if (meta == null) return null;
  if (typeof meta === 'object' && !Array.isArray(meta)) return meta;
  if (typeof meta !== 'string') return null;
  const trimmed = meta.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function metaString(meta: ContentPageItem['meta']): string | undefined {
  if (meta == null) return undefined;
  if (typeof meta === 'string') {
    const trimmed = meta.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return metaString(asMetaObject(trimmed));
    return trimmed;
  }
  for (const key of PUBLIC_META_KEYS) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function metaField(meta: ContentPageItem['meta'], key: string): string | undefined {
  const record = asMetaObject(meta) ?? (meta && typeof meta === 'object' ? meta : null);
  if (!record) return undefined;
  const value = record[key];
  return typeof value === 'string' ? value : typeof value === 'number' ? String(value) : undefined;
}

function isInternalMetaDump(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return false;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return true;
    return Object.keys(parsed).every((key) => INTERNAL_META_KEYS.has(key));
  } catch {
    return true;
  }
}

export function itemToCard(item: ContentPageItem, fallbackHref = '#'): ContentCard {
  const metaLabel = metaString(item.meta);
  return {
    title: item.title ?? 'Untitled',
    body: item.body ?? '',
    href: item.href || fallbackHref,
    icon: item.icon ?? metaField(item.meta, 'icon') ?? undefined,
    meta: metaLabel && !isInternalMetaDump(metaLabel) ? metaLabel : undefined,
    status: item.status ?? metaField(item.meta, 'status') ?? undefined,
    action: item.action ?? metaField(item.meta, 'action') ?? undefined,
    image: item.image_url ?? metaField(item.meta, 'image_url') ?? metaField(item.meta, 'image') ?? undefined,
  };
}

export function itemToFaq(item: ContentPageItem): FaqItem {
  return {
    q: item.q ?? item.title ?? 'Question',
    a: item.a ?? item.body ?? '',
  };
}

export function itemToMetric(item: ContentPageItem): Metric {
  return {
    value: item.value ?? metaField(item.meta, 'value') ?? item.title ?? '—',
    label: item.label ?? metaField(item.meta, 'label') ?? item.body ?? 'Metric',
    change: item.change ?? metaField(item.meta, 'change') ?? undefined,
  };
}

export function itemsOfKind(page: ContentPage | null | undefined, kind: string): ContentPageItem[] {
  const items = page?.items ?? [];
  const needle = kind.toLowerCase();
  return items
    .filter((item) => (item.kind ?? '').toLowerCase() === needle)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function cardsFromPage(page: ContentPage | null | undefined, kinds: string | string[]): ContentCard[] {
  const list = Array.isArray(kinds) ? kinds : [kinds];
  return list.flatMap((kind) => itemsOfKind(page, kind).map((item) => itemToCard(item)));
}

export function faqsFromPage(page: ContentPage | null | undefined): FaqItem[] {
  return itemsOfKind(page, 'faq').map(itemToFaq);
}

export function metricsFromPage(page: ContentPage | null | undefined): Metric[] {
  return itemsOfKind(page, 'metric').map(itemToMetric);
}

export function scheduleRowsFromPage(page: ContentPage | null | undefined): Array<[string, string, string, string]> {
  return itemsOfKind(page, 'schedule').map((item) => [
    item.title ?? 'Gathering',
    item.when ?? metaField(item.meta, 'when') ?? metaString(item.meta) ?? '',
    item.lead ?? metaField(item.meta, 'lead') ?? '',
    item.href ?? '/online-church/live',
  ]);
}

export async function fetchContentPages(): Promise<ContentPageSummary[]> {
  if (!isPublicApiConfigured()) {
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  const data = await publicRequest<unknown>('content/pages');
  return asList<ContentPageSummary>(data);
}

export async function fetchContentPage(slug: string): Promise<ContentPage> {
  if (!isPublicApiConfigured()) {
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  return publicRequest<ContentPage>(`content/pages/${encodeURIComponent(slug)}`);
}

/**
 * Load a published CMS page. Never invents fixture content — callers gate fixtures themselves.
 */
export async function loadContentPage(slug: string): Promise<{ data: ContentPage; source: 'api' }> {
  if (!isPublicApiConfigured()) {
    throw new PublicApiError(503, 'API_NOT_CONFIGURED', 'The public API base URL is not configured.');
  }
  const page = await fetchContentPage(slug);
  return { data: page, source: 'api' };
}

/** List published CMS pages from GET /api/v1/content/pages. No fixture fallback. */
export async function loadContentPages(): Promise<{ data: ContentPageSummary[]; source: 'api' }> {
  const pages = await fetchContentPages();
  return { data: pages, source: 'api' };
}

/** True when the error is a missing published CMS page (404). */
export function isContentPageNotFound(error: unknown): boolean {
  return error instanceof PublicApiError && error.status === 404;
}
