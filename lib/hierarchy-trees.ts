import {
  designFixturesEnabled as organizationDesignFixturesEnabled,
  type AdminCountry,
  type AdminAdministrativeUnit,
  type AdminLocation,
  type OrganizationHierarchySnapshot,
} from './admin-organization-api';

export type HierarchyNode = {
  id: string;
  label: string;
  level: string;
  code: string;
  parent?: string;
  parentId?: string;
  kind?: 'country' | 'unit' | 'location' | 'group';
  countryId?: string;
  churches?: number;
  homeChurches?: number;
  members?: number;
  status?: string;
  children?: HierarchyNode[];
};

/** Prefer live organization APIs; fixtures only when the shared design-fixture gate is on. */
export function designFixturesEnabled(): boolean {
  return organizationDesignFixturesEnabled();
}

const adminTree: HierarchyNode = {
  id: 'ng',
  label: 'Nigeria',
  level: 'Country',
  code: 'NG',
  kind: 'country',
  churches: 186,
  homeChurches: 1842,
  members: 126400,
  children: [
    {
      id: 'lagos',
      label: 'Lagos State',
      level: 'State / Region',
      code: 'NG-LA',
      parent: 'Nigeria',
      kind: 'unit',
      churches: 42,
      homeChurches: 486,
      members: 38400,
      children: [
        {
          id: 'ikeja',
          label: 'Ikeja LGA',
          level: 'Local Government Area',
          code: 'NG-LA-IKE',
          parent: 'Lagos State',
          kind: 'unit',
          churches: 8,
          homeChurches: 96,
          members: 13450,
          children: [
            {
              id: 'ward-a',
              label: 'Ikeja Ward A',
              level: 'Ward',
              code: 'IKEJA_WA',
              parent: 'Ikeja LGA',
              kind: 'unit',
              churches: 3,
              homeChurches: 28,
              members: 4200,
            },
            {
              id: 'ward-b',
              label: 'Ikeja Ward B',
              level: 'Ward',
              code: 'IKEJA_WB',
              parent: 'Ikeja LGA',
              kind: 'unit',
              churches: 2,
              homeChurches: 34,
              members: 5100,
            },
            {
              id: 'ward-c',
              label: 'Ikeja Ward C',
              level: 'Ward',
              code: 'IKEJA_WC',
              parent: 'Ikeja LGA',
              kind: 'unit',
              churches: 3,
              homeChurches: 34,
              members: 4150,
            },
          ],
        },
        {
          id: 'surulere',
          label: 'Surulere LGA',
          level: 'Local Government Area',
          code: 'NG-LA-SUR',
          parent: 'Lagos State',
          kind: 'unit',
          churches: 6,
          homeChurches: 72,
          members: 9800,
        },
        {
          id: 'eti-osa',
          label: 'Eti-Osa LGA',
          level: 'Local Government Area',
          code: 'NG-LA-ETO',
          parent: 'Lagos State',
          kind: 'unit',
          churches: 5,
          homeChurches: 58,
          members: 8700,
        },
      ],
    },
  ],
};

