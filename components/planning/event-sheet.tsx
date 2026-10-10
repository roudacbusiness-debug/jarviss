"use client";

import { useState } from "react";
import { addMinutes, differenceInMinutes } from "date-fns";
import { Check, FileText, Play, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SubjectIcon } from "@/lib/subjects/icons";
import { combine, fmt, isoDate, tz } from "@/lib/dates";
import { useCreateEvent, useDeleteEvent, useEvent, useTaskMutations, useTasks, useUpdateEvent, type EventWithMeta } from "@/lib/queries/events";
import { useSubjects } from "@/lib/queries/subjects";
import { useSettings } from "@/lib/queries/settings";
import { usePlanning } from "@/stores/planning";
import type { StudyEvent, Subject } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { LinkedDocuments } from "./linked-documents";

type Status = StudyEvent["status"];

export function EventSheet() {
  const { selectedEventId, draft, openEvent, openDraft } = usePlanning();
  const open = !!selectedEventId || !!draft;
  const close = () => {
    openEvent(null);
    openDraft(null);
  };
  const { data: event } = useEvent(selectedEventId);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent title={draft ? "Nouveau bloc" : "Bloc de révision"} header={<span className="text-[12px] font-semibold uppercase tracking-wider text-muted">{draft ? "Nouveau bloc" : "Bloc de révision"}</span>}>
        {draft ? (
          <EventForm key="draft" draft={draft} onClose={close} />
        ) : event ? (
          <EventForm key={event.id} event={event} onClose={close} />
        ) : (
          <p className="text-sm text-muted">Chargement…</p>
        )}
      </SheetContent>
    </Sheet>
  );
}

