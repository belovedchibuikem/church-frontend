export type AttendanceCounts = {
  males: number;
  females: number;
  children: number;
  total: number;
};

export function attendanceCounts(row: Record<string, unknown>): AttendanceCounts {
  let males = Number(row.males ?? row.male ?? 0);
  const females = Number(row.females ?? row.female ?? 0);
  const children = Number(row.children ?? 0);
  if (males === 0 && females === 0) males = Number(row.adults ?? 0);
  const total = row.total == null ? males + females + children : Number(row.total);
  return { males, females, children, total };
}

export function attendanceHeadcount(row: Record<string, unknown>): number {
  return attendanceCounts(row).total;
}
