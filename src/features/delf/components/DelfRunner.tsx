"use client";

import {
  ArrowLeft,
  ArrowRight,
  Pause,
  Play,
  RotateCcw,
  Save,
  Send,
  Timer,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuth, getStoredPassword } from "@/lib/password";
import { cn } from "@/lib/utils";
import {
  type DelfAttemptSummary,
  formatClock,
  formatScore,
  LEVEL_BADGE,
  percent,
  readStorage,
  writeStorage,
} from "../lib/client";
import {
  type DelfAnswers,
  type DelfGradeResult,
  type DelfWriting,
  gradeDelfSet,
} from "../lib/grade";
import {
  audioPath,
  DELF_AREA_LABELS,
  DELF_SET_ID_PATTERN,
  type DelfSection,
  type DelfSet,
  parseDelfSet,
} from "../lib/set";
import AudioPlayer from "./AudioPlayer";
import QuestionView from "./QuestionView";
import WritingTask from "./WritingTask";

interface Draft {
  answers: DelfAnswers;
  writing: DelfWriting;
  elapsed: number[];
}

type SaveState = "idle" | "saving" | "saved" | "error" | "no-password";

const draftKey = (setId: string) => `ftf-delf-draft:${setId}`;

/** 문항 번호를 세트 전체에서 이어 붙인다 */
function questionNumbers(set: DelfSet): Map<string, number> {
  const map = new Map<string, number>();
  let n = 0;
  for (const s of set.sections) {
    for (const d of s.documents) for (const q of d.questions) map.set(q.id, ++n);
    for (const t of s.tasks) map.set(t.id, ++n);
  }
  return map;
}

function unansweredIn(section: DelfSection, answers: DelfAnswers, writing: DelfWriting): number {
  if (section.area === "PE") return section.tasks.filter((t) => !writing[t.id]?.trim()).length;
  return section.documents.flatMap((d) => d.questions).filter((q) => !(answers[q.id]?.length > 0))
    .length;
}

function ScoreTile({
  label,
  sub,
  score,
  max,
}: {
  label: string;
  sub: string;
  score: number;
  max: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{sub}</p>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {formatScore(score)}
        <span className="text-base text-muted-foreground"> / {formatScore(max)}</span>
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">{percent({ score, max })}%</p>
    </div>
  );
}

