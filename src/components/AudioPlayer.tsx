"use client";

import {
  FastForward,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Rewind,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export type RepeatMode = "none" | "one" | "all";

interface AudioPlayerProps {
  audioUrl: string | null;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string | null;
  currentTrack?: number;
  playlistLength?: number;
  shuffle?: boolean;
  repeat?: RepeatMode;
  onPlayCountUpdate?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onShuffleToggle?: () => void;
  onRepeatCycle?: () => void;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];

export default function AudioPlayer({
  audioUrl,
  title,
  subtitle,
  thumbnailUrl,
  currentTrack,
  playlistLength = 1,
  shuffle = false,
  repeat = "none",
  onPlayCountUpdate,
  onPrevious,
  onNext,
  onShuffleToggle,
  onRepeatCycle,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasCountedPlay, setHasCountedPlay] = useState(false);

  const hasMultipleTracks = playlistLength > 1;

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
      } else if (onNext) {
        onNext();
      } else {
        setIsPlaying(false);
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
  }, [playbackRate, repeat, onNext]);

  // Handle audio source change
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    const currentSrc = audio.src;
    const newSrc = audioUrl;

    if (currentSrc !== newSrc) {
      audio.src = newSrc;
      setCurrentTime(0);
      setDuration(0);
      setHasCountedPlay(false);
      if (isPlaying) {
        audio.play();
      }
    }
  }, [audioUrl, isPlaying]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      if (!hasCountedPlay) {
        setHasCountedPlay(true);
        onPlayCountUpdate?.();
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number.parseFloat(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const cycleSpeed = () => {
    const currentIdx = SPEEDS.indexOf(playbackRate);
    const nextIdx = (currentIdx + 1) % SPEEDS.length;
    const nextSpeed = SPEEDS[nextIdx];
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = nextSpeed;
    setPlaybackRate(nextSpeed);
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const handlePrevious = () => {
    if (currentTime > 3) {
      const audio = audioRef.current;
      if (audio) audio.currentTime = 0;
    } else if (onPrevious) {
      onPrevious();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (!audioUrl) {
    return <div className="py-4 text-center text-muted-foreground">Aucun audio disponible.</div>;
  }

  return (
    <div className="space-y-3">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Row 1: Thumbnail + Title/Subtitle + Track number + Speed */}
      <div className="flex items-center gap-3">
        {thumbnailUrl && (
          <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
            <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{title}</h3>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {currentTrack !== undefined && hasMultipleTracks && (
            <span className="text-xs text-muted-foreground">
              {currentTrack} / {playlistLength}
            </span>
          )}
          <Button
            variant={playbackRate !== 1 ? "secondary" : "outline"}
            size="sm"
            onClick={cycleSpeed}
            className="h-7 px-2 text-xs font-mono min-w-[3rem]"
            title="Vitesse de lecture"
          >
            {playbackRate}x
          </Button>
        </div>
      </div>

      {/* Row 2: Progress bar + Time */}
      <div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-3
                     [&::-webkit-slider-thumb]:h-3
                     [&::-webkit-slider-thumb]:bg-primary
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:shadow-md"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-0.5">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Row 3: All controls in one line */}
      <div className="flex items-center justify-center gap-1">
        {/* Shuffle */}
        {hasMultipleTracks && onShuffleToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onShuffleToggle}
            className={`h-8 w-8 ${shuffle ? "text-primary" : "text-muted-foreground"}`}
            title="Lecture aléatoire"
          >
            <Shuffle className="h-4 w-4" />
          </Button>
        )}

        {/* Previous track */}
        {hasMultipleTracks && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrevious}
            title="Piste précédente"
            className="h-8 w-8"
          >
            <SkipBack className="h-4 w-4" />
          </Button>
        )}

        {/* -10s */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(-10)}
          title="-10 secondes"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <Rewind className="h-4 w-4" />
        </Button>

        {/* Play/Pause */}
        <Button onClick={togglePlay} size="icon" className="h-10 w-10 rounded-full">
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </Button>

        {/* +10s */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => skip(10)}
          title="+10 secondes"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
        >
          <FastForward className="h-4 w-4" />
        </Button>

        {/* Next track */}
        {hasMultipleTracks && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            title="Piste suivante"
            className="h-8 w-8"
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        )}

        {/* Repeat */}
        {onRepeatCycle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRepeatCycle}
            className={`h-8 w-8 ${repeat !== "none" ? "text-primary" : "text-muted-foreground"}`}
            title={
              repeat === "one"
                ? "Répéter un titre"
                : repeat === "all"
                  ? "Répéter tout"
                  : "Pas de répétition"
            }
          >
            {repeat === "one" ? <Repeat1 className="h-4 w-4" /> : <Repeat className="h-4 w-4" />}
          </Button>
        )}
      </div>
    </div>
  );
}
