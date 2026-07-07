"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Loader2, ShoppingBasket } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { UNITS } from "@/lib/conversions";
import { formatAmount, cn } from "@/lib/utils";
import type { RecipeDTO, ShoppingListItem } from "@/lib/types";

export function ShoppingListGenerator() {
  const [recipes, setRecipes] = useState<RecipeDTO[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const [items, setItems] = useState<ShoppingListItem[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [ticked, setTicked] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/recipes").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/recipes/shared").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([mine, shared]) => setRecipes([...mine, ...shared]))
      .catch(() => setError("No se pudieron cargar las recetas"))
      .finally(() => setLoadingRecipes(false));
  }, []);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  async function generate() {
    setGenerating(true);
    setError(null);
    setTicked({});
    try {
      const res = await fetch("/api/shopping-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeIds: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo generar la lista");
      setItems(data.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo generar la lista");
    } finally {
      setGenerating(false);
    }
  }

  function listAsText(): string {
    if (!items) return "";
    const lines = items.map(
      (item) =>
        `- ${item.item}: ${formatAmount(item.amount)} ${UNITS[item.unit]?.label ?? item.unit}`
    );
    return `Lista de compras (${new Date().toLocaleDateString("es")})\n\n${lines.join("\n")}`;
  }

  async function copyList() {
    await navigator.clipboard.writeText(listAsText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Recipe selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">1. Elige recetas</CardTitle>
          <CardDescription>
            Elige las recetas que vas a cocinar esta semana.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loadingRecipes ? (
            <p className="text-sm text-muted-foreground">Cargando recetas…</p>
          ) : recipes.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no hay recetas — crea una primero.
            </p>
          ) : (
            <ul className="space-y-3">
              {recipes.map((recipe) => (
                <li key={recipe.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`shop-${recipe.id}`}
                    checked={!!selected[recipe.id]}
                    onCheckedChange={(v) =>
                      setSelected((s) => ({ ...s, [recipe.id]: v === true }))
                    }
                    className="h-6 w-6"
                  />
                  <label
                    htmlFor={`shop-${recipe.id}`}
                    className="flex-1 cursor-pointer text-sm leading-tight"
                  >
                    {recipe.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {recipe.servings} porciones
                      {recipe.permission && recipe.permission !== "owner" && " · compartida"}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <Button
            onClick={generate}
            disabled={selectedIds.length === 0 || generating}
            className="w-full"
          >
            {generating ? <Loader2 className="animate-spin" /> : <ShoppingBasket />}
            Generar lista ({selectedIds.length})
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      {/* Generated list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">2. A comprar</CardTitle>
          <CardDescription>
            Los mismos ingredientes de varias recetas se combinan y se convierten a unidades
            comunes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {items === null ? (
            <p className="text-sm text-muted-foreground">
              Tu lista consolidada aparecerá aquí.
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Las recetas seleccionadas no tienen ingredientes.
            </p>
          ) : (
            <>
              <ul className="space-y-3">
                {items.map((item, i) => (
                  <li key={`${item.item}-${item.unit}`} className="flex items-start gap-3">
                    <Checkbox
                      id={`item-${i}`}
                      checked={!!ticked[i]}
                      onCheckedChange={(v) => setTicked((t) => ({ ...t, [i]: v === true }))}
                      className="mt-0.5 h-6 w-6"
                    />
                    <label
                      htmlFor={`item-${i}`}
                      className={cn(
                        "flex-1 cursor-pointer leading-tight",
                        ticked[i] && "text-muted-foreground line-through"
                      )}
                    >
                      <span className="font-medium tabular-nums">
                        {formatAmount(item.amount)} {UNITS[item.unit]?.label ?? item.unit}
                      </span>{" "}
                      {item.item}
                      <span className="block text-xs text-muted-foreground">
                        {item.recipes.join(", ")}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <Separator />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button variant="outline" className="flex-1" onClick={copyList}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? "¡Copiado!" : "Copiar al portapapeles"}
                </Button>
                <Button variant="outline" className="flex-1" asChild>
                  <a
                    href={`mailto:?subject=${encodeURIComponent("Lista de compras")}&body=${encodeURIComponent(listAsText())}`}
                  >
                    Enviar por email
                  </a>
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
