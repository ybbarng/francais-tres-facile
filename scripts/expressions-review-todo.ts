// 표현 연습 문제 검토를 다시 돌릴 곳을 뽑는다(docs/EXPRESSIONS-PRACTICE.md 「검토 다시 돌리기」).
//   node scripts/expressions-review-todo.ts <expressions.json 경로 또는 주소> [--review <검토 기록 경로>]
// 검토 기록에 없는 표현, 예문(text)·cue 가 원본과 달라진 칸, 원본과 맞춰 본 잘못을 출력한다.
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseExpressions } from "../src/features/expressions/lib/expressions.ts";
import {
  parsePracticeReview,
  reviewProblems,
  reviewTodo,
} from "../src/features/expressions/lib/practice-review.ts";

const DEFAULT_REVIEW = "src/features/expressions/data/practice-review.json";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { review: { type: "string" } },
});
const source = positionals[0];
if (!source) {
  console.error(
    "사용법: node scripts/expressions-review-todo.ts <expressions.json 경로|주소> [--review <파일>]"
  );
  process.exit(2);
}

async function readSource(src: string): Promise<unknown> {
  if (/^https?:\/\//.test(src)) {
    const res = await fetch(src, { cache: "no-cache" });
    if (!res.ok) throw new Error(`${src}: HTTP ${res.status}`);
    return res.json();
  }
  return JSON.parse(readFileSync(path.resolve(src), "utf8"));
}

const { expressions } = parseExpressions(await readSource(source));
const reviewPath = path.resolve(values.review ?? DEFAULT_REVIEW);
const review = parsePracticeReview(JSON.parse(readFileSync(reviewPath, "utf8")));

const todo = reviewTodo(review, expressions);
const problems = reviewProblems(review, expressions);

console.log(`원본 ${expressions.length}개 · 검토 기록 ${Object.keys(review.items).length}개`);
console.log(`\n검토 기록에 없는 표현 ${todo.unreviewed.length}개`);
if (todo.unreviewed.length) console.log(`  ${todo.unreviewed.join(" ")}`);
console.log(`\n예문 칸이 없거나 text 가 원본과 다른 표현 ${todo.staleExamples.length}개`);
if (todo.staleExamples.length) console.log(`  ${todo.staleExamples.join(" ")}`);
console.log(`\n짝 맞는 칸이 없는 context ${todo.unmatchedContexts.length}개`);
for (const c of todo.unmatchedContexts) console.log(`  ${c.id}  ${c.cue}`);
console.log(`\n원본과 맞춰 본 잘못 ${problems.length}개`);
for (const p of problems) console.log(`  ${p}`);

if (problems.length) process.exitCode = 1;
