import type { ShadowingMaterial, ShadowingPlayableItem, ShadowingUnit } from "../types";
import { UNIT_LABELS } from "./steps";

export function buildItems(
  material: ShadowingMaterial,
  unit: ShadowingUnit
): ShadowingPlayableItem[] {
  if (unit === "full") {
    return [
      {
        label: "전체",
        text: material.full_text,
        audioFile: material.meta.audio_full,
        duration: material.meta.duration,
      },
    ];
  }

  const arr = material[unit] ?? [];
  const label = UNIT_LABELS[unit];
  return arr.map((x, i) => ({
    label: `${label} ${i + 1}`,
    text: x.text,
    audioFile: x.audio_file,
    duration: x.end - x.start,
  }));
}
