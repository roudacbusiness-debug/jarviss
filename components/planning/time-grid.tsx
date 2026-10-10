"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type Modifier } from "@dnd-kit/core";
import { addDays, addMinutes, isSameDay } from "date-fns";
import type { TZDate } from "@date-fns/tz";
import { fmt, minutesOfDay, tz } from "@/lib/dates";
import { layoutColumn, snapMinutes, clamp, STEP_MIN } from "@/lib/planning/layout";
import type { EventWithMeta } from "@/lib/queries/events";
import type { Evaluation, Subject } from "@/lib/types/database";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { EventBlock } from "./event-block";
import { EvalBlock } from "./eval-block";

export type BackgroundItem = {
  id: string;
  label: string;
  sub?: string;
  start: Date;
  end: Date;
};

type GridItem = { kind: "event"; id: string; start: Date; end: Date; data: EventWithMeta } | { kind: "eval"; id: string; start: Date; end: Date; data: Evaluation };

export type TimeGridProps = {
  days: TZDate[];
  timezone: string;
  hourStart: number;
  hourEnd: number;
  events: EventWithMeta[];
  evaluations: Evaluation[];
  background: BackgroundItem[];
  subjects: Map<string, Subject>;
  pxPerHour?: number;
  onCreate: (start: Date, end: Date) => void;
  onMoveEvent: (id: string, start: Date, end: Date) => void;
  onMoveEval: (id: string, start: Date, end: Date) => void;
  onResizeEvent: (id: string, end: Date) => void;
  onOpenEvent: (id: string) => void;
  onOpenEval: (id: string) => void;
  onToggleStatus: (id: string, status: EventWithMeta["status"]) => void;
  className?: string;
  showHeader?: boolean;
};

