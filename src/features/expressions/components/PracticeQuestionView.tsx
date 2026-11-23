"use client";

import { Check, RotateCcw, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Expression } from "../lib/expressions";
import {
  type ChoiceOption,
  isAccepted,
  PRACTICE_MODE_LABELS,
  type Question,
} from "../lib/practice";
import type { AlsoFitsExpression } from "../lib/practice-review";

interface Props {
  question: Question;
  expression: Expression;
  canSpeak: boolean;
  speak: (text: string) => void;
  /** 답이 정해지면 한 번 부른다 */
  onAnswer: (correct: boolean) => void;
  /** 다음 문제로 */
  onNext: () => void;
}

function SpeakButton({
  text,
  speak,
  label = "듣기",
}: {
  text: string;
  speak: (t: string) => void;
  label?: string;
}) {
  return (
    <Button
      variant="outline"
      size="icon-sm"
      className="shrink-0"
      onClick={() => speak(text)}
      aria-label={label}
    >
      <Volume2 />
    </Button>
  );
}

function FrLine({
  text,
  canSpeak,
  speak,
  className,
}: {
  text: string;
  canSpeak: boolean;
  speak: (t: string) => void;
  className?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <p lang="fr" className={cn("min-w-0 flex-1 break-words leading-snug", className)}>
        {text}
      </p>
      {canSpeak && <SpeakButton text={text} speak={speak} />}
    </div>
  );
}

