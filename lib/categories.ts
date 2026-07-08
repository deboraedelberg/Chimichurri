/**
 * Taxonomía de categorías del recetario familiar.
 * Único lugar con la lista: el form la usa para el dropdown agrupado
 * y los futuros filtros de la home la reusan.
 */

export interface CategoryItem {
  value: string; // slug guardado en Recipe.category
  label: string;
}

export interface CategoryGroup {
  label: string;
  items: CategoryItem[];
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: "Salado",
    items: [
      { value: "salado-comidas", label: "Comidas" },
      { value: "salado-entradas", label: "Entradas y snacks" },
      { value: "salado-salsas", label: "Salsas y aderezos" },
      { value: "salado-basicos", label: "Masas y básicos" },
    ],
  },
  {
    label: "Dulce",
    items: [
      { value: "dulce-tortas", label: "Tortas y budines" },
      { value: "dulce-postres", label: "Postres" },
      { value: "dulce-galletitas", label: "Galletitas y alfajores" },
      { value: "dulce-salsas", label: "Salsas y cremas" },
      { value: "dulce-basicos", label: "Masas y básicos" },
    ],
  },
  {
    label: "Otros",
    items: [
      { value: "otros-panes", label: "Panes y facturas" },
      { value: "otros-bebidas", label: "Bebidas" },
    ],
  },
];

export const CATEGORY_VALUES = CATEGORY_GROUPS.flatMap((g) =>
  g.items.map((i) => i.value)
) as [string, ...string[]];

/** "dulce-tortas" -> "Dulce · Tortas y budines" (null si el slug no existe) */
export function categoryLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  for (const group of CATEGORY_GROUPS) {
    const item = group.items.find((i) => i.value === value);
    if (item) return `${group.label} · ${item.label}`;
  }
  return null;
}

/** Solo el nombre de la subcategoría: "dulce-tortas" -> "Tortas y budines" */
export function categoryShortLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  for (const group of CATEGORY_GROUPS) {
    const item = group.items.find((i) => i.value === value);
    if (item) return item.label;
  }
  return null;
}
