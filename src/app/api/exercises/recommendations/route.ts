import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

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
    // Fetch all exercises from comprendre-actualite / A2
    // Progress filtering is now done client-side with localStorage
    const exercises = await prisma.exercise.findMany({
      where: {
        section: "comprendre-actualite",
        level: "A2",
      },
      orderBy: { publishedAt: "desc" },
    });

    // Get total count
    const totalExercises = await prisma.exercise.count();

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

    return NextResponse.json({
      exercises: sortedExercises,
      total: sortedExercises.length,
      totalExercises,
    });
  } catch (error) {
    console.error("Error fetching recommendations:", error);
    return NextResponse.json({ error: "Failed to fetch recommendations" }, { status: 500 });
  }
}
