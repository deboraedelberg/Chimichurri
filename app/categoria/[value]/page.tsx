import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { Plus, UtensilsCrossed } from "@/components/icons";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE, buildRecipeWhere } from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { CATEGORY_GROUPS, CATEGORY_VALUES } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";

export const dynamic = "force-dynamic";

interface CategoriaPageProps {
  params: { value: string };
}

const SIN_CATEGORIA = "sin-categoria";

function findCategory(value: string) {
  for (const group of CATEGORY_GROUPS) {
    const item = group.items.find((i) => i.value === value);
    if (item) return { group, item };
  }
  return null;
}

export async function generateMetadata({
  params,
}: CategoriaPageProps): Promise<Metadata> {
  if (params.value === SIN_CATEGORIA) return { title: "Sin categoría" };
  const found = findCategory(params.value);
  return { title: found?.item.label ?? "Categoría" };
}

export default async function CategoriaPage({ params }: CategoriaPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  // Vista temporal para encontrar recetas sin categoría (o con una que ya
  // no existe, ej. slugs viejos que se sacaron de la taxonomía).
  if (params.value === SIN_CATEGORIA) {
    const recipes = await prisma.recipe.findMany({
      where: { OR: [{ category: null }, { category: { notIn: CATEGORY_VALUES } }] },
      include: RECIPE_INCLUDE,
      orderBy: { updatedAt: "desc" },
    });

    return (
      <main className="container space-y-8 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Sin categoría</h1>
            <p className="text-sm text-muted-foreground">
              Recetas sin categoría asignada, o con una que ya no existe. Editalas para
              ponerles una — esta vista es temporal, solo para encontrarlas.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/recipes/new">
              <Plus />
              Nueva receta
            </Link>
          </Button>
        </div>

        {recipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
              <p className="font-medium">Todas las recetas tienen categoría 🎉</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={toRecipeDTO(recipe)} />
            ))}
          </div>
        )}
      </main>
    );
  }

  const found = findCategory(params.value);
  if (!found) notFound();
  const { group, item } = found;

  const recipes = await prisma.recipe.findMany({
    where: buildRecipeWhere(undefined, item.value, undefined),
    include: RECIPE_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="container space-y-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{group.label}</p>
          <h1 className="text-3xl font-bold tracking-tight">{item.label}</h1>
        </div>
        <Button asChild size="lg">
          <Link href="/recipes/new">
            <Plus />
            Nueva receta
          </Link>
        </Button>
      </div>

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium">Todavía no hay recetas acá</p>
              <p className="text-sm text-muted-foreground">
                Agregá la primera receta de {item.label.toLowerCase()}.
              </p>
            </div>
            <Button asChild>
              <Link href="/recipes/new">
                <Plus />
                Crear receta
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={toRecipeDTO(recipe)} />
          ))}
        </div>
      )}
    </main>
  );
}
