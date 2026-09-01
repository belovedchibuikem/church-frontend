'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useLocale } from '@/components/locale-provider';
import type { SiteRoute } from '@/lib/site-routes';
import {
  bibleChapterPath,
  completeUserBibleDay,
  enrollUserBiblePlan,
  fetchBibleBooks,
  fetchBibleChapter,
  fetchBiblePlans,
  fetchUserBibleProgress,
  saveBiblePosition,
  searchBible,
  type BibleBook,
  type BibleChapter,
  type BibleEnrollment,
  type BiblePassage,
  type BiblePlanSummary,
  type BibleProgress,
  type BibleSearchHit,
} from '@/lib/bible-api.ts';
import { ApiError } from '@/lib/api-client';
import { formatUserApiError } from '@/lib/user-api.ts';
import { publicErrorMessage } from '@/lib/site-api.ts';

const FONT_KEY = 'fhc.bible.fontSize';

function parseBiblePath(path: string): { view: 'hub' | 'plans' | 'chapter'; book?: string; chapter?: number } {
  if (path === '/bible/plans') return { view: 'plans' };
  const match = path.match(/^\/bible\/([a-z0-9]+(?:-[a-z0-9]+)*)\/(\d+)$/i);
  if (match) return { view: 'chapter', book: match[1], chapter: Number(match[2]) };
  return { view: 'hub' };
}

function passageLabel(passage: BiblePassage): string {
  return `${passage.book_name} ${passage.chapter}`;
}

function go(router: ReturnType<typeof useRouter>, href: string) {
  router.push(href);
}

export function BibleExperience({ route }: { route: SiteRoute }) {
  const parsed = parseBiblePath(route.path);
  if (parsed.view === 'chapter' && parsed.book && parsed.chapter) {
    return <BibleReader book={parsed.book} chapter={parsed.chapter} />;
  }
  if (parsed.view === 'plans') return <BiblePlansPage />;
  return <BibleHub />;
}

