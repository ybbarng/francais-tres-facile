import { describe, expect, it } from "vitest";
import { parseExpressions } from "../src/features/expressions/lib/expressions";
import {
  defaultRange,
  distractorPool,
  expressionsInRange,
  type PracticeRange,
  parsePracticeRange,
  rangeBounds,
  resolveRange,
  seoulMonthDay,
  sessionOptions,
} from "../src/features/expressions/lib/practice-range";
import practiceSample from "./mocks/expressions-practice-sample.json";
import real from "./mocks/expressions-sessions.json";

const list = real.expressions;

describe("parseExpressions 의 새 선택 필드", () => {
  it("sessionName·source·contexts·combo 를 그대로 읽는다", () => {
    const data = parseExpressions(practiceSample);
    const e01 = data.expressions.find((e) => e.id === "E01");
    const e91 = data.expressions.find((e) => e.id === "E91");
    expect(e01?.contexts).toHaveLength(5);
    expect(e01?.contexts?.[2].combo).toBe("E02");
    expect(e01?.sessionName).toBeUndefined();
    expect(e91?.sessionName).toBe("11-05");
    expect(e91?.source).toBe("ostV5Va7uHQ@29:00");
  });

  it("모양이 틀린 context 는 버리고 표현은 남긴다", () => {
    const broken = {
      ...practiceSample,
      expressions: [
        {
          ...practiceSample.expressions[4],
          contexts: [{ cue: "x" }, practiceSample.expressions[4].contexts[0]],
        },
      ],
    };
    const [e] = parseExpressions(broken).expressions;
    expect(e.contexts?.map((c) => c.reply)).toEqual(["Ça alors ! Félicitations !"]);
  });

  it("sessionName 이 문자열이 아니면 던진다", () => {
    const broken = {
      ...practiceSample,
      expressions: [{ ...practiceSample.expressions[4], sessionName: 1105 }],
    };
    expect(() => parseExpressions(broken)).toThrow(/1번째/);
  });
});

describe("sessionOptions", () => {
  it("10월 세션부터 12-30 까지 85개를 session 순으로, 표현 수와 함께 만든다", () => {
    const options = sessionOptions(list);
    expect(options).toHaveLength(85);
    expect(options[0]).toEqual({ session: 1, name: "10-01", count: 6 });
    expect(options[1]).toEqual({ session: 4, name: "10-04", count: 3 });
    expect(options[options.length - 1]).toEqual({ session: 90, name: "12-30", count: 3 });
  });

  it("목록 중간에 있는 표현(E61~E63, 11-04)도 session 자리에 놓는다", () => {
    const names = sessionOptions(list).map((o) => o.name);
    expect(names.slice(names.indexOf("11-03"), names.indexOf("11-03") + 3)).toEqual([
      "11-03",
      "11-04",
      "11-05",
    ]);
  });

  it("해가 바뀌어도 글자가 아니라 session 숫자 순으로 둔다", () => {
    const mixed = [
      { session: 60, sessionName: "01-05" },
      { session: 58, sessionName: "12-01" },
      { session: 3 },
      { session: 59, sessionName: "12-31" },
      { session: 58, sessionName: "12-01" },
    ];
    expect(sessionOptions(mixed).map((o) => [o.name, o.count])).toEqual([
      ["12-01", 2],
      ["12-31", 1],
      ["01-05", 1],
    ]);
  });
});

describe("seoulMonthDay", () => {
  it("UTC 로 전날 저녁이어도 서울 날짜로 센다", () => {
    expect(seoulMonthDay(new Date("2026-11-22T15:30:00Z"))).toBe("11-23");
  });
});

describe("defaultRange", () => {
  const options = sessionOptions(list);

  it("오늘이 11-23 이면 누적, 끝은 11-23", () => {
    expect(defaultRange(options, "11-23")).toEqual({ mode: "cumulative", to: "11-23" });
  });

  it("오늘 날짜 세션이 없으면(10-24) 그 앞 가장 가까운 세션(10-23)", () => {
    expect(defaultRange(options, "10-24")?.to).toBe("10-23");
  });

  it("오늘이 데이터 마지막 세션보다 뒤(12-31)면 12-30", () => {
    expect(defaultRange(options, "12-31")?.to).toBe("12-30");
  });

  it("오늘이 첫 세션보다 앞(09-15)이면 가장 최근 세션", () => {
    expect(defaultRange(options, "09-15")?.to).toBe("12-30");
  });

  it("세션이 하나도 없으면 null", () => {
    expect(defaultRange([], "11-23")).toBeNull();
  });
});

