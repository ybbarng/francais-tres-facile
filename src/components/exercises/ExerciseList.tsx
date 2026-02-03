"use client";

import { useCallback, useEffect, useState } from "react";
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
      if (completed) params.set("completed", completed);
      if (search) params.set("search", search);
      params.set("page", page.toString());

      const res = await fetch(`/api/exercises?${params}`);
      const data = await res.json();
      setExercises(data.exercises);
      setTotalPages(data.pagination.totalPages);
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
    setSection(value);
    setLevel("");
    setCategory("");
    setPage(1);
  };

  const handleLevelChange = (value: string) => {
    setLevel(value);
    setCategory("");
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchExercises();
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search */}
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un titre..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 transition-colors"
            >
              Rechercher
            </button>
          </div>

          {/* Hierarchical Filters: Section -> Level -> Category */}
          <div className="flex flex-wrap gap-4">
            {/* Section */}
            <div className="min-w-[200px]">
              <label
                htmlFor="filter-section"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Section
              </label>
              <select
                id="filter-section"
                value={section}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les sections</option>
                {filterOptions.sections.map((s) => (
                  <option key={s} value={s}>
                    {SECTION_LABELS[s] || s}
                  </option>
                ))}
              </select>
            </div>

            {/* Level */}
            <div className="min-w-[150px]">
              <label
                htmlFor="filter-level"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Niveau
              </label>
              <select
                id="filter-level"
                value={level}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les niveaux</option>
                {filterOptions.levels.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div className="min-w-[180px]">
              <label
                htmlFor="filter-category"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Catégorie
              </label>
              <select
                id="filter-category"
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Toutes les catégories</option>
                {filterOptions.categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Completion Status */}
            <div className="min-w-[150px]">
              <label
                htmlFor="filter-status"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Statut
              </label>
              <select
                id="filter-status"
                value={completed}
                onChange={(e) => {
                  setCompleted(e.target.value);
                  setPage(1);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg
                         focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="true">Terminé</option>
                <option value="false">En cours</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(section || level || category) && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Filtres actifs:</span>
              {section && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                  {SECTION_LABELS[section] || section}
                </span>
              )}
              {level && (
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">{level}</span>
              )}
              {category && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded">{category}</span>
              )}
              <button
                type="button"
                onClick={() => {
                  setSection("");
                  setLevel("");
                  setCategory("");
                  setPage(1);
                }}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                Effacer tout
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-gray-500">Chargement...</p>
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Aucun exercice disponible.</p>
          <p className="text-sm mt-2">Veuillez d'abord synchroniser avec RFI.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {exercises.map((exercise) => (
              <ExerciseCard key={exercise.id} exercise={exercise} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Précédent
              </button>
              <span className="px-4 py-2 text-gray-600">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
