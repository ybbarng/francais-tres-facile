import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCorrectionRequest,
  countWords,
  gradeDelfSet,
  isCorrect,
  sanitizeAnswers,
  sanitizeWriting,
} from "../src/features/delf/lib/grade";
import {
  type DelfQuestion,
  DelfSetError,
  indexEntryOf,
  parseDelfSet,
} from "../src/features/delf/lib/set";
import sample from "./mocks/delf-sample-set.json";

/** 테스트에서 고쳐 쓰는 세트 JSON 모양. 틀린 값도 넣을 수 있게 느슨하게 둔다 */
interface RawSet {
  schema: string;
  id: string;
  kind: string;
  sections: {
    documents: {
      id: string;
      audio?: unknown;
      questions: { id: string; points: number; answer: string[]; options: { id: string }[] }[];
    }[];
    tasks: { points: number; rubric: { criterion: string; points: number }[] }[];
  }[];
  review?: unknown;
}

/** 원본을 건드리지 않게 깊은 사본을 고쳐 쓴다 */
function edit(fn: (s: RawSet) => void): unknown {
  const copy = structuredClone(sample) as unknown as RawSet;
  fn(copy);
  return copy;
}

function issuesOf(json: unknown): string[] {
  try {
    parseDelfSet(json);
  } catch (e) {
    if (e instanceof DelfSetError) return e.issues;
    throw e;
  }
  return [];
}

/** 표본 세트를 바탕으로 exam 세트를 만든다. 영역마다 points 를 25 로 맞춘다 */
function examFrom(points: { co: number; ce: number; pe: number }): unknown {
  return edit((s) => {
    s.id = "a1-exam-00";
    s.kind = "exam";
    const [co, ce, pe] = s.sections;
    co.documents[0].questions[0].points = points.co - 1;
    ce.documents[0].questions[0].points = points.ce - 1;
    pe.tasks[0].points = points.pe;
    pe.tasks[0].rubric = [{ criterion: "Respect de la consigne", points: points.pe }];
  });
}

