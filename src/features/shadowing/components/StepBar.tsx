"use client";

import { Button } from "@/components/ui/button";
import { STEP_ORDER, STEPS } from "../lib/steps";
import { useShadowingStore } from "../store/shadowing-store";

export default function StepBar() {
  const currentStep = useShadowingStore((s) => s.currentStep);
  const setStep = useShadowingStore((s) => s.setStep);
  const conf = STEPS[currentStep];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {STEP_ORDER.map((step) => {
          const s = STEPS[step];
          return (
            <Button
              key={step}
              variant={currentStep === step ? "default" : "outline"}
              size="sm"
              onClick={() => setStep(step)}
              className="h-auto whitespace-normal py-2 text-xs"
            >
              {step}. {s.name}
            </Button>
          );
        })}
      </div>
      <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
        {conf.desc} · 자막 {conf.subtitle ? "ON" : "OFF"} · {conf.speed}x · {conf.repeat}
      </p>
    </div>
  );
}