function Choices({
  choices,
  answerId,
  accepted = [],
  picked,
  onPick,
  lang,
}: {
  choices: ChoiceOption[];
  answerId: string;
  /** 정답 말고도 맞는 것으로 치는 보기 id */
  accepted?: readonly string[];
  picked: string | null;
  onPick: (id: string) => void;
  lang?: string;
}) {
  return (
    <div className="grid gap-2">
      {choices.map((c) => {
        const isAnswer = c.id === answerId || (c.id === picked && accepted.includes(c.id));
        const isPicked = c.id === picked;
        return (
          <button
            key={c.id}
            type="button"
            lang={lang}
            disabled={picked !== null}
            onClick={() => onPick(c.id)}
            className={cn(
              "flex min-h-12 w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-base leading-snug break-words transition-colors",
              picked === null && "border-border bg-card hover:bg-accent active:bg-accent",
              picked !== null && isAnswer && "border-green-500 bg-green-50 dark:bg-green-950",
              picked !== null &&
                isPicked &&
                !isAnswer &&
                "border-red-500 bg-red-50 dark:bg-red-950",
              picked !== null && !isAnswer && !isPicked && "border-border opacity-60"
            )}
          >
            <span className="min-w-0 flex-1">{c.label}</span>
            {picked !== null && isAnswer && <Check className="size-5 shrink-0 text-green-600" />}
            {picked !== null && isPicked && !isAnswer && (
              <X className="size-5 shrink-0 text-red-600" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** 답한 뒤: 검토 기록이 "이 자리에도 자연스럽다"고 한 다른 표현 */
function AlsoFits({
  items,
  canSpeak,
  speak,
}: {
  items: AlsoFitsExpression[];
  canSpeak: boolean;
  speak: (t: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="space-y-1.5 rounded-lg border border-border bg-background/60 p-3">
      <p className="text-xs text-muted-foreground">이 상황엔 이런 표현도 자연스러워요</p>
      <ul className="space-y-1.5">
        {items.map((e) => (
          <li key={e.id}>
            <FrLine text={e.fr} canSpeak={canSpeak} speak={speak} className="text-sm font-medium" />
            <p className="text-xs text-muted-foreground">{e.ko}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** 답한 뒤: 맞았는지와 그 표현(fr·ko·예문) */
function Feedback({
  correct,
  expression: e,
  canSpeak,
  speak,
  onNext,
  children,
  after,
}: {
  correct: boolean;
  expression: Expression;
  canSpeak: boolean;
  speak: (t: string) => void;
  onNext: () => void;
  children?: React.ReactNode;
  /** 정답 설명 아래에 붙일 것 */
  after?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-3 rounded-xl border p-4",
        correct
          ? "border-green-300 bg-green-50/60 dark:border-green-800 dark:bg-green-950/40"
          : "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/40"
      )}
    >
      <p
        className={cn(
          "font-semibold",
          correct ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"
        )}
      >
        {correct ? "맞았어요!" : "아쉬워요. 뒤에서 한 번 더 나옵니다."}
      </p>
      {children}
      <div className="space-y-1 border-l-2 border-border pl-3">
        <FrLine text={e.fr} canSpeak={canSpeak} speak={speak} className="font-semibold" />
        <p className="text-sm text-muted-foreground">{e.ko}</p>
        <FrLine text={e.example.fr} canSpeak={canSpeak} speak={speak} className="text-sm italic" />
        <p className="text-xs text-muted-foreground">{e.example.ko}</p>
      </div>
      {after}
      <Button className="h-11 w-full text-base" onClick={onNext} autoFocus>
        다음
      </Button>
    </div>
  );
}

export default function PracticeQuestionView({
  question: q,
  expression,
  canSpeak,
  speak,
  onAnswer,
  onNext,
}: Props) {
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);

  // 문제가 뜰 때 들려줄 문장(상황 대꾸는 상대 말, 듣고 고르기는 예문)
  const autoSpeak = q.mode === "context" ? q.cue : q.mode === "listen" ? q.sentence : null;
  useEffect(() => {
    if (autoSpeak && canSpeak) speak(autoSpeak);
  }, [autoSpeak, canSpeak, speak]);

  const settle = (correct: boolean) => {
    if (result !== null) return;
    setResult(correct);
    onAnswer(correct);
  };

  const pick = (id: string) => {
    if (picked !== null) return;
    setPicked(id);
    settle(isAccepted(q, id));
  };

  // 정답 대신 "이것도 맞는" 표현을 골랐을 때
  const pickedAlso = picked !== null && picked !== q.expressionId && isAccepted(q, picked);
  const alsoNote = pickedAlso && (
    <p className="text-sm">이것도 자연스러워요. 수업에서는 아래 표현을 썼어요.</p>
  );

  const feedback = (extra?: React.ReactNode, after?: React.ReactNode) =>
    result !== null && (
      <Feedback
        correct={result}
        expression={expression}
        canSpeak={canSpeak}
        speak={speak}
        onNext={onNext}
        after={after}
      >
        {extra}
      </Feedback>
    );

  const title = (
    <p className="text-xs font-medium tracking-wide text-primary dark:text-blue-300">
      {PRACTICE_MODE_LABELS[q.mode]}
    </p>
  );

  switch (q.mode) {
    case "recall":
      return (
        <div className="space-y-4">
          {title}
          <p className="text-sm text-muted-foreground">
            {q.byExample ? "이 문장을 프랑스어로 말해 보세요" : "이 표현을 프랑스어로 말해 보세요"}
          </p>
          <p className="break-words text-xl font-semibold leading-snug">{q.prompt}</p>
          {!revealed ? (
            <Button
              variant="outline"
              className="h-12 w-full border-dashed border-primary text-base"
              onClick={() => {
                setRevealed(true);
                if (canSpeak) speak(q.answer);
              }}
            >
              말했으면 정답 보기
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <FrLine
                  text={q.answer}
                  canSpeak={canSpeak}
                  speak={speak}
                  className="text-lg font-semibold"
                />
              </div>
              <p className="text-sm text-muted-foreground">스스로 채점해 주세요</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="h-12 border-red-300 text-base text-red-700 dark:text-red-400"
                  onClick={() => {
                    settle(false);
                    onNext();
                  }}
                >
                  <X /> 틀림
                </Button>
                <Button
                  className="h-12 bg-green-600 text-base text-white hover:bg-green-700"
                  onClick={() => {
                    settle(true);
                    onNext();
                  }}
                >
                  <Check /> 맞음
                </Button>
              </div>
            </div>
          )}
        </div>
      );

    case "context":
      return (
        <div className="space-y-4">
          {title}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <FrLine text={q.cue} canSpeak={canSpeak} speak={speak} className="text-lg" />
            <p className="mt-1 text-sm text-muted-foreground">{q.cueKo}</p>
          </div>
          <p className="text-sm text-muted-foreground">어떤 표현으로 대꾸할까요?</p>
          <Choices
            choices={q.choices}
            answerId={q.expressionId}
            accepted={q.accepted}
            picked={picked}
            onPick={pick}
            lang="fr"
          />
          {feedback(
            <>
              {alsoNote}
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">이렇게 대꾸해요</p>
                <FrLine text={q.reply} canSpeak={canSpeak} speak={speak} />
                <p className="text-sm text-muted-foreground">{q.replyKo}</p>
              </div>
            </>,
            <AlsoFits items={q.alsoFits} canSpeak={canSpeak} speak={speak} />
          )}
        </div>
      );

    case "blank": {
      const before = q.sentence.slice(0, q.spot.start);
      const after = q.sentence.slice(q.spot.end);
      return (
        <div className="space-y-4">
          {title}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p lang="fr" className="break-words text-lg leading-relaxed">
              {before}
              {result === null ? (
                <span className="mx-0.5 inline-block min-w-16 border-b-2 border-primary align-baseline">
                  &nbsp;
                </span>
              ) : (
                <mark className="rounded bg-yellow-200 px-0.5 text-foreground dark:bg-yellow-800">
                  {q.spot.text}
                </mark>
              )}
              {after}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{q.sentenceKo}</p>
          </div>
          <p className="text-sm text-muted-foreground">빈칸에 들어갈 말은?</p>
          <Choices
            choices={q.choices}
            answerId={q.expressionId}
            accepted={q.accepted}
            picked={picked}
            onPick={pick}
            lang="fr"
          />
          {feedback(
            <>
              {alsoNote}
              {canSpeak && (
                <FrLine text={q.sentence} canSpeak={canSpeak} speak={speak} className="text-sm" />
              )}
            </>
          )}
        </div>
      );
    }

    case "order": {
      const target = q.tokens.join(" ");
      const place = (poolIndex: number) => {
        if (result !== null || placed.includes(poolIndex)) return;
        const next = [...placed, poolIndex];
        setPlaced(next);
        if (next.length === q.tokens.length) {
          settle(next.map((p) => q.tokens[q.order[p]]).join(" ") === target);
        }
      };
      return (
        <div className="space-y-4">
          {title}
          <p className="text-sm text-muted-foreground">토막을 눌러 프랑스어 문장을 만드세요</p>
          <p className="break-words text-lg font-semibold leading-snug">{q.ko}</p>
          <div
            lang="fr"
            className={cn(
              "flex min-h-14 flex-wrap gap-1.5 rounded-xl border-2 border-dashed p-2",
              result === null && "border-border",
              result === true && "border-green-500",
              result === false && "border-red-500"
            )}
          >
            {placed.map((p) => (
              <button
                key={p}
                type="button"
                disabled={result !== null}
                onClick={() => setPlaced(placed.filter((x) => x !== p))}
                className="max-w-full break-words rounded-lg border border-primary bg-accent px-3 py-2 text-base"
              >
                {q.tokens[q.order[p]]}
              </button>
            ))}
          </div>
          <div lang="fr" className="flex flex-wrap gap-1.5">
            {q.order.map((tokenIndex, poolIndex) => (
              <button
                key={tokenIndex}
                type="button"
                disabled={result !== null || placed.includes(poolIndex)}
                onClick={() => place(poolIndex)}
                className={cn(
                  "max-w-full break-words rounded-lg border border-border bg-card px-3 py-2 text-base",
                  placed.includes(poolIndex) && "invisible"
                )}
              >
                {q.tokens[tokenIndex]}
              </button>
            ))}
          </div>
          {result === null && placed.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setPlaced([])}>
              <RotateCcw /> 다시 놓기
            </Button>
          )}
          {feedback(
            result === false ? (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">맞는 순서</p>
                <FrLine text={target} canSpeak={canSpeak} speak={speak} />
              </div>
            ) : undefined
          )}
        </div>
      );
    }

    case "listen":
      return (
        <div className="space-y-4">
          {title}
          <p className="text-sm text-muted-foreground">듣고 뜻을 고르세요</p>
          <Button
            variant="outline"
            className="h-14 w-full text-base"
            onClick={() => speak(q.sentence)}
          >
            <Volume2 className="size-5" /> 다시 듣기
          </Button>
          <Choices choices={q.choices} answerId={q.expressionId} picked={picked} onPick={pick} />
          {feedback(<FrLine text={q.sentence} canSpeak={canSpeak} speak={speak} />)}
        </div>
      );
  }
}
