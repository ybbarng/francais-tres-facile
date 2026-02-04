import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;

    const exercise = await prisma.exercise.findUnique({
      where: { id },
      include: { progress: true },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    return NextResponse.json(exercise);
  } catch (error) {
    console.error("Error fetching exercise:", error);
    return NextResponse.json({ error: "Failed to fetch exercise" }, { status: 500 });
  }
}
