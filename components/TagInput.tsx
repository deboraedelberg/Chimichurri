"use client";

import { useRef, useState } from "react";
import { X } from "@/components/icons";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TagInputProps {
  id?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Pool para el autocomplete (etiquetas existentes + curadas) */
  suggestions?: string[];
  placeholder?: string;
}

const MAX_DROPDOWN = 8;

/**
 * Input de etiquetas: coma o Enter crean un chip con cruz para eliminar,
 * y mientras escribes se autocompleta con las etiquetas que ya existen.
 */
export function TagInput({
  id,
  value,
  onChange,
  suggestions = [],
  placeholder,
}: TagInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);

  const normalized = query.trim().toLowerCase();
  const filtered = suggestions
    .map((s) => s.toLowerCase())
    .filter((s, i, arr) => arr.indexOf(s) === i)
    .filter((s) => !value.includes(s) && (!normalized || s.includes(normalized)))
    .slice(0, MAX_DROPDOWN);

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/,/g, "");
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setQuery("");
    setHighlight(-1);
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "," ) {
      e.preventDefault();
      addTag(query);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (open && highlight >= 0 && filtered[highlight]) {
        addTag(filtered[highlight]);
      } else if (query.trim()) {
        addTag(query);
      }
      return;
    }
    if (e.key === "Backspace" && !query && value.length > 0) {
      onChange(value.slice(0, -1));
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, filtered.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, -1));
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setHighlight(-1);
    }
  }

  return (
    <div className="relative">
      <div
        className={cn(
          "flex min-h-12 w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-input bg-background px-3 py-2 text-base ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 md:text-sm"
        )}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              aria-label={`Quitar etiqueta ${tag}`}
              className="rounded-full p-0.5 hover:bg-background/60"
              onClick={(e) => {
                e.stopPropagation();
                removeTag(tag);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="text"
          className="min-w-[8rem] flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
          placeholder={value.length === 0 ? placeholder : undefined}
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            // coma pegada en el medio del texto también crea el chip
            if (v.includes(",")) {
              v.split(",").forEach((part) => part.trim() && addTag(part));
            } else {
              setQuery(v);
              setHighlight(-1);
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // el timeout deja pasar el click en una sugerencia
            setTimeout(() => {
              setOpen(false);
              setHighlight(-1);
              setQuery((q) => {
                if (q.trim()) addTag(q);
                return "";
              });
            }, 150);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 text-sm text-popover-foreground shadow-md">
          {filtered.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                className={cn(
                  "w-full rounded-sm px-2 py-1.5 text-left hover:bg-accent hover:text-accent-foreground",
                  i === highlight && "bg-accent text-accent-foreground"
                )}
                onMouseDown={(e) => {
                  e.preventDefault(); // no perder el foco del input
                  addTag(s);
                }}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
