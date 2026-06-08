"use client";

import { Check, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const MIN_HEIGHT = 600;
const DEFAULT_HEIGHT = 800;

interface H5PQuizProps {
  h5pUrl: string;
  exerciseId: string;
  onScoreReceived?: (score: { score: number; maxScore: number }) => void;
}

export default function H5PQuiz({ h5pUrl, exerciseId, onScoreReceived }: H5PQuizProps) {
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [manualScore, setManualScore] = useState("");
  const [iframeHeight, setIframeHeight] = useState(DEFAULT_HEIGHT);

  // H5P resizer 스크립트 로드
  useEffect(() => {
    const scriptId = "h5p-resizer-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://h5p.org/sites/all/modules/h5p/library/js/h5p-resizer.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // H5P resize 메시지 리스너
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.origin.includes("h5p")) return;

      try {
        const data = event.data;

        // H5P resize 메시지 감지
        if (data?.context === "h5p" && data?.action === "resize") {
          const newHeight = data.scrollHeight || data.height;
          if (newHeight && newHeight > MIN_HEIGHT) {
            setIframeHeight(newHeight + 50);
          }
        }

        // 문자열 형태의 resize 메시지 처리
        if (typeof data === "string") {
          try {
            const parsed = JSON.parse(data);
            if (parsed.context === "h5p" && parsed.action === "resize") {
              const newHeight = parsed.scrollHeight || parsed.height;
              if (newHeight && newHeight > MIN_HEIGHT) {
                setIframeHeight(newHeight + 50);
              }
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }

        // h5p-resizer 형식의 메시지 처리
        if (typeof data === "string" && data.startsWith("h5p")) {
          const match = data.match(/h5p:(\d+)/);
          if (match) {
            const newHeight = parseInt(match[1], 10);
            if (newHeight > MIN_HEIGHT) {
              setIframeHeight(newHeight + 50);
            }
          }
        }
      } catch {
        // 파싱 실패 무시
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleScoreSubmit = useCallback(() => {
    const match = manualScore.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      const score = parseInt(match[1], 10);
      const maxScore = parseInt(match[2], 10);
      onScoreReceived?.({ score, maxScore });
      setScoreSubmitted(true);
    }
  }, [manualScore, onScoreReceived]);

  return (
    <div>
      <iframe
        src={h5pUrl}
        className="w-full rounded-lg border border-border transition-[height] duration-300"
        style={{
          height: `${iframeHeight}px`,
          overflow: "hidden",
        }}
        title={`Quiz ${exerciseId}`}
        allow="fullscreen"
        scrolling="no"
      />

      {/* 점수 입력 */}
      <div className="mt-4">
        {scoreSubmitted ? (
          <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50">
            <CardContent className="py-4 flex items-center gap-2">
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-300">Score enregistré</span>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/50">
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground mb-3">
                Entrez votre score après avoir terminé le quiz (ex: 15/23)
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder="15/23"
                  className="flex-1"
                />
                <Button onClick={handleScoreSubmit}>
                  <Save className="w-4 h-4 mr-1" />
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
