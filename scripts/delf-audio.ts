// 듣기 대본으로 음성을 만든다: public/delf/audio/<setId>/<docId>.mp3 (mono, 64kbps)
//   node scripts/delf-audio.ts <setId|all|파일.json> [--sets <dir>] [--out <dir>] [--force] [--jobs 4]
// 대본 줄마다 맥 `say -v <voice>` 로 읽고, 줄 사이 0.6초·문서 앞뒤 1초 무음을 넣어 ffmpeg 로 잇는다.
// 같은 폴더의 <docId>.hash 에 대본 해시를 적어 두고, 대본이 그대로면 건너뛴다.
// 맥 전용(say). ffmpeg 이 있어야 한다.
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import type { DelfAudio } from "../src/features/delf/lib/set.ts";
import {
  DEFAULT_AUDIO_DIR,
  DEFAULT_SETS_DIR,
  loadSetFile,
  pool,
  resolveTargets,
  run,
} from "./delf-common.ts";

const LINE_GAP_SEC = 0.6;
const EDGE_PAD_SEC = 1;
const SAMPLE_RATE = 24000;
const BITRATE = "64k";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    sets: { type: "string" },
    out: { type: "string" },
    force: { type: "boolean", default: false },
    jobs: { type: "string", default: "4" },
  },
});
const [target] = positionals;
if (!target) {
  console.error(
    "사용법: node scripts/delf-audio.ts <setId|all|파일.json> [--sets <dir>] [--out <dir>] [--force] [--jobs 4]"
  );
  process.exit(2);
}
const setsDir = path.resolve(values.sets ?? DEFAULT_SETS_DIR);
const audioDir = path.resolve(values.out ?? DEFAULT_AUDIO_DIR);
const jobs = Math.max(1, Number.parseInt(values.jobs ?? "4", 10) || 4);

/** 대본과 만드는 방식이 같으면 같은 값. 이 값이 바뀌면 다시 만든다 */
function scriptHash(audio: DelfAudio): string {
  const basis = {
    v: 1,
    gap: LINE_GAP_SEC,
    pad: EDGE_PAD_SEC,
    rate: SAMPLE_RATE,
    bitrate: BITRATE,
    lines: audio.script.map((l) => ({ voice: l.voice, text: l.text })),
  };
  return createHash("sha256").update(JSON.stringify(basis)).digest("hex");
}

/** `say -v '?'` 의 음성 이름들. 이름 안에 빈칸이 있어 로캘 칸(fr_FR 등) 앞까지를 이름으로 본다 */
async function installedVoices(): Promise<Set<string>> {
  const out = await run("say", ["-v", "?"]);
  const names = new Set<string>();
  for (const line of out.split("\n")) {
    const m = line.match(/^(.+?)\s+[a-z]{2,3}_[A-Za-z0-9]+\s+#/);
    if (m) names.add(m[1].trim());
  }
  return names;
}

async function buildDoc(setId: string, docId: string, audio: DelfAudio, outFile: string) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), `delf-audio-${setId}-${docId}-`));
  try {
    const lineFiles: string[] = [];
    for (const [i, line] of audio.script.entries()) {
      // 글을 인자로 넘기면 "-" 로 시작하는 줄이 옵션으로 읽힐 수 있어 파일로 넘긴다
      const txt = path.join(tmp, `line-${i}.txt`);
      const aiff = path.join(tmp, `line-${i}.aiff`);
      writeFileSync(txt, line.text);
      await run("say", ["-v", line.voice, "-o", aiff, "-f", txt]);
      lineFiles.push(aiff);
    }

    const inputs = lineFiles.flatMap((f) => ["-i", f]);
    const filters: string[] = [];
    const order: string[] = [];
    const silence = (label: string, sec: number) =>
      filters.push(`anullsrc=r=${SAMPLE_RATE}:cl=mono,atrim=duration=${sec}[${label}]`);
    silence("pad0", EDGE_PAD_SEC);
    order.push("[pad0]");
    lineFiles.forEach((_, i) => {
      filters.push(
        `[${i}:a]aresample=${SAMPLE_RATE},aformat=sample_fmts=fltp:channel_layouts=mono[l${i}]`
      );
      if (i > 0) {
        silence(`gap${i}`, LINE_GAP_SEC);
        order.push(`[gap${i}]`);
      }
      order.push(`[l${i}]`);
    });
    silence("pad1", EDGE_PAD_SEC);
    order.push("[pad1]");
    filters.push(`${order.join("")}concat=n=${order.length}:v=0:a=1[out]`);

    const tmpMp3 = path.join(tmp, "out.mp3");
    await run("ffmpeg", [
      "-y",
      "-loglevel",
      "error",
      ...inputs,
      "-filter_complex",
      filters.join(";"),
      "-map",
      "[out]",
      "-ac",
      "1",
      "-c:a",
      "libmp3lame",
      "-b:a",
      BITRATE,
      tmpMp3,
    ]);
    mkdirSync(path.dirname(outFile), { recursive: true });
    // 같은 디스크가 아닐 수 있어 rename 대신 읽어 쓴다
    writeFileSync(`${outFile}.part`, readFileSync(tmpMp3));
    renameSync(`${outFile}.part`, outFile);
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

interface Job {
  setId: string;
  docId: string;
  audio: DelfAudio;
}

async function main() {
  const files = resolveTargets(target, setsDir);
  if (files.length === 0) throw new Error(`세트가 없습니다: ${setsDir}`);

  const work: Job[] = [];
  for (const file of files) {
    const set = loadSetFile(file);
    for (const s of set.sections) {
      if (s.area !== "CO") continue;
      for (const d of s.documents)
        if (d.audio) work.push({ setId: set.id, docId: d.id, audio: d.audio });
    }
  }

  const voices = await installedVoices();
  const missing = [...new Set(work.flatMap((j) => j.audio.script.map((l) => l.voice)))].filter(
    (v) => !voices.has(v)
  );
  if (missing.length > 0) {
    throw new Error(`이 맥에 없는 음성: ${missing.join(", ")} (say -v '?' 로 이름 확인)`);
  }

  let made = 0;
  let skipped = 0;
  let failed = 0;
  await pool(work, jobs, async ({ setId, docId, audio }) => {
    const outFile = path.join(audioDir, setId, `${docId}.mp3`);
    const hashFile = path.join(audioDir, setId, `${docId}.hash`);
    const hash = scriptHash(audio);
    if (
      !values.force &&
      existsSync(outFile) &&
      existsSync(hashFile) &&
      readFileSync(hashFile, "utf-8").trim() === hash
    ) {
      skipped++;
      return;
    }
    try {
      await buildDoc(setId, docId, audio, outFile);
      writeFileSync(hashFile, `${hash}\n`);
      made++;
      console.log(`✓ ${setId}/${docId}.mp3 (${audio.script.length}줄)`);
    } catch (e) {
      failed++;
      console.error(`✗ ${setId}/${docId}: ${(e as Error).message}`);
    }
  });

  console.log(`만듦 ${made} · 그대로 ${skipped} · 실패 ${failed} → ${audioDir}`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
