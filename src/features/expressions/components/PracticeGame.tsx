"use client";

import { ArrowLeft, Flame, Gamepad2, RotateCcw, Timer, Volume2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuth, getStoredPassword } from "@/lib/password";
import { cn } from "@/lib/utils";
import { useFrenchVoice } from "../hooks/use-french-voice";
import {
  EXPRESSIONS_URL,
  type Expression,
  type ExpressionsData,
  parseExpressions,
} from "../lib/expressions";
import {
  buildQuestion,
  PRACTICE_MODE_LABELS,
  PRACTICE_MODES,
  type PracticeMode,
  planRound,
  pointsFor,
  type Question,
  queueAfterAnswer,
  type RoundItem,
} from "../lib/practice";
import {
  distractorPool,
  expressionsInRange,
  type PracticeRange,
  parsePracticeRange,
  RANGE_MODE_LABELS,
  RANGE_MODES,
  type RangeMode,
  rangeBounds,
  resolveRange,
  type SessionOption,
  seoulMonthDay,
  sessionOptions,
} from "../lib/practice-range";
import PracticeQuestionView from "./PracticeQuestionView";

// 옛 키(ftf-expressions-practice-last-session)는 옛 session 번호라 읽지 않는다
const LOCAL_RANGE_KEY = "ftf-expressions-practice-range";
const LOCAL_MODES_KEY = "ftf-expressions-practice-modes";
const SETTING_URL = "/api/expressions/practice-setting";

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 이번 방문에만 기억한다
  }
}

function readLocalRange(): PracticeRange | null {
  const raw = readLocal(LOCAL_RANGE_KEY);
  if (!raw) return null;
  try {
    return parsePracticeRange(JSON.parse(raw));
  } catch {
    return null;
  }
}

function readLocalModes(): PracticeMode[] | null {
  const raw = readLocal(LOCAL_MODES_KEY);
  if (!raw) return null;
  const modes = raw
    .split(",")
    .filter((m): m is PracticeMode => (PRACTICE_MODES as readonly string[]).includes(m));
  return modes.length ? modes : null;
}

function formatTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// ── 한 판 상태 ─────────────────────────────────────────

interface PlayState {
  pool: Expression[];
  modes: PracticeMode[];
  canSpeak: boolean;
  queue: RoundItem[];
  item: RoundItem | null;
  question: Question | null;
  answered: boolean;
  /** 지금까지 낸 문제 수(다시 나온 것 포함) */
  shown: number;
  firstTotal: number;
  score: number;
  combo: number;
  bestCombo: number;
  correctCount: number;
  answeredCount: number;
  /** 이 판에서 한 번이라도 틀린 표현 id(처음 틀린 순서) */
  wrongIds: string[];
  startedAt: number;
  endedAt: number | null;
}

type Action =
  | { type: "start"; state: PlayState }
  | { type: "answer"; correct: boolean }
  | { type: "next" }
  | { type: "quit" }
  | { type: "reset" };

function advance(s: PlayState): PlayState {
  const byId = new Map(s.pool.map((e) => [e.id, e]));
  let queue = s.queue;
  while (queue.length) {
    const [item, ...rest] = queue;
    queue = rest;
    const expr = byId.get(item.expressionId);
    const question =
      expr && buildQuestion(expr, s.pool, s.modes, { canSpeak: s.canSpeak, avoid: item.avoid });
    if (question) {
      return { ...s, queue, item, question, answered: false, shown: s.shown + 1 };
    }
  }
  return { ...s, queue, item: null, question: null, endedAt: Date.now() };
}

function reducer(s: PlayState | null, a: Action): PlayState | null {
  if (a.type === "start") return advance(a.state);
  if (a.type === "reset" || !s) return null;
  switch (a.type) {
    case "answer": {
      if (s.answered || !s.item || !s.question) return s;
      const combo = a.correct ? s.combo + 1 : 0;
      const id = s.item.expressionId;
      return {
        ...s,
        answered: true,
        combo,
        bestCombo: Math.max(s.bestCombo, combo),
        score: a.correct ? s.score + pointsFor(combo) : s.score,
        correctCount: s.correctCount + (a.correct ? 1 : 0),
        answeredCount: s.answeredCount + 1,
        wrongIds: a.correct || s.wrongIds.includes(id) ? s.wrongIds : [...s.wrongIds, id],
        queue: queueAfterAnswer(s.queue, s.item, a.correct, s.question.mode),
      };
    }
    case "next":
      return s.answered ? advance(s) : s;
    case "quit":
      return { ...s, queue: [], item: null, question: null, endedAt: Date.now() };
  }
}

