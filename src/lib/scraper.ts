import * as cheerio from "cheerio";
import type { RFISection } from "./rfi-headers";
import { RFI_BASE_URL, RFI_HEADERS, RFI_LEVELS, RFI_SECTIONS } from "./rfi-headers";

export interface ScrapedExercise {
  title: string;
  section: string;
  level: string;
  category: string;
  sourceUrl: string;
  audioUrl: string | null;
  h5pEmbedUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
}

export interface CategoryInfo {
  url: string;
  section: string;
  level: string;
  category: string;
}

export async function fetchRFIPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: RFI_HEADERS,
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }
  return res.text();
}

function parseDate(dateStr: string): Date | null {
  const ddmmyyyy = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return new Date(`${year}-${month}-${day}`);
  }

  const yyyymmdd = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (yyyymmdd) {
    return new Date(dateStr);
  }

  return null;
}

function extractDateFromUrl(url: string): Date | null {
  const match = url.match(/\/(\d{4})(\d{2})(\d{2})-/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}`);
  }
  return null;
}

/**
 * Extract level from URL (e.g., société-a2 -> A2, culture-c1c2 -> C1C2)
 */
function extractLevelFromUrl(url: string): string {
  const lowerUrl = url.toLowerCase();
  for (const level of RFI_LEVELS) {
    if (
      lowerUrl.includes(`-${level.toLowerCase()}/`) ||
      lowerUrl.includes(`-${level.toLowerCase()}`)
    ) {
      return level;
    }
  }
  return "A2"; // Default
}

/**
 * Extract category name from URL (e.g., /société-a2/ -> Société)
 */
function extractCategoryFromUrl(url: string): string {
  // Match pattern like /category-level/ where level is a1, a2, b1, b2, or c1c2
  const match = url.match(/\/([^/]+)-(?:a1|a2|b1|b2|c1c2)\/?$/i);
  if (match) {
    const category = decodeURIComponent(match[1]);
    return category.charAt(0).toUpperCase() + category.slice(1);
  }
  return "Exercice";
}

/**
 * Extract section ID from URL
 */
function extractSectionFromUrl(url: string): string {
  if (url.includes("comprendre-actualit")) {
    return "comprendre-actualite";
  }
  if (url.includes("communiquer-quotidien")) {
    return "communiquer-quotidien";
  }
  return "unknown";
}

/**
 * Fetch all category URLs from a section page
 */
export async function scrapeSectionCategories(section: RFISection): Promise<CategoryInfo[]> {
  console.log(`Fetching categories from: ${section.name}`);
  const html = await fetchRFIPage(section.url);
  const $ = cheerio.load(html);

  const categories: CategoryInfo[] = [];
  const seenUrls = new Set<string>();

  // Find all category links that match the pattern /{category}-{level}/
  const levelPattern = RFI_LEVELS.map((l) => l.toLowerCase()).join("|");
  const regex = new RegExp(`-(?:${levelPattern})/?$`, "i");

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    // Only process French URLs
    if (!href.includes("/fr/")) return;

    // Check if URL matches category-level pattern
    if (!regex.test(href)) return;

    const fullUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;

    // Skip duplicates
    if (seenUrls.has(fullUrl)) return;
    seenUrls.add(fullUrl);

    const level = extractLevelFromUrl(fullUrl);
    const category = extractCategoryFromUrl(fullUrl);

    categories.push({
      url: fullUrl,
      section: section.id,
      level,
      category,
    });
  });

  console.log(`Found ${categories.length} categories in ${section.name}`);
  return categories;
}

/**
 * Scrape exercises from a single category page
 */
export async function scrapeCategoryPage(
  categoryInfo: CategoryInfo,
  page = 1
): Promise<{ exercises: ScrapedExercise[]; hasMore: boolean }> {
  let url: string;
  if (page === 1) {
    url = categoryInfo.url.endsWith("/") ? categoryInfo.url : `${categoryInfo.url}/`;
  } else {
    const baseUrl = categoryInfo.url.endsWith("/") ? categoryInfo.url : `${categoryInfo.url}/`;
    url = `${baseUrl}${page}/#pager`;
  }

  console.log(`  Fetching: ${url}`);
  const html = await fetchRFIPage(url);
  const $ = cheerio.load(html);

  const exercises: ScrapedExercise[] = [];
  const seenUrls = new Set<string>();

  // Structure for category pages: m-item-list-article with data-article-item-link
  $(".m-item-list-article").each((_, el) => {
    const $el = $(el);

    const linkEl = $el.find("a[data-article-item-link]").first();
    const href = linkEl.attr("href");

    if (!href) return;

    const sourceUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;

    // Skip duplicates within same page (image + title links)
    if (seenUrls.has(sourceUrl)) return;
    seenUrls.add(sourceUrl);

    const title = $el.find("h2").first().text().trim();
    if (!title) return;

    const imgEl = $el.find("img").first();
    const thumbnailUrl = imgEl.attr("src") || imgEl.attr("data-src") || null;

    const timeEl = $el.find("time");
    let publishedAt: Date | null = null;
    if (timeEl.length > 0) {
      const datetime = timeEl.attr("datetime");
      if (datetime) {
        publishedAt = parseDate(datetime);
      }
    }
    if (!publishedAt) {
      publishedAt = extractDateFromUrl(href);
    }

    exercises.push({
      title,
      section: categoryInfo.section,
      level: categoryInfo.level,
      category: categoryInfo.category,
      sourceUrl,
      audioUrl: null,
      h5pEmbedUrl: null,
      thumbnailUrl,
      publishedAt,
    });
  });

  // Check for next page
  const hasMore =
    $(`a[href*="/${page + 1}/"]`).length > 0 ||
    $('a[rel="next"]').length > 0 ||
    $(".m-pagination__link--next").length > 0;

  return { exercises, hasMore };
}

