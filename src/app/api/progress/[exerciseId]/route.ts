import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import type { ProgressInput } from "@/types";

type RouteContext = {
  params: Promise<{ exerciseId: string }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { exerciseId } = await context.params;

    const progress = await prisma.progress.findUnique({
      where: { exerciseId },
      include: { exercise: true },
    });

    if (!progress) {
      return NextResponse.json(null);
    }

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch progress" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { exerciseId } = await context.params;
    const body: ProgressInput = await request.json();

    // 먼저 exercise가 존재하는지 확인
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    const progress = await prisma.progress.upsert({
      where: { exerciseId },
      update: {
        ...body,
        completedAt: body.completed ? new Date() : undefined,
      },
      create: {
        exerciseId,
        ...body,
        completedAt: body.completed ? new Date() : undefined,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { exerciseId } = await context.params;
    const body: ProgressInput = await request.json();

    const existing = await prisma.progress.findUnique({
      where: { exerciseId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Progress not found" },
        { status: 404 }
      );
    }

    const progress = await prisma.progress.update({
      where: { exerciseId },
      data: {
        ...body,
        completedAt: body.completed ? new Date() : existing.completedAt,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json(
      { error: "Failed to update progress" },
      { status: 500 }
    );
  }
}
