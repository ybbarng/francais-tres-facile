import { type NextRequest, NextResponse } from "next/server";
import { unauthorizedResponse, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { ProgressInput } from "@/types";

type RouteContext = {
  params: Promise<{ exerciseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
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
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!verifyPassword(request)) {
    return unauthorizedResponse();
  }

  try {
    const { exerciseId } = await context.params;
    const body: ProgressInput = await request.json();

    // 먼저 exercise가 존재하는지 확인
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // completedAt 처리: 명시적으로 제공되면 그 값 사용, 아니면 completed가 true일 때 현재 시간
    const completedAt =
      body.completedAt !== undefined
        ? body.completedAt
          ? new Date(body.completedAt)
          : null
        : body.completed
          ? new Date()
          : undefined;

    const progress = await prisma.progress.upsert({
      where: { exerciseId },
      update: {
        ...body,
        completedAt,
      },
      create: {
        exerciseId,
        ...body,
        completedAt,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!verifyPassword(request)) {
    return unauthorizedResponse();
  }

  try {
    const { exerciseId } = await context.params;
    const body: ProgressInput = await request.json();

    const existing = await prisma.progress.findUnique({
      where: { exerciseId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    // completedAt 처리: 명시적으로 제공되면 그 값 사용
    const completedAt =
      body.completedAt !== undefined
        ? body.completedAt
          ? new Date(body.completedAt)
          : null
        : body.completed
          ? new Date()
          : existing.completedAt;

    const progress = await prisma.progress.update({
      where: { exerciseId },
      data: {
        ...body,
        completedAt,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error updating progress:", error);
    return NextResponse.json({ error: "Failed to update progress" }, { status: 500 });
  }
}
