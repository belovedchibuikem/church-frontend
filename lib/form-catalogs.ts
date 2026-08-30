import type { SearchSelectOption } from '../components/search-select';
import {
  FORM_TO_DOMAIN_CATALOG,
  searchCatalogOptions,
  shouldUseCatalogLiveData,
  type CatalogDomainKey,
} from './admin-catalog-api';
import {
  designFixturesEnabled,
  listChurches,
  listHomeChurches,
  shouldUseOperationsLiveData,
} from './admin-operations-api';
import {
  isOrganizationApiConfigured,
  listCountriesPage,
  listLocationsPage,
  listUnitsPage,
} from './admin-organization-api';
import { identityApiConfigured, listAdminUsers } from './admin-identity-api';

export const countryOptions: SearchSelectOption[] = [
  { value: 'ng', label: 'Nigeria', meta: 'NG' },
  { value: 'gh', label: 'Ghana', meta: 'GH' },
  { value: 'ke', label: 'Kenya', meta: 'KE' },
  { value: 'gb', label: 'United Kingdom', meta: 'GB' },
];

export const regionOptions: SearchSelectOption[] = [
  { value: 'ng-la', label: 'Lagos State', meta: 'Nigeria' },
  { value: 'ng-fc', label: 'Abuja FCT', meta: 'Nigeria' },
  { value: 'ng-ri', label: 'Rivers State', meta: 'Nigeria' },
];

export const adminUnitOptions: SearchSelectOption[] = [
  { value: '01JADMINIKEJA', label: 'Ikeja LGA', meta: 'Lagos State' },
  { value: '01JADMINSURU', label: 'Surulere LGA', meta: 'Lagos State' },
  { value: '01JADMINETIO', label: 'Eti-Osa LGA', meta: 'Lagos State' },
];

export const locationOptions: SearchSelectOption[] = [
  { value: '01JLOCADENIYI', label: '12 Adeniyi Jones Avenue, Ikeja', meta: 'Ikeja LGA' },
  { value: '01JLOCALEN', label: 'Allen Avenue, Ikeja', meta: 'Ikeja LGA' },
  { value: '01JLOCLEKKI', label: 'Lekki Phase 1', meta: 'Eti-Osa LGA' },
];

export const churchOptions: SearchSelectOption[] = [
  { value: '01JCHURCHIKEJA', label: 'Family House Church Ikeja', meta: 'Published church' },
  { value: '01JCHURCHLEKKI', label: 'Family House Church Lekki', meta: 'Published church' },
  { value: '01JCHURCHCOV', label: 'The Covenant Place', meta: 'Published church' },
];

export const homeChurchOptions: SearchSelectOption[] = [
  { value: '01JHCHOMEALLEN', label: 'Family House Home Church – Allen', meta: 'Under Ikeja' },
  { value: '01JHCHOMEHOPE', label: 'Hope Home Church', meta: 'Under Covenant Place' },
  { value: '01JHCHOMEVIC', label: 'Victory Home Church', meta: 'Under Covenant Place' },
];

export const personOptions: SearchSelectOption[] = [
  { value: '01JPERSONJOHN', label: 'John Chinedu Doe', meta: 'Member' },
  { value: '01JPERSONGRACE', label: 'Grace Ezekiel', meta: 'Leader' },
  { value: '01JPERSONDAN', label: 'Pastor Daniel David', meta: 'Pastor' },
  { value: '01JPERSONMARY', label: 'Sister Mary Okeke', meta: 'Worker' },
  { value: '01JPERSONJOHNSAM', label: 'Dr. John Samuel', meta: 'Lecturer' },
];

export const kcaModuleOptions: SearchSelectOption[] = [
  { value: '01JMODIDENTITY', label: 'Identity in Christ', meta: 'Y1-M01' },
  { value: '01JMODBIBLE', label: 'Bible Survey', meta: 'Y1-M02' },
  { value: '01JMODDISCIPLINES', label: 'Spiritual Disciplines', meta: 'Y1-M03' },
  { value: '01JMODOT', label: 'Old Testament Overview', meta: 'Y2-M01' },
  { value: '01JMODDOCTRINE', label: 'Christian Doctrine', meta: 'Y2-M02' },
];

export const genderOptions = ['Male', 'Female', 'Prefer not to say'];
export const maritalOptions = ['Single', 'Married', 'Widowed'];
export const statusOptions = ['Active', 'Pending', 'Suspended', 'Closed'];
export const churchTypeOptions = ['Conventional', 'Home', 'Online', 'Mission'];
export const meetingDayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const nationalityOptions: SearchSelectOption[] = [
  { value: 'NG', label: 'Nigerian', meta: 'Nigeria' },
  { value: 'GH', label: 'Ghanaian', meta: 'Ghana' },
  { value: 'KE', label: 'Kenyan', meta: 'Kenya' },
  { value: 'GB', label: 'British', meta: 'United Kingdom' },
];

export const catalogOptions = {
  country: countryOptions,
  region: regionOptions,
  administrativeUnit: adminUnitOptions,
  location: locationOptions,
  church: churchOptions,
  homeChurch: homeChurchOptions,
  person: personOptions,
  nationality: nationalityOptions,
  kcaModule: kcaModuleOptions,
};

export type FormCatalogKey = keyof typeof catalogOptions;

/** Extended catalog keys that resolve to ProtectedDomainRegistry domains. */
export type LiveCatalogKey = FormCatalogKey | keyof typeof FORM_TO_DOMAIN_CATALOG | CatalogDomainKey;

