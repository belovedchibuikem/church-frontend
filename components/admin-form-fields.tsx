'use client';

import { useLocale } from '@/components/locale-provider';
import { SearchSelect } from './search-select';
import { catalogOptions } from '../lib/form-catalogs';
import type { AdminFormField } from '../lib/admin-form-schemas';
import { defaultValueForField } from '../lib/admin-form-schemas';
import { catalogForIdField, placeholderForIdField } from '../lib/id-field-catalog';

function optionMessageKey(option: string): string {
  return `admin.option.${option.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function FieldControl({
  field,
  defaultValue,
  values = {},
}: {
  field: AdminFormField;
  defaultValue?: string;
  values?: Record<string, string>;
}) {
  const { t } = useLocale();
  const required = field.required ?? false;
  const placeholder = field.placeholder
    ? t(`admin.placeholder.${field.name}`, { defaultMessage: field.placeholder })
    : undefined;
  if (field.type === 'textarea') {
    return <textarea name={field.name} placeholder={placeholder} rows={4} required={required} defaultValue={defaultValue} />;
  }
  if (field.type === 'checkbox') {
    return (
      <label className="interaction-check">
        <input name={field.name} type="checkbox" value="true" defaultChecked={defaultValue === 'true' || defaultValue === 'Active'} />
        {placeholder ?? t('admin.enabled', { defaultMessage: 'Enabled' })}
      </label>
    );
  }
  const searchCatalog = field.catalog ?? catalogForIdField(field.name);
  if (searchCatalog) {
    const catalog = field.catalog ?? searchCatalog;
    const fixtureOptions =
      catalog && catalog in catalogOptions
        ? catalogOptions[catalog as keyof typeof catalogOptions]
        : undefined;
    const defaultLabel =
      values[`${field.name}_label`] ||
      values[`${field.name}_name`] ||
      undefined;
    return (
      <SearchSelect
        name={field.name}
        catalog={catalog}
        options={fixtureOptions ?? []}
        defaultValue={defaultValue}
        defaultLabel={defaultLabel}
        placeholder={placeholder ?? placeholderForIdField(field.name)}
        required={required}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select name={field.name} required={required} defaultValue={defaultValue ?? ''}>
        <option value="" disabled>{t('admin.selectOption', { defaultMessage: 'Select an option' })}</option>
        {field.options?.map((option) => (
          <option value={option} key={option}>{t(optionMessageKey(option), { defaultMessage: option })}</option>
        ))}
      </select>
    );
  }
  return (
    <input
      name={field.name}
      type={field.type ?? 'text'}
      placeholder={placeholder}
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
  const { t } = useLocale();
  return (
    <div className={className}>
      {fields.map((field) => (
        <label className={field.wide || field.type === 'textarea' ? 'wide' : ''} key={field.name}>
          <span>
            {t(`admin.field.${field.name}`, { defaultMessage: field.label })}
            {field.required && <b aria-hidden="true"> *</b>}
          </span>
          <FieldControl field={field} defaultValue={defaultValueForField(field, values)} values={values} />
          {field.helpText && <small className="field-help">{t(`admin.help.${field.name}`, { defaultMessage: field.helpText })}</small>}
        </label>
      ))}
    </div>
  );
}
