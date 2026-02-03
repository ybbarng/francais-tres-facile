import { Check, ListChecks, Star, Volume2 } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { ExerciseWithProgress } from "@/types";

interface ExerciseCardProps {
  exercise: ExerciseWithProgress;
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

export default function ExerciseCard({ exercise }: ExerciseCardProps) {
  const { progress } = exercise;

  return (
    <Link href={`/exercises/${exercise.id}`} className="block group">
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
        {exercise.thumbnailUrl && (
          <div className="aspect-video bg-muted relative overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={exercise.thumbnailUrl}
              alt={exercise.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {progress?.completed && (
              <Badge variant="success" className="absolute top-2 right-2">
                <Check className="w-3 h-3" />
                Terminé
              </Badge>
            )}
          </div>
        )}

        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={levelVariant(exercise.level) as "a1" | "a2" | "b1" | "b2" | "secondary"}
            >
              {exercise.level}
            </Badge>
            <span className="text-xs text-muted-foreground">{exercise.category}</span>
            {(!exercise.audioUrl || !exercise.transcript) && (
              <Badge variant="warning">Atypique</Badge>
            )}
          </div>

          <h3 className="font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {exercise.title}
          </h3>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            {exercise.publishedAt && (
              <span>{new Date(exercise.publishedAt).toLocaleDateString("fr-FR")}</span>
            )}

            <div className="flex items-center gap-3">
              {exercise.audioUrl && (
                <span className="flex items-center gap-1" title="Audio disponible">
                  <Volume2 className="w-4 h-4" />
                </span>
              )}
              {exercise.h5pEmbedUrl && (
                <span className="flex items-center gap-1" title="Quiz disponible">
                  <ListChecks className="w-4 h-4" />
                </span>
              )}
            </div>
          </div>

          {progress && (progress.score !== null || progress.listenCount > 0) && (
            <div className="mt-3 pt-3 border-t border-border flex items-center gap-4 text-xs text-muted-foreground">
              {progress.score !== null && progress.maxScore && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  {progress.score}/{progress.maxScore}
                </span>
              )}
              {progress.listenCount > 0 && (
                <span className="flex items-center gap-1">
                  <Volume2 className="w-4 h-4" />
                  {progress.listenCount} fois
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
