// 실제 검토 기록(src/features/expressions/data/practice-review.json)을 원본 표본과 맞춰 검사한다.
// 검토 기록을 채우거나 다시 돌린 뒤 이 테스트가 통과해야 한다(docs/EXPRESSIONS-PRACTICE.md).
import { describe, expect, it } from "vitest";
import reviewJson from "../src/features/expressions/data/practice-review.json";
import {
  PRACTICE_REVIEW_SCHEMA,
  parsePracticeReview,
  reviewProblems,
} from "../src/features/expressions/lib/practice-review";
import data from "./mocks/expressions-review-data.json";

const expressions = data.expressions;

describe("practice-review.json", () => {
  it("형식(schema·방식 이름·배열 모양)이 맞다", () => {
    expect(() => parsePracticeReview(reviewJson)).not.toThrow();
  });

  it("원본과 맞춰 본 잘못이 없다(모르는 id, 자기 자신, combo 겹침, contexts 칸 수)", () => {
    expect(reviewProblems(parsePracticeReview(reviewJson), expressions)).toEqual([]);
  });
});

describe("reviewProblems 가 잡아내는 것", () => {
  // 표본의 E01: 셋째 context 의 combo 가 E02
  const e01 = expressions.find((e) => e.id === "E01");
  const comboCue = e01?.contexts?.find((c) => c.combo === "E02")?.cue ?? "";

  it("모르는 id·자기 자신·combo 겹침·원본에 없는 표현·칸 수 초과를 하나씩 알린다", () => {
    const e02Count = expressions.find((e) => e.id === "E02")?.contexts?.length ?? 0;
    const tooMany = Array.from({ length: e02Count + 1 }, (_, i) => ({
      cue: `cue ${i}`,
      alsoFits: [],
      skip: [],
    }));
    const problems = reviewProblems(
      {
        schema: PRACTICE_REVIEW_SCHEMA,
        reviewedAt: "2026-11-23",
        items: {
          E01: {
            similarMeaning: ["E01"],
            example: { text: "", alsoFits: ["E999"], skip: [] },
            contexts: [{ cue: comboCue, alsoFits: ["E02"], skip: [] }],
          },
          E02: { contexts: tooMany },
          E999: {},
        },
      },
      expressions
    );
    expect(problems).toEqual([
      "E01.similarMeaning: 자기 자신(E01)",
      "E01.example.alsoFits: 모르는 id E999",
      `E01.contexts[${comboCue}]: combo(E02)와 겹친다`,
      `E02.contexts: ${e02Count + 1}칸으로 원본(${e02Count})보다 많다`,
      "E999: 원본에 없는 표현",
    ]);
  });
});
