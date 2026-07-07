import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE, getRecipePermission } from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { RecipeDetail } from "@/components/RecipeDetail";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const permission = await getRecipePermission(params.id, session.user.id);
  if (!permission) notFound();

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: RECIPE_INCLUDE,
  });
  if (!recipe) notFound();

  return (
    <main className="container max-w-3xl py-8">
      <RecipeDetail recipe={toRecipeDTO(recipe, permission)} />
    </main>
  );
}
