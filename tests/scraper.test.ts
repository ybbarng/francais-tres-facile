import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  scrapeAllExercises,
  scrapeCategory,
  scrapeCategoryPage,
  scrapeCategoryUrls,
  scrapeExerciseDetail,
} from "@/lib/scraper";

// Load mock HTML files
const mockPage1 = readFileSync(join(__dirname, "mocks/rfi-societe-a2-page1.html"), "utf-8");
const mockPage2 = readFileSync(join(__dirname, "mocks/rfi-societe-a2-page2.html"), "utf-8");
const mockDetail = readFileSync(join(__dirname, "mocks/rfi-exercise-detail.html"), "utf-8");

// Mock level index page with category links
const mockLevelPage = `
<!DOCTYPE html>
<html>
<body>
  <a href="https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/">Société</a>
  <a href="https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/culture-a2/">Culture</a>
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

describe("scrapeCategoryUrls", () => {
  it("should extract category URLs from level page", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockLevelPage,
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

    const { exercises, hasMore } = await scrapeCategoryPage(
      "https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/",
      1
    );

    expect(exercises).toHaveLength(3);
    expect(hasMore).toBe(true);

    // Check first exercise
    expect(exercises[0]).toMatchObject({
      title: "Dernier adieu à Brigitte Bardot",
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

    const { exercises, hasMore } = await scrapeCategoryPage(
      "https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/",
      2
    );

    expect(exercises).toHaveLength(2);
    expect(hasMore).toBe(false);
  });

  it("should handle fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(
      scrapeCategoryPage(
        "https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/",
        1
      )
    ).rejects.toThrow("Failed to fetch");
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

    const exercises = await scrapeCategory(
      "https://francaisfacile.rfi.fr/fr/comprendre-actualité-français/société-a2/"
    );

    // 3 from page 1 + 2 from page 2
    expect(exercises).toHaveLength(5);
  });
});

describe("scrapeAllExercises", () => {
  it("should scrape all categories and deduplicate", async () => {
    // Level page fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockLevelPage,
    });

    // First category (société) - page 1
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });
    // First category - page 2 (last)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });

    // Second category (culture) - same content to test deduplication
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1, // Same as société page 1
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2, // Same as société page 2
    });

    // Detail fetches for 5 unique exercises
    for (let i = 0; i < 5; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockDetail,
      });
    }

    const exercises = await scrapeAllExercises("A2");

    // Should have 5 unique exercises (duplicates removed)
    expect(exercises).toHaveLength(5);

    // All should have audio URL from detail page
    expect(exercises[0].audioUrl).toBe(
      "https://aod-fle.akamaized.net/rfi/francais/audio/exercice_20260109.mp3"
    );
  });

  it("should handle detail fetch errors gracefully", async () => {
    // Level page
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

    // First detail succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });
    // Second detail fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const exercises = await scrapeAllExercises("A2");

    // Should still return 2 exercises
    expect(exercises).toHaveLength(2);
    // First one has audio, second doesn't
    expect(exercises[0].audioUrl).toBeTruthy();
    expect(exercises[1].audioUrl).toBeNull();
  });
});
