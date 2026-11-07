"use client";

import { ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { copyText, formatScore } from "../lib/client";
import { buildCorrectionRequest, countWords, wordCountState, wordRangeLabel } from "../lib/grade";
import type { DelfSet, DelfTask } from "../lib/set";

interface Props {
  set: DelfSet;
  task: DelfTask;
  number: number;
  text: string;
  onChange: (text: string) => void;
  review: boolean;
}

const COUNT_STYLE = {
  under: "text-amber-700 dark:text-amber-300",
  ok: "text-green-700 dark:text-green-400",
  over: "text-red-700 dark:text-red-400",
} as const;

const COUNT_NOTE = { under: "모자람", ok: "알맞음", over: "넘침" } as const;

export default function WritingTask({ set, task, number, text, onChange, review }: Props) {
  const words = countWords(text);
  const state = wordCountState(task, words);

  const copy = async () => {
    const ok = await copyText(buildCorrectionRequest(set, task, text));
    if (ok)
      toast.success("첨삭 요청 글을 복사했습니다. study-french 에서 Claude 에게 붙여 넣으세요.");
    else toast.error("복사하지 못했습니다. 브라우저의 클립보드 권한을 확인하세요.");
  };

  return (
    <div className="space-y-3 rounded-xl border border-border p-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
          {number}.
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="whitespace-pre-line" lang="fr">
            {task.prompt}
          </p>
          <p className="text-xs text-muted-foreground">
            {wordRangeLabel(task)} · {formatScore(task.points)}점
          </p>
        </div>
      </div>

      <Textarea
        lang="fr"
        spellCheck={false}
        value={text}
        readOnly={review}
        onChange={(e) => onChange(e.target.value)}
        placeholder="여기에 프랑스어로 씁니다."
        className="min-h-48 font-[inherit] leading-relaxed"
      />
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className={cn("tabular-nums", COUNT_STYLE[state])}>
          {words} 단어 · {COUNT_NOTE[state]}
        </span>
        <span className="text-xs text-muted-foreground">
          띄어쓰기로 나뉜 덩어리를 한 단어로 셉니다(c&apos;est 는 한 단어).
        </span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={copy}>
          <ClipboardCopy />
          첨삭 요청용 복사
        </Button>
      </div>

      <details className="rounded-lg bg-muted/50 p-2.5 text-sm" open={review}>
        <summary className="cursor-pointer select-none font-medium">
          채점 기준표 (Grille d&apos;évaluation)
        </summary>
        <table className="mt-2 w-full text-left">
          <tbody>
            {task.rubric.map((r) => (
              <tr key={r.criterion} className="border-t border-border/60">
                <td className="py-1 pr-2" lang="fr">
                  {r.criterion}
                </td>
                <td className="py-1 text-right tabular-nums">{formatScore(r.points)}점</td>
              </tr>
            ))}
            <tr className="border-t border-border font-medium">
              <td className="py-1 pr-2">합계</td>
              <td className="py-1 text-right tabular-nums">{formatScore(task.points)}점</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  );
}