export default function DelfRunner({ setId }: { setId: string }) {
  const [set, setSet] = useState<DelfSet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<DelfAnswers>({});
  const [writing, setWriting] = useState<DelfWriting>({});
  const [elapsed, setElapsed] = useState<number[]>([]);
  const [running, setRunning] = useState(true);
  const [playsUsed, setPlaysUsed] = useState<Record<string, number>>({});
  const [extraPlays, setExtraPlays] = useState<Record<string, number>>({});
  const [result, setResult] = useState<DelfGradeResult | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [history, setHistory] = useState<DelfAttemptSummary[]>([]);

  const submitted = result !== null;

  const loadHistory = useCallback(() => {
    fetch(`/api/delf/attempts?setId=${setId}`)
      .then((r) => (r.ok ? r.json() : { attempts: [] }))
      .then((json: { attempts?: DelfAttemptSummary[] }) => setHistory(json.attempts ?? []))
      .catch((e) => console.error("Failed to load DELF attempts", e));
  }, [setId]);

  useEffect(() => {
    if (!DELF_SET_ID_PATTERN.test(setId)) {
      setError("세트 주소가 올바르지 않습니다.");
      return;
    }
    let cancelled = false;
    fetch(`/delf/sets/${setId}.json`, { cache: "no-cache" })
      .then((r) => {
        if (r.status === 404) throw new Error("없는 세트입니다.");
        if (!r.ok) throw new Error(`세트를 불러오지 못했습니다. (HTTP ${r.status})`);
        return r.json();
      })
      .then((json) => {
        const parsed = parseDelfSet(json);
        // 정답 확인 전 세트는 목록에 없다. 주소로 들어와도 ?preview=1 이 아니면 막는다
        const preview = new URLSearchParams(window.location.search).get("preview") === "1";
        if (parsed.review.status !== "verified" && !preview) {
          throw new Error("아직 정답 확인을 마치지 않은 세트입니다.");
        }
        if (cancelled) return;
        const draft = readStorage<Draft>(draftKey(setId));
        setSet(parsed);
        setAnswers(draft?.answers ?? {});
        setWriting(draft?.writing ?? {});
        setElapsed(
          parsed.sections.map((_, i) =>
            Array.isArray(draft?.elapsed) ? (draft.elapsed[i] ?? 0) : 0
          )
        );
      })
      .catch((e: Error) => {
        console.error("Failed to load DELF set", e);
        if (!cancelled) setError(e.message || "세트를 불러오지 못했습니다.");
      });
    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [setId, loadHistory]);

  // 푸는 중인 답은 이 브라우저에 잠깐 남겨 새로고침해도 이어 푼다
  useEffect(() => {
    if (!set || submitted) return;
    writeStorage(draftKey(set.id), { answers, writing, elapsed } satisfies Draft);
  }, [set, answers, writing, elapsed, submitted]);

  // 지금 영역의 시간만 흐른다. 넘겨도 막지 않는다
  useEffect(() => {
    if (!set || submitted || !running) return;
    const timer = window.setInterval(() => {
      setElapsed((prev) => prev.map((v, i) => (i === step ? v + 1 : v)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [set, submitted, running, step]);

  const numbers = useMemo(() => (set ? questionNumbers(set) : new Map<string, number>()), [set]);

  const save = useCallback(
    async (s: DelfSet, a: DelfAnswers, w: DelfWriting) => {
      if (!getStoredPassword()) {
        setSaveState("no-password");
        toast.info("채점 결과는 아래에 있습니다. 저장하려면 위쪽 자물쇠로 암호를 넣으세요.");
        return;
      }
      setSaveState("saving");
      try {
        const res = await fetchWithAuth("/api/delf/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ setId: s.id, answers: a, writing: w }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        setSaveState("saved");
        toast.success("기록을 저장했습니다.");
        loadHistory();
      } catch (e) {
        setSaveState("error");
        toast.error(`기록을 저장하지 못했습니다. ${e instanceof Error ? e.message : ""}`);
      }
    },
    [loadHistory]
  );

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-3 py-12 text-center text-muted-foreground">
          <p>{error}</p>
          <Button asChild variant="outline" size="sm">
            <Link href="/delf">목록으로</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!set) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  const section = set.sections[step];
  const isLast = step === set.sections.length - 1;
  const totalUnanswered = set.sections.reduce((n, s) => n + unansweredIn(s, answers, writing), 0);

  const submit = () => {
    const graded = gradeDelfSet(set, answers);
    setResult(graded);
    setRunning(false);
    writeStorage(draftKey(set.id), null);
    window.scrollTo({ top: 0 });
    save(set, answers, writing);
  };

  const restart = () => {
    setResult(null);
    setAnswers({});
    setWriting({});
    setElapsed(set.sections.map(() => 0));
    setPlaysUsed({});
    setExtraPlays({});
    setStep(0);
    setRunning(true);
    setSaveState("idle");
    window.scrollTo({ top: 0 });
  };

  const goTo = (i: number) => {
    setStep(i);
    window.scrollTo({ top: 0 });
  };

  const renderSection = (s: DelfSection, review: boolean) => (
    <div className="space-y-4">
      <p className="rounded-lg bg-muted/50 p-3 text-sm" lang="fr">
        {s.instructions}
      </p>
      {s.documents.map((d) => (
        <div key={d.id} className="space-y-3">
          {d.context && (
            <p className="text-sm italic text-muted-foreground" lang="fr">
              {d.context}
            </p>
          )}
          {s.area === "CO" && d.audio && (
            <>
              <AudioPlayer
                src={audioPath(set.id, d.id)}
                plays={d.audio.plays}
                used={playsUsed[d.id] ?? 0}
                extra={extraPlays[d.id] ?? 0}
                onStart={() => setPlaysUsed((p) => ({ ...p, [d.id]: (p[d.id] ?? 0) + 1 }))}
                onAllowMore={() => setExtraPlays((p) => ({ ...p, [d.id]: (p[d.id] ?? 0) + 1 }))}
                free={review}
              />
              {/* 대본은 제출한 뒤에만 그린다 */}
              {review && (
                <div className="space-y-1.5 rounded-lg border border-border bg-card p-3 text-sm">
                  <p className="text-xs font-medium text-muted-foreground">대본 (Transcription)</p>
                  {d.audio.script.map((line, i) => (
                    <p key={i} lang="fr">
                      <b className="mr-1.5">{line.speaker} :</b>
                      {line.text}
                    </p>
                  ))}
                </div>
              )}
            </>
          )}
          {s.area === "CE" && d.text && (
            <article className="space-y-3 rounded-xl border border-border bg-card p-4" lang="fr">
              {d.title && <h3 className="font-semibold">{d.title}</h3>}
              {d.text.split(/\n\s*\n/).map((para, i) => (
                <p key={i} className="whitespace-pre-line leading-relaxed">
                  {para}
                </p>
              ))}
            </article>
          )}
          <div className="space-y-2">
            {d.questions.map((q) => (
              <QuestionView
                key={q.id}
                question={q}
                number={numbers.get(q.id) ?? 0}
                chosen={answers[q.id] ?? []}
                onChange={(ids) => setAnswers((prev) => ({ ...prev, [q.id]: ids }))}
                review={review}
              />
            ))}
          </div>
        </div>
      ))}
      {s.tasks.map((t) => (
        <WritingTask
          key={t.id}
          set={set}
          task={t}
          number={numbers.get(t.id) ?? 0}
          text={writing[t.id] ?? ""}
          onChange={(text) => setWriting((prev) => ({ ...prev, [t.id]: text }))}
          review={review}
        />
      ))}
    </div>
  );

  const remaining = section.minutes * 60 - (elapsed[step] ?? 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon-sm">
          <Link href="/delf" aria-label="목록으로">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant={LEVEL_BADGE[set.level]}>DELF {set.level}</Badge>
            <h1 className="truncate text-lg font-semibold" lang="fr">
              {set.title}
            </h1>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {set.kind === "exam" ? "실제 형식 한 회분" : "미니 세트"} · {set.id} · 실제 기출이 아닌
            연습 문제
          </p>
        </div>
      </div>

      {set.review.status !== "verified" && (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          미리보기: 아직 정답 확인을 마치지 않은 세트입니다.
        </div>
      )}

      {submitted ? (
        <>
          <Card>
            <CardContent className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-3">
                <ScoreTile
                  label={DELF_AREA_LABELS.CO.fr}
                  sub="듣기 CO"
                  score={result.areas.CO.score}
                  max={result.areas.CO.max}
                />
                <ScoreTile
                  label={DELF_AREA_LABELS.CE.fr}
                  sub="읽기 CE"
                  score={result.areas.CE.score}
                  max={result.areas.CE.max}
                />
                <ScoreTile
                  label="합계 (듣기 + 읽기)"
                  sub="쓰기 PE 는 첨삭 후"
                  score={result.total.score}
                  max={result.total.max}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {saveState === "saving" && (
                  <span className="text-muted-foreground">저장하는 중…</span>
                )}
                {saveState === "saved" && (
                  <span className="text-green-700 dark:text-green-400">기록을 저장했습니다.</span>
                )}
                {(saveState === "no-password" || saveState === "error") && (
                  <>
                    <span className="text-muted-foreground">
                      {saveState === "no-password"
                        ? "저장하려면 위쪽 자물쇠로 암호를 넣으세요."
                        : "저장하지 못했습니다."}
                    </span>
                    <Button size="sm" variant="outline" onClick={() => save(set, answers, writing)}>
                      <Save />
                      저장
                    </Button>
                  </>
                )}
                <Button size="sm" variant="ghost" className="ml-auto" onClick={restart}>
                  <RotateCcw />
                  다시 풀기
                </Button>
              </div>
            </CardContent>
          </Card>

          {set.sections.map((s) => (
            <Card key={s.area}>
              <CardContent className="space-y-3">
                <h2 className="font-semibold">
                  {DELF_AREA_LABELS[s.area].ko}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {DELF_AREA_LABELS[s.area].fr}
                  </span>
                </h2>
                {renderSection(s, true)}
              </CardContent>
            </Card>
          ))}
        </>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="영역">
            {set.sections.map((s, i) => {
              const left = unansweredIn(s, answers, writing);
              return (
                <button
                  key={s.area}
                  type="button"
                  role="tab"
                  aria-selected={step === i}
                  onClick={() => goTo(i)}
                  className={cn(
                    "rounded-lg border px-2 py-1.5 text-left text-sm transition-colors",
                    step === i
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border hover:bg-accent"
                  )}
                >
                  <span className="font-medium">
                    {i + 1}. {DELF_AREA_LABELS[s.area].ko} {s.area}
                  </span>
                  <span className="block text-xs opacity-80">
                    {s.minutes}분{left > 0 ? ` · 남은 ${left}` : " · 다 함"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="sticky top-0 z-10 flex items-center gap-3 rounded-xl border border-border bg-card/95 px-3 py-2 backdrop-blur">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" lang="fr">
              {DELF_AREA_LABELS[section.area].fr}
            </span>
            <span
              className={cn(
                "ml-auto text-lg font-semibold tabular-nums",
                remaining < 0 && "text-amber-700 dark:text-amber-300"
              )}
              title={remaining < 0 ? "권장 시간을 넘겼습니다" : "권장 시간까지 남은 시간"}
            >
              {formatClock(remaining)}
            </span>
            <span className="text-xs text-muted-foreground">/ {section.minutes}분</span>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => setRunning((v) => !v)}
              aria-label={running ? "시간 멈춤" : "시간 다시 재기"}
            >
              {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
          </div>
          {remaining < 0 && (
            <p className="-mt-2 text-xs text-amber-700 dark:text-amber-300">
              권장 시간을 넘겼습니다. 계속 풀어도 됩니다.
            </p>
          )}

          <Card>
            <CardContent>{renderSection(section, false)}</CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => goTo(step - 1)}>
                <ArrowLeft />
                이전 영역
              </Button>
            )}
            {isLast ? (
              <>
                <span className="ml-auto text-sm text-muted-foreground">
                  {totalUnanswered > 0
                    ? `답하지 않은 문항 ${totalUnanswered}개`
                    : "모두 답했습니다"}
                </span>
                <Button onClick={submit}>
                  <Send />
                  제출하고 채점
                </Button>
              </>
            ) : (
              <Button className="ml-auto" onClick={() => goTo(step + 1)}>
                다음: {DELF_AREA_LABELS[set.sections[step + 1].area].ko}
                <ArrowRight />
              </Button>
            )}
          </div>
        </>
      )}

      {history.length > 0 && (
        <Card>
          <CardContent className="space-y-2">
            <h2 className="text-sm font-semibold">지난 기록</h2>
            <ul className="space-y-1 text-sm">
              {history.slice(0, 10).map((h) => (
                <li key={h.id} className="flex justify-between gap-2 tabular-nums">
                  <span className="text-muted-foreground">
                    {new Date(h.createdAt).toLocaleString("ko-KR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  <span>
                    듣기 {formatScore(h.co.score)}/{formatScore(h.co.max)} · 읽기{" "}
                    {formatScore(h.ce.score)}/{formatScore(h.ce.max)} ·{" "}
                    <b>
                      {formatScore(h.total.score)}/{formatScore(h.total.max)}
                    </b>
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
