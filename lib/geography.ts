/** Public world geography for searchable Country → State → City/LGA selects. */

import { resolveApiV1BaseUrl } from './api-config.ts';
import nigeriaLocalities from './data/nigeria-localities.json' with { type: 'json' };

export const DEFAULT_COUNTRY_CODE = 'NG';

export type GeoCountry = {
  code: string;
  name: string;
  flag?: string;
};

export type GeoSelectOption = {
  value: string;
  label: string;
  meta?: string;
};

const REST_COUNTRIES_UPSTREAM = 'https://restcountries.com/v3.1/all?fields=name,cca2,flag';
const COUNTRIES_NOW_STATES_UPSTREAM = 'https://countriesnow.space/api/v0.1/countries/states';
const COUNTRIES_NOW_CITIES_UPSTREAM = 'https://countriesnow.space/api/v0.1/countries/state/cities';

/** Same-origin Next.js route handlers — third-party geography APIs block browser CORS. */
const GEOGRAPHY_PROXY = '/geography-proxy';

function isBrowserRuntime(): boolean {
  return typeof window !== 'undefined';
}

function countriesUrl(): string {
  return isBrowserRuntime() ? `${GEOGRAPHY_PROXY}/countries` : REST_COUNTRIES_UPSTREAM;
}

function statesUrl(): string {
  return isBrowserRuntime() ? `${GEOGRAPHY_PROXY}/states` : COUNTRIES_NOW_STATES_UPSTREAM;
}

function citiesUrl(): string {
  return isBrowserRuntime() ? `${GEOGRAPHY_PROXY}/cities` : COUNTRIES_NOW_CITIES_UPSTREAM;
}

function laravelGeographyBase(): string | null {
  const base = resolveApiV1BaseUrl();
  return base ? `${base.replace(/\/$/, '')}/geography` : null;
}

/** Used immediately so the control is usable before (or if) the live country list fails. */
export const FALLBACK_COUNTRIES: GeoCountry[] = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
];

let countryCache: GeoCountry[] | null = null;
const statesCache = new Map<string, string[]>();
const citiesCache = new Map<string, string[]>();

export function isNigeria(code: string | undefined | null): boolean {
  return (code ?? '').trim().toUpperCase() === 'NG';
}

export function localityLabelFor(countryCode: string | undefined | null): string {
  return isNigeria(countryCode) ? 'LGA / City' : 'City / Area';
}

export function countrySelectOptions(countries: GeoCountry[]): GeoSelectOption[] {
  return countries.map((country) => ({
    value: country.code,
    label: country.flag ? `${country.flag} ${country.name}` : country.name,
    meta: country.code,
  }));
}

export function namesToOptions(names: string[]): GeoSelectOption[] {
  return names.map((name) => ({ value: name, label: name }));
}

export function countryDisplayName(code: string, countries: GeoCountry[]): string {
  const match = countries.find((country) => country.code === code.toUpperCase());
  return match?.name ?? code;
}

export function formatLocationLine(input: {
  locality?: string | null;
  region?: string | null;
  country?: string | null;
  countryLabel?: string | null;
}): string {
  const country = (input.countryLabel ?? input.country ?? '').trim();
  const parts = [input.locality, input.region, country]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter(Boolean);
  return parts.join(', ');
}

const NG_MIN_STATES = 36;
const NG_MIN_LOCALITIES = 10;

type NigeriaLocalitiesFile = {
  iso?: string;
  name?: string;
  states?: Record<string, string[]>;
};

function nigeriaStateMap(): Record<string, string[]> {
  const source = nigeriaLocalities as NigeriaLocalitiesFile;
  return source.states ?? {};
}

export function nigeriaStateNames(): string[] {
  return Object.keys(nigeriaStateMap()).sort((left, right) => left.localeCompare(right));
}

export function nigeriaLocalityNames(stateName: string): string[] {
  const needle = normalizeAdminName(stateName);
  if (!needle) return [];
  for (const [name, localities] of Object.entries(nigeriaStateMap())) {
    if (normalizeAdminName(name) === needle) {
      return [...localities].filter(Boolean).sort((left, right) => left.localeCompare(right));
    }
  }
  return [];
}

function normalizeAdminName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+(state|province|region|county|territory|district)$/i, '')
    .replace(/\s+/g, ' ');
}

function completeIfSparseNigeriaStates(iso: string | null, names: string[]): string[] {
  if (iso !== 'NG') return names;
  const bundled = nigeriaStateNames();
  return names.length >= NG_MIN_STATES ? names : bundled;
}

function completeIfSparseNigeriaLocalities(iso: string | null, state: string, names: string[]): string[] {
  if (iso !== 'NG') return names;
  const bundled = nigeriaLocalityNames(state);
  if (bundled.length === 0) return names;
  return names.length >= NG_MIN_LOCALITIES ? names : bundled;
}

function cacheKey(countryName: string, state?: string): string {
  return state ? `${countryName.trim().toLowerCase()}::${state.trim().toLowerCase()}` : countryName.trim().toLowerCase();
}

