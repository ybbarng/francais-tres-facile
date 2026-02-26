"use client";

import { CheckCircle2, FileText, ListMusic, Pause } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExerciseWithProgress } from "@/types";
import AudioPlayer, { type RepeatMode } from "./AudioPlayer";

interface PlaylistProps {
  exercises: ExerciseWithProgress[];
}

type Tab = "transcription" | "liste";

export default function Playlist({ exercises }: PlaylistProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>("none");
  const [activeTab, setActiveTab] = useState<Tab>("transcription");
  const activeTrackRef = useRef<HTMLLIElement>(null);

  const currentExercise = exercises[currentIndex];
  const hasMultipleTracks = exercises.length > 1;

  // Scroll to active track when switching to list tab or changing track
  // currentIndex determines which element activeTrackRef points to
  useEffect(() => {
    if (activeTab === "liste" && currentIndex >= 0) {
      activeTrackRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeTab, currentIndex]);

  const playNext = useCallback(() => {
    if (shuffle) {
      const nextIndex = Math.floor(Math.random() * exercises.length);
      setCurrentIndex(nextIndex);
    } else if (currentIndex < exercises.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (repeat === "all") {
      setCurrentIndex(0);
    } else {
      setIsPlaying(false);
    }
  }, [shuffle, currentIndex, exercises.length, repeat]);

  const playPrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const cycleRepeat = useCallback(() => {
    if (hasMultipleTracks) {
      if (repeat === "none") setRepeat("all");
      else if (repeat === "all") setRepeat("one");
      else setRepeat("none");
    } else {
      if (repeat === "none") setRepeat("one");
      else setRepeat("none");
    }
  }, [hasMultipleTracks, repeat]);

  const selectTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
    setActiveTab("transcription");
  };

  if (exercises.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Aucun exercice avec audio disponible.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Player - sticky at top */}
      <Card className="sticky top-0 z-10">
        <CardContent className="pt-6">
          {currentExercise && (
            <AudioPlayer
              audioUrl={currentExercise.audioUrl}
              title={currentExercise.title}
              subtitle={`${currentExercise.level} · ${currentExercise.categories.map((c: { category: string }) => c.category).join(", ")}`}
              playlistLength={exercises.length}
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

      {/* Tabs + Content */}
      {/* Mobile: tab switching / Desktop: side by side */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-4">
        {/* Tab buttons - mobile only */}
        <div className="flex gap-2 mb-4 lg:hidden">
          <Button
            variant={activeTab === "transcription" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("transcription")}
            className="flex-1"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Transcription
          </Button>
          <Button
            variant={activeTab === "liste" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("liste")}
            className="flex-1"
          >
            <ListMusic className="h-4 w-4 mr-1.5" />
            Liste ({exercises.length})
          </Button>
        </div>

        {/* Transcription */}
        <div className={activeTab === "transcription" ? "" : "hidden lg:block"}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transcription
              </CardTitle>
            </CardHeader>
            <CardContent>
              {currentExercise?.transcript ? (
                <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line leading-relaxed">
                  {currentExercise.transcript}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-8 text-center">
                  Aucune transcription disponible pour cet exercice.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Playlist */}
        <div className={activeTab === "liste" ? "" : "hidden lg:block"}>
          <Card className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListMusic className="h-4 w-4" />
                Liste de lecture ({exercises.length} titres)
              </CardTitle>
            </CardHeader>
            <ul className="divide-y divide-border max-h-[600px] overflow-y-auto">
              {exercises.map((exercise, index) => (
                <li
                  key={exercise.id}
                  ref={index === currentIndex ? activeTrackRef : null}
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
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
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
                        {exercise.level} ·{" "}
                        {exercise.categories
                          .map((c: { category: string }) => c.category)
                          .join(", ")}
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
    </div>
  );
}
