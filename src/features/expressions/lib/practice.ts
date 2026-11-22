// 말하기 표현 연습(/expressions/practice)의 문제 만들기와 한 판 진행 규칙.
// 프랑스어 문장은 데이터에 있는 것만 쓴다. 가리거나 토막 내기만 하고 새로 만들거나 섞어 꾸미지 않는다.
import { type Expression, shuffled } from "./expressions";

export type PracticeMode = "recall" | "context" | "blank" | "order" | "listen";

export const PRACTICE_MODES: readonly PracticeMode[] = [
  "recall",
  "context",
  "blank",
  "order",
  "listen",
];

export const PRACTICE_MODE_LABELS: Record<PracticeMode, string> = {
  recall: "떠올리기",
  context: "상황 대꾸",
  blank: "빈칸",
  order: "순서 맞추기",
  listen: "듣고 고르기",
};

/** 4지선다의 오답 개수 */
export const DISTRACTOR_COUNT = 3;
/** 순서 맞추기에 쓰는 문장의 토막 수 범위 */
export const ORDER_MIN_TOKENS = 3;
export const ORDER_MAX_TOKENS = 12;

type Random = () => number;

// ── 글자 비교 ─────────────────────────────────────────

/** 대소문자와 아포스트로피(’ ‘ ')를 같은 것으로 본다. 글자 수는 그대로라 위치를 원문에 그대로 쓸 수 있다 */
function foldChar(c: string): string {
  if (c === "’" || c === "‘") return "'";
  const lower = c.toLowerCase();
  return lower.length === 1 ? lower : c;
}

export function foldText(s: string): string {
  return Array.from(s, foldChar).join("");
}

const LETTER = /[\p{L}\p{N}]/u;

// ── 빈칸 ─────────────────────────────────────────────

const EDGE = /^[\s,.;:!?«»"“”]+|[\s,.;:!?«»"“”]+$/g;

/**
 * 표현(fr)의 고정 부분들. "…"(빈자리), "/"(대안), 괄호 덧붙임으로 나누고
 * 끝의 문장부호를 뗀다. 한국어 안내("+ 동사원형")는 뺀다. 긴 것부터
 */
