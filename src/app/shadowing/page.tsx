"use client";

import { Headphones, HelpCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import HelpModal from "@/features/shadowing/components/HelpModal";
import MaterialList from "@/features/shadowing/components/MaterialList";
import type { ShadowingMaterialSummary } from "@/features/shadowing/types";

export default function ShadowingHomePage() {
  const [materials, setMaterials] = useState<ShadowingMaterialSummary[] | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    fetch("/shadowing/data/materials.json")
      .then((r) => r.json())
      .then((data: { materials: ShadowingMaterialSummary[] }) => setMaterials(data.materials))
      .catch((e) => {
        console.error("Failed to load materials.json", e);
        setMaterials([]);
      });
  }, []);

  return (
    <div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            <Headphones className="h-5 w-5 text-primary" />
            <CardTitle>쉐도잉 자료</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setHelpOpen(true)}
            title="쉐도잉 방법"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {materials === null ? (
            <div className="space-y-3">
              <Skeleton className="h-24 rounded-xl" />
              <Skeleton className="h-24 rounded-xl" />
            </div>
          ) : (
            <MaterialList materials={materials} />
          )}
        </CardContent>
      </Card>

      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  );
}
