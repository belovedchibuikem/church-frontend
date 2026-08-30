'use client';

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import { designFixturesEnabled } from '../lib/admin-operations-api';
import {
  catalogOptions,
  loadFormCatalogPage,
  type LiveCatalogKey,
} from '../lib/form-catalogs';

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

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 280;

function readSiblingHiddenValue(root: HTMLElement | null, fieldName: string): string | undefined {
  const form = root?.closest('form');
  if (!form) return undefined;
  const input = form.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);
  const value = input?.value?.trim();
  return value || undefined;
}

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
  const requestSeq = useRef(0);
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
  const [debouncedQuery, setDebouncedQuery] = useState(initial?.label ?? '');
  const [value, setValue] = useState(initial?.value ?? controlledValue ?? '');
  const [remoteOptions, setRemoteOptions] = useState<SearchSelectOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [loadingRemote, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loading = loadingProp || loadingRemote;
  const selectedLabelRef = useRef(initial?.label ?? '');

  useEffect(() => {
    if (controlledValue === undefined) return;
    const pool = remoteOptions.length > 0 ? remoteOptions : fixtureOptions;
    const match = pool.find((option) => option.value === controlledValue || option.label === controlledValue);
    setValue(controlledValue);
    if (match) {
      setQuery(match.label);
      selectedLabelRef.current = match.label;
      setDebouncedQuery(match.label);
    }
  }, [controlledValue, fixtureOptions, remoteOptions]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, open]);

  const loadPage = useCallback(
    async (nextPage: number, append: boolean, searchOverride?: string) => {
      if (!catalog) return;
      const seq = ++requestSeq.current;
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      const countryId = readSiblingHiddenValue(rootRef.current, 'country_id');
      const administrativeUnitId = readSiblingHiddenValue(rootRef.current, 'administrative_unit_id');
      const rawSearch = searchOverride ?? debouncedQuery;
      const searchText =
        value && rawSearch.trim() === selectedLabelRef.current.trim() ? '' : rawSearch.trim();

      try {
        const result = await loadFormCatalogPage(catalog as LiveCatalogKey, {
          query: searchText,
          page: nextPage,
          perPage: PAGE_SIZE,
          countryId:
            catalog === 'administrativeUnit' || catalog === 'region' || catalog === 'location'
              ? countryId
              : undefined,
          administrativeUnitId: catalog === 'location' ? administrativeUnitId : undefined,
        });
        if (seq !== requestSeq.current) return;
        setRemoteOptions((prev) => {
          if (!append) return result.items;
          const seen = new Set(prev.map((item) => item.value));
          return [...prev, ...result.items.filter((item) => !seen.has(item.value))];
        });
        setPage(result.page);
        setHasMore(result.hasMore);
        setTotal(result.total);
      } catch (err: unknown) {
        if (seq !== requestSeq.current) return;
        if (designFixturesEnabled()) {
          const needle = rawSearch.trim().toLowerCase();
          const filtered = !needle
            ? fixtureOptions
            : fixtureOptions.filter(
                (option) =>
                  option.label.toLowerCase().includes(needle) ||
                  option.value.toLowerCase().includes(needle) ||
                  (option.meta ?? '').toLowerCase().includes(needle),
              );
          setRemoteOptions(filtered.slice(0, PAGE_SIZE));
          setHasMore(filtered.length > PAGE_SIZE);
          setTotal(filtered.length);
          setPage(1);
        } else {
          if (!append) setRemoteOptions([]);
          setHasMore(false);
          setError(
            err instanceof Error
              ? err.message
              : t('errors.unableToLoadCatalogOptions', { defaultMessage: 'Unable to load catalog options.' }),
          );
        }
      } finally {
        if (seq === requestSeq.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [catalog, debouncedQuery, fixtureOptions, t, value],
  );

  useEffect(() => {
    if (!catalog || !open) return;
    void loadPage(1, false, debouncedQuery);
  }, [catalog, open, debouncedQuery, loadPage]);

  const options = catalog ? remoteOptions : fixtureOptions;
  const selected = options.find((option) => option.value === value) ??
    fixtureOptions.find((option) => option.value === value);

  const filtered = useMemo(() => {
    if (catalog) return options;
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(needle) ||
        option.value.toLowerCase().includes(needle) ||
        (option.meta ?? '').toLowerCase().includes(needle),
    );
  }, [catalog, options, query]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [open]);

  const selectOption = (option: SearchSelectOption) => {
    setValue(option.value);
    setQuery(option.label);
    selectedLabelRef.current = option.label;
    setDebouncedQuery(option.label);
    setOpen(false);
    onValueChange?.(option.value);
  };

  return (
    <div
      className={`search-select${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`}
      ref={rootRef}
    >
      <input type="hidden" name={name} value={value} />
      {labelFieldName ? (
        <input
          type="hidden"
          name={labelFieldName}
          value={selected?.label ?? (value ? query : '')}
        />
      ) : null}
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
          selectedLabelRef.current = '';
          onValueChange?.('');
          setOpen(true);
        }}
      />
      <span className="search-select-chevron" aria-hidden="true">
        ▾
      </span>
      {open ? (
        <ul id={listId} role="listbox" className="search-select-menu">
          {loading && filtered.length === 0 ? (
            <li className="search-select-empty">{t('common.loading', { defaultMessage: 'Loading…' })}</li>
          ) : null}
          {!loading && error ? <li className="search-select-empty">{error}</li> : null}
          {!loading && !error && filtered.length === 0 ? (
            <li className="search-select-empty">{t('common.noMatches', { defaultMessage: 'No matches' })}</li>
          ) : null}
          {filtered.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                data-interaction-native="true"
                aria-selected={value === option.value}
                onClick={() => selectOption(option)}
              >
                <strong>{option.label}</strong>
                {option.meta ? <span>{option.meta}</span> : null}
              </button>
            </li>
          ))}
          {catalog && hasMore ? (
            <li className="search-select-more">
              <button
                type="button"
                data-interaction-native="true"
                disabled={loadingMore || loading}
                onClick={() => void loadPage(page + 1, true)}
              >
                {loadingMore
                  ? t('common.loading', { defaultMessage: 'Loading…' })
                  : t('common.loadMore', {
                      defaultMessage: 'Load more{total}',
                      vars: {
                        total: total > 0 ? ` (${filtered.length} of ${total})` : '',
                      },
                    })}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
