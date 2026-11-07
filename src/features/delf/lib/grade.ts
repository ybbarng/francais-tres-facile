import type { DelfQuestion, DelfScoredArea, DelfSet, DelfTask } from "./set";

/** 문항 id → 고른 option id 목록 */
export type DelfAnswers = Record<string, string[]>;
/** 쓰기 과제 id → 쓴 글 */
export type DelfWriting = Record<string, string>;

export interface DelfQuestionResult {
  questionId: string;
  area: DelfScoredArea;
  chosen: string[];
  answer: string[];
  correct: boolean;
  earned: number;
  points: number;
}

export interface DelfScore {
  score: number;
  max: number;
}

export interface DelfGradeResult {
  areas: Record<DelfScoredArea, DelfScore>;
  total: DelfScore;
  questions: DelfQuestionResult[];
}

/** 정답 판정. choice·truefalse 는 정확히 하나가 같을 때, multi 는 고른 집합이 정답 집합과 같을 때만 */
export function isCorrect(question: DelfQuestion, chosen: readonly string[]): boolean {
  const picked = new Set(chosen);
  if (question.type === "multi") {
    return picked.size === question.answer.length && question.answer.every((id) => picked.has(id));
  }
  return chosen.length === 1 && chosen[0] === question.answer[0];
}

/** CO·CE 를 채점한다. 쓰기(PE)는 점수를 매기지 않는다 */
export function gradeDelfSet(set: DelfSet, answers: DelfAnswers): DelfGradeResult {
  const areas: Record<DelfScoredArea, DelfScore> = {
    CO: { score: 0, max: 0 },
    CE: { score: 0, max: 0 },
  };
  const questions: DelfQuestionResult[] = [];
  for (const section of set.sections) {
    if (section.area === "PE") continue;
    const area = section.area;
    for (const doc of section.documents) {
      for (const q of doc.questions) {
        const chosen = Array.isArray(answers[q.id]) ? answers[q.id] : [];
        const correct = isCorrect(q, chosen);
        const earned = correct ? q.points : 0;
        areas[area].score += earned;
        areas[area].max += q.points;
        questions.push({
          questionId: q.id,
          area,
          chosen: [...chosen],
          answer: [...q.answer],
          correct,
          earned,
          points: q.points,
        });
      }
    }
  }
  return {
    areas,
    total: {
      score: areas.CO.score + areas.CE.score,
      max: areas.CO.max + areas.CE.max,
    },
    questions,
  };
}

/**
 * 클라이언트가 보낸 답을 세트에 있는 문항·보기로만 걸러 낸다.
 * 모르는 문항, 보기에 없는 id, 겹친 id 는 버린다.
 */
export function sanitizeAnswers(set: DelfSet, raw: unknown): DelfAnswers {
  const out: DelfAnswers = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  const given = raw as Record<string, unknown>;
  for (const section of set.sections) {
    for (const doc of section.documents) {
      for (const q of doc.questions) {
        const v = given[q.id];
        if (!Array.isArray(v)) continue;
        const allowed = new Set(q.options.map((o) => o.id));
        const ids = [...new Set(v.filter((x): x is string => typeof x === "string"))].filter((x) =>
          allowed.has(x)
        );
        if (ids.length > 0) out[q.id] = ids;
      }
    }
  }
  return out;
}

export const DELF_WRITING_MAX_CHARS = 20000;

/** 쓰기 답을 세트에 있는 과제로만 걸러 내고 너무 긴 글은 자른다 */
export function sanitizeWriting(set: DelfSet, raw: unknown): DelfWriting {
  const out: DelfWriting = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return out;
  const given = raw as Record<string, unknown>;
  for (const section of set.sections) {
    for (const t of section.tasks) {
      const v = given[t.id];
      if (typeof v === "string" && v.trim()) out[t.id] = v.slice(0, DELF_WRITING_MAX_CHARS);
    }
  }
  return out;
}

/**
 * DELF 처럼 띄어쓰기로 나뉜 덩어리를 한 단어로 센다(c'est, aujourd'hui 는 한 단어).
 * 문장부호만 있는 덩어리(— , « ») 는 세지 않는다.
 */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export type WordCountState = "under" | "ok" | "over";

export function wordCountState(task: DelfTask, words: number): WordCountState {
  if (words < task.minWords) return "under";
  if (task.maxWords !== undefined && words > task.maxWords) return "over";
  return "ok";
}

export function wordRangeLabel(task: DelfTask): string {
  return task.maxWords !== undefined
    ? `${task.minWords}~${task.maxWords} 단어`
    : `${task.minWords} 단어 이상`;
}

/** study-french 에서 Claude 에게 붙여 넣을 첨삭 요청 글 */
export function buildCorrectionRequest(set: DelfSet, task: DelfTask, text: string): string {
  const words = countWords(text);
  const rubric = task.rubric.map((r) => `- ${r.criterion}: ${r.points}점`).join("\n");
  return [
    `[DELF ${set.level} 쓰기 첨삭 요청]`,
    `세트: ${set.id} · ${set.title} (연습용으로 새로 만든 문제, 실제 기출 아님)`,
    `과제 ${task.id} · ${task.points}점 · ${wordRangeLabel(task)}`,
    "",
    "## 과제 지시문",
    task.prompt,
    "",
    "## 채점 기준표",
    rubric,
    "",
    `## 내 답 (${words} 단어)`,
    text.trim() || "(아직 쓰지 않음)",
    "",
    `DELF ${set.level} 쓰기 채점 기준에 맞춰 기준마다 점수와 근거를 매기고, 틀린 곳을 고친 문장과 함께 알려 주세요.`,
  ].join("\n");
}
