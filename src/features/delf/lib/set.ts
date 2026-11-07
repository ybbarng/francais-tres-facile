// DELF 모의고사 세트 형식 `ftf/delf-set@1` (docs/DELF.md). 화면·API·scripts/delf-*.ts 가 함께 쓴다.
// scripts 는 Node 24 가 TypeScript 를 그대로 돌리므로, 이 파일은 다른 모듈을 가져오지 않고
// enum 같은 "지워지지 않는" 문법도 쓰지 않는다.

export const DELF_SET_SCHEMA = "ftf/delf-set@1";
export const DELF_INDEX_SCHEMA = "ftf/delf-index@1";

/** `<level 소문자>-<kind>-<두 자리 번호>`. 파일 경로에 들어가므로 이 모양만 받는다 */
export const DELF_SET_ID_PATTERN = /^(a1|a2|b1|b2)-(mini|exam)-\d{2}$/;

export const DELF_LEVELS = ["A1", "A2", "B1", "B2"] as const;
export const DELF_KINDS = ["mini", "exam"] as const;
export const DELF_AREAS = ["CO", "CE", "PE"] as const;
export const DELF_QUESTION_TYPES = ["choice", "multi", "truefalse"] as const;

export type DelfLevel = (typeof DELF_LEVELS)[number];
export type DelfKind = (typeof DELF_KINDS)[number];
export type DelfArea = (typeof DELF_AREAS)[number];
export type DelfQuestionType = (typeof DELF_QUESTION_TYPES)[number];
/** 앱이 채점하는 영역 */
export type DelfScoredArea = "CO" | "CE";

/** exam 의 영역별 배점(DELF 처럼 25점씩) */
export const DELF_EXAM_AREA_POINTS = 25;

export const DELF_AREA_LABELS: Record<DelfArea, { fr: string; ko: string }> = {
  CO: { fr: "Compréhension de l'oral", ko: "듣기" },
  CE: { fr: "Compréhension des écrits", ko: "읽기" },
  PE: { fr: "Production écrite", ko: "쓰기" },
};

export interface DelfOption {
  id: string;
  text: string;
}

export interface DelfQuestion {
  id: string;
  type: DelfQuestionType;
  prompt: string;
  options: DelfOption[];
  /** 정답 option id. choice·truefalse 는 하나, multi 는 여럿 */
  answer: string[];
  points: number;
  /** 한국어 해설 */
  explanation: string;
}

export interface DelfScriptLine {
  speaker: string;
  /** 맥 `say -v` 음성 이름 */
  voice: string;
  text: string;
}

export interface DelfAudio {
  plays: number;
  script: DelfScriptLine[];
}

export interface DelfDocument {
  id: string;
  context?: string;
  /** CO 만 */
  audio?: DelfAudio;
  /** CE 만 */
  title?: string;
  text?: string;
  questions: DelfQuestion[];
}

export interface DelfRubricItem {
  criterion: string;
  points: number;
}

export interface DelfTask {
  id: string;
  prompt: string;
  minWords: number;
  maxWords?: number;
  points: number;
  rubric: DelfRubricItem[];
}

export interface DelfSection {
  area: DelfArea;
  minutes: number;
  instructions: string;
  /** CO·CE */
  documents: DelfDocument[];
  /** PE */
  tasks: DelfTask[];
}

export interface DelfReview {
  status: "draft" | "verified";
  by?: string;
  at?: string;
  notes?: string;
}

export interface DelfSet {
  schema: typeof DELF_SET_SCHEMA;
  id: string;
  level: DelfLevel;
  kind: DelfKind;
  title: string;
  sections: DelfSection[];
  review: DelfReview;
}

/** 형식이 어긋난 곳을 모두 모아 던진다. issues 한 줄이 한 곳이다 */
export class DelfSetError extends Error {
  issues: string[];
  constructor(issues: string[], label = "DELF 세트") {
    super(`${label} 형식이 올바르지 않습니다:\n- ${issues.join("\n- ")}`);
    this.name = "DelfSetError";
    this.issues = issues;
  }
}

type Rec = Record<string, unknown>;

