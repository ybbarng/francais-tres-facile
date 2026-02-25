import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/exercises/index.js";
import { scrapeExerciseDetail } from "../src/lib/scraper.js";

async function main() {
  const dbPath = path.join(process.cwd(), "data", "exercises.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  const db = new PrismaClient({ adapter });

  // h5pEmbedUrl이 null인 exercise 조회
  const exercises = await db.exercise.findMany({
    where: { h5pEmbedUrl: null },
  });

  console.log(`Found ${exercises.length} exercises with missing h5pEmbedUrl\n`);

  let updated = 0;
  let failed = 0;

  for (const exercise of exercises) {
    try {
      console.log(`Fetching: ${exercise.title}`);
      const details = await scrapeExerciseDetail(exercise.sourceUrl);

      const data: Record<string, string> = {};
      if (details.h5pEmbedUrl) data.h5pEmbedUrl = details.h5pEmbedUrl;
      if (details.audioUrl && !exercise.audioUrl) data.audioUrl = details.audioUrl;

      if (Object.keys(data).length > 0) {
        await db.exercise.update({
          where: { id: exercise.id },
          data,
        });
        console.log(`  OK  h5p: ${data.h5pEmbedUrl ? "found" : "still null"}, audio: ${data.audioUrl ? "found" : "ok"}`);
        updated++;
      } else {
        console.log(`  SKIP  no new data found`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (e) {
      console.error(`  ERR  ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Updated: ${updated}, Failed: ${failed}`);
  console.log(`========================================\n`);

  await db.$disconnect();
}

main().catch(console.error);
