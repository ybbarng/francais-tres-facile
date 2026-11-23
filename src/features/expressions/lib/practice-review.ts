// 표현 연습 문제 검토 기록(docs/EXPRESSIONS-PRACTICE.md)을 읽고, 표현마다 화면이 쓸 모양으로 푼다.
// 기록에는 판단(표현 id·방식 이름·메모)만 있다. 프랑스어 문장은 짝 맞추기용으로 원본과 비교만 한다.
import type { Expression } from "./expressions";

export const PRACTICE_REVIEW_SCHEMA = "ftf/expressions-practice-review@1";

/** 검토 기록의 방식 이름. 화면의 상황 대꾸(context)는 기록에서 situation 이다 */
export type ReviewMethod = "recall" | "situation" | "blank" | "order" | "listen";

export const REVIEW_METHODS: readonly ReviewMethod[] = [
  "recall",
  "situation",
  "blank",
  "order",
  "listen",
];

export interface ReviewSlot {
  alsoFits: string[];
  skip: ReviewMethod[];
  note?: string;
}

export interface ExampleReview extends ReviewSlot {
  /** 검토할 때의 example.fr. 원본과 다르면 이 칸은 쓰지 않는다 */
  text: string;
}

export interface ContextReview extends ReviewSlot {
  /** 짝지을 context 의 cue */
  cue: string;
}

export interface ReviewItem {
  similarMeaning?: string[];
  example?: ExampleReview;
  contexts?: ContextReview[];
}

export interface PracticeReview {
  schema: typeof PRACTICE_REVIEW_SCHEMA;
  reviewedAt: string;
  items: Record<string, ReviewItem>;
}

// ── 형식 확인 ─────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function slotError(v: unknown, keyField: "text" | "cue"): string | null {
  if (!isRecord(v)) return "객체가 아닙니다";
  if (typeof v[keyField] !== "string") return `${keyField} 가 문자열이 아닙니다`;
  if (!isStringArray(v.alsoFits)) return "alsoFits 가 문자열 배열이 아닙니다";
  if (!isStringArray(v.skip)) return "skip 이 문자열 배열이 아닙니다";
  const unknown = v.skip.find((m) => !(REVIEW_METHODS as readonly string[]).includes(m));
  if (unknown !== undefined) return `skip 에 모르는 방식 이름 ${unknown}`;
  if (v.note !== undefined && typeof v.note !== "string") return "note 가 문자열이 아닙니다";
  return null;
}

function itemError(v: unknown): string | null {
  if (!isRecord(v)) return "객체가 아닙니다";
  if (v.similarMeaning !== undefined && !isStringArray(v.similarMeaning)) {
    return "similarMeaning 이 문자열 배열이 아닙니다";
  }
  if (v.example !== undefined) {
    const err = slotError(v.example, "text");
    if (err) return `example: ${err}`;
  }
  if (v.contexts !== undefined) {
    if (!Array.isArray(v.contexts)) return "contexts 가 배열이 아닙니다";
    for (const [i, c] of v.contexts.entries()) {
      const err = slotError(c, "cue");
      if (err) return `contexts[${i}]: ${err}`;
    }
  }
  return null;
}

/** 검토 기록 JSON 의 형식을 확인한다. 틀리면 어디가 틀렸는지 담아 던진다 */
export function parsePracticeReview(json: unknown): PracticeReview {
  if (!isRecord(json) || json.schema !== PRACTICE_REVIEW_SCHEMA) {
    throw new Error(`검토 기록 형식이 ${PRACTICE_REVIEW_SCHEMA} 가 아닙니다`);
  }
  if (typeof json.reviewedAt !== "string") throw new Error("reviewedAt 이 문자열이 아닙니다");
  if (!isRecord(json.items)) throw new Error("items 가 객체가 아닙니다");
  for (const [id, item] of Object.entries(json.items)) {
    const err = itemError(item);
    if (err) throw new Error(`${id}: ${err}`);
  }
  return json as unknown as PracticeReview;
}

