export interface MonthConfig {
  key: string;
  name: string;
  target: number;
  startIndex: number;
  endIndex: number;
}

export const MONTHS: MonthConfig[] = [
  { key: "janvier", name: "Janvier", target: 31, startIndex: 0, endIndex: 31 },
  { key: "fevrier", name: "Février", target: 28, startIndex: 31, endIndex: 59 },
  { key: "mars", name: "Mars", target: 31, startIndex: 59, endIndex: 90 },
];

/**
 * Build a map from exercise ID to month key based on completion order.
 * Exercises are sorted by completedAt ascending, then sliced into month ranges.
 */
export function buildMonthMap(
  exercises: { id: string; completedAt: Date | string | null }[]
): Map<string, string> {
  const sorted = [...exercises].sort((a, b) => {
    const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
    const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
    return dateA - dateB;
  });

  const map = new Map<string, string>();
  for (const month of MONTHS) {
    const slice = sorted.slice(month.startIndex, month.endIndex);
    for (const ex of slice) {
      map.set(ex.id, month.key);
    }
  }
  return map;
}
