"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, ImagePlus, Loader2, Plus, Trash2, X } from "@/components/icons";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { OCRImporter } from "@/components/OCRImporter";
import { PhotoUploader } from "@/components/PhotoUploader";
import { TagInput } from "@/components/TagInput";
import { URLImporter } from "@/components/URLImporter";
import { UNITS } from "@/lib/conversions";
import { uploadImage } from "@/lib/upload-client";
import { CATEGORY_GROUPS } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  DEFAULT_SERVINGS_KEY,
  UNIT_SYSTEM_KEY,
  defaultUnitFor,
} from "@/components/SettingsSections";
import type { ImportedRecipe } from "@/lib/import";
import { stepPhotos, type RecipeDTO } from "@/lib/types";

interface IngredientRow {
  item: string;
  amount: string;
  unit: string;
  heading?: boolean; // título de sección ("Masa", "Relleno")
}

const MAX_STEP_PHOTOS = 3;

interface StepRow {
  content: string;
  minutes: string; // temporizador opcional, en minutos
  heading?: boolean;
  photoUrls?: string[]; // hasta 3 fotos opcionales del paso
}

interface RecipeFormProps {
  mode: "create" | "edit";
  initial?: RecipeDTO;
  /** Etiquetas ya usadas en el recetario, para las sugerencias */
  knownTags?: string[];
}

const UNIT_OPTIONS = Object.values(UNITS);

const CURATED_TAGS = [
  "comida judía",
  "desayuno",
  "merienda",
  "cumpleaños",
  "rosh hashaná",
  "pésaj",
  "rápida",
  "sin horno",
  "vegetariana",
];

/** Sugerencias según el nombre de la receta ("knishes" → comida judía) */
const TAG_HINTS: [RegExp, string][] = [
  [/knish|mandlen|jal[aá]|guefilte|varenike|latke|kneidalaj|leikaj/i, "comida judía"],
  [/cumplea|bizcochuelo/i, "cumpleaños"],
  [/mate|bizcochito|masita/i, "merienda"],
];

const MAX_TAG_SUGGESTIONS = 8;

