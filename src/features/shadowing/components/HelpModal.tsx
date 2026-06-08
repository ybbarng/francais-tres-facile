"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

interface HelpModalProps {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  { title: "첫 듣기", desc: "자막 숨기고 의미 추측", meta: "자막 OFF · 1.0x · 1회" },
  { title: "텍스트 + 듣기", desc: "자막 켜고 모르는 단어 확인", meta: "자막 ON · 1.0x · 2~3회" },
  { title: "Slow Shadowing", desc: "텍스트 보며 따라 말하기", meta: "자막 ON · 0.75x · 5~10회" },
  {
    title: "Pure Shadowing",
    desc: "텍스트 숨기고 동시 따라 말하기",
    meta: "자막 OFF · 1.0x · 3~5회",
  },
  { title: "셀프 체크", desc: "본인 녹음 → 원본과 비교", meta: "녹음 · 1회" },
];

export default function HelpModal({ open, onClose }: HelpModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <button
      type="button"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <button
        type="button"
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[90vh] w-full max-w-lg cursor-default overflow-y-auto rounded-xl bg-card p-6 text-left shadow-2xl"
      >
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon-sm"
          className="absolute right-3 top-3"
          aria-label="닫기"
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="mb-4 text-xl font-semibold">쉐도잉 방법</h2>
        <ol className="space-y-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-md bg-muted/40 px-3 py-2">
              <div className="text-sm">
                <strong className="text-primary">
                  {i + 1}. {s.title}
                </strong>{" "}
                — {s.desc}
              </div>
              <div className="mt-0.5 text-xs text-muted-foreground">{s.meta}</div>
            </li>
          ))}
        </ol>
        <div className="mt-4 space-y-2 text-sm">
          <p className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
            첫 주는 <strong>0.75배속</strong>으로. 입이 따라가면 점진 가속.
          </p>
          <p className="rounded-md border-l-4 border-amber-400 bg-amber-50 px-3 py-2 dark:bg-amber-950/40">
            같은 자료를 <strong>5~7일 반복</strong>해 자동화될 때까지.
          </p>
        </div>
        <div className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
          단축키: Space 재생/정지 · R 처음 · S 자막 · L 반복 · ←/→ 이전/다음
        </div>
      </button>
    </button>
  );
}
