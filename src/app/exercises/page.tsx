"use client";

import { useState } from "react";
import ExerciseList from "@/components/exercises/ExerciseList";

export default function ExercisesPage() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    added: number;
    updated: number;
    errors: string[];
  } | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);

    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages: 3 }),
      });
      const data = await res.json();
      setSyncResult(data);
      // 페이지 새로고침으로 목록 갱신
      window.location.reload();
    } catch (error) {
      console.error("Sync failed:", error);
      setSyncResult({ added: 0, updated: 0, errors: ["Échec de la synchronisation"] });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Exercices</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-green-600 text-white rounded-lg
                   hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed
                   transition-colors flex items-center gap-2"
        >
          {syncing ? (
            <>
              <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              Synchronisation...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Synchroniser RFI
            </>
          )}
        </button>
      </div>

      {syncResult && (
        <div className={`mb-6 p-4 rounded-lg ${
          syncResult.errors.length > 0
            ? "bg-yellow-50 border border-yellow-200"
            : "bg-green-50 border border-green-200"
        }`}>
          <p className="font-medium">
            Synchronisation terminée : {syncResult.added} ajouté(s), {syncResult.updated} mis à jour
          </p>
          {syncResult.errors.length > 0 && (
            <ul className="mt-2 text-sm text-yellow-700">
              {syncResult.errors.slice(0, 5).map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <ExerciseList />
    </div>
  );
}
