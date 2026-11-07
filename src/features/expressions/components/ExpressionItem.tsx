"use client";

import { Check, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Expression } from "../lib/expressions";

interface ExpressionItemProps {
  expression: Expression;
  /** false 면 프랑스어를 가리고 「프랑스어 보기」 버튼을 보인다(떠올리기) */
  revealed: boolean;
  mastered: boolean;
  canSpeak: boolean;
  onReveal: () => void;
  onSpeak: () => void;
  onToggleMastered: () => void;
}

export default function ExpressionItem({
  expression: e,
  revealed,
  mastered,
  canSpeak,
  onReveal,
  onSpeak,
  onToggleMastered,
}: ExpressionItemProps) {
  return (
    <li className="grid grid-cols-[1fr_auto] sm:grid-cols-[3rem_1fr_auto] gap-x-3 gap-y-1 px-4 py-4 border-t border-border first:border-t-0">
      <div className="col-span-2 sm:col-span-1 text-xs text-muted-foreground tabular-nums sm:pt-1">
        {e.id}
      </div>

      <div className="min-w-0 flex flex-col gap-1">
        {revealed && (
          <div lang="fr" className="text-lg font-semibold leading-snug text-foreground">
            {e.fr}
          </div>
        )}
        <div className="text-muted-foreground">{e.ko}</div>
        {!revealed && (
          <button
            type="button"
            onClick={onReveal}
            className="self-start rounded-md border border-dashed border-primary bg-accent px-3 py-1 text-sm font-medium text-primary dark:text-blue-300"
          >
            프랑스어 보기
          </button>
        )}
        <div className="mt-1 border-l-2 border-border pl-3 text-sm">
          {revealed && (
            <div lang="fr" className="italic text-foreground">
              {e.example.fr}
            </div>
          )}
          <div className="text-xs text-muted-foreground">{e.example.ko}</div>
        </div>
        {e.review && (
          <span className="self-start rounded-md bg-red-50 px-2 py-0.5 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
            {e.review}
          </span>
        )}
        {!e.learned && (
          <span className="self-start rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Session {e.session}에서 배울 표현
          </span>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        {revealed && canSpeak && (
          <Button variant="outline" size="icon-sm" onClick={onSpeak} aria-label={`${e.id} 듣기`}>
            <Volume2 />
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleMastered}
          aria-pressed={mastered}
          className={cn(
            mastered &&
              "bg-green-50 border-green-300 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:border-green-700 dark:text-green-400"
          )}
        >
          {mastered && <Check />}
          익힘
        </Button>
      </div>
    </li>
  );
}
