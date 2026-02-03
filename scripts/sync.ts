#!/usr/bin/env npx tsx

/**
 * Local sync script using Playwright for H5P extraction
 * Run with: pnpm sync
 */

import { type Browser, chromium, type Page } from "playwright";
import { prisma } from "../src/lib/db";
import { RFI_SECTIONS } from "../src/lib/rfi-headers";
import { type ScrapedExercise, scrapeSectionExercises } from "../src/lib/scraper";

let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser) {
    console.log("Launching browser...");
    browser = await chromium.launch({
      headless: true,
    });
  }
  return browser;
}

async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

/**
 * Accept cookie consent modal (Didomi)
 */
async function acceptCookieConsent(page: Page): Promise<void> {
  try {
    const acceptButton = page.locator("#didomi-notice-agree-button");
    if (await acceptButton.isVisible({ timeout: 3000 })) {
      await acceptButton.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // No consent dialog or already accepted
  }
}

/**
 * Close Poool newsletter modal (inside iframe)
 */
async function closePooolModal(page: Page): Promise<void> {
  try {
    const pooolIframe = page.locator("iframe.p3-outlet");
    if ((await pooolIframe.count()) > 0) {
      const frame = page.frameLocator("iframe.p3-outlet");
      await frame.locator("img.cursor-pointer").click({ timeout: 3000 });
      await page.waitForTimeout(500);
    }
  } catch {
    // Modal might not exist or already closed
  }
}

/**
 * Dismiss all modals
 */
async function dismissModals(page: Page): Promise<void> {
  await acceptCookieConsent(page);
  await page.waitForTimeout(1000);
  await closePooolModal(page);
}

/**
 * Extract H5P URL from a page using Playwright
 */
async function extractH5PUrl(page: Page, url: string): Promise<string | null> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1000);

    // Dismiss all modals (cookie consent, newsletter, etc.)
    await dismissModals(page);

    // Scroll down to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(2000);

    // Dismiss modals again (might appear after scroll)
    await dismissModals(page);

    // Wait for H5P iframe to appear
    try {
      await page.waitForSelector('iframe[src*="h5p"], iframe[src*="fle-rfi"]', { timeout: 5000 });
    } catch {
      // Iframe might not exist on this page
    }

    // Find H5P iframe
    const h5pUrl = await page.evaluate(() => {
      const iframe = document.querySelector('iframe[src*="h5p"]') as HTMLIFrameElement;
      if (iframe) return iframe.src;

      const fleIframe = document.querySelector('iframe[src*="fle-rfi"]') as HTMLIFrameElement;
      if (fleIframe) return fleIframe.src;

      // Check all iframes
      const allIframes = document.querySelectorAll("iframe");
      for (const f of allIframes) {
        if (f.src && (f.src.includes("h5p") || f.src.includes("embed"))) {
          return f.src;
        }
      }

      return null;
    });

    return h5pUrl;
  } catch (error) {
    console.error(`  Error extracting H5P from ${url}:`, error);
    return null;
  }
}

/**
 * Fetch exercise details using Playwright
 */
async function fetchExerciseDetails(exercises: ScrapedExercise[]): Promise<void> {
  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });

  const page = await context.newPage();

  console.log(`\nFetching details for ${exercises.length} exercises...`);

  let processed = 0;
  let h5pFound = 0;

  for (const exercise of exercises) {
    try {
      const h5pUrl = await extractH5PUrl(page, exercise.sourceUrl);

      if (h5pUrl) {
        exercise.h5pEmbedUrl = h5pUrl;
        h5pFound++;
        console.log(
          `  ✓ [${processed + 1}/${exercises.length}] Found H5P: ${exercise.title.substring(0, 40)}...`
        );
      } else {
        console.log(
          `  - [${processed + 1}/${exercises.length}] No H5P: ${exercise.title.substring(0, 40)}...`
        );
      }

      processed++;

      // Progress update every 10 exercises
      if (processed % 10 === 0) {
        console.log(`  Progress: ${processed}/${exercises.length} (${h5pFound} with H5P)`);
      }
    } catch (_error) {
      console.error(`  ✗ Failed: ${exercise.sourceUrl}`);
      processed++;
    }
  }

  await context.close();
  console.log(`\nDetails fetched: ${h5pFound}/${processed} have H5P quizzes`);
}

