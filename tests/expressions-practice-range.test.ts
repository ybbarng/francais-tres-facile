import { describe, expect, it } from "vitest";
import { parseExpressions } from "../src/features/expressions/lib/expressions";
import {
  expressionsInRange,
  latestSession,
  sessionOptions,
} from "../src/features/expressions/lib/practice-range";
import practiceSample from "./mocks/expressions-practice-sample.json";
import real from "./mocks/expressions-sessions.json";

const list = real.expressions;
const sessionOf = (name: string) => {
  const found = sessionOptions(list).find((o) => o.name === name);
  if (!found) throw new Error(`no session ${name}`);
  return found.session;
};

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
  it("실제 데이터에서 11-05 부터 11-30 까지 26개를 session 순으로 만든다", () => {
    const options = sessionOptions(list);
    expect(options).toHaveLength(26);
    expect(options[0]).toEqual({ session: 32, name: "11-05" });
    expect(options[25]).toEqual({ session: 57, name: "11-30" });
  });

  it("같은 session 은 한 번만 나온다", () => {
    const sessions = sessionOptions(list).map((o) => o.session);
    expect(new Set(sessions).size).toBe(sessions.length);
  });

  it("해가 바뀌어도 글자가 아니라 session 숫자 순으로 둔다", () => {
    const mixed = [
      { session: 60, sessionName: "01-05" },
      { session: 58, sessionName: "12-01" },
      { session: 3 },
      { session: 59, sessionName: "12-31" },
      { session: 58, sessionName: "12-01" },
    ];
    expect(sessionOptions(mixed).map((o) => o.name)).toEqual(["12-01", "12-31", "01-05"]);
  });
});

describe("latestSession", () => {
  it("가장 큰 session 을 돌려준다", () => {
    expect(latestSession(list)).toBe(57);
  });

  it("날짜별 표현이 없으면 null", () => {
    expect(latestSession([{ session: 1 }, { session: 30 }])).toBeNull();
  });
});

describe("expressionsInRange", () => {
  it("11-05 까지면 E01~E93 의 93개", () => {
    const range = expressionsInRange(list, sessionOf("11-05"));
    expect(range).toHaveLength(93);
    expect(range[range.length - 1].id).toBe("E93");
  });

  it("11-30 까지면 168개 전부", () => {
    expect(expressionsInRange(list, sessionOf("11-30"))).toHaveLength(168);
  });

  it("sessionName 이 없는 표현은 session 숫자가 커도 늘 들어간다", () => {
    const range = expressionsInRange(
      [
        { id: "E01", session: 40 },
        { id: "E91", session: 32, sessionName: "11-05" },
        { id: "E94", session: 33, sessionName: "11-06" },
      ],
      32
    );
    expect(range.map((e) => e.id)).toEqual(["E01", "E91"]);
  });

  it("null 이면 전부", () => {
    expect(expressionsInRange(list, null)).toHaveLength(168);
  });
});
