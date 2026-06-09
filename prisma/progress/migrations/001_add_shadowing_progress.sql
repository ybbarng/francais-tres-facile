-- ShadowingProgress: 자료/단위/항목별 학습 카운터와 마지막 학습 시각
CREATE TABLE IF NOT EXISTS "ShadowingProgress" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "materialId" TEXT NOT NULL,
  "unit" TEXT NOT NULL,
  "itemIndex" INTEGER NOT NULL,
  "playCount" INTEGER NOT NULL DEFAULT 0,
  "lastStudiedAt" DATETIME
);
CREATE UNIQUE INDEX IF NOT EXISTS "ShadowingProgress_materialId_unit_itemIndex_key"
  ON "ShadowingProgress"("materialId", "unit", "itemIndex");
CREATE INDEX IF NOT EXISTS "ShadowingProgress_materialId_idx"
  ON "ShadowingProgress"("materialId");
