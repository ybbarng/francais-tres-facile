"use client";

import { ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import HelpModal from "@/features/shadowing/components/HelpModal";
import ItemSelector from "@/features/shadowing/components/ItemSelector";
import OfflineSaveButton from "@/features/shadowing/components/OfflineSaveButton";
import ShadowingPlayer from "@/features/shadowing/components/ShadowingPlayer";
import StepBar from "@/features/shadowing/components/StepBar";
import UnitTabs from "@/features/shadowing/components/UnitTabs";
import { assetPath } from "@/features/shadowing/lib/assets";
import { relativeTimeKo } from "@/features/shadowing/lib/format";
import { buildItems } from "@/features/shadowing/lib/items";
import { useShadowingStore } from "@/features/shadowing/store/shadowing-store";
import {
  progressKey,
  type ShadowingMaterial,
  type ShadowingMaterialSummary,
  type ShadowingProgressMap,
  type ShadowingProgressRecord,
} from "@/features/shadowing/types";
import { fetchWithAuth } from "@/lib/password";

interface PageProps {
  params: Promise<{ materialId: string }>;
}

export default function MaterialPage({ params }: PageProps) {
  const { materialId } = use(params);
  const [summary, setSummary] = useState<ShadowingMaterialSummary | null>(null);
  const [material, setMaterial] = useState<ShadowingMaterial | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const currentUnit = useShadowingStore((s) => s.currentUnit);
  const currentIndex = useShadowingStore((s) => s.currentIndex);
  const reset = useShadowingStore((s) => s.reset);
  const [progressMap, setProgressMap] = useState<ShadowingProgressMap>({});

  useEffect(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shadowing/progress?materialId=${materialId}`)
      .then((r) => r.json())
      .then((data: { records: ShadowingProgressRecord[] }) => {
        if (cancelled) return;
        const map: ShadowingProgressMap = {};
        for (const r of data.records) {
          map[progressKey(r.unit, r.itemIndex)] = r;
        }
        setProgressMap(map);
      })
      .catch((e) => console.error("Failed to load shadowing progress", e));
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const handleCountUp = useCallback(
    async (count = 1) => {
      try {
        const res = await fetchWithAuth("/api/shadowing/progress", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ materialId, unit: currentUnit, itemIndex: currentIndex, count }),
        });
        if (!res.ok) return;
        const record: ShadowingProgressRecord = await res.json();
        setProgressMap((prev) => ({
          ...prev,
          [progressKey(record.unit, record.itemIndex)]: record,
        }));
      } catch (e) {
        console.error("Failed to increment shadowing progress", e);
      }
    },
    [materialId, currentUnit, currentIndex]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const matRes = await fetch("/shadowing/data/materials.json");
        const matData: { materials: ShadowingMaterialSummary[] } = await matRes.json();
        const found = matData.materials.find((m) => m.id === materialId);
        if (!found) {
          if (!cancelled) setError("자료를 찾을 수 없습니다.");
          return;
        }
        const detailRes = await fetch(`/shadowing/${found.data_file}`);
        const detail: ShadowingMaterial = await detailRes.json();
        if (!cancelled) {
          setSummary(found);
          setMaterial(detail);
        }
      } catch (e) {
        console.error("Failed to load material", e);
        if (!cancelled) setError("자료를 불러오지 못했습니다.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialId]);

  const items = useMemo(() => {
    if (!material) return [];
    return buildItems(material, currentUnit);
  }, [material, currentUnit]);

  const lastStudiedRelative = useMemo(() => {
    const latest = Object.values(progressMap)
      .map((r) => r.lastStudiedAt)
      .filter((s): s is string => !!s)
      .sort()
      .at(-1);
    return relativeTimeKo(latest);
  }, [progressMap]);

  const currentRecord = progressMap[progressKey(currentUnit, currentIndex)] ?? null;

  const offlineUrls = useMemo(() => {
    if (!summary || !material) return [];
    const urls = new Set<string>();
    urls.add(`/shadowing/${summary.data_file}`);
    urls.add(assetPath(material.meta.audio_full));
    for (const arr of [material.sentences, material.paragraphs, material.segments]) {
      for (const it of arr) urls.add(assetPath(it.audio_file));
    }
    return Array.from(urls);
  }, [summary, material]);

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (!summary || !material) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 rounded-md" />
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Button asChild variant="ghost" size="icon-sm">
            <Link href="/shadowing" aria-label="목록으로">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold">{summary.title}</h1>
            <p className="truncate text-xs text-muted-foreground">
              {summary.subtitle}
              {summary.subtitle && lastStudiedRelative && " · "}
              {lastStudiedRelative && `자료 마지막 학습 ${lastStudiedRelative}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <OfflineSaveButton
            materialId={summary.id}
            updatedAt={summary.updatedAt}
            urls={offlineUrls}
          />
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHelpOpen(true)}
            title="쉐도잉 방법"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="gap-3 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">① 학습 단위 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitTabs />
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">② 항목 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemSelector items={items} progressMap={progressMap} unit={currentUnit} />
        </CardContent>
      </Card>

      <Card className="gap-3 py-4">
        <CardHeader className="pb-0">
          <CardTitle className="text-base">③ 학습 단계</CardTitle>
        </CardHeader>
        <CardContent>
          <StepBar />
        </CardContent>
      </Card>

      <Card className="py-4">
        <CardContent>
          <ShadowingPlayer
            items={items}
            materialId={summary.id}
            currentRecord={currentRecord}
            onCountUp={handleCountUp}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4 text-center text-xs text-muted-foreground">
          출처:{" "}
          <a
            href={summary.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {summary.source_url}
          </a>{" "}
          · 학습용 비영리
        </CardContent>
      </Card>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