function newPlay(
  targets: Expression[],
  pool: Expression[],
  modes: PracticeMode[],
  canSpeak: boolean
): PlayState {
  const queue = planRound(targets);
  return {
    pool,
    modes,
    canSpeak,
    queue,
    item: null,
    question: null,
    answered: false,
    shown: 0,
    firstTotal: queue.length,
    score: 0,
    combo: 0,
    bestCombo: 0,
    correctCount: 0,
    answeredCount: 0,
    wrongIds: [],
    startedAt: Date.now(),
    endedAt: null,
  };
}

// ── 화면 ─────────────────────────────────────────────

function Chip({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-40",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

export default function PracticeGame() {
  const [data, setData] = useState<ExpressionsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [savedRange, setSavedRange] = useState<PracticeRange | null>(null);
  const [serverRange, setServerRange] = useState<PracticeRange | null | undefined>(undefined);
  const [modes, setModes] = useState<PracticeMode[]>([...PRACTICE_MODES]);
  const [play, dispatch] = useReducer(reducer, null);
  const [now, setNow] = useState(() => Date.now());
  const warnedNoPassword = useRef(false);
  const voice = useFrenchVoice();

  useEffect(() => {
    const localRange = readLocalRange();
    if (localRange) setSavedRange(localRange);
    const savedModes = readLocalModes();
    if (savedModes) setModes(savedModes);

    fetch(EXPRESSIONS_URL, { cache: "no-cache" })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setData(parseExpressions(json)))
      .catch((e) => {
        console.error("Failed to load expressions.json", e);
        setLoadError(true);
      });
    fetch(SETTING_URL)
      .then((r) => (r.ok ? r.json() : { range: null }))
      .then((json: { range?: unknown }) => setServerRange(parsePracticeRange(json.range)))
      .catch((e) => {
        console.error("Failed to load practice setting", e);
        setServerRange(null);
      });
  }, []);

  // 서버에 저장한 값이 있으면 그것을 쓴다(폰과 맥이 같이 본다)
  useEffect(() => {
    if (serverRange) setSavedRange(serverRange);
  }, [serverRange]);

  // 기본 범위의 끝을 정하는 오늘 날짜(서울). 데이터에 아직 배우지 않은 세션이 미리 들어 있다
  const today = useMemo(() => seoulMonthDay(new Date()), []);
  const options = useMemo(() => (data ? sessionOptions(data.expressions) : []), [data]);
  const range = useMemo(
    () => resolveRange(options, savedRange, today),
    [options, savedRange, today]
  );
  const bounds = useMemo(() => (range ? rangeBounds(options, range) : null), [options, range]);
  // 문제는 고른 범위에서, 4지선다 오답 보기는 범위 끝 세션까지 누적에서 뽑는다
  const targetsInRange = useMemo(
    () => (data ? expressionsInRange(data.expressions, bounds) : []),
    [data, bounds]
  );
  const pool = useMemo(
    () => (data ? distractorPool(data.expressions, bounds) : []),
    [data, bounds]
  );

  const playing = play !== null && play.endedAt === null;
  useEffect(() => {
    if (!playing) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [playing]);

  const chooseRange = useCallback(async (next: PracticeRange) => {
    setSavedRange(next);
    writeLocal(LOCAL_RANGE_KEY, JSON.stringify(next));
    if (!getStoredPassword()) {
      if (!warnedNoPassword.current) {
        warnedNoPassword.current = true;
        toast.info(
          "이 기기에서만 기억합니다. 폰과 맥에서 같이 보려면 위쪽 자물쇠로 암호를 넣으세요."
        );
      }
      return;
    }
    try {
      const res = await fetchWithAuth(SETTING_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ range: next }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
    } catch (e) {
      toast.error(`연습 범위를 서버에 저장하지 못했습니다. ${e instanceof Error ? e.message : ""}`);
    }
  }, []);

  const toggleMode = (m: PracticeMode) => {
    setModes((prev) => {
      const next = prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m];
      if (!next.length) return prev;
      writeLocal(LOCAL_MODES_KEY, next.join(","));
      return next;
    });
  };

  const usableModes = modes.filter((m) => m !== "listen" || voice.available);

  const start = (targets: Expression[]) => {
    const playModes = usableModes.length ? usableModes : (["recall"] as PracticeMode[]);
    setNow(Date.now());
    dispatch({ type: "start", state: newPlay(targets, pool, playModes, voice.available) });
  };

  const byId = useMemo(() => new Map(pool.map((e) => [e.id, e])), [pool]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-5 w-5 text-primary" />
          <CardTitle>표현 연습</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          배운 표현을 여러 방식으로 꺼내 써 봅니다. 한 판은 10문제, 2~3분이면 끝나요.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError ? (
          <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
            표현 목록을 불러오지 못했습니다. 새로고침해 보세요.
          </div>
        ) : !data ? (
          <div className="space-y-3">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : play === null ? (
          <Setup
            options={options}
            range={range}
            onRange={chooseRange}
            targetCount={targetsInRange.length}
            modes={modes}
            onToggleMode={toggleMode}
            canSpeak={voice.available}
            onStart={() => start(targetsInRange)}
          />
        ) : play.question && play.item ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="tabular-nums text-muted-foreground">
                {play.shown}번째 · 남음 {play.queue.length}
              </span>
              <span className="font-semibold tabular-nums">{play.score}점</span>
              {play.combo >= 2 && (
                <span className="inline-flex items-center gap-0.5 font-semibold text-orange-600 dark:text-orange-400">
                  <Flame className="size-4" /> {play.combo}연속
                </span>
              )}
              <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
                <Timer className="size-4" /> {formatTime(now - play.startedAt)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => dispatch({ type: "quit" })}
              >
                그만
              </Button>
            </div>
            {play.item.retry > 0 && (
              <p className="text-xs text-orange-600 dark:text-orange-400">아까 틀린 표현이에요</p>
            )}
            {(() => {
              const expr = byId.get(play.question.expressionId);
              return expr ? (
                <PracticeQuestionView
                  key={`${play.shown}-${play.question.expressionId}`}
                  question={play.question}
                  expression={expr}
                  canSpeak={voice.available}
                  speak={voice.speak}
                  onAnswer={(correct) => dispatch({ type: "answer", correct })}
                  onNext={() => dispatch({ type: "next" })}
                />
              ) : null;
            })()}
          </div>
        ) : (
          <Result
            play={play}
            byId={byId}
            canSpeak={voice.available}
            speak={voice.speak}
            onRetryWrong={() => start(play.wrongIds.flatMap((id) => byId.get(id) ?? []))}
            onAgain={() => start(targetsInRange)}
            onSetup={() => dispatch({ type: "reset" })}
          />
        )}
      </CardContent>
    </Card>
  );
}

