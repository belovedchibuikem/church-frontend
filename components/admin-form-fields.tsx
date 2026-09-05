'use client';

import { useLocale } from '@/components/locale-provider';
import { SignaturePad } from '@/components/signature-pad';
import { SearchSelect } from './search-select';
import { catalogOptions } from '../lib/form-catalogs';
import type { AdminFormField } from '../lib/admin-form-schemas';
import { defaultValueForField, isAdminFieldVisible } from '../lib/admin-form-schemas';
import { catalogForIdField, placeholderForIdField } from '../lib/id-field-catalog';
import { useState } from 'react';

function optionMessageKey(option: string): string {
  return `admin.option.${option.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}`;
}

function FieldControl({
  field,
  defaultValue,
  values = {},
  onValueChange,
}: {
  field: AdminFormField;
  defaultValue?: string;
  values?: Record<string, string>;
  onValueChange?: (name: string, value: string) => void;
}) {
  const { t } = useLocale();
  const required = field.required ?? false;
  const placeholder = field.placeholder
    ? t(`admin.placeholder.${field.name}`, { defaultMessage: field.placeholder })
    : undefined;
  const emit = (value: string) => onValueChange?.(field.name, value);
  if (field.type === 'textarea') {
    return (
      <textarea
        name={field.name}
        placeholder={placeholder}
        rows={4}
        required={required}
        defaultValue={defaultValue}
        onChange={(event) => emit(event.target.value)}
      />
    );
  }
  if (field.type === 'checkbox') {
    return (
      <label className="interaction-check">
        <input
          name={field.name}
          type="checkbox"
          value="true"
          defaultChecked={defaultValue === 'true' || defaultValue === 'Active'}
          onChange={(event) => emit(event.target.checked ? 'true' : '')}
        />
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
        onValueChange={emit}
      />
    );
  }
  if (field.type === 'select') {
    return (
      <select
        name={field.name}
        required={required}
        defaultValue={defaultValue ?? ''}
        onChange={(event) => emit(event.target.value)}
      >
        <option value="" disabled>{t('admin.selectOption', { defaultMessage: 'Select an option' })}</option>
        {field.options?.map((option) => (
          <option value={option} key={option}>{t(optionMessageKey(option), { defaultMessage: option })}</option>
        ))}
      </select>
    );
  }
  if (field.type === 'file') {
    return <input name={field.name} type="file" accept={field.accept} required={required} />;
  }
  if ((field.type ?? 'text') === 'text' && /signature/i.test(`${field.name} ${field.label}`)) {
    return (
      <SignatureTextField
        name={field.name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
      />
    );
  }
  return (
    <input
      name={field.name}
      type={field.type ?? 'text'}
      placeholder={placeholder}
      required={required}
      defaultValue={defaultValue}
      onChange={(event) => emit(event.target.value)}
    />
  );
}

function SignatureTextField({
  name,
  placeholder,
  required,
  defaultValue,
}: {
  name: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');
  return (
    <div className="kca-inline-signature-field">
      <input
        name={name}
        type="text"
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <small className="field-help">Draw signature below (recommended), and keep signer name above.</small>
      <SignaturePad onChange={() => undefined} />
    </div>
  );
}

type Props = {
  fields: AdminFormField[];
  values?: Record<string, string>;
  className?: string;
};

export function AdminFormFields({ fields, values = {}, className = 'kca-form-grid' }: Props) {
  const { t } = useLocale();
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const resolved = { ...values, ...overrides };
  const visibleFields = fields.filter((field) => isAdminFieldVisible(field, resolved));
  return (
    <div className={className}>
      {visibleFields.map((field) => (
        <label className={field.wide || field.type === 'textarea' ? 'wide' : ''} key={field.name}>
          <span>
            {t(`admin.field.${field.name}`, { defaultMessage: field.label })}
            {field.required && <b aria-hidden="true"> *</b>}
          </span>
          <FieldControl
            field={field}
            defaultValue={defaultValueForField(field, resolved)}
            values={resolved}
            onValueChange={(name, value) => setOverrides((current) => ({ ...current, [name]: value }))}
          />
          {field.helpText && <small className="field-help">{t(`admin.help.${field.name}`, { defaultMessage: field.helpText })}</small>}
        </label>
      ))}
    </div>
  );
}
