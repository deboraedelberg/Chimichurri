import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { RECIPE_INCLUDE, getRecipePermission } from "@/lib/recipes";
import { toRecipeDTO } from "@/lib/serialize";
import { CookingMode } from "@/components/CookingMode";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cocinando" };

export default async function CookPage({
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
  if (!recipe || recipe.steps.length === 0) notFound();

  return <CookingMode recipe={toRecipeDTO(recipe, permission)} />;
}
