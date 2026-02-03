import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  scrapeExerciseList,
  scrapeExerciseDetail,
  scrapeAllExercises,
} from '@/lib/scraper';

// Load mock HTML files
const mockPage1 = readFileSync(join(__dirname, 'mocks/rfi-societe-a2-page1.html'), 'utf-8');
const mockPage2 = readFileSync(join(__dirname, 'mocks/rfi-societe-a2-page2.html'), 'utf-8');
const mockDetail = readFileSync(join(__dirname, 'mocks/rfi-exercise-detail.html'), 'utf-8');

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('scrapeExerciseList', () => {
  it('should scrape exercises from page 1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });

    const { exercises, hasMore } = await scrapeExerciseList(1);

    expect(exercises).toHaveLength(3);
    expect(hasMore).toBe(true);

    // Check first exercise
    expect(exercises[0]).toMatchObject({
      title: 'Dernier adieu à Brigitte Bardot',
      level: 'A2',
      category: 'Société',
      sourceUrl: expect.stringContaining('dernier-adieu-brigitte-bardot'),
      thumbnailUrl: 'https://example.com/image1.jpg',
    });

    // Check date extraction from URL
    expect(exercises[0].publishedAt).toEqual(new Date('2026-01-09'));
  });

  it('should detect no more pages on last page', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });

    const { exercises, hasMore } = await scrapeExerciseList(2);

    expect(exercises).toHaveLength(2);
    expect(hasMore).toBe(false);
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(scrapeExerciseList(1)).rejects.toThrow('Failed to fetch');
  });
});

describe('scrapeExerciseDetail', () => {
  it('should extract audio URL from audio tag', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail('https://example.com/exercise');

    expect(details.audioUrl).toBe(
      'https://aod-fle.akamaized.net/rfi/francais/audio/exercice_20260109.mp3'
    );
  });

  it('should extract H5P embed URL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail('https://example.com/exercise');

    expect(details.h5pEmbedUrl).toBe('https://fle-rfi.h5p.com/content/12345/embed');
  });

  it('should extract level from page content', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail('https://example.com/exercise');

    expect(details.level).toBe('A2');
  });

  it('should extract title from h1', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockDetail,
    });

    const details = await scrapeExerciseDetail('https://example.com/exercise');

    expect(details.title).toBe('Dernier adieu à Brigitte Bardot');
  });
});

describe('scrapeAllExercises', () => {
  it('should scrape all pages until no more', async () => {
    // Page 1 fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });
    // Page 2 fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2,
    });
    // Detail fetches for 5 exercises (3 from page 1 + 2 from page 2)
    for (let i = 0; i < 5; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockDetail,
      });
    }

    const exercises = await scrapeAllExercises();

    // 3 from page 1 + 2 from page 2
    expect(exercises).toHaveLength(5);

    // All should have audio URL from detail page
    expect(exercises[0].audioUrl).toBe(
      'https://aod-fle.akamaized.net/rfi/francais/audio/exercice_20260109.mp3'
    );
  });

  it('should respect maxPages limit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage1,
    });
    // Detail fetches for 3 exercises from page 1
    for (let i = 0; i < 3; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => mockDetail,
      });
    }

    const exercises = await scrapeAllExercises(1); // Only 1 page

    expect(exercises).toHaveLength(3);
    // Should only call fetch for page 1 + 3 details = 4 times
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('should handle detail fetch errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: async () => mockPage2, // 2 exercises
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

    const exercises = await scrapeAllExercises();

    // Should still return 2 exercises
    expect(exercises).toHaveLength(2);
    // First one has audio, second doesn't
    expect(exercises[0].audioUrl).toBeTruthy();
    expect(exercises[1].audioUrl).toBeNull();
  });
});
