// 정답 확인용 사본을 만든다: 문항의 answer·explanation 과 review 를 뺀다(docs/DELF.md "정답 확인 단계").
//   node scripts/delf-strip.ts <setId|all|파일.json> <outDir> [--sets <dir>]
// 듣기 대본은 남긴다(푸는 쪽에 글로 준다). 형식이 틀린 세트는 건너뛰지 않고 실패로 끝난다.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import type { DelfSet } from "../src/features/delf/lib/set.ts";
import { DEFAULT_SETS_DIR, loadSetFile, resolveTargets } from "./delf-common.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { sets: { type: "string" } },
});
const [target, outDir] = positionals;
if (!target || !outDir) {
  console.error("사용법: node scripts/delf-strip.ts <setId|all|파일.json> <outDir> [--sets <dir>]");
  process.exit(2);
}
const setsDir = path.resolve(values.sets ?? DEFAULT_SETS_DIR);

function stripSet(set: DelfSet) {
  return {
    schema: set.schema,
    id: set.id,
    level: set.level,
    kind: set.kind,
    title: set.title,
    sections: set.sections.map((s) => ({
      area: s.area,
      minutes: s.minutes,
      instructions: s.instructions,
      ...(s.area === "PE"
        ? { tasks: s.tasks }
        : {
            documents: s.documents.map((d) => ({
              ...d,
              questions: d.questions.map(({ answer: _a, explanation: _e, ...q }) => q),
            })),
          }),
    })),
  };
}

const files = resolveTargets(target, setsDir);
if (files.length === 0) {
  console.error(`세트가 없습니다: ${setsDir}`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });
let failed = 0;
for (const file of files) {
  try {
    const set = loadSetFile(file);
    const out = path.join(outDir, `${set.id}.json`);
    writeFileSync(out, `${JSON.stringify(stripSet(set), null, 2)}\n`);
    console.log(`✓ ${set.id} → ${out}`);
  } catch (e) {
    failed++;
    console.error(`✗ ${path.basename(file)}: ${(e as Error).message}`);
  }
}
if (failed > 0) process.exit(1);