export function fixedFragments(fr: string): string[] {
  const parts = fr
    .replace(/\+\s*동사원형/g, "")
    .split(/…|\.\.\.|\/|\(|\)/)
    .map((p) => p.replace(EDGE, "").trim())
    .filter((p) => p.length >= 2);
  const seen = new Set<string>();
  const unique = parts.filter((p) => {
    const key = foldText(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return unique.sort((a, b) => b.length - a.length);
}

export interface BlankSpot {
  start: number;
  end: number;
  /** 문장에 실제로 쓰인 글자(대소문자 그대로) */
  text: string;
}

/**
 * 문장 안에서 가릴 고정 부분. 문장에 실제로 들어 있는(대소문자·아포스트로피 차이 무시, 단어 중간 제외)
 * 조각 중 가장 긴 것. 못 찾으면 null
 */
export function findBlank(sentence: string, fr: string): BlankSpot | null {
  const folded = foldText(sentence);
  for (const fragment of fixedFragments(fr)) {
    const needle = foldText(fragment);
    let from = 0;
    while (from <= folded.length) {
      const start = folded.indexOf(needle, from);
      if (start === -1) break;
      const end = start + needle.length;
      const before = start > 0 ? sentence[start - 1] : "";
      const after = end < sentence.length ? sentence[end] : "";
      const startsWord = !LETTER.test(fragment[0]) || !LETTER.test(before);
      const endsWord = !LETTER.test(fragment[fragment.length - 1]) || !LETTER.test(after);
      if (startsWord && endsWord) return { start, end, text: sentence.slice(start, end) };
      from = start + 1;
    }
  }
  return null;
}

/** 보기의 첫 글자 대소문자를 정답에 맞춘다(첫 글자로 정답이 드러나지 않게) */
export function matchFirstCase(s: string, ref: string): string {
  if (!s || !ref) return s;
  const r = ref[0];
  const upper = r !== r.toLowerCase();
  return (upper ? s[0].toUpperCase() : s[0].toLowerCase()) + s.slice(1);
}

// ── 오답 보기 ─────────────────────────────────────────

/**
 * 같은 범위의 다른 표현에서 오답을 뽑는다. 정답 표현과 excludeIds(context 의 combo 등)는 빼고,
 * key 로 본 글이 정답과 같거나 서로 같은 것도 뺀다. count 개를 못 채우면 null
 */
export function pickDistractors(
  pool: readonly Expression[],
  answer: Expression,
  options: {
    key: (e: Expression) => string;
    excludeIds?: readonly string[];
    count?: number;
    random?: Random;
  }
): Expression[] | null {
  const { key, excludeIds = [], count = DISTRACTOR_COUNT, random = Math.random } = options;
  const skip = new Set([answer.id, ...excludeIds]);
  const seen = new Set([foldText(key(answer))]);
  const picked: Expression[] = [];
  for (const e of shuffled(pool, random)) {
    if (picked.length === count) break;
    if (skip.has(e.id)) continue;
    const k = foldText(key(e));
    if (seen.has(k)) continue;
    seen.add(k);
    picked.push(e);
  }
  return picked.length === count ? picked : null;
}

// ── 순서 맞추기 ───────────────────────────────────────

const PUNCT_ONLY = /^[^\p{L}\p{N}]+$/u;
const OPENING = /^[«(“"¿¡[]+$/;

/**
 * 문장을 단어 토막으로 나눈다. 문장부호만 있는 토막은 앞 단어에 붙이고,
 * 여는 따옴표(«)처럼 여는 부호는 뒤 단어에 붙인다. tokens.join(" ") 이 원문(공백 하나로 맞춘 것)과 같다
 */
export function splitTokens(sentence: string): string[] {
  const words = sentence.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let pending = "";
  for (const w of words) {
    if (PUNCT_ONLY.test(w) && (OPENING.test(w) || out.length === 0)) {
      pending = pending ? `${pending} ${w}` : w;
    } else if (PUNCT_ONLY.test(w)) {
      out[out.length - 1] = `${out[out.length - 1]} ${w}`;
    } else {
      out.push(pending ? `${pending} ${w}` : w);
      pending = "";
    }
  }
  if (pending) {
    if (out.length) out[out.length - 1] = `${out[out.length - 1]} ${pending}`;
    else out.push(pending);
  }
  return out;
}

/** 토막을 섞은 순서(원래 위치 번호). 원래 글 순서와 같게 섞이면 한 칸 돌린다. 모두 같은 글이면 null */
export function scrambleOrder(
  tokens: readonly string[],
  random: Random = Math.random
): number[] | null {
  if (tokens.length < 2 || tokens.every((t) => t === tokens[0])) return null;
  const order = shuffled(
    tokens.map((_, i) => i),
    random
  );
  const same = order.every((idx, pos) => tokens[idx] === tokens[pos]);
  return same ? [...order.slice(1), order[0]] : order;
}

// ── 문제 ─────────────────────────────────────────────

export interface ChoiceOption {
  /** 보기를 낸 표현 id */
  id: string;
  label: string;
}

export type Question =
  | {
      mode: "recall";
      expressionId: string;
      prompt: string;
      answer: string;
      /** true 면 예문(example)으로 묻는다 */
      byExample: boolean;
    }
  | {
      mode: "context";
      expressionId: string;
      cue: string;
      cueKo: string;
      reply: string;
      replyKo: string;
      choices: ChoiceOption[];
    }
  | {
      mode: "blank";
      expressionId: string;
      sentence: string;
      sentenceKo: string;
      spot: BlankSpot;
      choices: ChoiceOption[];
    }
  | {
      mode: "order";
      expressionId: string;
      tokens: string[];
      order: number[];
      ko: string;
    }
  | {
      mode: "listen";
      expressionId: string;
      sentence: string;
      choices: ChoiceOption[];
    };

export interface QuestionOptions {
  random?: Random;
  /** 기기에 프랑스어 음성이 있는지. 없으면 듣고 고르기를 만들지 않는다 */
  canSpeak: boolean;
}

function withAnswer(answer: ChoiceOption, others: ChoiceOption[], random: Random): ChoiceOption[] {
  return shuffled([answer, ...others], random);
}

/** 한 표현으로 정한 방식의 문제를 만든다. 그 방식에 쓸 재료가 모자라면 null */
export function makeQuestion(
  mode: PracticeMode,
  expr: Expression,
  pool: readonly Expression[],
  { random = Math.random, canSpeak }: QuestionOptions
): Question | null {
  switch (mode) {
    case "recall": {
      const byExample = random() < 0.5;
      return {
        mode,
        expressionId: expr.id,
        byExample,
        prompt: byExample ? expr.example.ko : expr.ko,
        answer: byExample ? expr.example.fr : expr.fr,
      };
    }
    case "context": {
      const contexts = expr.contexts ?? [];
      if (!contexts.length) return null;
      const ctx = contexts[Math.floor(random() * contexts.length)];
      const others = pickDistractors(pool, expr, {
        key: (e) => e.fr,
        excludeIds: ctx.combo ? [ctx.combo] : [],
        random,
      });
      if (!others) return null;
      return {
        mode,
        expressionId: expr.id,
        cue: ctx.cue,
        cueKo: ctx.cueKo,
        reply: ctx.reply,
        replyKo: ctx.replyKo,
        choices: withAnswer(
          { id: expr.id, label: expr.fr },
          others.map((e) => ({ id: e.id, label: e.fr })),
          random
        ),
      };
    }
    case "blank": {
      const sentences = shuffled(
        [
          { fr: expr.example.fr, ko: expr.example.ko, combo: undefined as string | undefined },
          ...(expr.contexts ?? []).map((c) => ({ fr: c.reply, ko: c.replyKo, combo: c.combo })),
        ],
        random
      );
      for (const s of sentences) {
        const spot = findBlank(s.fr, expr.fr);
        if (!spot) continue;
        const fragmentOf = (e: Expression) =>
          e.id === expr.id ? spot.text : (fixedFragments(e.fr)[0] ?? "");
        const others = pickDistractors(
          pool.filter((e) => e.id === expr.id || fixedFragments(e.fr).length > 0),
          expr,
          {
            key: (e) => matchFirstCase(fragmentOf(e), spot.text),
            excludeIds: s.combo ? [s.combo] : [],
            random,
          }
        );
        if (!others) continue;
        return {
          mode,
          expressionId: expr.id,
          sentence: s.fr,
          sentenceKo: s.ko,
          spot,
          choices: withAnswer(
            { id: expr.id, label: spot.text },
            others.map((e) => ({ id: e.id, label: matchFirstCase(fragmentOf(e), spot.text) })),
            random
          ),
        };
      }
      return null;
    }
    case "order": {
      const tokens = splitTokens(expr.example.fr);
      if (tokens.length < ORDER_MIN_TOKENS || tokens.length > ORDER_MAX_TOKENS) return null;
      const order = scrambleOrder(tokens, random);
      if (!order) return null;
      return { mode, expressionId: expr.id, tokens, order, ko: expr.example.ko };
    }
    case "listen": {
      if (!canSpeak) return null;
      const others = pickDistractors(pool, expr, { key: (e) => e.example.ko, random });
      if (!others) return null;
      return {
        mode,
        expressionId: expr.id,
        sentence: expr.example.fr,
        choices: withAnswer(
          { id: expr.id, label: expr.example.ko },
          others.map((e) => ({ id: e.id, label: e.example.ko })),
          random
        ),
      };
    }
  }
}

/**
 * 고른 방식들 가운데 무작위로 하나를 골라 문제를 만든다. 재료가 모자라면 다른 방식으로 넘어간다.
 * avoid 는 가능하면 피할 방식(다시 나오는 문제를 다른 방식으로 내려고)
 */
export function buildQuestion(
  expr: Expression,
  pool: readonly Expression[],
  modes: readonly PracticeMode[],
  options: QuestionOptions & { avoid?: PracticeMode }
): Question | null {
  const random = options.random ?? Math.random;
  const order = shuffled(modes, random);
  const tries = options.avoid
    ? [...order.filter((m) => m !== options.avoid), ...order.filter((m) => m === options.avoid)]
    : order;
  for (const mode of tries) {
    const q = makeQuestion(mode, expr, pool, { ...options, random });
    if (q) return q;
  }
  return null;
}

// ── 한 판 진행 ───────────────────────────────────────

export const ROUND_SIZE = 10;
/** 틀린 표현이 그 판 안에서 다시 나오는 최대 횟수 */
export const MAX_RETRY = 2;
/** 틀린 표현을 몇 문제 뒤에 다시 낼지 */
export const RETRY_GAP = 3;

export interface RoundItem {
  expressionId: string;
  /** 몇 번째 다시 나온 것인지(처음은 0) */
  retry: number;
  /** 다시 낼 때 피할 방식(지난번 방식) */
  avoid?: PracticeMode;
}

/** 이번 판에 낼 표현들. 대상을 섞어 size 개(모자라면 전부) */
export function planRound(
  targets: readonly Expression[],
  size: number = ROUND_SIZE,
  random: Random = Math.random
): RoundItem[] {
  return shuffled(targets, random)
    .slice(0, size)
    .map((e) => ({ expressionId: e.id, retry: 0 }));
}

/**
 * 답한 뒤의 남은 문제 줄. rest 는 지금 문제를 뺀 나머지다.
 * 틀렸고 다시 나온 횟수가 상한보다 적으면 RETRY_GAP 문제 뒤(줄이 짧으면 맨 끝)에 다시 넣는다.
 * 맞히면 그대로 둔다(다시 나온 문제를 맞히면 사라진다)
 */
export function queueAfterAnswer(
  rest: readonly RoundItem[],
  item: RoundItem,
  correct: boolean,
  mode: PracticeMode,
  { gap = RETRY_GAP, maxRetry = MAX_RETRY }: { gap?: number; maxRetry?: number } = {}
): RoundItem[] {
  if (correct || item.retry >= maxRetry) return rest.slice();
  const at = Math.min(gap, rest.length);
  return [
    ...rest.slice(0, at),
    { expressionId: item.expressionId, retry: item.retry + 1, avoid: mode },
    ...rest.slice(at),
  ];
}

/** 맞힌 문제의 점수. 콤보(이번 것 포함 연속 정답 수)가 길수록 조금씩 더 준다(최대 +10) */
export function pointsFor(combo: number): number {
  return 10 + Math.min(Math.max(combo - 1, 0), 5) * 2;
}
