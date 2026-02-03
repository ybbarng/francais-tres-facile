import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RFI_SECTIONS } from "@/lib/rfi-headers";
import type { CategoryInfo } from "@/lib/scraper";
import {
  scrapeCategory,
  scrapeCategoryPage,
  scrapeCategoryUrls,
  scrapeExerciseDetail,
  scrapeSectionCategories,
  scrapeSectionExercises,
} from "@/lib/scraper";

// Load mock HTML files
const mockPage1 = readFileSync(join(__dirname, "mocks/rfi-societe-a2-page1.html"), "utf-8");
const mockPage2 = readFileSync(join(__dirname, "mocks/rfi-societe-a2-page2.html"), "utf-8");
const mockDetail = readFileSync(join(__dirname, "mocks/rfi-exercise-detail.html"), "utf-8");

// Mock section page with category links
const mockSectionPage = `
<!DOCTYPE html>
<html>
<body>
  <a href="https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/">Société A2</a>
  <a href="https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/culture-a2/">Culture A2</a>
  <a href="https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/environnement-b1/">Environnement B1</a>
</body>
</html>
`;

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// Test CategoryInfo for use in tests
const testCategoryInfo: CategoryInfo = {
  url: "https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/",
  section: "comprendre-actualite",
  level: "A2",
  category: "Société",
};

describe("scrapeSectionCategories", () => {
  it("should extract category URLs from section page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockSectionPage,
    });

    const categories = await scrapeSectionCategories(RFI_SECTIONS[0]);

    expect(categories).toHaveLength(3);
    expect(categories[0]).toMatchObject({
      url: expect.stringContaining("société-a2"),
      section: "comprendre-actualite",
      level: "A2",
      category: "Société",
    });
    expect(categories[1]).toMatchObject({
      url: expect.stringContaining("culture-a2"),
      level: "A2",
    });
    expect(categories[2]).toMatchObject({
      url: expect.stringContaining("environnement-b1"),
      level: "B1",
    });
  });
});

describe("scrapeCategoryUrls (legacy)", () => {
  it("should filter category URLs by level", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockSectionPage,
    });

    const urls = await scrapeCategoryUrls("A2");

    expect(urls).toHaveLength(2);
    expect(urls[0]).toContain("société-a2");
    expect(urls[1]).toContain("culture-a2");
  });
});

describe("scrapeCategoryPage", () => {
  it("should scrape exercises from page 1", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });

    const { exercises, hasMore } = await scrapeCategoryPage(testCategoryInfo, 1);

    expect(exercises).toHaveLength(3);
    expect(hasMore).toBe(true);

    // Check first exercise includes section
    expect(exercises[0]).toMatchObject({
      title: "Dernier adieu à Brigitte Bardot",
      section: "comprendre-actualite",
      level: "A2",
      category: "Société",
      sourceUrl: expect.stringContaining("dernier-adieu-brigitte-bardot"),
      thumbnailUrl: "https://example.com/image1.jpg",
    });

    // Check date extraction from URL
    expect(exercises[0].publishedAt).toEqual(new Date("2026-01-09"));
  });

  it("should detect no more pages on last page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });

    const { exercises, hasMore } = await scrapeCategoryPage(testCategoryInfo, 2);

    expect(exercises).toHaveLength(2);
    expect(hasMore).toBe(false);
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(scrapeCategoryPage(testCategoryInfo, 1)).rejects.toThrow("Failed to fetch");
  });
});

describe("scrapeExerciseDetail", () => {
  it("should extract audio URL from audio tag", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail("https://example.com/exercise");

    expect(details.audioUrl).toBe(
      "https://aod-fle.akamaized.net/rfi/francais/audio/exercice_20260109.mp3"
    );
  });

  it("should extract H5P embed URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail("https://example.com/exercise");

    expect(details.h5pEmbedUrl).toBe("https://fle-rfi.h5p.com/content/12345/embed");
  });

  it("should extract level from page content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail("https://example.com/exercise");

    expect(details.level).toBe("A2");
  });

  it("should extract title from h1", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail("https://example.com/exercise");

    expect(details.title).toBe("Dernier adieu à Brigitte Bardot");
  });

  it("should extract transcript from page content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail("https://example.com/exercise");

    expect(details.transcript).not.toBeNull();
    expect(details.transcript).toContain("Brigitte Bardot");
    expect(details.transcript).toContain("Saint-Tropez");
    // Bracketed text should be on its own line
    expect(details.transcript).toContain("\n[Extrait de « Initials B.B. »]\n");
  });

  it("should return null transcript if content is too short", async () => {
    const shortTranscriptHtml = `
      <article>
        <h1>Test</h1>
        <h2>Transcription</h2>
        <a href="#">Ouvrir le PDF</a>
        Short text.
        <a href="#">Voir plus</a>
      </article>
    `;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => shortTranscriptHtml,
    });

    const details = await scrapeExerciseDetail("https://example.com/exercise");

    expect(details.transcript).toBeNull();
  });
});

describe("scrapeCategory", () => {
  it("should scrape all pages of a category", async () => {
    // Page 1 fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });
    // Page 2 fetch (last page)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });

    const exercises = await scrapeCategory(testCategoryInfo);

    // 3 from page 1 + 2 from page 2
    expect(exercises).toHaveLength(5);
    // All exercises should have section info
    for (const ex of exercises) {
      expect(ex.section).toBe("comprendre-actualite");
    }
  });
});

describe("scrapeSectionExercises", () => {
  it("should scrape all categories in a section and deduplicate", async () => {
    // Section page fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockSectionPage,
    });

    // First category (société-a2) - page 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });
    // First category - page 2 (last)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });

    // Second category (culture-a2) - same content to test deduplication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });

    // Third category (environnement-b1) - different level
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2, // Just 2 exercises
    });

    const exercises = await scrapeSectionExercises("comprendre-actualite");

    // société: 5, culture: 0 (duplicates), environnement: 2
    // But mockPage1/2 have same URLs, so we get 5 unique from first two categories
    // and 0 new from third (same mock data)
    expect(exercises).toHaveLength(5);

    // All should have section info
    for (const ex of exercises) {
      expect(ex.section).toBe("comprendre-actualite");
    }
  });

  it("should handle detail fetch errors gracefully", async () => {
    // Section page with only one category
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => `
        <html><body>
          <a href="https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/">Société</a>
        </body></html>
      `,
    });

    // Category page with 2 exercises
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });

    const exercises = await scrapeSectionExercises("comprendre-actualite");

    // Should return 2 exercises (no detail fetching in scrapeSectionExercises)
    expect(exercises).toHaveLength(2);
  });
});