function BibleHub() {
  const { t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [progress, setProgress] = useState<BibleProgress | null>(null);
  const [query, setQuery] = useState('');
  const [bookFilter, setBookFilter] = useState('');
  const [testament, setTestament] = useState<'all' | 'ot' | 'nt'>('all');
  const [hits, setHits] = useState<BibleSearchHit[]>([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.allSettled([
      fetchBibleBooks(),
      user ? fetchUserBibleProgress() : Promise.resolve(null),
    ]).then(([booksResult, progressResult]) => {
      if (cancelled) return;
      if (booksResult.status === 'fulfilled') setBooks(booksResult.value.books);
      else setError(publicErrorMessage(booksResult.reason));
      if (progressResult.status === 'fulfilled') setProgress(progressResult.value);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const onSearch = async (event: FormEvent) => {
    event.preventDefault();
    const value = query.trim();
    if (value.length < 2) return;
    setSearching(true);
    setSearched(true);
    try {
      const result = await searchBible(value);
      setHits(result.results);
      if (result.results.length === 1) {
        const hit = result.results[0];
        go(router, bibleChapterPath(hit.book_slug, hit.chapter, hit.verse));
      }
    } catch (reason) {
      setError(publicErrorMessage(reason));
    } finally {
      setSearching(false);
    }
  };

  const filtered = useMemo(() => {
    const needle = bookFilter.trim().toLowerCase();
    return books.filter((book) => {
      if (testament !== 'all' && book.testament !== testament) return false;
      if (!needle) return true;
      return book.name.toLowerCase().includes(needle) || book.slug.includes(needle.replace(/\s+/g, '-'));
    });
  }, [books, bookFilter, testament]);

  const ot = filtered.filter((book) => book.testament === 'ot');
  const nt = filtered.filter((book) => book.testament === 'nt');
  const enrollment = progress?.enrollment ?? null;
  const due = enrollment?.due;

  return (
    <div className="bible-shell">
      <header className="bible-hero">
        <p className="eyebrow">{t('bible.kjv', { defaultMessage: 'King James Version' })}</p>
        <h1>{t('bible.title', { defaultMessage: 'Bible' })}</h1>
        <p>{t('bible.subtitle', { defaultMessage: 'Read Scripture, follow a paced plan, and see today’s target in one place.' })}</p>
        <form className="bible-search" onSubmit={onSearch}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('bible.searchPlaceholder', { defaultMessage: 'Try John 3:16 or a word like faith' })}
            aria-label={t('common.search', { defaultMessage: 'Search' })}
          />
          <button type="submit" disabled={searching}>
            {searching
              ? t('bible.searching', { defaultMessage: 'Searching…' })
              : t('common.search', { defaultMessage: 'Search' })}
          </button>
        </form>
        {searched && hits.length === 0 && !searching ? (
          <p className="bible-empty" role="status">
            {t('bible.noResults', { defaultMessage: 'No verses matched that search.' })}
          </p>
        ) : null}
        {hits.length > 0 ? (
          <ul className="bible-hits">
            {hits.map((hit) => (
              <li key={`${hit.reference}-${hit.verse}`}>
                <Link href={bibleChapterPath(hit.book_slug, hit.chapter, hit.verse)}>
                  <strong>{hit.reference}</strong>
                  <span>{hit.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {error ? <p className="bible-error">{error}</p> : null}
      {loading ? <p className="muted">{t('common.loading', { defaultMessage: 'Loading…' })}</p> : null}

      <div className="bible-grid">
        <section className="bible-panel">
          <h2>{t('bible.today', { defaultMessage: "Today’s reading" })}</h2>
          {due && enrollment ? (
            <DailyTarget enrollment={enrollment} />
          ) : user ? (
            <p>
              {t('bible.choosePlanCopy', { defaultMessage: 'Choose a 1, 2, or 3 year plan and we will give you a daily target.' })}{' '}
              <Link href="/bible/plans">{t('bible.plans', { defaultMessage: 'Reading plans' })}</Link>
            </p>
          ) : (
            <p>
              {t('bible.signInForPlans', { defaultMessage: 'Sign in to start a yearly plan and track today’s target.' })}{' '}
              <Link href="/login?next=/bible">{t('auth.signIn', { defaultMessage: 'Sign In' })}</Link>
            </p>
          )}
          {progress?.position ? (
            <p className="bible-continue">
              <Link href={bibleChapterPath(progress.position.book_slug, progress.position.chapter)}>
                {t('bible.continueReading', { defaultMessage: 'Continue reading' })} · {passageLabel(progress.position)}
              </Link>
            </p>
          ) : (
            <p className="bible-continue">
              <Link href="/bible/john/1">{t('bible.startJohn', { defaultMessage: 'Start in John 1' })}</Link>
            </p>
          )}
        </section>
        <section className="bible-panel">
          <h2>{t('bible.plans', { defaultMessage: 'Reading plans' })}</h2>
          <p>{t('bible.planLead', { defaultMessage: 'Finish the whole Bible at a pace that fits your life.' })}</p>
          <Link className="bible-cta" href="/bible/plans">
            {t('bible.choosePlan', { defaultMessage: 'Choose a plan' })}
          </Link>
        </section>
      </div>

      <div className="bible-index-tools">
        <input
          value={bookFilter}
          onChange={(event) => setBookFilter(event.target.value)}
          placeholder={t('bible.filterBooks', { defaultMessage: 'Find a book' })}
          aria-label={t('bible.filterBooks', { defaultMessage: 'Find a book' })}
        />
        <div className="bible-toggles" role="tablist" aria-label={t('bible.chooseBook', { defaultMessage: 'Choose book' })}>
          {(
            [
              ['all', t('bible.allBooks', { defaultMessage: 'All books' })],
              ['ot', t('bible.oldTestament', { defaultMessage: 'Old Testament' })],
              ['nt', t('bible.newTestament', { defaultMessage: 'New Testament' })],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={testament === id}
              className={testament === id ? 'is-active' : undefined}
              onClick={() => setTestament(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {testament !== 'nt' ? <BookIndex title={t('bible.oldTestament', { defaultMessage: 'Old Testament' })} books={ot} /> : null}
      {testament !== 'ot' ? <BookIndex title={t('bible.newTestament', { defaultMessage: 'New Testament' })} books={nt} /> : null}
      {!loading && filtered.length === 0 ? (
        <p className="bible-empty">{t('bible.noBooks', { defaultMessage: 'No books match that name.' })}</p>
      ) : null}
    </div>
  );
}

function DailyTarget({ enrollment }: { enrollment: BibleEnrollment }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState(enrollment);
  const [error, setError] = useState<string | null>(null);
  const due = current.due;

  const markDone = async () => {
    if (!due) return;
    setBusy(true);
    setError(null);
    try {
      const next = await completeUserBibleDay(current.id, due.day_number);
      if (next.enrollment) setCurrent(next.enrollment);
    } catch (reason) {
      setError(reason instanceof ApiError ? formatUserApiError(reason) : publicErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bible-target">
      <div className="bible-progress-row">
        <strong>
          {t('bible.dayOf', {
            defaultMessage: 'Day {day} of {total}',
            vars: { day: due?.day_number ?? current.calendar_day, total: current.day_count },
          })}
        </strong>
        <span>{current.percent}%</span>
      </div>
      <div className="bible-meter" aria-hidden="true">
        <i style={{ width: `${current.percent}%` }} />
      </div>
      {current.is_catching_up ? (
        <p className="bible-catchup">
          {t('bible.catchUp', {
            defaultMessage: 'Catch up first — {count} missed day(s) still due.',
            vars: { count: current.overdue_days },
          })}
        </p>
      ) : null}
      {due ? (
        <ul>
          {due.passages.map((passage) => (
            <li key={`${passage.book_slug}-${passage.chapter}`}>
              <Link href={bibleChapterPath(passage.book_slug, passage.chapter)}>{passageLabel(passage)}</Link>
            </li>
          ))}
        </ul>
      ) : (
        <p>{t('bible.planComplete', { defaultMessage: 'You have finished this plan. Well done.' })}</p>
      )}
      {error ? <p className="bible-error">{error}</p> : null}
      {due ? (
        <button type="button" className="bible-cta" disabled={busy} onClick={() => void markDone()}>
          {t('bible.markDone', { defaultMessage: 'Mark today complete' })}
        </button>
      ) : null}
    </div>
  );
}

function BookIndex({ title, books }: { title: string; books: BibleBook[] }) {
  if (books.length === 0) return null;
  return (
    <section className="bible-index">
      <h2>{title}</h2>
      <div className="bible-book-grid">
        {books.map((book) => (
          <Link key={book.id} href={bibleChapterPath(book.slug, 1)}>
            <b>{book.name}</b>
            <small>
              {book.chapters} {book.chapters === 1 ? 'ch.' : 'chs.'}
            </small>
          </Link>
        ))}
      </div>
    </section>
  );
}

function BiblePlansPage() {
  const { t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<BiblePlanSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    void fetchBiblePlans()
      .then(setPlans)
      .catch((reason) => setError(publicErrorMessage(reason)));
  }, []);

  const start = async (code: string) => {
    if (!user) {
      go(router, '/login?next=/bible/plans');
      return;
    }
    setBusy(code);
    try {
      await enrollUserBiblePlan(code);
      go(router, '/bible');
    } catch (reason) {
      setError(reason instanceof ApiError ? formatUserApiError(reason) : publicErrorMessage(reason));
      setBusy(null);
    }
  };

  return (
    <div className="bible-shell">
      <header className="bible-hero compact">
        <p className="eyebrow">
          <Link href="/bible">{t('bible.title', { defaultMessage: 'Bible' })}</Link>
        </p>
        <h1>{t('bible.plans', { defaultMessage: 'Reading plans' })}</h1>
        <p>{t('bible.planLead', { defaultMessage: 'Finish the whole Bible at a pace that fits your life.' })}</p>
      </header>
      {error ? <p className="bible-error">{error}</p> : null}
      <div className="bible-plan-grid">
        {plans.map((plan) => (
          <article key={plan.code} className="bible-panel">
            <h2>{plan.name}</h2>
            <p>{plan.description}</p>
            <p className="muted">
              {t('bible.planDays', { defaultMessage: '{days} days', vars: { days: plan.days } })}
            </p>
            <button type="button" className="bible-cta" disabled={busy === plan.code} onClick={() => void start(plan.code)}>
              {t('bible.startPlan', { defaultMessage: 'Start this plan' })}
            </button>
          </article>
        ))}
      </div>
    </div>
  );
}

function BibleReader({ book, chapter }: { book: string; chapter: number }) {
  const { t } = useLocale();
  const { user } = useAuth();
  const router = useRouter();
  const [payload, setPayload] = useState<BibleChapter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<BibleBook[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [fontSize, setFontSize] = useState(18);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(FONT_KEY));
    if (stored >= 16 && stored <= 26) setFontSize(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(FONT_KEY, String(fontSize));
  }, [fontSize]);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setError(null);
    void fetchBibleChapter(book, chapter)
      .then((data) => {
        if (!cancelled) setPayload(data);
      })
      .catch((reason) => {
        if (!cancelled) setError(publicErrorMessage(reason, 'That chapter could not be opened.'));
      });
    void fetchBibleBooks()
      .then((data) => {
        if (!cancelled) setBooks(data.books);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [book, chapter]);

  useEffect(() => {
    if (!payload || !user) return;
    void saveBiblePosition(payload.book.slug, payload.chapter).catch(() => undefined);
  }, [payload, user]);

  useEffect(() => {
    const hash = window.location.hash.replace('#v', '');
    const verse = Number(hash);
    if (!verse) return;
    const node = document.getElementById(`v${verse}`);
    node?.scrollIntoView({ block: 'center' });
  }, [payload]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (!payload) return;
      if (event.key === 'ArrowLeft' && payload.previous) {
        event.preventDefault();
        go(router, bibleChapterPath(payload.previous.book_slug, payload.previous.chapter));
      }
      if (event.key === 'ArrowRight' && payload.next) {
        event.preventDefault();
        go(router, bibleChapterPath(payload.next.book_slug, payload.next.chapter));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [payload, router]);

  const currentBook = books.find((item) => item.slug === book || item.id === book) ?? payload?.book;
  const chapterCount = currentBook?.chapters ?? payload?.chapter ?? 1;
  const otBooks = books.filter((item) => item.testament === 'ot');
  const ntBooks = books.filter((item) => item.testament === 'nt');

  if (error) {
    return (
      <div className="bible-reader">
        <p className="bible-error">{error}</p>
        <Link href="/bible">{t('bible.title', { defaultMessage: 'Bible' })}</Link>
      </div>
    );
  }
  if (!payload) return <p className="muted">{t('common.loading', { defaultMessage: 'Loading…' })}</p>;

  return (
    <div className="bible-reader">
      <nav className="bible-reader-nav">
        <Link href="/bible">{t('bible.title', { defaultMessage: 'Bible' })}</Link>
        <select
          aria-label={t('bible.chooseBook', { defaultMessage: 'Choose book' })}
          value={payload.book.slug}
          onChange={(event) => go(router, bibleChapterPath(event.target.value, 1))}
        >
          {otBooks.length > 0 ? (
            <optgroup label={t('bible.oldTestament', { defaultMessage: 'Old Testament' })}>
              {otBooks.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ) : null}
          {ntBooks.length > 0 ? (
            <optgroup label={t('bible.newTestament', { defaultMessage: 'New Testament' })}>
              {ntBooks.map((item) => (
                <option key={item.id} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </optgroup>
          ) : (
            <option value={payload.book.slug}>{payload.book.name}</option>
          )}
        </select>
        <button
          type="button"
          className="bible-chapter-btn"
          aria-expanded={pickerOpen}
          aria-label={t('bible.chooseChapter', { defaultMessage: 'Choose chapter' })}
          onClick={() => setPickerOpen((open) => !open)}
        >
          {payload.chapter}
        </button>
        <span className="muted">{payload.version.name}</span>
        <div className="bible-font">
          <button type="button" aria-label={t('bible.fontSmaller', { defaultMessage: 'Smaller text' })} onClick={() => setFontSize((size) => Math.max(16, size - 2))}>
            A−
          </button>
          <button type="button" aria-label={t('bible.fontLarger', { defaultMessage: 'Larger text' })} onClick={() => setFontSize((size) => Math.min(26, size + 2))}>
            A+
          </button>
        </div>
      </nav>
      {pickerOpen ? (
        <div className="bible-chapter-grid" role="listbox" aria-label={t('bible.jumpToChapter', { defaultMessage: 'Jump to chapter' })}>
          {Array.from({ length: chapterCount }, (_, index) => index + 1).map((item) => (
            <button
              key={item}
              type="button"
              className={item === payload.chapter ? 'is-active' : undefined}
              onClick={() => {
                setPickerOpen(false);
                go(router, bibleChapterPath(payload.book.slug, item));
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <h1>
        {payload.book.name} {payload.chapter}
      </h1>
      <ol className="bible-verses" style={{ fontSize: `${fontSize}px` }}>
        {payload.verses.map((verse) => (
          <li id={`v${verse.verse}`} key={verse.verse}>
            <sup>{verse.verse}</sup>
            <span>{verse.text}</span>
          </li>
        ))}
      </ol>
      <div className="bible-pager">
        {payload.previous ? (
          <Link href={bibleChapterPath(payload.previous.book_slug, payload.previous.chapter)}>
            ← {passageLabel(payload.previous)}
          </Link>
        ) : (
          <span />
        )}
        {payload.next ? (
          <Link href={bibleChapterPath(payload.next.book_slug, payload.next.chapter)}>
            {passageLabel(payload.next)} →
          </Link>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}
