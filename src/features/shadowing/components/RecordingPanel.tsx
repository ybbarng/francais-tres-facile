"use client";

import { ArrowLeftRight, Download, Mic, Play, Square } from "lucide-react";
import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface RecordingPanelProps {
  audioRef: RefObject<HTMLAudioElement | null>;
  recordingKey: string;
  materialId: string;
}

export default function RecordingPanel({
  audioRef,
  recordingKey,
  materialId,
}: RecordingPanelProps) {
  const [recordings, setRecordings] = useState<Record<string, Blob>>({});
  const [recording, setRecording] = useState(false);
  const [status, setStatus] = useState("녹음 안 됨");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const playbackRef = useRef<HTMLAudioElement | null>(null);

  const hasRecording = !!recordings[recordingKey];

  useEffect(() => {
    if (hasRecording) {
      setStatus("녹음 완료. 비교 가능.");
    } else {
      setStatus("녹음 안 됨");
    }
  }, [hasRecording]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      recorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setRecordings((prev) => ({ ...prev, [recordingKey]: blob }));
        for (const track of stream.getTracks()) track.stop();
      };
      mr.start();
      setRecording(true);
      setStatus("🔴 녹음 중...");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStatus(`마이크 권한 거부: ${msg}`);
    }
  }, [recordingKey]);

  const stopRecording = useCallback(() => {
    recorderRef.current?.stop();
    setRecording(false);
  }, []);

  const playRecording = useCallback(() => {
    const blob = recordings[recordingKey];
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    if (playbackRef.current) {
      playbackRef.current.pause();
    }
    const audio = new Audio(url);
    playbackRef.current = audio;
    audio.play();
  }, [recordings, recordingKey]);

  const compareAB = useCallback(async () => {
    const original = audioRef.current;
    const blob = recordings[recordingKey];
    if (!original || !blob) return;
    // 비교 재생은 ended를 기다리기 때문에 loop를 잠깐 꺼둔다.
    const prevLoop = original.loop;
    original.loop = false;
    original.currentTime = 0;
    try {
      await original.play();
    } catch {
      original.loop = prevLoop;
      return;
    }
    await new Promise<void>((resolve) => {
      const onEnded = () => {
        original.removeEventListener("ended", onEnded);
        resolve();
      };
      original.addEventListener("ended", onEnded);
    });
    original.loop = prevLoop;
    await new Promise((r) => setTimeout(r, 500));
    playRecording();
  }, [audioRef, recordings, recordingKey, playRecording]);

  const downloadHref = hasRecording ? URL.createObjectURL(recordings[recordingKey]) : undefined;
  const downloadName = `${materialId}_${recordingKey}.webm`;

  return (
    <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 p-4 dark:bg-amber-950/40">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Mic className="h-4 w-4" />
        셀프 체크 — 녹음 후 비교
      </h3>
      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <Button onClick={stopRecording} variant="destructive" size="sm" className="animate-pulse">
            <Square className="h-4 w-4" />
            녹음 중지
          </Button>
        ) : (
          <Button onClick={startRecording} variant="default" size="sm">
            <Mic className="h-4 w-4" />
            녹음 시작
          </Button>
        )}
        <Button onClick={playRecording} variant="outline" size="sm" disabled={!hasRecording}>
          <Play className="h-4 w-4" />내 녹음 재생
        </Button>
        <Button onClick={compareAB} variant="outline" size="sm" disabled={!hasRecording}>
          <ArrowLeftRight className="h-4 w-4" />
          원본 / 내 녹음 비교
        </Button>
        {hasRecording && downloadHref && (
          <a
            href={downloadHref}
            download={downloadName}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs hover:bg-accent"
          >
            <Download className="h-3.5 w-3.5" />
            다운로드
          </a>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{status}</p>
    </div>
  );
}
