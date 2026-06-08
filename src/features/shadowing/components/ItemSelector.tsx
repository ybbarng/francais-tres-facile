"use client";

import { cn } from "@/lib/utils";
import { previewText } from "../lib/format";
import { useShadowingStore } from "../store/shadowing-store";
import type { ShadowingPlayableItem } from "../types";

interface ItemSelectorProps {
  items: ShadowingPlayableItem[];
}

export default function ItemSelector({ items }: ItemSelectorProps) {
  const currentIndex = useShadowingStore((s) => s.currentIndex);
  const setIndex = useShadowingStore((s) => s.setIndex);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">항목이 없습니다.</p>;
  }

  return (
    <div className="flex max-h-72 flex-col gap-1.5 overflow-y-auto pr-1">
      {items.map((it, i) => {
        const active = i === currentIndex;
        return (
          <button
            type="button"
            key={`${it.label}-${i}`}
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-md border px-3 py-2 text-left text-sm transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary/50 hover:bg-accent/50"
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm">{it.label}</strong>
              <span
                className={cn(
                  "shrink-0 font-mono text-xs",
                  active ? "opacity-80" : "text-muted-foreground"
                )}
              >
                {it.duration.toFixed(1)}초
              </span>
            </div>
            <p className={cn("mt-1 line-clamp-2 text-xs", active ? "opacity-80" : "opacity-70")}>
              {previewText(it.text)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
