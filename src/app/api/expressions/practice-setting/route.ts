import { type NextRequest, NextResponse } from "next/server";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { progressDb } from "@/lib/db";

// 말하기 표현 연습의 「마지막으로 한 세션」. 폰과 맥이 같이 보도록 progress.db 에 둔다
const LAST_SESSION_KEY = "lastSession";
const MAX_SESSION = 10000;

function isValidSession(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= MAX_SESSION;
}

// 읽기는 암호 없이. 저장한 적이 없으면 lastSession 이 null
export async function GET() {
  try {
    const record = await progressDb.expressionPracticeSetting.findUnique({
      where: { key: LAST_SESSION_KEY },
    });
    const value = record ? Number(record.value) : null;
    return NextResponse.json({ lastSession: isValidSession(value) ? value : null });
  } catch (error) {
    console.error("Error fetching expression practice setting:", error);
    return NextResponse.json({ error: "Failed to fetch setting" }, { status: 500 });
  }
}

// 쓰기는 암호 보호: { lastSession: 정수 }
export async function POST(request: NextRequest) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { lastSession?: unknown };
    const { lastSession } = body;
    if (!isValidSession(lastSession)) {
      return NextResponse.json(
        { error: `lastSession must be an integer between 1 and ${MAX_SESSION}` },
        { status: 400 }
      );
    }

    const value = String(lastSession);
    await progressDb.expressionPracticeSetting.upsert({
      where: { key: LAST_SESSION_KEY },
      update: { value },
      create: { key: LAST_SESSION_KEY, value },
    });
    return NextResponse.json({ lastSession });
  } catch (error) {
    console.error("Error updating expression practice setting:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
