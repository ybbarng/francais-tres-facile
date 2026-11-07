// scripts/delf-*.ts 가 함께 쓰는 것. Node 24 가 TypeScript 를 바로 돌리므로 의존성 없이 node: 모듈만 쓴다.
import { spawn } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { DELF_SET_ID_PATTERN, type DelfSet, parseDelfSet } from "../src/features/delf/lib/set.ts";

export const DEFAULT_SETS_DIR = path.join(process.cwd(), "public", "delf", "sets");
export const DEFAULT_AUDIO_DIR = path.join(process.cwd(), "public", "delf", "audio");

/** 세트 폴더의 세트 파일들(index.json 은 뺀다) */
export function listSetFiles(setsDir: string): string[] {
  let names: string[];
  try {
    names = readdirSync(setsDir);
  } catch {
    return [];
  }
  return names
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .sort()
    .map((f) => path.join(setsDir, f));
}

/**
 * 명령줄의 대상을 파일 목록으로 바꾼다.
 *   all              → 세트 폴더의 모든 세트
 *   a2-mini-03       → 세트 폴더의 그 세트
 *   path/to/x.json   → 그 파일(테스트 세트 등)
 */
export function resolveTargets(target: string, setsDir: string): string[] {
  if (target === "all") return listSetFiles(setsDir);
  if (target.endsWith(".json")) return [path.resolve(target)];
  if (!DELF_SET_ID_PATTERN.test(target)) {
    throw new Error(`대상은 all, setId(a2-mini-03 꼴), .json 경로 중 하나여야 합니다: ${target}`);
  }
  return [path.join(setsDir, `${target}.json`)];
}

export function loadSetFile(file: string): DelfSet {
  return parseDelfSet(JSON.parse(readFileSync(file, "utf-8")));
}

export function readJson(file: string): unknown {
  return JSON.parse(readFileSync(file, "utf-8"));
}

/** 외부 명령을 돌린다. 실패하면 stderr 를 담아 던진다 */
export function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => {
      out += d;
    });
    child.stderr.on("data", (d) => {
      err += d;
    });
    child.on("error", (e) => reject(new Error(`${cmd} 을 실행하지 못했습니다: ${e.message}`)));
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`${cmd} ${args.join(" ")} 가 ${code} 로 끝났습니다\n${err.trim()}`));
    });
  });
}

/** 일을 limit 개씩 나눠 동시에 돌린다 */
export async function pool<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const item = items[next++];
      await work(item);
    }
  });
  await Promise.all(workers);
}
