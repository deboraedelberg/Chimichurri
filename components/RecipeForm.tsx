"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PhotoUploader } from "@/components/PhotoUploader";
import { URLImporter } from "@/components/URLImporter";
import { UNITS } from "@/lib/conversions";
import type { RecipeDTO } from "@/lib/types";

interface IngredientRow {
  item: string;
  amount: string;
  unit: string;
}

interface StepRow {
  content: string;
  minutes: string; // optional timer, in minutes for input convenience
}

interface RecipeFormProps {
  mode: "create" | "edit";
  initial?: RecipeDTO;
}

const UNIT_OPTIONS = Object.values(UNITS);

export function RecipeForm({ mode, initial }: RecipeFormProps) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [prepTime, setPrepTime] = useState(initial?.prepTime ? String(initial.prepTime) : "");
  const [cookTime, setCookTime] = useState(initial?.cookTime ? String(initial.cookTime) : "");
  const [tags, setTags] = useState(initial?.tags.join(", ") ?? "");
  const [notes, setNotes] = useState("");

  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients.map((i) => ({
      item: i.item,
      amount: String(i.amount),
      unit: i.unit,
    })) ?? [{ item: "", amount: "", unit: "g" }]
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps.map((s) => ({
      content: s.content,
      minutes: s.time ? String(Math.round(s.time / 60)) : "",
    })) ?? [{ content: "", minutes: "" }]
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateIngredient(index: number, patch: Partial<IngredientRow>) {
    setIngredients((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function updateStep(index: number, patch: Partial<StepRow>) {
    setSteps((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function appendNotes(text: string) {
    setNotes((prev) => (prev ? `${prev}\n\n${text}` : text));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      photo_url: photoUrl,
      servings: Number(servings) || 4,
      prepTime: prepTime ? Number(prepTime) : null,
      cookTime: cookTime ? Number(cookTime) : null,
      tags: tags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      ingredients: ingredients
        .filter((row) => row.item.trim())
        .map((row) => ({
          item: row.item.trim(),
          amount: Number(row.amount) || 0,
          unit: row.unit,
        })),
      steps: steps
        .filter((row) => row.content.trim())
        .map((row) => ({
          content: row.content.trim(),
          time: row.minutes ? Math.round(Number(row.minutes) * 60) : null,
        })),
    };

    try {
      const res = await fetch(
        mode === "create" ? "/api/recipes" : `/api/recipes/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo guardar la receta");
      router.push(`/recipes/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la receta");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg">Información básica</CardTitle>
          <URLImporter
            onImport={({ url, text }) => {
              const parts = [url && `Fuente: ${url}`, text].filter(Boolean);
              if (parts.length) appendNotes(parts.join("\n\n"));
            }}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Nombre *</Label>
            <Input
              id="recipe-name"
              required
              placeholder="Empanadas de la abuela"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-description">Descripción</Label>
            <Textarea
              id="recipe-description"
              placeholder="Crujientes por fuera, jugosas por dentro…"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="recipe-servings">Porciones</Label>
              <Input
                id="recipe-servings"
                type="number"
                min={1}
                max={100}
                value={servings}
                onChange={(e) => setServings(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-prep">Preparación (min)</Label>
              <Input
                id="recipe-prep"
                type="number"
                min={0}
                placeholder="15"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-cook">Cocción (min)</Label>
              <Input
                id="recipe-cook"
                type="number"
                min={0}
                placeholder="30"
                value={cookTime}
                onChange={(e) => setCookTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-tags">Etiquetas (separadas por comas)</Label>
            <Input
              id="recipe-tags"
              placeholder="argentina, cena, familia"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Foto</Label>
            <PhotoUploader
              photoUrl={photoUrl}
              onPhotoChange={setPhotoUrl}
              onTextExtracted={appendNotes}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.map((row, i) => (
            <div key={i} className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                {i === 0 && (
                  <Label className="text-xs text-muted-foreground">Ingrediente</Label>
                )}
                <Input
                  placeholder="Harina"
                  value={row.item}
                  onChange={(e) => updateIngredient(i, { item: e.target.value })}
                />
              </div>
              <div className="w-20 space-y-1 sm:w-24">
                {i === 0 && <Label className="text-xs text-muted-foreground">Cantidad</Label>}
                <Input
                  type="number"
                  step="any"
                  min={0}
                  placeholder="500"
                  value={row.amount}
                  onChange={(e) => updateIngredient(i, { amount: e.target.value })}
                />
              </div>
              <div className="w-24 space-y-1 sm:w-28">
                {i === 0 && <Label className="text-xs text-muted-foreground">Unidad</Label>}
                <Select
                  value={row.unit}
                  onValueChange={(unit) => updateIngredient(i, { unit })}
                >
                  <SelectTrigger aria-label="Unidad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIT_OPTIONS.map((u) => (
                      <SelectItem key={u.key} value={u.key}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive"
                disabled={ingredients.length === 1}
                onClick={() => setIngredients((rows) => rows.filter((_, j) => j !== i))}
                aria-label="Quitar ingrediente"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setIngredients((rows) => [...rows, { item: "", amount: "", unit: "g" }])
            }
          >
            <Plus />
            Agregar ingrediente
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pasos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {steps.map((row, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-3 w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <Textarea
                placeholder="Amasa hasta que quede suave…"
                value={row.content}
                onChange={(e) => updateStep(i, { content: e.target.value })}
                rows={2}
                className="min-w-0 flex-1"
              />
              <div className="w-20 shrink-0 space-y-1">
                <Input
                  type="number"
                  min={0}
                  placeholder="min"
                  aria-label={`Temporizador del paso ${i + 1} (minutos)`}
                  value={row.minutes}
                  onChange={(e) => updateStep(i, { minutes: e.target.value })}
                />
                <p className="text-center text-[10px] text-muted-foreground">tiempo</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive"
                disabled={steps.length === 1}
                onClick={() => setSteps((rows) => rows.filter((_, j) => j !== i))}
                aria-label={`Quitar paso ${i + 1}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSteps((rows) => [...rows, { content: "", minutes: "" }])}
          >
            <Plus />
            Agregar paso
          </Button>
        </CardContent>
      </Card>

      {notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notas importadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Texto del OCR o de la importación por URL. Úsalo para completar los campos de
              arriba — no se guarda con la receta.
            </p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </CardContent>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={submitting} className="flex-1 sm:flex-none sm:px-12">
          {submitting && <Loader2 className="animate-spin" />}
          {mode === "create" ? "Crear receta" : "Guardar cambios"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
