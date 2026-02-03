"use client";

import { ArrowLeft, Check, CheckCircle2, Circle, ExternalLink, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import AudioPlayer from "@/components/AudioPlayer";
import H5PQuiz from "@/components/H5PQuiz";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { ExerciseWithProgress, ProgressInput } from "@/types";

interface ExerciseDetailPageProps {
  params: Promise<{ id: string }>;
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
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-12" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-10 w-3/4" />
        </div>
        <Skeleton className="h-80 w-full rounded-lg" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!exercise) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="py-12 text-center text-muted-foreground">
          Exercice introuvable.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Retour à la liste
        </Button>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge
                variant={levelVariant(exercise.level) as "a1" | "a2" | "b1" | "b2" | "secondary"}
              >
                {exercise.level}
              </Badge>
              <span className="text-sm text-muted-foreground">{exercise.category}</span>
              {exercise.publishedAt && (
                <span className="text-sm text-muted-foreground">
                  · {new Date(exercise.publishedAt).toLocaleDateString("fr-FR")}
                </span>
              )}
              {(!exercise.audioUrl || !exercise.transcript) && (
                <Badge variant="warning">Atypique</Badge>
              )}
            </div>
            <h1 className="text-2xl font-bold">{exercise.title}</h1>
          </div>

          <Button
            variant={isCompleted ? "outline" : "secondary"}
            onClick={handleCompletedToggle}
            disabled={saving}
            className={
              isCompleted ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100" : ""
            }
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Terminé
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 mr-1" />
                Marquer terminé
              </>
            )}
          </Button>
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
          <Card className="mb-6 border-blue-200 bg-blue-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-blue-900">Historique d'apprentissage</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
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
                    Terminé le :{" "}
                    {new Date(exercise.progress.completedAt).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        )}

      {/* Audio Player */}
      {exercise.audioUrl && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Audio</h2>
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
            <h2 className="text-lg font-semibold">Quiz</h2>
            {!exercise.h5pEmbedUrl && (
              <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Chargement...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Charger le quiz
                  </>
                )}
              </Button>
            )}
          </div>
          {exercise.h5pEmbedUrl ? (
            <H5PQuiz
              h5pUrl={exercise.h5pEmbedUrl}
              exerciseId={exercise.id}
              onScoreReceived={handleScoreReceived}
            />
          ) : (
            <Card className="bg-muted/50">
              <CardContent className="py-6 text-center">
                <p className="text-muted-foreground mb-2">Le quiz n'est pas encore chargé.</p>
                <p className="text-sm text-muted-foreground">
                  Cliquez sur "Charger le quiz" pour récupérer le quiz depuis RFI.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Transcript */}
      {exercise.transcript && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Transcription</h2>
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <p className="whitespace-pre-line leading-relaxed">{exercise.transcript}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notes */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Notes</h2>
        <Card>
          <CardContent className="pt-6">
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Prenez des notes pendant votre apprentissage..."
              rows={4}
              className="resize-none mb-3"
            />
            <div className="flex justify-end">
              <Button onClick={handleNotesSave} disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Check className="h-3 w-3 mr-1" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Source link */}
      <div className="text-center">
        <Button variant="link" asChild>
          <a href={exercise.sourceUrl} target="_blank" rel="noopener noreferrer">
            Voir sur le site RFI
            <ExternalLink className="h-3 w-3 ml-1" />
          </a>
        </Button>
      </div>
    </div>
  );
}
