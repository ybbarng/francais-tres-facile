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
    const { materialId, unit, itemIndex } = body as {
      materialId?: string;
      unit?: string;
      itemIndex?: number;
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

    const now = new Date();
    const record = await progressDb.shadowingProgress.upsert({
      where: {
        materialId_unit_itemIndex: { materialId, unit, itemIndex },
      },
      update: {
        playCount: { increment: 1 },
        lastStudiedAt: now,
      },
      create: {
        materialId,
        unit,
        itemIndex,
        playCount: 1,
        lastStudiedAt: now,
      },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error("Error updating shadowing progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
