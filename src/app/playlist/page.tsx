"use client";

import { useEffect, useState } from "react";
import Playlist from "@/components/Playlist";
import { Skeleton } from "@/components/ui/skeleton";
import type { ExerciseWithProgress } from "@/types";

export default function PlaylistPage() {
  const [exercises, setExercises] = useState<ExerciseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchExercises = async () => {
      try {
        const res = await fetch("/api/exercises?limit=10000");
        const data = await res.json();
        setExercises(data.exercises);
      } catch (error) {
        console.error("Failed to fetch exercises:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchExercises();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Liste de lecture</h1>
      <Playlist exercises={exercises} />
    </div>
  );
}
