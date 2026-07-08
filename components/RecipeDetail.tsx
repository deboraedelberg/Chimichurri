"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChefHat, Clock, Loader2, Pencil, Trash2 } from "@/components/icons";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { IngredientList } from "@/components/IngredientList";
import { ScalingControl } from "@/components/ScalingControl";
import { categoryLabel } from "@/lib/categories";
import { formatMinutes } from "@/lib/utils";
import type { RecipeDTO } from "@/lib/types";

export function RecipeDetail({ recipe }: { recipe: RecipeDTO }) {
  const router = useRouter();
  const [servings, setServings] = useState(recipe.servings);
  const [deleting, setDeleting] = useState(false);

  const multiplier = servings / recipe.servings;

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/recipes/${recipe.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {recipe.photo_url && (
        <div className="overflow-hidden rounded-lg border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={recipe.photo_url}
            alt={recipe.name}
            className="max-h-80 w-full object-cover"
          />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{recipe.name}</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/recipes/${recipe.id}/edit`}>
                <Pencil />
                Editar
              </Link>
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive">
                  <Trash2 />
                  Eliminar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>¿Eliminar “{recipe.name}”?</DialogTitle>
                  <DialogDescription>
                    Esto elimina la receta permanentemente para toda la familia. No se
                    puede deshacer.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting && <Loader2 className="animate-spin" />}
                    Eliminar receta
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {recipe.description && (
          <p className="text-muted-foreground">{recipe.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {categoryLabel(recipe.category) && (
            <Badge variant="secondary">{categoryLabel(recipe.category)}</Badge>
          )}
          {recipe.credit ? (
            <span>
              Receta de {recipe.credit}
              {recipe.owner?.name && ` · cargada por ${recipe.owner.name.split(" ")[0]}`}
            </span>
          ) : (
            recipe.owner && <span>De {recipe.owner.name ?? recipe.owner.email}</span>
          )}
          {recipe.prepTime != null && recipe.prepTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Preparación {formatMinutes(recipe.prepTime)}
            </span>
          )}
          {recipe.cookTime != null && recipe.cookTime > 0 && (
            <span className="flex items-center gap-1">
              <ChefHat className="h-4 w-4" />
              Cocción {formatMinutes(recipe.cookTime)}
            </span>
          )}
        </div>

        {recipe.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Button size="lg" className="w-full sm:w-auto sm:px-12" asChild>
        <Link href={`/cook/${recipe.id}`}>
          <ChefHat />
          Empezar a cocinar
        </Link>
      </Button>

      <div className="grid gap-6 md:grid-cols-5">
        <Card className="md:col-span-2">
          <CardHeader className="space-y-3">
            <CardTitle className="text-lg">Ingredientes</CardTitle>
            <ScalingControl
              baseServings={recipe.servings}
              servings={servings}
              onChange={setServings}
              unitLabel={recipe.servings_unit}
            />
          </CardHeader>
          <CardContent>
            <IngredientList ingredients={recipe.ingredients} multiplier={multiplier} />
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">Pasos</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.steps.map((step, i) => (
                <li key={step.id} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                    <p className="leading-relaxed">{step.content}</p>
                    {step.time != null && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatMinutes(Math.round(step.time / 60))}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Separator />
      <p className="text-xs text-muted-foreground">
        Creada el {new Date(recipe.createdAt).toLocaleDateString("es")} · Actualizada el{" "}
        {new Date(recipe.updatedAt).toLocaleDateString("es")}
      </p>
    </div>
  );
}
