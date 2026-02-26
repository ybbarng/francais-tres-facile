import { describe, expect, it } from "vitest";
import { buildMonthMap, MONTHS } from "@/lib/buzz-challenge";

// 완료된 exercice 수에 따른 월별 진행 상황 계산
function calculateMonthProgress(completed: number, monthIndex: number) {
  const months = MONTHS.map((m, i) => ({
    target: m.target,
    cumulative: m.endIndex,
    prevCumulative: i === 0 ? 0 : MONTHS[i - 1].endIndex,
  }));

  const month = months[monthIndex];
  const monthProgress = Math.max(0, Math.min(month.target, completed - month.prevCumulative));
  const isComplete = completed >= month.cumulative;

  return { monthProgress, isComplete };
}

// helper: generate exercises with sequential completedAt dates
function makeExercises(count: number, startDate = "2026-01-01") {
  const start = new Date(startDate).getTime();
  return Array.from({ length: count }, (_, i) => ({
    id: `ex-${i + 1}`,
    completedAt: new Date(start + i * 86400000).toISOString(),
  }));
}

describe("MONTHS 설정", () => {
  it("1월은 1~31번째 (index 0~30)", () => {
    const jan = MONTHS[0];
    expect(jan.key).toBe("janvier");
    expect(jan.startIndex).toBe(0);
    expect(jan.endIndex).toBe(31);
    expect(jan.target).toBe(31);
  });

  it("2월은 32~59번째 (index 31~58)", () => {
    const feb = MONTHS[1];
    expect(feb.key).toBe("fevrier");
    expect(feb.startIndex).toBe(31);
    expect(feb.endIndex).toBe(59);
    expect(feb.target).toBe(28);
  });

  it("3월은 60~90번째 (index 59~89)", () => {
    const mar = MONTHS[2];
    expect(mar.key).toBe("mars");
    expect(mar.startIndex).toBe(59);
    expect(mar.endIndex).toBe(90);
    expect(mar.target).toBe(31);
  });

  it("총 목표는 90개", () => {
    const total = MONTHS.reduce((sum, m) => sum + m.target, 0);
    expect(total).toBe(90);
  });

  it("월별 범위가 연속적 (gap 없음)", () => {
    for (let i = 1; i < MONTHS.length; i++) {
      expect(MONTHS[i].startIndex).toBe(MONTHS[i - 1].endIndex);
    }
  });
});