function EventForm({
  event,
  draft,
  onClose,
}: {
  event?: EventWithMeta;
  draft?: { starts_at: string; ends_at: string; subject_id?: string; title?: string; document_ids?: string[] };
  onClose: () => void;
}) {
  const { settings } = useSettings();
  const timezone = settings.timezone;
  const { subjects } = useSubjects();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();
  const startFocus = usePlanning((s) => s.startFocus);

  const src = event ?? draft!;
  const s0 = tz(src.starts_at, timezone);
  const e0 = tz(src.ends_at, timezone);

  const defaultSubject = draft?.subject_id ?? event?.subject_id ?? subjects.find((s) => s.priority === "haute")?.id ?? subjects[0]?.id ?? "";
  const [subjectId, setSubjectId] = useState(defaultSubject);
  const [title, setTitle] = useState(src.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [date, setDate] = useState(isoDate(s0));
  const [startTime, setStartTime] = useState(fmt(s0, "HH:mm"));
  const [duration, setDuration] = useState(Math.max(15, differenceInMinutes(e0, s0)));
  const [status, setStatus] = useState<Status>(event?.status ?? "prevu");
  const [draftDocs, setDraftDocs] = useState<string[]>(draft?.document_ids ?? []);

  const effectiveSubject = subjectId || subjects[0]?.id || "";

  function computeRange(d = date, t = startTime, dur = duration) {
    const start = combine(d, t, timezone);
    return { starts_at: start.toISOString(), ends_at: addMinutes(start, dur).toISOString() };
  }

  async function save(patch: Partial<StudyEvent>) {
    if (!event) return;
    try {
      await update.mutateAsync({ id: event.id, ...patch });
    } catch {
      toast.error("Enregistrement impossible");
    }
  }

  async function createBlock() {
    if (!effectiveSubject) {
      toast.error("Ajoute d'abord une matière dans les réglages");
      return;
    }
    try {
      const created = await create.mutateAsync({
        subject_id: effectiveSubject,
        title: title.trim(),
        description: description.trim(),
        status,
        ...computeRange(),
        document_ids: draftDocs,
      });
      toast.success("Bloc créé");
      onClose();
      // Réouvre la fiche pour continuer (checklist, PDF)
      usePlanning.getState().openEvent(created.id);
    } catch {
      toast.error("Création impossible");
    }
  }

  async function del() {
    if (!event) return;
    if (!confirm("Supprimer ce bloc ?")) return;
    await remove.mutateAsync(event.id);
    onClose();
  }

  const subject = subjects.find((s) => s.id === effectiveSubject);

  return (
    <div className="space-y-5">
      {/* Matière */}
      <div>
        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">Matière</p>
        <SubjectChips
          subjects={subjects}
          value={effectiveSubject}
          onChange={(id) => {
            setSubjectId(id);
            if (event) save({ subject_id: id });
          }}
        />
      </div>

      <Field label="Titre">
        <Input
          value={title}
          placeholder={subject ? `Ex. ${subject.name} — chapitre 3` : "Titre"}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => event && title !== event.title && save({ title: title.trim() })}
          autoFocus={!!draft}
        />
      </Field>

      <Field label="Ce que je vais faire">
        <Textarea
          value={description}
          placeholder="Objectifs, exercices à faire, pages à relire…"
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => event && description !== event.description && save({ description: description.trim() })}
        />
      </Field>

      {/* Horaires */}
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
        <Field label="Date">
          <Input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              if (event && e.target.value) save(computeRange(e.target.value));
            }}
          />
        </Field>
        <Field label="Début">
          <Input
            type="time"
            step={300}
            value={startTime}
            onChange={(e) => {
              setStartTime(e.target.value);
              if (event && e.target.value) save(computeRange(undefined, e.target.value));
            }}
          />
        </Field>
        <Field label="Durée">
          <select
            className="h-10 w-full appearance-none rounded-md border border-border bg-surface-2 px-3 text-sm focus-ring"
            value={duration}
            onChange={(e) => {
              const d = Number(e.target.value);
              setDuration(d);
              if (event) save(computeRange(undefined, undefined, d));
            }}
          >
            {[15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ""}`}
              </option>
            ))}
            {![15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240, 300].includes(duration) ? (
              <option value={duration}>{duration} min</option>
            ) : null}
          </select>
        </Field>
      </div>

      {/* Statut */}
      <Field label="Statut">
        <Segmented<Status>
          id="status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            if (event) save({ status: v });
          }}
          options={[
            { value: "prevu", label: "Prévu" },
            { value: "fait", label: <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Fait</span> },
            { value: "rate", label: <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Raté</span> },
          ]}
        />
      </Field>

      {/* Checklist */}
      {event ? <Checklist eventId={event.id} /> : <p className="text-xs text-muted">La checklist et les PDF liés seront disponibles dès que le bloc est créé.</p>}

      {/* PDF liés */}
      <LinkedDocuments eventId={event?.id ?? null} draftDocs={draftDocs} onDraftChange={setDraftDocs} subjectId={effectiveSubject} />

      {/* Actions */}
      <div className="flex items-center justify-between gap-2 border-t border-border pt-4">
        {event ? (
          <>
            <Button variant="danger" size="sm" onClick={del} loading={remove.isPending}>
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
            <Button
              onClick={() => {
                startFocus(event.id);
                onClose();
              }}
              style={subject ? { background: subject.color, color: "#fff" } : undefined}
            >
              <Play className="h-4 w-4 fill-current" /> Focus {settings.focus_minutes} min
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button onClick={createBlock} loading={create.isPending}>
              <Plus className="h-4 w-4" /> Créer le bloc
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function SubjectChips({ subjects, value, onChange, size = "md" }: { subjects: Subject[]; value: string; onChange: (id: string) => void; size?: "sm" | "md" }) {
  return (
    <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 no-scrollbar">
      {subjects.map((s) => {
        const active = s.id === value;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onChange(s.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-full border font-semibold transition-all focus-ring",
              size === "md" ? "h-9 px-3 text-[13px]" : "h-7 px-2.5 text-[12px]",
              active ? "border-transparent text-white shadow-sm" : "border-border bg-surface-2 text-fg-2 hover:border-border-strong",
            )}
            style={active ? { background: s.color } : undefined}
          >
            <SubjectIcon name={s.icon} className={size === "md" ? "h-4 w-4" : "h-3.5 w-3.5"} />
            {s.name}
          </button>
        );
      })}
    </div>
  );
}

function Checklist({ eventId }: { eventId: string }) {
  const { tasks } = useTasks(eventId);
  const { add, update, remove } = useTaskMutations(eventId);
  const [label, setLabel] = useState("");
  const done = tasks.filter((t) => t.done).length;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    await add.mutateAsync({ label: label.trim(), position: tasks.length });
    setLabel("");
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Checklist</p>
        {tasks.length ? (
          <span className="font-mono text-[11px] text-muted tabular">
            {done}/{tasks.length}
          </span>
        ) : null}
      </div>
      {tasks.length ? (
        <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-success transition-[width] duration-300" style={{ width: `${(done / tasks.length) * 100}%` }} />
        </div>
      ) : null}
      <ul className="space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="group flex items-center gap-2 rounded-sm px-1 py-1 hover:bg-surface-2">
            <button
              type="button"
              onClick={() => update.mutate({ id: t.id, done: !t.done })}
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border transition-colors",
                t.done ? "border-success bg-success text-white" : "border-border-strong hover:border-fg",
              )}
              aria-label={t.done ? "Décocher" : "Cocher"}
            >
              {t.done ? <Check className="h-3 w-3" /> : null}
            </button>
            <span className={cn("flex-1 text-sm", t.done && "text-muted line-through")}>{t.label}</span>
            <button
              type="button"
              onClick={() => remove.mutate(t.id)}
              className="rounded-xs p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              aria-label="Supprimer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-1 flex gap-2">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ajouter une tâche…" className="h-9" />
        <Button type="submit" variant="secondary" size="icon-sm" className="h-9 w-9 shrink-0" aria-label="Ajouter" disabled={!label.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

export { FileText };
