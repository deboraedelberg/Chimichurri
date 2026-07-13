"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileImport, Loader2 } from "@/components/icons";

import { Button } from "@/components/ui/button";

interface BulkResult {
  created: string[];
  skipped: string[];
  errors: { name: string; error: string }[];
}

/**
 * Botón TEMPORAL de carga masiva: sube un archivo (PDF, Word .docx, TXT
 * o JSON) con recetas y crea las que todavía no existen (compara por título).
 */
export function BulkImporter() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setSummary(null);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/recipes/bulk", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudieron importar las recetas");

      const result = data as BulkResult;
      const parts = [
        `${result.created.length} creadas`,
        `${result.skipped.length} ya existían`,
      ];
      if (result.errors.length > 0) {
        parts.push(
          `${result.errors.length} con errores (${result.errors
            .map((e) => e.name)
            .join(", ")})`
        );
      }
      setSummary(parts.join(" · "));
      if (result.created.length > 0) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron importar las recetas");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1">
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="animate-spin" /> : <FileImport />}
        {uploading ? "Importando…" : "Importar archivo"}
      </Button>
      {summary && <p className="text-xs text-muted-foreground">{summary}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
