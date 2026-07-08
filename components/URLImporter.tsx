"use client";

import { useState } from "react";
import { Link2, Loader2 } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ImportedRecipe } from "@/lib/import";

interface URLImporterProps {
  /** Receta parseada automáticamente — precarga el formulario */
  onRecipe: (recipe: ImportedRecipe) => void;
  /** Fallback manual: URL + texto pegado van a las notas */
  onManual: (payload: { url: string; text: string }) => void;
}

/**
 * Importar desde URL: descarga la página vía /api/import y extrae la
 * receta de los datos estructurados (schema.org). Si el sitio no los
 * publica, se abre el modo manual para copiar y pegar el texto.
 */
export function URLImporter({ onRecipe, onManual }: URLImporterProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);

  function reset() {
    setUrl("");
    setText("");
    setError(null);
    setManualMode(false);
    setImporting(false);
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo importar la receta");
      onRecipe(data as ImportedRecipe);
      setOpen(false);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo importar la receta");
      setManualMode(true);
      setImporting(false);
    }
  }

  function handleManual() {
    onManual({ url: url.trim(), text: text.trim() });
    setOpen(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Link2 />
          Importar desde URL
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar desde un sitio web</DialogTitle>
          <DialogDescription>
            Pega la URL de la receta y la importamos automáticamente: nombre,
            ingredientes, pasos, tiempos y foto.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-url">URL de la receta</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="import-url"
                type="url"
                placeholder="https://ejemplo.com/las-mejores-empanadas"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && url.trim() && !importing) {
                    e.preventDefault();
                    handleImport();
                  }
                }}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={handleImport}
                disabled={!url.trim() || importing}
              >
                {importing && <Loader2 className="animate-spin" />}
                {importing ? "Importando…" : "Importar"}
              </Button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          {manualMode && (
            <div className="space-y-2">
              <Label htmlFor="import-text">
                Plan B: copia el texto de la receta y pégalo acá
              </Label>
              <Textarea
                id="import-text"
                rows={8}
                placeholder={"Ingredientes:\n- 2 tazas de harina\n…\n\nPasos:\n1. Mezcla los ingredientes secos\n…"}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              {url.trim() && (
                <a
                  href={url.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary underline underline-offset-4"
                >
                  Abrir la página en una pestaña nueva ↗
                </a>
              )}
            </div>
          )}
        </div>
        {manualMode && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleManual} disabled={!text.trim()}>
              Agregar a las notas
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
