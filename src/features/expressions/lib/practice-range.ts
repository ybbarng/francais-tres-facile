import type { Expression } from "./expressions";

type Sessioned = Pick<Expression, "session" | "sessionName">;

export interface SessionOption {
  session: number;
  name: string;
}

/**
 * 「마지막으로 한 세션」으로 고를 수 있는 목록. sessionName 이 있는 표현들의 (session, sessionName) 짝을
 * session 숫자 순으로 중복 없이 돌려준다. 글자("01-05")가 아니라 숫자로 정렬해 해가 바뀌어도 순서가 맞다
 */
export function sessionOptions(list: readonly Sessioned[]): SessionOption[] {
  const bySession = new Map<number, string>();
  for (const e of list) {
    if (e.sessionName && !bySession.has(e.session)) bySession.set(e.session, e.sessionName);
  }
  return [...bySession.entries()]
    .sort(([a], [b]) => a - b)
    .map(([session, name]) => ({ session, name }));
}

/** 고른 세션이 없을 때 쓰는 기본값: 데이터의 가장 최근 세션. 날짜별 표현이 없으면 null */
export function latestSession(list: readonly Sessioned[]): number | null {
  const options = sessionOptions(list);
  return options.length ? options[options.length - 1].session : null;
}

/**
 * 연습 범위. sessionName 이 없는 표현(처음 90개)은 늘 들어가고,
 * sessionName 이 있는 표현은 그 session 이 고른 session 이하일 때만 들어간다. null 이면 전부
 */
export function expressionsInRange<T extends Sessioned>(
  list: readonly T[],
  lastSession: number | null
): T[] {
  if (lastSession === null) return list.slice();
  return list.filter((e) => !e.sessionName || e.session <= lastSession);
}
