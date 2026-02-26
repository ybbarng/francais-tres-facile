"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Playlist from "@/components/Playlist";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExerciseWithProgress } from "@/types";

const SECTION_LABELS: Record<string, string> = {
  "comprendre-actualite": "Comprendre l'actualité",
  "communiquer-quotidien": "Communiquer au quotidien",
};

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1C2"];

const MONTHS = [
  { key: "janvier", name: "Janvier", startIndex: 0, endIndex: 31 },
  { key: "fevrier", name: "Février", startIndex: 31, endIndex: 59 },
  { key: "mars", name: "Mars", startIndex: 59, endIndex: 90 },
];

interface FilterOptions {
  sections: string[];
  levels: string[];
  categories: string[];
}

export default function PlaylistPage() {
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sections: [],
    levels: [],
    categories: [],
  });
  const [monthMap, setMonthMap] = useState<Map<string, string>>(new Map());

  // Filters
  const [section, setSection] = useState("");
  const [level, setLevel] = useState("");
  const [category, setCategory] = useState("");
  const [completed, setCompleted] = useState("");
  const [month, setMonth] = useState("");

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (section) params.set("section", section);
      if (level) params.set("level", level);

      const res = await fetch(`/api/exercises/filters?${params}`);
      const data = await res.json();

      setFilterOptions({
        sections: data.sections,
        levels: data.levels.sort(
          (a: string, b: string) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b)
        ),
        categories: data.categories.sort(),
      });
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  }, [section, level]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch month mapping once
  useEffect(() => {
    const fetchMonthMap = async () => {
      try {
        const res = await fetch("/api/exercises/completed");
        if (!res.ok) return;
        const data: ExerciseWithProgress[] = await res.json();
        const sorted = [...data].sort((a, b) => {
          const dateA = a.progress?.completedAt ? new Date(a.progress.completedAt).getTime() : 0;
          const dateB = b.progress?.completedAt ? new Date(b.progress.completedAt).getTime() : 0;
          return dateA - dateB;
        });
        const map = new Map<string, string>();
        for (const m of MONTHS) {
          const slice = sorted.slice(m.startIndex, m.endIndex);
          for (const ex of slice) {
            map.set(ex.id, m.key);
          }
        }
        setMonthMap(map);
      } catch (error) {
        console.error("Failed to fetch month map:", error);
      }
    };
    fetchMonthMap();
  }, []);

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ hasAudio: "true", limit: "100" });
      if (section) params.set("section", section);
      if (level) params.set("level", level);
      if (category) params.set("category", category);
      if (month) {
        params.set("completed", "true");
      } else if (completed) {
        params.set("completed", completed);
      }

      const res = await fetch(`/api/exercises?${params}`);
      const data = await res.json();
      setExercises(data.exercises);
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
    } finally {
      setLoading(false);
    }
  }, [section, level, category, completed, month]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Apply month filter client-side
  const displayedExercises = month
    ? exercises.filter((e) => monthMap.get(e.id) === month)
    : exercises;

  // Filter handlers
  const handleSectionChange = (value: string) => {
    setSection(value === "all" ? "" : value);
    setLevel("");
    setCategory("");
  };

  const handleLevelChange = (value: string) => {
    setLevel(value === "all" ? "" : value);
    setCategory("");
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? "" : value);
  };

  const handleCompletedChange = (value: string) => {
    setCompleted(value === "all" ? "" : value);
    if (value !== "true") setMonth("");
  };

  const handleMonthChange = (value: string) => {
    setMonth(value === "all" ? "" : value);
    if (value !== "all") setCompleted("");
  };

  const clearFilters = () => {
    setSection("");
    setLevel("");
    setCategory("");
    setCompleted("");
    setMonth("");
  };

  const hasActiveFilters = section || level || category || completed || month;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Liste de lecture</h1>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            {/* Section */}
            <div className="min-w-[200px]">
              <label
                htmlFor="filter-section"
                className="block text-sm font-medium text-muted-foreground mb-1.5"
              >
                Section
              </label>
              <Select value={section || "all"} onValueChange={handleSectionChange}>
                <SelectTrigger id="filter-section" className="w-full">
                  <SelectValue placeholder="Toutes les sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sections</SelectItem>
                  {filterOptions.sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      {SECTION_LABELS[s] || s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level */}
            <div className="min-w-[150px]">
              <label
                htmlFor="filter-level"
                className="block text-sm font-medium text-muted-foreground mb-1.5"
              >
                Niveau
              </label>
              <Select value={level || "all"} onValueChange={handleLevelChange}>
                <SelectTrigger id="filter-level" className="w-full">
                  <SelectValue placeholder="Tous les niveaux" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les niveaux</SelectItem>
                  {filterOptions.levels.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="min-w-[180px]">
              <label
                htmlFor="filter-category"
                className="block text-sm font-medium text-muted-foreground mb-1.5"
              >
                Catégorie
              </label>
              <Select value={category || "all"} onValueChange={handleCategoryChange}>
                <SelectTrigger id="filter-category" className="w-full">
                  <SelectValue placeholder="Toutes les catégories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les catégories</SelectItem>
                  {filterOptions.categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Completion Status */}
            <div className="min-w-[150px]">
              <label
                htmlFor="filter-status"
                className="block text-sm font-medium text-muted-foreground mb-1.5"
              >
                Statut
              </label>
              <Select
                value={month ? "true" : completed || "all"}
                onValueChange={handleCompletedChange}
                disabled={!!month}
              >
                <SelectTrigger id="filter-status" className="w-full">
                  <SelectValue placeholder="Tous les statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  <SelectItem value="true">Terminé</SelectItem>
                  <SelectItem value="false">En cours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Month (Buzz Challenge) */}
            <div className="min-w-[150px]">
              <label
                htmlFor="filter-month"
                className="block text-sm font-medium text-muted-foreground mb-1.5"
              >
                Mois
              </label>
              <Select value={month || "all"} onValueChange={handleMonthChange}>
                <SelectTrigger id="filter-month" className="w-full">
                  <SelectValue placeholder="Tous les mois" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les mois</SelectItem>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-sm mt-4">
              <span className="text-muted-foreground">Filtres actifs:</span>
              {section && <Badge variant="a2">{SECTION_LABELS[section] || section}</Badge>}
              {level && <Badge variant="a1">{level}</Badge>}
              {category && <Badge variant="secondary">{category}</Badge>}
              {(completed || month) && (
                <Badge variant={completed === "false" ? "outline" : "success"}>
                  {completed === "false" ? "En cours" : "Terminé"}
                </Badge>
              )}
              {month && (
                <Badge variant="secondary">{MONTHS.find((m) => m.key === month)?.name}</Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3 mr-1" />
                Effacer tout
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Playlist */}
      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <Playlist exercises={displayedExercises} />
      )}
    </div>
  );
}
