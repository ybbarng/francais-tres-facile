import { type NextRequest, NextResponse } from "next/server";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { exerciseDb, progressDb } from "@/lib/db";
import type { ProgressInput } from "@/types";

type RouteContext = {
  params: Promise<{ exerciseId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { exerciseId } = await context.params;

    const progress = await progressDb.progress.findUnique({
      where: { exerciseId },
    });

    if (!progress) {
      return NextResponse.json(null);
    }

    const exercise = await exerciseDb.exercise.findUnique({
      where: { id: exerciseId },
      include: { categories: true },
    });

    return NextResponse.json({ ...progress, exercise: exercise ?? null });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { exerciseId } = await context.params;
    const body: ProgressInput = await request.json();

    // 먼저 exercise가 존재하는지 확인
    const exercise = await exerciseDb.exercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    // 기존 progress 확인
    const existing = await progressDb.progress.findUnique({
      where: { exerciseId },
    });

    // completedAt 처리:
    // 1. 명시적으로 제공되면 그 값 사용
    // 2. 기존에 completedAt이 있으면 유지
    // 3. 새로 completed가 true가 되면 현재 시간
    let completedAt: Date | null | undefined;
    if (body.completedAt !== undefined) {
      completedAt = body.completedAt ? new Date(body.completedAt) : null;
    } else if (existing?.completedAt) {
      completedAt = existing.completedAt;
    } else if (body.completed) {
      completedAt = new Date();
    }

    const progress = await progressDb.progress.upsert({
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
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { exerciseId } = await context.params;
    const body: ProgressInput = await request.json();

    const existing = await progressDb.progress.findUnique({
      where: { exerciseId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Progress not found" }, { status: 404 });
    }

    // completedAt 처리:
    // 1. 명시적으로 제공되면 그 값 사용
    // 2. 기존에 completedAt이 있으면 유지
    // 3. 새로 completed가 true가 되면 현재 시간
    let completedAt: Date | null | undefined;
    if (body.completedAt !== undefined) {
      completedAt = body.completedAt ? new Date(body.completedAt) : null;
    } else if (existing.completedAt) {
      completedAt = existing.completedAt;
    } else if (body.completed) {
      completedAt = new Date();
    }

    const progress = await progressDb.progress.update({
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
