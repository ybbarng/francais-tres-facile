import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    // Get completed IDs from query parameter (sent from client localStorage)
    const completedIds = request.nextUrl.searchParams.get("ids");

    if (!completedIds) {
      return NextResponse.json([]);
    }

    const ids = completedIds.split(",").filter(Boolean);

    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const exercises = await prisma.exercise.findMany({
      where: {
        id: { in: ids },
      },
    });

    return NextResponse.json(exercises);
  } catch (error) {
    console.error("Error fetching completed exercises:", error);
    return NextResponse.json({ error: "Failed to fetch completed exercises" }, { status: 500 });
  }
}
