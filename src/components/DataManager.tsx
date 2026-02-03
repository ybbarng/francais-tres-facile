"use client";

import { Check, Copy, Download, Loader2, Upload, X } from "lucide-react";
import { useState } from "react";
import { compress, decompress } from "@/lib/compression";
import { type AllProgress, getAllProgress, importProgress } from "@/lib/progress";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";

export default function DataManager() {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportedData, setExportedData] = useState("");
  const [importData, setImportData] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError("");
    try {
      const data = getAllProgress();
      const json = JSON.stringify(data);
      const compressed = await compress(json);
      setExportedData(compressed);
    } catch (e) {
      setError("Erreur lors de l'exportation des données.");
      console.error(e);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(exportedData);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError("Impossible de copier dans le presse-papiers.");
      console.error(e);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setError("");
    setSuccess("");
    try {
      const json = await decompress(importData.trim());
      const data: AllProgress = JSON.parse(json);

      // 기본 유효성 검사
      if (typeof data !== "object" || data === null) {
        throw new Error("Format de données invalide");
      }

      importProgress(data);
      const count = Object.keys(data).length;
      setSuccess(`${count} exercice(s) importé(s) avec succès !`);
      setImportData("");

      // 페이지 새로고침으로 데이터 반영
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Format")) {
        setError(e.message);
      } else {
        setError("Les données sont invalides ou corrompues. Vérifiez et réessayez.");
      }
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  };

  const progressCount = Object.keys(getAllProgress()).length;

  return (
    <div className="flex gap-2">
      {/* Export Dialog */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setExportedData("");
              setError("");
              handleExport();
            }}
          >
            <Download className="h-4 w-4 mr-1" />
            Sauvegarder
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Sauvegarder ma progression</DialogTitle>
            <DialogDescription>
              Copiez ce code pour conserver votre progression. Vous pourrez le réimporter plus tard
              sur cet appareil ou un autre.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {isExporting ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Préparation...</span>
              </div>
            ) : exportedData ? (
              <>
                <div className="text-sm text-muted-foreground">
                  {progressCount} exercice(s) sauvegardé(s)
                </div>
                <Textarea
                  value={exportedData}
                  readOnly
                  rows={6}
                  className="font-mono text-xs"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <Button onClick={handleCopy} className="w-full">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copié !
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier le code
                    </>
                  )}
                </Button>
              </>
            ) : error ? (
              <div className="text-destructive text-sm">{error}</div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setImportData("");
              setError("");
              setSuccess("");
            }}
          >
            <Upload className="h-4 w-4 mr-1" />
            Restaurer
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Restaurer ma progression</DialogTitle>
            <DialogDescription>
              Collez le code de sauvegarde pour récupérer votre progression.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {success ? (
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <Check className="h-5 w-5" />
                <span>{success}</span>
              </div>
            ) : (
              <>
                <Textarea
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  placeholder="Collez votre code de sauvegarde ici..."
                  rows={6}
                  className="font-mono text-xs"
                />

                {error && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <X className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  onClick={handleImport}
                  disabled={!importData.trim() || isImporting}
                  className="w-full"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importation...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Restaurer la progression
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
