"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/cn";

export function ThemeToggle({ className, withLabel }: { className?: string; withLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();

  const btn = (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "flex h-10 items-center justify-center gap-2 rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-ring",
        withLabel ? "px-3 text-sm font-semibold" : "w-10",
        className,
      )}
      aria-label="Changer de thème"
    >
      <Sun className="hidden h-4 w-4 dark:block" />
      <Moon className="h-4 w-4 dark:hidden" />
      {withLabel ? (
        <>
          <span className="hidden dark:inline">Mode clair</span>
          <span className="dark:hidden">Mode sombre</span>
        </>
      ) : null}
    </button>
  );

  return withLabel ? btn : <Tip label="Changer de thème" side="right">{btn}</Tip>;
}
