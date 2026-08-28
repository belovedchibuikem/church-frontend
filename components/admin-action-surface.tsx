'use client';

import type { FormEvent } from 'react';
import { useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { AdminFormFields } from './admin-form-fields';
import { SearchSelect } from './search-select';
import { catalogOptions } from '../lib/form-catalogs';
import { adminFormSchemas, fieldsForEntity, normalizeDetailValues, type AdminFormField } from '../lib/admin-form-schemas';
import { formatAdminMutationError } from '../lib/admin-mutation-dispatcher';

export type ActionSurfaceMode = 'create' | 'edit' | 'assign' | 'confirm' | 'file' | 'preview' | 'help' | 'actions' | 'ai';

type Props = {
  mode: ActionSurfaceMode;
  label: string;
  pageTitle: string;
  permission: string;
  scope: string;
  entityKey?: string;
  record?: string;
  details?: Record<string, string>;
  items?: string[];
  records?: string[];
  onClose: () => void;
  onSubmit: (payload: Record<string, string>) => void | Promise<void>;
};

type Field = AdminFormField;

export function inferActionSurfaceMode(label: string): ActionSurfaceMode {
  const value = label.toLowerCase();
  if (/ask.*ai|ai assistant/.test(value)) return 'ai';
  if (/download|export|print|upload|receipt|pdf/.test(value)) return 'file';
  if (/assign|distribute/.test(value)) return 'assign';
  if (/create|add|new|register|request access|submit manuscript|submit testimony/.test(value)) return 'create';
  if (/edit|update/.test(value)) return 'edit';
  if (/approve|reject|defer|activate|suspend|close|delete|remove|save|submit|publish|send|notify|issue|escalate|reconcile|refund|confirm|process|decision|take action/.test(value)) return 'confirm';
  if (/view|open|details|review|report/.test(value)) return 'preview';
  return 'actions';
}

function entityName(label: string, pageTitle: string): string {
  const cleaned = label.replace(/[＋+]/g, '').replace(/^(create|add|new|edit|update|register|submit|assign|process|make|take)\s+/i, '').replace(/\s+(now|application)$/i, '').trim();
  return cleaned || pageTitle;
}

function optionMessageKey(option: string): string {
  return `admin.option.${option.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function fieldsFor(label: string, pageTitle: string): Field[] {
  const entity = `${label} ${pageTitle}`.toLowerCase();
  if (/member|student|mentor|lecturer|leader|worker|author|user|child|convert|soul|alumni/.test(entity)) return [
    { label: 'Full name', name: 'fullName', placeholder: 'Enter full name' },
    { label: 'Email address', name: 'email', type: 'email', placeholder: 'name@example.org' },
    { label: 'Phone number', name: 'phone', placeholder: '+234' },
    { label: 'Person record', name: 'person_id', type: 'search-select', catalog: 'person', placeholder: 'Search people' },
    { label: 'Assignment', name: 'assignment', type: 'select', options: ['Unassigned', 'Primary team', 'Support team'] },
  ];
  if (/home church/.test(entity)) return [
    { label: 'Name', name: 'name', placeholder: 'Enter home church name' },
    { label: 'Parent church', name: 'church_id', type: 'search-select', catalog: 'church', placeholder: 'Search church' },
    { label: 'Leader', name: 'leader_person_id', type: 'search-select', catalog: 'person', placeholder: 'Search leader' },
    { label: 'Administrative unit', name: 'administrative_unit_id', type: 'search-select', catalog: 'administrativeUnit', placeholder: 'Search unit' },
    { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location' },
    { label: 'Status', name: 'status', type: 'select', options: ['Active', 'Suspended', 'Closed'] },
  ];
  if (/church|cohort|group|department|team|ministry|crusade|orientation/.test(entity)) return [
    { label: 'Name', name: 'name', placeholder: `Enter ${entityName(label, pageTitle).toLowerCase()} name` },
    { label: 'Administrative unit', name: 'administrative_unit_id', type: 'search-select', catalog: 'administrativeUnit', placeholder: 'Search unit' },
    { label: 'Location', name: 'location_id', type: 'search-select', catalog: 'location', placeholder: 'Search location' },
    { label: 'Start date', name: 'startDate', type: 'date' },
    { label: 'Leader / owner', name: 'owner_id', type: 'search-select', catalog: 'person', placeholder: 'Search responsible person' },
    { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Add context and operating notes' },
  ];
  if (/module/.test(entity) && !/lesson/.test(entity)) return fieldsForEntity('kca_module');
  if (/lesson/.test(entity)) return fieldsForEntity('kca_lesson');
  if (/cohort/.test(entity)) return fieldsForEntity('kca_cohort');
  if (/publication|manuscript|assessment|prerequisite|testimony|announcement|template|activity/.test(entity)) return [
    { label: 'Title', name: 'title', placeholder: `Enter ${entityName(label, pageTitle).toLowerCase()} title` },
    { label: 'Category', name: 'category', type: 'select', options: ['General', 'Leadership', 'Discipleship', 'Ministry'] },
    { label: 'Owner / author', name: 'owner_id', type: 'search-select', catalog: 'person', placeholder: 'Search owner' },
    { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Describe the content and intended outcome' },
  ];
  if (/refund|payment|provider|channel|request|need|case|classification|restriction/.test(entity)) return [
    { label: 'Reference / name', name: 'reference', placeholder: 'Enter reference or name' },
    { label: 'Category', name: 'category', type: 'select', options: ['General', 'Operational', 'Financial', 'Restricted'] },
    { label: 'Amount (optional)', name: 'amount', type: 'number', placeholder: '0.00' },
    { label: 'Reason and notes', name: 'notes', type: 'textarea', placeholder: 'Provide the required context' },
  ];
  return [
    { label: 'Name', name: 'name', placeholder: `Enter ${entityName(label, pageTitle).toLowerCase()} name` },
    { label: 'Status', name: 'status', type: 'select', options: ['Draft', 'Active', 'Pending review'] },
    { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Add details' },
  ];
}

function FieldControl({ field, required, defaultValue }: { field: Field; required?: boolean; defaultValue?: string }) {
  const { t } = useLocale();
  const placeholder = field.placeholder
    ? t(`admin.placeholder.${field.name}`, { defaultMessage: field.placeholder })
    : undefined;
  if (field.type === 'textarea') return <textarea name={field.name} placeholder={placeholder} rows={4} required={required} defaultValue={defaultValue}/>;
  if (field.type === 'checkbox') return <label className="interaction-check"><input name={field.name} type="checkbox" value="true" defaultChecked={defaultValue === 'true' || defaultValue === 'Active'} />{placeholder ?? t('admin.enabled', { defaultMessage: 'Enabled' })}</label>;
  if (field.type === 'search-select' && field.catalog) {
    const fixtureOptions =
      field.catalog in catalogOptions
        ? catalogOptions[field.catalog as keyof typeof catalogOptions]
        : undefined;
    return (
      <SearchSelect
        name={field.name}
        catalog={field.catalog}
        options={fixtureOptions ?? []}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    );
  }
  if (field.type === 'select') return <select name={field.name} required={required} defaultValue={defaultValue ?? ''}><option value="" disabled>{t('admin.selectOption', { defaultMessage: 'Select an option' })}</option>{field.options?.map((option) => <option value={option} key={option}>{t(optionMessageKey(option), { defaultMessage: option })}</option>)}</select>;
  return <input name={field.name} type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'} placeholder={placeholder} required={required} defaultValue={defaultValue}/>;
}

export function AdminActionSurface({ mode, label, pageTitle, permission, scope, entityKey, record, details = {}, items = [], records = [], onClose, onSubmit }: Props) {
  const { t } = useLocale();
  const schema = entityKey ? adminFormSchemas[entityKey] : undefined;
  const entity = schema?.entity ?? entityName(label, pageTitle);
  const normalizedDetails = normalizeDetailValues(details);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(Array.from(new FormData(event.currentTarget).entries()).map(([key, value]) => [key, String(value)]));
    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit(values);
    } catch (error) {
      setFormError(formatAdminMutationError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const modeHeading = mode === 'edit'
    ? t('common.edit', { defaultMessage: 'Edit' })
    : mode === 'assign'
      ? t('admin.assignment', { defaultMessage: 'Assignment' })
      : t('admin.newRecord', { defaultMessage: 'New record' });
  const submitLabel = t('common.submit', { defaultMessage: 'Submit' });
  const closeLabel = t('common.close', { defaultMessage: 'Close' });
  const cancelLabel = t('common.cancel', { defaultMessage: 'Cancel' });
  const errorNote = formError ? <div className="interaction-safety-note" role="alert">{formError}</div> : null;
  const footerButtons = (labelText: string) => (
    <footer>
      <button type="button" data-interaction-native="true" onClick={onClose} disabled={submitting}>{cancelLabel}</button>
      <button className="primary-button" type="submit" data-interaction-native="true" disabled={submitting}>
        {submitting ? t('admin.submitting', { defaultMessage: 'Submitting…' }) : labelText}
      </button>
    </footer>
  );

  if (mode === 'help') return <div className="interaction-record-preview"><div className="interaction-confirm-summary"><span>?</span><div><strong>{t('admin.accountRecovery', { defaultMessage: 'Account recovery and support' })}</strong><p>{t('admin.accountRecoveryCopy', { defaultMessage: 'Use your organization’s approved support channel for authenticator recovery, password reset or backup-code access.' })}</p></div></div><div className="interaction-context-grid"><span><small>{t('admin.currentPage', { defaultMessage: 'Current page' })}</small><strong>{pageTitle}</strong></span><span><small>{t('admin.supportScope', { defaultMessage: 'Support scope' })}</small><strong>{scope}</strong></span><span><small>{t('admin.requestedOption', { defaultMessage: 'Requested option' })}</small><strong>{label}</strong></span></div><div className="interaction-safety-note">{t('admin.noRecoverySimulated', { defaultMessage: 'No recovery email, code or account change has been simulated in this frontend design.' })}</div><footer><button type="button" data-interaction-native="true" onClick={onClose}>{closeLabel}</button></footer></div>;

  if (mode === 'ai') return <form className="interaction-action-form" onSubmit={save}><div className="interaction-form-heading"><span>{t('admin.missionAiWorkspace', { defaultMessage: 'Mission AI workspace' })}</span><h3>{t('admin.askMissionAi', { defaultMessage: 'Ask Mission AI' })}</h3><p>{t('admin.askMissionAiCopy', { defaultMessage: 'Frame a ministry operations question using the approved reporting context.' })}</p></div><div className="interaction-ai-suggestions">{[{ key: 'admin.aiSuggestionFollowUp', defaultMessage: 'Show follow-up gaps' }, { key: 'admin.aiSuggestionCrusade', defaultMessage: 'Summarize crusade outcomes' }, { key: 'admin.aiSuggestionAssignments', defaultMessage: 'Identify overdue assignments' }].map((suggestion) => { const text = t(suggestion.key, { defaultMessage: suggestion.defaultMessage }); return <button type="button" data-interaction-native="true" key={suggestion.key} onClick={(event)=>{const form=event.currentTarget.closest('form');const input=form?.querySelector<HTMLTextAreaElement>('textarea');if(input)input.value=text;}}>{text}</button>; })}</div><label>{t('admin.yourQuestion', { defaultMessage: 'Your question' })}<textarea name="prompt" required rows={5} placeholder={t('admin.yourQuestionPlaceholder', { defaultMessage: 'Ask about mission performance, follow-up or planning...' })}/></label>{errorNote ?? <div className="interaction-safety-note">{t('admin.aiSafetyNote', { defaultMessage: 'This submits to the Laravel advisory API. No fabricated AI response is shown on failure.' })}</div>}{footerButtons(submitLabel)}</form>;

  if (mode === 'preview' || mode === 'actions') return <div className="interaction-record-preview">
    <div className="interaction-context-grid"><span><small>{t('admin.page', { defaultMessage: 'Page' })}</small><strong>{pageTitle}</strong></span><span><small>{t('admin.scope', { defaultMessage: 'Scope' })}</small><strong>{scope}</strong></span><span><small>{t('admin.permission', { defaultMessage: 'Permission' })}</small><strong>{permission}</strong></span>{record && <span><small>{t('admin.record', { defaultMessage: 'Record' })}</small><strong>{record}</strong></span>}</div>
    <h3>{mode === 'actions' ? t('admin.availableActions', { defaultMessage: 'Available actions' }) : t('admin.recordDetails', { defaultMessage: 'Record details' })}</h3>
    {schema && mode === 'preview' ? (
      <dl className="interaction-detail-list">{schema.fields.map((field) => {
        const value = normalizedDetails[field.name] ?? '—';
        return <div key={field.name}><dt>{t(`admin.field.${field.name}`, { defaultMessage: field.label })}</dt><dd>{value}</dd></div>;
      })}</dl>
    ) : (
      <div className="interaction-preview-list">{records.slice(0, 5).map((entry, index) => <article key={`${entry}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{entry}</p></article>)}{records.length === 0 && items.slice(0, 6).map((item) => <article key={item}><span>•</span><p>{item}</p></article>)}</div>
    )}
    {errorNote}
    <footer>{mode === 'actions' && <button type="button" data-interaction-native="true" disabled={submitting} onClick={() => { void (async () => { setFormError(''); try { await onSubmit({ pinnedPage: pageTitle }); } catch (error) { setFormError(formatAdminMutationError(error)); } })(); }}>{t('admin.pinPageShortcut', { defaultMessage: 'Pin page shortcut' })}</button>}<button type="button" data-interaction-native="true" onClick={onClose}>{closeLabel}</button></footer>
  </div>;

  if (mode === 'file' && /download|print|receipt|pdf/i.test(label)) return <form className="interaction-action-form" onSubmit={save}><div className="interaction-file-summary"><span className="interaction-file-icon">▧</span><div><strong>{label}</strong><p>{t('admin.documentPreviewFor', { defaultMessage: 'Document preview for {title}', vars: { title: pageTitle } })}</p></div></div><div className="interaction-document-preview"><span>{t('admin.productNameUpper', { defaultMessage: 'FAMILY HOUSE CONNECT' })}</span><h3>{pageTitle}</h3><p>{t('admin.authorizedDocumentPreview', { defaultMessage: 'Authorized document preview' })}</p><dl><div><dt>{t('admin.scope', { defaultMessage: 'Scope' })}</dt><dd>{scope}</dd></div><div><dt>{t('admin.permission', { defaultMessage: 'Permission' })}</dt><dd>{permission}</dd></div><div><dt>{t('admin.format', { defaultMessage: 'Format' })}</dt><dd>{t('admin.pdfDocument', { defaultMessage: 'PDF document' })}</dd></div></dl></div><label>{t('admin.deliveryNote', { defaultMessage: 'Delivery note' })}<textarea name="note" rows={3} placeholder={t('admin.deliveryNotePlaceholder', { defaultMessage: 'Optional note for this document request' })}/></label>{errorNote ?? <div className="interaction-safety-note">{t('admin.documentSafetyNote', { defaultMessage: 'A downloadable file requires an authorized Laravel file operation. No fake document is generated.' })}</div>}{footerButtons(submitLabel)}</form>;

  if (mode === 'file') return <form className="interaction-action-form" onSubmit={save}>
    <div className="interaction-file-summary"><span className="interaction-file-icon">▧</span><div><strong>{label}</strong><p>{t('admin.prepareExport', { defaultMessage: 'Prepare an authorized export for {title}.', vars: { title: pageTitle } })}</p></div></div>
    <div className="interaction-form-grid"><label>{t('admin.format', { defaultMessage: 'Format' })}<select name="format" defaultValue="PDF"><option>PDF</option><option>CSV</option><option>XLSX</option></select></label><label>{t('admin.dateRange', { defaultMessage: 'Date range' })}<select name="dateRange" defaultValue="current"><option value="current">{t('admin.currentView', { defaultMessage: 'Current view' })}</option><option value="month">{t('admin.thisMonth', { defaultMessage: 'This month' })}</option><option value="year">{t('admin.thisYear', { defaultMessage: 'This year' })}</option></select></label><label className="wide">{t('admin.exportNotes', { defaultMessage: 'Export notes' })}<textarea name="notes" rows={3} placeholder={t('admin.exportNotesPlaceholder', { defaultMessage: 'Optional note for the export request' })}/></label></div>
    {errorNote ?? <div className="interaction-safety-note">{t('admin.exportSafetyNote', { defaultMessage: 'File generation needs an authorized Laravel document operation. This does not fabricate a file.' })}</div>}
    {footerButtons(submitLabel)}
  </form>;

  if (mode === 'confirm') return <form className="interaction-action-form" onSubmit={save}>
    <div className="interaction-confirm-summary"><span>!</span><div><strong>{t('admin.reviewAction', { defaultMessage: 'Review {action}', vars: { action: label.toLowerCase() } })}</strong><p>{t('admin.actionProtected', { defaultMessage: 'This action is protected by {permission} in {scope} scope.', vars: { permission, scope } })}</p></div></div>
    <div className="interaction-context-grid">{Object.entries(details).slice(0, 4).map(([key, value]) => <span key={key}><small>{key}</small><strong>{value}</strong></span>)}</div>
    <label>{t('admin.decisionNotes', { defaultMessage: 'Decision notes' })}<textarea name="notes" rows={4} placeholder={t('admin.decisionNotesPlaceholder', { defaultMessage: 'Record the reason and supporting context' })}/></label>
    <label className="interaction-check"><input name="reviewed" type="checkbox" value="yes" required/> {t('admin.reviewedScope', { defaultMessage: 'I reviewed the displayed scope and action details.' })}</label>
    {errorNote ?? <div className="interaction-safety-note">{t('admin.confirmSafetyNote', { defaultMessage: 'Confirm submits the matching Laravel admin operation. Failures are shown here; success is never simulated.' })}</div>}
    {footerButtons(t('admin.confirm', { defaultMessage: 'Confirm' }))}
  </form>;

  const fields = mode === 'assign' ? [
    { label: 'Assign to', name: 'assignee_id', type: 'search-select' as const, catalog: 'person' as const, placeholder: 'Search people' },
    { label: 'Due date', name: 'dueDate', type: 'date' as const },
    { label: 'Instructions', name: 'instructions', type: 'textarea' as const, placeholder: 'Add clear handoff instructions' },
  ] : schema?.fields ?? fieldsFor(label, pageTitle);

  if (schema) {
    return <form className="interaction-action-form" onSubmit={save}>
      <div className="interaction-form-heading"><span>{modeHeading}</span><h3>{record ? `${entity}: ${record}` : entity}</h3><p>{t('admin.fieldsMatchColumns', { defaultMessage: 'Fields match the database columns for this record type.' })}</p></div>
      <AdminFormFields fields={fields} values={mode === 'edit' || mode === 'create' ? normalizedDetails : {}} className="interaction-form-grid" />
      <div className="interaction-context-strip"><span>{t('admin.scopeLabel', { defaultMessage: 'Scope:' })} <b>{scope}</b></span><span>{t('admin.permissionLabel', { defaultMessage: 'Permission:' })} <b>{permission}</b></span></div>
      {errorNote}
      {footerButtons(submitLabel)}
    </form>;
  }

  return <form className="interaction-action-form" onSubmit={save}>
    <div className="interaction-form-heading"><span>{modeHeading}</span><h3>{entity}</h3><p>{t('admin.completeFieldsBelow', { defaultMessage: 'Complete the fields below. Required values are marked.' })}</p></div>
    <div className="interaction-form-grid">{fields.map((field, index) => <label className={field.type === 'textarea' ? 'wide' : ''} key={field.name}>{t(`admin.field.${field.name}`, { defaultMessage: field.label })}{index < 2 && <b aria-hidden="true"> *</b>}<FieldControl field={field} required={index < 2} defaultValue={mode === 'edit' ? Object.values(normalizedDetails)[index] : undefined}/></label>)}</div>
    <div className="interaction-context-strip"><span>{t('admin.scopeLabel', { defaultMessage: 'Scope:' })} <b>{scope}</b></span><span>{t('admin.permissionLabel', { defaultMessage: 'Permission:' })} <b>{permission}</b></span></div>
    {errorNote}
    {footerButtons(submitLabel)}
  </form>;
}
