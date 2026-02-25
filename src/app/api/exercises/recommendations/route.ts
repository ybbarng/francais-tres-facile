import { NextResponse } from "next/server";
import { exerciseDb, getProgressMap } from "@/lib/db";

// Category priority order for home page recommendations
const CATEGORY_PRIORITY = [
  "Société",
  "Culture",
  "Économie",
  "Politique",
  "Environnement",
  "Sciences/Santé",
];

export async function GET() {
  try {
    const exercises = await exerciseDb.exercise.findMany({
      where: {
        section: "comprendre-actualite",
        level: "A2",
      },
      include: { categories: true },
      orderBy: { publishedAt: "desc" },
    });

    const progressMap = await getProgressMap(exercises.map((e) => e.id));

    // Filter: uncompleted and non-hidden
    const filtered = exercises
      .filter((e) => {
        const progress = progressMap.get(e.id);
        if (!progress) return true;
        return !progress.completed && !progress.hidden;
      })
      .map((e) => ({
        ...e,
        progress: progressMap.get(e.id) ?? null,
      }));

    // Sort by best category priority, then by publishedAt desc
    const sortedExercises = filtered.sort((a, b) => {
      const bestPriority = (cats: { category: string }[]) => {
        let best = CATEGORY_PRIORITY.length;
        for (const c of cats) {
          const idx = CATEGORY_PRIORITY.indexOf(c.category);
          if (idx !== -1 && idx < best) best = idx;
        }
        return best;
      };

      const priorityA = bestPriority(a.categories);
      const priorityB = bestPriority(b.categories);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    return NextResponse.json({
      exercises: sortedExercises.slice(0, 5),
      total: sortedExercises.length,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
