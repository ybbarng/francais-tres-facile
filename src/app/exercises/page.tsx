"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ExerciseList from "@/components/exercises/ExerciseList";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { fetchWithAuth } from "@/lib/password";

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
      const res = await fetchWithAuth("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages: 3 }),
      });

      if (res.status === 401) {
        toast.error("Mot de passe requis pour synchroniser.");
        setSyncing(false);
        return;
      }

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
        <h1 className="text-2xl font-bold">Exercices</h1>
        <Button onClick={handleSync} disabled={syncing} variant="secondary">
          {syncing ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Synchronisation...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Synchroniser RFI
            </>
          )}
        </Button>
      </div>

      {syncResult && (
        <Card
          className={`mb-6 ${
            syncResult.errors.length > 0
              ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950"
              : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
          }`}
        >
          <CardContent className="py-4">
            <p
              className={`font-medium ${
                syncResult.errors.length > 0
                  ? "text-amber-900 dark:text-amber-200"
                  : "text-green-900 dark:text-green-200"
              }`}
            >
              Synchronisation terminée : {syncResult.added} ajouté(s), {syncResult.updated} mis à
              jour
            </p>
            {syncResult.errors.length > 0 && (
              <ul className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                {syncResult.errors.slice(0, 5).map((error, i) => (
                  <li key={`error-${i}`}>{error}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <ExerciseList />
    </div>
  );
}