/**
 * Save exercises to database
 */
async function saveExercises(
  exercises: ScrapedExercise[]
): Promise<{ added: number; updated: number }> {
  let added = 0;
  let updated = 0;

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
        updated++;
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
        added++;
      }
    } catch (_error) {
      console.error(`  Failed to save: ${exercise.sourceUrl}`);
    }
  }

  return { added, updated };
}

/**
 * Update H5P URLs for existing exercises that don't have them
 */
async function updateMissingH5P(): Promise<void> {
  console.log("\n========================================");
  console.log("Updating exercises without H5P URLs...");
  console.log("========================================\n");

  const exercisesWithoutH5P = await prisma.exercise.findMany({
    where: { h5pEmbedUrl: null },
    orderBy: { publishedAt: "desc" },
  });

  if (exercisesWithoutH5P.length === 0) {
    console.log("All exercises already have H5P URLs!");
    return;
  }

  console.log(`Found ${exercisesWithoutH5P.length} exercises without H5P`);

  const browser = await getBrowser();
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });
  const page = await context.newPage();

  let updated = 0;

  for (let i = 0; i < exercisesWithoutH5P.length; i++) {
    const exercise = exercisesWithoutH5P[i];
    const h5pUrl = await extractH5PUrl(page, exercise.sourceUrl);

    if (h5pUrl) {
      await prisma.exercise.update({
        where: { id: exercise.id },
        data: { h5pEmbedUrl: h5pUrl },
      });
      updated++;
      console.log(
        `  ✓ [${i + 1}/${exercisesWithoutH5P.length}] ${exercise.title.substring(0, 40)}...`
      );
    } else {
      console.log(`  - [${i + 1}/${exercisesWithoutH5P.length}] No H5P found`);
    }
  }

  await context.close();
  console.log(`\nUpdated ${updated} exercises with H5P URLs`);
}

/**
 * Full sync: scrape all sections and fetch H5P details
 */
async function fullSync(): Promise<void> {
  console.log("\n========================================");
  console.log("Full Sync: Scraping all sections");
  console.log("========================================\n");

  // Step 1: Scrape exercise list (without Playwright)
  const allExercises: ScrapedExercise[] = [];
  const seenUrls = new Set<string>();

  for (const section of RFI_SECTIONS) {
    console.log(`\nScraping section: ${section.name}`);
    try {
      const sectionExercises = await scrapeSectionExercises(section.id);

      for (const exercise of sectionExercises) {
        if (!seenUrls.has(exercise.sourceUrl)) {
          seenUrls.add(exercise.sourceUrl);
          allExercises.push(exercise);
        }
      }
      console.log(`  Found ${sectionExercises.length} exercises`);
    } catch (error) {
      console.error(`  Error scraping section: ${error}`);
    }
  }

  console.log(`\nTotal unique exercises: ${allExercises.length}`);

  // Step 2: Fetch H5P details with Playwright
  await fetchExerciseDetails(allExercises);

  // Step 3: Save to database
  console.log("\nSaving to database...");
  const { added, updated } = await saveExercises(allExercises);
  console.log(`Done! Added: ${added}, Updated: ${updated}`);
}

/**
 * Main CLI
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] || "update-h5p";

  console.log("Français Très Facile - Sync Tool");
  console.log("================================\n");

  try {
    switch (command) {
      case "full":
        await fullSync();
        break;

      case "update-h5p":
        await updateMissingH5P();
        break;

      case "help":
        console.log("Usage: pnpm sync [command]");
        console.log("");
        console.log("Commands:");
        console.log("  full       - Full sync: scrape all sections + fetch H5P");
        console.log("  update-h5p - Update H5P URLs for existing exercises (default)");
        console.log("  help       - Show this help");
        break;

      default:
        console.log(`Unknown command: ${command}`);
        console.log("Use 'pnpm sync help' for usage");
    }
  } catch (error) {
    console.error("Sync failed:", error);
    process.exit(1);
  } finally {
    await closeBrowser();
  }
}

main();