function filterStatic(options: SearchSelectOption[], query: string): SearchSelectOption[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return options;
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(needle) ||
      option.value.toLowerCase().includes(needle) ||
      (option.meta ?? '').toLowerCase().includes(needle),
  );
}

/**
 * Resolve search-select options from live admin APIs when fixtures are off.
 * Falls back to static form-catalog fixtures only when design fixtures are enabled.
 */
export async function loadFormCatalogOptions(
  catalog: LiveCatalogKey,
  query = '',
  signal?: AbortSignal,
): Promise<SearchSelectOption[]> {
  const page = await loadFormCatalogPage(catalog, { query, page: 1, signal });
  return page.items;
}

export type FormCatalogPage = {
  items: SearchSelectOption[];
  page: number;
  hasMore: boolean;
  total: number;
};

export type FormCatalogPageFilters = {
  query?: string;
  page?: number;
  perPage?: number;
  /** When set, units/locations are filtered to this country ULID. */
  countryId?: string;
  /** When set, locations are filtered to this administrative unit ULID. */
  administrativeUnitId?: string;
  signal?: AbortSignal;
};

/**
 * Paginated catalog loader for search-selects. Never walks every page of world geography.
 */
export async function loadFormCatalogPage(
  catalog: LiveCatalogKey,
  filters: FormCatalogPageFilters = {},
): Promise<FormCatalogPage> {
  const query = filters.query ?? '';
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(50, Math.max(5, filters.perPage ?? 20));
  const signal = filters.signal;
  const empty = (): FormCatalogPage => ({ items: [], page, hasMore: false, total: 0 });

  const domainKey =
    (FORM_TO_DOMAIN_CATALOG[catalog as string] as CatalogDomainKey | undefined) ??
    (typeof catalog === 'string' && catalog.includes('.') ? (catalog as CatalogDomainKey) : undefined);

  if (domainKey && shouldUseCatalogLiveData()) {
    const items = await searchCatalogOptions(domainKey, query, { signal, perPage });
    return {
      items,
      page: 1,
      hasMore: items.length >= perPage,
      total: items.length,
    };
  }

  if (shouldUseOperationsLiveData()) {
    if (catalog === 'church') {
      const result = await listChurches({ search: query || undefined, perPage, page, signal });
      return {
        items: result.items.map((item) => ({
          value: item.id,
          label: item.name,
          meta: item.location_id ?? undefined,
        })),
        page: result.pagination.current_page,
        hasMore: result.pagination.current_page < result.pagination.last_page,
        total: result.pagination.total,
      };
    }
    if (catalog === 'homeChurch') {
      const result = await listHomeChurches({ search: query || undefined, perPage, page, signal });
      return {
        items: result.items.map((item) => ({
          value: item.id,
          label: item.name,
          meta: item.status,
        })),
        page: result.pagination.current_page,
        hasMore: result.pagination.current_page < result.pagination.last_page,
        total: result.pagination.total,
      };
    }
  }

  if (!designFixturesEnabled() && isOrganizationApiConfigured()) {
    if (catalog === 'country') {
      const result = await listCountriesPage(
        { search: query || undefined, page, perPage },
        { signal },
      );
      return {
        items: result.items.map((item) => ({
          value: item.id,
          label: item.name,
          meta: item.iso_code,
        })),
        page: result.pagination.current_page,
        hasMore: result.pagination.current_page < result.pagination.last_page,
        total: result.pagination.total,
      };
    }
    if (catalog === 'region' || catalog === 'administrativeUnit') {
      const result = await listUnitsPage(
        {
          search: query || undefined,
          page,
          perPage,
          countryId: filters.countryId,
        },
        { signal },
      );
      return {
        items: result.items.map((item) => ({
          value: item.id,
          label: item.name,
          meta: item.administrative_level?.name ?? item.country?.name,
        })),
        page: result.pagination.current_page,
        hasMore: result.pagination.current_page < result.pagination.last_page,
        total: result.pagination.total,
      };
    }
    if (catalog === 'location') {
      const result = await listLocationsPage(
        {
          search: query || undefined,
          page,
          perPage,
          countryId: filters.countryId,
          administrativeUnitId: filters.administrativeUnitId,
        },
        { signal },
      );
      return {
        items: result.items.map((item) => ({
          value: item.id,
          label: item.name,
          meta: item.administrative_unit?.name ?? item.country?.name,
        })),
        page: result.pagination.current_page,
        hasMore: result.pagination.current_page < result.pagination.last_page,
        total: result.pagination.total,
      };
    }
  }

  if (!designFixturesEnabled() && catalog === 'person' && identityApiConfigured()) {
    const result = await listAdminUsers({ search: query || undefined, perPage, page });
    const items = result.data
      .filter((user) => Boolean(user.person_id))
      .map((user) => ({
        value: String(user.person_id),
        label: user.name,
        meta: user.email,
      }));
    return {
      items,
      page: result.pagination.current_page,
      hasMore: result.pagination.current_page < result.pagination.last_page,
      total: result.pagination.total,
    };
  }

  if (!designFixturesEnabled()) {
    return empty();
  }

  const staticOptions = filterStatic(catalogOptions[catalog as FormCatalogKey] ?? [], query);
  const start = (page - 1) * perPage;
  const slice = staticOptions.slice(start, start + perPage);
  return {
    items: slice,
    page,
    hasMore: start + perPage < staticOptions.length,
    total: staticOptions.length,
  };
}
