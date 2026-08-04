"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown } from "@/components/icons";

import { CATEGORY_GROUPS, type CategoryGroup } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navLinkClass =
  "flex shrink-0 items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium text-foreground/80 outline-none transition-colors hover:bg-accent hover:text-accent-foreground";

const CLOSE_DELAY_MS = 120;

function GroupMenu({ group }: { group: CategoryGroup }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();

  function openNow() {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function closeSoon() {
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <div onMouseEnter={openNow} onMouseLeave={closeSoon}>
        <DropdownMenuTrigger className={cn(navLinkClass, "gap-1")}>
          {group.navLabel}
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", open && "rotate-180")}
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" onMouseEnter={openNow} onMouseLeave={closeSoon}>
          {group.items.map((item) => (
            <DropdownMenuItem key={item.value} asChild>
              <Link href={`/?categoria=${item.value}`} scroll={false}>
                {item.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </div>
    </DropdownMenu>
  );
}

export function SubNav() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (pathname?.startsWith("/cook/")) return null;
  if (!session?.user) return null;

  return (
    <nav className="w-full border-b bg-background shadow-sm">
      <div className="container">
        <div className="no-scrollbar flex items-center gap-1 overflow-x-auto py-1">
          <Link href="/" className={navLinkClass}>
            Inicio
          </Link>
          <span
            title="Próximamente"
            aria-disabled
            className={cn(navLinkClass, "cursor-not-allowed opacity-50")}
          >
            Favoritas
          </span>
          {CATEGORY_GROUPS.map((group) => (
            <GroupMenu key={group.key} group={group} />
          ))}
        </div>
      </div>
    </nav>
  );
}
