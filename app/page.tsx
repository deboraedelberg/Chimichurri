import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Search, UtensilsCrossed, X } from "@/components/icons";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  RECIPE_INCLUDE,
  buildRecipeWhere,
  getFrequentCategories,
  getTopCategoriesByRecipeCount,
  parseCategoria,
  parseEtiqueta,
} from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";
import { FrequentCategories } from "@/components/FrequentCategories";

export const dynamic = "force-dynamic";

interface HomePageProps {
  searchParams: {
    q?: string | string[];
    categoria?: string | string[];
    etiqueta?: string | string[];
  };
}

const NUEVA_RECETA_BUTTON = (
  <Button asChild size="lg">
    <Link href="/recipes/new">
      <Plus />
      Nueva receta
    </Link>
  </Button>
);

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const q = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q)?.trim();
  const categoria = parseCategoria(searchParams.categoria);
  const etiqueta = parseEtiqueta(searchParams.etiqueta);
  const hasFilters = Boolean(q || categoria || etiqueta);

  const firstName = session.user.name?.split(" ")[0] ?? "chef";

  // Sin filtros: dashboard con categorías frecuentes + últimas recetas
  if (!hasFilters) {
    const [userCategories, latestRecipes] = await Promise.all([
      getFrequentCategories(session.user.id),
      prisma.recipe.findMany({
        include: RECIPE_INCLUDE,
        orderBy: { createdAt: "desc" },
        take: 4,
      }),
    ]);
    // Usuario sin aperturas todavía: mostramos las categorías con más recetas
    const frequentCategories =
      userCategories.length > 0 ? userCategories : await getTopCategoriesByRecipeCount(5);

    return (
      <main className="container space-y-10 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Hola, {firstName} 👋
            </h1>
            <p className="text-muted-foreground">¿Qué cocinamos hoy?</p>
          </div>
          {NUEVA_RECETA_BUTTON}
        </div>

        <FrequentCategories categories={frequentCategories} />

        {latestRecipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">Todavía no hay recetas</p>
                <p className="text-sm text-muted-foreground">
                  Agrega la primera receta de la familia — escríbela, escanea una foto o
                  impórtala desde una URL.
                </p>
              </div>
              <Button asChild>
                <Link href="/recipes/new">
                  <Plus />
                  Crear la primera receta
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-muted-foreground">
              Últimas recetas subidas
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latestRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={toRecipeDTO(recipe)} />
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // Con filtros (búsqueda / etiqueta): lista de resultados
  const recipes = await prisma.recipe.findMany({
    where: buildRecipeWhere(q, categoria, etiqueta),
    include: RECIPE_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="container space-y-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <p className="text-muted-foreground">¿Qué cocinamos hoy?</p>
        </div>
        {NUEVA_RECETA_BUTTON}
      </div>

      {etiqueta && (
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Recetas con la etiqueta</span>
          <Badge variant="secondary" className="gap-1 pr-1.5 text-sm font-normal">
            {etiqueta}
            <Link href="/" aria-label="Quitar filtro de etiqueta" className="rounded-full p-0.5 hover:bg-background/60">
              <X className="h-3.5 w-3.5" />
            </Link>
          </Badge>
        </div>
      )}

      {recipes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Search className="h-12 w-12 text-muted-foreground/40" />
            <div>
              <p className="font-medium">No encontramos recetas que coincidan</p>
              <p className="text-sm text-muted-foreground">
                Probá con otra búsqueda o quitá los filtros.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/">Limpiar filtros</Link>
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