describe("parseDelfSet", () => {
  it("docs/DELF.md 형식의 표본 세트를 통과시킨다", () => {
    const set = parseDelfSet(sample);
    expect(set.id).toBe("a1-mini-00");
    expect(set.sections.map((s) => s.area)).toEqual(["CO", "CE", "PE"]);
    expect(set.sections[0].documents[0].audio?.plays).toBe(2);
    expect(set.sections[2].tasks[0].rubric).toHaveLength(3);
    expect(set.review.status).toBe("verified");
  });

  it("배점이 25점씩인 exam 을 통과시킨다", () => {
    expect(issuesOf(examFrom({ co: 25, ce: 25, pe: 25 }))).toEqual([]);
  });

  it("exam 의 영역 배점이 25 가 아니면 어느 영역인지 알려 준다", () => {
    const issues = issuesOf(examFrom({ co: 25, ce: 24, pe: 25 }));
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatch(/CE.*25.*24/);
  });

  it("exam 에 영역이 빠지면 잡는다", () => {
    const json = edit((s) => {
      s.id = "a1-exam-01";
      s.kind = "exam";
      s.sections.pop();
    });
    expect(issuesOf(json).join("\n")).toMatch(/PE 영역이 있어야/);
  });

  it("정답 id 가 options 에 없으면 그 문항 위치를 알려 준다", () => {
    const json = edit((s) => {
      s.sections[1].documents[0].questions[1].answer = ["a", "z"];
    });
    expect(issuesOf(json)).toEqual([
      'sections[1].documents[0].questions[1].answer: "z" 가 options 에 없습니다',
    ]);
  });

  it("choice 에 정답이 둘이면 잡는다", () => {
    const json = edit((s) => {
      s.sections[0].documents[0].questions[0].answer = ["a", "b"];
    });
    expect(issuesOf(json).join("\n")).toMatch(/정답이 하나여야/);
  });

  it("문항 id 가 영역을 넘어 겹쳐도 잡는다", () => {
    const json = edit((s) => {
      s.sections[1].documents[0].questions[0].id = "q1";
    });
    expect(issuesOf(json)).toEqual([
      'sections[1].documents[0].questions[0].id: "q1" 가 세트 안에서 겹칩니다',
    ]);
  });

  it("문서 id 와 보기 id 가 겹쳐도 잡는다", () => {
    const docDup = edit((s) => {
      s.sections[1].documents[0].id = "doc1";
    });
    expect(issuesOf(docDup).join("\n")).toMatch(/"doc1" 가 세트 안에서 겹칩니다/);
    const optDup = edit((s) => {
      s.sections[0].documents[0].questions[0].options[1].id = "a";
    });
    expect(issuesOf(optDup).join("\n")).toMatch(/"a" 가 보기 안에서 겹칩니다/);
  });

  it("rubric 합이 points 와 다르면 잡는다", () => {
    const json = edit((s) => {
      s.sections[2].tasks[0].rubric[0].points = 3;
    });
    expect(issuesOf(json)).toEqual([
      "sections[2].tasks[0].rubric: 점수 합 6 이 points 5 와 다릅니다",
    ]);
  });

  it("schema·id 모양·수준 불일치·review 누락을 한꺼번에 알려 준다", () => {
    const json = edit((s) => {
      s.schema = "ftf/delf-set@2";
      s.id = "a2-mini-00";
      delete s.review;
    });
    const issues = issuesOf(json);
    expect(issues.some((i) => i.startsWith("schema"))).toBe(true);
    expect(issues.some((i) => i.startsWith("id") && i.includes("level"))).toBe(true);
    expect(issues.some((i) => i.startsWith("review"))).toBe(true);
  });

  it("듣기 문서에 대본이 없거나 truefalse 보기가 v/f 가 아니면 잡는다", () => {
    const json = edit((s) => {
      delete s.sections[0].documents[0].audio;
      s.sections[0].documents[0].questions[1].options[0].id = "x";
      s.sections[0].documents[0].questions[1].answer = ["x"];
    });
    const issues = issuesOf(json).join("\n");
    expect(issues).toMatch(/audio 가 있어야/);
    expect(issues).toMatch(/v, f/);
  });

  it("영역 순서가 CO → CE → PE 가 아니면 잡는다", () => {
    const json = edit((s) => {
      s.sections.reverse();
    });
    expect(issuesOf(json).join("\n")).toMatch(/순서/);
  });

  it("index 항목에 영역별 시간·만점을 담는다", () => {
    expect(indexEntryOf(parseDelfSet(sample))).toEqual({
      id: "a1-mini-00",
      level: "A1",
      kind: "mini",
      title: "Rendez-vous au café",
      areas: [
        { area: "CO", minutes: 4, max: 2 },
        { area: "CE", minutes: 5, max: 2 },
        { area: "PE", minutes: 6, max: 5 },
      ],
      status: "verified",
    });
  });
});

