"use client";

import { useCallback, useEffect, useState } from "react";

const MIN_HEIGHT = 600;
const DEFAULT_HEIGHT = 800;

interface H5PQuizProps {
  h5pUrl: string;
  exerciseId: string;
  onScoreReceived?: (score: { score: number; maxScore: number }) => void;
}

export default function H5PQuiz({ h5pUrl, exerciseId, onScoreReceived }: H5PQuizProps) {
  const [quizActive, setQuizActive] = useState(false);
  const [autoScoreDetected, setAutoScoreDetected] = useState(false);
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

  // H5P 메시지 리스너 (xAPI 결과 + resize)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // H5P 도메인 확인
      if (!event.origin.includes("h5p")) return;

      try {
        const data = event.data;

        // H5P resize 메시지 감지 (다양한 형식 처리)
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

        // xAPI 결과 감지
        if (data?.statement?.result?.score) {
          const { raw, max } = data.statement.result.score;
          setAutoScoreDetected(true);
          onScoreReceived?.({ score: raw, maxScore: max });
        }
      } catch {
        // 파싱 실패 무시
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onScoreReceived]);

  const handleManualScoreSubmit = useCallback(() => {
    const match = manualScore.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      const score = parseInt(match[1], 10);
      const maxScore = parseInt(match[2], 10);
      onScoreReceived?.({ score, maxScore });
    }
  }, [manualScore, onScoreReceived]);

  return (
    <div className="relative">
      {/* 비활성 상태: 오버레이로 클릭 차단 */}
      {!quizActive && (
        <button
          onClick={() => setQuizActive(true)}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center
                     bg-black/40 text-white cursor-pointer transition-all hover:bg-black/50"
        >
          <span className="text-4xl mb-4">🎯</span>
          <span className="text-xl font-bold">Commencer le quiz</span>
          <span className="text-sm mt-2 text-gray-200">Cliquez pour passer en mode quiz</span>
        </button>
      )}

      {/* iframe: 비활성 시 pointer-events: none */}
      <iframe
        src={h5pUrl}
        className="w-full rounded-lg border border-gray-200 transition-[height] duration-300"
        style={{
          pointerEvents: quizActive ? "auto" : "none",
          height: `${iframeHeight}px`,
          overflow: "hidden",
        }}
        title={`Quiz ${exerciseId}`}
        allow="fullscreen"
        scrolling="no"
      />

      {/* 활성 상태: 컨트롤 버튼들 */}
      {quizActive && (
        <div className="mt-4 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setQuizActive(false)}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg
                         text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
            >
              <span>↑</span>
              <span>Retour au mode défilement</span>
            </button>
            <button
              onClick={() => setIframeHeight((h) => h + 300)}
              className="px-4 py-3 bg-blue-100 hover:bg-blue-200 rounded-lg
                         text-blue-700 font-medium transition-colors flex items-center justify-center gap-2"
              title="Agrandir le quiz"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            </button>
          </div>

          {/* 수동 점수 입력 (자동 감지 실패 시) */}
          {!autoScoreDetected && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 mb-3">
                Entrez votre score après avoir terminé le quiz (ex: 15/23)
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualScore}
                  onChange={(e) => setManualScore(e.target.value)}
                  placeholder="15/23"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleManualScoreSubmit}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg
                           hover:bg-blue-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </div>
          )}

          {autoScoreDetected && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">✓ Score détecté automatiquement</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
