import { cn } from "@/lib/utils/cn";

export function PageHeader({
  title,
  subtitle,
  children,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-3 px-4 pt-4 pb-3 md:px-6 md:pt-5 safe-top", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-extrabold leading-tight tracking-tight md:text-2xl">{title}</h1>
        {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </header>
  );
}
