import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { Exercise, Progress } from "@prisma/client";

type ExerciseWithProgress = Exercise & { progress: Progress | null };

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
    // Fetch uncompleted and non-hidden exercises from comprendre-actualite / A2
    const exercises = await prisma.exercise.findMany({
      where: {
        section: "comprendre-actualite",
        level: "A2",
        OR: [{ progress: null }, { progress: { completed: false, hidden: false } }],
      },
      include: { progress: true },
      orderBy: { publishedAt: "desc" },
    });

    // Sort by category priority, then by publishedAt desc
    const sortedExercises = exercises.sort((a, b) => {
      const priorityA = CATEGORY_PRIORITY.indexOf(a.category);
      const priorityB = CATEGORY_PRIORITY.indexOf(b.category);

      // If category not in priority list, put at end
      const effectivePriorityA = priorityA === -1 ? CATEGORY_PRIORITY.length : priorityA;
      const effectivePriorityB = priorityB === -1 ? CATEGORY_PRIORITY.length : priorityB;

      if (effectivePriorityA !== effectivePriorityB) {
        return effectivePriorityA - effectivePriorityB;
      }

      // Same category: sort by publishedAt desc
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    // Return top 5
    return NextResponse.json({
      exercises: sortedExercises.slice(0, 5),
      total: sortedExercises.length,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
