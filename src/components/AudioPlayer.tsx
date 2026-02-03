"use client";

import { FastForward, Pause, Play, Rewind } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  onPlayCountUpdate?: () => void;
}

export default function AudioPlayer({ audioUrl, title, onPlayCountUpdate }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasCountedPlay, setHasCountedPlay] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
      // 재생 횟수 카운트 (한 세션당 한 번만)
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

  const skip = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-muted-foreground truncate flex-1">{title}</h3>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
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

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          {/* -10s */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(-10)}
            title="-10 secondes"
            className="text-muted-foreground hover:text-foreground"
          >
            <Rewind className="w-5 h-5" />
          </Button>

          {/* Play/Pause */}
          <Button size="icon" onClick={togglePlay} className="h-14 w-14 rounded-full">
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
          </Button>

          {/* +10s */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => skip(10)}
            title="+10 secondes"
            className="text-muted-foreground hover:text-foreground"
          >
            <FastForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Speed control */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="text-xs text-muted-foreground">Vitesse :</span>
          {[0.5, 0.75, 1, 1.25, 1.5].map((speed) => (
            <Button
              key={speed}
              variant={playbackRate === speed ? "default" : "secondary"}
              size="sm"
              onClick={() => handleSpeedChange(speed)}
              className="px-2 py-1 h-7 text-xs"
            >
              {speed}x
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
