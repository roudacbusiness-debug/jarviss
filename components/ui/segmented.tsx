"use client";

import { motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils/cn";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  id = "seg",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  id?: string;
}) {
  return (
    <LayoutGroup id={id}>
      <div className={cn("inline-flex items-center rounded-md bg-surface-2 p-1", className)}>
        {options.map((o) => {
          const active = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={cn(
                "relative h-8 rounded-sm px-3 text-[13px] font-semibold transition-colors focus-ring",
                active ? "text-fg" : "text-muted hover:text-fg-2",
              )}
            >
              {active ? (
                <motion.span
                  layoutId={`${id}-pill`}
                  className="absolute inset-0 rounded-sm bg-surface shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <span className="relative z-10">{o.label}</span>
            </button>
          );
        })}
      </div>
    </LayoutGroup>
  );
}
