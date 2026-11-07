// 말하기 표현 원본은 study-french 저장소 하나에만 둔다. FTF 는 복사하지 않고 이 주소를 읽는다.
export const EXPRESSIONS_URL = "https://gh.byb.kr/study-french/speaking/expressions.json";
export const EXPRESSIONS_SCHEMA = "study-french/expressions@1";

export const EXPRESSION_ID_PATTERN = /^E\d{2,3}$/;

export interface Expression {
  id: string;
  group: string;
  fr: string;
  ko: string;
  example: { fr: string; ko: string };
  session: number;
  /** 수업에서 이미 배운 표현인지(원본 값). 사용자가 누르는 「익힘」과는 다르다 */
  learned: boolean;
  /** 다시 볼 이유. 있으면 「다시 볼 것」 */
  review?: string;
}

export interface ExpressionsData {
  groups: Record<string, string>;
  expressions: Expression[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isExpression(v: unknown): v is Expression {
  if (!isRecord(v)) return false;
  const ex = v.example;
  return (
    typeof v.id === "string" &&
    EXPRESSION_ID_PATTERN.test(v.id) &&
    typeof v.group === "string" &&
    typeof v.fr === "string" &&
    typeof v.ko === "string" &&
    isRecord(ex) &&
    typeof ex.fr === "string" &&
    typeof ex.ko === "string" &&
    typeof v.session === "number" &&
    typeof v.learned === "boolean" &&
    (v.review === undefined || typeof v.review === "string")
  );
}

/** 원본 JSON 을 확인해 화면이 쓰는 모양으로 돌려준다. 형식이 다르면 던진다 */
export function parseExpressions(json: unknown): ExpressionsData {
  if (!isRecord(json) || json.schema !== EXPRESSIONS_SCHEMA) {
    throw new Error(`expressions.json 형식이 ${EXPRESSIONS_SCHEMA} 가 아닙니다`);
  }
  const { groups, expressions } = json;
  if (!isRecord(groups) || !Object.values(groups).every((g) => typeof g === "string")) {
    throw new Error("expressions.json 의 groups 가 올바르지 않습니다");
  }
  if (!Array.isArray(expressions)) {
    throw new Error("expressions.json 의 expressions 가 배열이 아닙니다");
  }
  const bad = expressions.findIndex((e) => !isExpression(e));
  if (bad !== -1) {
    throw new Error(`expressions.json 의 ${bad + 1}번째 표현 형식이 올바르지 않습니다`);
  }
  return { groups: groups as Record<string, string>, expressions: expressions as Expression[] };
}

export interface ExpressionFilter {
  /** "all" 이거나 묶음 키(A..E) */
  group: string;
  reviewOnly: boolean;
  hideMastered: boolean;
}

export function filterExpressions(
  list: Expression[],
  filter: ExpressionFilter,
  mastered: ReadonlySet<string>
): Expression[] {
  return list.filter(
    (e) =>
      (filter.group === "all" || e.group === filter.group) &&
      (!filter.reviewOnly || !!e.review) &&
      (!filter.hideMastered || !mastered.has(e.id))
  );
}

/** Fisher–Yates. random 을 넣을 수 있게 해 테스트에서 결과를 정한다 */
export function shuffled<T>(list: readonly T[], random: () => number = Math.random): T[] {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 음성으로 읽을 때 빈칸 표시(…)와 한국어 안내(+ 동사원형)를 뺀다 */
export function speakableText(fr: string): string {
  return fr
    .replace(/…/g, "")
    .replace(/\+\s*동사원형/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}
