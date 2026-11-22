import { describe, expect, it } from "vitest";
import { type Expression, parseExpressions } from "../src/features/expressions/lib/expressions";
import {
  buildQuestion,
  findBlank,
  fixedFragments,
  makeQuestion,
  pickDistractors,
  planRound,
  pointsFor,
  queueAfterAnswer,
  type RoundItem,
  scrambleOrder,
  splitTokens,
} from "../src/features/expressions/lib/practice";
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

/** 처음 몇 번은 정한 값을 내고, 그다음은 시드 난수를 쓴다 */
function startingWith(values: number[], seed = 1): () => number {
  const rest = seeded(seed);
  let i = 0;
  return () => (i < values.length ? values[i++] : rest());
}

// study-french 원본의 E53(예문이 13토막이라 순서 맞추기에 쓰지 않는 문장)
const e53: Expression = {
  id: "E53",
  group: "D",
  fr: "…, eux, le font.",
  ko: "…, 그 사람들은 그렇게 해.",
  example: {
    fr: "Moi, je ne cuisine pas. Mes parents, eux, le font tous les jours.",
    ko: "난 요리 안 해. 부모님은 매일 하셔.",
  },
  session: 18,
  learned: true,
};

describe("fixedFragments", () => {
  it("대안(/)과 빈자리(…)로 나누고 긴 것부터 둔다", () => {
    expect(fixedFragments("Je suis à … / Je suis en train de …")).toEqual([
      "Je suis en train de",
      "Je suis à",
    ]);
  });

  it("괄호 덧붙임을 떼고 끝 문장부호를 뺀다", () => {
    expect(fixedFragments("J'en ai marre (de …).")).toEqual(["J'en ai marre", "de"]);
  });

  it("한국어 안내(+ 동사원형)를 뺀다", () => {
    expect(fixedFragments("J'ai failli + 동사원형")).toEqual(["J'ai failli"]);
  });

  it("앞에 빈자리가 있는 표현은 쉼표를 떼고 남은 부분만", () => {
    expect(fixedFragments(e53.fr)).toEqual(["eux, le font"]);
  });
});

describe("findBlank", () => {
  it("대소문자가 달라도 문장 속 위치와 원래 글자를 찾는다", () => {
    expect(findBlank("Pardon, tu peux répéter, s'il te plaît ?", byId("E01").fr)).toEqual({
      start: 8,
      end: 38,
      text: "tu peux répéter, s'il te plaît",
    });
  });

  it("둥근 아포스트로피(’)와 곧은 것(')을 같게 본다", () => {
    expect(findBlank("Oui, mais j’ai failli le rater !", byId("E42").fr)?.text).toBe("j’ai failli");
  });

  it("대안이 둘 다 있으면 가장 긴 조각을 가린다", () => {
    expect(findBlank(byId("E16").example.fr, byId("E16").fr)?.text).toBe("Je suis en train de");
  });

  it("문장에 고정 부분이 통째로 없으면 null", () => {
    expect(findBlank(byId("E01").example.fr, byId("E01").fr)).toBeNull();
  });

  it("단어 중간에 걸친 것은 찾지 않는다", () => {
    expect(findBlank("Ça marcherait bien.", "Ça marche !")).toBeNull();
  });
});

describe("pickDistractors", () => {
  const key = (e: Expression) => e.fr;

  it("정답 표현과 combo 표현을 빼고 서로 다른 3개를 고른다", () => {
    const picked = pickDistractors(pool, byId("E01"), {
      key,
      excludeIds: ["E02"],
      random: seeded(7),
    });
    const ids = picked?.map((e) => e.id) ?? [];
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain("E01");
    expect(ids).not.toContain("E02");
    expect(new Set(picked?.map(key)).size).toBe(3);
  });

  it("fr 이 정답과 같은 다른 표현은 보기로 내지 않는다", () => {
    const twin = { ...byId("E92"), id: "E200", fr: byId("E01").fr };
    const small = [byId("E01"), twin, byId("E91"), byId("E92"), byId("E112")];
    for (const seed of [1, 2, 3, 4, 5]) {
      const ids = pickDistractors(small, byId("E01"), { key, random: seeded(seed) })?.map(
        (e) => e.id
      );
      expect(ids?.sort()).toEqual(["E112", "E91", "E92"]);
    }
  });

  it("뺄 것을 빼고 3개가 안 되면 null", () => {
    const small = [byId("E01"), byId("E02"), byId("E91"), byId("E92")];
    expect(pickDistractors(small, byId("E01"), { key, excludeIds: ["E02"] })).toBeNull();
  });
});

describe("splitTokens·scrambleOrder", () => {
  it("문장부호만 있는 토막은 앞 단어에, 여는 따옴표는 뒤 단어에 붙인다", () => {
    expect(splitTokens("Qu'est-ce que ça veut dire, « crevé » ?")).toEqual([
      "Qu'est-ce",
      "que",
      "ça",
      "veut",
      "dire,",
      "« crevé » ?",
    ]);
  });

  it("토막을 공백으로 이으면 원문이 된다", () => {
    for (const e of pool) {
      expect(splitTokens(e.example.fr).join(" ")).toBe(e.example.fr);
    }
  });

  it("원래 순서와 같게 섞이면 한 칸 돌려 다르게 한다", () => {
    const tokens = ["J'ai", "failli", "rater", "le", "train."];
    // 0.999 는 Fisher–Yates 가 자리를 하나도 바꾸지 않게 한다
    expect(scrambleOrder(tokens, () => 0.999)).toEqual([1, 2, 3, 4, 0]);
  });

  it("모든 토막이 같은 글이면 섞을 수 없어 null", () => {
    expect(scrambleOrder(["si", "si", "si"])).toBeNull();
  });
});

