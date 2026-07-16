"use client";

import { useState } from "react";
import { ArrowLeftRight } from "@/components/icons";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UNITS, compatibleUnits, convert } from "@/lib/conversions";
import { formatQuantity, cn } from "@/lib/utils";
import type { IngredientDTO } from "@/lib/types";

interface IngredientListProps {
  ingredients: IngredientDTO[];
  /** servings multiplier from the ScalingControl */
  multiplier: number;
}

/**
 * Lista de ingredientes escalada, estilo "cantidad primero":
 * "**400 g** harina común", con separadores punteados. Las unidades
 * convertibles (masa/volumen) tienen un ícono ⇄ a la derecha que abre
 * un menú para verlas en otra unidad; las de conteo solo escalan.
 */
export function IngredientList({ ingredients, multiplier }: IngredientListProps) {
  // ingredient id -> display unit override
  const [unitOverrides, setUnitOverrides] = useState<Record<string, string>>({});

  const rowClass =
    "flex min-h-9 items-center gap-2 border-b border-dashed pb-3 last:border-b-0 last:pb-0";

  return (
    <ul className="space-y-3">
      {ingredients.map((ing) => {
        // Título de sección ("Para la masa", "Para el relleno")
        if (ing.heading) {
          return (
            <li key={ing.id} className="pt-3 font-semibold first:pt-0">
              {ing.item}
            </li>
          );
        }

        // C/N ("cantidad necesaria"): sin número, no escala ni convierte
        if (ing.unit === "cn") {
          return (
            <li key={ing.id} className={rowClass}>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">c/n</span> {ing.item}
              </span>
            </li>
          );
        }

        const displayUnit = unitOverrides[ing.id] ?? ing.unit;
        const converted = convert(ing.amount * multiplier, ing.unit, displayUnit);
        const amount = converted ?? ing.amount * multiplier;
        const options = compatibleUnits(ing.unit);
        const convertible = options.length > 1;

        return (
          <li key={ing.id} className={rowClass}>
            <span className="min-w-0 flex-1">
              <span className="font-semibold tabular-nums">
                {formatQuantity(amount, displayUnit)}
              </span>{" "}
              {ing.item}
            </span>
            {convertible && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    aria-label={`Cambiar unidad de ${ing.item}`}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {options.map((u) => (
                    <DropdownMenuItem
                      key={u}
                      className={cn(u === displayUnit && "font-semibold")}
                      onClick={() =>
                        setUnitOverrides((prev) => ({ ...prev, [ing.id]: u }))
                      }
                    >
                      {UNITS[u]?.label ?? u}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </li>
        );
      })}
    </ul>
  );
}
