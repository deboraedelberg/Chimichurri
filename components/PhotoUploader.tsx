"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Sparkles, X } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { ImageCropModal } from "@/components/ImageCropModal";
import { uploadImage } from "@/lib/upload-client";

interface PhotoUploaderProps {
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  /** Descripción del plato para generar la foto con IA (nombre de la receta) */
  aiPrompt?: string;
}

/**
 * Foto de portada: subir a Vercel Blob vía /api/upload, o generarla con IA
 * (Pollinations.ai — gratuito, sin API key; la URL es determinística por seed).
 */
export function PhotoUploader({ photoUrl, onPhotoChange, aiPrompt }: PhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  function handlePick(file: File) {
    setError(null);
    setCropSrc(URL.createObjectURL(file));
  }

  function closeCrop() {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }

  async function handleUpload(file: File) {
    closeCrop();
    setUploading(true);
    setError(null);
    try {
      onPhotoChange(await uploadImage(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploading(false);
    }
  }

  function handleGenerate() {
    const prompt = aiPrompt?.trim();
    if (!prompt) {
      setError("Escribe primero el nombre de la receta para generar la foto.");
      return;
    }
    setGenerating(true);
    setError(null);

    const seed = Math.floor(Math.random() * 1_000_000);
    const fullPrompt = `${prompt}, fotografía gastronómica profesional, plato casero apetitoso, luz cálida natural, primer plano`;
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(fullPrompt)}?width=1024&height=768&seed=${seed}&nologo=true`;

    // Precargamos la imagen para mostrar spinner mientras se genera (~10-20s)
    const img = new window.Image();
    img.onload = () => {
      onPhotoChange(url);
      setGenerating(false);
    };
    img.onerror = () => {
      setError("No se pudo generar la imagen. Intenta de nuevo.");
      setGenerating(false);
    };
    img.src = url;
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handlePick(file);
          e.target.value = "";
        }}
      />

      <ImageCropModal imageSrc={cropSrc} onCancel={closeCrop} onSave={handleUpload} />

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
            className="flex-1 sm:flex-none"
            disabled={uploading || generating}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {uploading ? "Subiendo…" : "Subir foto"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={uploading || generating}
            onClick={handleGenerate}
          >
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {generating ? "Generando…" : "Generar con IA"}
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
