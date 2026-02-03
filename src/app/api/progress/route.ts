import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const progress = await prisma.progress.findMany({
      include: { exercise: true },
      orderBy: { updatedAt: "desc" },
    });

    // 통계 계산
    const total = await prisma.exercise.count();
    const completed = await prisma.progress.count({
      where: { completed: true },
    });

    const stats = {
      total,
      completed,
      inProgress: total - completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    };

    return NextResponse.json({ progress, stats });
  } catch (error) {
    console.error("Error fetching progress:", error);
    return NextResponse.json({ error: "Failed to fetch progress" }, { status: 500 });
  }
}