export function TimeGrid({
  days,
  timezone,
  hourStart,
  hourEnd,
  events,
  evaluations,
  background,
  subjects,
  pxPerHour = 60,
  onCreate,
  onMoveEvent,
  onMoveEval,
  onResizeEvent,
  onOpenEvent,
  onOpenEval,
  onToggleStatus,
  className,
  showHeader = true,
}: TimeGridProps) {
  const startMin = hourStart * 60;
  const endMin = hourEnd * 60;
  const totalMin = endMin - startMin;
  const pxPerMin = pxPerHour / 60;
  const gridHeight = totalMin * pxPerMin;

  const scrollRef = useRef<HTMLDivElement>(null);
  const colsRef = useRef<HTMLDivElement>(null);
  const [colWidth, setColWidth] = useState(120);
  const now = useNow(30_000);
  const nowTz = tz(now, timezone);

  // Mesure de la largeur des colonnes (pour l'aimantation horizontale du drag)
  useLayoutEffect(() => {
    const el = colsRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setColWidth(entry.contentRect.width / days.length);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [days.length]);

  // Scroll initial : vers l'heure actuelle (ou 7h) au premier rendu
  const didScroll = useRef(false);
  useEffect(() => {
    if (didScroll.current || !scrollRef.current) return;
    didScroll.current = true;
    const target = clamp(minutesOfDay(nowTz) - 90, startMin, endMin) - startMin;
    scrollRef.current.scrollTop = Math.max(0, target * pxPerMin);
  }, [nowTz, startMin, endMin, pxPerMin]);

  // Items par jour
  const perDay = useMemo(() => {
    return days.map((day) => {
      const dayStart = day;
      const dayEnd = addDays(day, 1);
      const items: GridItem[] = [];
      for (const e of events) {
        const s = tz(e.starts_at, timezone);
        const en = tz(e.ends_at, timezone);
        if (en <= dayStart || s >= dayEnd) continue;
        items.push({ kind: "event", id: e.id, start: s, end: en, data: e });
      }
      for (const ev of evaluations) {
        const s = tz(ev.starts_at, timezone);
        const en = tz(ev.ends_at, timezone);
        if (en <= dayStart || s >= dayEnd) continue;
        items.push({ kind: "eval", id: ev.id, start: s, end: en, data: ev });
      }
      const bg = background.filter((b) => {
        const s = tz(b.start, timezone);
        const en = tz(b.end, timezone);
        return !(en <= dayStart || s >= dayEnd);
      });
      const range = (it: { start: Date; end: Date }) => {
        const s = isSameDay(it.start, dayStart) ? minutesOfDay(it.start) : 0;
        const e = isSameDay(it.end, dayStart) ? minutesOfDay(it.end) : it.end.getTime() <= dayStart.getTime() ? 0 : 1440;
        return { start: clamp(s, startMin, endMin), end: clamp(e, startMin, endMin) };
      };
      return {
        day,
        laid: layoutColumn(items, range, 20),
        bg: layoutColumn(bg, (b) => range({ start: tz(b.start, timezone), end: tz(b.end, timezone) }), 10),
      };
    });
  }, [days, events, evaluations, background, timezone, startMin, endMin]);

  // ----- Drag & drop (déplacement) -----
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { delay: 120, tolerance: 6 } }));
  const stepPx = STEP_MIN * pxPerMin;
  const snapModifier = useCallback<Modifier>(
    ({ transform }) => ({
      ...transform,
      x: days.length > 1 ? Math.round(transform.x / colWidth) * colWidth : 0,
      y: Math.round(transform.y / stepPx) * stepPx,
    }),
    [colWidth, stepPx, days.length],
  );

  function onDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as { kind: "event" | "eval"; start: Date; end: Date } | undefined;
    if (!data) return;
    const dayShift = days.length > 1 ? Math.round(e.delta.x / colWidth) : 0;
    const minShift = snapMinutes(e.delta.y / pxPerMin);
    if (!dayShift && !minShift) return;
    const duration = data.end.getTime() - data.start.getTime();
    let newStart = addMinutes(addDays(data.start, dayShift), minShift);
    const dayOfNew = tz(newStart, timezone);
    const mod = minutesOfDay(dayOfNew);
    // Reste dans la grille
    if (mod < startMin) newStart = addMinutes(newStart, startMin - mod);
    const newEnd = new Date(newStart.getTime() + duration);
    const id = String(e.active.id).split(":")[1];
    if (data.kind === "event") onMoveEvent(id, newStart, newEnd);
    else onMoveEval(id, newStart, newEnd);
  }

  // ----- Redimensionnement -----
  const [resizing, setResizing] = useState<{ id: string; endMin: number } | null>(null);
  const resizeRef = useRef<{ id: string; startY: number; origEnd: Date; startMinOfEvent: number } | null>(null);

  function startResize(ev: React.PointerEvent, item: GridItem) {
    ev.stopPropagation();
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    resizeRef.current = { id: item.id, startY: ev.clientY, origEnd: item.end, startMinOfEvent: minutesOfDay(item.start) };
    setResizing({ id: item.id, endMin: minutesOfDay(item.end) });
  }
  function moveResize(ev: React.PointerEvent) {
    const r = resizeRef.current;
    if (!r) return;
    const dy = ev.clientY - r.startY;
    const newEnd = clamp(snapMinutes(minutesOfDay(r.origEnd) + dy / pxPerMin), r.startMinOfEvent + STEP_MIN, endMin);
    setResizing({ id: r.id, endMin: newEnd });
  }
  function endResize() {
    const r = resizeRef.current;
    if (!r || !resizing) return;
    const delta = resizing.endMin - minutesOfDay(r.origEnd);
    if (delta !== 0) onResizeEvent(r.id, addMinutes(r.origEnd, delta));
    resizeRef.current = null;
    setResizing(null);
  }

  // ----- Création par cliquer-glisser -----
  const [draft, setDraft] = useState<{ dayIdx: number; a: number; b: number } | null>(null);
  const draftRef = useRef<{ dayIdx: number; startY: number; startMin: number; moved: boolean; pointerType: string; t: number } | null>(null);

  function minuteFromPointer(ev: React.PointerEvent, col: HTMLElement) {
    const rect = col.getBoundingClientRect();
    const y = ev.clientY - rect.top;
    return clamp(Math.floor((y / pxPerMin + startMin) / STEP_MIN) * STEP_MIN, startMin, endMin - STEP_MIN);
  }

  function colPointerDown(ev: React.PointerEvent<HTMLDivElement>, dayIdx: number) {
    if (ev.button !== 0) return;
    if ((ev.target as HTMLElement).closest("[data-block]")) return;
    const m = minuteFromPointer(ev, ev.currentTarget);
    draftRef.current = { dayIdx, startY: ev.clientY, startMin: m, moved: false, pointerType: ev.pointerType, t: ev.timeStamp };
    if (ev.pointerType !== "touch") {
      ev.currentTarget.setPointerCapture(ev.pointerId);
      setDraft({ dayIdx, a: m, b: m + STEP_MIN });
    }
  }
  function colPointerMove(ev: React.PointerEvent<HTMLDivElement>) {
    const d = draftRef.current;
    if (!d) return;
    if (Math.abs(ev.clientY - d.startY) > 6) d.moved = true;
    if (d.pointerType === "touch") return;
    const m = minuteFromPointer(ev, ev.currentTarget);
    const a = Math.min(d.startMin, m);
    const b = Math.max(d.startMin + STEP_MIN, m + STEP_MIN);
    setDraft({ dayIdx: d.dayIdx, a, b });
  }
  function colPointerUp(ev: React.PointerEvent<HTMLDivElement>, dayIdx: number) {
    const d = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!d) return;
    const day = days[dayIdx];
    const mk = (min: number) => addMinutes(day, min);
    if (d.pointerType === "touch") {
      if (!d.moved && ev.timeStamp - d.t < 500) {
        const m = minuteFromPointer(ev, ev.currentTarget);
        const start = Math.floor(m / 60) * 60 >= startMin ? m : startMin;
        onCreate(mk(start), mk(Math.min(start + 60, endMin)));
      }
      return;
    }
    if (!d.moved) {
      onCreate(mk(d.startMin), mk(Math.min(d.startMin + 60, endMin)));
      return;
    }
    const m = minuteFromPointer(ev, ev.currentTarget);
    const a = Math.min(d.startMin, m);
    const b = Math.max(d.startMin + STEP_MIN, m + STEP_MIN);
    onCreate(mk(a), mk(b));
  }

  const hours = useMemo(() => Array.from({ length: hourEnd - hourStart + 1 }, (_, i) => hourStart + i), [hourStart, hourEnd]);
  const nowMin = minutesOfDay(nowTz);
  const showNow = nowMin >= startMin && nowMin <= endMin;

  return (
    <div ref={scrollRef} className={cn("relative flex-1 overflow-y-auto overflow-x-hidden overscroll-contain", className)} data-scroll>
      {showHeader ? (
        <div className="sticky top-0 z-30 flex border-b border-border bg-bg">
          <div className="w-[52px] shrink-0 md:w-[60px]" />
          {days.map((d) => {
            const today = isSameDay(d, nowTz);
            return (
              <div key={d.toISOString()} className="flex flex-1 flex-col items-center py-2">
                <span className={cn("text-[11px] font-semibold uppercase tracking-wider", today ? "text-accent" : "text-muted")}>
                  {fmt(d, "EEE")}
                </span>
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 items-center justify-center rounded-full font-display text-[17px] font-bold tabular",
                    today && "bg-accent text-accent-fg shadow-md",
                  )}
                >
                  {fmt(d, "d")}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <DndContext sensors={sensors} modifiers={[snapModifier]} onDragEnd={onDragEnd}>
        <div className="relative flex" style={{ height: gridHeight + 24 }}>
          {/* Gouttière des heures */}
          <div className="relative w-[52px] shrink-0 select-none md:w-[60px]">
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-2 -translate-y-1/2 font-mono text-[10.5px] text-muted tabular md:text-[11px]"
                style={{ top: (h * 60 - startMin) * pxPerMin }}
              >
                {h === 24 ? "00:00" : `${String(h).padStart(2, "0")}:00`}
              </div>
            ))}
            {showNow ? (
              <div
                className="absolute right-1 z-20 -translate-y-1/2 rounded-xs bg-danger px-1 font-mono text-[10px] font-bold text-white tabular"
                style={{ top: (nowMin - startMin) * pxPerMin }}
              >
                {fmt(nowTz, "HH:mm")}
              </div>
            ) : null}
          </div>

          {/* Colonnes */}
          <div ref={colsRef} className="relative flex flex-1">
            {/* Lignes horaires */}
            <div className="pointer-events-none absolute inset-0">
              {hours.map((h) => (
                <div key={h} className="absolute inset-x-0 border-t border-grid" style={{ top: (h * 60 - startMin) * pxPerMin }}>
                  {h < hourEnd ? (
                    <div className="absolute inset-x-0 border-t border-dashed border-grid/70" style={{ top: 30 * pxPerMin }} />
                  ) : null}
                </div>
              ))}
            </div>

            {perDay.map(({ day, laid, bg }, dayIdx) => {
              const today = isSameDay(day, nowTz);
              return (
                <div
                  key={day.toISOString()}
                  className={cn("relative flex-1 border-l border-grid first:border-l-0", today && "bg-accent/[0.035]")}
                  style={{ height: gridHeight, touchAction: "pan-y" }}
                  onPointerDown={(e) => colPointerDown(e, dayIdx)}
                  onPointerMove={colPointerMove}
                  onPointerUp={(e) => colPointerUp(e, dayIdx)}
                  onPointerCancel={() => {
                    draftRef.current = null;
                    setDraft(null);
                  }}
                >
                  {/* Cours (fond grisé) */}
                  {bg.map(({ item, top, height, col, cols }) => (
                    <div
                      key={item.id}
                      className="pointer-events-none absolute overflow-hidden rounded-sm border border-dashed border-border-strong/60 bg-ical px-1.5 py-1 text-ical-fg"
                      style={{
                        top: (top - startMin) * pxPerMin,
                        height: Math.max(14, height * pxPerMin - 2),
                        left: `calc(${(100 / cols) * col}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`,
                      }}
                    >
                      <p className="truncate text-[10.5px] font-bold uppercase leading-tight tracking-wide">{item.label}</p>
                      {item.sub && height >= 45 ? <p className="truncate text-[10px] leading-tight opacity-80">{item.sub}</p> : null}
                    </div>
                  ))}

                  {/* Brouillon de création */}
                  {draft && draft.dayIdx === dayIdx ? (
                    <div
                      className="pointer-events-none absolute inset-x-1 z-20 rounded-sm border-2 border-dashed border-accent bg-accent/15 px-2 py-1 text-[11px] font-semibold text-accent"
                      style={{ top: (draft.a - startMin) * pxPerMin, height: (draft.b - draft.a) * pxPerMin }}
                    >
                      {fmtMin(draft.a)} – {fmtMin(draft.b)}
                    </div>
                  ) : null}

                  {/* Blocs */}
                  {laid.map(({ item, top, height, col, cols }) => {
                    const isResizing = resizing?.id === item.id;
                    const h = isResizing ? (resizing!.endMin - top) * pxPerMin : height * pxPerMin;
                    const width = `calc(${100 / cols}% - ${cols > 1 ? 3 : 4}px)`;
                    const left = `calc(${(100 / cols) * col}% + 2px)`;
                    const style = { top: (top - startMin) * pxPerMin, height: Math.max(18, h - 2), width, left };
                    if (item.kind === "event") {
                      return (
                        <EventBlock
                          key={item.id}
                          event={item.data}
                          subject={subjects.get(item.data.subject_id)}
                          start={item.start}
                          end={isResizing ? addMinutes(item.start, resizing!.endMin - minutesOfDay(item.start)) : item.end}
                          style={style}
                          compact={h < 44}
                          onOpen={() => onOpenEvent(item.id)}
                          onToggleStatus={(s) => onToggleStatus(item.id, s)}
                          onResizeStart={(e) => startResize(e, item)}
                          onResizeMove={moveResize}
                          onResizeEnd={endResize}
                        />
                      );
                    }
                    return (
                      <EvalBlock
                        key={item.id}
                        evaluation={item.data}
                        subject={subjects.get(item.data.subject_id)}
                        start={item.start}
                        end={item.end}
                        timezone={timezone}
                        style={style}
                        compact={h < 44}
                        onOpen={() => onOpenEval(item.id)}
                      />
                    );
                  })}

                  {/* Ligne "maintenant" */}
                  {today && showNow ? (
                    <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: (nowMin - startMin) * pxPerMin }}>
                      <span className="-ml-[5px] h-2.5 w-2.5 rounded-full bg-danger shadow-[0_0_0_3px_var(--bg)]" />
                      <span className="h-[2px] flex-1 bg-danger" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </DndContext>
    </div>
  );
}

function fmtMin(m: number) {
  const h = Math.floor(m / 60) % 24;
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
