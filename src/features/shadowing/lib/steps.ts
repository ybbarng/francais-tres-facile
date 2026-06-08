import type { ShadowingStep } from "../types";

export interface StepConfig {
  name: string;
  subtitle: boolean;
  speed: number;
  repeat: string;
  desc: string;
}

export const STEPS: Record<ShadowingStep, StepConfig> = {
  1: {
    name: "첫 듣기",
    subtitle: false,
    speed: 1.0,
    repeat: "1회",
    desc: "자막 숨기고 의미 추측",
  },
  2: {
    name: "텍스트+듣기",
    subtitle: true,
    speed: 1.0,
    repeat: "2~3회",
    desc: "자막 켜고 모르는 단어 확인",
  },
  3: {
    name: "Slow Shadowing",
    subtitle: true,
    speed: 0.75,
    repeat: "5~10회",
    desc: "텍스트 보며 따라 말하기",
  },
  4: {
    name: "Pure Shadowing",
    subtitle: false,
    speed: 1.0,
    repeat: "3~5회",
    desc: "자막 숨기고 동시 따라 말하기",
  },
  5: {
    name: "셀프 체크",
    subtitle: false,
    speed: 1.0,
    repeat: "1회",
    desc: "본인 녹음 → 원본과 비교",
  },
};

export const STEP_ORDER: ShadowingStep[] = [1, 2, 3, 4, 5];

export const UNIT_LABELS: Record<"sentences" | "paragraphs" | "segments" | "full", string> = {
  sentences: "문장",
  paragraphs: "문단",
  segments: "구간",
  full: "전체",
};

export const UNIT_ORDER: Array<"sentences" | "paragraphs" | "segments" | "full"> = [
  "sentences",
  "paragraphs",
  "segments",
  "full",
];
