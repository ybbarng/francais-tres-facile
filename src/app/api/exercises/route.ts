import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section");
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    const completed = searchParams.get("completed");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const where: Record<string, unknown> = {};

    if (section) {
      where.section = section;
    }

    if (level) {
      where.level = level;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.title = { contains: search };
    }

    if (completed !== null) {
      if (completed === "true") {
        where.progress = { completed: true };
      } else if (completed === "false") {
        where.OR = [{ progress: null }, { progress: { completed: false } }];
      }
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where,
        include: { progress: true },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.exercise.count({ where }),
    ]);

    return NextResponse.json({
      exercises,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching exercises:", error);
    return NextResponse.json({ error: "Failed to fetch exercises" }, { status: 500 });
  }
}
