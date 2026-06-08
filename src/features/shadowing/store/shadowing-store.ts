import { create } from "zustand";
import type { ShadowingStep, ShadowingUnit } from "../types";

interface ShadowingState {
  currentUnit: ShadowingUnit;
  currentIndex: number;
  currentStep: ShadowingStep;
  repeatOn: boolean;
  subtitleOn: boolean;
  setUnit: (unit: ShadowingUnit) => void;
  setIndex: (index: number) => void;
  setStep: (step: ShadowingStep) => void;
  setSubtitleOn: (on: boolean) => void;
  toggleRepeat: () => void;
  reset: () => void;
}

export const useShadowingStore = create<ShadowingState>((set) => ({
  currentUnit: "sentences",
  currentIndex: 0,
  currentStep: 1,
  repeatOn: false,
  subtitleOn: false,
  setUnit: (unit) => set({ currentUnit: unit, currentIndex: 0 }),
  setIndex: (index) => set({ currentIndex: index }),
  setStep: (step) => set({ currentStep: step }),
  setSubtitleOn: (on) => set({ subtitleOn: on }),
  toggleRepeat: () => set((s) => ({ repeatOn: !s.repeatOn })),
  reset: () =>
    set({
      currentUnit: "sentences",
      currentIndex: 0,
      currentStep: 1,
      repeatOn: false,
      subtitleOn: false,
    }),
}));
