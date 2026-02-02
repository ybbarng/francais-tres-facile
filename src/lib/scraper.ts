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

export async function scrapeExerciseList(
  page = 1
): Promise<{ exercises: ScrapedExercise[]; hasMore: boolean }> {
  const url = page === 1 ? RFI_EXERCICES_URL : `${RFI_EXERCICES_URL}?page=${page}`;
  const html = await fetchRFIPage(url);
  const $ = cheerio.load(html);

  const exercises: ScrapedExercise[] = [];

  $(".m-item-list-article, article.m-item-article").each((_, el) => {
    const $el = $(el);
    const linkEl = $el.find("a").first();
    const href = linkEl.attr("href");

    if (!href) return;

    const sourceUrl = href.startsWith("http") ? href : `${RFI_BASE_URL}${href}`;
    const title =
      $el.find(".m-item-article__title, h3, h2").first().text().trim() ||
      linkEl.text().trim();
    const thumbnailUrl = $el.find("img").first().attr("src") || null;

    // 레벨 추출 (보통 A2, B1 등)
    const levelMatch = $el.text().match(/\b(A1|A2|B1|B2|C1|C2)\b/i);
    const level = levelMatch ? levelMatch[1].toUpperCase() : "A2";

    // 카테고리 추출
    const category =
      $el.find(".m-tag, .m-item-article__tag").first().text().trim() ||
      "exercice";

    // 날짜 추출
    const dateText = $el.find("time, .m-item-article__date").attr("datetime");
    const publishedAt = dateText ? new Date(dateText) : null;

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
  const hasMore = $('a[rel="next"], .pagination__next').length > 0;

  return { exercises, hasMore };
}

export async function scrapeExerciseDetail(
  sourceUrl: string
): Promise<Partial<ScrapedExercise>> {
  const html = await fetchRFIPage(sourceUrl);
  const $ = cheerio.load(html);

  // MP3 URL 추출 (Akamai CDN)
  let audioUrl: string | null = null;
  const audioSrc = $("audio source").attr("src") || $("audio").attr("src");
  if (audioSrc) {
    audioUrl = audioSrc;
  } else {
    // data-url 속성에서 찾기
    const dataUrl = $("[data-url*='.mp3'], [data-audio*='.mp3']").attr(
      "data-url"
    );
    if (dataUrl) audioUrl = dataUrl;
  }

  // 스크립트에서 MP3 URL 찾기
  if (!audioUrl) {
    const scripts = $("script").text();
    const mp3Match = scripts.match(
      /https?:\/\/[^"'\s]+akamaized\.net[^"'\s]+\.mp3/
    );
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
    const { exercises, hasMore: more } = await scrapeExerciseList(page);
    allExercises.push(...exercises);
    hasMore = more;
    page++;

    // Rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

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
