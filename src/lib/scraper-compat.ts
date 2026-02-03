// Backward compatibility exports for tests
import { RFI_SECTIONS } from "./rfi-headers";
import { scrapeSectionCategories } from "./scraper";

/**
 * Legacy function - scrape category URLs for a given level
 * Maps old level-based API to new section-based API
 */
export async function scrapeCategoryUrls(level: string): Promise<string[]> {
  // For backward compatibility, use comprendre-actualite section
  const section = RFI_SECTIONS[0]; // comprendre-actualite
  const categories = await scrapeSectionCategories(section);

  // Filter by level and return URLs
  return categories.filter((c) => c.level === level).map((c) => c.url);
}