describe("buildMonthMap", () => {
  it("빈 배열이면 빈 맵 반환", () => {
    const map = buildMonthMap([]);
    expect(map.size).toBe(0);
  });

  it("1개 exercise → janvier에 할당", () => {
    const exercises = makeExercises(1);
    const map = buildMonthMap(exercises);
    expect(map.get("ex-1")).toBe("janvier");
    expect(map.size).toBe(1);
  });

  it("31개 exercise → 모두 janvier", () => {
    const exercises = makeExercises(31);
    const map = buildMonthMap(exercises);
    for (let i = 1; i <= 31; i++) {
      expect(map.get(`ex-${i}`)).toBe("janvier");
    }
    expect(map.size).toBe(31);
  });

  it("32개 exercise → 31개 janvier + 1개 fevrier", () => {
    const exercises = makeExercises(32);
    const map = buildMonthMap(exercises);
    expect(map.get("ex-31")).toBe("janvier");
    expect(map.get("ex-32")).toBe("fevrier");
  });

  it("59개 exercise → 31 janvier + 28 fevrier", () => {
    const exercises = makeExercises(59);
    const map = buildMonthMap(exercises);
    expect(map.get("ex-1")).toBe("janvier");
    expect(map.get("ex-31")).toBe("janvier");
    expect(map.get("ex-32")).toBe("fevrier");
    expect(map.get("ex-59")).toBe("fevrier");
  });

  it("60개 exercise → janvier + fevrier + 1개 mars", () => {
    const exercises = makeExercises(60);
    const map = buildMonthMap(exercises);
    expect(map.get("ex-59")).toBe("fevrier");
    expect(map.get("ex-60")).toBe("mars");
  });

  it("90개 exercise → 전체 할당 완료", () => {
    const exercises = makeExercises(90);
    const map = buildMonthMap(exercises);
    expect(map.size).toBe(90);

    const janCount = [...map.values()].filter((v) => v === "janvier").length;
    const febCount = [...map.values()].filter((v) => v === "fevrier").length;
    const marCount = [...map.values()].filter((v) => v === "mars").length;
    expect(janCount).toBe(31);
    expect(febCount).toBe(28);
    expect(marCount).toBe(31);
  });

  it("90개 초과 exercise → 90개만 할당, 나머지는 맵에 없음", () => {
    const exercises = makeExercises(100);
    const map = buildMonthMap(exercises);
    expect(map.size).toBe(90);
    expect(map.has("ex-90")).toBe(true);
    expect(map.has("ex-91")).toBe(false);
  });

  it("completedAt 기준 오름차순 정렬 후 할당", () => {
    const exercises = [
      { id: "late", completedAt: "2026-03-01" },
      { id: "early", completedAt: "2026-01-01" },
      { id: "mid", completedAt: "2026-02-01" },
    ];
    const map = buildMonthMap(exercises);
    // early가 첫 번째 → janvier
    expect(map.get("early")).toBe("janvier");
    expect(map.get("mid")).toBe("janvier");
    expect(map.get("late")).toBe("janvier");
  });

  it("completedAt이 null이면 맨 앞으로 정렬 (0 처리)", () => {
    const exercises = [
      { id: "with-date", completedAt: "2026-01-15" },
      { id: "no-date", completedAt: null },
    ];
    const map = buildMonthMap(exercises);
    // null은 0으로 처리 → 맨 앞 → janvier
    expect(map.get("no-date")).toBe("janvier");
    expect(map.get("with-date")).toBe("janvier");
  });

  it("문자열 날짜와 Date 객체 모두 지원", () => {
    const exercises = [
      { id: "str", completedAt: "2026-01-01T00:00:00Z" },
      { id: "date", completedAt: new Date("2026-01-02") },
    ];
    const map = buildMonthMap(exercises);
    expect(map.get("str")).toBe("janvier");
    expect(map.get("date")).toBe("janvier");
  });

  it("원본 배열을 변경하지 않음", () => {
    const exercises = [
      { id: "b", completedAt: "2026-02-01" },
      { id: "a", completedAt: "2026-01-01" },
    ];
    const original = [...exercises];
    buildMonthMap(exercises);
    expect(exercises[0].id).toBe(original[0].id);
    expect(exercises[1].id).toBe(original[1].id);
  });
});

describe("월별 진행 상황 계산", () => {
  describe("1월 (Janvier)", () => {
    it("0개 완료 시 진행 0, 미완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(0, 0);
      expect(monthProgress).toBe(0);
      expect(isComplete).toBe(false);
    });

    it("15개 완료 시 진행 15, 미완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(15, 0);
      expect(monthProgress).toBe(15);
      expect(isComplete).toBe(false);
    });

    it("31개 완료 시 진행 31, 완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(31, 0);
      expect(monthProgress).toBe(31);
      expect(isComplete).toBe(true);
    });

    it("50개 완료해도 1월 진행은 31", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(50, 0);
      expect(monthProgress).toBe(31);
      expect(isComplete).toBe(true);
    });
  });

  describe("2월 (Février)", () => {
    it("30개 완료 시 2월 진행 0, 미완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(30, 1);
      expect(monthProgress).toBe(0);
      expect(isComplete).toBe(false);
    });

    it("31개 완료 시 2월 진행 0, 미완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(31, 1);
      expect(monthProgress).toBe(0);
      expect(isComplete).toBe(false);
    });

    it("45개 완료 시 2월 진행 14, 미완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(45, 1);
      expect(monthProgress).toBe(14);
      expect(isComplete).toBe(false);
    });

    it("59개 완료 시 2월 진행 28, 완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(59, 1);
      expect(monthProgress).toBe(28);
      expect(isComplete).toBe(true);
    });
  });

  describe("3월 (Mars)", () => {
    it("59개 완료 시 3월 진행 0, 미완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(59, 2);
      expect(monthProgress).toBe(0);
      expect(isComplete).toBe(false);
    });

    it("75개 완료 시 3월 진행 16, 미완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(75, 2);
      expect(monthProgress).toBe(16);
      expect(isComplete).toBe(false);
    });

    it("90개 완료 시 3월 진행 31, 완료", () => {
      const { monthProgress, isComplete } = calculateMonthProgress(90, 2);
      expect(monthProgress).toBe(31);
      expect(isComplete).toBe(true);
    });
  });
});
