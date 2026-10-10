import { cn } from "@/lib/utils/cn";

export function Badge({
  children,
  className,
  color,
  variant = "soft",
}: {
  children: React.ReactNode;
  className?: string;
  color?: string;
  variant?: "soft" | "solid" | "outline";
}) {
  const style = color
    ? variant === "solid"
      ? { background: color, color: "#fff" }
      : variant === "outline"
        ? { borderColor: color, color }
        : { background: `color-mix(in oklab, ${color} 18%, transparent)`, color }
    : undefined;
  return (
    <span
      style={style}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4 tracking-wide",
        !color && variant === "soft" && "bg-surface-3 text-fg-2",
        !color && variant === "outline" && "border border-border-strong text-fg-2",
        variant === "outline" && "border",
        className,
      )}
    >
      {children}
    </span>
  );
}
