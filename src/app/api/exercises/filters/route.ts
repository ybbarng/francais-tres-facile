import { type NextRequest, NextResponse } from "next/server";
import { exerciseDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section");
    const level = searchParams.get("level");

    // Get distinct sections
    const sections = await exerciseDb.exercise.findMany({
      select: { section: true },
      distinct: ["section"],
      orderBy: { section: "asc" },
    });

    // Get distinct levels (filtered by section if provided)
    const levelsWhere: Record<string, string> = {};
    if (section) {
      levelsWhere.section = section;
    }
    const levels = await exerciseDb.exercise.findMany({
      where: levelsWhere,
      select: { level: true },
      distinct: ["level"],
      orderBy: { level: "asc" },
    });

    // Get distinct categories from ExerciseCategory (filtered by section and level)
    const categoryWhere: Record<string, unknown> = {};
    if (section || level) {
      categoryWhere.exercise = {};
      if (section) (categoryWhere.exercise as Record<string, string>).section = section;
      if (level) (categoryWhere.exercise as Record<string, string>).level = level;
    }
    const categoryRecords = await exerciseDb.exerciseCategory.findMany({
      where: categoryWhere,
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return NextResponse.json({
      sections: sections.map((s: { section: string }) => s.section),
      levels: levels.map((l: { level: string }) => l.level),
      categories: categoryRecords.map((c: { category: string }) => c.category),
    });
  } catch (error) {
    console.error("Error fetching filters:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}