export function RecipeForm({ mode, initial, knownTags = [] }: RecipeFormProps) {
  const router = useRouter();

  const [category, setCategory] = useState(initial?.category ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [credit, setCredit] = useState(initial?.credit ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [photoUrl, setPhotoUrl] = useState<string | null>(initial?.photo_url ?? null);
  const [servings, setServings] = useState(String(initial?.servings ?? 4));
  const [servingsUnit, setServingsUnit] = useState(initial?.servings_unit ?? "porciones");
  const [prepTime, setPrepTime] = useState(initial?.prepTime ? String(initial.prepTime) : "");
  const [cookTime, setCookTime] = useState(initial?.cookTime ? String(initial.cookTime) : "");
  const [tagList, setTagList] = useState<string[]>(initial?.tags ?? []);
  const [notes, setNotes] = useState("");

  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients.map((i) => ({
      item: i.item,
      amount: String(i.amount),
      unit: i.unit,
      heading: i.heading,
    })) ?? [{ item: "", amount: "", unit: "g" }]
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps.map((s) => ({
      content: s.content,
      minutes: s.time ? String(Math.round(s.time / 60)) : "",
      heading: s.heading,
      photoUrls: stepPhotos(s),
    })) ?? [{ content: "", minutes: "" }]
  );

  // Foto opcional por paso: un solo input de archivo compartido
  const stepPhotoInputRef = useRef<HTMLInputElement>(null);
  const stepPhotoTarget = useRef<number | null>(null);
  const [uploadingStep, setUploadingStep] = useState<number | null>(null);

  function pickStepPhoto(index: number) {
    stepPhotoTarget.current = index;
    stepPhotoInputRef.current?.click();
  }

  async function uploadStepPhotos(files: File[]) {
    const index = stepPhotoTarget.current;
    if (index === null) return;
    const remaining = MAX_STEP_PHOTOS - (steps[index]?.photoUrls?.length ?? 0);
    if (remaining <= 0) return;
    setUploadingStep(index);
    setError(null);
    try {
      for (const file of files.slice(0, remaining)) {
        const url = await uploadImage(file);
        setSteps((rows) =>
          rows.map((row, i) =>
            i === index
              ? { ...row, photoUrls: [...(row.photoUrls ?? []), url].slice(0, MAX_STEP_PHOTOS) }
              : row
          )
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la imagen");
    } finally {
      setUploadingStep(null);
      stepPhotoTarget.current = null;
    }
  }

  // Enter agrega una fila nueva y la enfoca
  const ingredientRefs = useRef<(HTMLInputElement | null)[]>([]);
  const stepRefs = useRef<(HTMLTextAreaElement | HTMLInputElement | null)[]>([]);
  const focusIngredient = useRef<number | null>(null);
  const focusStep = useRef<number | null>(null);

  useEffect(() => {
    if (focusIngredient.current !== null) {
      ingredientRefs.current[focusIngredient.current]?.focus();
      focusIngredient.current = null;
    }
  }, [ingredients.length]);

  useEffect(() => {
    if (focusStep.current !== null) {
      stepRefs.current[focusStep.current]?.focus();
      focusStep.current = null;
    }
  }, [steps.length]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultUnit, setDefaultUnit] = useState("g");

  // En recetas nuevas, aplicar las preferencias de Configuración
  useEffect(() => {
    const unit = defaultUnitFor(localStorage.getItem(UNIT_SYSTEM_KEY));
    setDefaultUnit(unit);
    if (mode !== "create") return;
    const storedServings = localStorage.getItem(DEFAULT_SERVINGS_KEY);
    if (storedServings) setServings(storedServings);
    setIngredients((rows) =>
      rows.map((row) =>
        row.item === "" && row.amount === "" ? { ...row, unit } : row
      )
    );
  }, [mode]);

  // Sugerencias de etiquetas (chips debajo del input)
  const tagSuggestions = useMemo(() => {
    const hints = TAG_HINTS.filter(([re]) => re.test(name)).map(([, tag]) => tag);
    const all = [...hints, ...knownTags.map((t) => t.toLowerCase()), ...CURATED_TAGS];
    const unique: string[] = [];
    for (const tag of all) {
      if (!tagList.includes(tag) && !unique.includes(tag)) unique.push(tag);
    }
    return unique.slice(0, MAX_TAG_SUGGESTIONS);
  }, [name, knownTags, tagList]);

  function addTag(tag: string) {
    setTagList((prev) => (prev.includes(tag) ? prev : [...prev, tag]));
  }

  function updateIngredient(index: number, patch: Partial<IngredientRow>) {
    setIngredients((rows) =>
      rows.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  function updateStep(index: number, patch: Partial<StepRow>) {
    setSteps((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  // Reordenar ingredientes arrastrando desde el ícono (mouse y táctil)
  const ingredientRowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dragIndex = useRef<number | null>(null);
  const [draggingIngredient, setDraggingIngredient] = useState<number | null>(null);

  function startIngredientDrag(e: React.PointerEvent<HTMLButtonElement>, index: number) {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragIndex.current = index;
    setDraggingIngredient(index);
  }

  function moveIngredientDrag(e: React.PointerEvent<HTMLButtonElement>) {
    const from = dragIndex.current;
    if (from === null) return;
    const to = ingredientRowRefs.current.findIndex((el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return e.clientY >= rect.top && e.clientY <= rect.bottom;
    });
    if (to === -1 || to === from) return;
    dragIndex.current = to;
    setDraggingIngredient(to);
    setIngredients((rows) => {
      const next = [...rows];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function endIngredientDrag() {
    dragIndex.current = null;
    setDraggingIngredient(null);
  }

  function insertIngredient(after: number, heading = false) {
    focusIngredient.current = after + 1;
    setIngredients((rows) => [
      ...rows.slice(0, after + 1),
      { item: "", amount: "", unit: defaultUnit, heading },
      ...rows.slice(after + 1),
    ]);
  }

  function insertStep(after: number, heading = false) {
    focusStep.current = after + 1;
    setSteps((rows) => [
      ...rows.slice(0, after + 1),
      { content: "", minutes: "", heading },
      ...rows.slice(after + 1),
    ]);
  }

  function appendNotes(text: string) {
    setNotes((prev) => (prev ? `${prev}\n\n${text}` : text));
  }

  /** Precarga el formulario con una receta importada (URL u OCR) */
  function applyImported(recipe: ImportedRecipe) {
    if (recipe.name) setName(recipe.name);
    if (recipe.category) setCategory(recipe.category);
    if (recipe.credit) setCredit(recipe.credit);
    if (recipe.description) setDescription(recipe.description);
    if (recipe.image) setPhotoUrl(recipe.image);
    if (recipe.servings) setServings(String(recipe.servings));
    if (recipe.servingsUnit) setServingsUnit(recipe.servingsUnit);
    if (recipe.prepTime) setPrepTime(String(recipe.prepTime));
    if (recipe.cookTime) setCookTime(String(recipe.cookTime));
    if (recipe.ingredients.length > 0) {
      setIngredients(
        recipe.ingredients.map((i) => ({
          item: i.item,
          amount: i.heading ? "" : String(i.amount),
          unit: i.unit,
          heading: i.heading,
        }))
      );
    }
    if (recipe.steps.length > 0) {
      setSteps(recipe.steps.map((content) => ({ content, minutes: "" })));
    }
    if (recipe.sourceUrl) appendNotes(`Fuente: ${recipe.sourceUrl}`);
  }

  /** Campos obligatorios: nombre, categoría, foto, rinde, 1+ ingrediente, 1+ paso. */
  function validateForm(): string | null {
    if (!name.trim()) return "El nombre es obligatorio";
    if (!category) return "La categoría es obligatoria";
    if (!photoUrl) return "La foto es obligatoria";
    if (!servings || Number(servings) < 1) return "Rinde es obligatorio";
    const hasIngredient = ingredients.some((row) => !row.heading && row.item.trim());
    if (!hasIngredient) return "Agrega al menos un ingrediente";
    const hasStep = steps.some((row) => !row.heading && row.content.trim());
    if (!hasStep) return "Agrega al menos un paso";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      photo_url: photoUrl,
      category: category || null,
      credit: credit.trim() || null,
      servings: Number(servings),
      servings_unit: servingsUnit,
      prepTime: prepTime ? Number(prepTime) : null,
      cookTime: cookTime ? Number(cookTime) : null,
      tags: tagList,
      ingredients: ingredients
        .filter((row) => row.item.trim())
        .map((row) =>
          row.heading
            ? { item: row.item.trim(), amount: 0, unit: "unit", heading: true }
            : {
                item: row.item.trim(),
                amount: row.unit === "cn" ? 1 : Number(row.amount) || 0,
                unit: row.unit,
                heading: false,
              }
        ),
      steps: steps
        .filter((row) => row.content.trim())
        .map((row) => ({
          content: row.content.trim(),
          time: !row.heading && row.minutes ? Math.round(Number(row.minutes) * 60) : null,
          heading: !!row.heading,
          photo_urls: row.heading ? [] : row.photoUrls ?? [],
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
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">Información básica</CardTitle>
            <div className="flex flex-wrap gap-2">
              <URLImporter
                onRecipe={applyImported}
                onManual={({ url, text }) => {
                  const parts = [url && `Fuente: ${url}`, text].filter(Boolean);
                  if (parts.length) appendNotes(parts.join("\n\n"));
                }}
              />
              <OCRImporter onRecipe={applyImported} onTextExtracted={appendNotes} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipe-category">Categoría *</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger id="recipe-category" aria-label="Categoría">
                <SelectValue placeholder="Elegir categoría" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_GROUPS.map((group) => (
                  <SelectGroup key={group.label}>
                    <SelectLabel className="bg-muted">{group.label}</SelectLabel>
                    {group.items.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

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
            <Label htmlFor="recipe-credit">Receta de (opcional)</Label>
            <Input
              id="recipe-credit"
              placeholder="la Babe Teresa, la tía Susy…"
              maxLength={100}
              value={credit}
              onChange={(e) => setCredit(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipe-description">Descripción (opcional)</Label>
            <Textarea
              id="recipe-description"
              placeholder="Crujientes por fuera, jugosas por dentro…"
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="recipe-servings">Rinde *</Label>
              <div className="flex gap-2">
                <Input
                  id="recipe-servings"
                  type="number"
                  min={1}
                  max={100}
                  className="w-24 shrink-0"
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                />
                <Select value={servingsUnit} onValueChange={setServingsUnit}>
                  <SelectTrigger aria-label="Tipo de rinde" className="min-w-0 flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="porciones">Porciones</SelectItem>
                    <SelectItem value="unidades">Unidades</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recipe-prep">Preparación (min, opcional)</Label>
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
              <Label htmlFor="recipe-cook">Cocción (min, opcional)</Label>
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
            <Label htmlFor="recipe-tags">Etiquetas (opcional)</Label>
            <TagInput
              id="recipe-tags"
              value={tagList}
              onChange={setTagList}
              suggestions={[...knownTags, ...CURATED_TAGS]}
              placeholder="comida judía, merienda, rápida…"
            />
            {tagSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tagSuggestions.map((tag) => (
                  <button key={tag} type="button" onClick={() => addTag(tag)}>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    >
                      + {tag}
                    </Badge>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Foto *</Label>
            <PhotoUploader
              photoUrl={photoUrl}
              onPhotoChange={setPhotoUrl}
              aiPrompt={name}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ingredientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {ingredients.map((row, i) =>
            row.heading ? (
              <div
                key={i}
                ref={(el) => {
                  ingredientRowRefs.current[i] = el;
                }}
                className={cn(
                  "flex items-center gap-2 pt-2",
                  draggingIngredient === i && "opacity-60"
                )}
              >
                <button
                  type="button"
                  aria-label="Reordenar título"
                  className="shrink-0 cursor-grab touch-none text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
                  onPointerDown={(e) => startIngredientDrag(e, i)}
                  onPointerMove={moveIngredientDrag}
                  onPointerUp={endIngredientDrag}
                  onPointerCancel={endIngredientDrag}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
                <Input
                  ref={(el) => {
                    ingredientRefs.current[i] = el;
                  }}
                  placeholder="Título (ej: Masa, Relleno)"
                  className="font-semibold"
                  value={row.item}
                  onChange={(e) => updateIngredient(i, { item: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      insertIngredient(i);
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-destructive"
                  onClick={() => setIngredients((rows) => rows.filter((_, j) => j !== i))}
                  aria-label="Quitar título"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                key={i}
                ref={(el) => {
                  ingredientRowRefs.current[i] = el;
                }}
                className={cn(
                  "flex flex-wrap items-center gap-2",
                  draggingIngredient === i && "opacity-60"
                )}
              >
                {/* En mobile el nombre ocupa todo el ancho; los controles van abajo */}
                <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto sm:flex-1">
                  <button
                    type="button"
                    aria-label="Reordenar ingrediente"
                    className="shrink-0 cursor-grab touch-none text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
                    onPointerDown={(e) => startIngredientDrag(e, i)}
                    onPointerMove={moveIngredientDrag}
                    onPointerUp={endIngredientDrag}
                    onPointerCancel={endIngredientDrag}
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <Input
                    ref={(el) => {
                      ingredientRefs.current[i] = el;
                    }}
                    placeholder="Harina"
                    aria-label="Ingrediente"
                    className="min-w-0 flex-1"
                    value={row.item}
                    onChange={(e) => updateIngredient(i, { item: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertIngredient(i);
                      }
                    }}
                  />
                </div>
                <div className="flex w-full items-center gap-2 pl-6 sm:w-auto sm:pl-0">
                  <Input
                    type="number"
                    step="any"
                    min={0}
                    placeholder={row.unit === "cn" ? "—" : "Cant."}
                    aria-label="Cantidad"
                    className="w-20 sm:w-24"
                    disabled={row.unit === "cn"}
                    value={row.unit === "cn" ? "" : row.amount}
                    onChange={(e) => updateIngredient(i, { amount: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        insertIngredient(i);
                      }
                    }}
                  />
                  <Select
                    value={row.unit}
                    onValueChange={(unit) => updateIngredient(i, { unit })}
                  >
                    <SelectTrigger
                      aria-label="Unidad"
                      className="min-w-0 flex-1 sm:w-28 sm:flex-none"
                    >
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
              </div>
            )
          )}
          <p className="text-xs text-muted-foreground">
            Tip: Enter agrega el siguiente ingrediente.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertIngredient(ingredients.length - 1)}
            >
              <Plus />
              Agregar ingrediente
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertIngredient(ingredients.length - 1, true)}
            >
              <span className="font-serif text-base font-bold leading-none">H</span>
              Agregar título
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pasos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(() => {
            let stepNumber = 0;
            return steps.map((row, i) => {
              if (row.heading) {
                return (
                  <div key={i} className="flex items-center gap-2 pt-2">
                    <span className="w-6 shrink-0" />
                    <Input
                      ref={(el) => {
                        stepRefs.current[i] = el;
                      }}
                      placeholder="Título (ej: Masa, Relleno)"
                      className="min-w-0 flex-1 font-semibold"
                      value={row.content}
                      onChange={(e) => updateStep(i, { content: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          insertStep(i);
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive"
                      onClick={() => setSteps((rows) => rows.filter((_, j) => j !== i))}
                      aria-label="Quitar título"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              }
              stepNumber += 1;
              const n = stepNumber;
              const photos = row.photoUrls ?? [];
              return (
                <div key={i} className="space-y-2">
                  <div className="flex flex-wrap items-start gap-2">
                    {/* En mobile la descripción ocupa todo el ancho; los controles van abajo */}
                    <div className="flex w-full min-w-0 items-start gap-2 sm:w-auto sm:flex-1">
                      <span className="mt-3 w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
                        {n}
                      </span>
                      <Textarea
                        ref={(el) => {
                          stepRefs.current[i] = el;
                        }}
                        placeholder="Amasa hasta que quede suave…"
                        value={row.content}
                        onChange={(e) => updateStep(i, { content: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            insertStep(i);
                          }
                        }}
                        rows={2}
                        className="min-w-0 flex-1"
                      />
                    </div>
                    <div className="flex items-start gap-2 pl-8 sm:pl-0">
                      <div className="w-20 shrink-0 space-y-1">
                        <Input
                          type="number"
                          min={0}
                          placeholder="min"
                          aria-label={`Temporizador del paso ${n} (minutos)`}
                          value={row.minutes}
                          onChange={(e) => updateStep(i, { minutes: e.target.value })}
                        />
                        <p className="text-center text-[10px] text-muted-foreground">tiempo</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "shrink-0",
                          photos.length > 0 ? "text-primary" : "text-muted-foreground"
                        )}
                        disabled={uploadingStep === i || photos.length >= MAX_STEP_PHOTOS}
                        onClick={() => pickStepPhoto(i)}
                        aria-label={`Agregar foto al paso ${n} (${photos.length} de ${MAX_STEP_PHOTOS})`}
                      >
                        {uploadingStep === i ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ImagePlus className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-destructive"
                        disabled={steps.length === 1}
                        onClick={() => setSteps((rows) => rows.filter((_, j) => j !== i))}
                        aria-label={`Quitar paso ${n}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {photos.length > 0 && (
                    <div className="ml-8 flex flex-wrap gap-3">
                      {photos.map((url, k) => (
                        <div key={`${url}-${k}`} className="relative">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Foto ${k + 1} del paso ${n}`}
                            className="h-20 w-20 rounded-md border object-cover"
                          />
                          <button
                            type="button"
                            aria-label={`Quitar foto ${k + 1} del paso ${n}`}
                            className="absolute -right-2 -top-2 rounded-full border bg-background p-1 text-destructive shadow-sm"
                            onClick={() =>
                              updateStep(i, {
                                photoUrls: photos.filter((_, j) => j !== k),
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            });
          })()}
          <input
            ref={stepPhotoInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files ?? []);
              if (files.length > 0) uploadStepPhotos(files);
              e.target.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            Tip: Enter agrega el siguiente paso; Shift+Enter hace un salto de línea.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertStep(steps.length - 1)}
            >
              <Plus />
              Agregar paso
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => insertStep(steps.length - 1, true)}
            >
              <span className="font-serif text-base font-bold leading-none">H</span>
              Agregar título
            </Button>
          </div>
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
