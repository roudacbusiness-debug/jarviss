"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { CalendarDays, Library, Settings2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ThemeToggle } from "./theme-toggle";
import { Tip } from "@/components/ui/tooltip";

const NAV = [
  { href: "/planning", label: "Planning", icon: CalendarDays },
  { href: "/bibliotheque", label: "Bibliothèque", icon: Library },
  { href: "/reglages", label: "Réglages", icon: Settings2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode; email?: string }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh w-full">
      {/* Rail desktop */}
      <aside className="sticky top-0 hidden h-dvh w-[76px] shrink-0 flex-col items-center border-r border-border bg-bg-elev py-4 md:flex">
        <Link href="/planning" className="mb-6 flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-md" aria-label="Jarvis">
          <Sparkles className="h-5 w-5" />
        </Link>
        <nav className="flex flex-1 flex-col items-center gap-1">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Tip key={item.href} label={item.label} side="right">
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-md text-muted transition-colors hover:text-fg focus-ring",
                    active && "text-fg",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {active ? (
                    <motion.span
                      layoutId="rail-active"
                      className="absolute inset-0 rounded-md bg-surface-2"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                  <item.icon className="relative z-10 h-5 w-5" />
                </Link>
              </Tip>
            );
          })}
        </nav>
        <div className="flex flex-col items-center gap-1">
          <ThemeToggle />
        </div>
      </aside>

      {/* Contenu */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>

      {/* Barre d'onglets mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 glass border-t md:hidden safe-bottom">
        <div className="grid h-16 grid-cols-3">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                  active ? "text-accent" : "text-muted",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className={cn("h-[22px] w-[22px] transition-transform", active && "scale-110")} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
