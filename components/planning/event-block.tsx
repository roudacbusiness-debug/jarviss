"use client";

import type { CSSProperties } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Check, FileText, ListChecks, X } from "lucide-react";
import { fmtRange } from "@/lib/dates";
import type { EventWithMeta } from "@/lib/queries/events";
import type { Subject } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

export function EventBlock({
  event,
  subject,
  start,
  end,
  style,
  compact,
  onOpen,
  onToggleStatus,
  onResizeStart,
  onResizeMove,
  onResizeEnd,
}: {
  event: EventWithMeta;
  subject?: Subject;
  start: Date;
  end: Date;
  style: CSSProperties;
  compact: boolean;
  onOpen: () => void;
  onToggleStatus: (s: EventWithMeta["status"]) => void;
  onResizeStart: (e: React.PointerEvent) => void;
  onResizeMove: (e: React.PointerEvent) => void;
  onResizeEnd: (e: React.PointerEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `event:${event.id}`,
    data: { kind: "event", start, end },
  });

  const color = subject?.color ?? "#6366F1";
  const done = event.status === "fait";
  const missed = event.status === "rate";
  const tasksDone = event.tasks.filter((t) => t.done).length;
  const tasksTotal = event.tasks.length;
  const docs = event.event_documents.length;

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
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      style={{
        ...style,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        background: `color-mix(in oklab, ${color} ${done || missed ? 10 : 20}%, var(--surface))`,
        borderLeft: `3px solid ${color}`,
        boxShadow: isDragging ? "var(--shadow-lg)" : undefined,
      }}
      className={cn(
        "group absolute z-10 cursor-grab touch-none select-none overflow-hidden rounded-sm text-left outline-none transition-[box-shadow,opacity] focus-visible:ring-2 focus-visible:ring-accent",
        isDragging && "z-40 cursor-grabbing opacity-95",
        !isDragging && "hover:brightness-110",
        missed && "saturate-50",
      )}
    >
      <div className={cn("flex h-full flex-col px-1.5", compact ? "justify-center py-0" : "py-1")}>
        <div className="flex items-start gap-1">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-[12px] font-bold leading-[1.15]",
              done && "line-through opacity-70",
              missed && "line-through decoration-danger opacity-70",
            )}
            style={{ color: done || missed ? undefined : undefined }}
          >
            {event.title || subject?.name || "Révision"}
          </p>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleStatus(done ? "prevu" : "fait");
            }}
            aria-label={done ? "Marquer comme prévu" : "Marquer comme fait"}
            className={cn(
              "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
              done ? "border-transparent text-white" : "border-current/40 text-transparent opacity-0 group-hover:opacity-100 hover:text-fg",
              missed && "border-transparent bg-danger text-white opacity-100",
            )}
            style={done ? { background: color } : undefined}
          >
            {missed ? <X className="h-2.5 w-2.5" /> : <Check className="h-2.5 w-2.5" />}
          </button>
        </div>
        {!compact ? (
          <>
            <p className="mt-0.5 truncate text-[11px] text-fg-2/80 tabular">
              {event.title ? `${subject?.name ?? ""} · ` : ""}
              {fmtRange(start, end)}
            </p>
            {(tasksTotal > 0 || docs > 0) && (style.height as number) > 58 ? (
              <div className="mt-auto flex items-center gap-2 pt-1 text-[10.5px] font-semibold text-fg-2/80">
                {tasksTotal > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <ListChecks className="h-3 w-3" /> {tasksDone}/{tasksTotal}
                  </span>
                ) : null}
                {docs > 0 ? (
                  <span className="inline-flex items-center gap-0.5">
                    <FileText className="h-3 w-3" /> {docs}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      {/* Poignée de redimensionnement */}
      <div
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        className="absolute inset-x-0 bottom-0 h-2.5 cursor-ns-resize touch-none"
        aria-hidden
      >
        <div className="mx-auto mt-1 h-[3px] w-8 rounded-full bg-fg/25 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
    </div>
  );
}
