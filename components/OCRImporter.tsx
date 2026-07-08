"use client";

import { useRef, useState } from "react";
import { Loader2, ScanText } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { parseRecipeText, type ImportedRecipe } from "@/lib/import";

interface OCRImporterProps {
  /** Receta parseada del texto escaneado — completa el formulario */
  onRecipe: (recipe: ImportedRecipe) => void;
  /** Fallback: el texto crudo va a las notas */
  onTextExtracted: (text: string) => void;
}

/**
 * Escanear una receta desde una foto: Tesseract.js corre en el navegador,
 * el texto extraído se revisa en un dialog y se agrega a las notas del form.
 */
export function OCRImporter({ onRecipe, onTextExtracted }: OCRImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState<string | null>(null);
  const [parseError, setParseError] = useState(false);

  function handleFill() {
    if (!ocrText) return;
    const recipe = parseRecipeText(ocrText);
    if (!recipe) {
      setParseError(true);
      return;
    }
    onRecipe(recipe);
    setOcrText(null);
    setParseError(false);
  }

  async function handleScan(file: File) {
    setScanning(true);
    setProgress(0);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(file, "spa+eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });
      setOcrText(result.data.text.trim() || "No se encontró texto en esta imagen.");
    } catch {
      setOcrText("No se pudo leer el texto de esta imagen. Intenta con una foto más nítida.");
    } finally {
      setScanning(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleScan(file);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={scanning}
        onClick={() => inputRef.current?.click()}
      >
        {scanning ? <Loader2 className="animate-spin" /> : <ScanText />}
        {scanning ? `Leyendo… ${progress}%` : "Escanear foto (OCR)"}
      </Button>

      <Dialog
        open={ocrText !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOcrText(null);
            setParseError(false);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Texto extraído</DialogTitle>
            <DialogDescription>
              Revisa el texto de tu foto y corrige errores de lectura. Al completar el
              formulario detectamos nombre, ingredientes y pasos automáticamente.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={ocrText ?? ""}
            onChange={(e) => setOcrText(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          {parseError && (
            <p className="text-sm text-destructive">
              No se detectaron ingredientes ni pasos en este texto. Verifica que tenga
              secciones tipo &quot;Ingredientes&quot; y &quot;Preparación&quot;, o agrégalo a
              las notas y completa el form a mano.
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                if (ocrText) onTextExtracted(ocrText);
                setOcrText(null);
                setParseError(false);
              }}
            >
              Solo a las notas
            </Button>
            <Button type="button" onClick={handleFill}>
              Completar formulario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