function isRecord(v: unknown): v is Rec {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPositiveHalfStep(v: unknown): v is number {
  return typeof v === "number" && v > 0 && Number.isInteger(v * 2);
}

function isPositiveInt(v: unknown): v is number {
  return typeof v === "number" && Number.isInteger(v) && v > 0;
}

/** 0.5 단위 점수 합을 비교할 때 부동소수 오차를 없앤다 */
function sameScore(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

function includes<T extends string>(list: readonly T[], v: unknown): v is T {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

const TRUEFALSE_IDS = ["v", "f", "n"];

/**
 * 세트 JSON 을 확인해 화면·채점이 쓰는 모양으로 돌려준다.
 * 어긋나면 어디가 틀렸는지(`sections[0].documents[1].questions[2].answer` 처럼) 모두 적어 던진다.
 */
export function parseDelfSet(json: unknown): DelfSet {
  const issues: string[] = [];
  const bad = (where: string, what: string): void => {
    issues.push(`${where}: ${what}`);
  };

  if (!isRecord(json)) throw new DelfSetError(["최상위가 객체가 아닙니다"]);
  if (json.schema !== DELF_SET_SCHEMA) bad("schema", `"${DELF_SET_SCHEMA}" 이어야 합니다`);

  const { id, level, kind } = json;
  if (typeof id !== "string" || !DELF_SET_ID_PATTERN.test(id)) {
    bad("id", "a2-mini-03 같은 <level>-<kind>-<두 자리> 모양이어야 합니다");
  }
  if (!includes(DELF_LEVELS, level)) bad("level", "A1 | A2 | B1 | B2 중 하나여야 합니다");
  if (!includes(DELF_KINDS, kind)) bad("kind", "mini | exam 중 하나여야 합니다");
  if (typeof id === "string" && DELF_SET_ID_PATTERN.test(id)) {
    const [idLevel, idKind] = id.split("-");
    if (typeof level === "string" && idLevel !== level.toLowerCase()) {
      bad("id", `level(${level}) 과 맞지 않습니다`);
    }
    if (typeof kind === "string" && idKind !== kind) bad("id", `kind(${kind}) 와 맞지 않습니다`);
  }
  if (!isNonEmptyString(json.title)) bad("title", "비어 있지 않은 문자열이어야 합니다");

  const docIds = new Set<string>();
  const questionIds = new Set<string>();
  const taskIds = new Set<string>();
  const areaPoints: Partial<Record<DelfArea, number>> = {};

  const checkQuestion = (q: unknown, where: string) => {
    if (!isRecord(q)) return bad(where, "객체가 아닙니다");
    if (!isNonEmptyString(q.id)) bad(`${where}.id`, "비어 있지 않은 문자열이어야 합니다");
    else if (questionIds.has(q.id)) bad(`${where}.id`, `"${q.id}" 가 세트 안에서 겹칩니다`);
    else questionIds.add(q.id);
    if (!includes(DELF_QUESTION_TYPES, q.type)) {
      bad(`${where}.type`, "choice | multi | truefalse 중 하나여야 합니다");
    }
    if (!isNonEmptyString(q.prompt)) bad(`${where}.prompt`, "비어 있지 않은 문자열이어야 합니다");
    if (!isNonEmptyString(q.explanation)) {
      bad(`${where}.explanation`, "한국어 해설이 있어야 합니다");
    }
    if (!isPositiveHalfStep(q.points)) bad(`${where}.points`, "0.5 단위의 양수여야 합니다");

    const optionIds = new Set<string>();
    if (!Array.isArray(q.options) || q.options.length < 2) {
      bad(`${where}.options`, "보기가 두 개 이상 있어야 합니다");
    } else {
      q.options.forEach((o, k) => {
        const ow = `${where}.options[${k}]`;
        if (!isRecord(o) || !isNonEmptyString(o.id) || !isNonEmptyString(o.text)) {
          bad(ow, "{ id, text } 문자열이어야 합니다");
          return;
        }
        if (optionIds.has(o.id)) bad(`${ow}.id`, `"${o.id}" 가 보기 안에서 겹칩니다`);
        optionIds.add(o.id);
      });
    }
    if (q.type === "truefalse") {
      const ids = [...optionIds];
      if (!ids.includes("v") || !ids.includes("f") || ids.some((x) => !TRUEFALSE_IDS.includes(x))) {
        bad(`${where}.options`, "truefalse 의 보기 id 는 v, f (그리고 n) 이어야 합니다");
      }
    }

    if (!Array.isArray(q.answer) || q.answer.length === 0) {
      return bad(`${where}.answer`, "정답 option id 배열이어야 합니다");
    }
    if (!q.answer.every((a) => typeof a === "string")) {
      return bad(`${where}.answer`, "정답은 option id 문자열이어야 합니다");
    }
    const answer = q.answer as string[];
    for (const a of answer) {
      if (!optionIds.has(a)) bad(`${where}.answer`, `"${a}" 가 options 에 없습니다`);
    }
    if (new Set(answer).size !== answer.length) bad(`${where}.answer`, "같은 id 가 겹칩니다");
    if ((q.type === "choice" || q.type === "truefalse") && answer.length !== 1) {
      bad(`${where}.answer`, `${q.type} 는 정답이 하나여야 합니다`);
    }
  };

  const checkDocument = (d: unknown, area: DelfArea, where: string): number => {
    if (!isRecord(d)) {
      bad(where, "객체가 아닙니다");
      return 0;
    }
    if (!isNonEmptyString(d.id)) bad(`${where}.id`, "비어 있지 않은 문자열이어야 합니다");
    else if (docIds.has(d.id)) bad(`${where}.id`, `"${d.id}" 가 세트 안에서 겹칩니다`);
    else docIds.add(d.id);
    if (d.context !== undefined && typeof d.context !== "string") {
      bad(`${where}.context`, "문자열이어야 합니다");
    }
    if (d.title !== undefined && typeof d.title !== "string") {
      bad(`${where}.title`, "문자열이어야 합니다");
    }
    if (d.text !== undefined && typeof d.text !== "string") {
      bad(`${where}.text`, "문자열이어야 합니다");
    }
    if (area === "CO") {
      const a = d.audio;
      if (!isRecord(a)) {
        bad(`${where}.audio`, "듣기 문서에는 audio 가 있어야 합니다");
      } else {
        if (!isPositiveInt(a.plays)) bad(`${where}.audio.plays`, "1 이상의 정수여야 합니다");
        if (!Array.isArray(a.script) || a.script.length === 0) {
          bad(`${where}.audio.script`, "대본 줄이 하나 이상 있어야 합니다");
        } else {
          a.script.forEach((line, k) => {
            if (
              !isRecord(line) ||
              !isNonEmptyString(line.speaker) ||
              !isNonEmptyString(line.voice) ||
              !isNonEmptyString(line.text)
            ) {
              bad(`${where}.audio.script[${k}]`, "{ speaker, voice, text } 문자열이어야 합니다");
            }
          });
        }
      }
    }
    if (area === "CE" && !isNonEmptyString(d.text)) {
      bad(`${where}.text`, "읽기 문서에는 지문(text)이 있어야 합니다");
    }

    let points = 0;
    if (!Array.isArray(d.questions) || d.questions.length === 0) {
      bad(`${where}.questions`, "문항이 하나 이상 있어야 합니다");
    } else {
      d.questions.forEach((q, k) => {
        checkQuestion(q, `${where}.questions[${k}]`);
        if (isRecord(q) && typeof q.points === "number") points += q.points;
      });
    }
    return points;
  };

  const checkTask = (t: unknown, where: string): number => {
    if (!isRecord(t)) {
      bad(where, "객체가 아닙니다");
      return 0;
    }
    if (!isNonEmptyString(t.id)) bad(`${where}.id`, "비어 있지 않은 문자열이어야 합니다");
    else if (taskIds.has(t.id)) bad(`${where}.id`, `"${t.id}" 가 세트 안에서 겹칩니다`);
    else taskIds.add(t.id);
    if (!isNonEmptyString(t.prompt)) bad(`${where}.prompt`, "비어 있지 않은 문자열이어야 합니다");
    if (!isPositiveInt(t.minWords)) bad(`${where}.minWords`, "1 이상의 정수여야 합니다");
    if (t.maxWords !== undefined) {
      if (!isPositiveInt(t.maxWords)) bad(`${where}.maxWords`, "1 이상의 정수여야 합니다");
      else if (typeof t.minWords === "number" && t.maxWords < t.minWords) {
        bad(`${where}.maxWords`, "minWords 보다 작습니다");
      }
    }
    if (!isPositiveHalfStep(t.points)) bad(`${where}.points`, "0.5 단위의 양수여야 합니다");
    if (!Array.isArray(t.rubric) || t.rubric.length === 0) {
      bad(`${where}.rubric`, "채점 기준이 하나 이상 있어야 합니다");
    } else {
      let sum = 0;
      t.rubric.forEach((r, k) => {
        if (!isRecord(r) || !isNonEmptyString(r.criterion) || !isPositiveHalfStep(r.points)) {
          bad(`${where}.rubric[${k}]`, "{ criterion 문자열, points 0.5 단위 양수 } 여야 합니다");
          return;
        }
        sum += r.points;
      });
      if (typeof t.points === "number" && !sameScore(sum, t.points)) {
        bad(`${where}.rubric`, `점수 합 ${sum} 이 points ${t.points} 와 다릅니다`);
      }
    }
    return typeof t.points === "number" ? t.points : 0;
  };

  if (!Array.isArray(json.sections) || json.sections.length === 0) {
    bad("sections", "영역이 하나 이상 있어야 합니다");
  } else {
    let lastOrder = -1;
    json.sections.forEach((s, i) => {
      const where = `sections[${i}]`;
      if (!isRecord(s)) {
        bad(where, "객체가 아닙니다");
        return;
      }
      const area = s.area;
      if (!includes(DELF_AREAS, area)) {
        bad(`${where}.area`, "CO | CE | PE 중 하나여야 합니다");
        return;
      }
      if (areaPoints[area] !== undefined) bad(`${where}.area`, `${area} 영역이 두 번 나옵니다`);
      const order = DELF_AREAS.indexOf(area);
      if (order < lastOrder) bad(`${where}.area`, "영역은 CO → CE → PE 순서여야 합니다");
      lastOrder = Math.max(lastOrder, order);
      if (!(typeof s.minutes === "number" && s.minutes > 0)) {
        bad(`${where}.minutes`, "양수여야 합니다");
      }
      if (!isNonEmptyString(s.instructions)) {
        bad(`${where}.instructions`, "시험지 지시문이 있어야 합니다");
      }

      let points = 0;
      if (area === "PE") {
        if (
          s.documents !== undefined &&
          !(Array.isArray(s.documents) && s.documents.length === 0)
        ) {
          bad(`${where}.documents`, "쓰기 영역에는 documents 를 두지 않습니다");
        }
        if (!Array.isArray(s.tasks) || s.tasks.length === 0) {
          bad(`${where}.tasks`, "쓰기 과제가 하나 이상 있어야 합니다");
        } else {
          s.tasks.forEach((t, k) => {
            points += checkTask(t, `${where}.tasks[${k}]`);
          });
        }
      } else {
        if (s.tasks !== undefined && !(Array.isArray(s.tasks) && s.tasks.length === 0)) {
          bad(`${where}.tasks`, `${area} 영역에는 tasks 를 두지 않습니다`);
        }
        if (!Array.isArray(s.documents) || s.documents.length === 0) {
          bad(`${where}.documents`, "문서가 하나 이상 있어야 합니다");
        } else {
          s.documents.forEach((d, k) => {
            points += checkDocument(d, area, `${where}.documents[${k}]`);
          });
        }
      }
      areaPoints[area] = points;
    });
  }

  if (kind === "exam") {
    for (const area of DELF_AREAS) {
      const p = areaPoints[area];
      if (p === undefined) bad("sections", `exam 에는 ${area} 영역이 있어야 합니다`);
      else if (!sameScore(p, DELF_EXAM_AREA_POINTS)) {
        bad(
          `sections(${area})`,
          `exam 의 배점은 ${DELF_EXAM_AREA_POINTS}점이어야 하는데 ${p}점입니다`
        );
      }
    }
  }

  const review = json.review;
  if (!isRecord(review)) {
    bad("review", '{ "status": "draft" | "verified", ... } 가 있어야 합니다');
  } else {
    if (review.status !== "draft" && review.status !== "verified") {
      bad("review.status", "draft | verified 중 하나여야 합니다");
    }
    for (const k of ["by", "at", "notes"] as const) {
      if (review[k] !== undefined && typeof review[k] !== "string") {
        bad(`review.${k}`, "문자열이어야 합니다");
      }
    }
  }

  if (issues.length > 0) {
    throw new DelfSetError(issues, typeof id === "string" ? `DELF 세트 ${id}` : "DELF 세트");
  }

  // 확인을 마친 값만 화면이 쓰는 모양으로 옮긴다(모르는 필드는 버린다)
  const set = json as unknown as DelfSet;
  return {
    schema: DELF_SET_SCHEMA,
    id: set.id,
    level: set.level,
    kind: set.kind,
    title: set.title,
    sections: set.sections.map((s) => ({
      area: s.area,
      minutes: s.minutes,
      instructions: s.instructions,
      documents: (s.documents ?? []).map((d) => ({
        id: d.id,
        context: d.context,
        audio: d.audio
          ? {
              plays: d.audio.plays,
              script: d.audio.script.map((l) => ({
                speaker: l.speaker,
                voice: l.voice,
                text: l.text,
              })),
            }
          : undefined,
        title: d.title,
        text: d.text,
        questions: d.questions.map((q) => ({
          id: q.id,
          type: q.type,
          prompt: q.prompt,
          options: q.options.map((o) => ({ id: o.id, text: o.text })),
          answer: [...q.answer],
          points: q.points,
          explanation: q.explanation,
        })),
      })),
      tasks: (s.tasks ?? []).map((t) => ({
        id: t.id,
        prompt: t.prompt,
        minWords: t.minWords,
        maxWords: t.maxWords,
        points: t.points,
        rubric: t.rubric.map((r) => ({ criterion: r.criterion, points: r.points })),
      })),
    })),
    review: {
      status: set.review.status,
      by: set.review.by,
      at: set.review.at,
      notes: set.review.notes,
    },
  };
}

/** 영역 하나의 문항 배점 합 */
export function sectionMaxPoints(section: DelfSection): number {
  if (section.area === "PE") return section.tasks.reduce((n, t) => n + t.points, 0);
  return section.documents.reduce((n, d) => n + d.questions.reduce((m, q) => m + q.points, 0), 0);
}

// ── 세트 목록 index.json ─────────────────────────────────────────────

export interface DelfIndexArea {
  area: DelfArea;
  minutes: number;
  max: number;
}

export interface DelfIndexEntry {
  id: string;
  level: DelfLevel;
  kind: DelfKind;
  title: string;
  areas: DelfIndexArea[];
  status: DelfReview["status"];
}

export interface DelfIndex {
  schema: typeof DELF_INDEX_SCHEMA;
  sets: DelfIndexEntry[];
}

export function indexEntryOf(set: DelfSet): DelfIndexEntry {
  return {
    id: set.id,
    level: set.level,
    kind: set.kind,
    title: set.title,
    areas: set.sections.map((s) => ({
      area: s.area,
      minutes: s.minutes,
      max: sectionMaxPoints(s),
    })),
    status: set.review.status,
  };
}

/** 수준 → 종류 → id 순서 */
export function compareIndexEntries(a: DelfIndexEntry, b: DelfIndexEntry): number {
  const byLevel = DELF_LEVELS.indexOf(a.level) - DELF_LEVELS.indexOf(b.level);
  if (byLevel !== 0) return byLevel;
  const byKind = DELF_KINDS.indexOf(a.kind) - DELF_KINDS.indexOf(b.kind);
  if (byKind !== 0) return byKind;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** 화면이 index.json 을 읽을 때 쓴다. 모양이 다른 항목은 건너뛴다 */
export function parseDelfIndex(json: unknown): DelfIndex {
  if (!isRecord(json) || json.schema !== DELF_INDEX_SCHEMA || !Array.isArray(json.sets)) {
    throw new Error(`index.json 형식이 ${DELF_INDEX_SCHEMA} 가 아닙니다`);
  }
  const sets = json.sets.filter(
    (e): e is DelfIndexEntry =>
      isRecord(e) &&
      typeof e.id === "string" &&
      DELF_SET_ID_PATTERN.test(e.id) &&
      includes(DELF_LEVELS, e.level) &&
      includes(DELF_KINDS, e.kind) &&
      typeof e.title === "string" &&
      Array.isArray(e.areas) &&
      (e.status === "draft" || e.status === "verified")
  );
  return { schema: DELF_INDEX_SCHEMA, sets };
}

/** 음성 파일 주소(public 기준) */
export function audioPath(setId: string, docId: string): string {
  return `/delf/audio/${setId}/${docId}.mp3`;
}
