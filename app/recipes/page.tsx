import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE } from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/RecipeCard";

export const dynamic = "force-dynamic";

export const metadata = { title: "Recetas" };

export default async function RecipesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [recipes, shares] = await Promise.all([
    prisma.recipe.findMany({
      where: { user_id: session.user.id },
      include: RECIPE_INCLUDE,
      orderBy: { updatedAt: "desc" },
    }),
    prisma.recipeShare.findMany({
      where: { shared_with_id: session.user.id },
      include: { recipe: { include: RECIPE_INCLUDE } },
      orderBy: { shared_at: "desc" },
    }),
  ]);

  return (
    <main className="container space-y-8 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Mis recetas</h1>
        <Button asChild>
          <Link href="/recipes/new">
            <Plus />
            Nueva receta
          </Link>
        </Button>
      </div>

      {recipes.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Todavía no hay recetas. ¡Crea la primera!
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {recipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={toRecipeDTO(recipe, "owner")} />
          ))}
        </div>
      )}

      {shares.length > 0 && (
        <section id="shared" className="space-y-4">
          <h2 className="text-xl font-semibold">Compartidas conmigo</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shares.map((share) => (
              <RecipeCard
                key={share.id}
                recipe={toRecipeDTO(
                  share.recipe,
                  share.permission === "edit" ? "edit" : "view"
                )}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
