"use client";

import { useCallback, useEffect, useState } from "react";
import { speakableText } from "../lib/expressions";

/** 브라우저 음성 합성의 프랑스어 음성. 기기에 없으면 voice 가 null 이고 🔊를 숨긴다 */
export function useFrenchVoice() {
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const pick = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        setVoice(
          voices.find((v) => /^fr[-_]FR/i.test(v.lang)) ??
            voices.find((v) => /^fr/i.test(v.lang)) ??
            null
        );
      } catch {
        setVoice(null);
      }
    };
    pick();
    window.speechSynthesis.addEventListener("voiceschanged", pick);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", pick);
  }, []);

  const speak = useCallback(
    (text: string) => {
      try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(speakableText(text));
        u.lang = "fr-FR";
        if (voice) u.voice = voice;
        u.rate = 0.85;
        window.speechSynthesis.speak(u);
      } catch {
        // 음성이 없는 기기에서는 조용히 넘어간다
      }
    },
    [voice]
  );

  return { available: voice !== null, speak };
}
