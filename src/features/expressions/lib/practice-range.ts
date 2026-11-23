import type { Expression } from "./expressions";

type Sessioned = Pick<Expression, "session" | "sessionName">;

export interface SessionOption {
  session: number;
  name: string;
  /** 그 세션의 표현 수 */
  count: number;
}

/** 연습 범위 방식. 누적(처음~끝), 한 세션만, 구간(시작~끝) */
export type RangeMode = "cumulative" | "single" | "span";

export const RANGE_MODES: readonly RangeMode[] = ["cumulative", "single", "span"];

export const RANGE_MODE_LABELS: Record<RangeMode, string> = {
  cumulative: "누적",
  single: "한 세션",
  span: "구간",
};

/**
 * 고른 연습 범위. 세션은 sessionName("MM-DD")으로 적는다.
 * session 숫자는 데이터가 다시 매겨질 수 있어 저장하지 않는다. from 은 구간(span)에서만 쓴다
 */
export interface PracticeRange {
  mode: RangeMode;
  from?: string;
  to: string;
}

/** 범위를 session 숫자로 푼 것. from 이 null 이면 처음부터(누적) */
export interface RangeBounds {
  from: number | null;
  to: number;
}

const MONTH_DAY = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function isMonthDay(v: unknown): v is string {
  return typeof v === "string" && MONTH_DAY.test(v);
}

/**
 * 저장된 값(서버·localStorage·요청 본문)을 범위로 읽는다. 모양이 틀리면 null.
 * 구간이 아니면 from 은 버리고, 구간인데 from 이 없으면 틀린 것으로 본다
 */
export function parsePracticeRange(v: unknown): PracticeRange | null {
  if (typeof v !== "object" || v === null) return null;
  const { mode, from, to } = v as Record<string, unknown>;
  if (!(RANGE_MODES as readonly unknown[]).includes(mode) || !isMonthDay(to)) return null;
  if (mode === "span") return isMonthDay(from) ? { mode, from, to } : null;
  return { mode: mode as RangeMode, to };
}

/**
 * 고를 수 있는 세션 목록. sessionName 이 있는 표현들의 (session, sessionName) 짝을
 * session 숫자 순으로 중복 없이, 그 세션의 표현 수와 함께 돌려준다.
 * 글자("01-05")가 아니라 숫자로 정렬해 해가 바뀌어도 순서가 맞다
 */
export function sessionOptions(list: readonly Sessioned[]): SessionOption[] {
  const bySession = new Map<number, SessionOption>();
  for (const e of list) {
    if (!e.sessionName) continue;
    const found = bySession.get(e.session);
    if (found) found.count += 1;
    else bySession.set(e.session, { session: e.session, name: e.sessionName, count: 1 });
  }
  return [...bySession.values()].sort((a, b) => a.session - b.session);
}

/** 그 시각의 서울 날짜를 "MM-DD" 로 */
export function seoulMonthDay(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("month")}-${get("day")}`;
}

/**
 * 저장된 범위가 없을 때의 기본값: 누적, 끝은 오늘(MM-DD)을 넘지 않는 가장 최근 세션.
 * 데이터에 아직 배우지 않은 세션이 미리 들어 있어서다. sessionName 에 연도가 없으니 달·날 순서로 비교한다.
 * 그런 세션이 없으면(오늘이 첫 세션보다 앞) 가장 최근 세션. 세션이 하나도 없으면 null
 */
export function defaultRange(
  options: readonly SessionOption[],
  todayMonthDay: string
): PracticeRange | null {
  if (!options.length) return null;
  const past = options.filter((o) => o.name <= todayMonthDay);
  const pick = past.length ? past : options;
  return { mode: "cumulative", to: pick[pick.length - 1].name };
}

/**
 * 화면에서 쓸 범위. 저장된 범위의 세션이 지금 데이터에 다 있으면 그것을, 아니면 기본값.
 * 구간의 시작이 끝보다 뒤면 둘을 바꾼다
 */
export function resolveRange(
  options: readonly SessionOption[],
  saved: PracticeRange | null,
  todayMonthDay: string
): PracticeRange | null {
  if (!saved) return defaultRange(options, todayMonthDay);
  const order = (name: string | undefined) => options.findIndex((o) => o.name === name);
  if (order(saved.to) === -1) return defaultRange(options, todayMonthDay);
  if (saved.mode !== "span") return { mode: saved.mode, to: saved.to };
  if (saved.from === undefined || order(saved.from) === -1) {
    return defaultRange(options, todayMonthDay);
  }
  return order(saved.from) <= order(saved.to)
    ? { mode: "span", from: saved.from, to: saved.to }
    : { mode: "span", from: saved.to, to: saved.from };
}

/** 범위를 session 숫자로 푼다. 범위의 세션이 목록에 없으면 null */
export function rangeBounds(
  options: readonly SessionOption[],
  range: PracticeRange
): RangeBounds | null {
  const sessionOf = (name: string | undefined) => options.find((o) => o.name === name)?.session;
  const to = sessionOf(range.to);
  if (to === undefined) return null;
  if (range.mode === "cumulative") return { from: null, to };
  if (range.mode === "single") return { from: to, to };
  const from = sessionOf(range.from);
  if (from === undefined) return null;
  return from <= to ? { from, to } : { from: to, to: from };
}

/**
 * 문제를 낼 표현. sessionName 이 있는 표현은 from ≤ session ≤ to 일 때 들어간다.
 * sessionName 이 없는 표현(옛 데이터)은 누적일 때만 늘 들어간다. bounds 가 null 이면 전부
 */
export function expressionsInRange<T extends Sessioned>(
  list: readonly T[],
  bounds: RangeBounds | null
): T[] {
  if (bounds === null) return list.slice();
  const { from, to } = bounds;
  return list.filter((e) =>
    e.sessionName ? (from === null || e.session >= from) && e.session <= to : from === null
  );
}

/**
 * 4지선다 오답 보기를 뽑을 표현. 고른 범위의 끝 세션까지 누적이라
 * 한 세션(보통 3개)만 골라도 보기가 모자라지 않다. bounds 가 null 이면 전부
 */
export function distractorPool<T extends Sessioned>(
  list: readonly T[],
  bounds: RangeBounds | null
): T[] {
  return expressionsInRange(list, bounds && { from: null, to: bounds.to });
}
