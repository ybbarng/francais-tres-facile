"use client";

import { useCallback, useEffect, useState } from "react";
import type { ExerciseWithProgress } from "@/types";
import ExerciseCard from "./ExerciseCard";

interface ExerciseListProps {
  initialExercises?: ExerciseWithProgress[];
}

export default function ExerciseList({ initialExercises = [] }: ExerciseListProps) {
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>(initialExercises);
  const [loading, setLoading] = useState(!initialExercises.length);
  const [level, setLevel] = useState<string>("");
  const [completed, setCompleted] = useState<string>("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchExercises = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (level) params.set("level", level);
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
  }, [level, completed, search, page]);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchExercises();
  };

  return (
    <div>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-100">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un titre..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg
                       focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <select
            value={level}
            onChange={(e) => {
              setLevel(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les niveaux</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>

          <select
            value={completed}
            onChange={(e) => {
              setCompleted(e.target.value);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Terminé</option>
            <option value="false">En cours</option>
          </select>

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors"
          >
            Rechercher
          </button>
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
