// 세트 파일을 모두 확인하고 화면이 읽는 목록 public/delf/sets/index.json 을 만든다.
//   node scripts/delf-index.ts [--sets <dir>]
// 하나라도 형식이 틀리면 index.json 을 쓰지 않고 실패로 끝난다.
import { writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  compareIndexEntries,
  DELF_INDEX_SCHEMA,
  type DelfIndex,
  type DelfIndexEntry,
  DelfSetError,
  indexEntryOf,
} from "../src/features/delf/lib/set.ts";
import { DEFAULT_SETS_DIR, listSetFiles, loadSetFile } from "./delf-common.ts";

const { values } = parseArgs({ options: { sets: { type: "string" } } });
const setsDir = path.resolve(values.sets ?? DEFAULT_SETS_DIR);

const entries: DelfIndexEntry[] = [];
const failures: string[] = [];

for (const file of listSetFiles(setsDir)) {
  const name = path.basename(file, ".json");
  try {
    const set = loadSetFile(file);
    if (set.id !== name) throw new Error(`파일 이름(${name})과 id(${set.id})가 다릅니다`);
    entries.push(indexEntryOf(set));
  } catch (e) {
    const detail =
      e instanceof DelfSetError
        ? e.issues.map((i) => `    - ${i}`).join("\n")
        : `    - ${(e as Error).message}`;
    failures.push(`✗ ${name}\n${detail}`);
  }
}

if (failures.length > 0) {
  console.error(failures.join("\n"));
  console.error(`\n${failures.length}개 세트가 틀려 index.json 을 쓰지 않았습니다.`);
  process.exit(1);
}

entries.sort(compareIndexEntries);
const index: DelfIndex = { schema: DELF_INDEX_SCHEMA, sets: entries };
const out = path.join(setsDir, "index.json");
writeFileSync(out, `${JSON.stringify(index, null, 2)}\n`);

const verified = entries.filter((e) => e.status === "verified").length;
console.log(
  `✓ ${entries.length}개 세트 (verified ${verified}) → ${path.relative(process.cwd(), out)}`
);
