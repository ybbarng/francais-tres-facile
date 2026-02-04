import { describe, expect, it } from "vitest";

// Buzz Challenge 월별 설정
const MONTHS_CONFIG = {
  janvier: { name: "Janvier", target: 31, startIndex: 0, endIndex: 31 },
  fevrier: { name: "Février", target: 28, startIndex: 31, endIndex: 59 },
  mars: { name: "Mars", target: 31, startIndex: 59, endIndex: 90 },
} as const;

// 완료된 exercice 수에 따른 월별 진행 상황 계산
function calculateMonthProgress(completed: number, monthIndex: number) {
  const months = [
    { target: 31, cumulative: 31 },
    { target: 28, cumulative: 59 },
    { target: 31, cumulative: 90 },
  ];

  const month = months[monthIndex];
  const prevCumulative = monthIndex === 0 ? 0 : months[monthIndex - 1].cumulative;
  const monthProgress = Math.max(0, Math.min(month.target, completed - prevCumulative));
  const isComplete = completed >= month.cumulative;

  return { monthProgress, isComplete };
}

// completedAt 기준 오름차순 정렬 함수
function sortByCompletedAt<T extends { progress?: { completedAt?: Date | string | null } }>(
  data: T[]
): T[] {
  return [...data].sort((a, b) => {
    const dateA = a.progress?.completedAt ? new Date(a.progress.completedAt).getTime() : 0;
    const dateB = b.progress?.completedAt ? new Date(b.progress.completedAt).getTime() : 0;
    return dateA - dateB;
  });
}

describe("Buzz Challenge 월별 설정", () => {
  it("1월은 1~31번째 (index 0~30)", () => {
    expect(MONTHS_CONFIG.janvier.startIndex).toBe(0);
    expect(MONTHS_CONFIG.janvier.endIndex).toBe(31);
    expect(MONTHS_CONFIG.janvier.target).toBe(31);
  });

  it("2월은 32~59번째 (index 31~58)", () => {
    expect(MONTHS_CONFIG.fevrier.startIndex).toBe(31);
    expect(MONTHS_CONFIG.fevrier.endIndex).toBe(59);
    expect(MONTHS_CONFIG.fevrier.target).toBe(28);
  });

  it("3월은 60~90번째 (index 59~89)", () => {
    expect(MONTHS_CONFIG.mars.startIndex).toBe(59);
    expect(MONTHS_CONFIG.mars.endIndex).toBe(90);
    expect(MONTHS_CONFIG.mars.target).toBe(31);
  });

  it("총 목표는 90개", () => {
    const total =
      MONTHS_CONFIG.janvier.target + MONTHS_CONFIG.fevrier.target + MONTHS_CONFIG.mars.target;
    expect(total).toBe(90);
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

describe("completedAt 기준 정렬", () => {
  it("오름차순으로 정렬", () => {
    const data = [
      { id: "3", progress: { completedAt: new Date("2026-01-15") } },
      { id: "1", progress: { completedAt: new Date("2026-01-01") } },
      { id: "2", progress: { completedAt: new Date("2026-01-10") } },
    ];

    const sorted = sortByCompletedAt(data);

    expect(sorted[0].id).toBe("1");
    expect(sorted[1].id).toBe("2");
    expect(sorted[2].id).toBe("3");
  });

  it("completedAt이 없는 항목은 맨 앞으로", () => {
    const data = [
      { id: "2", progress: { completedAt: new Date("2026-01-10") } },
      { id: "1", progress: { completedAt: null } },
      { id: "3", progress: { completedAt: new Date("2026-01-01") } },
    ];

    const sorted = sortByCompletedAt(data);

    expect(sorted[0].id).toBe("1"); // null은 0으로 처리되어 맨 앞
    expect(sorted[1].id).toBe("3");
    expect(sorted[2].id).toBe("2");
  });

  it("월별 슬라이스가 올바르게 동작", () => {
    // 35개의 exercice 생성 (1월 31개 + 2월 4개)
    const data = Array.from({ length: 35 }, (_, i) => ({
      id: `${i + 1}`,
      progress: { completedAt: new Date(`2026-01-${String(i + 1).padStart(2, "0")}`) },
    }));

    const sorted = sortByCompletedAt(data);

    // 1월 슬라이스 (0~31)
    const janvier = sorted.slice(MONTHS_CONFIG.janvier.startIndex, MONTHS_CONFIG.janvier.endIndex);
    expect(janvier.length).toBe(31);
    expect(janvier[0].id).toBe("1");
    expect(janvier[30].id).toBe("31");

    // 2월 슬라이스 (31~59)
    const fevrier = sorted.slice(MONTHS_CONFIG.fevrier.startIndex, MONTHS_CONFIG.fevrier.endIndex);
    expect(fevrier.length).toBe(4); // 35개 중 31개 빼면 4개
    expect(fevrier[0].id).toBe("32");
  });
});