const RANGE_HINTS: Record<RangeMode, string> = {
  cumulative: "처음부터 고른 세션까지 배운 표현을 모두 냅니다.",
  single: "고른 세션의 표현만 냅니다. 오답 보기는 그 세션까지 배운 표현에서 뽑습니다.",
  span: "시작부터 끝 세션까지의 표현을 냅니다. 오답 보기는 끝 세션까지 배운 표현에서 뽑습니다.",
};

function SessionSelect({
  id,
  label,
  options,
  value,
  onChange,
}: {
  id: string;
  label: string;
  options: SessionOption[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <label htmlFor={id} className="block text-xs text-muted-foreground">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-base tabular-nums"
      >
        {options.map((o) => (
          <option key={o.session} value={o.name}>
            {o.name} · {o.count}개
          </option>
        ))}
      </select>
    </div>
  );
}

function Setup({
  options,
  range,
  onRange,
  targetCount,
  modes,
  onToggleMode,
  canSpeak,
  onStart,
}: {
  options: SessionOption[];
  range: PracticeRange | null;
  onRange: (r: PracticeRange) => void;
  targetCount: number;
  modes: PracticeMode[];
  onToggleMode: (m: PracticeMode) => void;
  canSpeak: boolean;
  onStart: () => void;
}) {
  const order = (name: string) => options.findIndex((o) => o.name === name);
  // 구간의 시작이 끝보다 뒤로 가면 둘을 바꿔 저장한다
  const setSpan = (from: string, to: string) =>
    onRange(
      order(from) <= order(to) ? { mode: "span", from, to } : { mode: "span", from: to, to: from }
    );
  const setMode = (mode: RangeMode) => {
    if (!range || mode === range.mode) return;
    if (mode === "span") setSpan(range.from ?? range.to, range.to);
    else onRange({ mode, to: range.to });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-3">
        <p className="text-sm font-medium">연습 범위</p>
        {range ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {RANGE_MODES.map((m) => (
                <Chip key={m} pressed={range.mode === m} onClick={() => setMode(m)}>
                  {RANGE_MODE_LABELS[m]}
                </Chip>
              ))}
            </div>
            {range.mode === "span" ? (
              <div className="grid grid-cols-2 gap-2">
                <SessionSelect
                  id="practice-range-from"
                  label="시작"
                  options={options}
                  value={range.from ?? range.to}
                  onChange={(name) => setSpan(name, range.to)}
                />
                <SessionSelect
                  id="practice-range-to"
                  label="끝"
                  options={options}
                  value={range.to}
                  onChange={(name) => setSpan(range.from ?? range.to, name)}
                />
              </div>
            ) : (
              <SessionSelect
                id="practice-range-to"
                label={range.mode === "single" ? "세션" : "이 세션까지"}
                options={options}
                value={range.to}
                onChange={(name) => onRange({ mode: range.mode, to: name })}
              />
            )}
            <p className="text-xs text-muted-foreground">{RANGE_HINTS[range.mode]}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">날짜별 세션이 아직 없습니다.</p>
        )}
        <p className="text-sm text-muted-foreground">
          이 범위 <b className="tabular-nums text-foreground">{targetCount}</b>개에서 냅니다.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">연습 방식(섞어서 냅니다)</p>
        <div className="flex flex-wrap gap-1.5">
          {PRACTICE_MODES.map((m) => (
            <Chip
              key={m}
              pressed={modes.includes(m) && (m !== "listen" || canSpeak)}
              disabled={m === "listen" && !canSpeak}
              onClick={() => onToggleMode(m)}
            >
              {PRACTICE_MODE_LABELS[m]}
            </Chip>
          ))}
        </div>
        {!canSpeak && (
          <p className="text-xs text-muted-foreground">
            이 기기에 프랑스어 음성이 없어 듣고 고르기는 뺍니다.
          </p>
        )}
      </div>

      <ul className="space-y-1 text-xs text-muted-foreground">
        <li>떠올리기: 한국어를 보고 소리 내어 말한 뒤 정답을 보고 스스로 채점합니다.</li>
        <li>상황 대꾸: 상대 말을 듣고 알맞은 표현을 고릅니다.</li>
        <li>빈칸: 문장에서 가린 표현을 고릅니다.</li>
        <li>순서 맞추기: 예문 토막을 눌러 문장을 만듭니다.</li>
        <li>듣고 고르기: 예문을 듣고 뜻을 고릅니다.</li>
        <li>틀린 표현은 그 판에서 다른 방식으로 최대 두 번 더 나옵니다.</li>
      </ul>

      <Button className="h-12 w-full text-base" onClick={onStart} disabled={targetCount === 0}>
        시작
      </Button>
    </div>
  );
}