export const EMPTY_REVIEW: PracticeReview = {
  schema: PRACTICE_REVIEW_SCHEMA,
  reviewedAt: "",
  items: {},
};

// ── 표현마다 풀기 ─────────────────────────────────────

export interface ResolvedSlot {
  alsoFits: string[];
  skip: ReadonlySet<ReviewMethod>;
}

/** 한 표현의 검토 결과. 짝이 안 맞는 칸은 null */
export interface ExpressionReview {
  /** 검토 기록에 이 표현이 있는지 */
  reviewed: boolean;
  /** 뜻이 거의 같은 표현(양방향으로 모은 것) */
  similarMeaning: ReadonlySet<string>;
  example: ResolvedSlot | null;
  /** expr.contexts 와 같은 순서. cue 가 같은 칸이 없으면 null */
  contexts: (ResolvedSlot | null)[];
}

export type ReviewIndex = ReadonlyMap<string, ExpressionReview>;

const NO_REVIEW = (expr: Expression): ExpressionReview => ({
  reviewed: false,
  similarMeaning: new Set(),
  example: null,
  contexts: (expr.contexts ?? []).map(() => null),
});

/**
 * 검토 기록을 표현마다 푼다. 쓰기 전에 모르는 id·자기 자신·그 context 의 combo 는 걸러 낸다.
 * 예문 칸은 text 가 example.fr 과 같을 때만, context 칸은 cue 가 같은 context 와만 짝짓는다
 */
export function buildReviewIndex(
  review: PracticeReview,
  expressions: readonly Expression[]
): ReviewIndex {
  const known = new Set(expressions.map((e) => e.id));
  const clean = (ids: readonly string[], self: string, combo?: string) =>
    ids.filter((id) => known.has(id) && id !== self && id !== combo);
  const slot = (s: ReviewSlot, self: string, combo?: string): ResolvedSlot => ({
    alsoFits: clean(s.alsoFits, self, combo),
    skip: new Set(s.skip),
  });

  // 뜻이 같다는 것은 양방향이라, 한쪽에만 적혀도 둘 다에 넣는다
  const similar = new Map<string, Set<string>>();
  for (const [id, item] of Object.entries(review.items)) {
    if (!known.has(id)) continue;
    for (const other of clean(item.similarMeaning ?? [], id)) {
      for (const [a, b] of [
        [id, other],
        [other, id],
      ]) {
        const set = similar.get(a) ?? new Set<string>();
        set.add(b);
        similar.set(a, set);
      }
    }
  }

  const index = new Map<string, ExpressionReview>();
  for (const expr of expressions) {
    const item = review.items[expr.id];
    const base = NO_REVIEW(expr);
    const similarMeaning = similar.get(expr.id) ?? base.similarMeaning;
    if (!item) {
      index.set(expr.id, { ...base, similarMeaning });
      continue;
    }
    const ex = item.example;
    index.set(expr.id, {
      reviewed: true,
      similarMeaning,
      example: ex && ex.text === expr.example.fr ? slot(ex, expr.id) : null,
      contexts: (expr.contexts ?? []).map((c) => {
        const found = item.contexts?.find((r) => r.cue === c.cue);
        return found ? slot(found, expr.id, c.combo) : null;
      }),
    });
  }
  return index;
}

export function reviewOf(index: ReviewIndex | undefined, expr: Expression): ExpressionReview {
  return index?.get(expr.id) ?? NO_REVIEW(expr);
}

/** 이 칸이 그 방식을 건너뛰라고 하는지 */
export function skips(slot: ResolvedSlot | null, method: ReviewMethod): boolean {
  return slot?.skip.has(method) ?? false;
}

// ── 데이터와 맞춰 검사 ─────────────────────────────────

/** 검사에 필요한 만큼의 표현 모양(원본 전체가 아니어도 된다) */
export interface ReviewTarget {
  id: string;
  example: { fr: string };
  contexts?: { cue: string; combo?: string }[];
}

