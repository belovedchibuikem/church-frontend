import { NextResponse } from 'next/server';

const UPSTREAM = 'https://countriesnow.space/api/v0.1/countries/state/cities';
const CACHE_SECONDS = 86_400;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  try {
    const response = await fetch(UPSTREAM, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
      next: { revalidate: CACHE_SECONDS },
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'upstream_failed' }, { status: response.status });
    }
    const data = await response.json();
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': `public, max-age=${CACHE_SECONDS}, s-maxage=${CACHE_SECONDS}`,
      },
    });
  } catch {
    return NextResponse.json({ error: 'upstream_unreachable' }, { status: 502 });
  }
}
