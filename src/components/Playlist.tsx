"use client";

import { CheckCircle2, Pause } from "lucide-react";
import { useCallback, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExerciseWithProgress } from "@/types";
import AudioPlayer, { type RepeatMode } from "./AudioPlayer";

interface PlaylistProps {
  exercises: ExerciseWithProgress[];
}

export default function Playlist({ exercises }: PlaylistProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("none");

  const exercisesWithAudio = exercises.filter((e) => e.audioUrl);
  const currentExercise = exercisesWithAudio[currentIndex];
  const hasMultipleTracks = exercisesWithAudio.length > 1;

  const playNext = useCallback(() => {
    if (shuffle) {
      const nextIndex = Math.floor(Math.random() * exercisesWithAudio.length);
      setCurrentIndex(nextIndex);
    } else if (currentIndex < exercisesWithAudio.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (repeat === "all") {
      setCurrentIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [shuffle, currentIndex, exercisesWithAudio.length, repeat]);

  const playPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const cycleRepeat = useCallback(() => {
    if (hasMultipleTracks) {
      // Multiple tracks: none -> all -> one -> none
      if (repeat === "none") setRepeat("all");
      else if (repeat === "all") setRepeat("one");
      else setRepeat("none");
    } else {
      // Single track: none -> one -> none
      if (repeat === "none") setRepeat("one");
      else setRepeat("none");
    }
  }, [hasMultipleTracks, repeat]);

  const selectTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  if (exercisesWithAudio.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun exercice avec audio disponible.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Player */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardContent className="pt-6">
            {currentExercise && (
              <AudioPlayer
                audioUrl={currentExercise.audioUrl}
                title={currentExercise.title}
                subtitle={`${currentExercise.level} · ${currentExercise.category}`}
                playlistLength={exercisesWithAudio.length}
                shuffle={shuffle}
                repeat={repeat}
                onPrevious={playPrevious}
                onNext={playNext}
                onShuffleToggle={() => setShuffle(!shuffle)}
                onRepeatCycle={cycleRepeat}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Playlist */}
      <div className="lg:col-span-2">
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Playlist ({exercisesWithAudio.length} titres)
            </CardTitle>
          </CardHeader>
          <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {exercisesWithAudio.map((exercise, index) => (
              <li
                key={exercise.id}
                onClick={() => selectTrack(index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    selectTrack(index);
                  }
                }}
                className={`p-4 cursor-pointer transition-colors ${
                  index === currentIndex ? "bg-primary/10" : "hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      index === currentIndex
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index === currentIndex && isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        index === currentIndex ? "text-primary" : ""
                      }`}
                    >
                      {exercise.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {exercise.level} · {exercise.category}
                    </p>
                  </div>
                  {exercise.progress?.completed && (
                    <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400 shrink-0" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
