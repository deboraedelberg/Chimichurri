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

interface OCRImporterProps {
  /** Recibe el texto extraído cuando el usuario lo acepta */
  onTextExtracted: (text: string) => void;
}

/**
 * Escanear una receta desde una foto: Tesseract.js corre en el navegador,
 * el texto extraído se revisa en un dialog y se agrega a las notas del form.
 */
export function OCRImporter({ onTextExtracted }: OCRImporterProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrText, setOcrText] = useState<string | null>(null);

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

      <Dialog open={ocrText !== null} onOpenChange={(open) => !open && setOcrText(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Texto extraído</DialogTitle>
            <DialogDescription>
              Revisa el texto extraído de tu foto, edítalo si es necesario y agrégalo a las
              notas de la receta para completar el formulario.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={ocrText ?? ""}
            onChange={(e) => setOcrText(e.target.value)}
            rows={12}
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOcrText(null)}>
              Descartar
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (ocrText) onTextExtracted(ocrText);
                setOcrText(null);
              }}
            >
              Usar este texto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
