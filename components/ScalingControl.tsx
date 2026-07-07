"use client";

import { Users } from "@/components/icons";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const SERVING_OPTIONS = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20];

interface ScalingControlProps {
  baseServings: number;
  servings: number;
  onChange: (servings: number) => void;
}

export function ScalingControl({ baseServings, servings, onChange }: ScalingControlProps) {
  const multiplier = servings / baseServings;
  const options = SERVING_OPTIONS.includes(baseServings)
    ? SERVING_OPTIONS
    : [...SERVING_OPTIONS, baseServings].sort((a, b) => a - b);

  return (
    <div className="flex items-center gap-2">
      <Users className="h-4 w-4 text-muted-foreground" />
      <Select value={String(servings)} onValueChange={(v) => onChange(Number(v))}>
        <SelectTrigger className="w-36" aria-label="Porciones">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n} {n === 1 ? "porción" : "porciones"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {multiplier !== 1 && (
        <Badge variant="secondary">
          {multiplier < 1
            ? `${Math.round(multiplier * 100) / 100}x`
            : `${Math.round(multiplier * 10) / 10}x`}
        </Badge>
      )}
    </div>
  );
}
