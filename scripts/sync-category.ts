import path from "node:path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/exercises/index.js";
import { scrapeCategory, scrapeExerciseDetail } from "../src/lib/scraper.js";
import type { CategoryInfo } from "../src/lib/scraper.js";
import { generateShortId } from "../src/lib/id.js";

const categoryUrl = process.argv[2];
if (!categoryUrl) {
  console.error("Usage: npx tsx scripts/sync-category.ts <category-url>");
  console.error("Example: npx tsx scripts/sync-category.ts https://francaisfacile.rfi.fr/fr/comprendre-actualit%C3%A9-fran%C3%A7ais/culture-a2/");
  process.exit(1);
}

// Extract category info from URL
function extractFromUrl(url: string): CategoryInfo {
  const sectionMatch = url.includes("comprendre-actualit") ? "comprendre-actualite" : "communiquer-quotidien";
  const levelMatch = url.match(/-(?:a1|a2|b1|b2|c1c2)\/?$/i);
  const level = levelMatch ? levelMatch[0].replace(/[-/]/g, "").toUpperCase() : "A2";
  const categoryMatch = url.match(/\/([^/]+)-(?:a1|a2|b1|b2|c1c2)\/?$/i);
  const category = categoryMatch
    ? decodeURIComponent(categoryMatch[1]).charAt(0).toUpperCase() + decodeURIComponent(categoryMatch[1]).slice(1)
    : "Unknown";

  return { url, section: sectionMatch, level, category };
}

async function main() {
  const dbPath = path.join(process.cwd(), "data", "exercises.db");
  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  const db = new PrismaClient({ adapter });

  const categoryInfo = extractFromUrl(categoryUrl);
  console.log(`\nSyncing: ${categoryInfo.category} (${categoryInfo.level})`);
  console.log(`URL: ${categoryInfo.url}\n`);

  // Scrape exercises from category pages
  const scrapedExercises = await scrapeCategory(categoryInfo);
  console.log(`\nFound ${scrapedExercises.length} exercises\n`);

  // Load existing ID map
  const existingExercises = await db.exercise.findMany({
    select: { id: true, sourceUrl: true },
  });
  const idToUrl = new Map(existingExercises.map((e) => [e.id, e.sourceUrl]));

  let added = 0;
  let tagAdded = 0;
  let skipped = 0;
  let errors = 0;

  for (const exercise of scrapedExercises) {
    try {
      const existing = await db.exercise.findUnique({
        where: { sourceUrl: exercise.sourceUrl },
        include: { categories: true },
      });

      if (existing) {
        // Exercise already exists — add category tag if missing
        const hasCategory = existing.categories.some((c) => c.category === categoryInfo.category);
        if (!hasCategory) {
          await db.exerciseCategory.create({
            data: {
              exerciseId: existing.id,
              category: categoryInfo.category,
            },
          });
          console.log(`  TAG  ${existing.title}`);
          tagAdded++;
        } else {
          skipped++;
        }
      } else {
        // New exercise — fetch details and create
        console.log(`  Fetching details: ${exercise.sourceUrl}`);
        try {
          const details = await scrapeExerciseDetail(exercise.sourceUrl);
          if (details.audioUrl) exercise.audioUrl = details.audioUrl;
          if (details.h5pEmbedUrl) exercise.h5pEmbedUrl = details.h5pEmbedUrl;
          if (details.title) exercise.title = details.title;
          if (details.transcript) exercise.transcript = details.transcript;
        } catch {
          console.log(`    (details fetch failed, using basic info)`);
        }

        // Generate unique ID
        let suffix = 0;
        let id: string;
        while (true) {
          id = generateShortId(exercise.sourceUrl, suffix);
          if (!idToUrl.has(id)) {
            idToUrl.set(id, exercise.sourceUrl);
            break;
          }
          suffix++;
        }

        await db.exercise.create({
          data: {
            id,
            title: exercise.title,
            section: exercise.section,
            level: exercise.level,
            sourceUrl: exercise.sourceUrl,
            audioUrl: exercise.audioUrl,
            h5pEmbedUrl: exercise.h5pEmbedUrl,
            thumbnailUrl: exercise.thumbnailUrl,
            transcript: exercise.transcript,
            publishedAt: exercise.publishedAt,
            categories: {
              create: { category: categoryInfo.category },
            },
          },
        });
        console.log(`  NEW  ${exercise.title}`);
        added++;

        // Rate limiting
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    } catch (e) {
      console.error(`  ERR  ${exercise.sourceUrl}: ${e instanceof Error ? e.message : e}`);
      errors++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Results:`);
  console.log(`  New exercises: ${added}`);
  console.log(`  Tags added:    ${tagAdded}`);
  console.log(`  Skipped:       ${skipped}`);
  console.log(`  Errors:        ${errors}`);
  console.log(`========================================\n`);

  await db.$disconnect();
}

main().catch(console.error);
