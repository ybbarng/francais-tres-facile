-- ExpressionPracticeSetting: 말하기 표현 연습(/expressions/practice) 설정 키-값. key "lastSession" = 마지막으로 한 세션 번호
CREATE TABLE IF NOT EXISTS "ExpressionPracticeSetting" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);
