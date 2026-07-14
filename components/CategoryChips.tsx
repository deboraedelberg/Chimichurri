import Link from "next/link";

import { CATEGORY_GROUPS, categoryChipLabel } from "@/lib/categories";
import { Button } from "@/components/ui/button";

interface CategoryChipsProps {
  q?: string;
  categoria?: string | null;
}

function hrefFor(q: string | undefined, categoria: string | null): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (categoria) params.set("categoria", categoria);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

function Chip({
  href,
  selected,
  children,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button
      asChild
      size="sm"
      variant={selected ? "default" : "outline"}
      className="shrink-0 rounded-full"
    >
      <Link href={href} scroll={false}>
        {children}
      </Link>
    </Button>
  );
}

/**
 * Fila deslizable de filtros por categoría para la home.
 * Clic en el chip seleccionado lo deselecciona; `q` se preserva.
 */
export function CategoryChips({ q, categoria }: CategoryChipsProps) {
  const items = CATEGORY_GROUPS.flatMap((group) => group.items);

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      <Chip href={hrefFor(q, null)} selected={!categoria}>
        Todas
      </Chip>
      {items.map((item) => {
        const selected = categoria === item.value;
        return (
          <Chip
            key={item.value}
            href={hrefFor(q, selected ? null : item.value)}
            selected={selected}
          >
            {categoryChipLabel(item)}
          </Chip>
        );
      })}
    </div>
  );
}
