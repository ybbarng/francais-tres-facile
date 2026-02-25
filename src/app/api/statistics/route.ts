import { NextResponse } from "next/server";
import { exerciseDb, progressDb } from "@/lib/db";

export async function GET() {
  try {
    // 완료된 progress 가져오기
    const completedProgress = await progressDb.progress.findMany({
      where: { completed: true },
    });

    // 완료된 exercise 정보 가져오기
    const completedExerciseIds = completedProgress.map((p) => p.exerciseId);
    const completedExercises = await exerciseDb.exercise.findMany({
      where: { id: { in: completedExerciseIds } },
      include: { categories: true },
    });
    const exerciseMap = new Map(completedExercises.map((e) => [e.id, e]));

    // 모든 progress 가져오기 (오디오 재생 횟수 등)
    const allProgress = await progressDb.progress.findMany();

    // completedAt이 있는 것만 필터링
    const withDates = completedProgress.filter((p) => p.completedAt);

    // 1. 요일별 완료 횟수
    const dayOfWeekCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const p of withDates) {
      const day = new Date(p.completedAt!).getDay();
      dayOfWeekCounts[day]++;
    }
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    const byDayOfWeek = dayNames.map((name, i) => ({ day: name, count: dayOfWeekCounts[i] }));
    const mostActiveDay = byDayOfWeek.reduce((a, b) => (a.count > b.count ? a : b), byDayOfWeek[0]);

    // 2. 시간대별 완료 횟수
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;
    for (const p of withDates) {
      const hour = new Date(p.completedAt!).getHours();
      hourCounts[hour]++;
    }
    const byHour = Object.entries(hourCounts).map(([hour, count]) => ({
      hour: Number(hour),
      count,
    }));
    const mostActiveHour = byHour.reduce((a, b) => (a.count > b.count ? a : b), byHour[0]);

    // 3. 연속 학습 기록 (streak)
    const sortedDates = withDates
      .map((p) => new Date(p.completedAt!))
      .sort((a, b) => a.getTime() - b.getTime());

    const uniqueDays = new Set(
      sortedDates.map((d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
    );
    const uniqueDaysArray = Array.from(uniqueDays)
      .map((s) => {
        const [y, m, d] = s.split("-").map(Number);
        return new Date(y, m, d);
      })
      .sort((a, b) => a.getTime() - b.getTime());

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 현재 streak 계산
    if (uniqueDaysArray.length > 0) {
      const lastDay = uniqueDaysArray[uniqueDaysArray.length - 1];
      const diffFromToday = Math.floor(
        (today.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (diffFromToday <= 1) {
        currentStreak = 1;
        for (let i = uniqueDaysArray.length - 2; i >= 0; i--) {
          const diff = Math.floor(
            (uniqueDaysArray[i + 1].getTime() - uniqueDaysArray[i].getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    }

    // 최장 streak 계산
    for (let i = 1; i < uniqueDaysArray.length; i++) {
      const diff = Math.floor(
        (uniqueDaysArray[i].getTime() - uniqueDaysArray[i - 1].getTime()) / (1000 * 60 * 60 * 24)
      );
      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // 4. 월별 완료 추이 (최근 6개월)
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthlyData[key] = 0;
    }
    for (const p of withDates) {
      const d = new Date(p.completedAt!);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyData[key] !== undefined) {
        monthlyData[key]++;
      }
    }
    const monthNames = [
      "Jan",
      "Fév",
      "Mar",
      "Avr",
      "Mai",
      "Jun",
      "Jul",
      "Aoû",
      "Sep",
      "Oct",
      "Nov",
      "Déc",
    ];
    const byMonth = Object.entries(monthlyData).map(([key, count]) => {
      const [year, month] = key.split("-");
      return {
        month: `${monthNames[Number(month) - 1]} ${year.slice(2)}`,
        count,
      };
    });

    // 5. 레벨별 완료 분포
    const levelCounts: Record<string, number> = {};
    for (const p of completedProgress) {
      const exercise = exerciseMap.get(p.exerciseId);
      if (exercise) {
        levelCounts[exercise.level] = (levelCounts[exercise.level] || 0) + 1;
      }
    }
    const byLevel = Object.entries(levelCounts)
      .map(([level, count]) => ({ level, count }))
      .sort((a, b) => {
        const order = ["A1", "A2", "B1", "B2", "C1C2"];
        return order.indexOf(a.level) - order.indexOf(b.level);
      });

    // 6. 카테고리별 완료 분포
    const categoryCounts: Record<string, number> = {};
    for (const p of completedProgress) {
      const exercise = exerciseMap.get(p.exerciseId);
      if (exercise) {
        for (const c of exercise.categories) {
          categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
        }
      }
    }
    const byCategory = Object.entries(categoryCounts)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 7. 점수 통계
    const scoresWithId = completedProgress
      .filter((p) => p.score !== null && p.maxScore)
      .map((p) => ({
        exerciseId: p.exerciseId,
        score: p.score!,
        maxScore: p.maxScore!,
        percent: (p.score! / p.maxScore!) * 100,
      }));

    const lowestScoreExercise =
      scoresWithId.length > 0
        ? scoresWithId.reduce((a, b) => (a.percent < b.percent ? a : b))
        : null;

    const scoreStats = {
      count: scoresWithId.length,
      averagePercent:
        scoresWithId.length > 0
          ? scoresWithId.reduce((a, b) => a + b.percent, 0) / scoresWithId.length
          : 0,
      highestPercent: scoresWithId.length > 0 ? Math.max(...scoresWithId.map((s) => s.percent)) : 0,
      lowestPercent: scoresWithId.length > 0 ? Math.min(...scoresWithId.map((s) => s.percent)) : 0,
      lowestExerciseId: lowestScoreExercise?.exerciseId || null,
      perfectScores: scoresWithId.filter((s) => s.percent === 100).length,
    };

    // 8. 총 오디오 재생 횟수
    const totalListenCount = allProgress.reduce((sum, p) => sum + p.listenCount, 0);

    // 9. 하루에 가장 많이 수행한 횟수
    const dailyCounts: Record<string, number> = {};
    for (const p of withDates) {
      const d = new Date(p.completedAt!);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      dailyCounts[key] = (dailyCounts[key] || 0) + 1;
    }
    const mostCompletedInOneDay =
      Object.keys(dailyCounts).length > 0 ? Math.max(...Object.values(dailyCounts)) : 0;

    // 10. 점수 분포표 (1% 단위)
    const scoreDistribution: Record<number, number> = {};
    for (let i = 0; i <= 100; i++) {
      scoreDistribution[i] = 0;
    }
    for (const s of scoresWithId) {
      const percent = Math.round(s.percent);
      scoreDistribution[percent]++;
    }

    // 11. 기타 재미 통계
    const totalCompleted = completedProgress.length;
    const firstCompleted = sortedDates.length > 0 ? sortedDates[0] : null;
    const averagePerDay =
      firstCompleted && sortedDates.length > 0
        ? totalCompleted /
          Math.max(
            1,
            Math.ceil((today.getTime() - firstCompleted.getTime()) / (1000 * 60 * 60 * 24))
          )
        : 0;

    return NextResponse.json({
      totalCompleted,
      totalListenCount,
      firstCompletedAt: firstCompleted?.toISOString() || null,
      averagePerDay: Math.round(averagePerDay * 100) / 100,
      mostCompletedInOneDay,
      streak: {
        current: currentStreak,
        longest: longestStreak,
      },
      mostActiveDay,
      mostActiveHour: {
        hour: mostActiveHour.hour,
        count: mostActiveHour.count,
        label: `${mostActiveHour.hour}h - ${mostActiveHour.hour + 1}h`,
      },
      byDayOfWeek,
      byHour,
      byMonth,
      byLevel,
      byCategory,
      scoreStats,
      scoreDistribution,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    return NextResponse.json({ error: "Failed to fetch statistics" }, { status: 500 });
  }
}