function Result({
  play,
  byId,
  canSpeak,
  speak,
  onRetryWrong,
  onAgain,
  onSetup,
}: {
  play: PlayState;
  byId: Map<string, Expression>;
  canSpeak: boolean;
  speak: (t: string) => void;
  onRetryWrong: () => void;
  onAgain: () => void;
  onSetup: () => void;
}) {
  const wrong = play.wrongIds.flatMap((id) => byId.get(id) ?? []);
  const elapsed = (play.endedAt ?? Date.now()) - play.startedAt;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["점수", `${play.score}`],
          ["맞힘", `${play.correctCount} / ${play.answeredCount}`],
          ["최고 연속", `${play.bestCombo}`],
          ["걸린 시간", formatTime(elapsed)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border p-3 text-center">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-xl font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>

      {wrong.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">틀린 표현 {wrong.length}개</p>
          <ul className="rounded-xl border border-border">
            {wrong.map((e) => (
              <li key={e.id} className="space-y-1 border-t border-border p-3 first:border-t-0">
                <div className="flex items-start gap-2">
                  <p lang="fr" className="min-w-0 flex-1 break-words font-semibold">
                    {e.fr}
                  </p>
                  {canSpeak && (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => speak(`${e.fr}. ${e.example.fr}`)}
                      aria-label={`${e.id} 듣기`}
                    >
                      <Volume2 />
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{e.ko}</p>
                <p lang="fr" className="break-words text-sm italic">
                  {e.example.fr}
                </p>
                <p className="text-xs text-muted-foreground">{e.example.ko}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        play.answeredCount > 0 && (
          <p className="rounded-xl border border-green-300 bg-green-50/60 p-4 text-center font-semibold text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400">
            모두 맞혔어요!
          </p>
        )
      )}

      <div className="grid gap-2">
        {wrong.length > 0 && (
          <Button className="h-12 w-full text-base" onClick={onRetryWrong}>
            <RotateCcw /> 틀린 것만 다시
          </Button>
        )}
        <Button
          variant={wrong.length ? "outline" : "default"}
          className="h-12 w-full text-base"
          onClick={onAgain}
        >
          한 판 더
        </Button>
        <Button variant="ghost" className="w-full" onClick={onSetup}>
          <ArrowLeft /> 범위·방식 바꾸기
        </Button>
        <Button variant="ghost" className="w-full" asChild>
          <Link href="/expressions">표현 목록으로</Link>
        </Button>
      </div>
    </div>
  );
}
