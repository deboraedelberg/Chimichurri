"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "@/components/icons";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface StepPhotosProps {
  photos: string[];
  alt: string;
  /** Alto de las miniaturas; el lightbox siempre ocupa toda la pantalla */
  heightClass?: string;
  className?: string;
}

/**
 * Fotos de un paso, una al lado de la otra ocupando todo el ancho, con alto
 * acotado. Al tocar cualquiera se abre un lightbox a pantalla completa para
 * verla en grande (deslizable entre fotos).
 */
export function StepPhotos({
  photos,
  alt,
  heightClass = "h-44 sm:h-56",
  className,
}: StepPhotosProps) {
  const [open, setOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const openedAt = useRef(0);

  // Al abrir el lightbox, arrancar en la foto que se tocó (sin animación).
  // Depende solo de `open` para no pelear con el scroll del usuario.
  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      const el = lightboxRef.current;
      if (el) el.scrollTo({ left: openedAt.current * el.clientWidth });
    });
  }, [open]);

  // Con el lightbox abierto, las flechas del teclado navegan entre fotos
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      const el = lightboxRef.current;
      el?.scrollBy({
        left: (e.key === "ArrowLeft" ? -1 : 1) * el.clientWidth,
        behavior: "smooth",
      });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (photos.length === 0) return null;
  const multiple = photos.length > 1;

  function openAt(i: number) {
    openedAt.current = i;
    setLightboxIndex(i);
    setOpen(true);
  }

  function slideIndex(el: HTMLElement) {
    return Math.min(
      photos.length - 1,
      Math.max(0, Math.round(el.scrollLeft / el.clientWidth))
    );
  }

  function scrollLightbox(delta: number) {
    const el = lightboxRef.current;
    el?.scrollBy({ left: delta * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div className={className}>
      <div className={cn("flex w-full gap-2", heightClass)}>
        {photos.map((url, i) => (
          <button
            key={`${url}-${i}`}
            type="button"
            className="h-full min-w-0 flex-1 overflow-hidden rounded-lg border"
            onClick={() => openAt(i)}
            aria-label={`Ver en grande: ${alt}${multiple ? ` (foto ${i + 1} de ${photos.length})` : ""}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={multiple ? `${alt} (${i + 1} de ${photos.length})` : alt}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          hideClose
          className="dark flex h-[100dvh] w-screen max-w-none items-center justify-center border-0 bg-black/95 p-0 shadow-none sm:rounded-none"
        >
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          <DialogClose
            aria-label="Cerrar"
            className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </DialogClose>
          <div
            ref={lightboxRef}
            className="flex h-full w-full snap-x snap-mandatory overflow-x-auto"
            onScroll={(e) => setLightboxIndex(slideIndex(e.currentTarget))}
          >
            {photos.map((url, i) => (
              <div
                key={`${url}-${i}`}
                className="flex h-full w-full shrink-0 snap-center items-center justify-center p-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={multiple ? `${alt} (${i + 1} de ${photos.length})` : alt}
                  className="max-h-full max-w-full rounded-md object-contain"
                />
              </div>
            ))}
          </div>

          {multiple && (
            <>
              <button
                type="button"
                aria-label="Foto anterior"
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={() => scrollLightbox(-1)}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={() => scrollLightbox(1)}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm tabular-nums text-white">
                {lightboxIndex + 1} / {photos.length}
              </span>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
