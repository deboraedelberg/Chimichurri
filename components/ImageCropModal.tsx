"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ZoomIn, ZoomOut } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageCropModalProps {
  /** URL local (object URL) de la imagen recién elegida, o null si el modal está cerrado */
  imageSrc: string | null;
  onCancel: () => void;
  onSave: (file: File) => void;
  /** Ancho/alto del recorte final. Por defecto 4:3, igual que las tarjetas de receta. */
  aspect?: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const OUTPUT_WIDTH = 1200;

function clampNum(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Modal para recortar la foto principal antes de subirla: se puede arrastrar
 * para reencuadrar y usar el slider para acercar/alejar, dentro de un marco
 * fijo en 4:3. Al guardar se dibuja el recorte en un canvas y se entrega
 * como File listo para pasarle a uploadImage.
 */
export function ImageCropModal({ imageSrc, onCancel, onSave, aspect = 4 / 3 }: ImageCropModalProps) {
  const open = imageSrc != null;
  const imgRef = useRef<HTMLImageElement>(null);
  const dragState = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(
    null
  );

  // Ref por callback: el contenido del modal de Radix se monta un ciclo de
  // render después de que `open` pasa a true, así que un useEffect atado a
  // `open` corre antes de que el nodo exista. El callback avisa en cuanto
  // el div realmente entra al DOM.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => setContainerEl(el), []);

  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setNatural({ width: 0, height: 0 });
  }, [imageSrc]);

  useEffect(() => {
    if (!containerEl) return;
    const update = () => setDims({ width: containerEl.clientWidth, height: containerEl.clientHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerEl);
    return () => ro.disconnect();
  }, [containerEl]);

  function baseScale() {
    if (!dims.width || !dims.height || !natural.width) return 1;
    return Math.max(dims.width / natural.width, dims.height / natural.height);
  }

  function clampOffset(next: { x: number; y: number }, zoomVal: number) {
    const scale = baseScale() * zoomVal;
    const imgW = natural.width * scale;
    const imgH = natural.height * scale;
    const maxX = Math.max(0, (imgW - dims.width) / 2);
    const maxY = Math.max(0, (imgH - dims.height) / 2);
    return { x: clampNum(next.x, -maxX, maxX), y: clampNum(next.y, -maxY, maxY) };
  }

  function handleImgLoad() {
    const img = imgRef.current;
    if (img) setNatural({ width: img.naturalWidth, height: img.naturalHeight });
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset(
      clampOffset({ x: dragState.current.startOffset.x + dx, y: dragState.current.startOffset.y + dy }, zoom)
    );
  }
  function handlePointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(next: number) {
    setZoom(next);
    setOffset((prev) => clampOffset(prev, next));
  }

  async function handleSave() {
    if (!imgRef.current || !natural.width || !dims.width) return;
    setSaving(true);
    try {
      const scale = baseScale() * zoom;
      const imgLeft = (dims.width - natural.width * scale) / 2 + offset.x;
      const imgTop = (dims.height - natural.height * scale) / 2 + offset.y;

      const sx = -imgLeft / scale;
      const sy = -imgTop / scale;
      const sw = dims.width / scale;
      const sh = dims.height / scale;

      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_WIDTH;
      canvas.height = Math.round(OUTPUT_WIDTH / aspect);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) return;
      onSave(new File([blob], "foto-receta.jpg", { type: "image/jpeg" }));
    } finally {
      setSaving(false);
    }
  }

  const scale = baseScale() * zoom;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajustar foto</DialogTitle>
        </DialogHeader>

        <div
          ref={containerRef}
          className="relative mx-auto aspect-[4/3] w-full touch-none select-none overflow-hidden rounded-lg border bg-muted"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {imageSrc && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={imageSrc}
              alt=""
              draggable={false}
              onLoad={handleImgLoad}
              className="absolute left-1/2 top-1/2 max-w-none cursor-move"
              style={{
                width: natural.width * scale || undefined,
                height: natural.height * scale || undefined,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(Number(e.target.value))}
            className="w-full accent-primary"
            aria-label="Acercar o alejar"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={saving || !natural.width}>
            {saving && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
