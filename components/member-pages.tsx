'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
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

type TranslateFn = ReturnType<typeof useLocale>['t'];

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

function MemberStatus({ children, toneFrom }: { children: string; toneFrom?: string }) {
  const tone = (toneFrom ?? children).toLowerCase();
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

async function loadMembershipRows(memberships: UserMembership[], t: TranslateFn): Promise<ChurchRow[]> {
  return Promise.all(
    memberships.map(async (membership) => {
      const churchId = membership.church_id ?? null;
      let churchName =
        membership.church_name?.trim() ||
        (churchId ? t('member.church', { defaultMessage: 'Church' }) : t('member.unknownChurch', { defaultMessage: 'Unknown church' }));
      const churchHref = churchId ? `/churches/${churchId}` : '/find-church';
      if (churchId && !membership.church_name) {
        try {
          const church = await loadChurch(churchId);
          if (church.data.title) churchName = church.data.title;
        } catch {
          /* keep fallback name */
        }
      }
      if (membership.home_church_name) {
        churchName = `${churchName}`;
      }
      return { membership, churchName, churchHref };
    }),
  );
}

export function LiveMyChurchPage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ChurchRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchUserMemberships()
      .then((memberships) => loadMembershipRows(memberships, t))
      .then((next) => {
        if (!cancelled) {
          setRows(next);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([]);
          setError(formatUserApiError(err, t('member.unableToLoadMemberships', { defaultMessage: 'Unable to load your church memberships.' })));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const active = rows.filter((row) => (row.membership.status ?? 'active') === 'active');

  return (
    <>
      <MemberHero
        action={{ href: '/join-church/register', label: t('member.joinChurch', { defaultMessage: '+ Join a church' }) }}
        body={t('member.myChurchBody', { defaultMessage: 'Live memberships from your Family House account. Status and join dates come from the church API.' })}
        eyebrow={t('member.myChurch', { defaultMessage: 'MY CHURCH' })}
        secondary={{ href: '/find-church', label: t('member.findChurch', { defaultMessage: 'Find a church' }) }}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingChurch', { defaultMessage: 'Loading your church…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <MemberEmpty
          action={t('member.findChurch', { defaultMessage: 'Find a church' })}
          body={t('member.noMembershipBody', { defaultMessage: 'You do not have a recorded church membership yet. Search the network and request to join.' })}
          href="/find-church"
          title={t('member.noMembershipYet', { defaultMessage: 'No church membership yet' })}
        />
      ) : null}
      {rows.length > 0 ? (
        <>
          <MemberMetrics
            items={[
              { value: String(active.length), label: t('member.activeMemberships', { defaultMessage: 'Active memberships' }) },
              { value: String(rows.length), label: t('member.allRecords', { defaultMessage: 'All records' }) },
              { value: String(rows.filter((row) => row.membership.home_church_id).length), label: t('member.homeChurches', { defaultMessage: 'Home churches' }) },
            ]}
          />
          <section className="panel table-panel">
            {rows.map((row) => (
              <div className="list-row rich-row" key={row.membership.id ?? row.churchHref}>
                <span className="thumb">⛪</span>
                <div>
                  <b>{row.churchName}</b>
                  <small>
                    {t('member.joinedOn', { defaultMessage: 'Joined {when}', vars: { when: formatWhen(row.membership.joined_at) } })}
                    {row.membership.home_church_id
                      ? t('member.linkedHomeChurchNamed', {
                          defaultMessage: ' · Home church: {name}',
                          vars: { name: row.membership.home_church_name ?? row.membership.home_church_id },
                        })
                      : ''}
                    {row.membership.ended_at
                      ? t('member.endedOn', { defaultMessage: ' · Ended {when}', vars: { when: formatWhen(row.membership.ended_at) } })
                      : ''}
                  </small>
                </div>
                <MemberStatus toneFrom={row.membership.status ?? 'active'}>
                  {row.membership.status ?? t('member.statusActive', { defaultMessage: 'active' })}
                </MemberStatus>
                <Link className="ghost-link" href={row.churchHref}>
                  {t('member.open', { defaultMessage: 'Open' })}
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
  const { t } = useLocale();
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
          setError(formatUserApiError(err, t('member.unableToLoadHomeChurch', { defaultMessage: 'Unable to load your home church.' })));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const primary = dashboards[0] ?? null;
  const homeId = primary?.id ?? memberships[0]?.home_church_id ?? null;

  const onReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!homeId) return;
    const text = summary.trim();
    if (!text) {
      setReportError(t('member.writeReportFirst', { defaultMessage: 'Write a short report before submitting.' }));
      return;
    }
    setReportBusy(true);
    setReportError(null);
    setReportMessage(null);
    try {
      await submitHomeChurchReport(homeId, { summary: text });
      setSummary('');
      setReportMessage(t('member.reportSubmitted', { defaultMessage: 'Report submitted.' }));
    } catch (err) {
      setReportError(formatUserApiError(err, t('member.unableToSubmitReport', { defaultMessage: 'Unable to submit this home church report.' })));
    } finally {
      setReportBusy(false);
    }
  };

  return (
    <>
      <MemberHero
        action={{ href: '/start-home-church', label: t('member.startHomeChurch', { defaultMessage: 'Start a home church' }) }}
        body={t('member.myHomeChurchBody', { defaultMessage: 'Home churches linked to your memberships, with live names and status from the member API.' })}
        eyebrow={t('member.myHomeChurchEyebrow', { defaultMessage: 'MY HOME CHURCH' })}
        secondary={{ href: '/account/church', label: t('member.myChurchAction', { defaultMessage: 'My church' }) }}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingHomeChurch', { defaultMessage: 'Loading your home church…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && !primary && memberships.length === 0 ? (
        <MemberEmpty
          action={t('member.startApplication', { defaultMessage: 'Start an application' })}
          body={t('member.noHomeChurchBody', { defaultMessage: 'You are not linked to a home church yet. Apply to host, or join one through your local church.' })}
          href="/start-home-church"
          title={t('member.noHomeChurchLinked', { defaultMessage: 'No home church linked' })}
        />
      ) : null}
      {primary ? (
        <div className="dashboard-grid">
          <section className="panel">
            <span className="eyebrow">{t('member.homeChurch', { defaultMessage: 'HOME CHURCH' })}</span>
            <h3>{String(primary.name ?? t('member.yourHomeChurch', { defaultMessage: 'Your home church' }))}</h3>
            <p>
              {String(primary.church_name ?? t('member.familyHouse', { defaultMessage: 'Family House' }))}
              {primary.members_count != null
                ? t('member.membersCountSuffix', { defaultMessage: ' · {count} members', vars: { count: primary.members_count } })
                : ''}
            </p>
            <MemberStatus toneFrom={String(primary.membership_status ?? primary.status ?? 'active')}>
              {String(primary.membership_status ?? primary.status ?? t('member.statusActive', { defaultMessage: 'active' }))}
            </MemberStatus>
            <dl className="give-dl" style={{ marginTop: 18 }}>
              <div>
                <dt>{t('member.status', { defaultMessage: 'Status' })}</dt>
                <dd>{String(primary.status ?? '—')}</dd>
              </div>
              <div>
                <dt>{t('nav.church', { defaultMessage: 'Church' })}</dt>
                <dd>{String(primary.church_name ?? primary.church_id ?? '—')}</dd>
              </div>
            </dl>
          </section>
          <form className="panel site-form" onSubmit={onReport} style={{ margin: 0, maxWidth: 'none' }}>
            <div className="form-intro">
              <h3>{t('member.submitReport', { defaultMessage: 'Submit a report' })}</h3>
              <p>{t('member.submitReportCopy', { defaultMessage: 'Leaders and members can send a period report. Recent MFA may be required.' })}</p>
            </div>
            <label className="wide">
              {t('member.summary', { defaultMessage: 'Summary' })}
              <textarea onChange={(event) => setSummary(event.target.value)} rows={5} value={summary} />
            </label>
            {reportError ? <p role="alert">{reportError}</p> : null}
            {reportMessage ? <p>{reportMessage}</p> : null}
            <button className="site-button" disabled={reportBusy} type="submit">
              {reportBusy
                ? t('member.sending', { defaultMessage: 'Sending…' })
                : t('member.submitReportAction', { defaultMessage: 'Submit report' })}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

export function LiveJourneyPage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
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
        setError(failures.length === 5 ? t('member.unableToLoadJourneyApi', { defaultMessage: 'Unable to load your journey from the API.' }) : null);
      } catch (err) {
        if (!cancelled) setError(formatUserApiError(err, t('member.unableToLoadJourney', { defaultMessage: 'Unable to load your journey.' })));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const displayName = name ?? t('member.navAria', { defaultMessage: 'Member' });

  if (designFixturesEnabled()) {
    return (
      <>
        <MemberHero
          body={t('member.journeyFixtureBody', { defaultMessage: 'Track your growth from first step to multiplication.' })}
          eyebrow={t('member.kingdomJourneyEyebrow', { defaultMessage: 'MY KINGDOM JOURNEY' })}
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
              <Link href={card.href}>{card.action ?? t('member.open', { defaultMessage: 'Open' })} →</Link>
            </article>
          ))}
        </section>
      </>
    );
  }

  const stages = [
    { label: t('member.account', { defaultMessage: 'Account' }), done: true, href: '/account/profile', detail: displayName },
    {
      label: t('nav.church', { defaultMessage: 'Church' }),
      done: memberships.some((item) => (item.status ?? 'active') === 'active'),
      href: '/account/church',
      detail: memberships.length
        ? t(memberships.length === 1 ? 'member.membershipCountOne' : 'member.membershipCountMany', {
            defaultMessage: memberships.length === 1 ? '{count} membership' : '{count} memberships',
            vars: { count: memberships.length },
          })
        : t('member.notJoined', { defaultMessage: 'Not joined' }),
    },
    {
      label: t('member.stageHomeChurch', { defaultMessage: 'Home church' }),
      done: memberships.some((item) => Boolean(item.home_church_id)),
      href: '/account/home-church',
      detail: memberships.some((item) => item.home_church_id)
        ? t('member.linked', { defaultMessage: 'Linked' })
        : t('member.notLinked', { defaultMessage: 'Not linked' }),
    },
    {
      label: t('member.kca', { defaultMessage: 'KCA' }),
      done: Boolean(kca?.enrolled || (kca?.modules_with_progress ?? 0) > 0),
      href: '/account/kca',
      detail: kca?.enrolled
        ? t('member.modulesProgress', {
            defaultMessage: '{progress}/{total} modules',
            vars: { progress: kca.modules_with_progress ?? 0, total: kca.modules_total ?? 0 },
          })
        : t('member.notEnrolled', { defaultMessage: 'Not enrolled' }),
    },
    {
      label: t('member.prayer', { defaultMessage: 'Prayer' }),
      done: prayers.length > 0,
      href: '/account/prayer-requests',
      detail: prayers.length
        ? t(prayers.length === 1 ? 'member.requestCountOne' : 'member.requestCountMany', {
            defaultMessage: prayers.length === 1 ? '{count} request' : '{count} requests',
            vars: { count: prayers.length },
          })
        : t('member.noneYet', { defaultMessage: 'None yet' }),
    },
    {
      label: t('member.giving', { defaultMessage: 'Giving' }),
      done: intents.length > 0,
      href: '/account/giving',
      detail: intents.length
        ? t(intents.length === 1 ? 'member.intentCountOne' : 'member.intentCountMany', {
            defaultMessage: intents.length === 1 ? '{count} intent' : '{count} intents',
            vars: { count: intents.length },
          })
        : t('member.noneYet', { defaultMessage: 'None yet' }),
    },
  ];
  const doneCount = stages.filter((stage) => stage.done).length;

  return (
    <>
      <MemberHero
        action={{ href: '/account/kca', label: t('member.continueKca', { defaultMessage: 'Continue KCA' }) }}
        body={t('member.journeyWelcome', {
          defaultMessage: 'Welcome back, {name}. These stages are built from your live church, KCA, prayer, and giving records.',
          vars: { name: displayName },
        })}
        eyebrow={t('member.kingdomJourneyEyebrow', { defaultMessage: 'MY KINGDOM JOURNEY' })}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingJourney', { defaultMessage: 'Loading your journey…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <MemberMetrics
        items={[
          { value: `${doneCount}/${stages.length}`, label: t('member.stagesInMotion', { defaultMessage: 'Stages in motion' }) },
          { value: String(memberships.length), label: t('member.memberships', { defaultMessage: 'Memberships' }) },
          { value: String(kca?.modules_with_progress ?? 0), label: t('member.kcaModules', { defaultMessage: 'KCA modules' }) },
          { value: String(intents.length), label: t('member.givingIntents', { defaultMessage: 'Giving intents' }) },
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
  const { t } = useLocale();
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
        if (!cancelled) setError(formatUserApiError(err, t('member.unableToLoadEvents', { defaultMessage: 'Unable to load events.' })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const upcoming = events.filter((item) => item.tab !== 'past');
  const past = events.filter((item) => item.tab === 'past');

  return (
    <>
      <MemberHero
        action={{ href: '/events', label: t('member.browseEvents', { defaultMessage: 'Browse events' }) }}
        body={t('member.myEventsBody', { defaultMessage: 'Published gatherings from the events API. Register from an event page when registration is open.' })}
        eyebrow={t('member.myEventsEyebrow', { defaultMessage: 'MY EVENTS' })}
        secondary={{ href: '/account/calendar', label: t('member.openCalendar', { defaultMessage: 'Open calendar' }) }}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingEvents', { defaultMessage: 'Loading events…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && events.length === 0 ? (
        <MemberEmpty
          action={t('member.viewPublicCalendar', { defaultMessage: 'View public calendar' })}
          body={t('member.noEventsBody', { defaultMessage: 'No events are published yet. Check back as the church calendar is updated.' })}
          href="/events"
          title={t('member.noEventsYet', { defaultMessage: 'No events yet' })}
        />
      ) : null}
      {upcoming.length > 0 ? (
        <section className="panel table-panel">
          <h3>{t('member.upcoming', { defaultMessage: 'Upcoming' })}</h3>
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
              <MemberStatus toneFrom={event.status ?? 'Upcoming'}>
                {event.status ?? t('member.statusUpcoming', { defaultMessage: 'Upcoming' })}
              </MemberStatus>
              <Link className="ghost-link" href={`${event.href}/register`}>
                {t('common.register', { defaultMessage: 'Register' })}
              </Link>
            </div>
          ))}
        </section>
      ) : null}
      {past.length > 0 ? (
        <section className="panel table-panel">
          <h3>{t('member.past', { defaultMessage: 'Past' })}</h3>
          {past.map((event) => (
            <div className="list-row rich-row" key={event.href}>
              <span className="thumb">{event.icon ?? '✓'}</span>
              <div>
                <b>{event.title}</b>
                <small>{event.when}</small>
              </div>
              <MemberStatus toneFrom="Completed">{t('member.statusCompleted', { defaultMessage: 'Completed' })}</MemberStatus>
              <Link className="ghost-link" href={event.href}>
                {t('common.view', { defaultMessage: 'View' })}
              </Link>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function LiveGivingHistoryPage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
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
        if (!cancelled) setError(formatUserApiError(err, t('member.unableToLoadGiving', { defaultMessage: 'Unable to load giving history.' })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const givenMinor = transactions.reduce((sum, tx) => sum + (tx.amount_minor ?? 0), 0);
  const currency = transactions[0]?.currency ?? intents[0]?.currency ?? 'NGN';

  return (
    <>
      <MemberHero
        action={{ href: '/give', label: t('member.giveNow', { defaultMessage: 'Give now' }) }}
        body={t('member.givingHistoryBody', { defaultMessage: 'Intents and recorded gifts from your payment history. Receipts appear after a successful local QA completion.' })}
        eyebrow={t('member.giving', { defaultMessage: 'GIVING' })}
        secondary={{ href: '/account/giving/recurring', label: t('member.recurring', { defaultMessage: 'Recurring' }) }}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingGiving', { defaultMessage: 'Loading giving history…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <MemberMetrics
        items={[
          { value: formatMoneyMinor(givenMinor, currency), label: t('member.recordedGifts', { defaultMessage: 'Recorded gifts' }) },
          { value: String(transactions.length), label: t('member.transactions', { defaultMessage: 'Transactions' }) },
          { value: String(intents.length), label: t('member.intents', { defaultMessage: 'Intents' }) },
        ]}
      />
      {!loading && !error && intents.length === 0 && transactions.length === 0 ? (
        <MemberEmpty
          action={t('member.giveNow', { defaultMessage: 'Give now' })}
          body={t('member.noGiftsBody', { defaultMessage: 'No giving intents or transactions yet. Start a gift and it will appear here.' })}
          href="/give"
          title={t('member.noGiftsRecorded', { defaultMessage: 'No gifts recorded' })}
        />
      ) : null}
      {transactions.length > 0 ? (
        <section className="panel table-panel">
          <h3>{t('member.transactions', { defaultMessage: 'Transactions' })}</h3>
          {transactions.map((tx) => (
            <div className="list-row rich-row" key={tx.id ?? tx.public_id}>
              <span className="thumb">🧾</span>
              <div>
                <b>{formatMoneyMinor(tx.amount_minor, tx.currency ?? 'NGN')}</b>
                <small>
                  {formatWhen(tx.occurred_at ?? tx.created_at)}
                  {tx.payment_intent_id
                    ? t('member.intentId', { defaultMessage: ' · Intent {id}', vars: { id: tx.payment_intent_id.slice(0, 8) } })
                    : ''}
                </small>
              </div>
              <MemberStatus toneFrom={tx.status ?? 'Recorded'}>
                {tx.status ?? t('member.statusRecorded', { defaultMessage: 'Recorded' })}
              </MemberStatus>
            </div>
          ))}
        </section>
      ) : null}
      {intents.length > 0 ? (
        <section className="panel table-panel">
          <h3>{t('member.intents', { defaultMessage: 'Intents' })}</h3>
          {intents.map((intent) => (
            <div className="list-row rich-row" key={intent.id ?? intent.public_id}>
              <span className="thumb">💝</span>
              <div>
                <b>{intent.purpose_code ?? t('member.givingIntent', { defaultMessage: 'Giving intent' })}</b>
                <small>
                  {formatMoneyMinor(intent.amount_minor, intent.currency ?? 'NGN')} · {formatWhen(intent.created_at)}
                </small>
              </div>
              <MemberStatus toneFrom={intent.status ?? 'Pending'}>
                {intent.status ?? t('member.statusPending', { defaultMessage: 'Pending' })}
              </MemberStatus>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function LiveMinistriesPage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ChurchRow[]>([]);
  const [kca, setKca] = useState<KcaDashboard | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.allSettled([fetchUserMemberships().then((memberships) => loadMembershipRows(memberships, t)), fetchKcaDashboard()])
      .then(([memberships, dashboard]) => {
        if (cancelled) return;
        if (memberships.status === 'fulfilled') setRows(memberships.value);
        else setError(formatUserApiError(memberships.reason, t('member.unableToLoadMinistries', { defaultMessage: 'Unable to load ministries.' })));
        if (dashboard.status === 'fulfilled') setKca(dashboard.value);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <>
      <MemberHero
        action={{ href: '/account/church', label: t('member.myChurchAction', { defaultMessage: 'My church' }) }}
        body={t('member.ministryBody', { defaultMessage: 'Ministry involvement is drawn from church memberships and KCA enrollment — there is no separate ministries table yet.' })}
        eyebrow={t('member.ministryEyebrow', { defaultMessage: 'MINISTRY' })}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingMinistry', { defaultMessage: 'Loading ministry involvement…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <div className="dashboard-grid">
        <section className="panel">
          <h3>{t('nav.church', { defaultMessage: 'Church' })}</h3>
          {rows.length === 0 && !loading ? <p>{t('member.noChurchMemberships', { defaultMessage: 'No church memberships on file.' })}</p> : null}
          {rows.map((row) => (
            <div className="activity" key={row.membership.id}>
              <span>⛪</span>
              <div>
                <b>{row.churchName}</b>
                <small>
                  {row.membership.status ?? t('member.statusActive', { defaultMessage: 'active' })} · {t('member.joinedOn', { defaultMessage: 'Joined {when}', vars: { when: formatWhen(row.membership.joined_at) } })}
                </small>
              </div>
            </div>
          ))}
        </section>
        <section className="panel">
          <h3>{t('member.kca', { defaultMessage: 'KCA' })}</h3>
          <p>
            {kca?.enrolled
              ? t('member.kcaEnrolled', {
                  defaultMessage: 'Enrolled · {progress}/{total} modules with activity.',
                  vars: { progress: kca.modules_with_progress ?? 0, total: kca.modules_total ?? 0 },
                })
              : t('member.notEnrolledKca', { defaultMessage: 'Not enrolled in KCA yet.' })}
          </p>
          <Link className="site-button" href="/account/kca">
            {t('member.openKca', { defaultMessage: 'Open KCA' })}
          </Link>
        </section>
      </div>
    </>
  );
}

export function LiveSpiritualGrowthPage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
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
        setError(failed ? t('member.unableToLoadGrowth', { defaultMessage: 'Unable to load spiritual growth data.' }) : null);
        setLoading(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [t]);

  const total = kca?.modules_total ?? 0;
  const progress = kca?.modules_with_progress ?? 0;
  const pct = total > 0 ? Math.round((progress / total) * 100) : 0;

  return (
    <>
      <MemberHero
        action={{ href: '/account/kca', label: t('member.continueLearning', { defaultMessage: 'Continue learning' }) }}
        body={t('member.growthBody', { defaultMessage: 'Growth is measured from live KCA progress, prayer requests, and pastoral needs — not estimated scores.' })}
        eyebrow={t('member.spiritualGrowthEyebrow', { defaultMessage: 'SPIRITUAL GROWTH' })}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingGrowth', { defaultMessage: 'Loading growth…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <section className="panel kca-progress">
        <header>
          <span>{t('member.kcaModuleActivity', { defaultMessage: 'KCA module activity' })}</span>
          <strong>{pct}%</strong>
        </header>
        <i aria-valuemax={100} aria-valuemin={0} aria-valuenow={pct} role="progressbar">
          <b style={{ width: `${pct}%` }} />
        </i>
        <small>
          {t('member.modulesWithActivity', {
            defaultMessage: '{progress}/{total} modules with activity',
            vars: { progress, total },
          })}
        </small>
      </section>
      <MemberMetrics
        items={[
          { value: String(prayers.length), label: t('member.prayerRequests', { defaultMessage: 'Prayer requests' }) },
          { value: String(needs.length), label: t('member.needRequests', { defaultMessage: 'Need requests' }) },
          { value: String(kca?.assignments_open ?? 0), label: t('member.openAssignments', { defaultMessage: 'Open assignments' }) },
        ]}
      />
    </>
  );
}

export function LiveAttendancePage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
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
        if (!cancelled) setError(formatUserApiError(err, t('member.unableToLoadAttendance', { defaultMessage: 'Unable to load attendance.' })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <>
      <MemberHero
        action={{ href: '/account/kca/attendance', label: t('member.kcaAttendance', { defaultMessage: 'KCA attendance' }) }}
        body={t('member.attendanceBody', { defaultMessage: 'Member attendance currently comes from KCA session records. Church service attendance is not exposed on the member API yet.' })}
        eyebrow={t('member.attendanceEyebrow', { defaultMessage: 'ATTENDANCE' })}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingAttendance', { defaultMessage: 'Loading attendance…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && !error && rows.length === 0 ? (
        <MemberEmpty
          action={t('member.openKca', { defaultMessage: 'Open KCA' })}
          body={t('member.noAttendanceBody', { defaultMessage: 'No KCA attendance rows have been recorded for your person yet.' })}
          href="/account/kca"
          title={t('member.noAttendanceYet', { defaultMessage: 'No attendance yet' })}
        />
      ) : null}
      {rows.length > 0 ? (
        <section className="panel table-panel">
          {rows.map((row, index) => (
            <div className="list-row" key={String(row.id ?? index)}>
              <span className="thumb">▣</span>
              <div>
                <b>{String(row.session_title ?? row.title ?? row.code ?? t('member.kcaSession', { defaultMessage: 'KCA session' }))}</b>
                <small>{formatWhen(String(row.recorded_at ?? row.occurred_at ?? row.created_at ?? ''))}</small>
              </div>
              <MemberStatus toneFrom={String(row.status ?? 'Recorded')}>
                {String(row.status ?? t('member.statusRecorded', { defaultMessage: 'Recorded' }))}
              </MemberStatus>
            </div>
          ))}
        </section>
      ) : null}
    </>
  );
}

export function LiveTestimoniesPage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
  return (
    <>
      <MemberHero
        action={{ href: '/account/prayer-requests/new', label: t('member.sharePrayer', { defaultMessage: 'Share a prayer' }) }}
        body={t('member.testimoniesBody', { defaultMessage: 'Testimony publishing is not on the member API yet. Prayer requests and messages are the live ways to share what God is doing.' })}
        eyebrow={t('member.testimoniesEyebrow', { defaultMessage: 'TESTIMONIES' })}
        title={route.title}
      />
      <MemberEmpty
        action={t('member.openMessages', { defaultMessage: 'Open messages' })}
        body={t('member.testimoniesEmptyBody', { defaultMessage: 'When a testimony endpoint ships, your published stories will load here from the database. Until then, write to pastoral care from Messages or Prayer.' })}
        href="/account/messages"
        title={t('member.noTestimonyApi', { defaultMessage: 'No testimony API yet' })}
      />
    </>
  );
}

export function LiveHomeChurchApplicationPage({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
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
        if (!cancelled) setError(formatUserApiError(err, t('member.unableToLoadApplications', { defaultMessage: 'Unable to load applications.' })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  return (
    <>
      <MemberHero
        action={{ href: '/start-home-church', label: t('member.newApplication', { defaultMessage: 'New application' }) }}
        body={t('member.applicationsBody', { defaultMessage: 'Approved home church links appear through your memberships. Draft applications stay in this browser until you submit.' })}
        eyebrow={t('member.applicationsEyebrow', { defaultMessage: 'APPLICATIONS' })}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingApplications', { defaultMessage: 'Loading application status…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      {!loading && memberships.length === 0 ? (
        <MemberEmpty
          action={t('member.startApplicationShort', { defaultMessage: 'Start application' })}
          body={t('member.noApplicationBody', { defaultMessage: 'No home church is linked to your memberships yet. Submit an application to host, then track it here after approval.' })}
          href="/start-home-church"
          title={t('member.noApplicationOnFile', { defaultMessage: 'No home church application on file' })}
        />
      ) : (
        <section className="panel table-panel">
          {memberships.map((item) => (
            <div className="list-row" key={item.id}>
              <span className="thumb">⌂</span>
              <div>
                <b>{t('member.homeChurchLinked', { defaultMessage: 'Home church linked' })}</b>
                <small>{t('member.joinedOn', { defaultMessage: 'Joined {when}', vars: { when: formatWhen(item.joined_at) } })}</small>
              </div>
              <MemberStatus toneFrom={item.status ?? 'active'}>
                {item.status ?? t('member.statusActive', { defaultMessage: 'active' })}
              </MemberStatus>
              <Link className="ghost-link" href="/account/home-church">
                {t('member.open', { defaultMessage: 'Open' })}
              </Link>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

export function LiveAccountCalendar({ route }: { route: SiteRoute }) {
  const { t } = useLocale();
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
        if (!cancelled) setError(formatUserApiError(err, t('member.unableToLoadCalendar', { defaultMessage: 'Unable to load calendar events.' })));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

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
  const weekdays: Array<[string, string]> = [
    ['member.weekdaySun', 'Sun'],
    ['member.weekdayMon', 'Mon'],
    ['member.weekdayTue', 'Tue'],
    ['member.weekdayWed', 'Wed'],
    ['member.weekdayThu', 'Thu'],
    ['member.weekdayFri', 'Fri'],
    ['member.weekdaySat', 'Sat'],
  ];

  return (
    <>
      <MemberHero
        action={{ href: '/events', label: t('member.browseEvents', { defaultMessage: 'Browse events' }) }}
        body={t('member.calendarBody', { defaultMessage: 'This month is generated from today’s date. Highlighted days come from published event start times.' })}
        eyebrow={route.section}
        title={route.title}
      />
      {loading ? <p className="panel">{t('member.loadingCalendar', { defaultMessage: 'Loading calendar…' })}</p> : null}
      {error ? <p className="panel">{error}</p> : null}
      <div className="content-grid">
        <section className="panel">
          <h3>{monthLabel}</h3>
          <div className="calendar-grid">
            {weekdays.map(([key, label]) => (
              <span key={key} className="calendar-dow">
                {t(key, { defaultMessage: label })}
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
          <h3>{t('member.upcoming', { defaultMessage: 'Upcoming' })}</h3>
          {upcoming.length === 0 && !loading ? <p>{t('member.noUpcomingPublished', { defaultMessage: 'No upcoming events published.' })}</p> : null}
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

function memberHomeActions(t: TranslateFn) {
  return [
    { title: t('nav.give', { defaultMessage: 'Give' }), body: t('member.homeGiveBody', { defaultMessage: 'Tithe, offering, or mission.' }), href: '/give', icon: '◆' },
    { title: t('member.prayer', { defaultMessage: 'Prayer' }), body: t('member.homePrayerBody', { defaultMessage: 'Share a request with the team.' }), href: '/account/prayer-requests/new', icon: '✦' },
    { title: t('nav.events', { defaultMessage: 'Events' }), body: t('member.homeEventsBody', { defaultMessage: 'Register or open your calendar.' }), href: '/account/events', icon: '▣' },
    { title: t('member.myChurchAction', { defaultMessage: 'My church' }), body: t('member.homeChurchActionBody', { defaultMessage: 'Memberships and gatherings.' }), href: '/account/church', icon: '⌂' },
    { title: t('member.kca', { defaultMessage: 'KCA' }), body: t('member.homeKcaBody', { defaultMessage: 'Continue your formation.' }), href: '/account/kca', icon: '◇' },
    { title: t('member.needHelp', { defaultMessage: 'Need help' }), body: t('member.homeNeedHelpBody', { defaultMessage: 'Ask for pastoral care.' }), href: '/account/need-requests/new', icon: '○' },
  ];
}

type HomeStat = { value: string; label: string; href: string; hint?: string };
type HomeActivity = { title: string; meta: string; status: string; href: string; icon: string; toneFrom?: string };

function greetingForHour(hour: number, t: TranslateFn): string {
  if (hour < 12) return t('member.goodMorning', { defaultMessage: 'Good morning' });
  if (hour < 17) return t('member.goodAfternoon', { defaultMessage: 'Good afternoon' });
  return t('member.goodEvening', { defaultMessage: 'Good evening' });
}

function firstNameFromUser(user: CurrentUser | null | undefined): string {
  const preferred = user?.profile?.preferred_name?.trim();
  if (preferred) return preferred.split(/\s+/)[0] ?? preferred;
  const given = user?.profile?.given_name?.trim();
  if (given) return given;
  return displayNameFromUser(user).split(/\s+/)[0] || '';
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
  const { t } = useLocale();
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
      <p className="member-home-loading-copy">{t('member.loadingHome', { defaultMessage: 'Loading your home…' })}</p>
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
  const { t } = useLocale();
  const actions = memberHomeActions(t);
  return (
    <div className="member-home">
      <header className="member-home-hero">
        <div>
          <p className="member-home-kicker">{t('member.memberHome', { defaultMessage: 'Member home' })}</p>
          <h1>
            {greetingForHour(new Date().getHours(), t)}, {name}
          </h1>
          <p>
            {formatHomeDate()}
            <span aria-hidden="true"> · </span>
            {t('member.homeHeroCopy', { defaultMessage: 'Your church, giving, prayer, and learning in one place.' })}
          </p>
          {note ? <p className="member-home-note">{note}</p> : null}
        </div>
        <div className="member-home-hero-actions">
          <Link className="site-button" href="/give">
            {t('nav.give', { defaultMessage: 'Give' })}
          </Link>
          <Link className="site-button secondary" href="/account/calendar">
            {t('member.openCalendar', { defaultMessage: 'Open calendar' })}
          </Link>
        </div>
      </header>

      {stats.length > 0 ? (
        <section className="member-home-stats" aria-label={t('member.atAGlance', { defaultMessage: 'At a glance' })}>
          {stats.map((stat) => (
            <Link className="member-home-stat" href={stat.href} key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
              {stat.hint ? <small>{stat.hint}</small> : null}
            </Link>
          ))}
        </section>
      ) : null}

      <section className="member-home-block" aria-label={t('member.quickActions', { defaultMessage: 'Quick actions' })}>
        <div className="member-home-heading">
          <h2>{t('member.startHere', { defaultMessage: 'Start here' })}</h2>
        </div>
        <div className="member-home-actions">
          {actions.map((action) => (
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
            <h2>{t('member.upcoming', { defaultMessage: 'Upcoming' })}</h2>
            <Link href="/events">{t('member.seeAll', { defaultMessage: 'See all' })}</Link>
          </div>
          {eventsNote ? <p className="member-home-inline-note">{eventsNote}</p> : null}
          {!eventsNote && events.length === 0 ? (
            <div className="member-home-empty">
              <p>{t('member.noUpcomingGatherings', { defaultMessage: 'No upcoming gatherings are published yet.' })}</p>
              <Link href="/events">{t('member.browseEvents', { defaultMessage: 'Browse events' })}</Link>
            </div>
          ) : (
            events.map((event) => (
              <Link className="member-home-row" href={event.href} key={event.href}>
                <span aria-hidden="true">▣</span>
                <div>
                  <b>{event.title}</b>
                  <small>{event.meta ?? event.when}</small>
                </div>
                <em>{t('member.open', { defaultMessage: 'Open' })}</em>
              </Link>
            ))
          )}
        </section>

        <section className="panel member-home-panel">
          <div className="member-home-heading">
            <h2>{t('member.recentActivity', { defaultMessage: 'Recent activity' })}</h2>
            <Link href="/account/notifications">{t('member.inbox', { defaultMessage: 'Inbox' })}</Link>
          </div>
          {activityNote ? <p className="member-home-inline-note">{activityNote}</p> : null}
          {activity.length === 0 && !activityNote ? (
            <div className="member-home-empty">
              <p>{t('member.activityEmpty', { defaultMessage: 'When you receive alerts or share a prayer, they will appear here.' })}</p>
              <Link href="/account/prayer-requests/new">{t('member.sharePrayer', { defaultMessage: 'Share a prayer' })}</Link>
            </div>
          ) : (
            activity.map((item, index) => (
              <Link className="member-home-row" href={item.href} key={`${item.title}-${index}`}>
                <span aria-hidden="true">{item.icon}</span>
                <div>
                  <b>{item.title}</b>
                  <small>{clipText(item.meta)}</small>
                </div>
                <MemberStatus toneFrom={item.toneFrom ?? item.status}>{item.status}</MemberStatus>
              </Link>
            ))
          )}
        </section>
      </div>

      <section className="panel member-home-panel">
        <div className="member-home-heading">
          <h2>{t('member.recommended', { defaultMessage: 'Recommended for you' })}</h2>
          <Link href="/online-church/sermons">{t('member.sermons', { defaultMessage: 'Sermons' })}</Link>
        </div>
        {sermonsNote ? <p className="member-home-inline-note">{sermonsNote}</p> : null}
        {!sermonsNote && sermons.length === 0 ? (
          <div className="member-home-empty">
            <p>{t('member.noSermons', { defaultMessage: 'No sermons are published in the library yet.' })}</p>
            <Link href="/online-church">{t('member.openOnlineChurch', { defaultMessage: 'Open online church' })}</Link>
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
              <em>{t('member.watch', { defaultMessage: 'Watch' })}</em>
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
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
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
        if (unread != null) {
          nextStats.push({
            value: String(unread),
            label: t('member.unreadAlerts', { defaultMessage: 'Unread alerts' }),
            href: '/account/notifications',
            hint: unread === 1 ? t('member.needsALook', { defaultMessage: 'Needs a look' }) : t('member.inbox', { defaultMessage: 'Inbox' }),
          });
        }
        if (openPrayers != null) {
          nextStats.push({
            value: String(openPrayers),
            label: t('member.openPrayers', { defaultMessage: 'Open prayers' }),
            href: '/account/prayer-requests',
            hint: t('member.careTeam', { defaultMessage: 'Care team' }),
          });
        }
        if (givingCount != null) {
          nextStats.push({
            value: String(givingCount),
            label: t('member.recentGiving', { defaultMessage: 'Recent giving' }),
            href: '/account/giving',
            hint: t('member.intents', { defaultMessage: 'Intents' }),
          });
        }

        if (upcomingResult.status === 'fulfilled') {
          const upcoming = upcomingResult.value.data.slice(0, 5);
          setEvents(upcoming);
          nextStats.push({
            value: String(upcomingResult.value.data.length),
            label: t('member.upcomingEvents', { defaultMessage: 'Upcoming events' }),
            href: '/events',
            hint: t('member.thisSeason', { defaultMessage: 'This season' }),
          });
          setEventsNote(null);
        } else {
          setEvents([]);
          setEventsNote(formatUserApiError(upcomingResult.reason, t('member.unableToLoadEventsNow', { defaultMessage: 'Unable to load events right now.' })));
        }
        setStats(nextStats);

        const feed: HomeActivity[] = [];
        if (notificationsResult.status === 'fulfilled') {
          feed.push(
            ...notifications.slice(0, 4).map((item) => ({
              title: item.title ?? t('member.notification', { defaultMessage: 'Notification' }),
              meta: item.body ?? formatWhen(item.created_at),
              status: item.read_at ? t('member.read', { defaultMessage: 'Read' }) : t('member.unread', { defaultMessage: 'Unread' }),
              toneFrom: item.read_at ? 'Read' : 'Unread',
              href: '/account/notifications',
              icon: '●',
            })),
          );
        }
        if (prayersResult.status === 'fulfilled') {
          feed.push(
            ...prayers.slice(0, 3).map((item) => ({
              title: item.subject ?? t('member.prayerRequest', { defaultMessage: 'Prayer request' }),
              meta: item.body ?? '',
              status: item.status ?? t('member.statusOpen', { defaultMessage: 'open' }),
              toneFrom: item.status ?? 'open',
              href: '/account/prayer-requests',
              icon: '✦',
            })),
          );
        }
        setActivity(feed.slice(0, 6));

        const activityErrors: string[] = [];
        if (notificationsResult.status === 'rejected') {
          activityErrors.push(formatUserApiError(notificationsResult.reason, t('member.notificationsUnavailable', { defaultMessage: 'Notifications unavailable.' })));
        }
        if (prayersResult.status === 'rejected') {
          activityErrors.push(formatUserApiError(prayersResult.reason, t('member.prayersUnavailable', { defaultMessage: 'Prayers unavailable.' })));
        }
        setActivityNote(activityErrors.length ? activityErrors.join(' ') : null);

        if (sermonResult.status === 'fulfilled') {
          setSermons(sermonResult.value.data.slice(0, 3));
          setSermonsNote(null);
        } else {
          setSermons([]);
          setSermonsNote(formatUserApiError(sermonResult.reason, t('member.unableToLoadSermons', { defaultMessage: 'Unable to load sermons right now.' })));
        }
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(formatUserApiError(err, t('member.unableToLoadHome', { defaultMessage: 'Unable to load your member home.' })));
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
  }, [t]);

  if (loading) return <MemberHomeSkeleton />;
  if (error) {
    return (
      <div className="member-empty panel">
        <h3>{t('member.couldNotLoadHome', { defaultMessage: 'We could not load your home' })}</h3>
        <p>{error}</p>
        <Link className="site-button" href="/account">
          {t('member.tryAgain', { defaultMessage: 'Try again' })}
        </Link>
      </div>
    );
  }

  return (
    <MemberHomeView
      name={name || t('member.there', { defaultMessage: 'there' })}
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
  const { t } = useLocale();
  return (
    <div className="member-home-actions">
      {memberHomeActions(t)
        .slice(0, 4)
        .map((action) => (
          <Link className="member-home-action" href={action.href} key={action.href}>
            <span aria-hidden="true">{action.icon}</span>
            <b>{action.title}</b>
            <small>{action.body}</small>
          </Link>
        ))}
    </div>
  );
}
