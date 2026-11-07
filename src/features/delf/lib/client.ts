// 화면에서만 쓰는 도우미

import type { DelfLevel } from "./set";

export interface DelfScoreJson {
  score: number;
  max: number;
}

/** /api/delf/attempts 가 돌려주는 기록 한 줄 */
export interface DelfAttemptSummary {
  id: string;
  setId: string;
  co: DelfScoreJson;
  ce: DelfScoreJson;
  total: DelfScoreJson;
  createdAt: string;
}

export type DelfBestMap = Record<string, DelfAttemptSummary & { count: number }>;

/** 초 → "m:ss". 음수면 앞에 + 를 붙여 넘긴 시간으로 보인다 */
export function formatClock(seconds: number): string {
  const over = seconds < 0;
  const s = Math.abs(Math.round(seconds));
  const text = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  return over ? `+${text}` : text;
}

/** 0.5 단위 점수를 보기 좋게(1, 1.5) */
export function formatScore(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function percent(s: DelfScoreJson): number {
  return s.max === 0 ? 0 : Math.round((s.score / s.max) * 100);
}

export const LEVEL_BADGE: Record<DelfLevel, "a1" | "a2" | "b1" | "b2"> = {
  A1: "a1",
  A2: "a2",
  B1: "b1",
  B2: "b2",
};

/** 클립보드에 글을 넣는다. 권한이 없는 브라우저에서는 숨은 textarea 로 한 번 더 해 본다 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export function readStorage<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: unknown): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 이번 방문에만 기억한다
  }
}
