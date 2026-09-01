import { publicRequest } from './public-api.ts';
import { apiRequestData, serverSessionHeaders } from './user-api.ts';

export type BibleBook = {
  id: string;
  slug: string;
  name: string;
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
  version: { id: string; name: string; license: string };
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
  code: 'year_1' | 'year_2' | 'year_3' | string;
  name: string;
  days: number;
  description: string;
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
  version: { id: string; name: string };
  plans: BiblePlanSummary[];
  position: BiblePassage | null;
  enrollment: BibleEnrollment | null;
};

export async function fetchBibleBooks(): Promise<{ version: { id: string; name: string }; books: BibleBook[] }> {
  return publicRequest('bible/books');
}

export async function fetchBibleChapter(book: string, chapter: number): Promise<BibleChapter> {
  return publicRequest(`bible/books/${encodeURIComponent(book)}/chapters/${chapter}`);
}

export async function searchBible(query: string): Promise<{ query: string; results: BibleSearchHit[] }> {
  return publicRequest('bible/search', { query: { q: query, limit: 12 } });
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

export async function enrollUserBiblePlan(planCode: string): Promise<BibleProgress> {
  const headers = new Headers(await serverSessionHeaders());
  return apiRequestData<BibleProgress>('user/bible/enrollments', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      plan_code: planCode,
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

export function bibleChapterPath(book: string, chapter: number, verse?: number): string {
  const base = `/bible/${book}/${chapter}`;
  return verse ? `${base}#v${verse}` : base;
}
