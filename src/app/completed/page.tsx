"use client";

import { Calendar, Check, Star } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchWithAuth } from "@/lib/password";
import type { ExerciseWithProgress } from "@/types";

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

export default function CompletedPage() {
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState("");

  useEffect(() => {
    const fetchCompleted = async () => {
      try {
        const res = await fetch("/api/exercises/completed");
        if (res.ok) {
          const data = await res.json();
          setExercises(data);
        }
      } catch (error) {
        console.error("Failed to fetch completed exercises:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompleted();
  }, []);

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

        // 로컬 상태 업데이트
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
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Exercices terminés</h1>
        <p className="text-muted-foreground mt-2">
          {exercises.length} exercice{exercises.length !== 1 ? "s" : ""} terminé
          {exercises.length !== 1 ? "s" : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {exercises.length === 0 ? (
            <div className="py-12 text-center">
              <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">Aucun exercice terminé pour le moment.</p>
              <Button asChild>
                <Link href="/exercises">Voir les exercices</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {exercises.map((exercise) => (
                <li
                  key={exercise.id}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-muted/50 transition-colors"
                >
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

                  {/* Date - Editable (Right side) */}
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
