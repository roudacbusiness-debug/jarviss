"use client";

import type { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Flag } from "lucide-react";
import { countdownLabel, fmtRange } from "@/lib/dates";
import { EVAL_TYPE_LABEL } from "@/lib/queries/evaluations";
import type { Evaluation, Subject } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

export function EvalBlock({
  evaluation,
  subject,
  start,
  end,
  timezone,
  style,
  compact,
  onOpen,
}: {
  evaluation: Evaluation;
  subject?: Subject;
  start: Date;
  end: Date;
  timezone: string;
  style: CSSProperties;
  compact: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `eval:${evaluation.id}`,
    data: { kind: "eval", start, end },
  });
  const color = subject?.color ?? "#F43F5E";
  const countdown = countdownLabel(start, timezone);
  const past = countdown === "passée";

  return (
    <div
      ref={setNodeRef}
      data-block
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        if (!isDragging) onOpen();
      }}
      style={{
        ...style,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        background: `repeating-linear-gradient(135deg, color-mix(in oklab, ${color} 28%, var(--surface)) 0 6px, color-mix(in oklab, ${color} 16%, var(--surface)) 6px 12px)`,
        border: `1.5px solid ${color}`,
        boxShadow: isDragging ? "var(--shadow-lg)" : `0 0 0 1px color-mix(in oklab, ${color} 30%, transparent)`,
      }}
      className={cn(
        "group absolute z-10 cursor-grab touch-none select-none overflow-hidden rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-accent",
        isDragging && "z-40 cursor-grabbing",
        past && "opacity-60",
      )}
    >
      <div className={cn("flex h-full flex-col px-1.5", compact ? "justify-center" : "py-1")}>
        <div className="flex items-center gap-1">
          <span
            className="inline-flex shrink-0 items-center gap-0.5 rounded-xs px-1 text-[9.5px] font-extrabold uppercase tracking-wider text-white"
            style={{ background: color }}
          >
            <Flag className="h-2.5 w-2.5" /> {EVAL_TYPE_LABEL[evaluation.eval_type]}
          </span>
          <p className="min-w-0 flex-1 truncate text-[12px] font-bold leading-tight">{evaluation.title || subject?.name}</p>
          {!past ? (
            <span className="shrink-0 rounded-xs bg-fg px-1 font-mono text-[10px] font-bold text-bg tabular">{countdown}</span>
          ) : null}
        </div>
        {!compact ? (
          <p className="mt-0.5 truncate text-[11px] text-fg-2/80 tabular">
            {evaluation.title ? `${subject?.name ?? ""} · ` : ""}
            {fmtRange(start, end)}
          </p>
        ) : null}
      </div>
    </div>
  );
}
