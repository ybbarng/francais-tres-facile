import { type NextRequest, NextResponse } from "next/server";
import { verifyPasswordWithRateLimit } from "@/lib/auth";
import { exerciseDb } from "@/lib/db";
import { generateShortId } from "@/lib/id";
import { scrapeAllExercises, scrapeSectionExercises } from "@/lib/scraper";
import type { SyncResult } from "@/types";

export async function POST(request: NextRequest) {
  const auth = verifyPasswordWithRateLimit(request);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const body = await request.json().catch(() => ({}));
    const sectionId = body.section; // Optional: sync specific section only

    const exercises = sectionId
      ? await scrapeSectionExercises(sectionId)
      : await scrapeAllExercises();

    // 기존 ID 맵 로드 (충돌 방지용)
    const existingExercises = await exerciseDb.exercise.findMany({
      select: { id: true, sourceUrl: true },
    });
    const idToUrl = new Map(existingExercises.map((e) => [e.id, e.sourceUrl]));

    const result: SyncResult = { added: 0, updated: 0, errors: [] };

    for (const exercise of exercises) {
      try {
        const existing = await exerciseDb.exercise.findUnique({
          where: { sourceUrl: exercise.sourceUrl },
          include: { categories: true },
        });

        if (existing) {
          await exerciseDb.exercise.update({
            where: { sourceUrl: exercise.sourceUrl },
            data: {
              title: exercise.title,
              section: exercise.section,
              level: exercise.level,
              audioUrl: exercise.audioUrl,
              h5pEmbedUrl: exercise.h5pEmbedUrl,
              thumbnailUrl: exercise.thumbnailUrl,
              publishedAt: exercise.publishedAt,
              // 새 category가 아직 없으면 추가
              categories: {
                connectOrCreate: {
                  where: {
                    exerciseId_category: {
                      exerciseId: existing.id,
                      category: exercise.category,
                    },
                  },
                  create: { category: exercise.category },
                },
              },
            },
          });
          result.updated++;
        } else {
          // 충돌 방지하며 ID 생성
          let suffix = 0;
          let id: string;
          while (true) {
            id = generateShortId(exercise.sourceUrl, suffix);
            const existingUrl = idToUrl.get(id);
            if (!existingUrl) {
              idToUrl.set(id, exercise.sourceUrl);
              break;
            }
            suffix++;
          }

          await exerciseDb.exercise.create({
            data: {
              id,
              title: exercise.title,
              section: exercise.section,
              level: exercise.level,
              sourceUrl: exercise.sourceUrl,
              audioUrl: exercise.audioUrl,
              h5pEmbedUrl: exercise.h5pEmbedUrl,
              thumbnailUrl: exercise.thumbnailUrl,
              publishedAt: exercise.publishedAt,
              categories: {
                create: { category: exercise.category },
              },
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
