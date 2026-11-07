"use client";

import { MessageSquareQuote, Shuffle } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuth, getStoredPassword } from "@/lib/password";
import { cn } from "@/lib/utils";
import { useFrenchVoice } from "../hooks/use-french-voice";
import {
  EXPRESSIONS_URL,
  type ExpressionsData,
  filterExpressions,
  parseExpressions,
  shuffled,
} from "../lib/expressions";
import ExpressionItem from "./ExpressionItem";

const RECALL_KEY = "ftf-expressions-recall";

function readRecall(): boolean {
  try {
    return localStorage.getItem(RECALL_KEY) === "1";
  } catch {
    return false;
  }
}

function writeRecall(on: boolean) {
  try {
    localStorage.setItem(RECALL_KEY, on ? "1" : "0");
  } catch {
    // 저장소를 못 쓰는 브라우저에서는 이번 방문에만 기억한다
  }
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        pressed
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-foreground hover:bg-accent"
      )}
    >
      {children}
    </button>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="min-w-12 text-xs tracking-wide text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function ExpressionsBoard() {
  const [data, setData] = useState<ExpressionsData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [mastered, setMastered] = useState<Set<string>>(new Set());
  const [group, setGroup] = useState("all");
  const [recall, setRecall] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [hideMastered, setHideMastered] = useState(false);
  const [order, setOrder] = useState<string[] | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());
  const voice = useFrenchVoice();

  useEffect(() => {
    setRecall(readRecall());
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
    fetch("/api/expressions/progress")
      .then((r) => (r.ok ? r.json() : { mastered: [] }))
      .then((json: { mastered?: string[] }) => setMastered(new Set(json.mastered ?? [])))
      .catch((e) => console.error("Failed to load expression progress", e));
  }, []);

  const ordered = useMemo(() => {
    if (!data) return [];
    if (!order) return data.expressions;
    const byId = new Map(data.expressions.map((e) => [e.id, e]));
    return order.flatMap((id) => byId.get(id) ?? []);
  }, [data, order]);

  const visible = useMemo(
    () => filterExpressions(ordered, { group, reviewOnly, hideMastered }, mastered),
    [ordered, group, reviewOnly, hideMastered, mastered]
  );

  const setRecallMode = (on: boolean) => {
    setRecall(on);
    setShown(new Set());
    writeRecall(on);
  };

  const toggleMastered = useCallback(
    async (id: string) => {
      if (!getStoredPassword()) {
        toast.error("위쪽 자물쇠를 눌러 암호를 넣어야 「익힘」이 저장됩니다.");
        return;
      }
      const next = !mastered.has(id);
      const apply = (on: boolean) =>
        setMastered((prev) => {
          const s = new Set(prev);
          if (on) s.add(id);
          else s.delete(id);
          return s;
        });
      apply(next);
      try {
        const res = await fetchWithAuth("/api/expressions/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expressionId: id, learned: next }),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
      } catch (e) {
        apply(!next);
        toast.error(`「익힘」을 저장하지 못했습니다. ${e instanceof Error ? e.message : ""}`);
      }
    },
    [mastered]
  );

  const reveal = (id: string, fr: string) => {
    setShown((prev) => new Set(prev).add(id));
    if (voice.available) voice.speak(fr);
  };

  const total = data?.expressions.length ?? 0;
  const learnedInClass = data?.expressions.filter((e) => e.learned).length ?? 0;
  const reviewCount = data?.expressions.filter((e) => e.review).length ?? 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquareQuote className="h-5 w-5 text-primary" />
          <CardTitle>말하기 표현</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          ChatGPT 말하기 수업에서 배운 표현을 복습합니다. 「익힘」 표시는 서버에 저장되어 폰과
          맥에서 같이 보입니다.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loadError ? (
          <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
            표현 목록을 불러오지 못했습니다. 새로고침해 보세요.
          </div>
        ) : !data ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span>
                배운 표현 <b className="text-foreground tabular-nums">{learnedInClass}</b>
              </span>
              <span>
                앞으로 <b className="text-foreground tabular-nums">{total - learnedInClass}</b>
              </span>
              <span>
                다시 볼 것 <b className="text-foreground tabular-nums">{reviewCount}</b>
              </span>
              <span>
                익힘 <b className="text-foreground tabular-nums">{mastered.size}</b> / {total}
              </span>
            </div>

            <div className="space-y-2.5 rounded-xl border border-border bg-muted/40 p-3">
              <Row label="묶음">
                <Chip pressed={group === "all"} onClick={() => setGroup("all")}>
                  전체
                </Chip>
                {Object.entries(data.groups).map(([key, name]) => (
                  <Chip key={key} pressed={group === key} onClick={() => setGroup(key)}>
                    {key} {name}
                  </Chip>
                ))}
              </Row>
              <Row label="보기">
                <Chip pressed={!recall} onClick={() => setRecallMode(false)}>
                  한눈에
                </Chip>
                <Chip pressed={recall} onClick={() => setRecallMode(true)}>
                  떠올리기
                </Chip>
              </Row>
              <Row label="고르기">
                <Chip pressed={reviewOnly} onClick={() => setReviewOnly((v) => !v)}>
                  다시 볼 것만
                </Chip>
                <Chip pressed={hideMastered} onClick={() => setHideMastered((v) => !v)}>
                  익힘 숨기기
                </Chip>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    setOrder(shuffled(data.expressions.map((e) => e.id)));
                    setShown(new Set());
                  }}
                >
                  <Shuffle />
                  섞기
                </Button>
                {order && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => setOrder(null)}
                  >
                    순서대로
                  </Button>
                )}
              </Row>
            </div>

            {visible.length === 0 ? (
              <div className="rounded-xl border border-border py-10 text-center text-muted-foreground">
                조건에 맞는 표현이 없습니다. 고르기를 풀어 보세요.
              </div>
            ) : (
              <ul className="rounded-xl border border-border bg-card">
                {visible.map((e) => (
                  <ExpressionItem
                    key={e.id}
                    expression={e}
                    revealed={!recall || shown.has(e.id)}
                    mastered={mastered.has(e.id)}
                    canSpeak={voice.available}
                    onReveal={() => reveal(e.id, e.fr)}
                    onSpeak={() => voice.speak(`${e.fr}. ${e.example.fr}`)}
                    onToggleMastered={() => toggleMastered(e.id)}
                  />
                ))}
              </ul>
            )}

            <p className="text-xs text-muted-foreground">
              떠올리기: 한국어를 보고 프랑스어를 소리 내어 말한 뒤 눌러서 확인합니다. 🔊는 기기에
              프랑스어 음성이 있을 때만 나옵니다. 표현 원본은 study-french 저장소에 있습니다.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
