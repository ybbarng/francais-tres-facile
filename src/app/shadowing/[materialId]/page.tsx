"use client";

import { ArrowLeft, HelpCircle } from "lucide-react";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import HelpModal from "@/features/shadowing/components/HelpModal";
import ItemSelector from "@/features/shadowing/components/ItemSelector";
import ShadowingPlayer from "@/features/shadowing/components/ShadowingPlayer";
import StepBar from "@/features/shadowing/components/StepBar";
import UnitTabs from "@/features/shadowing/components/UnitTabs";
import { buildItems } from "@/features/shadowing/lib/items";
import { useShadowingStore } from "@/features/shadowing/store/shadowing-store";
import type { ShadowingMaterial, ShadowingMaterialSummary } from "@/features/shadowing/types";

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
  const reset = useShadowingStore((s) => s.reset);

  useEffect(() => {
    reset();
  }, [reset]);

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
            {summary.subtitle && (
              <p className="truncate text-xs text-muted-foreground">{summary.subtitle}</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setHelpOpen(true)}
          title="쉐도잉 방법"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">① 학습 단위 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitTabs />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">② 항목 선택</CardTitle>
        </CardHeader>
        <CardContent>
          <ItemSelector items={items} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">③ 학습 단계</CardTitle>
        </CardHeader>
        <CardContent>
          <StepBar />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <ShadowingPlayer items={items} materialId={summary.id} />
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
