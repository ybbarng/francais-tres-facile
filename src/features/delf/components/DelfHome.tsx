"use client";

import { ClipboardCheck, Clock, GraduationCap, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  type DelfBestMap,
  formatScore,
  LEVEL_BADGE,
  percent,
  readStorage,
  writeStorage,
} from "../lib/client";
import {
  DELF_AREA_LABELS,
  DELF_LEVELS,
  type DelfIndexEntry,
  type DelfKind,
  type DelfLevel,
  parseDelfIndex,
} from "../lib/set";

const LEVEL_KEY = "ftf-delf-level";

const KIND_LABELS: Record<DelfKind, { title: string; note: string }> = {
  mini: { title: "미니 세트", note: "15분 안팎 · 듣기·읽기 문서 1~2개 + 짧은 쓰기" },
  exam: { title: "실제 형식 한 회분", note: "시험과 같은 영역별 시간 · 영역마다 25점" },
};

function SetCard({ entry, best }: { entry: DelfIndexEntry; best?: DelfBestMap[string] }) {
  const minutes = entry.areas.reduce((n, a) => n + a.minutes, 0);
  return (
    <Link
      href={`/delf/${entry.id}`}
      className="block rounded-xl border border-border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium" lang="fr">
            {entry.title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {entry.id} · <Clock className="inline h-3 w-3 align-[-2px]" /> {minutes}분
          </p>
        </div>
        {best ? (
          <div className="shrink-0 text-right">
            <p className="text-sm font-semibold tabular-nums">
              {formatScore(best.total.score)} / {formatScore(best.total.max)}
            </p>
            <p className="text-xs text-muted-foreground">
              최고 {percent(best.total)}% · {best.count}회
            </p>
          </div>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">안 풂</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {entry.areas.map((a) => (
          <span
            key={a.area}
            className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            title={DELF_AREA_LABELS[a.area].fr}
          >
            {DELF_AREA_LABELS[a.area].ko} {a.minutes}분 · {formatScore(a.max)}점
          </span>
        ))}
      </div>
    </Link>
  );
}

export default function DelfHome() {
  const [sets, setSets] = useState<DelfIndexEntry[] | null>(null);
  const [best, setBest] = useState<DelfBestMap>({});
  const [level, setLevel] = useState<DelfLevel>("A1");

  useEffect(() => {
    const saved = readStorage<DelfLevel>(LEVEL_KEY);
    if (saved && DELF_LEVELS.includes(saved)) setLevel(saved);
    fetch("/delf/sets/index.json", { cache: "no-cache" })
      .then((r) => {
        // 아직 세트가 하나도 없으면 index.json 이 없다
        if (r.status === 404) return { schema: "ftf/delf-index@1", sets: [] };
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => setSets(parseDelfIndex(json).sets.filter((s) => s.status === "verified")))
      .catch((e) => {
        console.error("Failed to load DELF index", e);
        setSets([]);
      });
    fetch("/api/delf/attempts")
      .then((r) => (r.ok ? r.json() : { best: {} }))
      .then((json: { best?: DelfBestMap }) => setBest(json.best ?? {}))
      .catch((e) => console.error("Failed to load DELF attempts", e));
  }, []);

  const chooseLevel = (l: DelfLevel) => {
    setLevel(l);
    writeStorage(LEVEL_KEY, l);
  };

  const counts = useMemo(() => {
    const c: Record<DelfLevel, number> = { A1: 0, A2: 0, B1: 0, B2: 0 };
    for (const s of sets ?? []) c[s.level]++;
    return c;
  }, [sets]);

  const visible = (sets ?? []).filter((s) => s.level === level);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <CardTitle>DELF 모의고사</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            RFI 연습과 달리 <b className="text-foreground">시험 형식 연습</b>입니다. 영역마다 권장
            시간을 재며 듣기(CO) → 읽기(CE) → 쓰기(PE) 순서로 풉니다. 듣기·읽기는 바로 채점하고,
            쓰기는 첨삭 요청용 글로 복사해 study-french 에서 Claude 에게 첨삭받습니다.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <b>실제 기출이 아닙니다.</b> DELF 형식과 난이도에 맞춰 새로 만든 연습 문제입니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="수준">
        {DELF_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="tab"
            aria-selected={level === l}
            onClick={() => chooseLevel(l)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              level === l
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-accent"
            )}
          >
            {l}
            {sets && <span className="text-xs opacity-70 tabular-nums">{counts[l]}</span>}
          </button>
        ))}
      </div>

      {!sets ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {level} 세트가 아직 없습니다. 정답 확인을 마친 세트만 보입니다.
          </CardContent>
        </Card>
      ) : (
        (["mini", "exam"] as const).map((kind) => {
          const list = visible.filter((s) => s.kind === kind);
          if (list.length === 0) return null;
          return (
            <section key={kind} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <Badge variant={LEVEL_BADGE[level]}>{level}</Badge>
                <h2 className="font-semibold">{KIND_LABELS[kind].title}</h2>
                <span className="text-xs text-muted-foreground">{KIND_LABELS[kind].note}</span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {list.map((s) => (
                  <SetCard key={s.id} entry={s} best={best[s.id]} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5" />
        점수는 듣기·읽기 합계입니다. 기록 저장은 위쪽 자물쇠로 암호를 넣었을 때만 됩니다.
      </p>
    </div>
  );
}
