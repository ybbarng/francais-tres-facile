import { type NextRequest, NextResponse } from "next/server";
import { exerciseDb, progressDb } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const exercise = await exerciseDb.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    const progress = await progressDb.progress.findUnique({
      where: { exerciseId: id },
    });

    return NextResponse.json({ ...exercise, progress: progress ?? null });
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
  }
}
