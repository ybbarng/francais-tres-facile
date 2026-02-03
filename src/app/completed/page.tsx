"use client";

import { Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

      {exercises.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Aucun exercice terminé pour le moment.</p>
            <Button asChild>
              <Link href="/exercises">Voir les exercices</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {exercises.map((exercise) => (
            <Link key={exercise.id} href={`/exercises/${exercise.id}`} className="block group">
              <Card className="hover:shadow-lg transition-shadow">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant={
                            levelVariant(exercise.level) as "a1" | "a2" | "b1" | "b2" | "secondary"
                          }
                        >
                          {exercise.level}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{exercise.category}</span>
                      </div>
                      <h3 className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {exercise.title}
                      </h3>
                    </div>

                    <div className="text-right shrink-0">
                      {exercise.progress?.score !== null && exercise.progress?.maxScore && (
                        <div className="text-lg font-bold text-primary">
                          {exercise.progress.score}/{exercise.progress.maxScore}
                        </div>
                      )}
                      {exercise.progress?.completedAt && (
                        <div className="text-sm text-muted-foreground">
                          {new Date(exercise.progress.completedAt).toLocaleString("fr-FR", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