describe("makeQuestion", () => {
  it("상황 대꾸: 고른 context 의 combo 표현은 보기에 없고 정답은 한 번만 있다", () => {
    for (let seed = 1; seed <= 20; seed++) {
      // 첫 난수 0.5 → E01 의 다섯 context 중 combo 가 E02 인 셋째
      const q = makeQuestion("context", byId("E01"), pool, {
        canSpeak: true,
        random: startingWith([0.5], seed),
      });
      if (q?.mode !== "context") throw new Error("context 문제가 아님");
      expect(q.cue).toBe("Le chef dit que la sauce est trop salée.");
      expect(q.choices).toHaveLength(4);
      expect(q.choices.filter((c) => c.id === "E01")).toHaveLength(1);
      expect(q.choices.map((c) => c.id)).not.toContain("E02");
    }
  });

  it("빈칸: 보기 첫 글자를 정답의 대소문자에 맞추고 서로 다르다", () => {
    const q = makeQuestion("blank", byId("E02"), pool, {
      canSpeak: true,
      random: seeded(3),
    });
    if (q?.mode !== "blank") throw new Error("blank 문제가 아님");
    const answer = q.choices.find((c) => c.id === "E02")?.label;
    expect(answer).toBe(q.sentence.slice(q.spot.start, q.spot.end));
    const firstUpper = (s: string) => s[0] !== s[0].toLowerCase();
    expect(new Set(q.choices.map((c) => firstUpper(c.label))).size).toBe(1);
    expect(new Set(q.choices.map((c) => c.label.toLowerCase())).size).toBe(4);
  });

  it("순서 맞추기: 12토막이 넘는 예문은 쓰지 않는다", () => {
    expect(makeQuestion("order", e53, [e53], { canSpeak: true })).toBeNull();
  });

  it("듣고 고르기: 음성이 없는 기기에서는 만들지 않는다", () => {
    expect(makeQuestion("listen", byId("E91"), pool, { canSpeak: false })).toBeNull();
  });
});

describe("buildQuestion", () => {
  it("다시 내는 문제는 지난번 방식을 피한다", () => {
    for (const seed of [1, 2, 3, 4]) {
      const q = buildQuestion(byId("E91"), pool, ["recall", "order"], {
        canSpeak: true,
        avoid: "recall",
        random: seeded(seed),
      });
      expect(q?.mode).toBe("order");
    }
  });

  it("고른 방식의 재료가 없으면 다른 고른 방식으로 낸다", () => {
    const q = buildQuestion(byId("E91"), pool, ["listen", "recall"], {
      canSpeak: false,
      random: seeded(1),
    });
    expect(q?.mode).toBe("recall");
  });
});

describe("한 판 진행", () => {
  const item = (id: string, retry = 0): RoundItem => ({ expressionId: id, retry });
  const rest = [item("E02"), item("E16"), item("E42"), item("E91"), item("E92")];

  it("틀리면 세 문제 뒤에 지난 방식을 피하도록 다시 넣는다", () => {
    const q = queueAfterAnswer(rest, item("E01"), false, "blank");
    expect(q.map((i) => i.expressionId)).toEqual(["E02", "E16", "E42", "E01", "E91", "E92"]);
    expect(q[3]).toEqual({ expressionId: "E01", retry: 1, avoid: "blank" });
  });

  it("남은 문제가 적으면 맨 끝에 넣는다", () => {
    const q = queueAfterAnswer([item("E02")], item("E01"), false, "recall");
    expect(q.map((i) => i.expressionId)).toEqual(["E02", "E01"]);
  });

  it("맞히면 다시 넣지 않는다(다시 나온 문제를 맞히면 사라진다)", () => {
    expect(queueAfterAnswer(rest, item("E01", 1), true, "recall")).toEqual(rest);
  });

  it("다시 나온 횟수가 상한(2번)이면 또 틀려도 넣지 않는다", () => {
    expect(queueAfterAnswer(rest, item("E01", 2), false, "recall")).toEqual(rest);
  });

  it("판에 낼 표현은 대상에서 정한 수만큼, 같은 난수면 같은 순서", () => {
    const a = planRound(pool, 5, seeded(9));
    expect(a).toHaveLength(5);
    expect(planRound(pool, 5, seeded(9))).toEqual(a);
    expect(planRound(pool.slice(0, 3), 10, seeded(9))).toHaveLength(3);
  });

  it("콤보가 이어질수록 점수를 2점씩 더 주고 +10 에서 멈춘다", () => {
    expect([1, 2, 3, 6, 7, 20].map(pointsFor)).toEqual([10, 12, 14, 20, 20, 20]);
  });
});
