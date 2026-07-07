import { NextResponse } from "next/server";
import { z } from "zod";
import { convert, UNIT_KEYS } from "@/lib/conversions";

const convertSchema = z.object({
  amount: z.coerce.number(),
  from: z.string(),
  to: z.string(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = convertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Se espera { amount, from, to }", units: UNIT_KEYS },
      { status: 400 }
    );
  }

  const { amount, from, to } = parsed.data;
  const result = convert(amount, from, to);

  if (result === null) {
    return NextResponse.json(
      { error: `No se puede convertir ${from} a ${to}`, units: UNIT_KEYS },
      { status: 400 }
    );
  }

  return NextResponse.json({ amount: result, unit: to });
}
