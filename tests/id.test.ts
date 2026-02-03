import { describe, expect, it } from "vitest";
import { generateShortId, getOrCreateShortId } from "../src/lib/id";

describe("generateShortId", () => {
  it("should generate consistent ID for same URL", () => {
    const url = "https://francaisfacile.rfi.fr/fr/example";
    const id1 = generateShortId(url);
    const id2 = generateShortId(url);
    expect(id1).toBe(id2);
  });

  it("should generate different IDs for different URLs", () => {
    const id1 = generateShortId("https://francaisfacile.rfi.fr/fr/example1");
    const id2 = generateShortId("https://francaisfacile.rfi.fr/fr/example2");
    expect(id1).not.toBe(id2);
  });

  it("should generate short IDs (7-8 characters)", () => {
    const url = "https://francaisfacile.rfi.fr/fr/some-long-exercise-title";
    const id = generateShortId(url);
    expect(id.length).toBeLessThanOrEqual(8);
    expect(id.length).toBeGreaterThanOrEqual(1);
  });

  it("should only contain base36 characters", () => {
    const url = "https://francaisfacile.rfi.fr/fr/example";
    const id = generateShortId(url);
    expect(id).toMatch(/^[0-9a-z]+$/);
  });

  it("should generate different ID with suffix", () => {
    const url = "https://francaisfacile.rfi.fr/fr/example";
    const id1 = generateShortId(url, 0);
    const id2 = generateShortId(url, 1);
    const id3 = generateShortId(url, 2);
    expect(id1).not.toBe(id2);
    expect(id2).not.toBe(id3);
    expect(id1).not.toBe(id3);
  });
});

describe("getOrCreateShortId", () => {
  it("should create new ID for new URL", () => {
    const existingIds = new Map<string, string>();
    const url = "https://francaisfacile.rfi.fr/fr/new-exercise";
    const id = getOrCreateShortId(url, existingIds);

    expect(id).toBeDefined();
    expect(existingIds.get(id)).toBe(url);
  });

  it("should return same ID for same URL", () => {
    const existingIds = new Map<string, string>();
    const url = "https://francaisfacile.rfi.fr/fr/exercise";

    const id1 = getOrCreateShortId(url, existingIds);
    const id2 = getOrCreateShortId(url, existingIds);

    expect(id1).toBe(id2);
  });

  it("should handle collisions by using different suffix", () => {
    const url1 = "https://francaisfacile.rfi.fr/fr/exercise1";

    // Simulate collision by pre-populating with url1's ID pointing to different URL
    const existingIds = new Map<string, string>();
    const id1 = generateShortId(url1);
    existingIds.set(id1, "https://some-other-url.com"); // Force collision

    const resultId = getOrCreateShortId(url1, existingIds);

    // Should get a different ID due to collision
    expect(resultId).not.toBe(id1);
    expect(existingIds.get(resultId)).toBe(url1);
  });

  it("should maintain existing mappings", () => {
    const existingIds = new Map<string, string>();

    const url1 = "https://francaisfacile.rfi.fr/fr/ex1";
    const url2 = "https://francaisfacile.rfi.fr/fr/ex2";
    const url3 = "https://francaisfacile.rfi.fr/fr/ex3";

    const id1 = getOrCreateShortId(url1, existingIds);
    const id2 = getOrCreateShortId(url2, existingIds);
    const id3 = getOrCreateShortId(url3, existingIds);

    expect(existingIds.size).toBe(3);
    expect(existingIds.get(id1)).toBe(url1);
    expect(existingIds.get(id2)).toBe(url2);
    expect(existingIds.get(id3)).toBe(url3);
  });
});

describe("ID uniqueness for realistic URLs", () => {
  it("should generate unique IDs for similar RFI URLs", () => {
    const urls = [
      "https://francaisfacile.rfi.fr/fr/actualité/20260109-exercise-1",
      "https://francaisfacile.rfi.fr/fr/actualité/20260109-exercise-2",
      "https://francaisfacile.rfi.fr/fr/actualité/20260110-exercise-1",
      "https://francaisfacile.rfi.fr/fr/société/20260109-exercise-1",
      "https://francaisfacile.rfi.fr/fr/environnement/20260109-exercise-1",
    ];

    const ids = urls.map((url) => generateShortId(url));
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(urls.length);
  });

  it("should handle 100 URLs without collision", () => {
    const existingIds = new Map<string, string>();
    const urls: string[] = [];

    for (let i = 0; i < 100; i++) {
      urls.push(`https://francaisfacile.rfi.fr/fr/exercise-${i}`);
    }

    const ids = urls.map((url) => getOrCreateShortId(url, existingIds));
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(100);
  });
});
