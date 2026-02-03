import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const completedExercises = await prisma.exercise.findMany({
      where: {
        progress: {
          completed: true,
        },
      },
      include: {
        progress: true,
      },
      orderBy: {
        progress: {
          completedAt: "desc",
        },
      },
    });

    return NextResponse.json(completedExercises);
  } catch (error) {
    console.error("Error fetching completed exercises:", error);
    return NextResponse.json({ error: "Failed to fetch completed exercises" }, { status: 500 });
  }
}
