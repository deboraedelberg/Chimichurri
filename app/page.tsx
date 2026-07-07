import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks, Plus, Share2, UtensilsCrossed } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE } from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RecipeCard } from "@/components/RecipeCard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const [recipeCount, sharedCount, recentRecipes] = await Promise.all([
    prisma.recipe.count({ where: { user_id: session.user.id } }),
    prisma.recipeShare.count({ where: { shared_with_id: session.user.id } }),
    prisma.recipe.findMany({
      where: { user_id: session.user.id },
      include: RECIPE_INCLUDE,
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

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
        <Button asChild size="lg">
          <Link href="/recipes/new">
            <Plus />
            Nueva receta
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/recipes">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              <CardTitle className="text-3xl">{recipeCount}</CardTitle>
              <CardDescription>Mis recetas</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/recipes#shared">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <Share2 className="h-5 w-5 text-primary" />
              <CardTitle className="text-3xl">{sharedCount}</CardTitle>
              <CardDescription>Compartidas conmigo</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link href="/shopping-list">
          <Card className="transition-colors hover:border-primary/50">
            <CardHeader className="pb-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <CardTitle className="text-3xl">🛒</CardTitle>
              <CardDescription>Lista de compras</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Recetas recientes</h2>
          {recipeCount > 6 && (
            <Button variant="link" asChild>
              <Link href="/recipes">Ver todas</Link>
            </Button>
          )}
        </div>
        {recentRecipes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium">Todavía no hay recetas</p>
                <p className="text-sm text-muted-foreground">
                  Agrega tu primera receta familiar — escríbela, escanea una foto o
                  impórtala desde una URL.
                </p>
              </div>
              <Button asChild>
                <Link href="/recipes/new">
                  <Plus />
                  Crea tu primera receta
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={toRecipeDTO(recipe)} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
