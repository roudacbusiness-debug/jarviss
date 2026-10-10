"use client";

import { useEffect, useMemo, useState } from "react";
import { addDays, addMinutes, isSameDay, subDays } from "date-fns";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import { BarChart3, ChevronLeft, ChevronRight, Flag, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tip } from "@/components/ui/tooltip";
import { useIsDesktop, useIsWide } from "@/hooks/use-media-query";
import { combine, fmt, isoDate, isoWeekday, nowTz, roundToStep, weekDays, weekStart } from "@/lib/dates";
import { useEvents, useUpdateEvent } from "@/lib/queries/events";
import { useEvaluations, useUpdateEvaluation } from "@/lib/queries/evaluations";
import { useIcalEvents, useIcalFeeds, useSyncIcal } from "@/lib/queries/ical";
import { useSettings } from "@/lib/queries/settings";
import { useSubjectMap, useSubjects } from "@/lib/queries/subjects";
import { useTimetable } from "@/lib/queries/timetable";
import { usePlanning, type CalendarView } from "@/stores/planning";
import { cn } from "@/lib/utils/cn";
import { TimeGrid, type BackgroundItem } from "./time-grid";
import { EventSheet } from "./event-sheet";
import { EvalDialog } from "./eval-dialog";
import { WeekSidebar } from "./week-sidebar";
import { FocusOverlay } from "@/components/focus/focus-overlay";

