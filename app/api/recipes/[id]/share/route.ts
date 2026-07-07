import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRecipePermission } from "@/lib/recipes";

type Params = { params: { id: string } };

const shareSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
  permission: z.enum(["view", "edit"]).default("view"),
});

/** GET /api/recipes/[id]/share — list who this recipe is shared with (owner only) */
export async function GET(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const permission = await getRecipePermission(params.id, session.user.id);
  if (permission !== "owner") {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  const shares = await prisma.recipeShare.findMany({
    where: { recipe_id: params.id },
    include: {
      shared_with: { select: { id: true, name: true, email: true } },
    },
    orderBy: { shared_at: "desc" },
  });

  return NextResponse.json(shares);
}

/** POST /api/recipes/[id]/share — share with a user by email (owner only) */
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const permission = await getRecipePermission(params.id, session.user.id);
  if (permission !== "owner") {
    return NextResponse.json(
      { error: "Solo el dueño puede compartir una receta" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = shareSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const target = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, name: true, email: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "No se encontró una cuenta de Chimichurri con ese email. Pídele que se registre primero." },
      { status: 404 }
    );
  }
  if (target.id === session.user.id) {
    return NextResponse.json(
      { error: "Ya eres el dueño de esta receta" },
      { status: 400 }
    );
  }

  const share = await prisma.recipeShare.upsert({
    where: {
      recipe_id_shared_with_id: {
        recipe_id: params.id,
        shared_with_id: target.id,
      },
    },
    update: { permission: parsed.data.permission },
    create: {
      recipe_id: params.id,
      shared_with_id: target.id,
      owner_id: session.user.id,
      permission: parsed.data.permission,
    },
    include: {
      shared_with: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json(share, { status: 201 });
}
