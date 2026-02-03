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
  // Format: "30/01/2026"
  const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (match) {
    const [, day, month, year] = match;
    return new Date(`${year}-${month}-${day}`);
  }
  return null;
}

export async function scrapeExerciseList(
  page = 1
): Promise<{ exercises: ScrapedExercise[]; hasMore: boolean }> {
  const url = page === 1 ? RFI_EXERCICES_URL : `${RFI_EXERCICES_URL}?page=${page}`;
  const html = await fetchRFIPage(url);
  const $ = cheerio.load(html);

  const exercises: ScrapedExercise[] = [];

  // 새로운 RFI 사이트 구조: m-podcast-item 클래스 사용
  $(".m-podcast-item").each((_, el) => {
    const $el = $(el);

    // 링크 및 URL 추출
    const linkEl = $el.find("a.m-podcast-item__image, a.m-podcast-item__infos__edition").first();
    const href = linkEl.attr("href");

    if (!href) return;

    const sourceUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;

    // 제목 추출
    const title = $el.find(".m-podcast-item__infos__edition h2").text().trim() ||
                  $el.find("h2").first().text().trim() ||
                  linkEl.attr("title") ||
                  "";

    if (!title) return;

    // 썸네일 추출
    const imgEl = $el.find("img").first();
    const thumbnailUrl = imgEl.attr("src") || imgEl.attr("data-src") || null;

    // 날짜 추출
    const dateText = $el.find(".m-podcast-item__infos__date").text().trim();
    const publishedAt = parseDate(dateText);

    // 레벨 (Journal en français facile는 기본 A2)
    const level = "A2";

    // 카테고리
    const category = "Journal en français facile";

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

  // 다음 페이지 확인
  const hasMore = $('a[rel="next"], .pagination__next, a.m-pagination__link--next').length > 0 ||
                  $('a[href*="page="]:contains("Suivant")').length > 0 ||
                  $('a[href*="page=' + (page + 1) + '"]').length > 0;

  return { exercises, hasMore };
}

export async function scrapeExerciseDetail(
  sourceUrl: string
): Promise<Partial<ScrapedExercise>> {
  const html = await fetchRFIPage(sourceUrl);
  const $ = cheerio.load(html);

  // MP3 URL 추출
  let audioUrl: string | null = null;

  // 1. audio 태그에서 찾기
  const audioSrc = $("audio source").attr("src") || $("audio").attr("src");
  if (audioSrc) {
    audioUrl = audioSrc;
  }

  // 2. data 속성에서 찾기
  if (!audioUrl) {
    const dataUrl = $("[data-url*='.mp3'], [data-audio*='.mp3']").attr("data-url") ||
                    $("[data-url*='.mp3'], [data-audio*='.mp3']").attr("data-audio");
    if (dataUrl) audioUrl = dataUrl;
  }

  // 3. JSON 데이터에서 찾기 (새로운 RFI 구조)
  if (!audioUrl) {
    const scripts = $("script").text();

    // sources 배열에서 MP3 URL 찾기
    const jsonMatch = scripts.match(/"sources"\s*:\s*\[\s*\{\s*"url"\s*:\s*"([^"]+\.mp3[^"]*)"/);
    if (jsonMatch) {
      audioUrl = jsonMatch[1];
    }
  }

  // 4. 스크립트에서 Akamai MP3 URL 찾기
  if (!audioUrl) {
    const scripts = $("script").text();
    const mp3Match = scripts.match(
      /https?:\/\/[^"'\s]+akamaized\.net[^"'\s]+\.mp3/
    );
    if (mp3Match) audioUrl = mp3Match[0];
  }

  // 5. 일반 MP3 URL 찾기
  if (!audioUrl) {
    const scripts = $("script").text();
    const mp3Match = scripts.match(/https?:\/\/[^"'\s]+\.mp3/);
    if (mp3Match) audioUrl = mp3Match[0];
  }

  // H5P iframe URL 추출
  let h5pEmbedUrl: string | null = null;
  const h5pIframe = $('iframe[src*="h5p"]');
  if (h5pIframe.length > 0) {
    h5pEmbedUrl = h5pIframe.attr("src") || null;
  }

  // 레벨 추출
  const levelMatch = $("body").text().match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
  const level = levelMatch ? levelMatch[1].toUpperCase() : undefined;

  // 제목 추출 (상세 페이지에서)
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

  // 각 exercice의 상세 정보 가져오기
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
