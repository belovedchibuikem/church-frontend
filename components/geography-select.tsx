'use client';

import { useEffect, useMemo, useState } from 'react';
import { useLocale } from '@/components/locale-provider';
import {
  DEFAULT_COUNTRY_CODE,
  countryDisplayName,
  countrySelectOptions,
  fetchCities,
  fetchCountries,
  fetchStates,
  isNigeria,
  localityLabelFor,
  namesToOptions,
  FALLBACK_COUNTRIES,
  type GeoCountry,
} from '@/lib/geography';
import { SearchSelect } from './search-select';

type Props = {
  defaultCountry?: string;
  defaultRegion?: string;
  defaultLocality?: string;
  countryField?: string;
  countryLabelField?: string;
  regionField?: string;
  localityField?: string;
  required?: boolean;
  className?: string;
};

export function GeographySelect({
  defaultCountry = DEFAULT_COUNTRY_CODE,
  defaultRegion = '',
  defaultLocality = '',
  countryField = 'country',
  countryLabelField = 'country_label',
  regionField = 'region',
  localityField = 'locality',
  required = true,
  className,
}: Props) {
  const { t } = useLocale();
  const initialCountry = (defaultCountry || DEFAULT_COUNTRY_CODE).trim().toUpperCase();
  const [countries, setCountries] = useState<GeoCountry[]>(FALLBACK_COUNTRIES);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [country, setCountry] = useState(initialCountry);
  const [region, setRegion] = useState(defaultRegion);
  const [locality, setLocality] = useState(defaultLocality);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [statesError, setStatesError] = useState<string | null>(null);
  const [citiesError, setCitiesError] = useState<string | null>(null);

  const countryOptions = useMemo(() => countrySelectOptions(countries), [countries]);
  const countryName = countryDisplayName(country, countries);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingCountries(true);
    void fetchCountries(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setCountries(list);
      })
      .catch(() => {
        if (!controller.signal.aborted) setCountries(FALLBACK_COUNTRIES);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCountries(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!countryName) {
      setStates([]);
      return;
    }
    const controller = new AbortController();
    setLoadingStates(true);
    setStatesError(null);
    void fetchStates(country, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setStates(list);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setStates([]);
        setStatesError(
          error instanceof Error
            ? error.message
            : t('errors.unableToLoadStates', { defaultMessage: 'Unable to load states.' }),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingStates(false);
      });
    return () => controller.abort();
  }, [country, t]);

  useEffect(() => {
    if (!countryName || !region) {
      setCities([]);
      return;
    }
    const controller = new AbortController();
    setLoadingCities(true);
    setCitiesError(null);
    void fetchCities(country, region, controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setCities(list);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setCities([]);
        setCitiesError(
          error instanceof Error
            ? error.message
            : t('errors.unableToLoadCities', { defaultMessage: 'Unable to load cities.' }),
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingCities(false);
      });
    return () => controller.abort();
  }, [country, region, t]);

  const stateOptions = useMemo(() => namesToOptions(states), [states]);
  const cityOptions = useMemo(() => namesToOptions(cities), [cities]);
  const regionRequired = required && states.length > 0;
  const localityRequired = required && cities.length > 0;
  const localityLabel = isNigeria(country)
    ? t('common.lgaCity', { defaultMessage: 'LGA / City' })
    : t('common.cityArea', { defaultMessage: 'City / Area' });
  const regionPlaceholder = loadingStates
    ? t('common.loadingStates', { defaultMessage: 'Loading states…' })
    : statesError
      ? t('common.searchOrTryAgain', { defaultMessage: 'Search or try again…' })
      : t('common.searchStateOrRegion', { defaultMessage: 'Search state or region…' });
  const localityPlaceholder = !region
    ? t('common.selectStateFirst', { defaultMessage: 'Select a state first…' })
    : loadingCities
      ? t('common.loadingCities', { defaultMessage: 'Loading cities…' })
      : citiesError
        ? t('common.searchOrTryAgain', { defaultMessage: 'Search or try again…' })
        : t('common.searchNamed', {
            defaultMessage: 'Search {name}…',
            vars: { name: localityLabelFor(country).toLowerCase() },
          });

  return (
    <div className={`geography-select ${className ?? ''}`.trim()}>
      <label>
        {t('common.country', { defaultMessage: 'Country' })}
        <SearchSelect
          name={countryField}
          labelFieldName={countryLabelField}
          options={countryOptions}
          value={country}
          loading={loadingCountries}
          required={required}
          placeholder={t('common.searchCountry', { defaultMessage: 'Search country…' })}
          onValueChange={(next) => {
            setCountry(next.trim().toUpperCase());
            setRegion('');
            setLocality('');
            setCities([]);
          }}
        />
      </label>
      <label>
        {t('common.stateRegion', { defaultMessage: 'State / Region' })}
        <SearchSelect
          key={`region-${country}`}
          name={regionField}
          options={stateOptions}
          value={region}
          loading={loadingStates}
          disabled={!country || (loadingStates && states.length === 0)}
          required={regionRequired}
          placeholder={regionPlaceholder}
          onValueChange={(next) => {
            setRegion(next);
            setLocality('');
            setCities([]);
          }}
        />
      </label>
      <label className="geography-locality">
        {localityLabel}
        <SearchSelect
          key={`locality-${country}-${region}`}
          name={localityField}
          options={cityOptions}
          value={locality}
          loading={loadingCities}
          disabled={!region || (loadingCities && cities.length === 0)}
          required={localityRequired}
          placeholder={localityPlaceholder}
          onValueChange={setLocality}
        />
      </label>
    </div>
  );
}
