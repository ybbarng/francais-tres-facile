"use client";

import { Check, Download, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOfflineCache } from "../hooks/use-offline-cache";

interface OfflineSaveButtonProps {
  materialId: string;
  updatedAt: string;
  urls: string[];
}

export default function OfflineSaveButton({ materialId, updatedAt, urls }: OfflineSaveButtonProps) {
  const { status, progress, save, remove } = useOfflineCache({
    materialId,
    updatedAt,
    urls,
  });

  if (status === "unsupported") return null;

  if (status === "caching") {
    const pct =
      progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
    return (
      <Button variant="secondary" size="sm" disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        저장 중 {progress ? `${progress.done}/${progress.total}` : ""} ({pct}%)
      </Button>
    );
  }

  if (status === "cached") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (confirm("이 자료의 오프라인 캐시를 지울까요?")) remove();
        }}
        className="gap-2 text-green-700 dark:text-green-400"
        title="오프라인 저장 해제"
      >
        <Check className="h-4 w-4" />
        저장됨
      </Button>
    );
  }

  if (status === "stale") {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={save}
        disabled={urls.length === 0}
        className="gap-2 text-amber-700 dark:text-amber-400"
        title="새 버전이 있어요. 다시 받기"
      >
        <RefreshCw className="h-4 w-4" />
        업데이트
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={save}
      disabled={urls.length === 0 || status === "unknown"}
      className="gap-2"
      title="오프라인에서도 듣기"
    >
      <Download className="h-4 w-4" />
      오프라인 저장
    </Button>
  );
}
