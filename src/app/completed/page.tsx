"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ExerciseWithProgress } from "@/types";

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
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Exercices terminés</h1>
        <p className="text-gray-500 mt-2">
          {exercises.length} exercice{exercises.length !== 1 ? "s" : ""} terminé
          {exercises.length !== 1 ? "s" : ""}
        </p>
      </div>

      {exercises.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">Aucun exercice terminé pour le moment.</p>
          <Link
            href="/exercises"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voir les exercices
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {exercises.map((exercise) => (
            <Link
              key={exercise.id}
              href={`/exercises/${exercise.id}`}
              className="block bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-4 border border-gray-100"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        exercise.level === "A1"
                          ? "bg-green-100 text-green-700"
                          : exercise.level === "A2"
                            ? "bg-blue-100 text-blue-700"
                            : exercise.level === "B1"
                              ? "bg-yellow-100 text-yellow-700"
                              : exercise.level === "B2"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {exercise.level}
                    </span>
                    <span className="text-sm text-gray-500">{exercise.category}</span>
                  </div>
                  <h3 className="font-medium text-gray-900 line-clamp-2">{exercise.title}</h3>
                </div>

                <div className="text-right shrink-0">
                  {exercise.progress?.score !== null && exercise.progress?.maxScore && (
                    <div className="text-lg font-bold text-blue-600">
                      {exercise.progress.score}/{exercise.progress.maxScore}
                    </div>
                  )}
                  {exercise.progress?.completedAt && (
                    <div className="text-sm text-gray-400">
                      {new Date(exercise.progress.completedAt).toLocaleDateString("fr-FR", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
