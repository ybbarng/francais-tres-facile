import { describe, expect, it } from "vitest";
import { type Expression, parseExpressions } from "../src/features/expressions/lib/expressions";
import { isAccepted, makeQuestion, type Question } from "../src/features/expressions/lib/practice";
import {
  alsoFitsInPool,
  buildReviewIndex,
  PRACTICE_REVIEW_SCHEMA,
  type PracticeReview,
  parsePracticeReview,
  type ReviewItem,
  reviewTodo,
} from "../src/features/expressions/lib/practice-review";
import sample from "./mocks/expressions-practice-sample.json";

const pool = parseExpressions(sample).expressions;
const byId = (id: string) => {
  const e = pool.find((x) => x.id === id);
  if (!e) throw new Error(`no ${id}`);
  return e;
};

/** 시드가 같으면 같은 수열을 내는 난수(mulberry32) */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SEEDS = Array.from({ length: 30 }, (_, i) => i + 1);

function reviewWith(items: Record<string, ReviewItem>): PracticeReview {
  return { schema: PRACTICE_REVIEW_SCHEMA, reviewedAt: "2026-11-23", items };
}

/** E91 의 하나뿐인 context 칸(cue 는 원본 그대로) */
const e91Context = (alsoFits: string[], skip: ("situation" | "blank")[] = []) => ({
  cue: byId("E91").contexts?.[0].cue ?? "",
  alsoFits,
  skip,
});

function questions(
  mode: Parameters<typeof makeQuestion>[0],
  expr: Expression,
  review?: PracticeReview,
  list: readonly Expression[] = pool
): Question[] {
  const index = review && buildReviewIndex(review, pool);
  return SEEDS.flatMap((seed) => {
    const q = makeQuestion(mode, expr, list, {
      canSpeak: true,
      random: seeded(seed),
      review: index,
    });
    return q ? [q] : [];
  });
}

const choiceIds = (qs: Question[]) =>
  new Set(qs.flatMap((q) => ("choices" in q ? q.choices.map((c) => c.id) : [])));

describe("형식 확인", () => {
  const good = {
    schema: PRACTICE_REVIEW_SCHEMA,
    reviewedAt: "2026-11-23",
    items: {
      E91: {
        similarMeaning: ["E92"],
        example: { text: "Ça alors !", alsoFits: ["E92"], skip: ["order"], note: "" },
        contexts: [{ cue: "x", alsoFits: [], skip: ["situation", "blank"] }],
      },
    },
  };

  it("형식대로 쓴 기록은 그대로 읽는다", () => {
    expect(parsePracticeReview(good).items.E91.similarMeaning).toEqual(["E92"]);
  });

  it("skip 에 모르는 방식 이름(화면 이름 context 등)이 있으면 던진다", () => {
    const bad = structuredClone(good);
    bad.items.E91.contexts[0].skip = ["context"];
    expect(() => parsePracticeReview(bad)).toThrow(
      "E91: contexts[0]: skip 에 모르는 방식 이름 context"
    );
  });

  it("alsoFits 가 배열이 아니면 던진다", () => {
    const bad = { ...good, items: { E91: { example: { text: "a", alsoFits: "E92", skip: [] } } } };
    expect(() => parsePracticeReview(bad)).toThrow(
      "E91: example: alsoFits 가 문자열 배열이 아닙니다"
    );
  });

  it("schema 가 다르면 던진다", () => {
    expect(() => parsePracticeReview({ ...good, schema: "ftf/other@1" })).toThrow(/형식이/);
  });
});

describe("짝 맞추기와 거르기", () => {
  it("예문 text·context cue 가 원본과 다르면 그 칸은 쓰지 않는다", () => {
    const index = buildReviewIndex(
      reviewWith({
        E91: {
          example: { text: "Ça alors ! (옛 문장)", alsoFits: ["E92"], skip: [] },
          contexts: [{ cue: "Je me suis marié hier !", alsoFits: ["E92"], skip: [] }],
        },
      }),
      pool
    );
    const r = index.get("E91");
    expect(r?.reviewed).toBe(true);
    expect(r?.example).toBeNull();
    expect(r?.contexts).toEqual([null]);
  });

  it("모르는 id·자기 자신·그 context 의 combo 는 쓰기 전에 걸러 낸다", () => {
    const e01 = byId("E01");
    const index = buildReviewIndex(
      reviewWith({
        E01: {
          example: { text: e01.example.fr, alsoFits: ["E01", "E999", "E16"], skip: [] },
          // 셋째 context 의 combo 는 E02
          contexts: [{ cue: e01.contexts?.[2].cue ?? "", alsoFits: ["E02", "E42"], skip: [] }],
        },
      }),
      pool
    );
    const r = index.get("E01");
    expect(r?.example?.alsoFits).toEqual(["E16"]);
    expect(r?.contexts[2]?.alsoFits).toEqual(["E42"]);
    expect(r?.contexts[0]).toBeNull();
  });
});

