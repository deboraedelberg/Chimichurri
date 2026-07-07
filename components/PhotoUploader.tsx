"use client";

import { useRef, useState } from "react";
import { Camera, ImageIcon, Loader2, ScanText, X } from "@/components/icons";

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

interface PhotoUploaderProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  /** Called with the OCR text when the user accepts the extraction */
  onTextExtracted: (text: string) => void;
}

/**
 * Two jobs:
 * 1. Upload a photo to Vercel Blob (recipe cover image).
 * 2. "Scan" a photo of a recipe with Tesseract.js (client-side OCR) —
 *    the extracted text is shown for review, then handed to the form.
 */
export function PhotoUploader({ photoUrl, onPhotoChange, onTextExtracted }: PhotoUploaderProps) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrText, setOcrText] = useState<string | null>(null);

  async function handleUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al subir la imagen");
      onPhotoChange(data.url);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  async function handleScan(file: File) {
    setScanning(true);
    setScanProgress(0);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const result = await Tesseract.recognize(file, "spa+eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setScanProgress(Math.round(m.progress * 100));
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
    <div className="space-y-3">
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />
      <input
        ref={scanInputRef}
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

      {photoUrl ? (
        <div className="relative overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="Foto de la receta" className="max-h-64 w-full object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute right-2 top-2 h-9 w-9"
            onClick={() => onPhotoChange(null)}
            aria-label="Quitar foto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={uploading}
            onClick={() => uploadInputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <ImageIcon />}
            {uploading ? "Subiendo…" : "Subir foto"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={scanning}
            onClick={() => scanInputRef.current?.click()}
          >
            {scanning ? <Loader2 className="animate-spin" /> : <ScanText />}
            {scanning ? `Leyendo… ${scanProgress}%` : "Escanear foto de receta (OCR)"}
          </Button>
        </div>
      )}

      {photoUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={scanning}
          onClick={() => scanInputRef.current?.click()}
        >
          {scanning ? <Loader2 className="animate-spin" /> : <Camera />}
          {scanning ? `Leyendo… ${scanProgress}%` : "Escanear una foto de receta (OCR)"}
        </Button>
      )}

      {uploadError && <p className="text-sm text-destructive">{uploadError}</p>}

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
    </div>
  );
}
