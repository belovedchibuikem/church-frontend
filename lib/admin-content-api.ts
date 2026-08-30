import {
  apiRequest,
  apiRequestData,
  type ApiSuccessEnvelope,
} from './api-client.ts';
import type { JsonObject } from './api-types.ts';
import { PLATFORM_GLOBAL_SCOPE, platformErrorMessage, type AdminScope } from './admin-platform-api.ts';
import type { ContentPage, ContentPageItem } from './content-api.ts';

export type AdminContentPage = ContentPage & {
  id: string;
  locale?: string | null;
};

function withScope(scope: AdminScope = PLATFORM_GLOBAL_SCOPE) {
  return { scope, credentials: 'include' as const };
}

function toPlatformError(error: unknown): never {
  throw error;
}

async function contentGet<T>(path: string, scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<T> {
  try {
    const envelope = await apiRequest<ApiSuccessEnvelope<T>>(path, withScope(scope));
    return envelope.data;
  } catch (error) {
    toPlatformError(error);
  }
}

async function contentMutate<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<T> {
  try {
    return await apiRequestData<T>(path, {
      method,
      body: body === undefined ? undefined : JSON.stringify(body),
      ...withScope(scope),
    });
  } catch (error) {
    toPlatformError(error);
  }
}

export async function listAdminContentPages(scope: AdminScope = PLATFORM_GLOBAL_SCOPE): Promise<AdminContentPage[]> {
  const data = await contentGet<AdminContentPage[]>('admin/content/pages', scope);
  return Array.isArray(data) ? data : [];
}

export async function updateAdminContentPage(
  pageId: string,
  body: {
    slug?: string;
    title?: string;
    summary?: string | null;
    body?: string;
    locale?: string;
    published_at?: string | null;
  },
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<AdminContentPage> {
  return contentMutate<AdminContentPage>('PUT', `admin/content/pages/${encodeURIComponent(pageId)}`, body, scope);
}

export async function createAdminContentItem(
  pageId: string,
  body: {
    kind: string;
    title: string;
    body: string;
    href?: string | null;
    sort_order?: number;
    published_at?: string | null;
    meta?: JsonObject | null;
  },
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<ContentPageItem> {
  return contentMutate<ContentPageItem>(
    'POST',
    `admin/content/pages/${encodeURIComponent(pageId)}/items`,
    body,
    scope,
  );
}

export async function updateAdminContentItem(
  pageId: string,
  itemId: string,
  body: {
    kind?: string;
    title?: string;
    body?: string;
    href?: string | null;
    sort_order?: number;
    published_at?: string | null;
    meta?: JsonObject | null;
  },
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<ContentPageItem> {
  return contentMutate<ContentPageItem>(
    'PUT',
    `admin/content/pages/${encodeURIComponent(pageId)}/items/${encodeURIComponent(itemId)}`,
    body,
    scope,
  );
}

export async function deleteAdminContentItem(
  pageId: string,
  itemId: string,
  scope: AdminScope = PLATFORM_GLOBAL_SCOPE,
): Promise<{ removed: boolean }> {
  return contentMutate<{ removed: boolean }>(
    'DELETE',
    `admin/content/pages/${encodeURIComponent(pageId)}/items/${encodeURIComponent(itemId)}`,
    undefined,
    scope,
  );
}

export { platformErrorMessage };
export type { ContentPageItem };
