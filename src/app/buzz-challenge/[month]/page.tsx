"use client";

import { Calendar, Check, ChevronLeft, Star } from "lucide-react";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuth } from "@/lib/password";
import type { ExerciseWithProgress } from "@/types";

const MONTHS_CONFIG = {
  janvier: {
    name: "Janvier",
    target: 31,
    startIndex: 0,
    endIndex: 31,
    colors: {
      accent: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
    },
  },
  fevrier: {
    name: "Février",
    target: 28,
    startIndex: 31,
    endIndex: 59,
    colors: {
      accent: "text-rose-600 dark:text-rose-400",
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800",
    },
  },
  mars: {
    name: "Mars",
    target: 31,
    startIndex: 59,
    endIndex: 90,
    colors: {
      accent: "text-emerald-600 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
    },
  },
} as const;

type MonthKey = keyof typeof MONTHS_CONFIG;

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

export default function BuzzChallengePage() {
  const params = useParams();
  const month = params.month as string;

  const [exercises, setExercises] = useState<ExerciseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState("");

  const config = MONTHS_CONFIG[month as MonthKey];

  useEffect(() => {
    if (!config) return;

    const fetchCompleted = async () => {
      try {
        const res = await fetch("/api/exercises/completed");
        if (res.ok) {
          const data: ExerciseWithProgress[] = await res.json();
          // completedAt 기준 오름차순 정렬 후 해당 월 범위만 슬라이스
          const sorted = [...data].sort((a, b) => {
            const dateA = a.progress?.completedAt ? new Date(a.progress.completedAt).getTime() : 0;
            const dateB = b.progress?.completedAt ? new Date(b.progress.completedAt).getTime() : 0;
            return dateA - dateB;
          });
          const sliced = sorted.slice(config.startIndex, config.endIndex);
          setExercises(sliced);
        }
      } catch (error) {
        console.error("Failed to fetch completed exercises:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompleted();
  }, [config]);

  const handleDateClick = useCallback((exerciseId: string, currentDate: string | null) => {
    setEditingId(exerciseId);
    if (currentDate) {
      const date = new Date(currentDate);
      const localDatetime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditingDate(localDatetime);
    } else {
      const now = new Date();
      const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setEditingDate(localDatetime);
    }
  }, []);

  const handleDateSave = useCallback(
    async (exerciseId: string) => {
      try {
        const res = await fetchWithAuth(`/api/progress/${exerciseId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completedAt: new Date(editingDate).toISOString() }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Erreur lors de la mise à jour.");
          return;
        }

        setExercises((prev) =>
          prev.map((ex) =>
            ex.id === exerciseId
              ? { ...ex, progress: { ...ex.progress!, completedAt: new Date(editingDate) } }
              : ex
          )
        );
        setEditingId(null);
        toast.success("Date mise à jour.");
      } catch (error) {
        console.error("Failed to update date:", error);
        toast.error("Erreur lors de la mise à jour.");
      }
    },
    [editingDate]
  );

  if (!config) {
    notFound();
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Retour au tableau de bord
        </Link>
        <h1 className={`text-2xl font-bold ${config.colors.accent}`}>
          Buzz Challenge – {config.name}
        </h1>
        <p className="text-muted-foreground mt-2">
          {exercises.length} / {config.target} exercice{exercises.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card className={`${config.colors.border}`}>
        <CardContent className="p-0">
          {exercises.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                Aucun exercice terminé pour {config.name.toLowerCase()}.
              </p>
              <Button asChild>
                <Link href="/exercises">Commencer les exercices</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {exercises.map((exercise, index) => (
                <li
                  key={exercise.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                >
                  {/* Index */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${config.colors.bg} ${config.colors.accent}`}
                  >
                    {index + 1}
                  </div>

                  {/* Thumbnail */}
                  <Link href={`/exercises/${exercise.id}`} className="shrink-0">
                    {exercise.thumbnailUrl ? (
                      <div className="w-20 h-14 rounded-md overflow-hidden bg-muted">
                        <img
                          src={exercise.thumbnailUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-14 rounded-md bg-muted flex items-center justify-center">
                        <Star className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                  </Link>

                  {/* Content */}
                  <Link href={`/exercises/${exercise.id}`} className="flex-1 min-w-0 group">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={
                          levelVariant(exercise.level) as "a1" | "a2" | "b1" | "b2" | "secondary"
                        }
                      >
                        {exercise.level}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{exercise.category}</span>
                      {exercise.progress?.score !== null && exercise.progress?.maxScore && (
                        <span className="text-sm font-semibold text-primary">
                          {exercise.progress.score}/{exercise.progress.maxScore}
                        </span>
                      )}
                    </div>
                    <p className="font-medium truncate group-hover:text-primary transition-colors">
                      {exercise.title}
                    </p>
                  </Link>

                  {/* Date - Editable */}
                  <div className="shrink-0 text-right">
                    {editingId === exercise.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="datetime-local"
                          value={editingDate}
                          onChange={(e) => setEditingDate(e.target.value)}
                          className="w-auto text-sm h-8"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDateSave(exercise.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          handleDateClick(
                            exercise.id,
                            exercise.progress?.completedAt?.toString() || null
                          )
                        }
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Calendar className="h-4 w-4" />
                        <span>
                          {exercise.progress?.completedAt
                            ? new Date(exercise.progress.completedAt).toLocaleDateString("fr-FR", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })
                            : "Définir"}
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
