"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type CalendarDay,
  calendarMonths,
  dayMark,
  monthIndexOf,
  rangeEnds,
  rangeLabel,
  seoulDate,
  sessionOrdinals,
  tapDay,
} from "../lib/practice-calendar";
import type { PracticeRange, SessionOption } from "../lib/practice-range";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

/**
 * 연습 범위를 고르는 달력(항공권 예약처럼). 한 번에 한 달, 세션이 있는 날만 누를 수 있다.
 * 누적·한 세션은 누른 날이 끝, 구간은 첫 탭이 시작·둘째 탭이 끝
 */
export default function SessionCalendar({
  options,
  range,
  onRange,
  count,
}: {
  options: SessionOption[];
  range: PracticeRange;
  onRange: (r: PracticeRange) => void;
  /** 고른 범위의 표현 수 */
  count: number;
}) {
  const today = useMemo(() => seoulDate(new Date()), []);
  const months = useMemo(() => calendarMonths(options, today), [options, today]);
  const ordinals = useMemo(() => sessionOrdinals(months), [months]);
  const order = (name: string) => ordinals.get(name) ?? -1;

  // 구간에서 시작만 누르고 끝을 기다리는 중이면 그 시작 이름. 범위가 바뀌어 맞지 않으면 기다리지 않는다
  const [pickingFrom, setPickingFrom] = useState<string | null>(null);
  const picking = range.mode === "span" && range.from === pickingFrom && range.to === pickingFrom;

  // 처음에는 고른 범위의 끝이 있는 달을 보인다. 범위 끝이 바뀌면 그 달로 옮긴다
  const [view, setView] = useState(() => monthIndexOf(months, range.to));
  useEffect(() => setView(monthIndexOf(months, range.to)), [months, range.to]);

  const month = months[view];
  if (!month) return null;

  const ends = rangeEnds(range, options);
  const from = order(ends.from);
  const to = order(ends.to);

  const tap = (name: string) => {
    const next = tapDay(range.mode, { range, picking }, name, order);
    setPickingFrom(next.picking ? name : null);
    onRange(next.range);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-base font-semibold tabular-nums" aria-live="polite">
          {rangeLabel(range, options, count)}
        </p>
        {range.mode === "span" && (
          <p className="text-xs text-muted-foreground">
            {picking ? "끝 날짜를 누르세요" : "시작 날짜를 누르세요"}
          </p>
        )}
      </div>

      {/* 폰에서는 테두리·여백 없이 날짜 칸을 넓힌다(390px 에서 한 칸 40px) */}
      <div className="sm:rounded-xl sm:border sm:border-border sm:bg-card sm:p-2">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView(view - 1)}
            disabled={view === 0}
            aria-label="이전 달"
          >
            <ChevronLeft />
          </Button>
          <p className="text-sm font-medium tabular-nums">
            {month.year}년 {month.month}월
          </p>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView(view + 1)}
            disabled={view === months.length - 1}
            aria-label="다음 달"
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="grid grid-cols-7 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {month.cells.map((cell, i) =>
            cell ? (
              <DayCell
                key={cell.name}
                cell={cell}
                month={month.month}
                mark={dayMark(cell.ordinal, from, to)}
                onTap={tap}
              />
            ) : (
              <div key={`blank-${i}`} className="h-12" />
            )
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  cell,
  month,
  mark,
  onTap,
}: {
  cell: CalendarDay;
  month: number;
  mark: ReturnType<typeof dayMark>;
  onTap: (name: string) => void;
}) {
  const bold = mark === "start" || mark === "end" || mark === "single";
  return (
    <div className="relative flex h-12 items-center justify-center">
      {/* 고른 범위의 띠. 처음·끝 칸은 반쪽만 */}
      {mark && mark !== "single" && (
        <div
          aria-hidden
          className={cn(
            "absolute inset-y-1 bg-primary/15 dark:bg-primary/40",
            mark === "start"
              ? "right-0 left-1/2"
              : mark === "end"
                ? "right-1/2 left-0"
                : "inset-x-0"
          )}
        />
      )}
      {cell.option ? (
        <button
          type="button"
          onClick={() => onTap(cell.name)}
          aria-pressed={mark !== null}
          aria-current={cell.isToday ? "date" : undefined}
          aria-label={`${month}월 ${cell.day}일, 표현 ${cell.option.count}개`}
          className={cn(
            "relative flex size-10 flex-col items-center justify-center rounded-full leading-none tabular-nums transition-colors",
            bold
              ? "bg-primary text-primary-foreground"
              : "text-foreground hover:bg-accent active:bg-accent",
            cell.isToday && !bold && "ring-1 ring-primary"
          )}
        >
          <span className={cn("text-sm", (bold || cell.isToday) && "font-semibold")}>
            {cell.day}
          </span>
          <span
            className={cn(
              "mt-0.5 text-[10px]",
              bold ? "text-primary-foreground/80" : "text-muted-foreground"
            )}
          >
            {cell.option.count}
          </span>
        </button>
      ) : (
        <span
          className={cn(
            "relative flex size-10 items-center justify-center rounded-full text-sm text-muted-foreground/50 tabular-nums",
            cell.isToday && "ring-1 ring-primary/50"
          )}
        >
          {cell.day}
        </span>
      )}
    </div>
  );
}
