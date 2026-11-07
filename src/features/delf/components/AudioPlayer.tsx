"use client";

import { Pause, Play, RotateCcw, Unlock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatClock } from "../lib/client";

interface Props {
  src: string;
  /** DELF 규칙대로 들려주는 횟수 */
  plays: number;
  /** 이미 처음부터 튼 횟수(영역을 오가도 유지되게 바깥에서 들고 있다) */
  used: number;
  /** "다시 듣기 허용"으로 더 준 횟수 */
  extra: number;
  onStart: () => void;
  onAllowMore: () => void;
  /** 제출 뒤에는 마음대로 듣게 기본 재생기를 보인다 */
  free: boolean;
}

/** 시험처럼 처음부터만 틀 수 있고, 일시정지 뒤 이어 듣기는 횟수를 쓰지 않는다 */
export default function AudioPlayer({
  src,
  plays,
  used,
  extra,
  onStart,
  onAllowMore,
  free,
}: Props) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);

  const remaining = plays + extra - used;

  useEffect(() => {
    // 영역을 떠나면(컴포넌트가 사라지면) 소리를 멈춘다
    const el = ref.current;
    return () => el?.pause();
  }, []);

  if (free) {
    return <audio controls preload="metadata" src={src} className="w-full" />;
  }

  const start = () => {
    const el = ref.current;
    if (!el || remaining <= 0) return;
    el.currentTime = 0;
    el.play()
      .then(() => {
        onStart();
        setPlaying(true);
        setPaused(false);
      })
      .catch(() => setError(true));
  };

  const togglePause = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      el.play().catch(() => setError(true));
      setPaused(false);
    } else {
      el.pause();
      setPaused(true);
    }
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onEnded={() => {
          setPlaying(false);
          setPaused(false);
          setTime(0);
        }}
        onError={() => setError(true)}
      />
      {error ? (
        <p className="text-sm text-destructive">
          음성을 불러오지 못했습니다. (scripts/delf-audio.ts 로 음성을 만들었는지 확인하세요)
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {playing ? (
            <Button size="sm" variant="outline" onClick={togglePause}>
              {paused ? <Play /> : <Pause />}
              {paused ? "이어 듣기" : "일시정지"}
            </Button>
          ) : remaining > 0 ? (
            <Button size="sm" onClick={start}>
              {used === 0 ? <Play /> : <RotateCcw />}
              {used === 0 ? "듣기" : "다시 듣기"}
            </Button>
          ) : (
            <>
              <Button size="sm" disabled>
                <Play />다 들었습니다
              </Button>
              <Button size="sm" variant="ghost" onClick={onAllowMore}>
                <Unlock />
                다시 듣기 허용
              </Button>
            </>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatClock(time)} / {duration ? formatClock(duration) : "-:--"}
          </span>
          <span className="ml-auto text-sm">
            남은 재생 <b className="tabular-nums">{Math.max(0, remaining)}</b>회
            <span className="text-muted-foreground"> / {plays}회</span>
            {extra > 0 && <span className="text-xs text-muted-foreground"> (+{extra} 허용)</span>}
          </span>
        </div>
      )}
      {duration > 0 && (
        <div className="h-1 overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-primary transition-[width]"
            style={{ width: `${Math.min(100, (time / duration) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
