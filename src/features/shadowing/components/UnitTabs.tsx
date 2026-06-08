"use client";

import { Button } from "@/components/ui/button";
import { UNIT_LABELS, UNIT_ORDER } from "../lib/steps";
import { useShadowingStore } from "../store/shadowing-store";

export default function UnitTabs() {
  const currentUnit = useShadowingStore((s) => s.currentUnit);
  const setUnit = useShadowingStore((s) => s.setUnit);

  return (
    <div className="flex flex-wrap gap-2">
      {UNIT_ORDER.map((unit) => (
        <Button
          key={unit}
          variant={currentUnit === unit ? "default" : "outline"}
          size="sm"
          onClick={() => setUnit(unit)}
        >
          {UNIT_LABELS[unit]}
        </Button>
      ))}
    </div>
  );
}
