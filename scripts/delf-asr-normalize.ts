// Whisper 받아쓰기를 대본과 비교하기 전에 맞춘다.
// 대본은 숫자를 낱말로 쓰고(say 가 잘못 읽지 않게), Whisper 는 숫자로 적기 때문이다.

const UNITS = [
  "zéro",
  "un",
  "deux",
  "trois",
  "quatre",
  "cinq",
  "six",
  "sept",
  "huit",
  "neuf",
  "dix",
  "onze",
  "douze",
  "treize",
  "quatorze",
  "quinze",
  "seize",
];
const TENS: Record<number, string> = {
  2: "vingt",
  3: "trente",
  4: "quarante",
  5: "cinquante",
  6: "soixante",
};

function below20(n: number): string {
  return n < 17 ? UNITS[n] : `dix-${UNITS[n - 10]}`;
}

function below100(n: number): string {
  if (n < 20) return below20(n);
  if (n < 70) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return TENS[t];
    return u === 1 ? `${TENS[t]} et un` : `${TENS[t]}-${UNITS[u]}`;
  }
  if (n < 80) return n === 71 ? "soixante et onze" : `soixante-${below20(n - 60)}`;
  if (n === 80) return "quatre-vingts";
  return `quatre-vingt-${below20(n - 80)}`;
}

function below1000(n: number): string {
  if (n < 100) return below100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h === 1 ? "cent" : `${UNITS[h]} cent${r === 0 ? "s" : ""}`;
  return r === 0 ? head : `${head} ${below100(r)}`;
}

/** 0 이상 정수를 프랑스어 낱말로 (999 999 까지) */
export function frenchNumber(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999) return String(n);
  if (n < 1000) return below1000(n);
  const k = Math.floor(n / 1000);
  const r = n % 1000;
  const head = k === 1 ? "mille" : `${below1000(k)} mille`;
  return r === 0 ? head : `${head} ${below1000(r)}`;
}

/** 숫자 덩어리 하나: 0 으로 시작하는 두 자리 이상(전화번호 등)은 한 자리씩 읽는다 */
function spellGroup(digits: string): string {
  if (digits.length > 1 && digits.startsWith("0")) {
    return `zéro ${frenchNumber(Number(digits.slice(1)))}`;
  }
  return frenchNumber(Number(digits));
}

/** Whisper 가 소리 없는 끝부분에 지어내는 자막 문구 */
const HALLUCINATIONS = [/sous-?titrage[^.]*\.?/gi, /sous-?titres?[^.]*amara[^.]*\.?/gi];

export function normalizeHeard(text: string): string {
  let t = text;
  for (const re of HALLUCINATIONS) t = t.replace(re, " ");
  return (
    t
      // 1 000 / 1.000 처럼 끊어 쓴 천 단위를 붙인다
      .replace(/(\d)[ .  ](?=\d{3}\b)/g, "$1")
      // 10h15, 14h, 14 h 30
      .replace(/(\d+)\s*h\s*(\d{2})?\b/gi, (_, h: string, m?: string) =>
        m ? `${spellGroup(h)} heures ${spellGroup(m)}` : `${spellGroup(h)} heures`
      )
      .replace(/(\d+)\s*%/g, (_, d: string) => `${spellGroup(d)} pour cent`)
      .replace(/(\d+)\s*€/g, (_, d: string) => `${spellGroup(d)} euros`)
      .replace(/\d+/g, (d) => spellGroup(d))
  );
}
