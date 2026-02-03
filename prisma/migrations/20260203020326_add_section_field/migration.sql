/*
  Warnings:

  - Added the required column `section` to the `Exercise` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Exercise" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "audioUrl" TEXT,
    "h5pEmbedUrl" TEXT,
    "transcript" TEXT,
    "thumbnailUrl" TEXT,
    "publishedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Exercise" ("audioUrl", "category", "createdAt", "h5pEmbedUrl", "id", "level", "publishedAt", "sourceUrl", "thumbnailUrl", "title", "transcript", "updatedAt", "section") SELECT "audioUrl", "category", "createdAt", "h5pEmbedUrl", "id", "level", "publishedAt", "sourceUrl", "thumbnailUrl", "title", "transcript", "updatedAt", 'comprendre-actualite' FROM "Exercise";
DROP TABLE "Exercise";
ALTER TABLE "new_Exercise" RENAME TO "Exercise";
CREATE UNIQUE INDEX "Exercise_sourceUrl_key" ON "Exercise"("sourceUrl");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
