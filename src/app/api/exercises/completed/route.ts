import { NextResponse } from "next/server";
import { exerciseDb, progressDb } from "@/lib/db";

export async function GET() {
  try {
    const completedProgress = await progressDb.progress.findMany({
      where: { completed: true },
    });

    if (completedProgress.length === 0) {
      return NextResponse.json([]);
    }

    const exerciseIds = completedProgress.map((p) => p.exerciseId);
    const exercises = await exerciseDb.exercise.findMany({
      where: { id: { in: exerciseIds } },
      include: { categories: true },
    });

    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
    const progressMap = new Map(completedProgress.map((p) => [p.exerciseId, p]));

    // completedAt desc로 정렬
    const result = exerciseIds
      .map((id) => {
        const exercise = exerciseMap.get(id);
        const progress = progressMap.get(id);
        if (!exercise || !progress) return null;
        return { ...exercise, progress };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const dateA = a!.progress.completedAt ? new Date(a!.progress.completedAt).getTime() : 0;
        const dateB = b!.progress.completedAt ? new Date(b!.progress.completedAt).getTime() : 0;
        return dateB - dateA;
      });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching completed exercises:", error);
    return NextResponse.json({ error: "Failed to fetch completed exercises" }, { status: 500 });
  }
}
