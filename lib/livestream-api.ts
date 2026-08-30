import { apiRequestData } from './api-client.ts';
import { isBrowserRuntime } from './api-config.ts';
import { serializeForwardedCookies } from './laravel-dev-proxy.ts';
import { publicRequest } from './public-api.ts';

export type Livestream = {
  id?: string;
  public_id?: string;
  title?: string | null;
  subtitle?: string | null;
  host_name?: string | null;
  provider?: string | null;
  external_id?: string | null;
  watch_url?: string | null;
  embed_url?: string | null;
  thumbnail_url?: string | null;
  status?: 'scheduled' | 'live' | 'ended' | string | null;
  viewer_count?: number | null;
  reaction_count?: number | null;
  starts_at?: string | null;
  ended_at?: string | null;
  church_id?: string | null;
  church_name?: string | null;
};

export type LivestreamComment = {
  id?: string;
  body?: string | null;
  person_id?: string | null;
  person_name?: string | null;
  created_at?: string | null;
};

async function serverSessionHeaders(): Promise<HeadersInit | undefined> {
  if (isBrowserRuntime()) return undefined;
  const { cookies } = await import('next/headers');
  const jar = await cookies();
  const pairs = jar.getAll();
  if (pairs.length === 0) return undefined;
  return { Cookie: serializeForwardedCookies(pairs) };
}

function asList<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

/** GET /livestreams/current — public current or next service. */
export async function fetchCurrentLivestream(): Promise<Livestream | null> {
  const data = await publicRequest<Livestream | null>('livestreams/current');
  if (!data || typeof data !== 'object') return null;
  return { ...data, id: data.id ?? data.public_id };
}

/** GET /user/livestreams/{id}/comments */
export async function fetchLivestreamComments(livestreamId: string): Promise<LivestreamComment[]> {
  const data = await apiRequestData<unknown>(
    `user/livestreams/${encodeURIComponent(livestreamId)}/comments`,
    { method: 'GET', headers: await serverSessionHeaders() },
  );
  return asList<LivestreamComment>(data);
}

/** POST /user/livestreams/{id}/comments */
export async function postLivestreamComment(
  livestreamId: string,
  body: string,
): Promise<LivestreamComment> {
  return apiRequestData<LivestreamComment>(
    `user/livestreams/${encodeURIComponent(livestreamId)}/comments`,
    {
      method: 'POST',
      headers: await serverSessionHeaders(),
      body: JSON.stringify({ body }),
    },
  );
}

/** POST /user/livestreams/{id}/reactions */
export async function reactToLivestream(
  livestreamId: string,
): Promise<{ reaction_count?: number }> {
  return apiRequestData<{ reaction_count?: number }>(
    `user/livestreams/${encodeURIComponent(livestreamId)}/reactions`,
    {
      method: 'POST',
      headers: await serverSessionHeaders(),
      body: JSON.stringify({}),
    },
  );
}