describe("채점", () => {
  const set = parseDelfSet(sample);
  const q = (id: string): DelfQuestion =>
    set.sections.flatMap((s) => s.documents.flatMap((d) => d.questions)).find((x) => x.id === id)!;

  it("choice 는 정답 하나만 고를 때 맞다", () => {
    expect(isCorrect(q("q1"), ["b"])).toBe(true);
    expect(isCorrect(q("q1"), ["a"])).toBe(false);
    expect(isCorrect(q("q1"), ["b", "a"])).toBe(false);
    expect(isCorrect(q("q1"), [])).toBe(false);
  });

  it("truefalse 도 하나가 같아야 맞다", () => {
    expect(isCorrect(q("q2"), ["v"])).toBe(true);
    expect(isCorrect(q("q2"), ["f"])).toBe(false);
  });

  it("multi 는 집합이 같을 때만 맞고 순서는 보지 않는다", () => {
    expect(isCorrect(q("q4"), ["c", "a"])).toBe(true);
    expect(isCorrect(q("q4"), ["a"])).toBe(false);
    expect(isCorrect(q("q4"), ["a", "c", "d"])).toBe(false);
  });

  it("영역별 점수·만점과 합계를 돌려준다. 부분 정답 multi 는 0점", () => {
    const r = gradeDelfSet(set, { q1: ["b"], q2: ["f"], q3: ["b"], q4: ["a"] });
    expect(r.areas).toEqual({ CO: { score: 1, max: 2 }, CE: { score: 1, max: 2 } });
    expect(r.total).toEqual({ score: 2, max: 4 });
    expect(r.questions.find((x) => x.questionId === "q4")).toMatchObject({
      correct: false,
      earned: 0,
      chosen: ["a"],
      answer: ["a", "c"],
    });
  });

  it("답하지 않은 문항은 0점이다", () => {
    expect(gradeDelfSet(set, {}).total).toEqual({ score: 0, max: 4 });
  });

  it("세트에 없는 문항·보기는 걸러 낸다", () => {
    expect(
      sanitizeAnswers(set, { q1: ["b", "b", "zz", 3], nope: ["a"], q2: "v", q4: ["a", "c"] })
    ).toEqual({ q1: ["b"], q4: ["a", "c"] });
    expect(sanitizeWriting(set, { w1: "Salut", w9: "x", w2: 3 })).toEqual({ w1: "Salut" });
  });

  it("단어 수는 띄어쓰기 덩어리로 센다", () => {
    expect(countWords("Salut Léa ! C'est samedi, à 14 h.")).toBe(7);
    expect(countWords("  ")).toBe(0);
  });

  it("첨삭 요청 글에 지시문·단어 수·기준표·내 답이 들어간다", () => {
    const task = set.sections[2].tasks[0];
    const text = buildCorrectionRequest(set, task, "Salut Léa, viens à la fête samedi.");
    expect(text).toContain(task.prompt);
    expect(text).toContain("30~50 단어");
    expect(text).toContain("- Lexique et orthographe: 1.5점");
    expect(text).toContain("## 내 답 (7 단어)");
    expect(text).toContain("Salut Léa, viens à la fête samedi.");
  });
});

