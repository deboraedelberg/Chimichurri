"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

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

interface URLImporterProps {
  /** Receives the source URL and the pasted recipe text */
  onImport: (payload: { url: string; text: string }) => void;
}

/**
 * MVP URL import: no automated scraping.
 * The user pastes the URL for reference, opens the page themselves,
 * copies the recipe text, and pastes it here. The text lands in the
 * form notes so they can fill in the structured fields.
 */
export function URLImporter({ onImport }: URLImporterProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");

  function handleImport() {
    onImport({ url: url.trim(), text: text.trim() });
    setOpen(false);
    setUrl("");
    setText("");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Pega la URL de la receta, luego abre la página y copia el texto de la receta abajo.
            Los campos los completas tú — la importación automática llegará más adelante.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="import-url">URL de la receta</Label>
            <Input
              id="import-url"
              type="url"
              placeholder="https://ejemplo.com/las-mejores-empanadas"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
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
          <div className="space-y-2">
            <Label htmlFor="import-text">Texto de la receta (copiado de la página)</Label>
            <Textarea
              id="import-text"
              rows={10}
              placeholder={"Ingredientes:\n- 2 tazas de harina\n…\n\nPasos:\n1. Mezcla los ingredientes secos\n…"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleImport} disabled={!text.trim() && !url.trim()}>
            Agregar a las notas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
