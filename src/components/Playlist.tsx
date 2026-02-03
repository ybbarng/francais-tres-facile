"use client";

import {
  CheckCircle2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ExerciseWithProgress } from "@/types";

interface PlaylistProps {
  exercises: ExerciseWithProgress[];
}

export default function Playlist({ exercises }: PlaylistProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<"none" | "all" | "one">("none");
  const [playbackRate, setPlaybackRate] = useState(1);

  const exercisesWithAudio = exercises.filter((e) => e.audioUrl);
  const currentExercise = exercisesWithAudio[currentIndex];

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

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      audio.playbackRate = playbackRate;
    };
    const handleEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play();
      } else {
        playNext();
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [playNext, repeat, playbackRate]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentExercise?.audioUrl) return;

    audio.src = currentExercise.audioUrl;
    if (isPlaying) {
      audio.play();
    }
  }, [currentExercise?.audioUrl, isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playPrevious = () => {
    if (currentTime > 3) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = 0;
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const handleSpeedChange = (speed: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
    setPlaybackRate(speed);
  };

  const selectTrack = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(true);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const cycleRepeat = () => {
    if (repeat === "none") setRepeat("all");
    else if (repeat === "all") setRepeat("one");
    else setRepeat("none");
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
            <audio ref={audioRef} preload="metadata" />

            {currentExercise && (
              <>
                <div className="mb-6">
                  <h3 className="font-medium line-clamp-2">{currentExercise.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {currentExercise.level} · {currentExercise.category}
                  </p>
                </div>

                {/* Progress bar */}
                <div className="mb-6">
                  <input
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer
                               [&::-webkit-slider-thumb]:appearance-none
                               [&::-webkit-slider-thumb]:w-4
                               [&::-webkit-slider-thumb]:h-4
                               [&::-webkit-slider-thumb]:bg-primary
                               [&::-webkit-slider-thumb]:rounded-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Main controls */}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShuffle(!shuffle)}
                    className={shuffle ? "text-primary" : "text-muted-foreground"}
                    title="Lecture aléatoire"
                  >
                    <Shuffle className="h-5 w-5" />
                  </Button>

                  <Button variant="ghost" size="icon" onClick={playPrevious}>
                    <SkipBack className="h-6 w-6" />
                  </Button>

                  <Button onClick={togglePlay} size="icon" className="h-14 w-14 rounded-full">
                    {isPlaying ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6 ml-0.5" />
                    )}
                  </Button>

                  <Button variant="ghost" size="icon" onClick={playNext}>
                    <SkipForward className="h-6 w-6" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={cycleRepeat}
                    className={repeat !== "none" ? "text-primary" : "text-muted-foreground"}
                    title={
                      repeat === "one"
                        ? "Répéter un titre"
                        : repeat === "all"
                          ? "Répéter tout"
                          : "Pas de répétition"
                    }
                  >
                    {repeat === "one" ? (
                      <Repeat1 className="h-5 w-5" />
                    ) : (
                      <Repeat className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {/* Speed control */}
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-muted-foreground">Vitesse :</span>
                  {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                    <Button
                      key={speed}
                      variant={playbackRate === speed ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSpeedChange(speed)}
                      className="h-7 px-2 text-xs"
                    >
                      {speed}x
                    </Button>
                  ))}
                </div>
              </>
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
