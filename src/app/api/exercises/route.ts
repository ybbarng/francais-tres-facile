import { type NextRequest, NextResponse } from "next/server";
import { exerciseDb, getProgressMap } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const section = searchParams.get("section");
    const level = searchParams.get("level");
    const category = searchParams.get("category");
    const completed = searchParams.get("completed");
    const search = searchParams.get("search");
    const hasAudio = searchParams.get("hasAudio");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "24", 10);

    const where: Record<string, unknown> = {};

    if (hasAudio === "true") {
      where.audioUrl = { not: null };
    }

    if (section) {
      where.section = section;
    }

    if (level) {
      where.level = level;
    }

    if (category) {
      where.categories = { some: { category } };
    }

    if (search) {
      where.title = { contains: search };
    }

    if (completed !== null && (completed === "true" || completed === "false")) {
      const allExercises = await exerciseDb.exercise.findMany({
        where,
        include: { categories: true },
        orderBy: { publishedAt: "desc" },
      });

      const progressMap = await getProgressMap(allExercises.map((e) => e.id));

      const filtered = allExercises.filter((e) => {
        const progress = progressMap.get(e.id);
        if (completed === "true") {
          return progress?.completed === true;
        }
        return !progress || progress.completed === false;
      });

      const total = filtered.length;
      const paginated = filtered.slice((page - 1) * limit, page * limit);
      const exercises = paginated.map((e) => ({
        ...e,
        progress: progressMap.get(e.id) ?? null,
      }));

      return NextResponse.json({
        exercises,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    }

    const [exercises, total] = await Promise.all([
      exerciseDb.exercise.findMany({
        where,
        include: { categories: true },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      exerciseDb.exercise.count({ where }),
    ]);

    const progressMap = await getProgressMap(exercises.map((e) => e.id));

    const exercisesWithProgress = exercises.map((e) => ({
      ...e,
      progress: progressMap.get(e.id) ?? null,
    }));

    return NextResponse.json({
      exercises: exercisesWithProgress,
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
