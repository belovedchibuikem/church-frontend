'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import type { SiteRoute } from '@/lib/site-routes';
import type { ContentCard, EventItem, Metric } from '@/lib/site-content';
import { journeySteps, memberActivity, memberEvents, memberGlance, quickActions, sermons as fixtureSermons } from '@/lib/site-content';
import { designFixturesEnabled, loadChurch, loadEvents, loadSermons } from '@/lib/site-api';
import {
  displayNameFromUser,
  fetchCurrentUser,
  fetchHomeChurchDashboard,
  fetchKcaAttendance,
  fetchKcaDashboard,
  fetchUserDashboard,
  fetchUserMemberships,
  fetchUserNeeds,
  fetchUserNotifications,
  fetchUserPaymentIntents,
  fetchUserPaymentTransactions,
  fetchUserPrayers,
  formatMoneyMinor,
  formatUserApiError,
  submitHomeChurchReport,
  type CurrentUser,
  type HomeChurchDashboard,
  type KcaDashboard,
  type UserMembership,
  type UserNotification,
  type UserPastoralNeed,
  type UserPaymentIntent,
  type UserPaymentTransaction,
  type UserPrayer,
} from '@/lib/user-api';

type MemberHeroProps = {
  eyebrow: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
  secondary?: { href: string; label: string };
};

