import * as cheerio from "cheerio";
import { RFI_HEADERS, RFI_BASE_URL, RFI_EXERCICES_URL } from "./rfi-headers";

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
  if (url.includes('-a1') || url.includes('/a1')) return 'A1';
  if (url.includes('-a2') || url.includes('/a2')) return 'A2';
  if (url.includes('-b1') || url.includes('/b1')) return 'B1';
  if (url.includes('-b2') || url.includes('/b2')) return 'B2';
  return 'A2'; // Default
}

export async function scrapeExerciseList(
  page = 1
): Promise<{ exercises: ScrapedExercise[]; hasMore: boolean }> {
  // Société A2 uses different pagination: /2/#pager, /3/#pager, etc.
  let url: string;
  if (page === 1) {
    url = RFI_EXERCICES_URL;
  } else {
    url = `${RFI_EXERCICES_URL}${page}/#pager`;
  }

  console.log(`Fetching: ${url}`);
  const html = await fetchRFIPage(url);
  const $ = cheerio.load(html);

  const exercises: ScrapedExercise[] = [];
  const seenUrls = new Set<string>();

  // Structure for Société A2 pages: m-item-list-article with data-article-item-link
  $(".m-item-list-article").each((_, el) => {
    const $el = $(el);

    // Find the article link (with data-article-item-link attribute)
    const linkEl = $el.find("a[data-article-item-link]").first();
    const href = linkEl.attr("href");

    if (!href) return;

    const sourceUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;

    // Skip if we've already seen this URL (each article has 2 links: image + title)
    if (seenUrls.has(sourceUrl)) return;
    seenUrls.add(sourceUrl);

    // Extract title from h2
    const title = $el.find("h2").first().text().trim();
    if (!title) return;

    // Extract thumbnail
    const imgEl = $el.find("img").first();
    const thumbnailUrl = imgEl.attr("src") || imgEl.attr("data-src") || null;

    // Extract date from datetime attribute or URL
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

    // Extract level from URL or page context
    const level = extractLevelFromUrl(RFI_EXERCICES_URL);

    // Extract category from breadcrumb or tag
    const category = $el.find(".article__tag, .m-tag").first().text().trim() || "Société";

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

  // Also try podcast-item structure (for Journal en français facile)
  if (exercises.length === 0) {
    $(".m-podcast-item").each((_, el) => {
      const $el = $(el);
      const linkEl = $el.find("a.m-podcast-item__image, a.m-podcast-item__infos__edition").first();
      const href = linkEl.attr("href");

      if (!href) return;

      const sourceUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;
      if (seenUrls.has(sourceUrl)) return;
      seenUrls.add(sourceUrl);

      const title = $el.find(".m-podcast-item__infos__edition h2").text().trim() ||
                    $el.find("h2").first().text().trim() ||
                    linkEl.attr("title") || "";

      if (!title) return;

      const imgEl = $el.find("img").first();
      const thumbnailUrl = imgEl.attr("src") || imgEl.attr("data-src") || null;

      const dateText = $el.find(".m-podcast-item__infos__date").text().trim();
      const publishedAt = parseDate(dateText);

      exercises.push({
        title,
        level: "A2",
        category: "Journal en français facile",
        sourceUrl,
        audioUrl: null,
        h5pEmbedUrl: null,
        thumbnailUrl,
        publishedAt,
      });
    });
  }

  // Check for next page
  // Société A2 pagination: links like /société-a2/2/#pager
  const hasMore = $(`a[href*="/${page + 1}/"]`).length > 0 ||
                  $('a[rel="next"]').length > 0 ||
                  $(".m-pagination__link--next").length > 0;

  return { exercises, hasMore };
}

export async function scrapeExerciseDetail(
  sourceUrl: string
): Promise<Partial<ScrapedExercise>> {
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
    const dataUrl = $("[data-url*='.mp3'], [data-audio*='.mp3']").attr("data-url") ||
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
  const levelMatch = $("body").text().match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
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

export async function scrapeAllExercises(
  maxPages = 5
): Promise<ScrapedExercise[]> {
  const allExercises: ScrapedExercise[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    console.log(`Scraping page ${page}...`);
    const { exercises, hasMore: more } = await scrapeExerciseList(page);
    console.log(`Found ${exercises.length} exercises on page ${page}`);
    allExercises.push(...exercises);
    hasMore = more;
    page++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`Total exercises found: ${allExercises.length}, fetching details...`);

  // Fetch details for each exercise
  for (const exercise of allExercises) {
    try {
      const details = await scrapeExerciseDetail(exercise.sourceUrl);
      if (details.audioUrl) exercise.audioUrl = details.audioUrl;
      if (details.h5pEmbedUrl) exercise.h5pEmbedUrl = details.h5pEmbedUrl;
      if (details.level) exercise.level = details.level;
      if (details.title) exercise.title = details.title;

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`Failed to scrape details for ${exercise.sourceUrl}:`, error);
    }
  }

  return allExercises;
}
