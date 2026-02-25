import { NextResponse } from "next/server";
import { exerciseDb, progressDb } from "@/lib/db";

export async function GET() {
  try {
    const progress = await progressDb.progress.findMany();
    const exerciseIds = progress.map((p) => p.exerciseId);

    const exercises = await exerciseDb.exercise.findMany({
      where: { id: { in: exerciseIds } },
      include: { categories: true },
    });
    const exerciseMap = new Map(exercises.map((e) => [e.id, e]));

    const progressWithExercise = progress.map((p) => ({
      ...p,
      exercise: exerciseMap.get(p.exerciseId) ?? null,
    }));

    // 통계 계산
    const total = await exerciseDb.exercise.count();
    const completed = await progressDb.progress.count({
      where: { completed: true },
    });

    const stats = {
      total,
      completed,
      inProgress: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };

    return NextResponse.json({ progress: progressWithExercise, stats });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
