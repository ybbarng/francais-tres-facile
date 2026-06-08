"use client";

import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Pause,
  Play,
  Repeat,
  RotateCcw,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { assetPath } from "../lib/assets";
import { formatMinSec } from "../lib/format";
import { STEPS } from "../lib/steps";
import { useShadowingStore } from "../store/shadowing-store";
import type { ShadowingPlayableItem } from "../types";
import RecordingPanel from "./RecordingPanel";

const SPEED_PRESETS = [0.5, 0.75, 1, 1.25];

interface ShadowingPlayerProps {
  items: ShadowingPlayableItem[];
  materialId: string;
}

export default function ShadowingPlayer({ items, materialId }: ShadowingPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const currentUnit = useShadowingStore((s) => s.currentUnit);
  const currentIndex = useShadowingStore((s) => s.currentIndex);
  const currentStep = useShadowingStore((s) => s.currentStep);
  const repeatOn = useShadowingStore((s) => s.repeatOn);
  const subtitleOn = useShadowingStore((s) => s.subtitleOn);
  const setIndex = useShadowingStore((s) => s.setIndex);
  const setSubtitleOn = useShadowingStore((s) => s.setSubtitleOn);
  const toggleRepeat = useShadowingStore((s) => s.toggleRepeat);

  const item = items[currentIndex];
  const stepConfig = STEPS[currentStep];

  const goPrev = useCallback(() => {
    if (currentIndex > 0) setIndex(currentIndex - 1);
  }, [currentIndex, setIndex]);

  const goNext = useCallback(() => {
    if (currentIndex < items.length - 1) setIndex(currentIndex + 1);
  }, [currentIndex, items.length, setIndex]);

  useEffect(() => {
    setSubtitleOn(stepConfig.subtitle);
    setPlaybackRate(stepConfig.speed);
    const audio = audioRef.current;
    if (audio) audio.playbackRate = stepConfig.speed;
  }, [stepConfig.subtitle, stepConfig.speed, setSubtitleOn]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTime = () => setCurrentTime(audio.currentTime);
    const handleMeta = () => {
      setDuration(audio.duration);
      audio.playbackRate = playbackRate;
    };
    const handleEnded = () => {
      if (repeatOn) {
        audio.currentTime = 0;
        audio.play();
        return;
      }
      setIsPlaying(false);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleMeta);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    return () => {
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleMeta);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
    };
  }, [playbackRate, repeatOn]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setCurrentTime(0);
    setDuration(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.matches("input,select,textarea,button")) return;
      if (e.code === "Space") {
        e.preventDefault();
        const audio = audioRef.current;
        if (!audio) return;
        if (audio.paused) audio.play();
        else audio.pause();
      } else if (e.code === "KeyR") {
        const audio = audioRef.current;
        if (!audio) return;
        audio.currentTime = 0;
        audio.play();
      } else if (e.code === "KeyS") {
        setSubtitleOn(!subtitleOn);
      } else if (e.code === "KeyL") {
        toggleRepeat();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        goNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [subtitleOn, setSubtitleOn, toggleRepeat, goNext, goPrev]);

  if (!item) {
    return <p className="text-sm text-muted-foreground">선택된 항목이 없습니다.</p>;
  }

  const audioSrc = assetPath(item.audioFile);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play();
    else audio.pause();
  };

  const restart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number.parseFloat(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const setSpeed = (sp: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = sp;
    setPlaybackRate(sp);
  };

  return (
    <div className="space-y-4">
      <audio ref={audioRef} src={audioSrc} preload="auto" />

      <div className="rounded-lg bg-muted/50 p-5">
        <p
          className={cn(
            "text-base leading-relaxed transition-all sm:text-lg",
            !subtitleOn && "select-none opacity-40 blur-sm"
          )}
        >
          {item.text}
        </p>
      </div>

      <div>
        <input
          type="range"
          min={0}
          max={duration || 100}
          step={0.01}
          value={currentTime}
          onChange={handleSeek}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-muted
                     [&::-webkit-slider-thumb]:h-3.5
                     [&::-webkit-slider-thumb]:w-3.5
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-primary"
        />
        <div className="mt-1 flex justify-between font-mono text-xs text-muted-foreground">
          <span>{formatMinSec(currentTime)}</span>
          <span>{formatMinSec(duration)}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={restart} variant="ghost" size="icon" title="처음으로 (R)">
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button onClick={togglePlay} size="icon" className="h-11 w-11 rounded-full">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
        </Button>

        <Button
          onClick={toggleRepeat}
          variant="ghost"
          size="icon"
          className={cn(repeatOn ? "text-primary" : "text-muted-foreground")}
          title="반복 (L)"
        >
          <Repeat className="h-4 w-4" />
        </Button>

        <Button
          onClick={() => setSubtitleOn(!subtitleOn)}
          variant="ghost"
          size="icon"
          className={cn(subtitleOn ? "text-primary" : "text-muted-foreground")}
          title="자막 토글 (S)"
        >
          {subtitleOn ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={playbackRate !== 1 ? "secondary" : "outline"}
              size="sm"
              className="font-mono text-xs"
            >
              {playbackRate}x
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2" align="center">
            <div className="grid grid-cols-2 gap-1">
              {SPEED_PRESETS.map((sp) => (
                <Button
                  key={sp}
                  variant={playbackRate === sp ? "default" : "outline"}
                  size="sm"
                  className="text-xs"
                  onClick={() => setSpeed(sp)}
                >
                  {sp}x
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {currentStep === 5 && (
        <RecordingPanel
          audioRef={audioRef}
          recordingKey={`${currentUnit}_${currentIndex}`}
          materialId={materialId}
        />
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <Button onClick={goPrev} variant="outline" size="sm" disabled={currentIndex === 0}>
          <ChevronLeft className="h-4 w-4" />
          이전
        </Button>
        <span className="font-mono text-sm text-muted-foreground">
          {currentIndex + 1} / {items.length}
        </span>
        <Button
          onClick={goNext}
          variant="outline"
          size="sm"
          disabled={currentIndex >= items.length - 1}
        >
          다음
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
