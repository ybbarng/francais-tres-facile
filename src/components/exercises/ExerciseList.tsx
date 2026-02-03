"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationButton,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getAllProgress } from "@/lib/progress";
import type { ExerciseWithProgress } from "@/types";
import ExerciseCard from "./ExerciseCard";

interface ExerciseListProps {
  initialExercises?: ExerciseWithProgress[];
}

interface FilterOptions {
  sections: string[];
  levels: string[];
  categories: string[];
}

const SECTION_LABELS: Record<string, string> = {
  "comprendre-actualite": "Comprendre l'actualité",
  "communiquer-quotidien": "Communiquer au quotidien",
};

const LEVEL_ORDER = ["A1", "A2", "B1", "B2", "C1C2"];

export default function ExerciseList({ initialExercises = [] }: ExerciseListProps) {
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>(initialExercises);
  const [loading, setLoading] = useState(!initialExercises.length);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    sections: [],
    levels: [],
    categories: [],
  });

  // Filters
  const [section, setSection] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [completed, setCompleted] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch filter options based on current selection
  const fetchFilterOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (section) params.set("section", section);
      if (level) params.set("level", level);

      const res = await fetch(`/api/exercises/filters?${params}`);
      const data = await res.json();

      // Sort levels by predefined order
      const sortedLevels = data.levels.sort(
        (a: string, b: string) => LEVEL_ORDER.indexOf(a) - LEVEL_ORDER.indexOf(b)
      );

      setFilterOptions({
        sections: data.sections,
        levels: sortedLevels,
        categories: data.categories.sort(),
      });
    } catch (error) {
      console.error("Failed to fetch filter options:", error);
    }
  }, [section, level]);

  // Fetch exercises
  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (section) params.set("section", section);
      if (level) params.set("level", level);
      if (category) params.set("category", category);
      if (search) params.set("search", search);
      // Fetch more items for client-side filtering
      params.set("page", "1");
      params.set("limit", "1000");

      const res = await fetch(`/api/exercises?${params}`);
      const data = await res.json();

      // Merge with localStorage progress data
      const allProgress = getAllProgress();
      let exercisesWithProgress: ExerciseWithProgress[] = data.exercises.map(
        (ex: ExerciseWithProgress) => ({
          ...ex,
          progress: allProgress[ex.id] || null,
        })
      );

      // Client-side completed filter
      if (completed === "true") {
        exercisesWithProgress = exercisesWithProgress.filter((ex) => ex.progress?.completed);
      } else if (completed === "false") {
        exercisesWithProgress = exercisesWithProgress.filter((ex) => !ex.progress?.completed);
      }

      // Client-side pagination
      const totalFiltered = exercisesWithProgress.length;
      const itemsPerPage = 24;
      const startIndex = (page - 1) * itemsPerPage;
      const paginatedExercises = exercisesWithProgress.slice(startIndex, startIndex + itemsPerPage);

      setExercises(paginatedExercises);
      setTotalPages(Math.ceil(totalFiltered / itemsPerPage));
    } catch (error) {
      console.error("Failed to fetch exercises:", error);
    } finally {
      setLoading(false);
    }
  }, [section, level, category, completed, search, page]);

  // Initial fetch of filter options
  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  // Fetch exercises when filters change
  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  // Reset dependent filters when parent filter changes
  const handleSectionChange = (value: string) => {
    setSection(value === "all" ? "" : value);
    setLevel("");
    setCategory("");
    setPage(1);
  };

  const handleLevelChange = (value: string) => {
    setLevel(value === "all" ? "" : value);
    setCategory("");
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value === "all" ? "" : value);
    setPage(1);
  };

  const handleCompletedChange = (value: string) => {
    setCompleted(value === "all" ? "" : value);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchExercises();
  };

  const clearFilters = () => {
    setSection("");
    setLevel("");
    setCategory("");
    setCompleted("");
    setPage(1);
  };

  const hasActiveFilters = section || level || category || completed;

  return (
    <div>
      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Search */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un titre..."
                  className="pl-9"
                />
              </div>
              <Button type="submit">Rechercher</Button>
            </div>

            {/* Hierarchical Filters: Section -> Level -> Category */}
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
                <Select value={completed || "all"} onValueChange={handleCompletedChange}>
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
            </div>

            {/* Active Filters Summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filtres actifs:</span>
                {section && <Badge variant="a2">{SECTION_LABELS[section] || section}</Badge>}
                {level && <Badge variant="a1">{level}</Badge>}
                {category && <Badge variant="secondary">{category}</Badge>}
                {completed && (
                  <Badge variant={completed === "true" ? "success" : "outline"}>
                    {completed === "true" ? "Terminé" : "En cours"}
                  </Badge>
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
          </form>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <Card className="py-12">
          <CardContent className="text-center text-muted-foreground">
            <p>Aucun exercice disponible.</p>
            <p className="text-sm mt-2">Veuillez d'abord synchroniser avec RFI.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination className="mt-8">
              <PaginationContent>
                {/* First */}
                <PaginationItem>
                  <PaginationButton
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    aria-label="Première page"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </PaginationButton>
                </PaginationItem>

                {/* Previous */}
                <PaginationItem>
                  <PaginationButton
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    aria-label="Page précédente"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </PaginationButton>
                </PaginationItem>

                {/* Page Numbers */}
                {(() => {
                  const items: React.ReactNode[] = [];
                  const showPages = 5;
                  let start = Math.max(1, page - Math.floor(showPages / 2));
                  const end = Math.min(totalPages, start + showPages - 1);
                  start = Math.max(1, end - showPages + 1);

                  if (start > 1) {
                    items.push(
                      <PaginationItem key={1}>
                        <PaginationButton onClick={() => setPage(1)}>1</PaginationButton>
                      </PaginationItem>
                    );
                    if (start > 2) {
                      items.push(
                        <PaginationItem key="ellipsis-start">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                  }

                  for (let i = start; i <= end; i++) {
                    items.push(
                      <PaginationItem key={i}>
                        <PaginationButton onClick={() => setPage(i)} isActive={i === page}>
                          {i}
                        </PaginationButton>
                      </PaginationItem>
                    );
                  }

                  if (end < totalPages) {
                    if (end < totalPages - 1) {
                      items.push(
                        <PaginationItem key="ellipsis-end">
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    items.push(
                      <PaginationItem key={totalPages}>
                        <PaginationButton onClick={() => setPage(totalPages)}>
                          {totalPages}
                        </PaginationButton>
                      </PaginationItem>
                    );
                  }

                  return items;
                })()}

                {/* Next */}
                <PaginationItem>
                  <PaginationButton
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    aria-label="Page suivante"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </PaginationButton>
                </PaginationItem>

                {/* Last */}
                <PaginationItem>
                  <PaginationButton
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    aria-label="Dernière page"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </PaginationButton>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </>
      )}
    </div>
  );
}
