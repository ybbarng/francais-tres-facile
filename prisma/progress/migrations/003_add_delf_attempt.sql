-- DelfAttempt: DELF 모의고사 한 번 푼 기록. 점수는 서버가 세트 파일로 다시 채점한 값이다(docs/DELF.md)
CREATE TABLE IF NOT EXISTS "DelfAttempt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "setId" TEXT NOT NULL,
  "level" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "answers" TEXT NOT NULL,
  "coScore" REAL NOT NULL,
  "coMax" REAL NOT NULL,
  "ceScore" REAL NOT NULL,
  "ceMax" REAL NOT NULL,
  "writing" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DelfAttempt_setId_idx"
  ON "DelfAttempt"("setId");