describe("resolveRange", () => {
  const options = sessionOptions(list);

  it("저장된 범위의 세션이 데이터에 있으면 그대로 쓴다", () => {
    const saved = { mode: "single" as const, to: "11-05" };
    expect(resolveRange(options, saved, "11-23")).toEqual(saved);
  });

  it("저장된 세션이 데이터에 없으면 기본값", () => {
    expect(resolveRange(options, { mode: "single", to: "10-02" }, "11-23")).toEqual({
      mode: "cumulative",
      to: "11-23",
    });
  });

  it("구간의 시작이 끝보다 뒤면 둘을 바꾼다", () => {
    expect(resolveRange(options, { mode: "span", from: "10-30", to: "10-15" }, "11-23")).toEqual({
      mode: "span",
      from: "10-15",
      to: "10-30",
    });
  });
});

describe("parsePracticeRange", () => {
  it("구간이 아니면 from 을 버린다", () => {
    expect(parsePracticeRange({ mode: "cumulative", from: "10-01", to: "11-05" })).toEqual({
      mode: "cumulative",
      to: "11-05",
    });
  });

  it.each([
    ["모르는 방식", { mode: "all", to: "11-05" }],
    ["MM-DD 가 아닌 끝", { mode: "single", to: "11-5" }],
    ["없는 달", { mode: "single", to: "13-01" }],
    ["숫자 끝", { mode: "single", to: 35 }],
    ["시작이 빠진 구간", { mode: "span", to: "11-05" }],
    ["옛 숫자 값", 35],
  ])("%s 는 null", (_label, value) => {
    expect(parsePracticeRange(value)).toBeNull();
  });
});

describe("expressionsInRange", () => {
  const options = sessionOptions(list);
  const ids = (range: PracticeRange) => expressionsInRange(list, rangeBounds(options, range));

  it("누적 11-05 면 E01~E93 의 93개", () => {
    const range = ids({ mode: "cumulative", to: "11-05" });
    expect(range).toHaveLength(93);
    expect(range[range.length - 1].id).toBe("E93");
  });

  it("누적 11-30 이면 168개", () => {
    expect(ids({ mode: "cumulative", to: "11-30" })).toHaveLength(168);
  });

  it("한 세션 11-05 면 그 세션의 E91~E93 만", () => {
    expect(ids({ mode: "single", to: "11-05" }).map((e) => e.id)).toEqual(["E91", "E92", "E93"]);
  });

  it("구간 10-15~10-30 은 양 끝 세션을 넣고 11-04 의 E61~E63 은 뺀다", () => {
    const range = ids({ mode: "span", from: "10-15", to: "10-30" }).map((e) => e.id);
    expect(range).toHaveLength(45);
    expect(range[0]).toBe("E34");
    expect(range[range.length - 1]).toBe("E81");
    expect(range).not.toContain("E61");
  });

  it("sessionName 이 없는 표현(옛 데이터)은 누적일 때만 들어간다", () => {
    const mixed = [
      { id: "E01", session: 40 },
      { id: "E91", session: 35, sessionName: "11-05" },
      { id: "E94", session: 36, sessionName: "11-06" },
    ];
    expect(expressionsInRange(mixed, { from: null, to: 35 }).map((e) => e.id)).toEqual([
      "E01",
      "E91",
    ]);
    expect(expressionsInRange(mixed, { from: 35, to: 35 }).map((e) => e.id)).toEqual(["E91"]);
  });

  it("null 이면 전부", () => {
    expect(expressionsInRange(list, null)).toHaveLength(258);
  });
});

describe("distractorPool", () => {
  const options = sessionOptions(list);

  it("한 세션 11-05 를 골라도 오답 풀은 11-05 까지 누적 93개", () => {
    const bounds = rangeBounds(options, { mode: "single", to: "11-05" });
    expect(distractorPool(list, bounds)).toHaveLength(93);
  });

  it("구간 10-15~10-30 의 오답 풀은 10-30 까지 누적(E61~E63 은 11-04 라 빠진다)", () => {
    const bounds = rangeBounds(options, { mode: "span", from: "10-15", to: "10-30" });
    const pool = distractorPool(list, bounds).map((e) => e.id);
    expect(pool).toHaveLength(78);
    expect(pool).toContain("E01");
    expect(pool).not.toContain("E61");
  });
});
