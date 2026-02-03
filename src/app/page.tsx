"use client";

import { BookOpen, ChevronRight, Headphones, Music, Star, Volume2 } from "lucide-react";
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
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={`stat-${i}`} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tableau de bord</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Total des exercices</div>
            <div className="text-3xl font-bold">{stats?.total || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Terminés</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {stats?.completed || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-900">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">En cours</div>
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
              {stats?.inProgress || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30">
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground mb-1">Taux de réussite</div>
            <div className="text-3xl font-bold text-primary">{stats?.completionRate || 0}%</div>
            <div className="mt-2 w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${stats?.completionRate || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/exercises"
          className="bg-primary text-primary-foreground rounded-xl p-6 hover:opacity-90 transition-all flex items-center gap-4 shadow-md"
        >
          <div className="p-3 bg-primary-foreground/20 rounded-lg">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <div className="text-lg font-semibold">Exercices</div>
            <div className="text-primary-foreground/80 text-sm">Voir tous les exercices</div>
          </div>
        </Link>

        <Link
          href="/playlist"
          className="bg-[oklch(0.55_0.22_25)] dark:bg-[oklch(0.50_0.18_25)] text-white rounded-xl p-6 hover:opacity-90 transition-all flex items-center gap-4 shadow-md"
        >
          <div className="p-3 bg-white/20 rounded-lg">
            <Music className="w-8 h-8" />
          </div>
          <div>
            <div className="text-lg font-semibold">Playlist</div>
            <div className="text-white/80 text-sm">Lecture audio continue</div>
          </div>
        </Link>
      </div>

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

                    <div className="flex items-center gap-2 text-muted-foreground">
                      {exercise.audioUrl && <Volume2 className="w-5 h-5" />}
                      {exercise.h5pEmbedUrl && <Headphones className="w-5 h-5" />}
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
