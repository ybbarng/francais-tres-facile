"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
      <div className="text-center py-12 text-gray-500">Aucun exercice avec audio disponible.</div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Player */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 sticky top-4">
          <audio ref={audioRef} preload="metadata" />

          {currentExercise && (
            <>
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 line-clamp-2">{currentExercise.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
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
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none
                             [&::-webkit-slider-thumb]:w-4
                             [&::-webkit-slider-thumb]:h-4
                             [&::-webkit-slider-thumb]:bg-blue-600
                             [&::-webkit-slider-thumb]:rounded-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Main controls */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  onClick={() => setShuffle(!shuffle)}
                  className={`p-2 rounded-full transition-colors ${
                    shuffle ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                  }`}
                  title="Lecture aléatoire"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                </button>

                <button
                  onClick={playPrevious}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                <button
                  onClick={togglePlay}
                  className="p-4 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={playNext}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
                  </svg>
                </button>

                <button
                  onClick={cycleRepeat}
                  className={`p-2 rounded-full transition-colors ${
                    repeat !== "none" ? "text-blue-600" : "text-gray-400 hover:text-gray-600"
                  }`}
                  title={
                    repeat === "one"
                      ? "Répéter un titre"
                      : repeat === "all"
                        ? "Répéter tout"
                        : "Pas de répétition"
                  }
                >
                  {repeat === "one" ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4zm-4-2V9h-1l-2 1v1h1.5v4H13z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Speed control */}
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-gray-500">Vitesse :</span>
                {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      playbackRate === speed
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Playlist */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">
              Playlist ({exercisesWithAudio.length} titres)
            </h2>
          </div>
          <ul className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {exercisesWithAudio.map((exercise, index) => (
              <li
                key={exercise.id}
                onClick={() => selectTrack(index)}
                className={`p-4 cursor-pointer transition-colors ${
                  index === currentIndex ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      index === currentIndex
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {index === currentIndex && isPlaying ? (
                      <svg
                        className="w-4 h-4 animate-pulse"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${
                        index === currentIndex ? "text-blue-600" : "text-gray-900"
                      }`}
                    >
                      {exercise.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {exercise.level} · {exercise.category}
                    </p>
                  </div>
                  {exercise.progress?.completed && (
                    <span className="text-green-500">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
