import { type NextRequest, NextResponse } from "next/server";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { exerciseDb, progressDb } from "@/lib/db";
import { scrapeExerciseDetail } from "@/lib/scraper";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const { id } = await params;

    const exercise = await exerciseDb.exercise.findUnique({
      where: { id },
    });

    if (!exercise) {
      return NextResponse.json({ error: "Exercise not found" }, { status: 404 });
    }

    console.log(`Refreshing details for: ${exercise.sourceUrl}`);
    const details = await scrapeExerciseDetail(exercise.sourceUrl);

    const updated = await exerciseDb.exercise.update({
      where: { id },
      data: {
        audioUrl: details.audioUrl || exercise.audioUrl,
        h5pEmbedUrl: details.h5pEmbedUrl || exercise.h5pEmbedUrl,
        title: details.title || exercise.title,
      },
    });

    const progress = await progressDb.progress.findUnique({
      where: { exerciseId: id },
    });

    return NextResponse.json({
      success: true,
      exercise: { ...updated, progress: progress ?? null },
      detailsFound: {
        audioUrl: !!details.audioUrl,
        h5pEmbedUrl: !!details.h5pEmbedUrl,
      },
    });
  } catch (error) {
    console.error("Error refreshing exercise:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh exercise" },
      { status: 500 }
    );
  }
}
