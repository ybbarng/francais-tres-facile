"use client";

import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  Circle,
  ListChecks,
  Star,
  Volume2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExerciseWithProgress } from "@/types";

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
}

const levelVariant = (level: string) => {
  switch (level) {
    case "A1":
      return "a1";
    case "A2":
      return "a2";
    case "B1":
      return "b1";
    case "B2":
      return "b2";
    default:
      return "secondary";
  }
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recommendations, setRecommendations] = useState<ExerciseWithProgress[]>([]);
  const [remainingCount, setRemainingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressRes, recommendationsRes] = await Promise.all([
          fetch("/api/progress"),
          fetch("/api/exercises/recommendations"),
        ]);

        const progressData = await progressRes.json();
        const recommendationsData = await recommendationsRes.json();

        setStats(progressData.stats);
        setRecommendations(recommendationsData.exercises);
        setRemainingCount(recommendationsData.total);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      {/* Buzz Challenge 2026 1Q */}
      {(() => {
        const completed = stats?.completed || 0;
        const months = [
          { name: "Janvier", target: 31, cumulative: 31 },
          { name: "Février", target: 28, cumulative: 59 },
          { name: "Mars", target: 31, cumulative: 90 },
        ];

        return (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Buzz Challenge de Brice – 2026 1Q</CardTitle>
              <p className="text-sm text-muted-foreground">{completed} / 90 exercices terminés</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {months.map((month, index) => {
                  const prevCumulative = index === 0 ? 0 : months[index - 1].cumulative;
                  const monthProgress = Math.max(
                    0,
                    Math.min(month.target, completed - prevCumulative)
                  );
                  const isComplete = completed >= month.cumulative;
                  const progressPercent = (monthProgress / month.target) * 100;

                  return (
                    <div
                      key={month.name}
                      className={`p-4 rounded-lg border ${
                        isComplete
                          ? "border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950"
                          : "border-border bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{month.name}</span>
                        {isComplete ? (
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="text-2xl font-bold mb-1">
                        {monthProgress} / {month.target}
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isComplete ? "bg-green-500" : "bg-primary"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Recommended Exercises (Uncompleted) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg">À faire</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Comprendre l'actualité · A2 · {remainingCount} exercices restants
            </p>
          </div>
          <Link href="/exercises" className="text-sm text-primary hover:underline">
            Voir tout →
          </Link>
        </CardHeader>
        <CardContent>
          {recommendations.length === 0 ? (
            <div className="py-8 text-center">
              <Star className="w-12 h-12 mx-auto text-amber-500 fill-amber-500 mb-3" />
              <p className="font-medium text-lg">Félicitations !</p>
              <p className="text-muted-foreground mt-1">
                Vous avez terminé tous les exercices disponibles.
              </p>
              <Link
                href="/completed"
                className="inline-block mt-4 text-primary hover:underline text-sm"
              >
                Voir vos exercices terminés →
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-border -mx-6">
              {recommendations.map((exercise) => (
                <li key={exercise.id}>
                  <Link
                    href={`/exercises/${exercise.id}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                  >
                    {/* Thumbnail */}
                    {exercise.thumbnailUrl ? (
                      <div className="w-20 h-14 rounded-md overflow-hidden bg-muted shrink-0">
                        <img
                          src={exercise.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-14 rounded-md bg-muted shrink-0 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge
                          variant={
                            levelVariant(exercise.level) as "a1" | "a2" | "b1" | "b2" | "secondary"
                          }
                        >
                          {exercise.level}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{exercise.category}</span>
                      </div>
                      <p className="font-medium truncate">{exercise.title}</p>
                      {exercise.publishedAt && (
                        <p className="text-sm text-muted-foreground">
                          {new Date(exercise.publishedAt).toLocaleDateString("fr-FR")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                      {exercise.audioUrl && <Volume2 className="w-5 h-5" />}
                      {exercise.h5pEmbedUrl && <ListChecks className="w-5 h-5" />}
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
