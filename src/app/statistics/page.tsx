"use client";

import {
  BarChart3,
  Calendar,
  Clock,
  Flame,
  Headphones,
  Medal,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Statistics {
  totalCompleted: number;
  totalListenCount: number;
  firstCompletedAt: string | null;
  averagePerDay: number;
  mostCompletedInOneDay: number;
  streak: {
    current: number;
    longest: number;
  };
  mostActiveDay: {
    day: string;
    count: number;
  };
  mostActiveHour: {
    hour: number;
    count: number;
    label: string;
  };
  byDayOfWeek: Array<{ day: string; count: number }>;
  byHour: Array<{ hour: number; count: number }>;
  byMonth: Array<{ month: string; count: number }>;
  byLevel: Array<{ level: string; count: number }>;
  byCategory: Array<{ category: string; count: number }>;
  scoreStats: {
    count: number;
    averagePercent: number;
    highestPercent: number;
    lowestPercent: number;
    lowestExerciseId: string | null;
    perfectScores: number;
  };
  scoreDistribution: Record<number, number>;
}

// 간단한 막대 차트 컴포넌트
function BarChart({
  data,
  labelKey,
  valueKey,
  color = "bg-primary",
  maxHeight = 120,
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  color?: string;
  maxHeight?: number;
}) {
  const maxValue = Math.max(...data.map((d) => d[valueKey] as number), 1);

  return (
    <div className="flex items-end gap-1 h-full">
      {data.map((item, i) => {
        const value = item[valueKey] as number;
        const height = (value / maxValue) * maxHeight;
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-xs text-muted-foreground">{value > 0 ? value : ""}</span>
            <div
              className={`w-full rounded-t ${color} transition-all`}
              style={{ height: `${Math.max(height, value > 0 ? 4 : 0)}px` }}
            />
            <span className="text-xs text-muted-foreground truncate w-full text-center">
              {String(item[labelKey]).slice(0, 3)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

// 수평 막대 차트
function HorizontalBarChart({
  data,
  labelKey,
  valueKey,
  color = "bg-primary",
}: {
  data: Array<Record<string, unknown>>;
  labelKey: string;
  valueKey: string;
  color?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d[valueKey] as number), 1);

  return (
    <div className="space-y-2">
      {data.map((item, i) => {
        const value = item[valueKey] as number;
        const width = (value / maxValue) * 100;
        return (
          <div key={i} className="flex items-center gap-2">
            <span className="text-sm w-24 truncate">{String(item[labelKey])}</span>
            <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all`}
                style={{ width: `${width}%` }}
              />
            </div>
            <span className="text-sm text-muted-foreground w-8 text-right">{value}</span>
          </div>
        );
      })}
    </div>
  );
}

// 시간대 히트맵
function HourHeatmap({ data }: { data: Array<{ hour: number; count: number }> }) {
  const maxValue = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="grid grid-cols-12 gap-1">
      {data.map((item) => {
        const intensity = item.count / maxValue;
        return (
          <div
            key={item.hour}
            className="aspect-square rounded flex items-center justify-center text-xs"
            style={{
              backgroundColor: `rgba(59, 130, 246, ${Math.max(intensity * 0.8, 0.1)})`,
              color: intensity > 0.5 ? "white" : "inherit",
            }}
            title={`${item.hour}h: ${item.count}`}
          >
            {item.hour}
          </div>
        );
      })}
    </div>
  );
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/statistics");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch statistics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`stat-${i}`} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`chart-${i}`} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Impossible de charger les statistiques.</p>
      </div>
    );
  }

  const levelColors: Record<string, string> = {
    A1: "bg-green-500",
    A2: "bg-blue-500",
    B1: "bg-amber-500",
    B2: "bg-orange-500",
    C1C2: "bg-red-500",
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Statistiques</h1>
        <p className="text-muted-foreground mt-1">
          Vos performances d'apprentissage en un coup d'œil
        </p>
      </div>

      {/* 주요 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                <p className="text-xs text-muted-foreground">Exercices terminés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.streak.current}</p>
                <p className="text-xs text-muted-foreground">Jours consécutifs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Headphones className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalListenCount}</p>
                <p className="text-xs text-muted-foreground">Écoutes audio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{Math.round(stats.scoreStats.averagePercent)}%</p>
                <p className="text-xs text-muted-foreground">Score moyen</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Streak 및 활동 시간 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Série d'apprentissage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.streak.current}
                </p>
                <p className="text-xs text-muted-foreground">Série actuelle</p>
              </div>
              <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {stats.streak.longest}
                </p>
                <p className="text-xs text-muted-foreground">Record jours</p>
              </div>
              <div className="text-center p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                  {stats.mostCompletedInOneDay}
                </p>
                <p className="text-xs text-muted-foreground">Max/jour</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>
                Moyenne: <span className="font-medium">{stats.averagePerDay}</span> exercice(s) par
                jour
              </p>
              {stats.firstCompletedAt && (
                <p>
                  Premier exercice:{" "}
                  <span className="font-medium">
                    {new Date(stats.firstCompletedAt).toLocaleDateString("fr-FR", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Medal className="w-4 h-4 text-yellow-500" />
              Performances
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Score moyen</span>
                <span className="font-medium">{Math.round(stats.scoreStats.averagePercent)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Meilleur score</span>
                <span className="font-medium text-green-600 dark:text-green-400">
                  {Math.round(stats.scoreStats.highestPercent)}%
                </span>
              </div>
              {stats.scoreStats.lowestExerciseId ? (
                <Link
                  href={`/exercises/${stats.scoreStats.lowestExerciseId}`}
                  className="flex justify-between items-center hover:bg-muted/50 -mx-2 px-2 py-1 rounded transition-colors"
                >
                  <span className="text-sm">Score le plus bas</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {Math.round(stats.scoreStats.lowestPercent)}%
                  </span>
                </Link>
              ) : (
                <div className="flex justify-between items-center">
                  <span className="text-sm">Score le plus bas</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    {Math.round(stats.scoreStats.lowestPercent)}%
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm">Scores parfaits (100%)</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  {stats.scoreStats.perfectScores}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Exercices avec score</span>
                <span className="font-medium">{stats.scoreStats.count}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 시간대 분석 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Jour le plus actif
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-lg font-bold text-primary">{stats.mostActiveDay.day}</p>
              <p className="text-sm text-muted-foreground">
                {stats.mostActiveDay.count} exercice(s)
              </p>
            </div>
            <div className="h-32">
              <BarChart
                data={stats.byDayOfWeek}
                labelKey="day"
                valueKey="count"
                color="bg-primary"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Heure préférée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-primary/10 rounded-lg text-center">
              <p className="text-lg font-bold text-primary">{stats.mostActiveHour.label}</p>
              <p className="text-sm text-muted-foreground">
                {stats.mostActiveHour.count} exercice(s)
              </p>
            </div>
            <HourHeatmap data={stats.byHour} />
          </CardContent>
        </Card>
      </div>

      {/* 월별 추이 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Progression mensuelle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40">
            <BarChart
              data={stats.byMonth}
              labelKey="month"
              valueKey="count"
              color="bg-emerald-500"
              maxHeight={140}
            />
          </div>
        </CardContent>
      </Card>

      {/* 점수 분포표 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Distribution des scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const data = Object.entries(stats.scoreDistribution).map(([percent, count]) => ({
              percent: Number(percent),
              count,
            }));
            const maxCount = Math.max(...data.map((d) => d.count), 1);
            return (
              <div>
                <div className="flex items-end h-32 gap-px">
                  {data.map((item) => (
                    <div
                      key={item.percent}
                      className="flex-1 bg-violet-500 rounded-t-sm transition-all hover:bg-violet-400"
                      style={{
                        height: `${(item.count / maxCount) * 100}%`,
                        minHeight: item.count > 0 ? "2px" : "0",
                      }}
                      title={`${item.percent}%: ${item.count}`}
                    />
                  ))}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
                    <span key={v}>{v}</span>
                  ))}
                </div>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      {/* 레벨 및 카테고리 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Par niveau
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.byLevel.map((item) => {
                const total = stats.byLevel.reduce((a, b) => a + b.count, 0);
                const percent = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <div key={item.level} className="flex items-center gap-2">
                    <span className="text-sm font-medium w-12">{item.level}</span>
                    <div className="flex-1 bg-muted rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full ${levelColors[item.level] || "bg-gray-500"} rounded-full transition-all`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Par catégorie
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart
              data={stats.byCategory}
              labelKey="category"
              valueKey="count"
              color="bg-violet-500"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
