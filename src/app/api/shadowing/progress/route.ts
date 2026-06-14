import { type NextRequest, NextResponse } from "next/server";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { progressDb } from "@/lib/db";

const VALID_UNITS = new Set(["sentences", "paragraphs", "segments", "full"]);

export async function GET(request: NextRequest) {
  try {
    const materialId = request.nextUrl.searchParams.get("materialId");

    const where = materialId ? { materialId } : {};
    const records = await progressDb.shadowingProgress.findMany({ where });

    return NextResponse.json({ records });
  } catch (error) {
    console.error("Error fetching shadowing progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const { materialId, unit, itemIndex, count } = body as {
      materialId?: string;
      unit?: string;
      itemIndex?: number;
      count?: number;
    };

    if (!materialId || !unit || typeof itemIndex !== "number") {
      return NextResponse.json(
        { error: "materialId, unit, itemIndex are required" },
        { status: 400 }
      );
    }
    if (!VALID_UNITS.has(unit)) {
      return NextResponse.json({ error: `invalid unit: ${unit}` }, { status: 400 });
    }

    // 화면이 꺼져 있던 동안을 시간으로 되짚으면 한 번에 여러 번 올라갈 수 있다. 너무 크게 올라가지 않도록 상한을 둔다.
    const inc = typeof count === "number" && count > 1 ? Math.min(Math.floor(count), 1000) : 1;

    const now = new Date();
    const record = await progressDb.shadowingProgress.upsert({
      where: {
        materialId_unit_itemIndex: { materialId, unit, itemIndex },
      },
      update: {
        playCount: { increment: inc },
        lastStudiedAt: now,
      },
      create: {
        materialId,
        unit,
        itemIndex,
        playCount: inc,
        lastStudiedAt: now,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error updating shadowing progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
