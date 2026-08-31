'use client';

import { SearchSelect, type SearchSelectOption } from './search-select';
import { catalogForIdField, placeholderForIdField } from '../lib/id-field-catalog';
import type { LiveCatalogKey } from '../lib/form-catalogs';

type Props = {
  name: string;
  required?: boolean;
  defaultValue?: string;
  defaultLabel?: string;
  placeholder?: string;
  catalog?: LiveCatalogKey | string;
  options?: SearchSelectOption[];
  disabled?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
};

export function EntitySearchSelect({
  name,
  required,
  defaultValue,
  defaultLabel,
  placeholder,
  catalog,
  options,
  disabled,
  value,
  onValueChange,
}: Props) {
  const resolved = catalog ?? catalogForIdField(name);
  return (
    <SearchSelect
      name={name}
      catalog={resolved}
      options={options}
      required={required}
      defaultValue={defaultValue}
      defaultLabel={defaultLabel}
      placeholder={placeholder ?? placeholderForIdField(name)}
      disabled={disabled}
      value={value}
      onValueChange={onValueChange}
    />
  );
}