/**
 * 검토 기록을 원본과 맞춰 본 잘못. 모르는 id, 자기 자신을 alsoFits·similarMeaning 에 넣음,
 * 같은 context 의 combo 와 겹침, contexts 칸이 원본보다 많음. 없으면 빈 배열
 */
export function reviewProblems(
  review: PracticeReview,
  expressions: readonly ReviewTarget[]
): string[] {
  const byId = new Map(expressions.map((e) => [e.id, e]));
  const out: string[] = [];
  const checkIds = (where: string, ids: readonly string[], self: string) => {
    for (const id of ids) {
      if (id === self) out.push(`${where}: 자기 자신(${id})`);
      else if (!byId.has(id)) out.push(`${where}: 모르는 id ${id}`);
    }
  };
  for (const [id, item] of Object.entries(review.items)) {
    const expr = byId.get(id);
    if (!expr) {
      out.push(`${id}: 원본에 없는 표현`);
      continue;
    }
    checkIds(`${id}.similarMeaning`, item.similarMeaning ?? [], id);
    if (item.example) checkIds(`${id}.example.alsoFits`, item.example.alsoFits, id);
    const contexts = item.contexts ?? [];
    if (contexts.length > (expr.contexts?.length ?? 0)) {
      out.push(
        `${id}.contexts: ${contexts.length}칸으로 원본(${expr.contexts?.length ?? 0})보다 많다`
      );
    }
    for (const c of contexts) {
      const where = `${id}.contexts[${c.cue}]`;
      checkIds(`${where}.alsoFits`, c.alsoFits, id);
      const combo = expr.contexts?.find((x) => x.cue === c.cue)?.combo;
      if (combo && c.alsoFits.includes(combo)) out.push(`${where}: combo(${combo})와 겹친다`);
    }
  }
  return out;
}

export interface ReviewTodo {
  /** 검토 기록에 없는 표현 id */
  unreviewed: string[];
  /** text 가 원본 example.fr 과 달라진 표현 id */
  staleExamples: string[];
  /** 검토 기록에 짝이 없는 context(원본에 새로 생겼거나 cue 가 바뀐 것) */
  unmatchedContexts: { id: string; cue: string }[];
}

/** 검토를 다시 돌릴 곳: 기록에 없는 표현과, 예문·cue 가 원본과 달라진 칸 */
export function reviewTodo(
  review: PracticeReview,
  expressions: readonly ReviewTarget[]
): ReviewTodo {
  const todo: ReviewTodo = { unreviewed: [], staleExamples: [], unmatchedContexts: [] };
  for (const e of expressions) {
    const item = review.items[e.id];
    if (!item) {
      todo.unreviewed.push(e.id);
      continue;
    }
    if (!item.example || item.example.text !== e.example.fr) todo.staleExamples.push(e.id);
    for (const c of e.contexts ?? []) {
      if (!item.contexts?.some((r) => r.cue === c.cue)) {
        todo.unmatchedContexts.push({ id: e.id, cue: c.cue });
      }
    }
  }
  return todo;
}

/** 답한 뒤 "이런 표현도 자연스러워요"에 보일 표현 수 */
export const ALSO_FITS_SHOWN = 3;

export interface AlsoFitsExpression {
  id: string;
  fr: string;
  ko: string;
}

/** alsoFits 가운데 범위(pool) 안에 있는 표현만, 적힌 순서로 최대 max 개 */
export function alsoFitsInPool(
  ids: readonly string[],
  pool: readonly Expression[],
  max: number = ALSO_FITS_SHOWN
): AlsoFitsExpression[] {
  const byId = new Map(pool.map((e) => [e.id, e]));
  return ids
    .flatMap((id) => {
      const e = byId.get(id);
      return e ? [{ id: e.id, fr: e.fr, ko: e.ko }] : [];
    })
    .slice(0, max);
}
