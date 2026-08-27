'use client';

import { SearchSelect } from './search-select';
import { catalogOptions } from '../lib/form-catalogs';
import type { AdminFormField } from '../lib/admin-form-schemas';
import { defaultValueForField } from '../lib/admin-form-schemas';

function FieldControl({ field, defaultValue }: { field: AdminFormField; defaultValue?: string }) {
  const required = field.required ?? false;
  if (field.type === 'textarea') {
    return <textarea name={field.name} placeholder={field.placeholder} rows={4} required={required} defaultValue={defaultValue} />;
  }
  if (field.type === 'checkbox') {
    return (
      <label className="interaction-check">
        <input name={field.name} type="checkbox" value="true" defaultChecked={defaultValue === 'true' || defaultValue === 'Active'} />
        {field.placeholder ?? 'Enabled'}
      </label>
    );
  }
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
        placeholder={field.placeholder}
        required={required}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select name={field.name} required={required} defaultValue={defaultValue ?? ''}>
        <option value="" disabled>Select an option</option>
        {field.options?.map((option) => (
          <option value={option} key={option}>{option}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      name={field.name}
      type={field.type ?? 'text'}
      placeholder={field.placeholder}
      required={required}
      defaultValue={defaultValue}
    />
  );
}

type Props = {
  fields: AdminFormField[];
  values?: Record<string, string>;
  className?: string;
};

export function AdminFormFields({ fields, values = {}, className = 'kca-form-grid' }: Props) {
  return (
    <div className={className}>
      {fields.map((field) => (
        <label className={field.wide || field.type === 'textarea' ? 'wide' : ''} key={field.name}>
          <span>
            {field.label}
            {field.required && <b aria-hidden="true"> *</b>}
          </span>
          <FieldControl field={field} defaultValue={defaultValueForField(field, values)} />
          {field.helpText && <small className="field-help">{field.helpText}</small>}
        </label>
      ))}
    </div>
  );
}
