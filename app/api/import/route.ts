import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { isSafeUrl, parseRecipeFromHtml } from "@/lib/import";

export const runtime = "nodejs";

const importSchema = z.object({
  url: z.string().trim().url("URL inválida"),
});

const MAX_HTML = 3 * 1024 * 1024; // 3 MB

/** POST /api/import — descarga la página y extrae la receta (JSON-LD schema.org) */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Datos inválidos" },
      { status: 400 }
    );
  }

  const { url } = parsed.data;
  if (!isSafeUrl(url)) {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "es,en;q=0.8",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `La página respondió ${res.status}` },
        { status: 422 }
      );
    }
    html = (await res.text()).slice(0, MAX_HTML);
  } catch {
    return NextResponse.json(
      { error: "No se pudo descargar la página. Verifica la URL." },
      { status: 422 }
    );
  }

  const recipe = parseRecipeFromHtml(html, url);
  if (!recipe || (recipe.ingredients.length === 0 && recipe.steps.length === 0)) {
    return NextResponse.json(
      {
        error:
          "Esta página no publica la receta en formato estándar. Copia y pega el texto manualmente.",
      },
      { status: 422 }
    );
  }

  return NextResponse.json(recipe);
}
