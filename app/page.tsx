import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, UtensilsCrossed } from "@/components/icons";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE } from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";
import { BulkImporter } from "@/components/BulkImporter";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  // Sitio familiar: todas las recetas son de todos
  const recipes = await prisma.recipe.findMany({
    include: RECIPE_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });

  const firstName = session.user.name?.split(" ")[0] ?? "chef";

  return (
    <main className="container space-y-8 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Hola, {firstName} 👋
          </h1>
          <p className="text-muted-foreground">¿Qué cocinamos hoy?</p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {/* TEMPORAL: carga masiva desde un archivo JSON */}
          <BulkImporter />
          <Button asChild size="lg">
            <Link href="/recipes/new">
              <Plus />
              Nueva receta
            </Link>
          </Button>
        </div>
      </div>

      {recipes.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={toRecipeDTO(recipe)} />
          ))}
        </div>
      )}
    </main>
  );
}
