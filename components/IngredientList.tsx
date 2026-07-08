"use client";

import { useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UNITS, compatibleUnits, convert } from "@/lib/conversions";
import { formatAmount } from "@/lib/utils";
import type { IngredientDTO } from "@/lib/types";

interface IngredientListProps {
  ingredients: IngredientDTO[];
  /** servings multiplier from the ScalingControl */
  multiplier: number;
}

/**
 * Scaled ingredient list with per-ingredient unit conversion.
 * Convertible units (mass/volume) get a dropdown of compatible units;
 * count units (unit, clove, pinch…) just scale.
 */
export function IngredientList({ ingredients, multiplier }: IngredientListProps) {
  // ingredient id -> display unit override
  const [unitOverrides, setUnitOverrides] = useState<Record<string, string>>({});

  return (
    <ul className="space-y-3">
      {ingredients.map((ing) => {
        // Título de sección ("Masa", "Relleno")
        if (ing.heading) {
          return (
            <li key={ing.id} className="pt-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground first:pt-0">
              {ing.item}
            </li>
          );
        }

        // C/N ("cantidad necesaria"): sin número, no escala ni convierte
        if (ing.unit === "cn") {
          return (
            <li key={ing.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 flex-1">{ing.item}</span>
              <span className="shrink-0 text-muted-foreground">c/n</span>
            </li>
          );
        }

        const displayUnit = unitOverrides[ing.id] ?? ing.unit;
        const converted = convert(ing.amount * multiplier, ing.unit, displayUnit);
        const amount = converted ?? ing.amount * multiplier;
        const options = compatibleUnits(ing.unit);
        const convertible = options.length > 1;

        return (
          <li key={ing.id} className="flex items-center justify-between gap-3">
            <span className="min-w-0 flex-1">{ing.item}</span>
            <span className="flex shrink-0 items-center gap-2 tabular-nums">
              <span className="font-medium">{formatAmount(amount)}</span>
              {convertible ? (
                <Select
                  value={displayUnit}
                  onValueChange={(unit) =>
                    setUnitOverrides((prev) => ({ ...prev, [ing.id]: unit }))
                  }
                >
                  <SelectTrigger
                    className="h-9 w-24 text-xs"
                    aria-label={`Unidad para ${ing.item}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((u) => (
                      <SelectItem key={u} value={u}>
                        {UNITS[u]?.label ?? u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span className="text-muted-foreground">
                  {UNITS[displayUnit]?.label ?? displayUnit}
                </span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
