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

interface PlayerProps {
  audioUrl: string | null;
  title: string;
  subtitle?: string;
  playlistLength?: number;
  shuffle?: boolean;
  repeat?: RepeatMode;
  onPlayCountUpdate?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onShuffleToggle?: () => void;
  onRepeatCycle?: () => void;
}

export default function Player({
  audioUrl,
  title,
  subtitle,
  playlistLength = 1,
  shuffle = false,
  repeat = "none",
  onPlayCountUpdate,
  onPrevious,
  onNext,
  onShuffleToggle,
  onRepeatCycle,
}: PlayerProps) {
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

    // Only update if the source actually changed
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

  const handleSpeedChange = (speed: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = speed;
    setPlaybackRate(speed);
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
    return <div className="py-8 text-center text-muted-foreground">Aucun audio disponible.</div>;
  }

  return (
    <div>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Title */}
      <div className="mb-6">
        <h3 className="font-medium line-clamp-2">{title}</h3>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
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
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:shadow-md"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main controls */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {/* Shuffle - only for multiple tracks */}
        {hasMultipleTracks && onShuffleToggle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onShuffleToggle}
            className={shuffle ? "text-primary" : "text-muted-foreground"}
            title="Lecture aléatoire"
          >
            <Shuffle className="h-5 w-5" />
          </Button>
        )}

        {/* Previous / -10s */}
        {hasMultipleTracks ? (
          <Button variant="ghost" size="icon" onClick={handlePrevious} title="Piste précédente">
            <SkipBack className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(-10)}
            title="-10 secondes"
            className="text-muted-foreground hover:text-foreground"
          >
            <Rewind className="w-5 h-5" />
          </Button>
        )}

        {/* Play/Pause */}
        <Button onClick={togglePlay} size="icon" className="h-14 w-14 rounded-full">
          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
        </Button>

        {/* Next / +10s */}
        {hasMultipleTracks ? (
          <Button variant="ghost" size="icon" onClick={onNext} title="Piste suivante">
            <SkipForward className="h-6 w-6" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(10)}
            title="+10 secondes"
            className="text-muted-foreground hover:text-foreground"
          >
            <FastForward className="w-5 h-5" />
          </Button>
        )}

        {/* Repeat */}
        {onRepeatCycle && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRepeatCycle}
            className={repeat !== "none" ? "text-primary" : "text-muted-foreground"}
            title={
              repeat === "one"
                ? "Répéter un titre"
                : repeat === "all"
                  ? "Répéter tout"
                  : "Pas de répétition"
            }
          >
            {repeat === "one" ? <Repeat1 className="h-5 w-5" /> : <Repeat className="h-5 w-5" />}
          </Button>
        )}
      </div>

      {/* Secondary controls for playlist mode: ±10s skip */}
      {hasMultipleTracks && (
        <div className="flex items-center justify-center gap-4 mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => skip(-10)}
            title="-10 secondes"
            className="text-muted-foreground"
          >
            <Rewind className="w-4 h-4 mr-1" />
            10s
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => skip(10)}
            title="+10 secondes"
            className="text-muted-foreground"
          >
            10s
            <FastForward className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}

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
    </div>
  );
}
