import { describe, expect, it } from "vitest";
import {
  type CalendarMonth,
  calendarMonths,
  dayMark,
  monthIndexOf,
  rangeLabel,
  seoulDate,
  sessionOrdinals,
  type TapState,
  tapDay,
} from "../src/features/expressions/lib/practice-calendar";
import { type SessionOption, sessionOptions } from "../src/features/expressions/lib/practice-range";
import real from "./mocks/expressions-sessions.json";

const options = sessionOptions(real.expressions);
const TODAY = { year: 2026, month: 11, day: 23 };

const opt = (session: number, name: string): SessionOption => ({ session, name, count: 3 });
const firstRow = (m: CalendarMonth) => m.cells.slice(0, 7).map((c) => c?.day ?? null);

describe("calendarMonths", () => {
  const months = calendarMonths(options, TODAY);

  it("10~12월 데이터에 오늘이 2026-11-23 이면 2026년 10·11·12월", () => {
    expect(months.map((m) => [m.year, m.month])).toEqual([
      [2026, 10],
      [2026, 11],
      [2026, 12],
    ]);
  });

  it("2026-11-01 은 일요일이라 월요일 시작 격자 첫 줄 앞에 빈칸 6개", () => {
    expect(firstRow(months[1])).toEqual([null, null, null, null, null, null, 1]);
  });

  it("칸 수는 7의 배수이고, 세션 있는 날만 option 이 있고, 오늘은 11-23 하나", () => {
    const nov = months[1];
    expect(nov.cells.length % 7).toBe(0);
    const days = nov.cells.flatMap((c) => (c ? [c] : []));
    expect(days).toHaveLength(30);
    expect(days.filter((c) => c.option).map((c) => c.day)).toHaveLength(30);
    const oct = months[0].cells.flatMap((c) => (c ? [c] : []));
    expect(oct.filter((c) => !c.option).map((c) => c.day)).toEqual([2, 3, 5, 7, 24, 31]);
    const today = months.flatMap((m) => m.cells).filter((c) => c?.isToday);
    expect(today.map((c) => c?.name)).toEqual(["11-23"]);
  });

  it("12월 다음 1월이면 연도를 하나 올린다", () => {
    const m = calendarMonths([opt(1, "12-30"), opt(2, "01-02")], {
      year: 2026,
      month: 12,
      day: 31,
    });
    expect(m.map((x) => [x.year, x.month])).toEqual([
      [2026, 12],
      [2027, 1],
    ]);
  });

  it("첫 달이 오늘 달보다 뒤면 작년으로 본다", () => {
    const m = calendarMonths([opt(1, "12-30"), opt(2, "01-02")], { year: 2027, month: 1, day: 5 });
    expect(m.map((x) => [x.year, x.month])).toEqual([
      [2026, 12],
      [2027, 1],
    ]);
    // 2026-12-01 은 화요일
    expect(firstRow(m[0])).toEqual([null, 1, 2, 3, 4, 5, 6]);
  });

  it("세션 이름이 있는 달 번호를 찾고, 없으면 마지막 달", () => {
    expect(monthIndexOf(months, "11-05")).toBe(1);
    expect(monthIndexOf(months, "09-01")).toBe(2);
  });
});

describe("seoulDate", () => {
  it("UTC 2026-11-22 15:30 은 서울로 2026-11-23", () => {
    expect(seoulDate(new Date("2026-11-22T15:30:00Z"))).toEqual(TODAY);
  });
});

describe("dayMark", () => {
  it("처음·끝은 진하게, 사이는 옅게, 밖은 칠하지 않는다", () => {
    expect(
      [20261014, 20261015, 20261020, 20261030, 20261031].map((d) => dayMark(d, 20261015, 20261030))
    ).toEqual([null, "start", "between", "end", null]);
    expect(dayMark(20261030, 20261030, 20261030)).toBe("single");
  });
});

describe("tapDay", () => {
  const ordinals = sessionOrdinals(calendarMonths(options, TODAY));
  const order = (name: string) => ordinals.get(name) ?? -1;
  const span = (from: string, to: string, picking: boolean): TapState => ({
    range: { mode: "span", from, to },
    picking,
  });

  it("누적·한 세션은 누른 날이 끝", () => {
    const state = { range: { mode: "cumulative" as const, to: "11-20" }, picking: false };
    expect(tapDay("cumulative", state, "10-30", order).range).toEqual({
      mode: "cumulative",
      to: "10-30",
    });
    expect(tapDay("single", state, "11-05", order).range).toEqual({ mode: "single", to: "11-05" });
  });

  it("구간: 첫 탭은 시작, 둘째 탭은 끝", () => {
    const first = tapDay("span", span("10-01", "11-20", false), "10-15", order);
    expect(first).toEqual(span("10-15", "10-15", true));
    expect(tapDay("span", first, "10-30", order)).toEqual(span("10-15", "10-30", false));
  });

  it("구간: 시작보다 앞을 누르면 그것이 새 시작", () => {
    expect(tapDay("span", span("10-15", "10-15", true), "10-04", order)).toEqual(
      span("10-04", "10-04", true)
    );
  });

  it("구간: 끝까지 고른 뒤 누르면 다시 새 시작", () => {
    expect(tapDay("span", span("10-15", "10-30", false), "11-02", order)).toEqual(
      span("11-02", "11-02", true)
    );
  });

  it("누적에서 구간으로 바꾼 뒤 첫 탭은 새 시작", () => {
    const state = { range: { mode: "cumulative" as const, to: "11-20" }, picking: false };
    expect(tapDay("span", state, "11-05", order)).toEqual(span("11-05", "11-05", true));
  });
});

describe("rangeLabel", () => {
  it("구간·누적은 처음 ~ 끝, 한 날이면 그날만", () => {
    expect(rangeLabel({ mode: "span", from: "10-15", to: "10-30" }, options, 45)).toBe(
      "10-15 ~ 10-30 · 45개"
    );
    expect(rangeLabel({ mode: "cumulative", to: "10-04" }, options, 9)).toBe("10-01 ~ 10-04 · 9개");
    expect(rangeLabel({ mode: "single", to: "11-05" }, options, 3)).toBe("11-05 · 3개");
  });
});
