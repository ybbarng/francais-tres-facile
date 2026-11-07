-- ExpressionProgress: 말하기 표현(E01~)별 「익힘」 표시. 표현 원본은 study-french 의 expressions.json
CREATE TABLE IF NOT EXISTS "ExpressionProgress" (
  "expressionId" TEXT NOT NULL PRIMARY KEY,
  "learned" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" DATETIME NOT NULL
);
