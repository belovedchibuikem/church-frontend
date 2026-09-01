import { publicRequest } from './public-api.ts';
import { apiRequestData, serverSessionHeaders } from './user-api.ts';

export { bibleChapterPath, bookAbbrev } from './bible-paths.ts';

export const BIBLE_VERSION_KEY = 'fhc.bible.version';

export type BibleVersion = {
  id: string;
  abbreviation?: string;
  name: string;
  license?: string;
  available?: boolean;
};

export type BibleBook = {
  id: string;
  slug: string;
  name: string;
  abbrev?: string;
  testament: 'ot' | 'nt';
  chapters: number;
};

export type BiblePassage = {
  book_id: string;
  book_slug: string;
  book_name: string;
  chapter: number;
};

export type BibleVerse = { verse: number; text: string };

export type BibleChapter = {
  book: BibleBook;
  chapter: number;
  verse_count: number;
  verses: BibleVerse[];
  previous: BiblePassage | null;
  next: BiblePassage | null;
  version: BibleVersion;
};

export type BibleSearchHit = {
  book_id: string;
  book_slug: string;
  book_name: string;
  chapter: number;
  verse: number;
  text: string;
  reference: string;
};

export type BiblePlanSummary = {
  code: string;
  name: string;
  days: number;
  description: string;
  kind?: string;
};

export type BibleEnrollment = {
  id: string;
  plan_code: string;
  plan_name: string;
  status: string;
  started_on: string;
  timezone: string;
  day_count: number;
  calendar_day: number;
  completed_days: number;
  percent: number;
  overdue_days: number;
  is_catching_up: boolean;
  today: { day_number: number; passages: BiblePassage[]; completed: boolean };
  due: { day_number: number; passages: BiblePassage[]; completed: boolean } | null;
};

export type BibleProgress = {
  version: BibleVersion;
  plans: BiblePlanSummary[];
  position: BiblePassage | null;
  enrollment: BibleEnrollment | null;
};

export const DEFAULT_BIBLE_VERSIONS: BibleVersion[] = [
  { id: 'kjv', abbreviation: 'KJV', name: 'King James Version', available: true },
  { id: 'niv', abbreviation: 'NIV', name: 'New International Version', available: false },
  { id: 'rsv', abbreviation: 'RSV', name: 'Revised Standard Version', available: false },
  { id: 'amp', abbreviation: 'AMP', name: 'Amplified Bible', available: false },
];

function versionQuery(version?: string | null): Record<string, string> {
  const id = version?.trim();
  return id ? { version: id } : {};
}

export function readStoredBibleVersion(): string {
  if (typeof window === 'undefined') return 'kjv';
  return window.localStorage.getItem(BIBLE_VERSION_KEY)?.trim() || 'kjv';
}

export function storeBibleVersion(version: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(BIBLE_VERSION_KEY, version);
}

export async function fetchBibleVersions(): Promise<{ versions: BibleVersion[]; default: string }> {
  try {
    return await publicRequest('bible/versions');
  } catch {
    return { versions: DEFAULT_BIBLE_VERSIONS, default: 'kjv' };
  }
}

export async function fetchBibleBooks(version?: string): Promise<{
  version: BibleVersion;
  versions?: BibleVersion[];
  books: BibleBook[];
}> {
  return publicRequest('bible/books', { query: versionQuery(version) });
}

export async function fetchBibleChapter(book: string, chapter: number, version?: string): Promise<BibleChapter> {
  return publicRequest(`bible/books/${encodeURIComponent(book)}/chapters/${chapter}`, {
    query: versionQuery(version),
  });
}

export async function searchBible(query: string, version?: string): Promise<{ query: string; results: BibleSearchHit[] }> {
  return publicRequest('bible/search', { query: { q: query, limit: 30, ...versionQuery(version) } });
}

export async function fetchBiblePlans(): Promise<BiblePlanSummary[]> {
  return publicRequest('bible/plans');
}

export async function fetchUserBibleProgress(): Promise<BibleProgress> {
  return apiRequestData<BibleProgress>('user/bible/progress', {
    method: 'GET',
    headers: await serverSessionHeaders(),
  });
}

export async function enrollUserBiblePlan(planCode: string, durationDays?: number): Promise<BibleProgress> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<BibleProgress>('user/bible/enrollments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      ...(planCode.trim() ? { plan_code: planCode.trim() } : {}),
      ...(durationDays != null ? { duration_days: durationDays } : {}),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });
}

export async function completeUserBibleDay(enrollmentId: string, day: number): Promise<BibleProgress> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<BibleProgress>(
    `user/bible/enrollments/${encodeURIComponent(enrollmentId)}/days/${day}/complete`,
    { method: 'POST', headers, body: JSON.stringify({}) },
  );
}

export async function saveBiblePosition(book: string, chapter: number): Promise<{ position: BiblePassage }> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData('user/bible/position', {
    method: 'PUT',
    headers,
    body: JSON.stringify({ book, chapter }),
  });
}