const churchTree: HierarchyNode = {
  id: 'global',
  label: 'The Kingdom Church (Global)',
  level: 'Global Organization',
  code: 'TKC-GLOBAL',
  kind: 'group',
  churches: 1842,
  members: 2100000,
  children: [
    {
      id: 'africa',
      label: 'Africa',
      level: 'Continent',
      code: 'AF',
      parent: 'The Kingdom Church (Global)',
      kind: 'group',
      churches: 980,
      members: 1200000,
      children: [
        {
          id: 'nigeria',
          label: 'Nigeria',
          level: 'Country',
          code: 'NG',
          parent: 'Africa',
          kind: 'group',
          churches: 186,
          members: 126400,
          children: [
            {
              id: 'lagos',
              label: 'Lagos State',
              level: 'State / Region',
              code: 'NG-LA',
              parent: 'Nigeria',
              kind: 'group',
              churches: 42,
              members: 38400,
              children: [
                {
                  id: 'ikeja-lga',
                  label: 'Ikeja LGA',
                  level: 'Local Government Area',
                  code: 'NG-LA-IKE',
                  parent: 'Lagos State',
                  kind: 'group',
                  churches: 8,
                  members: 13450,
                  children: [
                    {
                      id: 'covenant',
                      label: 'The Covenant Place',
                      level: 'Main Church',
                      code: 'CH-COV-IKE',
                      parent: 'Ikeja LGA',
                      kind: 'group',
                      churches: 1,
                      homeChurches: 24,
                      members: 4200,
                      status: 'Published',
                    },
                    {
                      id: 'grace-house',
                      label: 'Grace House Church',
                      level: 'Main Church',
                      code: 'CH-GRC-IKE',
                      parent: 'Ikeja LGA',
                      kind: 'group',
                      churches: 1,
                      homeChurches: 18,
                      members: 3100,
                      status: 'Published',
                    },
                    {
                      id: 'faith-chapel',
                      label: 'Faith Chapel',
                      level: 'Main Church',
                      code: 'CH-FTH-IKE',
                      parent: 'Ikeja LGA',
                      kind: 'group',
                      churches: 1,
                      homeChurches: 12,
                      members: 2800,
                      status: 'Published',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

const homeChurchTree: HierarchyNode = {
  id: 'covenant',
  label: 'The Covenant Place (Main Church)',
  level: 'Main Church',
  code: 'CH-COV-IKE',
  parent: 'Ikeja LGA',
  kind: 'group',
  churches: 1,
  homeChurches: 5,
  members: 4200,
  status: 'Published',
  children: [
    {
      id: 'home-group',
      label: 'Home Churches',
      level: 'Grouping',
      code: 'HC-GROUP',
      parent: 'The Covenant Place (Main Church)',
      kind: 'group',
      homeChurches: 5,
      members: 186,
      children: [
        {
          id: 'victory',
          label: 'Victory Home Church',
          level: 'Home Church',
          code: 'HC-VIC-01',
          parent: 'The Covenant Place',
          kind: 'group',
          homeChurches: 1,
          members: 42,
          status: 'Active',
          children: [
            {
              id: 'hope',
              label: 'Hope Home Church',
              level: 'Home Church',
              code: 'HC-HOP-02',
              parent: 'Victory Home Church',
              kind: 'group',
              homeChurches: 1,
              members: 38,
              status: 'Active',
              children: [
                {
                  id: 'blessed',
                  label: 'Blessed Home Church',
                  level: 'Home Church',
                  code: 'HC-BLS-03',
                  parent: 'Hope Home Church',
                  kind: 'group',
                  homeChurches: 1,
                  members: 31,
                  status: 'Active',
                  children: [
                    {
                      id: 'faith',
                      label: 'Faith Home Church',
                      level: 'Home Church',
                      code: 'HC-FTH-04',
                      parent: 'Blessed Home Church',
                      kind: 'group',
                      homeChurches: 1,
                      members: 28,
                      status: 'Active',
                    },
                    {
                      id: 'love',
                      label: 'Love Home Church',
                      level: 'Home Church',
                      code: 'HC-LOV-05',
                      parent: 'Blessed Home Church',
                      kind: 'group',
                      homeChurches: 1,
                      members: 24,
                      status: 'Active',
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

export function isAdminOrganizationHierarchyRoute(route: string): boolean {
  return /\/admin\/geography\/hierarchy\/?$/.test(route) || route.endsWith('/admin/geography/hierarchy');
}

export function fixtureHierarchyTreeForRoute(route: string): HierarchyNode | null {
  if (!designFixturesEnabled()) return null;
  if (route.includes('home-church-hierarchy')) return homeChurchTree;
  if (route.includes('church-hierarchy')) return churchTree;
  if (isAdminOrganizationHierarchyRoute(route) || route.includes('/geography/hierarchy')) return adminTree;
  return adminTree;
}

/** @deprecated Prefer live API for admin hierarchy; fixtures only when designFixturesEnabled(). */
export function hierarchyTreeForRoute(route: string): HierarchyNode | null {
  return fixtureHierarchyTreeForRoute(route);
}

export function buildOrganizationHierarchyTree(
  snapshot: OrganizationHierarchySnapshot,
): HierarchyNode | null {
  const { countries, units, locations } = snapshot;
  if (countries.length === 0 && units.length === 0) return null;

  const unitsByCountry = new Map<string, AdminAdministrativeUnit[]>();
  for (const unit of units) {
    const countryId = unit.country?.id;
    if (!countryId) continue;
    const bucket = unitsByCountry.get(countryId) ?? [];
    bucket.push(unit);
    unitsByCountry.set(countryId, bucket);
  }

  const locationsByUnit = new Map<string, AdminLocation[]>();
  const orphanLocationsByCountry = new Map<string, AdminLocation[]>();
  for (const location of locations) {
    const unitId = location.administrative_unit?.id;
    if (unitId) {
      const bucket = locationsByUnit.get(unitId) ?? [];
      bucket.push(location);
      locationsByUnit.set(unitId, bucket);
    } else if (location.country?.id) {
      const bucket = orphanLocationsByCountry.get(location.country.id) ?? [];
      bucket.push(location);
      orphanLocationsByCountry.set(location.country.id, bucket);
    }
  }

  const countryNodes = countries.map((country) =>
    buildCountryNode(
      country,
      unitsByCountry.get(country.id) ?? [],
      locationsByUnit,
      orphanLocationsByCountry.get(country.id) ?? [],
    ),
  );

  if (countryNodes.length === 1) return countryNodes[0];

  return {
    id: 'org-root',
    label: 'Global Organization',
    level: 'Organization',
    code: 'ORG',
    kind: 'group',
    children: countryNodes,
  };
}

function buildCountryNode(
  country: AdminCountry,
  countryUnits: AdminAdministrativeUnit[],
  locationsByUnit: Map<string, AdminLocation[]>,
  orphanLocations: AdminLocation[],
): HierarchyNode {
  const byId = new Map(countryUnits.map((unit) => [unit.id, unit]));
  const childrenByParent = new Map<string | null, AdminAdministrativeUnit[]>();

  for (const unit of countryUnits) {
    const parentId = unit.parent?.id ?? null;
    if (parentId && !byId.has(parentId)) {
      const roots = childrenByParent.get(null) ?? [];
      roots.push(unit);
      childrenByParent.set(null, roots);
      continue;
    }
    const bucket = childrenByParent.get(parentId) ?? [];
    bucket.push(unit);
    childrenByParent.set(parentId, bucket);
  }

  const buildUnitNode = (unit: AdminAdministrativeUnit): HierarchyNode => {
    const childUnits = (childrenByParent.get(unit.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(buildUnitNode);
    const locationNodes = (locationsByUnit.get(unit.id) ?? [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(
        (location): HierarchyNode => ({
          id: location.id,
          label: location.name,
          level: 'Location',
          code: location.timezone,
          parent: unit.name,
          parentId: unit.id,
          kind: 'location',
          countryId: country.id,
        }),
      );

    return {
      id: unit.id,
      label: unit.name,
      level: unit.administrative_level?.name ?? 'Administrative Unit',
      code: unit.reference_code ?? unit.administrative_level?.code ?? unit.id.slice(0, 8),
      parent: unit.parent?.name ?? country.name,
      parentId: unit.parent?.id,
      kind: 'unit',
      countryId: country.id,
      children: [...childUnits, ...locationNodes],
    };
  };

  const rootUnits = (childrenByParent.get(null) ?? [])
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(buildUnitNode);

  const orphanLocationNodes = orphanLocations
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(
      (location): HierarchyNode => ({
        id: location.id,
        label: location.name,
        level: 'Location',
        code: location.timezone,
        parent: country.name,
        parentId: undefined,
        kind: 'location',
        countryId: country.id,
      }),
    );

  return {
    id: country.id,
    label: country.name,
    level: 'Country',
    code: country.iso_code,
    kind: 'country',
    countryId: country.id,
    children: [...rootUnits, ...orphanLocationNodes],
  };
}

export function collectExpandableIds(node: HierarchyNode): string[] {
  const ids: string[] = [];
  const walk = (current: HierarchyNode) => {
    if (current.children?.length) {
      ids.push(current.id);
      current.children.forEach(walk);
    }
  };
  walk(node);
  return ids;
}

export function findHierarchyNode(node: HierarchyNode, id: string): HierarchyNode | null {
  if (node.id === id) return node;
  for (const child of node.children ?? []) {
    const found = findHierarchyNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Flatten units eligible as move targets (exclude self and descendants). */
export function collectMovableUnitOptions(
  root: HierarchyNode,
  movingId: string,
): Array<{ id: string; label: string; level: string }> {
  const excluded = new Set<string>();
  const mark = (node: HierarchyNode | null) => {
    if (!node) return;
    excluded.add(node.id);
    node.children?.forEach(mark);
  };
  mark(findHierarchyNode(root, movingId));

  const options: Array<{ id: string; label: string; level: string }> = [];
  const walk = (node: HierarchyNode) => {
    if (node.kind === 'unit' && !excluded.has(node.id)) {
      options.push({ id: node.id, label: node.label, level: node.level });
    }
    node.children?.forEach(walk);
  };
  walk(root);
  return options;
}
