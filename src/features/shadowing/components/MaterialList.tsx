"use client";

import { BookOpen, Clock, FileText } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { formatDurationKo } from "../lib/format";
import type { ShadowingMaterialSummary } from "../types";

interface MaterialListProps {
  materials: ShadowingMaterialSummary[];
}

export default function MaterialList({ materials }: MaterialListProps) {
  if (materials.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          등록된 자료가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="space-y-3">
      {materials.map((m) => (
        <li key={m.id}>
          <Link
            href={`/shadowing/${m.id}`}
            className="block rounded-xl border border-border bg-card p-5 transition-all hover:border-primary hover:shadow-md"
          >
            <div className="font-semibold text-primary text-lg">{m.title}</div>
            {m.subtitle && <div className="text-sm text-muted-foreground mt-1">{m.subtitle}</div>}
            <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
              {m.author && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {m.author}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {formatDurationKo(m.duration_sec)}
              </span>
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4" />
                {m.sentence_count} 문장
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
