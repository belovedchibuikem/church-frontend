'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { designFixturesEnabled } from '../lib/admin-operations-api';
import { catalogOptions, loadFormCatalogOptions, type LiveCatalogKey } from '../lib/form-catalogs';

export type SearchSelectOption = {
  value: string;
  label: string;
  meta?: string;
};

type Props = {
  name: string;
  options?: SearchSelectOption[];
  /** When set, options load from live catalog/ops/org APIs (fixtures only when design fixtures are on). */
  catalog?: LiveCatalogKey | string;
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  loading?: boolean;
  /** Extra hidden input that stores the selected option label (e.g. country name). */
  labelFieldName?: string;
  className?: string;
  onValueChange?: (value: string) => void;
};

export function SearchSelect({
  name,
  options: staticOptions,
  catalog,
  defaultValue = '',
  value: controlledValue,
  placeholder,
  required = false,
  disabled = false,
  loading: loadingProp = false,
  labelFieldName,
  className,
  onValueChange,
}: Props) {
  const { t } = useLocale();
  const listId = useId();
  const resolvedPlaceholder =
    placeholder ?? t('common.searchAndSelect', { defaultMessage: 'Search and select…' });
  const rootRef = useRef<HTMLDivElement>(null);
  const fixtureOptions =
    staticOptions ??
    (catalog && catalog in catalogOptions
      ? catalogOptions[catalog as keyof typeof catalogOptions]
      : []);
  const initial = fixtureOptions.find(
    (option) =>
      option.value === (controlledValue ?? defaultValue) ||
      option.label === (controlledValue ?? defaultValue),
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(initial?.label ?? '');
  const [value, setValue] = useState(initial?.value ?? controlledValue ?? '');
  const [remoteOptions, setRemoteOptions] = useState<SearchSelectOption[] | null>(null);
  const [loadingRemote, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = loadingProp || loadingRemote;

  useEffect(() => {
    if (controlledValue === undefined) return;
    const pool = remoteOptions ?? fixtureOptions;
    const match = pool.find((option) => option.value === controlledValue || option.label === controlledValue);
    setValue(controlledValue);
    if (match) setQuery(match.label);
  }, [controlledValue, fixtureOptions, remoteOptions]);

  useEffect(() => {
    if (!catalog) {
      setRemoteOptions(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      void loadFormCatalogOptions(catalog as LiveCatalogKey, query, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) setRemoteOptions(items);
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          if (designFixturesEnabled()) {
            setRemoteOptions(fixtureOptions);
          } else {
            setRemoteOptions([]);
          }
          setError(
            err instanceof Error
              ? err.message
              : t('errors.unableToLoadCatalogOptions', { defaultMessage: 'Unable to load catalog options.' }),
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fixtureOptions is derived each render
  }, [catalog, query, t]);

  const options = remoteOptions ?? fixtureOptions;
  const selected = options.find((option) => option.value === value);

  const filtered = useMemo(() => {
    if (catalog && remoteOptions) return options;
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle) ||
        (option.meta ?? '').toLowerCase().includes(needle),
    );
  }, [catalog, options, query, remoteOptions]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const selectOption = (option: SearchSelectOption) => {
    setValue(option.value);
    setQuery(option.label);
    setOpen(false);
    onValueChange?.(option.value);
  };

  return (
    <div
      className={`search-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      ref={rootRef}
    >
      <input type="hidden" name={name} value={value} />
      {labelFieldName ? <input type="hidden" name={labelFieldName} value={selected?.label ?? (value ? query : '')} /> : null}
      <input
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        autoComplete="off"
        disabled={disabled}
        required={required && !value}
        placeholder={resolvedPlaceholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setValue('');
          onValueChange?.('');
          setOpen(true);
        }}
      />
      <span className="search-select-chevron" aria-hidden="true">
        ▾
      </span>
      {open ? (
        <ul id={listId} role="listbox" className="search-select-menu">
          {loading ? (
            <li className="search-select-empty">{t('common.loading', { defaultMessage: 'Loading…' })}</li>
          ) : null}
          {!loading && error ? <li className="search-select-empty">{error}</li> : null}
          {!loading && !error && filtered.length === 0 ? (
            <li className="search-select-empty">{t('common.noMatches', { defaultMessage: 'No matches' })}</li>
          ) : null}
          {!loading &&
            filtered.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => selectOption(option)}
                >
                  <strong>{option.label}</strong>
                  {option.meta ? <span>{option.meta}</span> : null}
                </button>
              </li>
            ))}
        </ul>
      ) : null}
    </div>
  );
}
