export class ApiError extends Error {
  constructor(public status: number, message: string, public correlationId?: string) {
    super(message);
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const baseUrl = process.env.FHC_LARAVEL_API_URL;
  if (!baseUrl) throw new ApiError(503, 'The Laravel API is not configured for this environment.');

  const response = await fetch(new URL(path, baseUrl), {
    ...init,
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init.headers },
  });
  const correlationId = response.headers.get('x-correlation-id') ?? undefined;
  if (!response.ok) throw new ApiError(response.status, 'The authoritative API rejected this request.', correlationId);
  return response.json() as Promise<T>;
}
