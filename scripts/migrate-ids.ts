/**
 * Exercise ID 마이그레이션 스크립트
 * 1. 기존 Exercise 데이터 백업
 * 2. DB 초기화
 * 3. 새 short ID로 Exercise 복원
 *
 * 실행: npx tsx scripts/migrate-ids.ts
 */

import path from "node:path";
import * as fs from "fs";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";
import { generateShortId } from "../src/lib/id";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("1. 기존 Exercise 데이터 백업 중...");

  const exercises = await prisma.exercise.findMany();
  console.log(`   ${exercises.length}개 exercise 발견`);

  // 백업 파일 저장
  const backupPath = "scripts/exercises-backup.json";
  fs.writeFileSync(backupPath, JSON.stringify(exercises, null, 2));
  console.log(`   백업 완료: ${backupPath}`);

  console.log("\n2. Progress 삭제 중...");
  const deletedProgress = await prisma.progress.deleteMany();
  console.log(`   ${deletedProgress.count}개 progress 삭제됨`);

  console.log("\n3. Exercise 삭제 중...");
  const deletedExercises = await prisma.exercise.deleteMany();
  console.log(`   ${deletedExercises.count}개 exercise 삭제됨`);

  console.log("\n4. 새 ID로 Exercise 복원 중...");
  const idToUrl = new Map<string, string>();
  let restored = 0;
  let collisions = 0;

  for (const exercise of exercises) {
    // 충돌 방지하며 새 ID 생성
    let suffix = 0;
    let newId: string;
    while (true) {
      newId = generateShortId(exercise.sourceUrl, suffix);
      const existingUrl = idToUrl.get(newId);
      if (!existingUrl) {
        idToUrl.set(newId, exercise.sourceUrl);
        break;
      }
      suffix++;
      collisions++;
    }

    await prisma.exercise.create({
      data: {
        id: newId,
        title: exercise.title,
        section: exercise.section,
        level: exercise.level,
        category: exercise.category,
        sourceUrl: exercise.sourceUrl,
        audioUrl: exercise.audioUrl,
        h5pEmbedUrl: exercise.h5pEmbedUrl,
        transcript: exercise.transcript,
        thumbnailUrl: exercise.thumbnailUrl,
        publishedAt: exercise.publishedAt,
      },
    });
    restored++;
  }

  console.log(`   ${restored}개 exercise 복원됨`);
  if (collisions > 0) {
    console.log(`   ${collisions}개 충돌 해결됨`);
  }

  // ID 변환 매핑 저장 (디버깅용)
  const mapping = exercises.map((e) => ({
    oldId: e.id,
    newId: generateShortId(e.sourceUrl),
    sourceUrl: e.sourceUrl,
  }));
  fs.writeFileSync("scripts/id-mapping.json", JSON.stringify(mapping, null, 2));
  console.log("\n   ID 매핑 저장됨: scripts/id-mapping.json");

  console.log("\n✅ 마이그레이션 완료!");
}

main()
  .catch((e) => {
    console.error("❌ 에러:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
