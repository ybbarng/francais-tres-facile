import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { scrapeAllExercises, scrapeSectionExercises } from "@/lib/scraper";
import type { SyncResult } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sectionId = body.section; // Optional: sync specific section only

    const exercises = sectionId
      ? await scrapeSectionExercises(sectionId)
      : await scrapeAllExercises();

    const result: SyncResult = { added: 0, updated: 0, errors: [] };

    for (const exercise of exercises) {
      try {
        const existing = await prisma.exercise.findUnique({
          where: { sourceUrl: exercise.sourceUrl },
        });

        if (existing) {
          await prisma.exercise.update({
            where: { sourceUrl: exercise.sourceUrl },
            data: {
              title: exercise.title,
              section: exercise.section,
              level: exercise.level,
              category: exercise.category,
              audioUrl: exercise.audioUrl,
              h5pEmbedUrl: exercise.h5pEmbedUrl,
              thumbnailUrl: exercise.thumbnailUrl,
              publishedAt: exercise.publishedAt,
            },
          });
          result.updated++;
        } else {
          await prisma.exercise.create({
            data: {
              title: exercise.title,
              section: exercise.section,
              level: exercise.level,
              category: exercise.category,
              sourceUrl: exercise.sourceUrl,
              audioUrl: exercise.audioUrl,
              h5pEmbedUrl: exercise.h5pEmbedUrl,
              thumbnailUrl: exercise.thumbnailUrl,
              publishedAt: exercise.publishedAt,
            },
          });
          result.added++;
        }
      } catch (error) {
        result.errors.push(
          `Failed to save ${exercise.sourceUrl}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Sync error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 }
    );
  }
}
