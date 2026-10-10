"use client";

import { Flag, Timer } from "lucide-react";
import { countdownLabel, fmt, fmtHours, hoursBetween, tz } from "@/lib/dates";
import { EVAL_TYPE_LABEL } from "@/lib/queries/evaluations";
import type { EventWithMeta } from "@/lib/queries/events";
import type { Evaluation, Subject } from "@/lib/types/database";
import { SubjectIcon } from "@/lib/subjects/icons";
import { usePlanning } from "@/stores/planning";
import { useNow } from "@/hooks/use-now";
import { cn } from "@/lib/utils/cn";

export function WeekSidebar({
  events,
  evaluations,
  subjects,
  timezone,
  className,
}: {
  events: EventWithMeta[];
  evaluations: Evaluation[];
  subjects: Subject[];
  timezone: string;
  className?: string;
}) {
  const openEval = usePlanning((s) => s.openEval);

  const stats = subjects
    .map((s) => {
      const mine = events.filter((e) => e.subject_id === s.id);
      const planned = mine.reduce((acc, e) => acc + hoursBetween(e.starts_at, e.ends_at), 0);
      const done = mine.filter((e) => e.status === "fait").reduce((acc, e) => acc + hoursBetween(e.starts_at, e.ends_at), 0);
      return { subject: s, planned, done, count: mine.length };
    })
    .filter((x) => x.count > 0);
  const totalPlanned = stats.reduce((a, s) => a + s.planned, 0);
  const totalDone = stats.reduce((a, s) => a + s.done, 0);
  const maxPlanned = Math.max(1, ...stats.map((s) => s.planned));

  const now = useNow(60_000).getTime();
  const upcoming = evaluations.filter((e) => new Date(e.ends_at).getTime() >= now).slice(0, 6);

  return (
    <aside className={cn("flex flex-col gap-6", className)}>
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-muted">Cette semaine</h2>
          <p className="font-display text-sm font-bold tabular">
            <span className="text-success">{fmtHours(totalDone)}</span>
            <span className="text-muted"> / {fmtHours(totalPlanned)}</span>
          </p>
        </div>
        {stats.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
            Aucun bloc prévu. Clique-glisse dans la grille pour en créer un.
          </p>
        ) : (
          <ul className="space-y-3">
            {stats.map(({ subject, planned, done }) => (
              <li key={subject.id}>
                <div className="mb-1 flex items-center gap-2 text-[13px]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-xs text-white" style={{ background: subject.color }}>
                    <SubjectIcon name={subject.icon} className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 truncate font-semibold">{subject.name}</span>
                  <span className="font-mono text-[12px] text-muted tabular">
                    {fmtHours(done)} / {fmtHours(planned)}
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full opacity-35"
                    style={{ width: `${(planned / maxPlanned) * 100}%`, background: subject.color }}
                  />
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
                    style={{ width: `${(done / maxPlanned) * 100}%`, background: subject.color }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wider text-muted">Prochaines évals</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted">
            Aucune évaluation à venir. Utilise « + Éval ».
          </p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((ev) => {
              const s = subjects.find((x) => x.id === ev.subject_id);
              const start = tz(ev.starts_at, timezone);
              const label = countdownLabel(start, timezone);
              const urgent = label === "aujourd'hui" || label === "demain" || /^J-[1-3]$/.test(label);
              return (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => openEval(ev.id)}
                    className="flex w-full items-center gap-3 rounded-md border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-border-strong focus-ring"
                  >
                    <span
                      className={cn(
                        "flex h-10 min-w-[48px] items-center justify-center rounded-sm px-1.5 font-display text-[13px] font-extrabold tabular",
                        urgent ? "bg-danger text-white" : "bg-surface-3 text-fg",
                      )}
                    >
                      {label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                        <span className="rounded-xs px-1 text-[10px] font-extrabold uppercase tracking-wide text-white" style={{ background: s?.color }}>
                          {EVAL_TYPE_LABEL[ev.eval_type]}
                        </span>
                        {ev.title || s?.name}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {ev.title ? `${s?.name} · ` : ""}
                        {fmt(start, "EEE d MMM · HH:mm")}
                      </p>
                    </div>
                    <Flag className="h-4 w-4 shrink-0 text-muted" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-md bg-surface-2 p-3 text-xs text-muted">
        <p className="flex items-center gap-1.5 font-semibold text-fg-2">
          <Timer className="h-3.5 w-3.5" /> Astuces
        </p>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5">
          <li>Clique-glisse dans la grille pour créer un bloc.</li>
          <li>Glisse un bloc pour le déplacer, tire son bord bas pour l&apos;allonger.</li>
          <li>Ouvre un bloc puis « Focus » pour lancer le minuteur.</li>
        </ul>
      </section>
    </aside>
  );
}
