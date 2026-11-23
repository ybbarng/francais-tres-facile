import { type NextRequest, NextResponse } from "next/server";
import { parsePracticeRange } from "@/features/expressions/lib/practice-range";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { progressDb } from "@/lib/db";

// 말하기 표현 연습의 연습 범위. 폰과 맥이 같이 보도록 progress.db 에 둔다.
// 값은 JSON 문자열 { mode, from?, to } 이고 세션은 sessionName("MM-DD")으로 적는다.
// 옛 키 lastSession(옛 session 번호)은 번호를 다시 매기면서 뜻이 바뀌어 읽지 않는다(지우지도 않는다)
const RANGE_KEY = "range";

function parseStored(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// 읽기는 암호 없이. 저장한 적이 없거나 모양이 틀리면 range 가 null
export async function GET() {
  try {
    const record = await progressDb.expressionPracticeSetting.findUnique({
      where: { key: RANGE_KEY },
    });
    const range = record ? parsePracticeRange(parseStored(record.value)) : null;
    return NextResponse.json({ range });
  } catch (error) {
    console.error("Error fetching expression practice setting:", error);
    return NextResponse.json({ error: "Failed to fetch setting" }, { status: 500 });
  }
}

// 쓰기는 암호 보호: { range: { mode: "cumulative"|"single"|"span", from?: "MM-DD", to: "MM-DD" } }
export async function POST(request: NextRequest) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { range?: unknown };
    const range = parsePracticeRange(body.range);
    if (!range) {
      return NextResponse.json(
        {
          error:
            'range must be { mode: "cumulative"|"single"|"span", to: "MM-DD" } (span needs from: "MM-DD")',
        },
        { status: 400 }
      );
    }

    const value = JSON.stringify(range);
    await progressDb.expressionPracticeSetting.upsert({
      where: { key: RANGE_KEY },
      update: { value },
      create: { key: RANGE_KEY, value },
    });
    return NextResponse.json({ range });
  } catch (error) {
    console.error("Error updating expression practice setting:", error);
    return NextResponse.json({ error: "Failed to update setting" }, { status: 500 });
  }
}
