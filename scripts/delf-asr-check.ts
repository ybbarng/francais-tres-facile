// 만든 듣기 음성을 Whisper 로 받아 적어 대본과 단어 단위로 비교한다(docs/DELF.md "정답 확인 단계" 4).
//   node scripts/delf-asr-check.ts <setId|all|파일.json> [--sets <dir>] [--audio <dir>] [--model <bin>] [--min 0.9] [--all]
// 문서마다 일치율과 크게 다른 구간(두 단어 이상 어긋나거나 숫자가 낀 곳)을 출력한다. --all 은 한 단어 차이도 보인다.
// 일치율이 --min 보다 낮은 문서가 있으면 실패로 끝난다.
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { parseArgs } from "node:util";
import { normalizeHeard } from "./delf-asr-normalize.ts";
import {
  DEFAULT_AUDIO_DIR,
  DEFAULT_SETS_DIR,
  loadSetFile,
  resolveTargets,
  run,
} from "./delf-common.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    sets: { type: "string" },
    audio: { type: "string" },
    model: { type: "string" },
    min: { type: "string", default: "0.9" },
    all: { type: "boolean", default: false },
  },
});
const [target] = positionals;
if (!target) {
  console.error(
    "사용법: node scripts/delf-asr-check.ts <setId|all|파일.json> [--sets <dir>] [--audio <dir>] [--model <bin>] [--min 0.9] [--all]"
  );
  process.exit(2);
}
const setsDir = path.resolve(values.sets ?? DEFAULT_SETS_DIR);
const audioDir = path.resolve(values.audio ?? DEFAULT_AUDIO_DIR);
const model = values.model ?? path.join(os.homedir(), ".whisper-models", "ggml-large-v3.bin");
const minRatio = Number(values.min ?? "0.9");

/** 비교용 단어 목록: 소문자, 아포스트로피·하이픈·문장부호에서 끊는다 (c'est → c est) */
function normalizeWords(text: string): string[] {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

interface Span {
  expected: string[];
  heard: string[];
}

/** LCS 로 두 단어 목록을 맞춰 같은 단어 수와 어긋난 구간을 돌려준다 */
function diffWords(expected: string[], heard: string[]): { same: number; spans: Span[] } {
  const n = expected.length;
  const m = heard.length;
  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        expected[i] === heard[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const spans: Span[] = [];
  let cur: Span | null = null;
  const flush = () => {
    if (cur) spans.push(cur);
    cur = null;
  };
  let i = 0;
  let j = 0;
  let same = 0;
  while (i < n || j < m) {
    if (i < n && j < m && expected[i] === heard[j]) {
      flush();
      same++;
      i++;
      j++;
    } else if (j >= m || (i < n && dp[i + 1][j] >= dp[i][j + 1])) {
      cur ??= { expected: [], heard: [] };
      cur.expected.push(expected[i++]);
    } else {
      cur ??= { expected: [], heard: [] };
      cur.heard.push(heard[j++]);
    }
  }
  flush();
  return { same, spans };
}

async function transcribe(mp3: string): Promise<string> {
  const tmp = mkdtempSync(path.join(os.tmpdir(), "delf-asr-"));
  try {
    const wav = path.join(tmp, "in.wav");
    await run("ffmpeg", ["-y", "-loglevel", "error", "-i", mp3, "-ar", "16000", "-ac", "1", wav]);
    const of = path.join(tmp, "out");
    await run("whisper-cli", ["-m", model, "-l", "fr", "-np", "-oj", "-of", of, wav]);
    const json = JSON.parse(readFileSync(`${of}.json`, "utf-8")) as {
      transcription: { text: string }[];
    };
    return json.transcription.map((s) => s.text).join(" ");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function isBig(span: Span): boolean {
  if (values.all) return true;
  const words = [...span.expected, ...span.heard];
  return Math.max(span.expected.length, span.heard.length) >= 2 || words.some((w) => /\d/.test(w));
}

async function main() {
  if (!existsSync(model)) throw new Error(`Whisper 모델이 없습니다: ${model}`);
  const files = resolveTargets(target, setsDir);
  if (files.length === 0) throw new Error(`세트가 없습니다: ${setsDir}`);

  let low = 0;
  let missing = 0;
  for (const file of files) {
    const set = loadSetFile(file);
    for (const s of set.sections) {
      if (s.area !== "CO") continue;
      for (const d of s.documents) {
        if (!d.audio) continue;
        const mp3 = path.join(audioDir, set.id, `${d.id}.mp3`);
        if (!existsSync(mp3)) {
          missing++;
          console.log(
            `? ${set.id}/${d.id}: 음성이 없습니다 (node scripts/delf-audio.ts ${set.id})`
          );
          continue;
        }
        const expected = normalizeWords(d.audio.script.map((l) => l.text).join(" "));
        const heardText = await transcribe(mp3);
        const heard = normalizeWords(normalizeHeard(heardText));
        const { same, spans } = diffWords(expected, heard);
        const ratio = expected.length === 0 ? 1 : same / expected.length;
        const ok = ratio >= minRatio;
        if (!ok) low++;
        console.log(
          `${ok ? "✓" : "✗"} ${set.id}/${d.id}: ${(ratio * 100).toFixed(1)}% (대본 ${expected.length}단어, 받아 적음 ${heard.length}단어)`
        );
        for (const span of spans.filter(isBig)) {
          console.log(
            `    대본 「${span.expected.join(" ") || "∅"}」 ↔ 들림 「${span.heard.join(" ") || "∅"}」`
          );
        }
      }
    }
  }
  if (missing > 0) console.log(`음성이 없는 문서 ${missing}개`);
  if (low > 0 || missing > 0) process.exit(1);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
