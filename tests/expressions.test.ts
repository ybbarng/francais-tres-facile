import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Expression,
  filterExpressions,
  parseExpressions,
  shuffled,
  speakableText,
} from "../src/features/expressions/lib/expressions";
import sample from "./mocks/expressions-sample.json";

const make = (id: string, group: string, extra: Partial<Expression> = {}): Expression => ({
  id,
  group,
  fr: `fr ${id}`,
  ko: `ko ${id}`,
  example: { fr: `ex fr ${id}`, ko: `ex ko ${id}` },
  session: 1,
  learned: true,
  ...extra,
});

describe("parseExpressions", () => {
  const valid = {
    schema: "study-french/expressions@1",
    groups: { A: "복구", B: "묘사" },
    expressions: [make("E01", "A"), make("E02", "B", { review: "관사 빠뜨림", learned: false })],
  };

  it("study-french 실제 원본에서 뽑은 표본을 읽는다", () => {
    const data = parseExpressions(sample);
    expect(Object.keys(data.groups)).toEqual(["A", "B", "C", "D", "E"]);
    expect(data.expressions.some((e) => e.review)).toBe(true);
    expect(data.expressions.some((e) => !e.learned)).toBe(true);
  });

  it("올바른 원본을 그대로 돌려준다", () => {
    const data = parseExpressions(valid);
    expect(data.groups).toEqual({ A: "복구", B: "묘사" });
    expect(data.expressions.map((e) => e.id)).toEqual(["E01", "E02"]);
  });

  it("schema 가 다르면 던진다", () => {
    expect(() => parseExpressions({ ...valid, schema: "study-french/expressions@2" })).toThrow();
  });

  it("필드가 빠진 표현이 있으면 몇 번째인지 알려 준다", () => {
    const broken = { ...valid, expressions: [make("E01", "A"), { id: "E02", group: "A" }] };
    expect(() => parseExpressions(broken)).toThrow(/2번째/);
  });

  it("id 가 E숫자 모양이 아니면 던진다", () => {
    const broken = { ...valid, expressions: [make("X1", "A")] };
    expect(() => parseExpressions(broken)).toThrow();
  });
});

describe("filterExpressions", () => {
  const list = [
    make("E01", "A"),
    make("E02", "A", { review: "다시" }),
    make("E03", "B"),
    make("E04", "B", { review: "다시" }),
  ];
  const none = new Set<string>();

  it("묶음으로 거른다", () => {
    const r = filterExpressions(list, { group: "B", reviewOnly: false, hideMastered: false }, none);
    expect(r.map((e) => e.id)).toEqual(["E03", "E04"]);
  });

  it("다시 볼 것만 남긴다", () => {
    const r = filterExpressions(
      list,
      { group: "all", reviewOnly: true, hideMastered: false },
      none
    );
    expect(r.map((e) => e.id)).toEqual(["E02", "E04"]);
  });

  it("익힘 표시한 것을 숨긴다", () => {
    const r = filterExpressions(
      list,
      { group: "all", reviewOnly: false, hideMastered: true },
      new Set(["E01", "E04"])
    );
    expect(r.map((e) => e.id)).toEqual(["E02", "E03"]);
  });

  it("조건을 함께 건다", () => {
    const r = filterExpressions(
      list,
      { group: "B", reviewOnly: true, hideMastered: true },
      new Set(["E04"])
    );
    expect(r).toEqual([]);
  });
});

describe("shuffled", () => {
  it("원본을 바꾸지 않고 같은 원소를 돌려준다", () => {
    const src = ["a", "b", "c", "d"];
    const out = shuffled(src, () => 0);
    expect(src).toEqual(["a", "b", "c", "d"]);
    expect([...out].sort()).toEqual(src);
    expect(out).not.toEqual(src);
  });
});

describe("speakableText", () => {
  it("빈칸 표시와 한국어 안내를 뺀다", () => {
    expect(speakableText("Qu'est-ce que ça veut dire, … ?")).toBe("Qu'est-ce que ça veut dire, ?");
    expect(speakableText("J'ai envie de + 동사원형")).toBe("J'ai envie de");
  });
});

describe("/api/expressions/progress", () => {
  const upsert = vi.fn();
  const findMany = vi.fn();

  const req = (body: unknown, password?: string, ip = "10.9.0.1"): NextRequest => {
    const headers = new Headers({ "x-forwarded-for": ip });
    if (password) headers.set("x-admin-password", password);
    return { headers, json: async () => body } as unknown as NextRequest;
  };

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ADMIN_PASSWORD", "pw");
    upsert.mockReset();
    findMany.mockReset();
    vi.doMock("@/lib/db", () => ({
      progressDb: { expressionProgress: { upsert, findMany } },
    }));
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db");
  });

  it("GET 은 암호 없이 익힘 id 목록을 돌려준다", async () => {
    findMany.mockResolvedValue([{ expressionId: "E01" }, { expressionId: "E07" }]);
    const { GET } = await import("../src/app/api/expressions/progress/route");
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ mastered: ["E01", "E07"] });
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { learned: true } }));
  });

  it("POST 는 암호가 없으면 401 이고 저장하지 않는다", async () => {
    const { POST } = await import("../src/app/api/expressions/progress/route");
    const res = await POST(req({ expressionId: "E01", learned: true }, undefined, "10.9.0.2"));
    expect(res.status).toBe(401);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("POST 는 잘못된 id 를 400 으로 막는다", async () => {
    const { POST } = await import("../src/app/api/expressions/progress/route");
    const res = await POST(req({ expressionId: "../x", learned: true }, "pw"));
    expect(res.status).toBe(400);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("POST 는 learned 가 불리언이 아니면 400", async () => {
    const { POST } = await import("../src/app/api/expressions/progress/route");
    const res = await POST(req({ expressionId: "E01", learned: "yes" }, "pw"));
    expect(res.status).toBe(400);
  });

  it("POST 는 익힘을 켜고 끈다", async () => {
    upsert.mockImplementation(async ({ create }) => create);
    const { POST } = await import("../src/app/api/expressions/progress/route");
    const res = await POST(req({ expressionId: "E12", learned: false }, "pw"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ expressionId: "E12", learned: false });
    expect(upsert).toHaveBeenCalledWith({
      where: { expressionId: "E12" },
      update: { learned: false },
      create: { expressionId: "E12", learned: false },
    });
  });
});
