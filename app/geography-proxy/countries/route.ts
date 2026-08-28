import { NextResponse } from 'next/server';

const UPSTREAM = 'https://restcountries.com/v3.1/all?fields=name,cca2,flag';
const CACHE_SECONDS = 86_400;

export async function GET() {
  try {
    const response = await fetch(UPSTREAM, { next: { revalidate: CACHE_SECONDS } });
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
