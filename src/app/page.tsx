"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ExerciseWithProgress } from "@/types";

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentExercises, setRecentExercises] = useState<ExerciseWithProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [progressRes, exercisesRes] = await Promise.all([
          fetch("/api/progress"),
          fetch("/api/exercises?limit=5"),
        ]);

        const progressData = await progressRes.json();
        const exercisesData = await exercisesRes.json();

        setStats(progressData.stats);
        setRecentExercises(exercisesData.exercises);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent" />
        <p className="mt-4 text-gray-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Tableau de bord</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Total des exercices</div>
          <div className="text-3xl font-bold text-gray-900">{stats?.total || 0}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Terminés</div>
          <div className="text-3xl font-bold text-green-600">{stats?.completed || 0}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">En cours</div>
          <div className="text-3xl font-bold text-yellow-600">{stats?.inProgress || 0}</div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Taux de réussite</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.completionRate || 0}%</div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${stats?.completionRate || 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/exercises"
          className="bg-blue-600 text-white rounded-xl p-6 hover:bg-blue-700 transition-colors flex items-center gap-4"
        >
          <div className="p-3 bg-blue-500 rounded-lg">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold">Exercices</div>
            <div className="text-blue-100 text-sm">Commencer à apprendre</div>
          </div>
        </Link>

        <Link
          href="/playlist"
          className="bg-purple-600 text-white rounded-xl p-6 hover:bg-purple-700 transition-colors flex items-center gap-4"
        >
          <div className="p-3 bg-purple-500 rounded-lg">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <div>
            <div className="text-lg font-semibold">Playlist</div>
            <div className="text-purple-100 text-sm">Lecture audio continue</div>
          </div>
        </Link>
      </div>

      {/* Recent Exercises */}
      <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Exercices récents</h2>
          <Link href="/exercises" className="text-sm text-blue-600 hover:text-blue-700">
            Voir tout →
          </Link>
        </div>

        {recentExercises.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>Aucun exercice disponible.</p>
            <p className="text-sm mt-2">
              Veuillez synchroniser avec RFI sur la page{" "}
              <Link href="/exercises" className="text-blue-600 hover:text-blue-700">
                Exercices
              </Link>.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {recentExercises.map((exercise) => (
              <li key={exercise.id}>
                <Link
                  href={`/exercises/${exercise.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        exercise.level === "A1" ? "bg-green-100 text-green-700" :
                        exercise.level === "A2" ? "bg-blue-100 text-blue-700" :
                        exercise.level === "B1" ? "bg-yellow-100 text-yellow-700" :
                        exercise.level === "B2" ? "bg-orange-100 text-orange-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {exercise.level}
                      </span>
                      {exercise.progress?.completed && (
                        <span className="text-green-500">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 truncate">{exercise.title}</p>
                    <p className="text-sm text-gray-500">{exercise.category}</p>
                  </div>

                  <div className="flex items-center gap-2 text-gray-400">
                    {exercise.audioUrl && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z" clipRule="evenodd" />
                      </svg>
                    )}
                    {exercise.h5pEmbedUrl && (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                      </svg>
                    )}
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
