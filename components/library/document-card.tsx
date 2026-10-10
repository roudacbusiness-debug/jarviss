"use client";

import Link from "next/link";
import { CheckCircle2, Circle, CircleDot, FileText, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL } from "@/lib/queries/documents";
import type { Document, Subject } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

export const TYPE_COLOR: Record<Document["doc_type"], string> = {
  cours: "#3B82F6",
  exos: "#F59E0B",
  annale: "#EC4899",
  corrige: "#22C55E",
};

export function StatusIcon({ status, className }: { status: Document["status"]; className?: string }) {
  if (status === "fait") return <CheckCircle2 className={cn("text-success", className)} />;
  if (status === "en_cours") return <CircleDot className={cn("text-warning", className)} />;
  return <Circle className={cn("text-muted", className)} />;
}

export function DocumentCard({
  doc,
  subject,
  onMore,
  compact,
}: {
  doc: Document;
  subject?: Subject;
  onMore?: () => void;
  compact?: boolean;
}) {
  const progress = doc.page_count ? Math.min(1, doc.last_page / doc.page_count) : 0;
  const color = subject?.color ?? "#64748B";

  return (
    <div
      className={cn(
        "group relative flex overflow-hidden rounded-lg border border-border bg-surface shadow-sm transition-[transform,box-shadow,border-color] hover:-translate-y-0.5 hover:border-border-strong hover:shadow-md",
        compact ? "items-center gap-3 p-2.5" : "flex-col",
      )}
    >
      <Link href={`/bibliotheque/${doc.id}`} className={cn("absolute inset-0 z-0 focus-ring rounded-lg", compact && "")} aria-label={`Ouvrir ${doc.title}`} />
      {/* Vignette */}
      <div
        className={cn("relative flex shrink-0 items-center justify-center", compact ? "h-12 w-10 rounded-sm" : "h-28 w-full")}
        style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${color} 28%, var(--surface-2)), color-mix(in oklab, ${color} 10%, var(--surface-2)))` }}
      >
        <FileText className={cn("opacity-80", compact ? "h-5 w-5" : "h-9 w-9")} style={{ color }} />
        {!compact ? (
          <span
            className="absolute left-2 top-2 rounded-xs px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white"
            style={{ background: TYPE_COLOR[doc.doc_type] }}
          >
            {DOC_TYPE_LABEL[doc.doc_type]}
          </span>
        ) : null}
        {doc.page_count ? (
          <span className={cn("absolute bottom-1.5 right-2 font-mono text-[10px] font-semibold tabular", compact ? "hidden" : "text-fg-2/80")}>
            {doc.page_count} p.
          </span>
        ) : null}
      </div>

      {/* Infos */}
      <div className={cn("min-w-0 flex-1", compact ? "" : "p-3")}>
        <div className="flex items-start gap-2">
          <StatusIcon status={doc.status} className="mt-0.5 h-4 w-4 shrink-0" />
          <p className="min-w-0 flex-1 truncate text-[13.5px] font-bold leading-tight">{doc.title}</p>
          {onMore ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onMore();
              }}
              className="relative z-10 -mr-1 -mt-1 rounded-xs p-1 text-muted opacity-70 transition-opacity hover:bg-surface-2 hover:text-fg group-hover:opacity-100"
              aria-label="Options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted">
          {compact ? `${DOC_TYPE_LABEL[doc.doc_type]} · ` : ""}
          {subject?.name ?? "Sans matière"}
          {doc.chapter ? ` · ${doc.chapter}` : ""}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full transition-[width]" style={{ width: `${progress * 100}%`, background: color }} />
          </div>
          <span className="font-mono text-[10.5px] text-muted tabular">
            {doc.page_count ? `${doc.last_page}/${doc.page_count}` : DOC_STATUS_LABEL[doc.status]}
          </span>
        </div>
      </div>
    </div>
  );
}

export { Badge as DocBadge };
