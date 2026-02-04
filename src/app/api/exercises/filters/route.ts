import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section");
    const level = searchParams.get("level");

    // Build where clause for filtering
    const where: Record<string, string> = {};
    if (section) {
      where.section = section;
    }
    if (level) {
      where.level = level;
    }

    // Get distinct sections
    const sections = await prisma.exercise.findMany({
      select: { section: true },
      distinct: ["section"],
      orderBy: { section: "asc" },
    });

    // Get distinct levels (filtered by section if provided)
    const levelsWhere: Record<string, string> = {};
    if (section) {
      levelsWhere.section = section;
    }
    const levels = await prisma.exercise.findMany({
      where: levelsWhere,
      select: { level: true },
      distinct: ["level"],
      orderBy: { level: "asc" },
    });

    // Get distinct categories (filtered by section and level if provided)
    const categories = await prisma.exercise.findMany({
      where,
      select: { category: true },
      distinct: ["category"],
      orderBy: { category: "asc" },
    });

    return NextResponse.json({
      sections: sections.map((s: { section: string }) => s.section),
      levels: levels.map((l: { level: string }) => l.level),
      categories: categories.map((c: { category: string }) => c.category),
    });
  } catch (error) {
    console.error("Error fetching filters:", error);
    return NextResponse.json({ error: "Failed to fetch filters" }, { status: 500 });
  }
}