function formatWhen(value?: string | null): string {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

function MemberHero({ eyebrow, title, body, action, secondary }: MemberHeroProps) {
  return (
    <div className="welcome member-hero">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </div>
      <div className="member-hero-actions">
        {action ? (
          <Link className="site-button" href={action.href}>
            {action.label}
          </Link>
        ) : null}
        {secondary ? (
          <Link className="site-button secondary" href={secondary.href}>
            {secondary.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function MemberMetrics({ items }: { items: Metric[] }) {
  if (!items.length) return null;
  return (
    <div className="metric-grid">
      {items.map((item) => (
        <article key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </article>
      ))}
    </div>
  );
}

function MemberEmpty({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <div className="member-empty panel">
      <h3>{title}</h3>
      <p>{body}</p>
      <Link className="site-button" href={href}>
        {action}
      </Link>
    </div>
  );
}

function MemberStatus({ children }: { children: string }) {
  const tone = children.toLowerCase();
  const kind = tone.includes('active') || tone.includes('completed') || tone.includes('paid') || tone.includes('succeeded')
    ? 'ok'
    : tone.includes('ended') || tone.includes('failed')
      ? 'warn'
      : 'neutral';
  return <span className={`status member-status ${kind}`}>{children}</span>;
}

type ChurchRow = {
  membership: UserMembership;
  churchName: string;
  churchHref: string;
};

async function loadMembershipRows(memberships: UserMembership[]): Promise<ChurchRow[]> {
  return Promise.all(
    memberships.map(async (membership) => {
      const churchId = membership.church_id ?? '';
      let churchName = churchId ? `Church ${churchId.slice(0, 8)}` : 'Family House Church';
      let churchHref = churchId ? `/churches/${churchId}` : '/find-church';
      if (churchId) {
        try {
          const church = await loadChurch(churchId);
          churchName = church.data.title;
          churchHref = church.data.href || churchHref;
        } catch {
          /* keep fallback label */
        }
      }
      return { membership, churchName, churchHref };
    }),
  );
}

export function LiveMyChurchPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ChurchRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchUserMemberships()
      .then((memberships) => loadMembershipRows(memberships))
      .then((next) => {
        if (!cancelled) {
          setRows(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([]);
          setError(formatUserApiError(err, 'Unable to load your church memberships.'));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const active = rows.filter((row) => (row.membership.status ?? 'active') === 'active');

  return (
    <>
      <MemberHero
        action={{ href: '/join-church/register', label: 'Join a church' }}
        body="Live memberships from your Family House account. Status and join dates come from the church API."
        eyebrow="MY CHURCH"
        secondary={{ href: '/find-church', label: 'Find a church' }}
        title={route.title}
      />
      {loading ? <p className="panel">Loading your church…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <MemberEmpty
          action="Find a church"
          body="You do not have a recorded church membership yet. Search the network and request to join."
          href="/find-church"
          title="No church membership yet"
        />
      ) : null}
      {rows.length > 0 ? (
        <>
          <MemberMetrics
            items={[
              { value: String(active.length), label: 'Active memberships' },
              { value: String(rows.length), label: 'All records' },
              { value: String(rows.filter((row) => row.membership.home_church_id).length), label: 'Home churches' },
            ]}
          />
          <section className="panel table-panel">
            {rows.map((row) => (
              <div className="list-row rich-row" key={row.membership.id ?? row.churchHref}>
                <span className="thumb">⛪</span>
                <div>
                  <b>{row.churchName}</b>
                  <small>
                    Joined {formatWhen(row.membership.joined_at)}
                    {row.membership.home_church_id ? ' · Linked home church' : ''}
                    {row.membership.ended_at ? ` · Ended ${formatWhen(row.membership.ended_at)}` : ''}
                  </small>
                </div>
                <MemberStatus>{row.membership.status ?? 'active'}</MemberStatus>
                <Link className="ghost-link" href={row.churchHref}>
                  Open
                </Link>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </>
  );
}

export function LiveMyHomeChurchPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [dashboards, setDashboards] = useState<HomeChurchDashboard[]>([]);
  const [summary, setSummary] = useState('');
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const all = await fetchUserMemberships();
        const withHome = all.filter((item) => Boolean(item.home_church_id));
        const loaded = (
          await Promise.allSettled(
            withHome.map((item) => fetchHomeChurchDashboard(item.home_church_id as string)),
          )
        )
          .filter((result): result is PromiseFulfilledResult<HomeChurchDashboard> => result.status === 'fulfilled')
          .map((result) => result.value);
        if (cancelled) return;
        setMemberships(withHome);
        setDashboards(loaded);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setMemberships([]);
          setDashboards([]);
          setError(formatUserApiError(err, 'Unable to load your home church.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const primary = dashboards[0] ?? null;
  const homeId = primary?.id ?? memberships[0]?.home_church_id ?? null;

  const onReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!homeId) return;
    const text = summary.trim();
    if (!text) {
      setReportError('Write a short report before submitting.');
      return;
    }
    setReportBusy(true);
    setReportError(null);
    setReportMessage(null);
    try {
      await submitHomeChurchReport(homeId, { summary: text });
      setSummary('');
      setReportMessage('Report submitted.');
    } catch (err) {
      setReportError(formatUserApiError(err, 'Unable to submit this home church report.'));
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <>
      <MemberHero
        action={{ href: '/start-home-church', label: 'Start a home church' }}
        body="Home churches linked to your memberships, with live names and status from the member API."
        eyebrow="MY HOME CHURCH"
        secondary={{ href: '/account/church', label: 'My church' }}
        title={route.title}
      />
      {loading ? <p className="panel">Loading your home church…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && !primary && memberships.length === 0 ? (
        <MemberEmpty
          action="Start an application"
          body="You are not linked to a home church yet. Apply to host, or join one through your local church."
          href="/start-home-church"
          title="No home church linked"
        />
      ) : null}
      {primary ? (
        <div className="dashboard-grid">
          <section className="panel">
            <span className="eyebrow">HOME CHURCH</span>
            <h3>{String(primary.name ?? 'Your home church')}</h3>
            <p>
              {String(primary.church_name ?? 'Family House')}
              {primary.members_count != null ? ` · ${primary.members_count} members` : ''}
            </p>
            <MemberStatus>{String(primary.membership_status ?? primary.status ?? 'active')}</MemberStatus>
            <dl className="give-dl" style={{ marginTop: 18 }}>
              <div>
                <dt>Status</dt>
                <dd>{String(primary.status ?? '—')}</dd>
              </div>
              <div>
                <dt>Church</dt>
                <dd>{String(primary.church_name ?? primary.church_id ?? '—')}</dd>
              </div>
            </dl>
          </section>
          <form className="panel site-form" onSubmit={onReport} style={{ margin: 0, maxWidth: 'none' }}>
            <div className="form-intro">
              <h3>Submit a report</h3>
              <p>Leaders and members can send a period report. Recent MFA may be required.</p>
            </div>
            <label className="wide">
              Summary
              <textarea onChange={(event) => setSummary(event.target.value)} rows={5} value={summary} />
            </label>
            {reportError ? <p role="alert">{reportError}</p> : null}
            {reportMessage ? <p>{reportMessage}</p> : null}
            <button className="site-button" disabled={reportBusy} type="submit">
              {reportBusy ? 'Sending…' : 'Submit report'}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function LiveJourneyPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('Member');
  const [memberships, setMemberships] = useState<UserMembership[]>([]);
  const [kca, setKca] = useState<KcaDashboard | null>(null);
  const [prayers, setPrayers] = useState<UserPrayer[]>([]);
  const [intents, setIntents] = useState<UserPaymentIntent[]>([]);

  useEffect(() => {
    if (designFixturesEnabled()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [me, membershipResult, kcaResult, prayerResult, intentResult] = await Promise.allSettled([
          fetchCurrentUser(),
          fetchUserMemberships(),
          fetchKcaDashboard(),
          fetchUserPrayers(),
          fetchUserPaymentIntents(),
        ]);
        if (cancelled) return;
        if (me.status === 'fulfilled') setName(displayNameFromUser(me.value));
        if (membershipResult.status === 'fulfilled') setMemberships(membershipResult.value);
        if (kcaResult.status === 'fulfilled') setKca(kcaResult.value);
        if (prayerResult.status === 'fulfilled') setPrayers(prayerResult.value);
        if (intentResult.status === 'fulfilled') setIntents(intentResult.value);
        const failures = [me, membershipResult, kcaResult, prayerResult, intentResult].filter(
          (result) => result.status === 'rejected',
        );
        setError(failures.length === 5 ? 'Unable to load your journey from the API.' : null);
      } catch (err) {
        if (!cancelled) setError(formatUserApiError(err, 'Unable to load your journey.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (designFixturesEnabled()) {
    return (
      <>
        <MemberHero
          body="Track your growth from first step to multiplication."
          eyebrow="MY KINGDOM JOURNEY"
          title={route.title}
        />
        <div className="journey-steps">
          {journeySteps.map((step, index) => (
            <div className={index <= 2 ? 'done' : ''} key={step}>
              <span>{index + 1}</span>
              <b>{step}</b>
            </div>
          ))}
        </div>
        <section className="site-cards cols-4">
          {quickActions.map((card) => (
            <article key={card.title}>
              <span className="card-icon">{card.icon}</span>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <Link href={card.href}>{card.action ?? 'Open'} →</Link>
            </article>
          ))}
        </section>
      </>
    );
  }

  const stages = [
    { label: 'Account', done: true, href: '/account/profile', detail: name },
    {
      label: 'Church',
      done: memberships.some((item) => (item.status ?? 'active') === 'active'),
      href: '/account/church',
      detail: memberships.length ? `${memberships.length} membership${memberships.length === 1 ? '' : 's'}` : 'Not joined',
    },
    {
      label: 'Home church',
      done: memberships.some((item) => Boolean(item.home_church_id)),
      href: '/account/home-church',
      detail: memberships.some((item) => item.home_church_id) ? 'Linked' : 'Not linked',
    },
    {
      label: 'KCA',
      done: Boolean(kca?.enrolled || (kca?.modules_with_progress ?? 0) > 0),
      href: '/account/kca',
      detail: kca?.enrolled ? `${kca.modules_with_progress ?? 0}/${kca.modules_total ?? 0} modules` : 'Not enrolled',
    },
    {
      label: 'Prayer',
      done: prayers.length > 0,
      href: '/account/prayer-requests',
      detail: prayers.length ? `${prayers.length} request${prayers.length === 1 ? '' : 's'}` : 'None yet',
    },
    {
      label: 'Giving',
      done: intents.length > 0,
      href: '/account/giving',
      detail: intents.length ? `${intents.length} intent${intents.length === 1 ? '' : 's'}` : 'None yet',
    },
  ];
  const doneCount = stages.filter((stage) => stage.done).length;

  return (
    <>
      <MemberHero
        action={{ href: '/account/kca', label: 'Continue KCA' }}
        body={`Welcome back, ${name}. These stages are built from your live church, KCA, prayer, and giving records.`}
        eyebrow="MY KINGDOM JOURNEY"
        title={route.title}
      />
      {loading ? <p className="panel">Loading your journey…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <MemberMetrics
        items={[
          { value: `${doneCount}/${stages.length}`, label: 'Stages in motion' },
          { value: String(memberships.length), label: 'Memberships' },
          { value: String(kca?.modules_with_progress ?? 0), label: 'KCA modules' },
          { value: String(intents.length), label: 'Giving intents' },
        ]}
      />
      <div className="journey-steps">
        {stages.map((stage, index) => (
          <Link className={stage.done ? 'done' : ''} href={stage.href} key={stage.label}>
            <span>{stage.done ? '✓' : index + 1}</span>
            <b>{stage.label}</b>
            <small>{stage.detail}</small>
          </Link>
        ))}
      </div>
    </>
  );
}

export function LiveMyEventsPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadEvents({ per_page: 50 })
      .then((result) => {
        if (!cancelled) {
          setEvents(result.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err, 'Unable to load events.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const upcoming = events.filter((item) => item.tab !== 'past');
  const past = events.filter((item) => item.tab === 'past');

  return (
    <>
      <MemberHero
        action={{ href: '/events', label: 'Browse events' }}
        body="Published gatherings from the events API. Register from an event page when registration is open."
        eyebrow="MY EVENTS"
        secondary={{ href: '/account/calendar', label: 'Open calendar' }}
        title={route.title}
      />
      {loading ? <p className="panel">Loading events…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && events.length === 0 ? (
        <MemberEmpty
          action="View public calendar"
          body="No events are published yet. Check back as the church calendar is updated."
          href="/events"
          title="No events yet"
        />
      ) : null}
      {upcoming.length > 0 ? (
        <section className="panel table-panel">
          <h3>Upcoming</h3>
          {upcoming.map((event) => (
            <div className="list-row rich-row" key={event.href}>
              <span className="thumb">{event.icon ?? '▣'}</span>
              <div>
                <b>{event.title}</b>
                <small>
                  {event.when}
                  {event.where ? ` · ${event.where}` : ''}
                </small>
              </div>
              <MemberStatus>{event.status ?? 'Upcoming'}</MemberStatus>
              <Link className="ghost-link" href={`${event.href}/register`}>
                Register
              </Link>
            </div>
          ))}
        </section>
      ) : null}
      {past.length > 0 ? (
        <section className="panel table-panel">
          <h3>Past</h3>
          {past.map((event) => (
            <div className="list-row rich-row" key={event.href}>
              <span className="thumb">{event.icon ?? '✓'}</span>
              <div>
                <b>{event.title}</b>
                <small>{event.when}</small>
              </div>
              <MemberStatus>Completed</MemberStatus>
              <Link className="ghost-link" href={event.href}>
                View
              </Link>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function LiveGivingHistoryPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intents, setIntents] = useState<UserPaymentIntent[]>([]);
  const [transactions, setTransactions] = useState<UserPaymentTransaction[]>([]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([fetchUserPaymentIntents(), fetchUserPaymentTransactions()])
      .then(([nextIntents, nextTx]) => {
        if (!cancelled) {
          setIntents(nextIntents);
          setTransactions(nextTx);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err, 'Unable to load giving history.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const givenMinor = transactions.reduce((sum, tx) => sum + (tx.amount_minor ?? 0), 0);
  const currency = transactions[0]?.currency ?? intents[0]?.currency ?? 'NGN';

  return (
    <>
      <MemberHero
        action={{ href: '/give', label: 'Give now' }}
        body="Intents and recorded gifts from your payment history. Receipts appear after a successful local QA completion."
        eyebrow="GIVING"
        secondary={{ href: '/account/giving/recurring', label: 'Recurring' }}
        title={route.title}
      />
      {loading ? <p className="panel">Loading giving history…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <MemberMetrics
        items={[
          { value: formatMoneyMinor(givenMinor, currency), label: 'Recorded gifts' },
          { value: String(transactions.length), label: 'Transactions' },
          { value: String(intents.length), label: 'Intents' },
        ]}
      />
      {!loading && !error && intents.length === 0 && transactions.length === 0 ? (
        <MemberEmpty
          action="Give now"
          body="No giving intents or transactions yet. Start a gift and it will appear here."
          href="/give"
          title="No gifts recorded"
        />
      ) : null}
      {transactions.length > 0 ? (
        <section className="panel table-panel">
          <h3>Transactions</h3>
          {transactions.map((tx) => (
            <div className="list-row rich-row" key={tx.id ?? tx.public_id}>
              <span className="thumb">🧾</span>
              <div>
                <b>{formatMoneyMinor(tx.amount_minor, tx.currency ?? 'NGN')}</b>
                <small>
                  {formatWhen(tx.occurred_at ?? tx.created_at)}
                  {tx.payment_intent_id ? ` · Intent ${tx.payment_intent_id.slice(0, 8)}` : ''}
                </small>
              </div>
              <MemberStatus>{tx.status ?? 'Recorded'}</MemberStatus>
            </div>
          ))}
        </section>
      ) : null}
      {intents.length > 0 ? (
        <section className="panel table-panel">
          <h3>Intents</h3>
          {intents.map((intent) => (
            <div className="list-row rich-row" key={intent.id ?? intent.public_id}>
              <span className="thumb">💝</span>
              <div>
                <b>{intent.purpose_code ?? 'Giving intent'}</b>
                <small>
                  {formatMoneyMinor(intent.amount_minor, intent.currency ?? 'NGN')} · {formatWhen(intent.created_at)}
                </small>
              </div>
              <MemberStatus>{intent.status ?? 'Pending'}</MemberStatus>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function LiveMinistriesPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ChurchRow[]>([]);
  const [kca, setKca] = useState<KcaDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([fetchUserMemberships().then(loadMembershipRows), fetchKcaDashboard()])
      .then(([memberships, dashboard]) => {
        if (cancelled) return;
        if (memberships.status === 'fulfilled') setRows(memberships.value);
        else setError(formatUserApiError(memberships.reason, 'Unable to load ministries.'));
        if (dashboard.status === 'fulfilled') setKca(dashboard.value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <MemberHero
        action={{ href: '/account/church', label: 'My church' }}
        body="Ministry involvement is drawn from church memberships and KCA enrollment — there is no separate ministries table yet."
        eyebrow="MINISTRY"
        title={route.title}
      />
      {loading ? <p className="panel">Loading ministry involvement…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <div className="dashboard-grid">
        <section className="panel">
          <h3>Church</h3>
          {rows.length === 0 && !loading ? <p>No church memberships on file.</p> : null}
          {rows.map((row) => (
            <div className="activity" key={row.membership.id}>
              <span>⛪</span>
              <div>
                <b>{row.churchName}</b>
                <small>
                  {row.membership.status ?? 'active'} · Joined {formatWhen(row.membership.joined_at)}
                </small>
              </div>
            </div>
          ))}
        </section>
        <section className="panel">
          <h3>KCA</h3>
          <p>
            {kca?.enrolled
              ? `Enrolled · ${kca.modules_with_progress ?? 0}/${kca.modules_total ?? 0} modules with activity.`
              : 'Not enrolled in KCA yet.'}
          </p>
          <Link className="site-button" href="/account/kca">
            Open KCA
          </Link>
        </section>
      </div>
    </>
  );
}

export function LiveSpiritualGrowthPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [kca, setKca] = useState<KcaDashboard | null>(null);
  const [prayers, setPrayers] = useState<UserPrayer[]>([]);
  const [needs, setNeeds] = useState<UserPastoralNeed[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([fetchKcaDashboard(), fetchUserPrayers(), fetchUserNeeds()]).then(
      ([dashboard, prayerResult, needResult]) => {
        if (cancelled) return;
        if (dashboard.status === 'fulfilled') setKca(dashboard.value);
        if (prayerResult.status === 'fulfilled') setPrayers(prayerResult.value);
        if (needResult.status === 'fulfilled') setNeeds(needResult.value);
        const failed = [dashboard, prayerResult, needResult].every((result) => result.status === 'rejected');
        setError(failed ? 'Unable to load spiritual growth data.' : null);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const total = kca?.modules_total ?? 0;
  const progress = kca?.modules_with_progress ?? 0;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <>
      <MemberHero
        action={{ href: '/account/kca', label: 'Continue learning' }}
        body="Growth is measured from live KCA progress, prayer requests, and pastoral needs — not estimated scores."
        eyebrow="SPIRITUAL GROWTH"
        title={route.title}
      />
      {loading ? <p className="panel">Loading growth…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <section className="panel kca-progress">
        <header>
          <span>KCA module activity</span>
          <strong>{pct}%</strong>
        </header>
        <i aria-valuemax={100} aria-valuemin={0} aria-valuenow={pct} role="progressbar">
          <b style={{ width: `${pct}%` }} />
        </i>
        <small>
          {progress}/{total} modules with activity
        </small>
      </section>
      <MemberMetrics
        items={[
          { value: String(prayers.length), label: 'Prayer requests' },
          { value: String(needs.length), label: 'Need requests' },
          { value: String(kca?.assignments_open ?? 0), label: 'Open assignments' },
        ]}
      />
    </>
  );
}

export function LiveAttendancePage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchKcaAttendance()
      .then((items) => {
        if (!cancelled) {
          setRows(items);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err, 'Unable to load attendance.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <MemberHero
        action={{ href: '/account/kca/attendance', label: 'KCA attendance' }}
        body="Member attendance currently comes from KCA session records. Church service attendance is not exposed on the member API yet."
        eyebrow="ATTENDANCE"
        title={route.title}
      />
      {loading ? <p className="panel">Loading attendance…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <MemberEmpty
          action="Open KCA"
          body="No KCA attendance rows have been recorded for your person yet."
          href="/account/kca"
          title="No attendance yet"
        />
      ) : null}
      {rows.length > 0 ? (
        <section className="panel table-panel">
          {rows.map((row, index) => (
            <div className="list-row" key={String(row.id ?? index)}>
              <span className="thumb">▣</span>
              <div>
                <b>{String(row.session_title ?? row.title ?? row.code ?? 'KCA session')}</b>
                <small>{formatWhen(String(row.recorded_at ?? row.occurred_at ?? row.created_at ?? ''))}</small>
              </div>
              <MemberStatus>{String(row.status ?? 'Recorded')}</MemberStatus>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function LiveTestimoniesPage({ route }: { route: SiteRoute }) {
  return (
    <>
      <MemberHero
        action={{ href: '/account/prayer-requests/new', label: 'Share a prayer' }}
        body="Testimony publishing is not on the member API yet. Prayer requests and messages are the live ways to share what God is doing."
        eyebrow="TESTIMONIES"
        title={route.title}
      />
      <MemberEmpty
        action="Open messages"
        body="When a testimony endpoint ships, your published stories will load here from the database. Until then, write to pastoral care from Messages or Prayer."
        href="/account/messages"
        title="No testimony API yet"
      />
    </>
  );
}

export function LiveHomeChurchApplicationPage({ route }: { route: SiteRoute }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [memberships, setMemberships] = useState<UserMembership[]>([]);

  useEffect(() => {
    let cancelled = false;
    void fetchUserMemberships()
      .then((items) => {
        if (!cancelled) {
          setMemberships(items.filter((item) => Boolean(item.home_church_id)));
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err, 'Unable to load applications.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <MemberHero
        action={{ href: '/start-home-church', label: 'New application' }}
        body="Approved home church links appear through your memberships. Draft applications stay in this browser until you submit."
        eyebrow="APPLICATIONS"
        title={route.title}
      />
      {loading ? <p className="panel">Loading application status…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && memberships.length === 0 ? (
        <MemberEmpty
          action="Start application"
          body="No home church is linked to your memberships yet. Submit an application to host, then track it here after approval."
          href="/start-home-church"
          title="No home church application on file"
        />
      ) : (
        <section className="panel table-panel">
          {memberships.map((item) => (
            <div className="list-row" key={item.id}>
              <span className="thumb">⌂</span>
              <div>
                <b>Home church linked</b>
                <small>Joined {formatWhen(item.joined_at)}</small>
              </div>
              <MemberStatus>{item.status ?? 'active'}</MemberStatus>
              <Link className="ghost-link" href="/account/home-church">
                Open
              </Link>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export function LiveAccountCalendar({ route }: { route: SiteRoute }) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(first);

  useEffect(() => {
    let cancelled = false;
    void loadEvents({ per_page: 50 })
      .then((result) => {
        if (!cancelled) {
          setEvents(result.data);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(formatUserApiError(err, 'Unable to load calendar events.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cells: Array<{ day: number | null; events: EventItem[] }> = [];
  for (let i = 0; i < startWeekday; i += 1) cells.push({ day: null, events: [] });
  for (let day = 1; day <= daysInMonth; day += 1) {
    const onDay = events.filter((event) => {
      if (!event.startsAt) return false;
      const date = new Date(event.startsAt);
      return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
    });
    cells.push({ day, events: onDay });
  }

  const upcoming = events.filter((item) => item.tab !== 'past').slice(0, 8);

  return (
    <>
      <MemberHero
        action={{ href: '/events', label: 'Browse events' }}
        body="This month is generated from today’s date. Highlighted days come from published event start times."
        eyebrow={route.section}
        title={route.title}
      />
      {loading ? <p className="panel">Loading calendar…</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <div className="content-grid">
        <section className="panel">
          <h3>{monthLabel}</h3>
          <div className="calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <span key={day} className="calendar-dow">
                {day}
              </span>
            ))}
            {cells.map((cell, index) =>
              cell.day == null ? (
                <div className="calendar-cell is-empty" key={`pad-${index}`} />
              ) : (
                <div className={`calendar-cell${cell.events.length ? ' has-event' : ''}`} key={cell.day}>
                  <b>{cell.day}</b>
                  {cell.events[0] ? (
                    <Link href={cell.events[0].href}>
                      <small>{cell.events[0].title}</small>
                    </Link>
                  ) : null}
                </div>
              ),
            )}
          </div>
        </section>
        <aside className="panel side-card">
          <h3>Upcoming</h3>
          {upcoming.length === 0 && !loading ? <p>No upcoming events published.</p> : null}
          {upcoming.map((item) => (
            <Link className="list-row" href={item.href} key={item.href}>
              <span className="thumb">{item.icon}</span>
              <div>
                <b>{item.title}</b>
                <small>{item.when}</small>
              </div>
            </Link>
          ))}
        </aside>
      </div>
    </>
  );
}

const MEMBER_HOME_ACTIONS = [
  { title: 'Give', body: 'Tithe, offering, or mission.', href: '/give', icon: '◆' },
  { title: 'Prayer', body: 'Share a request with the team.', href: '/account/prayer-requests/new', icon: '✦' },
  { title: 'Events', body: 'Register or open your calendar.', href: '/account/events', icon: '▣' },
  { title: 'My church', body: 'Memberships and gatherings.', href: '/account/church', icon: '⌂' },
  { title: 'KCA', body: 'Continue your formation.', href: '/account/kca', icon: '◇' },
  { title: 'Need help', body: 'Ask for pastoral care.', href: '/account/need-requests/new', icon: '○' },
] as const;

type HomeStat = { value: string; label: string; href: string; hint?: string };
type HomeActivity = { title: string; meta: string; status: string; href: string; icon: string };

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function firstNameFromUser(user: CurrentUser | null | undefined): string {
  const preferred = user?.profile?.preferred_name?.trim();
  if (preferred) return preferred.split(/\s+/)[0] ?? preferred;
  const given = user?.profile?.given_name?.trim();
  if (given) return given;
  return displayNameFromUser(user).split(/\s+/)[0] || 'there';
}

function clipText(value: string, max = 96): string {
  const text = value.replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function formatHomeDate(value = new Date()): string {
  try {
    return new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' }).format(value);
  } catch {
    return value.toDateString();
  }
}

function MemberHomeSkeleton() {
  return (
    <div className="member-home" aria-busy="true" aria-live="polite">
      <div className="member-home-hero member-home-skel">
        <div>
          <i className="member-home-skel-line short" />
          <i className="member-home-skel-line title" />
          <i className="member-home-skel-line" />
        </div>
      </div>
      <div className="member-home-stats">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="member-home-stat member-home-skel" key={index}>
            <i className="member-home-skel-line title" />
            <i className="member-home-skel-line short" />
          </div>
        ))}
      </div>
      <p className="member-home-loading-copy">Loading your home…</p>
    </div>
  );
}

function MemberHomeView({
  name,
  note,
  stats,
  events,
  eventsNote,
  activity,
  activityNote,
  sermons,
  sermonsNote,
}: {
  name: string;
  note?: string | null;
  stats: HomeStat[];
  events: EventItem[];
  eventsNote?: string | null;
  activity: HomeActivity[];
  activityNote?: string | null;
  sermons: ContentCard[];
  sermonsNote?: string | null;
}) {
  return (
    <div className="member-home">
      <header className="member-home-hero">
        <div>
          <p className="member-home-kicker">Member home</p>
          <h1>
            {greetingForHour(new Date().getHours())}, {name}
          </h1>
          <p>
            {formatHomeDate()}
            <span aria-hidden="true"> · </span>
            Your church, giving, prayer, and learning in one place.
          </p>
          {note ? <p className="member-home-note">{note}</p> : null}
        </div>
        <div className="member-home-hero-actions">
          <Link className="site-button" href="/give">
            Give
          </Link>
          <Link className="site-button secondary" href="/account/calendar">
            Open calendar
          </Link>
        </div>
      </header>

      {stats.length > 0 ? (
        <section className="member-home-stats" aria-label="At a glance">
          {stats.map((stat) => (
            <Link className="member-home-stat" href={stat.href} key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              {stat.hint ? <small>{stat.hint}</small> : null}
            </Link>
          ))}
        </section>
      ) : null}

      <section className="member-home-block" aria-label="Quick actions">
        <div className="member-home-heading">
          <h2>Start here</h2>
        </div>
        <div className="member-home-actions">
          {MEMBER_HOME_ACTIONS.map((action) => (
            <Link className="member-home-action" href={action.href} key={action.href}>
              <span aria-hidden="true">{action.icon}</span>
              <b>{action.title}</b>
              <small>{action.body}</small>
            </Link>
          ))}
        </div>
      </section>

      <div className="member-home-columns">
        <section className="panel member-home-panel">
          <div className="member-home-heading">
            <h2>Upcoming</h2>
            <Link href="/events">See all</Link>
          </div>
          {eventsNote ? <p className="member-home-inline-note">{eventsNote}</p> : null}
          {!eventsNote && events.length === 0 ? (
            <div className="member-home-empty">
              <p>No upcoming gatherings are published yet.</p>
              <Link href="/events">Browse events</Link>
            </div>
          ) : (
            events.map((event) => (
              <Link className="member-home-row" href={event.href} key={event.href}>
                <span aria-hidden="true">▣</span>
                <div>
                  <b>{event.title}</b>
                  <small>{event.meta ?? event.when}</small>
                </div>
                <em>Open</em>
              </Link>
            ))
          )}
        </section>

        <section className="panel member-home-panel">
          <div className="member-home-heading">
            <h2>Recent activity</h2>
            <Link href="/account/notifications">Inbox</Link>
          </div>
          {activityNote ? <p className="member-home-inline-note">{activityNote}</p> : null}
          {activity.length === 0 && !activityNote ? (
            <div className="member-home-empty">
              <p>When you receive alerts or share a prayer, they will appear here.</p>
              <Link href="/account/prayer-requests/new">Share a prayer</Link>
            </div>
          ) : (
            activity.map((item, index) => (
              <Link className="member-home-row" href={item.href} key={`${item.title}-${index}`}>
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <b>{item.title}</b>
                  <small>{clipText(item.meta)}</small>
                </div>
                <MemberStatus>{item.status}</MemberStatus>
              </Link>
            ))
          )}
        </section>
      </div>

      <section className="panel member-home-panel">
        <div className="member-home-heading">
          <h2>Recommended for you</h2>
          <Link href="/online-church/sermons">Sermons</Link>
        </div>
        {sermonsNote ? <p className="member-home-inline-note">{sermonsNote}</p> : null}
        {!sermonsNote && sermons.length === 0 ? (
          <div className="member-home-empty">
            <p>No sermons are published in the library yet.</p>
            <Link href="/online-church">Open online church</Link>
          </div>
        ) : (
          sermons.map((item) => (
            <Link className="member-home-row sermon" href={item.href} key={item.href}>
              <span className="thumb" aria-hidden="true">
                ▶
              </span>
              <div>
                <b>{item.title}</b>
                <small>{item.body}</small>
              </div>
              <em>Watch</em>
            </Link>
          ))
        )}
      </section>
    </div>
  );
}

export function MemberHomePage() {
  if (designFixturesEnabled()) {
    return (
      <MemberHomeView
        name="John"
        stats={memberGlance.map((item, index) => ({
          value: item.value,
          label: item.label,
          href: ['/account/church', '/account/journey', '/account/events', '/account/prayer-requests'][index] ?? '/account',
        }))}
        events={memberEvents.map(([title, meta, , href]) => ({
          title,
          body: meta,
          meta,
          href,
          when: meta,
          where: '',
          tab: 'upcoming' as const,
        }))}
        activity={memberActivity.map(([title, meta, status]) => ({
          title,
          meta,
          status,
          href: '/account/notifications',
          icon: '●',
        }))}
        sermons={fixtureSermons.slice(0, 3)}
      />
    );
  }
  return <LiveMemberHome />;
}

function LiveMemberHome() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('there');
  const [note, setNote] = useState<string | null>(null);
  const [stats, setStats] = useState<HomeStat[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventsNote, setEventsNote] = useState<string | null>(null);
  const [activity, setActivity] = useState<HomeActivity[]>([]);
  const [activityNote, setActivityNote] = useState<string | null>(null);
  const [sermons, setSermons] = useState<ContentCard[]>([]);
  const [sermonsNote, setSermonsNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const [me, dashboard] = await Promise.all([fetchCurrentUser(), fetchUserDashboard()]);
        if (cancelled) return;
        const profileUser = dashboard.profile ?? me;
        setName(firstNameFromUser(profileUser));
        setNote(dashboard.upcoming_note ?? null);

        const [notificationsResult, prayersResult, intentsResult, upcomingResult, sermonResult] = await Promise.allSettled([
          fetchUserNotifications(),
          fetchUserPrayers(),
          fetchUserPaymentIntents(),
          loadEvents(),
          loadSermons(),
        ]);
        if (cancelled) return;

        const notifications = notificationsResult.status === 'fulfilled' ? notificationsResult.value : ([] as UserNotification[]);
        const prayers = prayersResult.status === 'fulfilled' ? prayersResult.value : ([] as UserPrayer[]);
        const intents = intentsResult.status === 'fulfilled' ? intentsResult.value : ([] as UserPaymentIntent[]);

        const unread =
          dashboard.unread_notification_count ??
          (notificationsResult.status === 'fulfilled' ? notifications.filter((item) => !item.read_at).length : null);
        const openPrayers =
          dashboard.open_prayer_count ??
          (prayersResult.status === 'fulfilled' ? prayers.filter((item) => (item.status ?? 'open') === 'open').length : null);
        const givingCount =
          dashboard.recent_payment_intents?.length ?? (intentsResult.status === 'fulfilled' ? intents.length : null);

        const nextStats: HomeStat[] = [];
        if (unread != null) nextStats.push({ value: String(unread), label: 'Unread alerts', href: '/account/notifications', hint: unread === 1 ? 'Needs a look' : 'Inbox' });
        if (openPrayers != null) nextStats.push({ value: String(openPrayers), label: 'Open prayers', href: '/account/prayer-requests', hint: 'Care team' });
        if (givingCount != null) nextStats.push({ value: String(givingCount), label: 'Recent giving', href: '/account/giving', hint: 'Intents' });

        if (upcomingResult.status === 'fulfilled') {
          const upcoming = upcomingResult.value.data.slice(0, 5);
          setEvents(upcoming);
          nextStats.push({ value: String(upcomingResult.value.data.length), label: 'Upcoming events', href: '/events', hint: 'This season' });
          setEventsNote(null);
        } else {
          setEvents([]);
          setEventsNote(formatUserApiError(upcomingResult.reason, 'Unable to load events right now.'));
        }
        setStats(nextStats);

        const feed: HomeActivity[] = [];
        if (notificationsResult.status === 'fulfilled') {
          feed.push(
            ...notifications.slice(0, 4).map((item) => ({
              title: item.title ?? 'Notification',
              meta: item.body ?? formatWhen(item.created_at),
              status: item.read_at ? 'Read' : 'Unread',
              href: '/account/notifications',
              icon: '●',
            })),
          );
        }
        if (prayersResult.status === 'fulfilled') {
          feed.push(
            ...prayers.slice(0, 3).map((item) => ({
              title: item.subject ?? 'Prayer request',
              meta: item.body ?? '',
              status: item.status ?? 'open',
              href: '/account/prayer-requests',
              icon: '✦',
            })),
          );
        }
        setActivity(feed.slice(0, 6));

        const activityErrors: string[] = [];
        if (notificationsResult.status === 'rejected') {
          activityErrors.push(formatUserApiError(notificationsResult.reason, 'Notifications unavailable.'));
        }
        if (prayersResult.status === 'rejected') {
          activityErrors.push(formatUserApiError(prayersResult.reason, 'Prayers unavailable.'));
        }
        setActivityNote(activityErrors.length ? activityErrors.join(' ') : null);

        if (sermonResult.status === 'fulfilled') {
          setSermons(sermonResult.value.data.slice(0, 3));
          setSermonsNote(null);
        } else {
          setSermons([]);
          setSermonsNote(formatUserApiError(sermonResult.reason, 'Unable to load sermons right now.'));
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(formatUserApiError(err, 'Unable to load your member home.'));
          setStats([]);
          setActivity([]);
          setEvents([]);
          setSermons([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <MemberHomeSkeleton />;
  if (error) {
    return (
      <div className="member-empty panel">
        <h3>We could not load your home</h3>
        <p>{error}</p>
        <Link className="site-button" href="/account">
          Try again
        </Link>
      </div>
    );
  }

  return (
    <MemberHomeView
      name={name}
      note={note}
      stats={stats}
      events={events}
      eventsNote={eventsNote}
      activity={activity}
      activityNote={activityNote}
      sermons={sermons}
      sermonsNote={sermonsNote}
    />
  );
}

export function MemberQuickLinks() {
  return (
    <div className="member-home-actions">
      {MEMBER_HOME_ACTIONS.slice(0, 4).map((action) => (
        <Link className="member-home-action" href={action.href} key={action.href}>
          <span aria-hidden="true">{action.icon}</span>
          <b>{action.title}</b>
          <small>{action.body}</small>
        </Link>
      ))}
    </div>
  );
}
