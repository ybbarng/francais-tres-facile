import { Check } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
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
    <Link href={`/exercises/${exercise.id}`} className="block">
      <div
        className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden
                      hover:shadow-lg transition-shadow"
      >
        {exercise.thumbnailUrl && (
          <div className="aspect-video bg-gray-100 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={exercise.thumbnailUrl}
              alt={exercise.title}
              className="w-full h-full object-cover"
            />
            {progress?.completed && (
              <Badge variant="success" className="absolute top-2 right-2">
                <Check className="w-3 h-3" />
                Terminé
              </Badge>
            )}
          </div>
        )}

        <div className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Badge
              variant={levelVariant(exercise.level) as "a1" | "a2" | "b1" | "b2" | "secondary"}
            >
              {exercise.level}
            </Badge>
            <span className="text-xs text-gray-500">{exercise.category}</span>
            {(!exercise.audioUrl || !exercise.transcript) && (
              <Badge variant="warning">Atypique</Badge>
            )}
          </div>

          <h3 className="font-medium text-gray-900 line-clamp-2 mb-2">{exercise.title}</h3>

          <div className="flex items-center justify-between text-sm text-gray-500">
            {exercise.publishedAt && (
              <span>{new Date(exercise.publishedAt).toLocaleDateString("fr-FR")}</span>
            )}

            <div className="flex items-center gap-3">
              {exercise.audioUrl && (
                <span className="flex items-center gap-1" title="Audio disponible">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
              {exercise.h5pEmbedUrl && (
                <span className="flex items-center gap-1" title="Quiz disponible">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              )}
            </div>
          </div>

          {progress && (progress.score !== null || progress.listenCount > 0) && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-4 text-xs text-gray-500">
              {progress.score !== null && progress.maxScore && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  {progress.score}/{progress.maxScore}
                </span>
              )}
              {progress.listenCount > 0 && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {progress.listenCount} fois
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