/**
 * Scrape all pages of a single category
 */
export async function scrapeCategory(categoryInfo: CategoryInfo): Promise<ScrapedExercise[]> {
  const exercises: ScrapedExercise[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { exercises: pageExercises, hasMore: more } = await scrapeCategoryPage(
      categoryInfo,
      page
    );
    console.log(`    Page ${page}: ${pageExercises.length} exercises`);
    exercises.push(...pageExercises);
    hasMore = more;
    page++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return exercises;
}

/**
 * Scrape exercise detail page for audio and H5P URLs
 */
export async function scrapeExerciseDetail(sourceUrl: string): Promise<Partial<ScrapedExercise>> {
  const html = await fetchRFIPage(sourceUrl);
  const $ = cheerio.load(html);

  // MP3 URL extraction
  let audioUrl: string | null = null;

  // 1. audio tag
  const audioSrc = $("audio source").attr("src") || $("audio").attr("src");
  if (audioSrc) {
    audioUrl = audioSrc;
  }

  // 2. data attributes
  if (!audioUrl) {
    const dataUrl =
      $("[data-url*='.mp3'], [data-audio*='.mp3']").attr("data-url") ||
      $("[data-url*='.mp3'], [data-audio*='.mp3']").attr("data-audio");
    if (dataUrl) audioUrl = dataUrl;
  }

  // 3. JSON data in scripts
  if (!audioUrl) {
    const scripts = $("script").text();
    const jsonMatch = scripts.match(/"sources"\s*:\s*\[\s*\{\s*"url"\s*:\s*"([^"]+\.mp3[^"]*)"/);
    if (jsonMatch) {
      audioUrl = jsonMatch[1];
    }
  }

  // 4. Akamai MP3 URL in scripts
  if (!audioUrl) {
    const scripts = $("script").text();
    const mp3Match = scripts.match(/https?:\/\/[^"'\s]+akamaized\.net[^"'\s]+\.mp3/);
    if (mp3Match) audioUrl = mp3Match[0];
  }

  // 5. Any MP3 URL
  if (!audioUrl) {
    const scripts = $("script").text();
    const mp3Match = scripts.match(/https?:\/\/[^"'\s]+\.mp3/);
    if (mp3Match) audioUrl = mp3Match[0];
  }

  // H5P iframe URL
  let h5pEmbedUrl: string | null = null;
  const h5pIframe = $('iframe[src*="h5p"]');
  if (h5pIframe.length > 0) {
    h5pEmbedUrl = h5pIframe.attr("src") || null;
  }

  // Level extraction from page content
  const levelMatch = $("body")
    .text()
    .match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  const level = levelMatch ? levelMatch[1].toUpperCase() : undefined;

  // Title from h1
  const title = $("h1").first().text().trim() || undefined;

  return {
    audioUrl,
    h5pEmbedUrl,
    level,
    title,
  };
}

/**
 * Scrape all exercises from a specific section
 */
export async function scrapeSectionExercises(sectionId: string): Promise<ScrapedExercise[]> {
  const section = RFI_SECTIONS.find((s) => s.id === sectionId);
  if (!section) {
    throw new Error(`Unknown section: ${sectionId}`);
  }

  const categories = await scrapeSectionCategories(section);
  const allExercises: ScrapedExercise[] = [];
  const seenUrls = new Set<string>();

  for (const categoryInfo of categories) {
    console.log(`\n  Scraping: ${categoryInfo.category} (${categoryInfo.level})`);
    const categoryExercises = await scrapeCategory(categoryInfo);

    // Deduplicate
    let added = 0;
    let duplicates = 0;
    for (const exercise of categoryExercises) {
      if (!seenUrls.has(exercise.sourceUrl)) {
        seenUrls.add(exercise.sourceUrl);
        allExercises.push(exercise);
        added++;
      } else {
        duplicates++;
      }
    }
    console.log(`    Added ${added}, skipped ${duplicates} duplicates`);

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return allExercises;
}

/**
 * Scrape all exercises from all sections
 */
export async function scrapeAllExercises(): Promise<ScrapedExercise[]> {
  const allExercises: ScrapedExercise[] = [];
  const seenUrls = new Set<string>();

  for (const section of RFI_SECTIONS) {
    console.log(`\n========================================`);
    console.log(`Scraping section: ${section.name}`);
    console.log(`========================================`);

    const sectionExercises = await scrapeSectionExercises(section.id);

    // Deduplicate across sections
    let added = 0;
    for (const exercise of sectionExercises) {
      if (!seenUrls.has(exercise.sourceUrl)) {
        seenUrls.add(exercise.sourceUrl);
        allExercises.push(exercise);
        added++;
      }
    }
    console.log(`\nSection total: ${added} unique exercises`);
  }

  console.log(`\n========================================`);
  console.log(`Total unique exercises: ${allExercises.length}`);
  console.log(`Fetching exercise details...`);
  console.log(`========================================`);

  // Fetch details for each exercise
  let detailsCount = 0;
  for (const exercise of allExercises) {
    try {
      const details = await scrapeExerciseDetail(exercise.sourceUrl);
      if (details.audioUrl) exercise.audioUrl = details.audioUrl;
      if (details.h5pEmbedUrl) exercise.h5pEmbedUrl = details.h5pEmbedUrl;
      if (details.title) exercise.title = details.title;
      detailsCount++;

      if (detailsCount % 20 === 0) {
        console.log(`  Progress: ${detailsCount}/${allExercises.length}`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (_error) {
      console.error(`  Failed: ${exercise.sourceUrl}`);
    }
  }

  console.log(`\nDone! Total: ${allExercises.length} exercises`);
  return allExercises;
}

// Legacy function for backward compatibility with tests
export async function scrapeExerciseList(
  page = 1,
  categoryUrl?: string
): Promise<{ exercises: ScrapedExercise[]; hasMore: boolean }> {
  const defaultCategory: CategoryInfo = {
    url:
      categoryUrl ||
      "https://francaisfacile.rfi.fr/fr/comprendre-actualit%C3%A9-fran%C3%A7ais/soci%C3%A9t%C3%A9-a2/",
    section: extractSectionFromUrl(categoryUrl || ""),
    level: extractLevelFromUrl(categoryUrl || ""),
    category: extractCategoryFromUrl(categoryUrl || ""),
  };
  return scrapeCategoryPage(defaultCategory, page);
}

// Export for tests
export { scrapeCategoryUrls } from "./scraper-compat";