export function PlanningView() {
  const { settings } = useSettings();
  const timezone = settings.timezone;
  const isDesktop = useIsDesktop();
  const isWide = useIsWide();

  const { view: storedView, anchor, setView, setAnchor, openDraft, openEval, openEvent } = usePlanning();
  const view: CalendarView = storedView ?? (isDesktop ? "week" : "day");

  const anchorTz = useMemo(() => combine(anchor, "00:00", timezone), [anchor, timezone]);

  const wStart = useMemo(() => weekStart(anchorTz, timezone, settings.week_start as 0 | 1), [anchorTz, timezone, settings.week_start]);
  const wEnd = useMemo(() => addDays(wStart, 7), [wStart]);
  const days = useMemo(() => (view === "week" ? weekDays(wStart) : [anchorTz]), [view, wStart, anchorTz]);

  const fromIso = wStart.toISOString();
  const toIso = wEnd.toISOString();

  const { events } = useEvents(fromIso, toIso);
  const { evaluations } = useEvaluations();
  const { subjects } = useSubjects();
  const subjectMap = useSubjectMap();
  const { slots } = useTimetable();
  const { feeds } = useIcalFeeds();
  const hasFeeds = feeds.some((f) => f.enabled);
  const { icalEvents } = useIcalEvents(fromIso, toIso, hasFeeds);
  const sync = useSyncIcal();
  const updateEvent = useUpdateEvent();
  const updateEval = useUpdateEvaluation();

  // Synchronisation iCal automatique si > 1 h
  useEffect(() => {
    const stale = feeds.filter((f) => f.enabled && (!f.last_synced_at || Date.now() - new Date(f.last_synced_at).getTime() > 3_600_000));
    if (stale.length && !sync.isPending) sync.mutate(undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feeds.length]);

  // Fond grisé : emploi du temps fixe + iCal
  const background = useMemo<BackgroundItem[]>(() => {
    const items: BackgroundItem[] = [];
    for (const day of days) {
      const wd = isoWeekday(day);
      for (const s of slots) {
        if (s.weekday !== wd) continue;
        const d = isoDate(day);
        items.push({
          id: `tt:${s.id}:${d}`,
          label: s.label,
          sub: [s.teacher, s.room].filter(Boolean).join(" · "),
          start: combine(d, s.start_time.slice(0, 5), timezone),
          end: combine(d, s.end_time.slice(0, 5), timezone),
        });
      }
    }
    for (const e of icalEvents) {
      items.push({ id: `ical:${e.id}`, label: e.summary, sub: e.location, start: new Date(e.starts_at), end: new Date(e.ends_at) });
    }
    return items;
  }, [days, slots, icalEvents, timezone]);

  // Navigation
  const [dir, setDir] = useState(1);
  function go(delta: number) {
    setDir(delta);
    const next = view === "week" ? addDays(anchorTz, 7 * delta) : addDays(anchorTz, delta);
    setAnchor(isoDate(next));
  }
  function today() {
    const n = nowTz(timezone);
    setDir(n > anchorTz ? 1 : -1);
    setAnchor(isoDate(n));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || (e.target as HTMLElement)?.isContentEditable) return;
      if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "t") today();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorTz, view, timezone]);

  // Handlers de la grille
  function onCreate(start: Date, end: Date) {
    openDraft({ starts_at: start.toISOString(), ends_at: end.toISOString() });
  }
  function onMoveEvent(id: string, start: Date, end: Date) {
    updateEvent.mutate({ id, starts_at: start.toISOString(), ends_at: end.toISOString() }, { onError: () => toast.error("Déplacement impossible") });
  }
  function onMoveEval(id: string, start: Date, end: Date) {
    updateEval.mutate({ id, starts_at: start.toISOString(), ends_at: end.toISOString() }, { onError: () => toast.error("Déplacement impossible") });
  }
  function onResizeEvent(id: string, end: Date) {
    updateEvent.mutate({ id, ends_at: end.toISOString() }, { onError: () => toast.error("Redimensionnement impossible") });
  }
  function onToggleStatus(id: string, status: "prevu" | "fait" | "rate") {
    updateEvent.mutate({ id, status });
  }

  function quickBlock() {
    const n = nowTz(timezone);
    const base = isSameDay(n, anchorTz) ? roundToStep(addMinutes(n, 15) as typeof n, 15) : combine(anchor, "18:00", timezone);
    openDraft({ starts_at: base.toISOString(), ends_at: addMinutes(base, 60).toISOString() });
  }

  function onSwipe(_: unknown, info: PanInfo) {
    if (view !== "day") return;
    if (info.offset.x < -70 && Math.abs(info.offset.y) < 80) go(1);
    else if (info.offset.x > 70 && Math.abs(info.offset.y) < 80) go(-1);
  }

  const [statsOpen, setStatsOpen] = useState(false);
  const title =
    view === "week"
      ? `${fmt(wStart, "d")}${fmt(wStart, "MMM") !== fmt(subDays(wEnd, 1), "MMM") ? fmt(wStart, " MMM") : ""} – ${fmt(subDays(wEnd, 1), "d MMM yyyy")}`
      : fmt(anchorTz, "EEEE d MMMM");
  const weekEvents = events;
  const isToday = isSameDay(nowTz(timezone), anchorTz);

  return (
    <div className="flex h-dvh min-h-0 flex-col md:h-dvh">
      {/* En-tête */}
      <header className="flex items-center gap-2 border-b border-border px-3 py-2.5 md:px-5 safe-top">
        <div className="flex items-center gap-1">
          <Tip label="Précédent">
            <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label="Précédent">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Tip>
          <Tip label="Suivant">
            <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label="Suivant">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Tip>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.h1
            key={title}
            initial={{ opacity: 0, x: dir * 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -dir * 12 }}
            transition={{ duration: 0.18 }}
            className="min-w-0 flex-1 truncate font-display text-[17px] font-extrabold capitalize tracking-tight md:text-xl"
          >
            {title}
          </motion.h1>
        </AnimatePresence>
        <Button variant={isToday && view === "day" ? "secondary" : "outline"} size="sm" onClick={today} className="hidden sm:inline-flex">
          Aujourd&apos;hui
        </Button>
        <Segmented<CalendarView>
          id="view"
          value={view}
          onChange={setView}
          options={[
            { value: "week", label: "Semaine" },
            { value: "day", label: "Jour" },
          ]}
        />
        <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={() => openEval(null, anchor)}>
          <Flag className="h-4 w-4" /> Éval
        </Button>
        <Button size="sm" className="hidden md:inline-flex" onClick={quickBlock}>
          <Plus className="h-4 w-4" /> Bloc
        </Button>
        {!isWide ? (
          <Tip label="Résumé de la semaine">
            <Button variant="ghost" size="icon-sm" onClick={() => setStatsOpen(true)} aria-label="Résumé">
              <BarChart3 className="h-4 w-4" />
            </Button>
          </Tip>
        ) : null}
      </header>

      {/* Corps */}
      <div className="flex min-h-0 flex-1">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={view === "week" ? fromIso : anchor}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -dir * 40 }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.8 }}
            drag={view === "day" && !isDesktop ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            dragDirectionLock
            onDragEnd={onSwipe}
            className="flex min-h-0 min-w-0 flex-1 flex-col"
          >
            <TimeGrid
              days={days}
              timezone={timezone}
              hourStart={settings.day_start_hour}
              hourEnd={settings.day_end_hour}
              events={events}
              evaluations={evaluations}
              background={background}
              subjects={subjectMap}
              pxPerHour={isDesktop ? 64 : 58}
              onCreate={onCreate}
              onMoveEvent={onMoveEvent}
              onMoveEval={onMoveEval}
              onResizeEvent={onResizeEvent}
              onOpenEvent={openEvent}
              onOpenEval={(id) => openEval(id)}
              onToggleStatus={onToggleStatus}
            />
          </motion.div>
        </AnimatePresence>

        {isWide ? (
          <div className="w-[300px] shrink-0 overflow-y-auto border-l border-border px-4 py-4" data-scroll>
            <WeekSidebar events={weekEvents} evaluations={evaluations} subjects={subjects} timezone={timezone} />
          </div>
        ) : null}
      </div>

      {/* Résumé (mobile / écrans étroits) */}
      <Sheet open={statsOpen} onOpenChange={setStatsOpen}>
        <SheetContent title="Résumé de la semaine">
          <WeekSidebar events={weekEvents} evaluations={evaluations} subjects={subjects} timezone={timezone} />
        </SheetContent>
      </Sheet>

      {/* Bouton flottant mobile */}
      <div className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-4 z-40 md:hidden">
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-transform active:scale-95 focus-ring"
              aria-label="Ajouter"
            >
              <Plus className="h-6 w-6" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" side="top" className="w-56 p-1.5">
            <FabItem icon={<Plus className="h-4 w-4" />} label="Bloc de révision" onClick={quickBlock} />
            <FabItem icon={<Flag className="h-4 w-4" />} label="Évaluation" onClick={() => openEval(null, anchor)} />
          </PopoverContent>
        </Popover>
      </div>

      <EventSheet />
      <EvalDialog />
      <FocusOverlay />
    </div>
  );
}

function FabItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn("flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-2 focus-ring")}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-xs bg-accent-soft text-accent">{icon}</span>
      {label}
    </button>
  );
}