describe("상황 대꾸", () => {
  it("검토한 칸의 alsoFits 는 오답 보기에 나오지 않고 맞는 것으로 친다", () => {
    const review = reviewWith({ E91: { contexts: [e91Context(["E42"])] } });
    const qs = questions("context", byId("E91"), review);
    expect(qs).toHaveLength(SEEDS.length);
    expect(choiceIds(qs).has("E42")).toBe(false);
    expect(isAccepted(qs[0], "E42")).toBe(true);
    expect(isAccepted(qs[0], "E16")).toBe(false);
  });

  it("검토한 칸이면 같은 묶음 표현도 오답으로 낼 수 있다", () => {
    const review = reviewWith({ E91: { contexts: [e91Context([])] } });
    expect(choiceIds(questions("context", byId("E91"), review)).has("E92")).toBe(true);
  });

  it("검토 기록이 없으면 같은 묶음(F) 표현 E92 를 오답에서 뺀다", () => {
    const qs = questions("context", byId("E91"));
    expect(qs).toHaveLength(SEEDS.length);
    expect(choiceIds(qs).has("E92")).toBe(false);
  });

  it("skip 에 situation 이 있는 context 로는 내지 않는다", () => {
    const e01 = byId("E01");
    const contexts = (e01.contexts ?? [])
      .filter((_, i) => i !== 3)
      .map((c) => ({ cue: c.cue, alsoFits: [], skip: ["situation" as const] }));
    const qs = questions("context", e01, reviewWith({ E01: { contexts } }));
    expect(new Set(qs.map((q) => (q.mode === "context" ? q.cue : "")))).toEqual(
      new Set([e01.contexts?.[3].cue])
    );
  });

  it("모든 context 가 skip 이면 상황 대꾸 문제를 만들지 않는다", () => {
    const review = reviewWith({ E91: { contexts: [e91Context([], ["situation"])] } });
    expect(questions("context", byId("E91"), review)).toEqual([]);
  });

  it("alsoFits 를 빼고 보기가 모자라면 그 문제는 건너뛴다", () => {
    const review = reviewWith({ E91: { contexts: [e91Context(["E42", "E112"])] } });
    const small = ["E91", "E92", "E42", "E112", "E166"].map(byId);
    expect(questions("context", byId("E91"), review, small)).toEqual([]);
  });

  it("답한 뒤 보일 alsoFits 는 범위 안 표현만 최대 3개, fr·ko 와 함께", () => {
    const review = reviewWith({ E91: { contexts: [e91Context(["E01", "E16", "E42", "E112"])] } });
    const inRange = pool.filter((e) => e.id !== "E01");
    const [q] = questions("context", byId("E91"), review, inRange);
    if (q?.mode !== "context") throw new Error("context 문제가 아님");
    expect(q.alsoFits).toEqual([
      { id: "E16", fr: byId("E16").fr, ko: byId("E16").ko },
      { id: "E42", fr: byId("E42").fr, ko: byId("E42").ko },
      { id: "E112", fr: byId("E112").fr, ko: byId("E112").ko },
    ]);
  });
});

describe("빈칸·순서·떠올리기", () => {
  it("빈칸: 그 문장 칸의 alsoFits 는 오답에서 빠지고 답한 뒤 보인다", () => {
    const e92 = byId("E92");
    const review = reviewWith({
      E92: {
        example: { text: e92.example.fr, alsoFits: ["E91"], skip: [] },
        contexts: [{ cue: e92.contexts?.[0].cue ?? "", alsoFits: ["E91"], skip: [] }],
      },
    });
    const qs = questions("blank", e92, review);
    expect(qs.length).toBeGreaterThan(0);
    expect(choiceIds(qs).has("E91")).toBe(false);
    expect(qs.every((q) => q.mode === "blank" && q.alsoFits[0]?.id === "E91")).toBe(true);
  });

  it("빈칸: 모든 문장이 skip 이면 만들지 않는다", () => {
    const e91 = byId("E91");
    const review = reviewWith({
      E91: {
        example: { text: e91.example.fr, alsoFits: [], skip: ["blank"] },
        contexts: [e91Context([], ["blank"])],
      },
    });
    expect(questions("blank", e91, review)).toEqual([]);
  });

  it("순서 맞추기·떠올리기: 예문 칸 skip 이면 만들지 않는다", () => {
    const e42 = byId("E42");
    const review = reviewWith({
      E42: { example: { text: e42.example.fr, alsoFits: [], skip: ["order", "recall"] } },
    });
    expect(questions("order", e42, review)).toEqual([]);
    expect(questions("recall", e42, review)).toEqual([]);
    expect(questions("order", e42)).toHaveLength(SEEDS.length);
  });
});

describe("듣고 고르기", () => {
  const review = reviewWith({ E91: { similarMeaning: ["E92"] } });

  it("similarMeaning 표현은 뜻 고르기 오답에 나오지 않는다", () => {
    expect(choiceIds(questions("listen", byId("E91"), review)).has("E92")).toBe(false);
  });

  it("반대쪽(E92 문제)에서도 E91 이 빠진다", () => {
    expect(choiceIds(questions("listen", byId("E92"), review)).has("E91")).toBe(false);
    expect(choiceIds(questions("listen", byId("E92"))).has("E91")).toBe(true);
  });
});

describe("alsoFitsInPool", () => {
  it("범위에 없는 id 는 건너뛰고 적힌 순서로 최대 3개", () => {
    const ids = ["E92", "E999", "E01", "E02", "E16"];
    const inRange = pool.filter((e) => e.id !== "E01");
    expect(alsoFitsInPool(ids, inRange).map((e) => e.id)).toEqual(["E92", "E02", "E16"]);
  });
});

describe("reviewTodo", () => {
  it("기록에 없는 표현, 예문이 바뀐 표현, 짝 없는 context 를 뽑는다", () => {
    const e91 = byId("E91");
    const todo = reviewTodo(
      reviewWith({
        E91: { example: { text: e91.example.fr, alsoFits: [], skip: [] }, contexts: [] },
        E92: { example: { text: "옛 문장", alsoFits: [], skip: [] } },
      }),
      [e91, byId("E92"), byId("E112")]
    );
    expect(todo).toEqual({
      unreviewed: ["E112"],
      staleExamples: ["E92"],
      unmatchedContexts: [
        { id: "E91", cue: e91.contexts?.[0].cue },
        { id: "E92", cue: byId("E92").contexts?.[0].cue },
      ],
    });
  });
});
