import * as cheerio from "cheerio";
import { RFI_BASE_URL, RFI_DEFAULT_LEVEL, RFI_HEADERS, RFI_LEVEL_URLS } from "./rfi-headers";

export interface ScrapedExercise {
  title: string;
  level: string;
  category: string;
  sourceUrl: string;
  audioUrl: string | null;
  h5pEmbedUrl: string | null;
  thumbnailUrl: string | null;
  publishedAt: Date | null;
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
  // Format: "30/01/2026" or "2026-01-30"
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
  // URL format: /fr/actualité/YYYYMMDD-title-slug
  const match = url.match(/\/(\d{4})(\d{2})(\d{2})-/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(`${year}-${month}-${day}`);
  }
  return null;
}

function extractLevelFromUrl(url: string): string {
  // Check if URL contains level indicators
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("-a1") || lowerUrl.includes("/a1")) return "A1";
  if (lowerUrl.includes("-a2") || lowerUrl.includes("/a2")) return "A2";
  if (lowerUrl.includes("-b1") || lowerUrl.includes("/b1")) return "B1";
  if (lowerUrl.includes("-b2") || lowerUrl.includes("/b2")) return "B2";
  return "A2"; // Default
}

function extractCategoryFromUrl(url: string): string {
  // Extract category from URL like /société-a2/, /culture-a2/, etc.
  const match = url.match(/\/([^/]+)-(?:a1|a2|b1|b2)\/?/i);
  if (match) {
    const category = match[1];
    // Capitalize first letter and decode URL
    const decoded = decodeURIComponent(category);
    return decoded.charAt(0).toUpperCase() + decoded.slice(1);
  }
  return "Exercice";
}

/**
 * Fetch all category URLs from a level index page (e.g., /a2/)
 */
export async function scrapeCategoryUrls(level: string): Promise<string[]> {
  const levelUrl = RFI_LEVEL_URLS[level];
  if (!levelUrl) {
    throw new Error(`Unknown level: ${level}`);
  }

  console.log(`Fetching category list from: ${levelUrl}`);
  const html = await fetchRFIPage(levelUrl);
  const $ = cheerio.load(html);

  const categoryUrls: string[] = [];
  const seenUrls = new Set<string>();

  // Find links to category pages (e.g., /société-a2/, /culture-a2/)
  const levelLower = level.toLowerCase();
  $(`a[href*="-${levelLower}/"]`).each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const fullUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;

    // Only include French category pages
    if (!fullUrl.includes("/fr/")) return;
    if (seenUrls.has(fullUrl)) return;

    seenUrls.add(fullUrl);
    categoryUrls.push(fullUrl);
  });

  console.log(`Found ${categoryUrls.length} categories for level ${level}`);
  return categoryUrls;
}

/**
 * Scrape exercises from a single category page
 */
export async function scrapeCategoryPage(
  categoryUrl: string,
  page = 1
): Promise<{ exercises: ScrapedExercise[]; hasMore: boolean }> {
  let url: string;
  if (page === 1) {
    url = categoryUrl.endsWith("/") ? categoryUrl : `${categoryUrl}/`;
  } else {
    const baseUrl = categoryUrl.endsWith("/") ? categoryUrl : `${categoryUrl}/`;
    url = `${baseUrl}${page}/#pager`;
  }

  console.log(`Fetching: ${url}`);
  const html = await fetchRFIPage(url);
  const $ = cheerio.load(html);

  const exercises: ScrapedExercise[] = [];
  const seenUrls = new Set<string>();

  const level = extractLevelFromUrl(categoryUrl);
  const category = extractCategoryFromUrl(categoryUrl);

  // Structure for category pages: m-item-list-article with data-article-item-link
  $(".m-item-list-article").each((_, el) => {
    const $el = $(el);

    const linkEl = $el.find("a[data-article-item-link]").first();
    const href = linkEl.attr("href");

    if (!href) return;

    const sourceUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;

    // Skip duplicates within same page
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
      level,
      category,
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
export async function scrapeCategory(categoryUrl: string): Promise<ScrapedExercise[]> {
  const exercises: ScrapedExercise[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const { exercises: pageExercises, hasMore: more } = await scrapeCategoryPage(categoryUrl, page);
    console.log(`  Page ${page}: ${pageExercises.length} exercises`);
    exercises.push(...pageExercises);
    hasMore = more;
    page++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return exercises;
}

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

  // 3. JSON data in scripts (new RFI structure)
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

  // Level extraction
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
 * Scrape all exercises from a level (e.g., A2)
 * Fetches all categories and deduplicates exercises
 */
export async function scrapeAllExercises(
  level: string = RFI_DEFAULT_LEVEL
): Promise<ScrapedExercise[]> {
  // Get all category URLs for this level
  const categoryUrls = await scrapeCategoryUrls(level);

  // Scrape all categories
  const allExercises: ScrapedExercise[] = [];
  const seenUrls = new Set<string>();

  for (const categoryUrl of categoryUrls) {
    console.log(`\nScraping category: ${categoryUrl}`);
    const categoryExercises = await scrapeCategory(categoryUrl);

    // Deduplicate: only add exercises we haven't seen
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
    console.log(`  Added ${added} exercises, skipped ${duplicates} duplicates`);

    // Rate limiting between categories
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\nTotal unique exercises: ${allExercises.length}, fetching details...`);

  // Fetch details for each exercise
  let detailsCount = 0;
  for (const exercise of allExercises) {
    try {
      const details = await scrapeExerciseDetail(exercise.sourceUrl);
      if (details.audioUrl) exercise.audioUrl = details.audioUrl;
      if (details.h5pEmbedUrl) exercise.h5pEmbedUrl = details.h5pEmbedUrl;
      if (details.level) exercise.level = details.level;
      if (details.title) exercise.title = details.title;
      detailsCount++;

      if (detailsCount % 10 === 0) {
        console.log(`  Fetched details for ${detailsCount}/${allExercises.length} exercises`);
      }

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to scrape details for ${exercise.sourceUrl}:`, error);
    }
  }

  console.log(`Done! Total: ${allExercises.length} exercises`);
  return allExercises;
}

// Legacy function for backward compatibility with tests
export async function scrapeExerciseList(
  page = 1,
  categoryUrl?: string
): Promise<{ exercises: ScrapedExercise[]; hasMore: boolean }> {
  const url = categoryUrl || RFI_LEVEL_URLS[RFI_DEFAULT_LEVEL];
  return scrapeCategoryPage(url, page);
}
