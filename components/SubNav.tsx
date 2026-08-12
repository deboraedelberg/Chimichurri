"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown } from "@/components/icons";

import { CATEGORY_GROUPS, type CategoryGroup } from "@/lib/categories";
import { cn } from "@/lib/utils";

const navLinkClass =
  "flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-foreground/80 outline-none transition-colors hover:bg-accent hover:text-accent-foreground";

const menuItemClass =
  "flex min-h-[44px] items-center rounded-sm px-3 text-sm hover:bg-accent hover:text-accent-foreground";

const CLOSE_DELAY_MS = 150;

/** Posiciona y abre/cierra un panel portado al body, debajo de `triggerRef`. */
function usePortalMenu() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  function openNow() {
    clearTimeout(closeTimer.current);
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  }

  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  function closeNow() {
    clearTimeout(closeTimer.current);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDownOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
      closeNow();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeNow();
    }
    document.addEventListener("mousedown", onPointerDownOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDownOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, position, triggerRef, contentRef, openNow, closeSoon, closeNow };
}

/** Desktop: un trigger por grupo (Recetas Saladas, Recetas Dulces, Otras Recetas). */
function GroupMenu({ group }: { group: CategoryGroup }) {
  const { open, position, triggerRef, contentRef, openNow, closeSoon, closeNow } =
    usePortalMenu();

  return (
    <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => (open ? closeNow() : openNow())}
        className={cn(navLinkClass, "gap-1")}
      >
        {group.navLabel}
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={contentRef}
            onMouseEnter={openNow}
            onMouseLeave={closeSoon}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 min-w-56 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {group.items.map((item) => (
              <Link
                key={item.value}
                href={`/categoria/${item.value}`}
                onClick={closeNow}
                className={menuItemClass}
              >
                {item.label}
              </Link>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

/** Mobile: un solo trigger "Categorías" con todos los grupos y subcategorías. */
function AllCategoriesMenu() {
  const { open, position, triggerRef, contentRef, openNow, closeNow } = usePortalMenu();

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => (open ? closeNow() : openNow())}
        className={cn(navLinkClass, "gap-1")}
      >
        Categorías
        <ChevronDown
          className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
        />
      </button>
      {open &&
        position &&
        createPortal(
          <div
            ref={contentRef}
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 max-h-[70vh] w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          >
            {CATEGORY_GROUPS.map((group) => (
              <div key={group.key}>
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.navLabel}
                </p>
                {group.items.map((item) => (
                  <Link
                    key={item.value}
                    href={`/categoria/${item.value}`}
                    onClick={closeNow}
                    className={menuItemClass}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}

export function SubNav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname?.startsWith("/cook/")) return null;
  if (!session?.user) return null;

  return (
    <nav className="w-full border-b bg-card shadow-sm">
      <div className="container">
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1">
          <span
            title="Próximamente"
            aria-disabled
            className={cn(navLinkClass, "cursor-not-allowed opacity-50")}
          >
            Favoritas
          </span>
          <Link href="/categoria/sin-categoria" className={navLinkClass}>
            Sin categoría
          </Link>

          <div className="md:hidden">
            <AllCategoriesMenu />
          </div>

          <div className="hidden items-center gap-1 md:flex">
            {CATEGORY_GROUPS.map((group) => (
              <GroupMenu key={group.key} group={group} />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
