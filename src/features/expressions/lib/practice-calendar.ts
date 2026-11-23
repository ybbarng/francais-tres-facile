// 연습 범위를 고르는 달력(항공권 예약처럼)의 계산. 화면 없이 테스트할 수 있게 순수 함수로 둔다.
// sessionName 은 "MM-DD" 라 연도가 없어서, 요일을 맞추려고 오늘 날짜로 연도를 붙인다.
import type { PracticeRange, RangeMode, SessionOption } from "./practice-range";

export interface CalendarDate {
  year: number;
  /** 1~12 */
  month: number;
  day: number;
}

export interface CalendarDay {
  day: number;
  /** "MM-DD" */
  name: string;
  /** 날짜 순서를 비교할 수(YYYYMMDD) */
  ordinal: number;
  /** 그날 세션. 없으면 누를 수 없다 */
  option: SessionOption | null;
  isToday: boolean;
}

export interface CalendarMonth {
  year: number;
  month: number;
  /** 월요일부터 7칸씩. 달 앞뒤 빈칸은 null */
  cells: (CalendarDay | null)[];
}

const pad = (n: number) => String(n).padStart(2, "0");

export const ordinalOf = (d: CalendarDate) => d.year * 10000 + d.month * 100 + d.day;

/** 그 시각의 서울 날짜 */
export function seoulDate(date: Date): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * 세션이 있는 달들(session 순). 첫 달의 연도는 오늘 연도, 단 첫 달이 오늘 달보다 뒤면 작년.
 * 달이 줄면(12 → 1) 해가 바뀐 것으로 보고 연도를 하나 올린다
 */
export function calendarMonths(
  options: readonly SessionOption[],
  today: CalendarDate
): CalendarMonth[] {
  const sorted = [...options].sort((a, b) => a.session - b.session);
  const groups: { year: number; month: number; byDay: Map<number, SessionOption> }[] = [];
  for (const o of sorted) {
    const [month, day] = o.name.split("-").map(Number);
    const last = groups[groups.length - 1];
    if (!last || last.month !== month) {
      const year = !last
        ? month > today.month
          ? today.year - 1
          : today.year
        : month < last.month
          ? last.year + 1
          : last.year;
      groups.push({ year, month, byDay: new Map() });
    }
    groups[groups.length - 1].byDay.set(day, o);
  }
  const todayOrdinal = ordinalOf(today);
  return groups.map(({ year, month, byDay }) => {
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    // getUTCDay: 일요일 0. 월요일 시작이라 월=0 … 일=6 으로 옮긴다
    const lead = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    const cells: (CalendarDay | null)[] = Array.from({ length: lead }, () => null);
    for (let day = 1; day <= days; day++) {
      const ordinal = ordinalOf({ year, month, day });
      cells.push({
        day,
        name: `${pad(month)}-${pad(day)}`,
        ordinal,
        option: byDay.get(day) ?? null,
        isToday: ordinal === todayOrdinal,
      });
    }
    while (cells.length % 7) cells.push(null);
    return { year, month, cells };
  });
}

/** 세션 이름 → 달력 위 날짜 순서 수 */
export function sessionOrdinals(months: readonly CalendarMonth[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const m of months) {
    for (const c of m.cells) if (c?.option) out.set(c.name, c.ordinal);
  }
  return out;
}

/** 그 세션이 있는 달의 번호. 없으면 마지막 달 */
export function monthIndexOf(months: readonly CalendarMonth[], name: string): number {
  const i = months.findIndex((m) => m.cells.some((c) => c?.option && c.name === name));
  return i === -1 ? months.length - 1 : i;
}

/** 칠할 범위의 처음·끝 세션 이름. 누적은 첫 세션부터 */
export function rangeEnds(
  range: PracticeRange,
  options: readonly SessionOption[]
): { from: string; to: string } {
  if (range.mode === "single") return { from: range.to, to: range.to };
  if (range.mode === "span") return { from: range.from ?? range.to, to: range.to };
  const first = [...options].sort((a, b) => a.session - b.session)[0];
  return { from: first?.name ?? range.to, to: range.to };
}

export type DayMark = "single" | "start" | "end" | "between" | null;

/** 날짜 칸의 칠하기: 처음·끝은 진하게, 사이는 옅게 */
export function dayMark(ordinal: number, from: number, to: number): DayMark {
  if (ordinal < from || ordinal > to) return null;
  if (from === to) return "single";
  if (ordinal === from) return "start";
  if (ordinal === to) return "end";
  return "between";
}

export interface TapState {
  range: PracticeRange;
  /** 구간에서 시작을 누르고 끝을 기다리는 중인지 */
  picking: boolean;
}

/**
 * 날짜를 눌렀을 때의 다음 범위. 누적·한 세션은 누른 날이 끝.
 * 구간은 첫 탭이 시작, 둘째 탭이 끝(시작보다 앞을 누르면 그것이 새 시작), 셋째 탭은 다시 새 시작
 */
export function tapDay(
  mode: RangeMode,
  state: TapState,
  name: string,
  order: (name: string) => number
): TapState {
  if (mode !== "span") return { range: { mode, to: name }, picking: false };
  const from = state.range.from ?? state.range.to;
  if (!state.picking || state.range.mode !== "span" || order(name) < order(from)) {
    return { range: { mode, from: name, to: name }, picking: true };
  }
  return { range: { mode, from, to: name }, picking: false };
}

/** 고른 범위를 한 줄로: "10-15 ~ 10-30 · 45개", 한 날이면 "10-30 · 3개" */
export function rangeLabel(
  range: PracticeRange,
  options: readonly SessionOption[],
  count: number
): string {
  const { from, to } = rangeEnds(range, options);
  return `${from === to ? to : `${from} ~ ${to}`} · ${count}개`;
}
