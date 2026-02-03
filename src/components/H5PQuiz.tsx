"use client";

import { useCallback, useEffect, useState } from "react";

interface H5PQuizProps {
  h5pUrl: string;
  exerciseId: string;
  onScoreReceived?: (score: { score: number; maxScore: number }) => void;
}

export default function H5PQuiz({ h5pUrl, exerciseId, onScoreReceived }: H5PQuizProps) {
  const [quizActive, setQuizActive] = useState(false);
  const [autoScoreDetected, setAutoScoreDetected] = useState(false);
  const [manualScore, setManualScore] = useState("");

  // H5P xAPI 이벤트 리스너
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // H5P 도메인 확인
      if (!event.origin.includes("h5p")) return;

      try {
        const data = event.data;
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
        className="w-full rounded-lg border border-gray-200"
        style={{
          pointerEvents: quizActive ? "auto" : "none",
          height: "700px",
        }}
        title={`Quiz ${exerciseId}`}
        allow="fullscreen"
      />

      {/* 활성 상태: 컨트롤 버튼들 */}
      {quizActive && (
        <div className="mt-4 space-y-4">
          <button
            onClick={() => setQuizActive(false)}
            className="w-full px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg
                       text-gray-700 font-medium transition-colors flex items-center justify-center gap-2"
          >
            <span>↑</span>
            <span>Retour au mode défilement</span>
          </button>

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
