'use client';

import type { FormEvent } from 'react';

export type ActionSurfaceMode = 'create' | 'edit' | 'assign' | 'confirm' | 'file' | 'preview' | 'help' | 'actions' | 'ai';

type Props = {
  mode: ActionSurfaceMode;
  label: string;
  pageTitle: string;
  permission: string;
  scope: string;
  details?: Record<string, string>;
  items?: string[];
  records?: string[];
  onClose: () => void;
  onDraft: (payload: Record<string, string>) => void;
};

type Field = { label: string; name: string; type?: 'text' | 'email' | 'date' | 'number' | 'select' | 'textarea'; options?: string[]; placeholder?: string };

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

function fieldsFor(label: string, pageTitle: string): Field[] {
  const entity = `${label} ${pageTitle}`.toLowerCase();
  if (/member|student|mentor|lecturer|leader|worker|author|user|child|convert|soul|alumni/.test(entity)) return [
    { label: 'Full name', name: 'fullName', placeholder: 'Enter full name' },
    { label: 'Email address', name: 'email', type: 'email', placeholder: 'name@example.org' },
    { label: 'Phone number', name: 'phone', placeholder: '+234' },
    { label: 'Assignment', name: 'assignment', type: 'select', options: ['Unassigned', 'Primary team', 'Support team'] },
  ];
  if (/church|cohort|group|department|team|ministry|crusade|orientation/.test(entity)) return [
    { label: 'Name', name: 'name', placeholder: `Enter ${entityName(label, pageTitle).toLowerCase()} name` },
    { label: 'Location', name: 'location', placeholder: 'Select or enter location' },
    { label: 'Start date', name: 'startDate', type: 'date' },
    { label: 'Leader / owner', name: 'owner', placeholder: 'Select responsible person' },
    { label: 'Description', name: 'description', type: 'textarea', placeholder: 'Add context and operating notes' },
  ];
  if (/publication|manuscript|module|lesson|assessment|prerequisite|testimony|announcement|template|activity/.test(entity)) return [
    { label: 'Title', name: 'title', placeholder: `Enter ${entityName(label, pageTitle).toLowerCase()} title` },
    { label: 'Category', name: 'category', type: 'select', options: ['General', 'Leadership', 'Discipleship', 'Ministry'] },
    { label: 'Owner / author', name: 'owner', placeholder: 'Select owner' },
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
  if (field.type === 'textarea') return <textarea name={field.name} placeholder={field.placeholder} rows={4} required={required} defaultValue={defaultValue}/>;
  if (field.type === 'select') return <select name={field.name} required={required} defaultValue={defaultValue ?? ''}><option value="" disabled>Select an option</option>{field.options?.map((option) => <option value={option} key={option}>{option}</option>)}</select>;
  return <input name={field.name} type={field.type ?? 'text'} placeholder={field.placeholder} required={required} defaultValue={defaultValue}/>;
}

export function AdminActionSurface({ mode, label, pageTitle, permission, scope, details = {}, items = [], records = [], onClose, onDraft }: Props) {
  const entity = entityName(label, pageTitle);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = Object.fromEntries(Array.from(new FormData(event.currentTarget).entries()).map(([key, value]) => [key, String(value)]));
    onDraft(values);
  };

  if (mode === 'help') return <div className="interaction-record-preview"><div className="interaction-confirm-summary"><span>?</span><div><strong>Account recovery and support</strong><p>Use your organization’s approved support channel for authenticator recovery, password reset or backup-code access.</p></div></div><div className="interaction-context-grid"><span><small>Current page</small><strong>{pageTitle}</strong></span><span><small>Support scope</small><strong>{scope}</strong></span><span><small>Requested option</small><strong>{label}</strong></span></div><div className="interaction-safety-note">No recovery email, code or account change has been simulated in this frontend design.</div><footer><button type="button" data-interaction-native="true" onClick={onClose}>Close</button></footer></div>;

  if (mode === 'ai') return <form className="interaction-action-form" onSubmit={save}><div className="interaction-form-heading"><span>Mission AI workspace</span><h3>Ask Mission AI</h3><p>Frame a ministry operations question using the approved reporting context.</p></div><div className="interaction-ai-suggestions">{['Show follow-up gaps','Summarize crusade outcomes','Identify overdue assignments'].map((suggestion)=><button type="button" data-interaction-native="true" key={suggestion} onClick={(event)=>{const form=event.currentTarget.closest('form');const input=form?.querySelector<HTMLTextAreaElement>('textarea');if(input)input.value=suggestion;}}>{suggestion}</button>)}</div><label>Your question<textarea name="prompt" required rows={5} placeholder="Ask about mission performance, follow-up or planning..."/></label><div className="interaction-safety-note">Saving preserves the prompt locally. No AI response is fabricated until the authorized AI service is connected.</div><footer><button type="button" data-interaction-native="true" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" data-interaction-native="true">Save prompt</button></footer></form>;

  if (mode === 'preview' || mode === 'actions') return <div className="interaction-record-preview">
    <div className="interaction-context-grid"><span><small>Page</small><strong>{pageTitle}</strong></span><span><small>Scope</small><strong>{scope}</strong></span><span><small>Permission</small><strong>{permission}</strong></span></div>
    <h3>{mode === 'actions' ? 'Available actions' : 'Record details'}</h3>
    <div className="interaction-preview-list">{records.slice(0, 5).map((record, index) => <article key={`${record}-${index}`}><span>{String(index + 1).padStart(2, '0')}</span><p>{record}</p></article>)}{records.length === 0 && items.slice(0, 6).map((item) => <article key={item}><span>•</span><p>{item}</p></article>)}</div>
    <footer>{mode === 'actions' && <button type="button" data-interaction-native="true" onClick={() => onDraft({ pinnedPage: pageTitle })}>Pin page shortcut</button>}<button type="button" data-interaction-native="true" onClick={onClose}>Close</button></footer>
  </div>;

  if (mode === 'file' && /download|print|receipt|pdf/i.test(label)) return <form className="interaction-action-form" onSubmit={save}><div className="interaction-file-summary"><span className="interaction-file-icon">▧</span><div><strong>{label}</strong><p>Document preview for {pageTitle}</p></div></div><div className="interaction-document-preview"><span>FAMILY HOUSE CONNECT</span><h3>{pageTitle}</h3><p>Authorized document preview</p><dl><div><dt>Scope</dt><dd>{scope}</dd></div><div><dt>Permission</dt><dd>{permission}</dd></div><div><dt>Format</dt><dd>PDF document</dd></div></dl></div><label>Delivery note<textarea name="note" rows={3} placeholder="Optional note for this document request"/></label><div className="interaction-safety-note">The preview is designed, but a downloadable file requires the authorized document service. No fake document is generated.</div><footer><button type="button" data-interaction-native="true" onClick={onClose}>Close</button><button className="primary-button" type="submit" data-interaction-native="true">Save document request</button></footer></form>;

  if (mode === 'file') return <form className="interaction-action-form" onSubmit={save}>
    <div className="interaction-file-summary"><span className="interaction-file-icon">▧</span><div><strong>{label}</strong><p>Prepare an authorized export for {pageTitle}.</p></div></div>
    <div className="interaction-form-grid"><label>Format<select name="format" defaultValue="PDF"><option>PDF</option><option>CSV</option><option>XLSX</option></select></label><label>Date range<select name="dateRange" defaultValue="current"><option value="current">Current view</option><option value="month">This month</option><option value="year">This year</option></select></label><label className="wide">Export notes<textarea name="notes" rows={3} placeholder="Optional note for the export request"/></label></div>
    <div className="interaction-safety-note">File generation needs the authorized document service. Saving below preserves this export setup locally and does not fabricate a file.</div>
    <footer><button type="button" data-interaction-native="true" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" data-interaction-native="true">Save export setup</button></footer>
  </form>;

  if (mode === 'confirm') return <form className="interaction-action-form" onSubmit={save}>
    <div className="interaction-confirm-summary"><span>!</span><div><strong>Review {label.toLowerCase()}</strong><p>This action is protected by <b>{permission}</b> in <b>{scope}</b> scope.</p></div></div>
    <div className="interaction-context-grid">{Object.entries(details).slice(0, 4).map(([key, value]) => <span key={key}><small>{key}</small><strong>{value}</strong></span>)}</div>
    <label>Decision notes<textarea name="notes" rows={4} placeholder="Record the reason and supporting context"/></label>
    <label className="interaction-check"><input name="reviewed" type="checkbox" value="yes" required/> I reviewed the displayed scope and action details.</label>
    <div className="interaction-safety-note">The frontend can preserve review notes, but authoritative execution remains unavailable until the server action is connected.</div>
    <footer><button type="button" data-interaction-native="true" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" data-interaction-native="true">Save review notes</button></footer>
  </form>;

  const fields = mode === 'assign' ? [
    { label: 'Assign to', name: 'assignee', type: 'select' as const, options: ['Pastor Daniel', 'Sister Mary', 'Brother John', 'Intercessory Team'] },
    { label: 'Due date', name: 'dueDate', type: 'date' as const },
    { label: 'Instructions', name: 'instructions', type: 'textarea' as const, placeholder: 'Add clear handoff instructions' },
  ] : fieldsFor(label, pageTitle);

  return <form className="interaction-action-form" onSubmit={save}>
    <div className="interaction-form-heading"><span>{mode === 'edit' ? 'Edit' : mode === 'assign' ? 'Assignment' : 'New record'}</span><h3>{entity}</h3><p>Complete the fields below. Required values are marked.</p></div>
    <div className="interaction-form-grid">{fields.map((field, index) => <label className={field.type === 'textarea' ? 'wide' : ''} key={field.name}>{field.label}{index < 2 && <b aria-hidden="true"> *</b>}<FieldControl field={field} required={index < 2} defaultValue={mode === 'edit' ? Object.values(details)[index] : undefined}/></label>)}</div>
    <div className="interaction-context-strip"><span>Scope: <b>{scope}</b></span><span>Permission: <b>{permission}</b></span></div>
    <footer><button type="button" data-interaction-native="true" onClick={onClose}>Cancel</button><button className="primary-button" type="submit" data-interaction-native="true">Save local draft</button></footer>
  </form>;
}
