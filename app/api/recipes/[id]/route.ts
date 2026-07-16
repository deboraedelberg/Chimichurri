import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recipeSchema, RECIPE_INCLUDE, getRecipePermission } from "@/lib/recipes";

type Params = { params: { id: string } };

export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const permission = await getRecipePermission(params.id, session.user.id);
  if (!permission) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const recipe = await prisma.recipe.findUnique({
    where: { id: params.id },
    include: RECIPE_INCLUDE,
  });

  return NextResponse.json({ ...recipe, permission });
}

export async function PUT(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const permission = await getRecipePermission(params.id, session.user.id);
  if (!permission) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = recipeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const { ingredients, steps, ...data } = parsed.data;

  // Replace ingredients and steps wholesale — simplest correct approach for a form-based editor
  const [, , recipe] = await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { recipe_id: params.id } }),
    prisma.step.deleteMany({ where: { recipe_id: params.id } }),
    prisma.recipe.update({
      where: { id: params.id },
      data: {
        ...data,
        ingredients: { create: ingredients },
        steps: {
          create: steps.map((s, i) => ({
            order: i + 1,
            content: s.content,
            time: s.time ?? null,
            heading: s.heading,
            photo_url: s.photo_url ?? null,
            photo_urls: s.photo_urls,
          })),
        },
      },
      include: RECIPE_INCLUDE,
    }),
  ]);

  return NextResponse.json({ ...recipe, permission });
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Sitio familiar: cualquier miembro puede eliminar (con confirmación en la UI)
  const permission = await getRecipePermission(params.id, session.user.id);
  if (!permission) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  await prisma.recipe.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
