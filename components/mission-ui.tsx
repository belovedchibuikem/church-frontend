'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { AdminScreen, Metric, Row } from '../lib/admin-routes';
import { resolveEntityKey } from '../lib/admin-form-schemas';
import {
  assignSoulMentor,
  captureSoul,
  completeSoulFollowUp,
  defaultOpsScope,
  listCrusades,
  listSouls,
  loadOpsDataset,
  operationsErrorMessage,
  opsRecordsToRows,
  recordSoulFollowUp,
  resolveOpsDataset,
  shouldUseOperationsLiveData,
  type CrusadeRecord,
  type SoulRecord,
} from '../lib/admin-operations-api';
import { formatRowActionRecord, rowActionCapabilities } from '../lib/admin-row-actions';
import { stashAdminRecords } from '../lib/admin-record-cache';
import { shouldUseDesignFixtures } from '../lib/admin-identity-api';
import { AdminWizardFooter, AdminWizardStepper } from './admin-wizard-chrome';
import { useAdminWizardStep } from '../lib/use-admin-wizard-step';
import { TableRowActions } from './table-row-actions';
import { useLocale } from '@/components/locale-provider';
import {
  breakdownToItems,
  dashboardModuleForScreen,
} from '../lib/admin-dashboard-api';
import { useAdminDashboard } from '../lib/use-admin-dashboard';

function isPublicId(value: string | undefined | null): boolean {
  return Boolean(value && /^[0-9A-HJKMNP-TV-Z]{26}$/i.test(value.trim()));
}

function formText(form: FormData, name: string): string {
  return String(form.get(name) ?? '').trim();
}

