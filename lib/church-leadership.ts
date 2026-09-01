/** Leadership titles accepted by POST /admin/church/role-assignments (role_type=leader). */
export const CHURCH_LEADERSHIP_TITLES = [
  'Senior Pastor',
  'Associate Pastor',
  'Assistant Pastor',
  'Elder',
  'Deacon',
  'Church Administrator',
  'Ministry Head',
] as const;

export const MAX_ACTIVE_CHURCH_LEADERS = 5;

export type ChurchLeadershipTitle = (typeof CHURCH_LEADERSHIP_TITLES)[number];