describe("/api/delf/attempts", () => {
  const create = vi.fn();
  const findMany = vi.fn();
  let setsDir: string;

  const post = (body: unknown, password?: string, ip = "10.8.0.1"): NextRequest => {
    const headers = new Headers({ "x-forwarded-for": ip, "content-type": "application/json" });
    if (password) headers.set("x-admin-password", password);
    return new NextRequest("http://localhost/api/delf/attempts", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  };
  const get = (query = "") => new NextRequest(`http://localhost/api/delf/attempts${query}`);

  beforeAll(() => {
    setsDir = mkdtempSync(path.join(tmpdir(), "delf-sets-"));
    writeFileSync(path.join(setsDir, "a1-mini-00.json"), JSON.stringify(sample));
  });

  afterAll(() => {
    rmSync(setsDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ADMIN_PASSWORD", "pw");
    create.mockReset();
    findMany.mockReset();
    vi.doMock("@/lib/db", () => ({
      progressDb: { delfAttempt: { create, findMany } },
    }));
    // 세트 폴더만 임시 폴더로 바꾸고 파일 읽기·확인은 실제 코드를 쓴다
    vi.doMock("@/features/delf/server/load-set", async () => {
      const actual = await vi.importActual<typeof import("../src/features/delf/server/load-set")>(
        "../src/features/delf/server/load-set"
      );
      return { ...actual, loadDelfSet: (id: string) => actual.loadDelfSet(id, setsDir) };
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/lib/db");
    vi.doUnmock("@/features/delf/server/load-set");
  });

  it("POST 는 암호가 없으면 401 이고 저장하지 않는다", async () => {
    const { POST } = await import("../src/app/api/delf/attempts/route");
    const res = await POST(post({ setId: "a1-mini-00", answers: {} }, undefined, "10.8.0.2"));
    expect(res.status).toBe(401);
    expect(create).not.toHaveBeenCalled();
  });

  it("POST 는 경로를 조작하는 setId 를 400 으로 막는다", async () => {
    const { POST } = await import("../src/app/api/delf/attempts/route");
    for (const setId of ["../../etc/passwd", "a1-mini-00/../x", "A1-mini-00", "a1-mini-00.json"]) {
      const res = await POST(post({ setId, answers: {} }, "pw"));
      expect(res.status).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it("POST 는 없는 세트를 404 로 돌려준다", async () => {
    const { POST } = await import("../src/app/api/delf/attempts/route");
    const res = await POST(post({ setId: "b2-exam-09", answers: {} }, "pw"));
    expect(res.status).toBe(404);
  });

  it("POST 는 클라이언트가 보낸 점수를 무시하고 세트 파일로 다시 채점해 저장한다", async () => {
    create.mockImplementation(async ({ data }) => ({
      id: "c1",
      createdAt: new Date("2026-11-08T00:00:00Z"),
      ...data,
    }));
    const { POST } = await import("../src/app/api/delf/attempts/route");
    const res = await POST(
      post(
        {
          setId: "a1-mini-00",
          answers: { q1: ["b"], q2: ["f"], q3: ["a"], q4: ["a", "c"], q99: ["a"] },
          writing: { w1: "Salut Léa !", w7: "버린다" },
          // 거짓 점수 — 서버는 이 값을 쓰지 않아야 한다
          coScore: 99,
          ceScore: 99,
          result: { total: { score: 99, max: 4 } },
        },
        "pw"
      )
    );
    expect(res.status).toBe(200);
    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      setId: "a1-mini-00",
      level: "A1",
      kind: "mini",
      coScore: 1,
      coMax: 2,
      ceScore: 1,
      ceMax: 2,
    });
    expect(JSON.parse(data.answers)).toEqual({
      q1: ["b"],
      q2: ["f"],
      q3: ["a"],
      q4: ["a", "c"],
    });
    expect(JSON.parse(data.writing)).toEqual({ w1: "Salut Léa !" });
    const body = await res.json();
    expect(body.attempt.total).toEqual({ score: 2, max: 4 });
    expect(body.result.total).toEqual({ score: 2, max: 4 });
  });

  it("GET 은 암호 없이 세트의 기록과 최고 점수를 돌려준다", async () => {
    const row = (id: string, co: number, ce: number, at: string) => ({
      id,
      setId: "a1-mini-00",
      coScore: co,
      coMax: 2,
      ceScore: ce,
      ceMax: 2,
      createdAt: new Date(at),
    });
    findMany.mockResolvedValue([
      row("c3", 1, 1, "2026-11-08T03:00:00Z"),
      row("c2", 2, 1, "2026-11-08T02:00:00Z"),
      row("c1", 1, 2, "2026-11-08T01:00:00Z"),
    ]);
    const { GET } = await import("../src/app/api/delf/attempts/route");
    const res = await GET(get("?setId=a1-mini-00"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attempts.map((a: { id: string }) => a.id)).toEqual(["c3", "c2", "c1"]);
    // 같은 3점이면 먼저 낸 것
    expect(body.best.id).toBe("c1");
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { setId: "a1-mini-00" } })
    );
  });

  it("GET 은 setId 없이 세트마다 최고 점수를 돌려준다", async () => {
    findMany.mockResolvedValue([
      {
        id: "c1",
        setId: "a1-mini-00",
        coScore: 1,
        coMax: 2,
        ceScore: 0,
        ceMax: 2,
        createdAt: new Date(),
      },
      {
        id: "c2",
        setId: "a1-mini-00",
        coScore: 2,
        coMax: 2,
        ceScore: 2,
        ceMax: 2,
        createdAt: new Date(),
      },
      {
        id: "c3",
        setId: "a2-mini-01",
        coScore: 0,
        coMax: 5,
        ceScore: 3,
        ceMax: 5,
        createdAt: new Date(),
      },
    ]);
    const { GET } = await import("../src/app/api/delf/attempts/route");
    const body = await (await GET(get())).json();
    expect(body.best["a1-mini-00"]).toMatchObject({
      id: "c2",
      count: 2,
      total: { score: 4, max: 4 },
    });
    expect(body.best["a2-mini-01"]).toMatchObject({ id: "c3", count: 1 });
  });

  it("GET 은 잘못된 setId 를 400 으로 막는다", async () => {
    const { GET } = await import("../src/app/api/delf/attempts/route");
    const res = await GET(get("?setId=..%2F..%2Fx"));
    expect(res.status).toBe(400);
    expect(findMany).not.toHaveBeenCalled();
  });
});
