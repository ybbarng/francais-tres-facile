import { type NextRequest, NextResponse } from "next/server";
import { EXPRESSION_ID_PATTERN } from "@/features/expressions/lib/expressions";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { progressDb } from "@/lib/db";

// 읽기는 암호 없이: 「익힘」 표시된 표현 id 목록
export async function GET() {
  try {
    const records = await progressDb.expressionProgress.findMany({
      where: { learned: true },
      select: { expressionId: true },
    });
    return NextResponse.json({ mastered: records.map((r) => r.expressionId) });
  } catch (error) {
    console.error("Error fetching expression progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

// 쓰기는 암호 보호: { expressionId, learned } 로 「익힘」을 켜고 끈다
export async function POST(request: NextRequest) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = (await request.json()) as { expressionId?: unknown; learned?: unknown };
    const { expressionId, learned } = body;

    if (typeof expressionId !== "string" || !EXPRESSION_ID_PATTERN.test(expressionId)) {
      return NextResponse.json({ error: "expressionId must look like E01" }, { status: 400 });
    }
    if (typeof learned !== "boolean") {
      return NextResponse.json({ error: "learned must be a boolean" }, { status: 400 });
    }

    const record = await progressDb.expressionProgress.upsert({
      where: { expressionId },
      update: { learned },
      create: { expressionId, learned },
    });

    return NextResponse.json({ expressionId: record.expressionId, learned: record.learned });
  } catch (error) {
    console.error("Error updating expression progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
