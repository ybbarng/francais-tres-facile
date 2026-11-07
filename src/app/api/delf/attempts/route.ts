import { type NextRequest, NextResponse } from "next/server";
import { gradeDelfSet, sanitizeAnswers, sanitizeWriting } from "@/features/delf/lib/grade";
import { DELF_SET_ID_PATTERN } from "@/features/delf/lib/set";
import { DelfSetNotFoundError, loadDelfSet } from "@/features/delf/server/load-set";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { progressDb } from "@/lib/db";

interface AttemptRow {
  id: string;
  setId: string;
  coScore: number;
  coMax: number;
  ceScore: number;
  ceMax: number;
  createdAt: Date;
}

/** 화면에 내보내는 기록 한 줄. 답·쓴 글은 내보내지 않는다 */
function summary(r: AttemptRow) {
  return {
    id: r.id,
    setId: r.setId,
    co: { score: r.coScore, max: r.coMax },
    ce: { score: r.ceScore, max: r.ceMax },
    total: { score: r.coScore + r.ceScore, max: r.coMax + r.ceMax },
    createdAt: r.createdAt.toISOString(),
  };
}

type Summary = ReturnType<typeof summary>;

/** 합계 점수가 높은 것, 같으면 먼저 낸 것 */
function better(a: Summary, b: Summary | undefined): boolean {
  if (!b) return true;
  return a.total.score > b.total.score;
}

const select = {
  id: true,
  setId: true,
  coScore: true,
  coMax: true,
  ceScore: true,
  ceMax: true,
  createdAt: true,
} as const;

// 읽기는 암호 없이.
//   ?setId=a2-mini-03 → 그 세트의 기록(최근 것부터)과 최고 점수
//   setId 없음        → 세트마다 최고 점수
export async function GET(request: NextRequest) {
  const setId = request.nextUrl.searchParams.get("setId");
  if (setId !== null && !DELF_SET_ID_PATTERN.test(setId)) {
    return NextResponse.json({ error: "setId must look like a2-mini-03" }, { status: 400 });
  }
  try {
    if (setId) {
      const rows = await progressDb.delfAttempt.findMany({
        where: { setId },
        select,
        orderBy: { createdAt: "desc" },
      });
      const attempts = rows.map(summary);
      let best: Summary | undefined;
      for (const a of [...attempts].reverse()) if (better(a, best)) best = a;
      return NextResponse.json({ attempts, best: best ?? null });
    }
    const rows = await progressDb.delfAttempt.findMany({ select, orderBy: { createdAt: "asc" } });
    const best: Record<string, Summary & { count: number }> = {};
    for (const r of rows) {
      const s = summary(r);
      const prev = best[s.setId];
      const count = (prev?.count ?? 0) + 1;
      best[s.setId] = better(s, prev) ? { ...s, count } : { ...prev, count };
    }
    return NextResponse.json({ best });
  } catch (error) {
    console.error("Error fetching DELF attempts:", error);
    return NextResponse.json({ error: "Failed to fetch attempts" }, { status: 500 });
  }
}

// 쓰기는 암호 보호: { setId, answers, writing } 을 받아 서버가 세트 파일로 다시 채점해 저장한다.
// 클라이언트가 점수를 보내도 쓰지 않는다.
export async function POST(request: NextRequest) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  let body: { setId?: unknown; answers?: unknown; writing?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
  }
  const { setId } = body;
  if (typeof setId !== "string" || !DELF_SET_ID_PATTERN.test(setId)) {
    return NextResponse.json({ error: "setId must look like a2-mini-03" }, { status: 400 });
  }

  try {
    let set: Awaited<ReturnType<typeof loadDelfSet>>;
    try {
      set = await loadDelfSet(setId);
    } catch (e) {
      if (e instanceof DelfSetNotFoundError) {
        return NextResponse.json({ error: `set ${setId} not found` }, { status: 404 });
      }
      throw e;
    }

    const answers = sanitizeAnswers(set, body.answers);
    const writing = sanitizeWriting(set, body.writing);
    const result = gradeDelfSet(set, answers);

    const record = await progressDb.delfAttempt.create({
      data: {
        setId: set.id,
        level: set.level,
        kind: set.kind,
        answers: JSON.stringify(answers),
        coScore: result.areas.CO.score,
        coMax: result.areas.CO.max,
        ceScore: result.areas.CE.score,
        ceMax: result.areas.CE.max,
        writing: JSON.stringify(writing),
      },
      select,
    });

    return NextResponse.json({ attempt: summary(record), result });
  } catch (error) {
    console.error("Error saving DELF attempt:", error);
    return NextResponse.json({ error: "Failed to save attempt" }, { status: 500 });
  }
}
