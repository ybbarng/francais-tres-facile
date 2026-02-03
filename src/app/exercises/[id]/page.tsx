"use client";

import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import H5PQuiz from "@/components/H5PQuiz";
import type { ExerciseWithProgress, ProgressInput } from "@/types";

interface ExerciseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ExerciseDetailPage({ params }: ExerciseDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [exercise, setExercise] = useState<ExerciseWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notes, setNotes] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    const fetchExercise = async () => {
      try {
        const res = await fetch(`/api/exercises/${id}`);
        if (!res.ok) {
          router.push("/exercises");
          return;
        }
        const data = await res.json();
        setExercise(data);
        setNotes(data.progress?.notes || "");
        setIsCompleted(data.progress?.completed || false);
      } catch (error) {
        console.error("Failed to fetch exercise:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercise();
  }, [id, router]);

  const updateProgress = useCallback(
    async (data: ProgressInput) => {
      setSaving(true);
      try {
        await fetch(`/api/progress/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      } catch (error) {
        console.error("Failed to update progress:", error);
      } finally {
        setSaving(false);
      }
    },
    [id]
  );

  const handleScoreReceived = useCallback(
    (score: { score: number; maxScore: number }) => {
      updateProgress({
        score: score.score,
        maxScore: score.maxScore,
        completed: true,
      });
      setIsCompleted(true);
    },
    [updateProgress]
  );

  const handlePlayCountUpdate = useCallback(() => {
    const currentCount = exercise?.progress?.listenCount || 0;
    updateProgress({ listenCount: currentCount + 1 });
  }, [exercise?.progress?.listenCount, updateProgress]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
  }, []);

  const handleNotesSave = useCallback(() => {
    updateProgress({ notes });
  }, [updateProgress, notes]);

  const handleCompletedToggle = useCallback(() => {
    const newCompleted = !isCompleted;
    setIsCompleted(newCompleted);
    updateProgress({ completed: newCompleted });
  }, [isCompleted, updateProgress]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/exercises/${id}/refresh`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setExercise(data.exercise);
      }
    } catch (error) {
      console.error("Failed to refresh exercise:", error);
    } finally {
      setRefreshing(false);
    }
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (!exercise) {
    return <div className="text-center py-12 text-gray-500">Exercice introuvable.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-700 flex items-center gap-1 mb-4"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Retour à la liste
        </button>

        <div className="flex items-start justify-between gap-4">
          <div>
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
              {exercise.publishedAt && (
                <span className="text-sm text-gray-400">
                  · {new Date(exercise.publishedAt).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{exercise.title}</h1>
          </div>

          <button
            onClick={handleCompletedToggle}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isCompleted
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {isCompleted ? (
              <>
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                Terminé
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Marquer terminé
              </>
            )}
          </button>
        </div>
      </div>

      {/* Thumbnail */}
      {exercise.thumbnailUrl && (
        <div className="mb-6">
          <img
            src={exercise.thumbnailUrl}
            alt={exercise.title}
            className="w-full max-h-80 object-cover rounded-lg"
          />
        </div>
      )}

      {/* Progress info */}
      {exercise.progress &&
        (exercise.progress.score !== null || exercise.progress.listenCount > 0) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-blue-900 mb-2">Historique d'apprentissage</h3>
            <div className="flex gap-6 text-sm text-blue-700">
              {exercise.progress.score !== null && exercise.progress.maxScore && (
                <span>
                  Score du quiz : {exercise.progress.score}/{exercise.progress.maxScore}
                </span>
              )}
              {exercise.progress.listenCount > 0 && (
                <span>Écoutes : {exercise.progress.listenCount} fois</span>
              )}
              {exercise.progress.completedAt && (
                <span>
                  Terminé le : {new Date(exercise.progress.completedAt).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          </div>
        )}

      {/* Audio Player */}
      {exercise.audioUrl && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Audio</h2>
          <AudioPlayer
            audioUrl={exercise.audioUrl}
            title={exercise.title}
            onPlayCountUpdate={handlePlayCountUpdate}
          />
        </div>
      )}

      {/* H5P Quiz - 퀴즈가 있는 콘텐츠만 표시 */}
      {(exercise.h5pEmbedUrl || exercise.section !== "comprendre-actualite") && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Quiz</h2>
            {!exercise.h5pEmbedUrl && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded-lg
                         hover:bg-blue-200 disabled:opacity-50 transition-colors
                         flex items-center gap-1"
              >
                {refreshing ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-3 w-3 border-2 border-blue-700 border-t-transparent" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Charger le quiz
                  </>
                )}
              </button>
            )}
          </div>
          {exercise.h5pEmbedUrl ? (
            <H5PQuiz
              h5pUrl={exercise.h5pEmbedUrl}
              exerciseId={exercise.id}
              onScoreReceived={handleScoreReceived}
            />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
              <p className="text-gray-500 mb-2">Le quiz n'est pas encore chargé.</p>
              <p className="text-sm text-gray-400">
                Cliquez sur "Charger le quiz" pour récupérer le quiz depuis RFI.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Transcript */}
      {exercise.transcript && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcription</h2>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {exercise.transcript}
            </p>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Notes</h2>
        <div className="bg-white rounded-xl shadow-md p-4 border border-gray-100">
          <textarea
            value={notes}
            onChange={(e) => handleNotesChange(e.target.value)}
            placeholder="Prenez des notes pendant votre apprentissage..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={handleNotesSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>

      {/* Source link */}
      <div className="text-center">
        <a
          href={exercise.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center gap-1"
        >
          Voir sur le site RFI
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