function toIsoDate(value: string): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function nowDateTimeLocal(): string {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const missionPalette = ['#4318ff', '#6f52ed', '#0ea36c', '#f59e0b', '#ef4444'];

function MissionStatus({ value }: { value: string }) {
  const { t } = useLocale();
  const state = value.toLowerCase().replaceAll(' ', '-').replaceAll('(', '').replaceAll(')', '');
  return (
    <span className={`mission-status mission-status-${state}`}>
      {t(`mission.status.${state}`, { defaultMessage: value })}
    </span>
  );
}

function MissionMetrics({ metrics = [] }: { metrics?: Metric[] }) {
  return <div className="mission-metrics">{metrics.map((metric, index) => <article className="mission-metric-card" key={metric.label}>
    <div className={`mission-metric-icon mission-metric-icon-${index % 4}`} aria-hidden="true">{['✦', '◇', '↗', '◎'][index % 4]}</div>
    <div><span>{metric.label}</span><strong>{metric.value}</strong></div>
    {metric.trend && <em>{metric.trend}</em>}
  </article>)}</div>;
}

function MissionTabs({
  tabs = [],
  active = 0,
  onChange,
}: {
  tabs?: string[];
  active?: number;
  onChange?: (index: number) => void;
}) {
  const { t } = useLocale();
  const [current, setCurrent] = useState(active);

  useEffect(() => {
    setCurrent(active);
  }, [active]);

  return (
    <nav className="mission-tabs" aria-label={t('common.screenSections', { defaultMessage: 'Screen sections' })} role="tablist">
      {tabs.map((tab, index) => (
        <button
          className={index === current ? 'active' : ''}
          type="button"
          role="tab"
          aria-selected={index === current}
          tabIndex={index === current ? 0 : -1}
          key={tab}
          onClick={() => {
            setCurrent(index);
            onChange?.(index);
          }}
        >
          {tab}
        </button>
      ))}
    </nav>
  );
}

function MissionToolbar({ action, tabs }: { action?: string; tabs?: string[] }) {
  const { t } = useLocale();
  const filters = tabs ?? [
    t('common.allStatuses', { defaultMessage: 'All Statuses' }),
    t('common.allLocations', { defaultMessage: 'All Locations' }),
  ];
  return (
    <div className="mission-toolbar">
      <div className="mission-filter-set">
        {filters.slice(0, 3).map((item) => (
          <button type="button" aria-label={t('common.filterBy', { defaultMessage: 'Filter by {item}', vars: { item } })} key={item}>
            {item}<span aria-hidden="true">⌄</span>
          </button>
        ))}
      </div>
      <label className="mission-search">
        <span aria-hidden="true">⌕</span>
        <input aria-label={t('common.searchRecords', { defaultMessage: 'Search records' })} placeholder={t('common.searchPlaceholder', { defaultMessage: 'Search...' })} />
      </label>
      {action && <button className="mission-primary-button" type="button">{action}</button>}
    </div>
  );
}

function CaptureSoulForm({
  screen,
  crusades,
  defaultCrusadeId,
  onCaptured,
}: {
  screen: AdminScreen;
  crusades: CrusadeRecord[];
  defaultCrusadeId?: string;
  onCaptured: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const crusadeId = formText(form, 'crusade_id');
    const personId = formText(form, 'person_id');
    const givenName = formText(form, 'given_name');
    const familyName = formText(form, 'family_name');
    const middleName = formText(form, 'middle_name');
    const preferredName = formText(form, 'preferred_name');
    if (!isPublicId(crusadeId)) {
      setMessage(t('errors.selectLiveCrusade', { defaultMessage: 'Select a live crusade public id.' }));
      return;
    }
    if (!personId && (!givenName || !familyName)) {
      setMessage(t('errors.personIdOrName', { defaultMessage: 'Provide a person public id, or given name and family name.' }));
      return;
    }
    if (personId && !isPublicId(personId)) {
      setMessage(t('errors.personIdMustBePublic', { defaultMessage: 'person_id must be a public id (ULID).' }));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const soul = await captureSoul(
        crusadeId,
        {
          person_id: personId || null,
          given_name: givenName || null,
          family_name: familyName || null,
          middle_name: middleName || null,
          preferred_name: preferredName || null,
        },
        { scope: defaultOpsScope(screen.scope) },
      );
      setMessage(t('mission.capturedSoul', { defaultMessage: 'Captured soul {id}.', vars: { id: soul.id } }));
      formEl.reset();
      await onCaptured();
    } catch (err) {
      setMessage(operationsErrorMessage(err, t('errors.soulCaptureFailed', { defaultMessage: 'Soul capture failed.' })));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mission-form-card" onSubmit={(event) => void onSubmit(event)} style={{ marginBottom: 16 }}>
      <header>
        <h2>{t('mission.captureSoul', { defaultMessage: 'Capture soul' })}</h2>
        <p>{t('mission.captureHelp', { defaultMessage: 'POST uses the crusade public id and Idempotency-Key. Names are used only when no person id is sent.' })}</p>
      </header>
      <div className="mission-form-grid">
        <label>
          <span>{t('mission.crusadeRequired', { defaultMessage: 'Crusade *' })}</span>
          <select name="crusade_id" defaultValue={defaultCrusadeId && isPublicId(defaultCrusadeId) ? defaultCrusadeId : ''}>
            <option value="">{t('mission.selectCrusade', { defaultMessage: 'Select crusade' })}</option>
            {crusades.map((crusade) => (
              <option key={crusade.id} value={crusade.id}>{crusade.name} · {crusade.id}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('mission.personId', { defaultMessage: 'Person id' })}</span>
          <input name="person_id" autoComplete="off" placeholder={t('mission.optionalPersonPublicId', { defaultMessage: 'Optional person public id' })} />
        </label>
        <label>
          <span>{t('account.givenName', { defaultMessage: 'Given name' })}</span>
          <input name="given_name" autoComplete="off" placeholder={t('mission.requiredWithoutPersonId', { defaultMessage: 'Required without person id' })} />
        </label>
        <label>
          <span>{t('account.familyName', { defaultMessage: 'Family name' })}</span>
          <input name="family_name" autoComplete="off" placeholder={t('mission.requiredWithoutPersonId', { defaultMessage: 'Required without person id' })} />
        </label>
        <label>
          <span>{t('account.middleName', { defaultMessage: 'Middle name' })}</span>
          <input name="middle_name" autoComplete="off" />
        </label>
        <label>
          <span>{t('account.preferredName', { defaultMessage: 'Preferred name' })}</span>
          <input name="preferred_name" autoComplete="off" />
        </label>
      </div>
      {crusades.length === 0 ? <p className="field-help" role="status">{t('errors.noLiveCrusades', { defaultMessage: 'No live crusades in this scope. Capture needs a crusade id.' })}</p> : null}
      {message ? <p className="field-help" role="status">{message}</p> : null}
      <footer>
        <button className="mission-primary-button" type="submit" disabled={busy || crusades.length === 0}>
          {busy ? t('mission.capturing', { defaultMessage: 'Capturing…' }) : t('mission.captureSoul', { defaultMessage: 'Capture soul' })}
        </button>
      </footer>
    </form>
  );
}

function RecordFollowUpForm({
  screen,
  souls,
  onRecorded,
}: {
  screen: AdminScreen;
  souls: SoulRecord[];
  onRecorded: () => Promise<void>;
}) {
  const { t } = useLocale();
  const [soulId, setSoulId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selected = souls.find((soul) => soul.id === soulId);
  const mentorId = selected?.mentor_assignment_id && isPublicId(selected.mentor_assignment_id)
    ? selected.mentor_assignment_id
    : '';

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const selectedSoulId = formText(form, 'soul_id');
    const selectedMentorId = formText(form, 'mentor_assignment_id');
    const channel = formText(form, 'channel_code');
    const outcome = formText(form, 'outcome_code');
    const occurredAt = toIsoDate(formText(form, 'occurred_at'));
    if (!isPublicId(selectedSoulId)) {
      setMessage(t('errors.selectLiveSoul', { defaultMessage: 'Select a live soul public id from the table.' }));
      return;
    }
    if (!isPublicId(selectedMentorId)) {
      setMessage(t('errors.noMentorAssignmentId', { defaultMessage: 'Selected soul has no mentor assignment id.' }));
      return;
    }
    if (!channel || !outcome || !occurredAt) {
      setMessage(t('errors.channelOutcomeOccurredRequired', { defaultMessage: 'Channel, outcome, and occurred_at are required.' }));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const interaction = await recordSoulFollowUp(
        selectedSoulId,
        {
          mentor_assignment_id: selectedMentorId,
          channel_code: channel,
          outcome_code: outcome,
          occurred_at: occurredAt,
        },
        { scope: defaultOpsScope(screen.scope) },
      );
      setMessage(t('mission.recordedFollowUp', { defaultMessage: 'Recorded follow-up {id}.', vars: { id: interaction.id } }));
      formEl.reset();
      setSoulId('');
      await onRecorded();
    } catch (err) {
      setMessage(operationsErrorMessage(err, t('errors.followUpRecordingFailed', { defaultMessage: 'Follow-up recording failed.' })));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mission-form-card" onSubmit={(event) => void onSubmit(event)} style={{ marginBottom: 16 }}>
      <header>
        <h2>{t('mission.recordFollowUp', { defaultMessage: 'Record soul follow-up' })}</h2>
        <p>{t('mission.recordFollowUpHelp', { defaultMessage: 'Uses the selected soul id and its mentor assignment id. Idempotency-Key is sent by the client.' })}</p>
      </header>
      <div className="mission-form-grid">
        <label>
          <span>{t('mission.soulRequired', { defaultMessage: 'Soul *' })}</span>
          <select name="soul_id" value={soulId} onChange={(event) => setSoulId(event.target.value)}>
            <option value="">{t('mission.selectSoul', { defaultMessage: 'Select soul' })}</option>
            {souls.map((soul) => (
              <option key={soul.id} value={soul.id}>
                {soul.person_id ?? soul.id} · {soul.id}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('mission.mentorAssignment', { defaultMessage: 'Mentor assignment' })}</span>
          <input name="mentor_assignment_id" readOnly value={mentorId} placeholder={t('mission.assignedAfterMentor', { defaultMessage: 'Assigned after mentor assignment' })} />
        </label>
        <label>
          <span>{t('mission.channelRequired', { defaultMessage: 'Channel *' })}</span>
          <select name="channel_code" defaultValue="phone">
            {['phone', 'visit', 'whatsapp', 'sms', 'email'].map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('mission.outcomeRequired', { defaultMessage: 'Outcome *' })}</span>
          <select name="outcome_code" defaultValue="connected">
            {['connected', 'contacted', 'no_answer', 'requested_follow_up', 'not_interested'].map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>
        <label>
          <span>{t('mission.occurredAtRequired', { defaultMessage: 'Occurred at *' })}</span>
          <input name="occurred_at" type="datetime-local" defaultValue={nowDateTimeLocal()} />
        </label>
      </div>
      {souls.length === 0 ? <p className="field-help" role="status">{t('errors.noLiveSouls', { defaultMessage: 'No live souls in this scope.' })}</p> : null}
      {selected && !mentorId ? <p className="field-help" role="status">{t('errors.soulHasNoMentor', { defaultMessage: 'This soul has no mentor assignment yet.' })}</p> : null}
      {message ? <p className="field-help" role="status">{message}</p> : null}
      <footer>
        <button className="mission-primary-button" type="submit" disabled={busy || souls.length === 0}>
          {busy ? t('mission.recording', { defaultMessage: 'Recording…' }) : t('mission.recordFollowUpAction', { defaultMessage: 'Record follow-up' })}
        </button>
      </footer>
    </form>
  );
}

function MissionTable({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const fixtures = shouldUseDesignFixtures();
  const fixtureRows = screen.rows ?? [];
  const columns = screen.columns ?? Object.keys(fixtureRows[0] ?? {});
  const entityKey = resolveEntityKey(screen.route, screen.id);
  const dataset = resolveOpsDataset(screen);
  const live = shouldUseOperationsLiveData() && dataset !== null;
  const [rows, setRows] = useState<Array<Record<string, string>>>(
    live ? [] : fixtures ? (fixtureRows as Array<Record<string, string>>) : [],
  );
  const [message, setMessage] = useState(
    live
      ? t('common.loading', { defaultMessage: 'Loading…' })
      : fixtures
        ? t('common.showingRange', {
            defaultMessage: 'Showing 1 to {to} of {total} records',
            vars: { to: fixtureRows.length, total: Math.max(fixtureRows.length, 24) },
          })
        : t('errors.noLiveListApiWired', { defaultMessage: 'No live list API is wired for this screen. Design fixtures are disabled.' }),
  );
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [souls, setSouls] = useState<SoulRecord[]>([]);
  const [crusades, setCrusades] = useState<CrusadeRecord[]>([]);

  const refresh = useCallback(async () => {
    if (!live || !dataset) return;
    setError(null);
    try {
      const result = await loadOpsDataset(dataset, { scope: defaultOpsScope(screen.scope), perPage: 25 });
      stashAdminRecords(result.items as Array<Record<string, unknown>>);
      setRows(opsRecordsToRows(dataset, result.items, columns));
      if (dataset === 'souls') setSouls(result.items as SoulRecord[]);
      if (dataset === 'crusades') setCrusades(result.items as CrusadeRecord[]);
      setMessage(
        result.pagination.total === 0
          ? t('errors.noMissionRecords', { defaultMessage: 'No mission records in this scope.' })
          : t('common.showingOf', {
              defaultMessage: 'Showing {shown} of {total} records',
              vars: { shown: result.items.length, total: result.pagination.total },
            }),
      );
    } catch (err) {
      setRows([]);
      if (dataset === 'souls') setSouls([]);
      if (dataset === 'crusades') setCrusades([]);
      setError(operationsErrorMessage(err, t('errors.unableToLoadMission', { defaultMessage: 'Unable to load mission operations.' })));
      setMessage(t('errors.liveMissionUnavailable', { defaultMessage: 'Live mission data unavailable' }));
    }
  }, [columns, dataset, live, screen.scope, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!live || dataset !== 'souls') return;
    let cancelled = false;
    void listCrusades({ scope: defaultOpsScope(screen.scope), perPage: 25 })
      .then((result) => {
        if (!cancelled) setCrusades(result.items);
      })
      .catch(() => {
        if (!cancelled) setCrusades([]);
      });
    return () => {
      cancelled = true;
    };
  }, [dataset, live, screen.scope]);

  async function onAssignMentor(row: Record<string, string>) {
    const soulId = row.__id;
    if (!soulId || soulId === '—') return;
    const teamAssignmentId = window.prompt(t('mission.teamAssignmentPrompt', { defaultMessage: 'Mission team assignment id (ULID):' }));
    if (!teamAssignmentId) return;
    setBusyId(soulId);
    setError(null);
    try {
      await assignSoulMentor(
        soulId,
        { mission_team_assignment_id: teamAssignmentId.trim() },
        { scope: defaultOpsScope(screen.scope) },
      );
      await refresh();
    } catch (err) {
      setError(operationsErrorMessage(err, t('errors.mentorAssignmentFailed', { defaultMessage: 'Mentor assignment failed.' })));
    } finally {
      setBusyId(null);
    }
  }

  async function onCompleteFollowUp(row: Record<string, string>) {
    const soulId = row.__id;
    if (!soulId || soulId === '—') return;
    const reason = window.prompt(t('mission.completionReasonPrompt', { defaultMessage: 'Completion reason code (e.g. discipleship_connected):' }), 'discipleship_connected');
    if (!reason) return;
    setBusyId(soulId);
    setError(null);
    try {
      await completeSoulFollowUp(soulId, reason.trim(), defaultOpsScope(screen.scope));
      await refresh();
    } catch (err) {
      setError(operationsErrorMessage(err, t('errors.followUpCompletionFailed', { defaultMessage: 'Follow-up completion failed.' })));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      {live && (dataset === 'souls' || dataset === 'crusades') ? (
        <CaptureSoulForm screen={screen} crusades={crusades} onCaptured={refresh} />
      ) : null}
      {live && dataset === 'souls' ? (
        <RecordFollowUpForm screen={screen} souls={souls} onRecorded={refresh} />
      ) : null}
      <section className="mission-table-card">
      <MissionToolbar action={screen.action} tabs={screen.tabs} />
      {error ? <p className="field-help" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
      <div className="mission-table-scroll">
        <table className="mission-table" aria-label={t('common.recordsAria', { defaultMessage: '{title} records', vars: { title: screen.title } })}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th scope="col" key={column}>{column}</th>
              ))}
              <th scope="col">{t('common.actions', { defaultMessage: 'Actions' })}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1}>
                  {error
                    ? t('errors.unableToLoadRecords', { defaultMessage: 'Unable to load records.' })
                    : t('common.noRecords', { defaultMessage: 'No records.' })}
                </td>
              </tr>
            ) : (
              rows.map((row, rowIndex) => (
                <tr key={`${screen.id}-${row.__id ?? rowIndex}`}>
                  {columns.map((column, columnIndex) => (
                    <td key={column}>
                      {columnIndex === 0 ? (
                        <span className="mission-primary-cell">
                          <i aria-hidden="true">{String(row[column] ?? '?').slice(0, 1)}</i>
                          <b>{row[column]}</b>
                        </span>
                      ) : column.toLowerCase().includes('status') ? (
                        <MissionStatus value={row[column] ?? 'Active'} />
                      ) : (
                        row[column]
                      )}
                    </td>
                  ))}
                  <td>
                    <div className="row-actions mission-row-actions">
                      <TableRowActions
                        record={formatRowActionRecord(row[columns[0]], row.__id)}
                        entityKey={entityKey}
                        className="row-actions mission-row-actions"
                        {...rowActionCapabilities(screen.route)}
                      />
                      {live && dataset === 'souls' ? (
                        <>
                          <button
                            type="button"
                            className="table-action"
                            data-interaction-native="true"
                            disabled={busyId === row.__id}
                            onClick={() => void onAssignMentor(row)}
                          >
                            {t('mission.assignMentor', { defaultMessage: 'Assign mentor' })}
                          </button>
                          <button
                            type="button"
                            className="table-action"
                            data-interaction-native="true"
                            disabled={busyId === row.__id}
                            onClick={() => void onCompleteFollowUp(row)}
                          >
                            {t('mission.completeFollowUp', { defaultMessage: 'Complete follow-up' })}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <footer className="mission-table-footer">
        <span>{message}</span>
        <div role="navigation" aria-label={t('common.paginationAria', { defaultMessage: '{title} pagination', vars: { title: screen.title } })}>
          <button type="button" aria-label={t('common.previousPage', { defaultMessage: 'Previous page' })}>‹</button>
          <button className="active" type="button" aria-label={t('common.pageN', { defaultMessage: 'Page {n}', vars: { n: 1 } })} aria-current="page">1</button>
          <button type="button" aria-label={t('common.pageN', { defaultMessage: 'Page {n}', vars: { n: 2 } })}>2</button>
          <button type="button" aria-label={t('common.pageN', { defaultMessage: 'Page {n}', vars: { n: 3 } })}>3</button>
          <button type="button" aria-label={t('common.nextPage', { defaultMessage: 'Next page' })}>›</button>
        </div>
      </footer>
    </section>
    </>
  );
}

function MissionLineChart({ title }: { title?: string }) {
  const { t } = useLocale();
  const chartTitle = title ?? t('mission.soulsOverTime', { defaultMessage: 'Souls Over Time' });
  return (
    <article className="mission-chart-card">
      <header>
        <h3>{chartTitle}</h3>
        <span>{t('common.thisMonth', { defaultMessage: 'This Month⌄' })}</span>
      </header>
      <svg className="mission-line-chart" viewBox="0 0 520 210" role="img" aria-label={t('common.chartAria', { defaultMessage: '{title} chart', vars: { title: chartTitle } })}>
        <defs><linearGradient id="mission-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#5530e8" stopOpacity=".22"/><stop offset="1" stopColor="#5530e8" stopOpacity="0"/></linearGradient></defs>
        {[30, 75, 120, 165].map(y => <line x1="28" x2="500" y1={y} y2={y} key={y}/>) }
        <path className="mission-chart-area" d="M28 177 L98 134 L168 142 L238 103 L308 118 L378 90 L448 76 L500 40 L500 190 L28 190 Z" fill="url(#mission-area)"/>
        <polyline points="28,177 98,134 168,142 238,103 308,118 378,90 448,76 500,40"/>
        {[['28','177'],['98','134'],['168','142'],['238','103'],['308','118'],['378','90'],['448','76'],['500','40']].map(([x,y]) => <circle cx={x} cy={y} r="5" key={`${x}-${y}`}/>) }
      </svg>
      <div className="mission-chart-labels">
        <span>{t('mission.chartMay1', { defaultMessage: 'May 1' })}</span>
        <span>{t('mission.chartMay5', { defaultMessage: 'May 5' })}</span>
        <span>{t('mission.chartMay10', { defaultMessage: 'May 10' })}</span>
        <span>{t('mission.chartMay15', { defaultMessage: 'May 15' })}</span>
        <span>{t('mission.chartMay20', { defaultMessage: 'May 20' })}</span>
      </div>
    </article>
  );
}

function MissionDonut({ title, items, center = '12,458' }: { title: string; items: string[]; center?: string }) {
  const { t } = useLocale();
  const totalLabel = t('common.total', { defaultMessage: 'Total' });
  return (
    <article className="mission-donut-card">
      <h3>{title}</h3>
      <div className="mission-donut-layout">
        <div
          className="mission-donut"
          role="img"
          aria-label={t('common.donutAria', {
            defaultMessage: '{title} donut chart. Total {center}. {items}',
            vars: { title, center, items: items.join(', ') },
          })}
        >
          <div><strong>{center}</strong><span>{totalLabel}</span></div>
        </div>
        <ul>{items.map((item, index) => <li key={item}><i style={{ backgroundColor: missionPalette[index % missionPalette.length] }}/><span>{item.split(' — ')[0]}</span><b>{item.split(' — ')[1] ?? `${Math.max(8, 48 - index * 9)}%`}</b></li>)}</ul>
      </div>
    </article>
  );
}

function MissionDashboard({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const { t } = useLocale();
  const dashboard = useAdminDashboard(dashboardModuleForScreen(screen.id), requestedScope);
  const metrics = dashboard.live ? dashboard.metrics : screen.metrics;
  const statusItems = dashboard.live
    ? breakdownToItems(dashboard.data?.breakdown)
    : [
      t('mission.wonPct', { defaultMessage: 'Won — 44%' }),
      t('mission.followingUpPct', { defaultMessage: 'Following Up — 31%' }),
      t('mission.discipledPct', { defaultMessage: 'Discipled — 19%' }),
      t('mission.otherPct', { defaultMessage: 'Other — 6%' }),
    ];
  const rows = dashboard.live ? (dashboard.data?.recent_rows ?? []) : (screen.rows ?? []);
  const donut = dashboard.data?.donut;

  return (
    <div className="mission-dashboard">
      {dashboard.loading ? <p className="maps-settings-lead" role="status">Loading live dashboard data…</p> : null}
      {dashboard.error ? <p className="maps-settings-lead" role="alert" style={{ color: '#dc2626' }}>{dashboard.error}</p> : null}
      <MissionMetrics metrics={metrics}/>
      <div className="mission-dashboard-charts">
        <MissionLineChart/>
        <MissionDonut
          title={t('mission.soulsByStatus', { defaultMessage: 'Souls by Status' })}
          center={donut?.value ?? '12,458'}
          items={statusItems}
        />
      </div>
      <div className="mission-dashboard-bottom">
        <article className="mission-list-card">
          <header>
            <h3 aria-level={2}>{t('mission.topCrusades', { defaultMessage: 'Top Crusades' })}</h3>
            <button type="button">{t('mission.viewAllCrusades', { defaultMessage: 'View all crusades' })}</button>
          </header>
          {rows.map((row, index) => (
            <div className="mission-ranked-row" key={row['Crusade Name'] ?? index}>
              <span>{index + 1}</span><b>{row['Crusade Name']}</b><strong>{row.Souls}</strong>
            </div>
          ))}
        </article>
        <article className="mission-action-card">
          <header><h3 aria-level={2}>{t('common.quickActions', { defaultMessage: 'Quick Actions' })}</h3></header>
          <div>{(screen.items ?? []).map((item, index) => <button type="button" key={item}><i aria-hidden="true">{['＋', '♙', '✉', '▤'][index]}</i><span>{item}</span></button>)}</div>
        </article>
      </div>
    </div>
  );
}

function MissionDetailHero({ screen, badge }: { screen: AdminScreen; badge?: string }) {
  const [tab, setTab] = useState(0);
  return (
    <>
      <section className="mission-detail-hero">
        <div className="mission-detail-mark">{screen.title.slice(0, 1)}</div>
        <div>
          <div className="mission-title-line">
            <h2>{screen.title}</h2>
            <MissionStatus value={badge ?? 'Active'} />
          </div>
          <p>{screen.subtitle}</p>
        </div>
      </section>
      {screen.tabs ? <MissionTabs tabs={screen.tabs} active={tab} onChange={setTab} /> : null}
    </>
  );
}

function MissionDefinitionList({ details = {} }: { details?: Row }) {
  return <dl className="mission-definition-list">{Object.entries(details).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

function CrusadeDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return (
    <div className="mission-crusade-detail">
      <MissionDetailHero screen={screen} badge="Completed"/>
      <MissionMetrics metrics={screen.metrics}/>
      <div className="mission-detail-grid">
        <article className="mission-panel">
          <h3>{t('mission.crusadeDetails', { defaultMessage: 'Crusade Details' })}</h3>
          <MissionDefinitionList details={screen.details}/>
        </article>
        <MissionLineChart title={t('mission.soulTrend', { defaultMessage: 'Soul Trend' })}/>
      </div>
      <div className="mission-link-grid">{(screen.items ?? []).map((item, index) => <button type="button" key={item}><i aria-hidden="true">{['♙', '↻', '▤', '₦'][index]}</i><span>{item}</span><b aria-hidden="true">→</b></button>)}</div>
    </div>
  );
}

function MissionWizard({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const details = Object.entries(screen.details ?? {});
  const steps = screen.tabs ?? [];
  const wizard = useAdminWizardStep(steps);
  const visibleDetails = wizard.currentStep === 0
    ? details
    : wizard.currentStep === 1
      ? details.slice(0, Math.ceil(details.length / 2))
      : wizard.currentStep === 2
        ? details.slice(Math.ceil(details.length / 2))
        : details;

  return (
    <div className="mission-wizard" data-admin-wizard="true">
      <AdminWizardStepper steps={steps} currentStep={wizard.currentStep} className="mission-stepper" itemClassName="" activeClassName="active" />
      <section className="mission-form-card">
        <header><h2>{wizard.currentLabel}</h2><p>{screen.subtitle}</p></header>
        {wizard.currentStep < steps.length - 1 ? (
          <div className="mission-form-grid">
            {visibleDetails.map(([label, value], index) => (
              <label className={index === visibleDetails.length - 1 || label === 'Description' ? 'mission-field-wide' : ''} key={label}>
                <span>{label}{index < 8 && <em aria-hidden="true">*</em>}</span>
                {label === 'Description' ? <textarea required={index < 8} defaultValue={value} /> : /Date/.test(label) ? <input required={index < 8} type="text" defaultValue={value} /> : /Location|Type|Focus/.test(label) ? <select required={index < 8} defaultValue={value}><option>{value}</option></select> : <input required={index < 8} defaultValue={value} />}
              </label>
            ))}
          </div>
        ) : (
          <dl className="wizard-review-summary">
            {details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
        )}
        <AdminWizardFooter wizard={wizard} nextLabel={screen.action} finishLabel={t('mission.createCrusade', { defaultMessage: 'Create crusade' })} primaryClassName="mission-primary-button" secondaryClassName="mission-secondary-button" />
      </section>
    </div>
  );
}

function InvitationReview({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const entries = Object.entries(screen.details ?? {});
  return (
    <div className="mission-invitation-review">
      <div className="mission-review-progress" role="list" aria-label={t('mission.invitationReviewProgress', { defaultMessage: 'Invitation review progress' })}>
        <span role="listitem" className="done" aria-label={t('mission.invitationDetailsComplete', { defaultMessage: 'Invitation details complete' })}>✓</span>
        <i aria-hidden="true"/>
        <span role="listitem" className="done" aria-label={t('mission.inviteeMessageComplete', { defaultMessage: 'Invitee message complete' })}>✓</span>
        <i aria-hidden="true"/>
        <span role="listitem" className="active" aria-current="step" aria-label={t('mission.step3Review', { defaultMessage: 'Step 3, Review' })}>3</span>
        <b>{t('common.review', { defaultMessage: 'Review' })}</b>
      </div>
      <div className="mission-review-columns">
        <article className="mission-panel">
          <h3>{t('mission.invitationDetails', { defaultMessage: 'Invitation Details' })}</h3>
          <MissionDefinitionList details={Object.fromEntries(entries.slice(0, 8))}/>
          <h4>{t('common.documents', { defaultMessage: 'Documents' })}</h4>
          <div className="mission-document-list">{(screen.items ?? []).map(item => <button type="button" key={item}>▧ <span>{item}</span><b>{t('common.view', { defaultMessage: 'View' })}</b></button>)}</div>
        </article>
        <article className="mission-panel">
          <h3>{t('mission.inviteeMessage', { defaultMessage: 'Invitee Message' })}</h3>
          <blockquote>{screen.details?.Message}</blockquote>
          <label className="mission-response-field">
            <span>{t('mission.responseNote', { defaultMessage: 'Response note' })}</span>
            <textarea placeholder={t('mission.optionalNotePlaceholder', { defaultMessage: 'Add an optional note...' })}/>
          </label>
        </article>
      </div>
      <footer className="mission-review-actions">
        <button className="mission-danger-outline" type="button">{t('mission.decline', { defaultMessage: 'Decline' })}</button>
        <button className="mission-secondary-button" type="button">{t('mission.requestMoreInfo', { defaultMessage: 'Request More Info' })}</button>
        <button className="mission-success-button" type="button">{screen.action}</button>
      </footer>
    </div>
  );
}

function PlanningView({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const details = Object.entries(screen.details ?? {});
  const [tab, setTab] = useState(0);
  return (
    <div className="mission-planning">
      <MissionTabs tabs={screen.tabs} active={tab} onChange={setTab} />
      <div className="mission-planning-grid">
        <article className="mission-panel mission-planning-summary">
          <span className="mission-progress-ring" role="progressbar" aria-label={t('mission.planningCompletion', { defaultMessage: 'Planning completion' })} aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}>100%</span>
          <h3>{t('mission.stepsComplete', { defaultMessage: '7 / 7 Steps Complete' })}</h3>
          <p>{t('mission.planningReady', { defaultMessage: 'Planning is complete and ready for execution.' })}</p>
          {(screen.items ?? []).map(item => <div key={item}><i aria-hidden="true">✓</i><span>{item.split(' — ')[0]}</span><MissionStatus value={item.split(' — ')[1]}/></div>)}
        </article>
        <article className="mission-panel mission-planning-details">
          <h3>{(screen.tabs?.[tab] ?? t('mission.generalPlan', { defaultMessage: 'General Plan' }))}</h3>
          {details.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </article>
      </div>
    </div>
  );
}

function TeamDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return (
    <div className="mission-team-detail">
      <MissionDetailHero screen={screen}/>
      <MissionMetrics metrics={screen.metrics}/>
      <div className="mission-team-grid">
        <article className="mission-panel">
          <h3>{t('mission.teamDescription', { defaultMessage: 'Team Description' })}</h3>
          <p>{screen.details?.Description}</p>
          <div className="mission-team-leader">
            <span>BD</span>
            <div>
              <small>{t('mission.teamLeader', { defaultMessage: 'Team Leader' })}</small>
              <strong>{screen.details?.Leader}</strong>
            </div>
            <MissionStatus value="Leader"/>
          </div>
        </article>
        <article className="mission-panel">
          <header>
            <h3>{t('mission.teamMembers', { defaultMessage: 'Team Members' })}</h3>
            <button type="button">{t('mission.viewAllMembers', { defaultMessage: 'View all members' })}</button>
          </header>
          <div className="mission-member-list">{(screen.items ?? []).map(item => <div key={item}><span>{item.slice(0, 1)}</span><b>{item.split(' — ')[0]}</b><small>{item.split(' — ')[1]}</small></div>)}</div>
        </article>
      </div>
    </div>
  );
}

function SoulDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const entries = Object.entries(screen.details ?? {});
  return (
    <div className="mission-soul-detail">
      <MissionDetailHero screen={screen} badge="New"/>
      <div className="mission-soul-layout">
        <article className="mission-panel mission-person-card">
          <div className="mission-person-avatar">CO</div>
          <h3>{screen.title}</h3>
          <p>{t('mission.wonAtLagos', { defaultMessage: 'Won at Lagos Mega Crusade' })}</p>
          <MissionStatus value="New Soul"/>
          <div className="mission-person-actions">{(screen.items ?? []).map(item => <button type="button" key={item}>{item}</button>)}</div>
        </article>
        <article className="mission-panel">
          <h3>{t('common.information', { defaultMessage: 'Information' })}</h3>
          <dl className="mission-profile-details">{entries.map(([label, value]) => <div className={label === 'Spiritual Information' ? 'wide' : ''} key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <footer>
            <button className="mission-danger-outline" type="button">{t('mission.declare', { defaultMessage: 'Declare' })}</button>
            <button className="mission-secondary-button" type="button">{t('mission.discipleshipStatus', { defaultMessage: 'Discipleship Status' })}</button>
            <button className="mission-primary-button" type="button">{t('common.register', { defaultMessage: 'Register' })}</button>
          </footer>
        </article>
      </div>
    </div>
  );
}

function MissionBars({ items }: { items: string[] }) {
  return <div className="mission-bars">{items.map((item, index) => { const [label, value = `${85 - index * 9}%`] = item.split(' — '); const numericValue = Number(value.replace(/[^0-9.]/g, '')); return <div key={item}><span>{label}</span><i role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Number.isFinite(numericValue) ? numericValue : 0}><b style={{ width: value }}/></i><strong>{value}</strong></div>; })}</div>;
}

function DistributionView({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return (
    <div className="mission-distribution">
      <MissionMetrics metrics={screen.metrics}/>
      <div className="mission-analytics-grid">
        <MissionDonut title={t('mission.distributionByTeam', { defaultMessage: 'Distribution by Team' })} center="245" items={screen.items ?? []}/>
        <article className="mission-panel">
          <header>
            <h3>{t('mission.recentDistributions', { defaultMessage: 'Recent Distributions' })}</h3>
            <button type="button">{t('common.viewAll', { defaultMessage: 'View all' })}</button>
          </header>
          <div className="mission-compact-table">
            {(screen.rows ?? []).map(row => (
              <div key={row.Crusade}>
                <b>{row.Crusade}</b>
                <span>{row.Mentor}</span>
                <strong>{t('mission.soulsCount', { defaultMessage: '{count} souls', vars: { count: row.Souls } })}</strong>
                <small>{row.Date}</small>
              </div>
            ))}
          </div>
        </article>
      </div>
      <button className="mission-primary-button mission-full-action" type="button">{screen.action}</button>
    </div>
  );
}

function FollowUpView({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const live = shouldUseOperationsLiveData();
  const [souls, setSouls] = useState<SoulRecord[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!live) return;
    try {
      const result = await listSouls({ scope: defaultOpsScope(screen.scope), perPage: 25 });
      setSouls(result.items);
      setError(null);
    } catch (err) {
      setSouls([]);
      setError(operationsErrorMessage(err, t('errors.unableToLoadSoulsForFollowUp', { defaultMessage: 'Unable to load souls for follow-up.' })));
    }
  }, [live, screen.scope, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (live) {
    return (
      <div className="mission-follow-up">
        {error ? <p className="field-help" role="alert" style={{ color: '#dc2626' }}>{error}</p> : null}
        <RecordFollowUpForm screen={screen} souls={souls} onRecorded={refresh} />
      </div>
    );
  }

  return (
    <div className="mission-follow-up">
      <MissionMetrics metrics={screen.metrics}/>
      <div className="mission-analytics-grid">
        <MissionDonut title={t('mission.followUpByStatus', { defaultMessage: 'Follow-Up by Status' })} center="1,842" items={screen.items ?? []}/>
        <article className="mission-panel mission-overdue">
          <header>
            <h3>{t('mission.overdueFollowUps', { defaultMessage: 'Overdue Follow-Ups' })}</h3>
            <button type="button">{t('common.viewAll', { defaultMessage: 'View all' })}</button>
          </header>
          {(screen.rows ?? []).map(row => (
            <div key={row.Name}>
              <span className="mission-mini-avatar">{row.Name?.slice(0, 1)}</span>
              <b>{row.Name}</b>
              <small>{row.Mentor}</small>
              <MissionStatus value={row.Status ?? 'Overdue'}/>
            </div>
          ))}
        </article>
      </div>
      <button className="mission-primary-button mission-full-action" type="button">{screen.action}</button>
    </div>
  );
}

function GapDashboard({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const items = screen.items ?? [];
  const midpoint = Math.ceil(items.length / 2);
  return (
    <div className="mission-gap-dashboard">
      <MissionMetrics metrics={screen.metrics}/>
      <div className="mission-gap-grid">
        <article className="mission-panel">
          <h3>{screen.id === 'I-19' ? t('mission.gapByCrusade', { defaultMessage: 'Gap by Crusade' }) : t('mission.followUpCoverageByCrusade', { defaultMessage: 'Follow-Up Coverage by Crusade' })}</h3>
          <MissionBars items={items.slice(0, midpoint)}/>
        </article>
        <MissionDonut title={t('mission.gapByDays', { defaultMessage: 'Gap by Days' })} center="768" items={items.slice(midpoint)}/>
      </div>
      {screen.action && <button className="mission-primary-button mission-full-action" type="button">{screen.action}</button>}
    </div>
  );
}

function PartnerDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const details = Object.entries(screen.details ?? {});
  return (
    <div className="mission-partner-detail">
      <MissionDetailHero screen={screen}/>
      <div className="mission-partner-grid">
        <article className="mission-panel mission-partner-profile">
          <div className="mission-partner-logo">BSN</div>
          <h3>{screen.title}</h3>
          <p>{t('mission.bibleAvailable', { defaultMessage: 'Making the Bible available and affordable.' })}</p>
          <button className="mission-secondary-button" type="button">{t('mission.visitWebsite', { defaultMessage: 'Visit website ↗' })}</button>
          <div><MissionStatus value="Strategic Partner"/></div>
        </article>
        <article className="mission-panel">
          <h3>{t('mission.partnerInformation', { defaultMessage: 'Partner Information' })}</h3>
          <MissionDefinitionList details={Object.fromEntries(details.slice(0, 6))}/>
        </article>
        <article className="mission-panel mission-partnership">
          <h3>{t('mission.aboutPartner', { defaultMessage: 'About Partner' })}</h3>
          <p>{screen.details?.['About Partner']}</p>
          <h3>{t('mission.currentPartnership', { defaultMessage: 'Current Partnership' })}</h3>
          <ul>{String(screen.details?.['Current Partnership'] ?? '').split(';').map(item => <li key={item}>✓ {item.trim()}</li>)}</ul>
        </article>
      </div>
    </div>
  );
}

function ReportsView({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const items = screen.items ?? [];
  const reportDates = [
    t('mission.reportDateMay15', { defaultMessage: 'May 15, 2024' }),
    t('mission.reportDateMay13', { defaultMessage: 'May 13, 2024' }),
    t('mission.reportDateMay10', { defaultMessage: 'May 10, 2024' }),
    t('mission.reportDateMay2', { defaultMessage: 'May 2, 2024' }),
  ];
  return (
    <div className="mission-reports">
      <div className="mission-report-grid">
        <article className="mission-panel">
          <h3>{t('mission.popularReports', { defaultMessage: 'Popular Reports' })}</h3>
          {items.slice(0, 7).map(item => <button type="button" key={item}><span>▧</span><b>{item}</b><i>→</i></button>)}
        </article>
        <article className="mission-panel">
          <h3>{t('mission.recentReports', { defaultMessage: 'Recent Reports' })}</h3>
          {items.slice(7).map((item, index) => (
            <div className="mission-report-item" key={item}>
              <span>▤</span>
              <div><b>{item}</b><small>{reportDates[index]}</small></div>
              <button type="button">{t('common.download', { defaultMessage: 'Download' })}</button>
            </div>
          ))}
        </article>
      </div>
      <button className="mission-primary-button mission-full-action" type="button">{screen.action}</button>
    </div>
  );
}

function MissionAssistant({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  const suggestions = (screen.items ?? []).slice(0, 4);
  const insight = (screen.items ?? [])[4]?.replace('AI Insight — ', '');
  return (
    <div className="mission-ai">
      <section className="mission-ai-hero">
        <div className="mission-ai-orb">✦</div>
        <h2>{t('mission.assistantHeadline', { defaultMessage: 'How can I help your mission today?' })}</h2>
        <p>{t('mission.assistantCopy', { defaultMessage: 'Ask for performance insights, projections, follow-up opportunities, or partner recommendations.' })}</p>
        <div className="mission-ai-chips">{suggestions.map(item => <button type="button" key={item}>{item}</button>)}</div>
      </section>
      <article className="mission-ai-insight">
        <header>
          <span aria-hidden="true">✦</span>
          <div>
            <small>{t('mission.aiInsight', { defaultMessage: 'AI Insight' })}</small>
            <strong>{t('mission.followUpOpportunity', { defaultMessage: 'Follow-up opportunity detected' })}</strong>
          </div>
          <MissionStatus value="Live"/>
        </header>
        <p>{insight}</p>
        <div className="mission-ai-numbers">
          <span><b>312</b> {t('mission.soulsOverdue', { defaultMessage: 'souls overdue' })}</span>
          <span><b>6</b> {t('mission.mentorsAvailable', { defaultMessage: 'mentors available' })}</span>
          <span><b>+18%</b> {t('mission.potentialLift', { defaultMessage: 'potential lift' })}</span>
        </div>
        <button className="mission-secondary-button" type="button">{t('common.viewDetails', { defaultMessage: 'View Details' })}</button>
      </article>
      <form className="mission-ai-composer" aria-label={t('mission.aiPromptAria', { defaultMessage: '{mission} AI prompt', vars: { mission: t('nav.mission') } })}>
        <input aria-label={t('mission.askMissionAi', { defaultMessage: 'Ask {mission} AI', vars: { mission: t('nav.mission') } })} placeholder={t('mission.askAnythingPlaceholder', { defaultMessage: 'Ask anything about missions...' })}/>
        <button type="submit" aria-label={t('common.sendMessage', { defaultMessage: 'Send message' })}>↑</button>
      </form>
    </div>
  );
}

function GenericDetail({ screen }: { screen: AdminScreen }) {
  const { t } = useLocale();
  return (
    <div className="mission-generic-detail">
      <MissionDetailHero screen={screen}/>
      {screen.metrics && <MissionMetrics metrics={screen.metrics}/>}
      <div className="mission-detail-grid">
        <article className="mission-panel">
          <h3>{t('common.overview', { defaultMessage: 'Overview' })}</h3>
          <MissionDefinitionList details={screen.details}/>
        </article>
        {screen.items && (
          <article className="mission-panel">
            <h3>{t('common.relatedInformation', { defaultMessage: 'Related Information' })}</h3>
            <div className="mission-member-list">
              {screen.items.map(item => (
                <div key={item}>
                  <span>◇</span>
                  <b>{item}</b>
                  <small>{t('common.viewDetails', { defaultMessage: 'View details' })}</small>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}

export function MissionScreenContent({ screen, requestedScope }: { screen: AdminScreen; requestedScope?: string }) {
  const stubIds = new Set(['I-07', 'I-09', 'I-12', 'I-15', 'I-17', 'I-19', 'I-20']);
  if (!shouldUseDesignFixtures() && stubIds.has(screen.id)) {
    return (
      <article className="mission-panel">
        <h2>{screen.title}</h2>
        <p className="maps-settings-lead" role="status">
          No live list or settings API for this mission screen. Use Crusades, Souls, Invitations, and Follow-up for operational work.
        </p>
      </article>
    );
  }
  switch (screen.id) {
    case 'I-01': return <MissionDashboard screen={screen} requestedScope={requestedScope} />;
    case 'I-03': return <CrusadeDetail screen={screen}/>;
    case 'I-04': return <MissionWizard screen={screen}/>;
    case 'I-06': return <InvitationReview screen={screen}/>;
    case 'I-07': return <PlanningView screen={screen}/>;
    case 'I-09': return <TeamDetail screen={screen}/>;
    case 'I-11': return <SoulDetail screen={screen}/>;
    case 'I-12': return <DistributionView screen={screen}/>;
    case 'I-14': return <FollowUpView screen={screen}/>;
    case 'I-15':
    case 'I-19': return <GapDashboard screen={screen}/>;
    case 'I-17': return <PartnerDetail screen={screen}/>;
    case 'I-20': return <ReportsView screen={screen}/>;
    case 'I-21': return <MissionAssistant screen={screen}/>;
    case 'I-02':
    case 'I-05':
    case 'I-08':
    case 'I-10':
    case 'I-13':
    case 'I-16':
    case 'I-18': return <><MissionMetrics metrics={screen.metrics}/><MissionTable screen={screen}/></>;
    default: return <GenericDetail screen={screen}/>;
  }
}
