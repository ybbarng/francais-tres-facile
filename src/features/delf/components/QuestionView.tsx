"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatScore } from "../lib/client";
import { isCorrect } from "../lib/grade";
import type { DelfQuestion } from "../lib/set";

interface Props {
  question: DelfQuestion;
  number: number;
  chosen: string[];
  onChange: (ids: string[]) => void;
  /** 제출 뒤: 고칠 수 없고 정답·해설을 보인다 */
  review: boolean;
}

const TYPE_HINT: Record<DelfQuestion["type"], string> = {
  choice: "하나를 고르세요",
  multi: "맞는 것을 모두 고르세요",
  truefalse: "참/거짓을 고르세요",
};

function optionLabel(q: DelfQuestion, ids: string[]): string {
  if (ids.length === 0) return "고르지 않음";
  return ids
    .map((id) => {
      const o = q.options.find((x) => x.id === id);
      return q.type === "truefalse" ? (o?.text ?? id) : `${id}) ${o?.text ?? ""}`;
    })
    .join(", ");
}

export default function QuestionView({ question: q, number, chosen, onChange, review }: Props) {
  const correct = review && isCorrect(q, chosen);
  const multi = q.type === "multi";

  const toggle = (id: string) => {
    if (review) return;
    if (multi) onChange(chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id]);
    else onChange(chosen[0] === id ? [] : [id]);
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border p-3",
        !review && "border-border",
        review &&
          correct &&
          "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-950/40",
        review && !correct && "border-red-300 bg-red-50/50 dark:border-red-800 dark:bg-red-950/40"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
          {number}.
        </span>
        <div className="min-w-0 flex-1">
          <p lang="fr">{q.prompt}</p>
          <p className="text-xs text-muted-foreground">
            {TYPE_HINT[q.type]} · {formatScore(q.points)}점
          </p>
        </div>
        {review && (
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 text-sm font-medium",
              correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
            )}
          >
            {correct ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            {correct ? formatScore(q.points) : 0}점
          </span>
        )}
      </div>

      <div className={cn("grid gap-1.5", q.type === "truefalse" && "grid-cols-2 sm:grid-cols-3")}>
        {q.options.map((o) => {
          const picked = chosen.includes(o.id);
          const isAnswer = q.answer.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              aria-pressed={picked}
              disabled={review}
              onClick={() => toggle(o.id)}
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                !review && picked && "border-primary bg-primary/10",
                !review && !picked && "border-border hover:bg-accent",
                review && isAnswer && "border-green-500 bg-green-100 dark:bg-green-900/50",
                review && picked && !isAnswer && "border-red-500 bg-red-100 dark:bg-red-900/50",
                review && !picked && !isAnswer && "border-border opacity-70"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border text-[10px]",
                  multi ? "rounded" : "rounded-full",
                  picked ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {picked && <Check className="h-3 w-3" />}
              </span>
              <span lang="fr">
                {q.type !== "truefalse" && <b className="mr-1">{o.id})</b>}
                {o.text}
              </span>
            </button>
          );
        })}
      </div>

      {review && (
        <div className="space-y-1 rounded-lg bg-muted/60 p-2.5 text-sm">
          <p>
            <span className="text-muted-foreground">내 답</span>{" "}
            <span lang="fr">{optionLabel(q, chosen)}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-muted-foreground">정답</span>{" "}
            <b lang="fr">{optionLabel(q, q.answer)}</b>
          </p>
          <p className="text-muted-foreground">{q.explanation}</p>
        </div>
      )}
    </div>
  );
}