async function fetchJson<T>(url: string, init: RequestInit = {}, timeoutMs = 12000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  init.signal?.addEventListener('abort', onAbort);

  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Unable to load location data (${response.status}).`);
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
    init.signal?.removeEventListener('abort', onAbort);
  }
}

type RestCountry = {
  cca2?: string;
  flag?: string;
  name?: { common?: string };
};

export async function fetchCountries(signal?: AbortSignal): Promise<GeoCountry[]> {
  if (countryCache) return countryCache;

  const fromLaravel = await fetchLaravelCountries(signal);
  if (fromLaravel && fromLaravel.length > 0) {
    countryCache = fromLaravel;
    return fromLaravel;
  }

  try {
    const payload = await fetchJson<RestCountry[]>(countriesUrl(), { signal });
    const next = payload
      .map((item) => ({
        code: (item.cca2 ?? '').trim().toUpperCase(),
        name: (item.name?.common ?? '').trim(),
        flag: item.flag,
      }))
      .filter((item) => item.code.length === 2 && item.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));

    if (next.length === 0) return FALLBACK_COUNTRIES;
    countryCache = next;
    return next;
  } catch (error) {
    if (signal?.aborted) throw error;
    return FALLBACK_COUNTRIES;
  }
}

type StatesResponse = {
  error?: boolean;
  data?: { name?: string; states?: Array<{ name?: string }> };
};

function countryCodeHint(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length === 2 ? trimmed.toUpperCase() : null;
}

export async function fetchStates(countryCodeOrName: string, signal?: AbortSignal): Promise<string[]> {
  const name = countryCodeOrName.trim();
  if (!name) return [];
  const key = cacheKey(name);
  const cached = statesCache.get(key);
  if (cached) return cached;

  const iso = countryCodeHint(name) ?? (await isoForCountryName(name, signal));
  if (laravelGeographyBase() && iso) {
    const fromLaravel = await fetchLaravelStates(iso, signal);
    if (fromLaravel !== null) {
      const names = completeIfSparseNigeriaStates(iso, fromLaravel);
      statesCache.set(key, names);
      return names;
    }
    if (iso === 'NG') {
      const names = nigeriaStateNames();
      statesCache.set(key, names);
      return names;
    }
    throw new Error('Unable to load states from the platform catalogue.');
  }

  const payload = await fetchJson<StatesResponse>(
    statesUrl(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ country: name }),
      signal,
    },
  );

  const names = (payload.data?.states ?? [])
    .map((state) => (state.name ?? '').trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  statesCache.set(key, names);
  return names;
}

type CitiesResponse = {
  error?: boolean;
  data?: string[];
};

export async function fetchCities(countryCodeOrName: string, stateName: string, signal?: AbortSignal): Promise<string[]> {
  const country = countryCodeOrName.trim();
  const state = stateName.trim();
  if (!country || !state) return [];
  const key = cacheKey(country, state);
  const cached = citiesCache.get(key);
  if (cached) return cached;

  const iso = countryCodeHint(country) ?? (await isoForCountryName(country, signal));
  if (laravelGeographyBase() && iso) {
    const fromLaravel = await fetchLaravelLocalities(iso, state, signal);
    if (fromLaravel !== null) {
      const names = completeIfSparseNigeriaLocalities(iso, state, fromLaravel);
      citiesCache.set(key, names);
      return names;
    }
    if (iso === 'NG') {
      const names = nigeriaLocalityNames(state);
      citiesCache.set(key, names);
      return names;
    }
    throw new Error('Unable to load local areas from the platform catalogue.');
  }

  const payload = await fetchJson<CitiesResponse>(
    citiesUrl(),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ country, state }),
      signal,
    },
  );

  const names = (payload.data ?? [])
    .map((city) => city.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
  citiesCache.set(key, names);
  return names;
}

async function isoForCountryName(countryName: string, signal?: AbortSignal): Promise<string | null> {
  const countries = await fetchCountries(signal);
  const needle = countryName.trim().toLowerCase();
  const match = countries.find(
    (country) => country.name.toLowerCase() === needle || country.code.toLowerCase() === needle,
  );
  return match?.code ?? null;
}

type LaravelEnvelope<T> = { data?: T };

async function fetchLaravelCountries(signal?: AbortSignal): Promise<GeoCountry[] | null> {
  const base = laravelGeographyBase();
  if (!base) return null;
  try {
    const payload = await fetchJson<LaravelEnvelope<Array<{ code?: string; name?: string }>>>(
      `${base}/countries`,
      { signal },
    );
    const next = (payload.data ?? [])
      .map((item) => ({
        code: (item.code ?? '').trim().toUpperCase(),
        name: (item.name ?? '').trim(),
      }))
      .filter((item) => item.code.length === 2 && item.name.length > 0)
      .sort((a, b) => a.name.localeCompare(b.name));
    return next.length > 0 ? next : null;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

async function fetchLaravelStates(iso: string, signal?: AbortSignal): Promise<string[] | null> {
  const base = laravelGeographyBase();
  if (!base) return null;
  try {
    const payload = await fetchJson<LaravelEnvelope<Array<{ name?: string }>>>(
      `${base}/countries/${encodeURIComponent(iso)}/states`,
      { signal },
    );
    const names = (payload.data ?? [])
      .map((item) => (item.name ?? '').trim())
      .filter(Boolean);
    return names;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}

async function fetchLaravelLocalities(
  iso: string,
  state: string,
  signal?: AbortSignal,
): Promise<string[] | null> {
  const base = laravelGeographyBase();
  if (!base) return null;
  try {
    const payload = await fetchJson<LaravelEnvelope<Array<{ name?: string }>>>(
      `${base}/countries/${encodeURIComponent(iso)}/states/${encodeURIComponent(state)}/localities`,
      { signal },
    );
    const names = (payload.data ?? [])
      .map((item) => (item.name ?? '').trim())
      .filter(Boolean);
    return names;
  } catch (error) {
    if (signal?.aborted) throw error;
    return null;
  }
}
