/** Leadership titles accepted by POST /admin/church/role-assignments (role_type=leader). */
export const CHURCH_LEADERSHIP_TITLES = [
  'Senior Pastor',
  'Resident Pastor',
  'Associate Pastor',
  'Assistant Pastor',
  'Minister',
  'Evangelist',
  'Prophet',
  'Elder',
  'Deacon',
  'Deaconess',
  'President',
  'Church Administrator',
  'Ministry Head',
] as const;

export const MAX_ACTIVE_CHURCH_LEADERS = 25;

export type ChurchLeadershipTitle = (typeof CHURCH_LEADERSHIP_TITLES)[number];
