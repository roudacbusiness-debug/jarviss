"use client";

import { useState } from "react";
import { addMinutes, differenceInMinutes } from "date-fns";
import { Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { combine, fmt, isoDate, tz } from "@/lib/dates";
import { EVAL_TYPE_LABEL, useCreateEvaluation, useDeleteEvaluation, useEvaluations, useUpdateEvaluation } from "@/lib/queries/evaluations";
import { useSubjects } from "@/lib/queries/subjects";
import { useSettings } from "@/lib/queries/settings";
import { usePlanning } from "@/stores/planning";
import type { Evaluation } from "@/lib/types/database";
import { SubjectChips } from "./event-sheet";

type EvalType = Evaluation["eval_type"];

export function EvalDialog() {
  const { evalDialog, closeEval } = usePlanning();
  const { evaluations } = useEvaluations();
  const current = evalDialog.id ? evaluations.find((e) => e.id === evalDialog.id) : undefined;

  return (
    <Dialog open={evalDialog.open} onOpenChange={(o) => !o && closeEval()}>
      <DialogContent title={current ? "Évaluation" : "Nouvelle évaluation"} description={current ? undefined : "DS, contrôle ou oral : ajoute-la pour voir le compte à rebours."}>
        <EvalForm key={current?.id ?? `new-${evalDialog.date ?? ""}`} evaluation={current} defaultDate={evalDialog.date} onClose={closeEval} />
      </DialogContent>
    </Dialog>
  );
}

function EvalForm({ evaluation, defaultDate, onClose }: { evaluation?: Evaluation; defaultDate?: string; onClose: () => void }) {
  const { settings } = useSettings();
  const timezone = settings.timezone;
  const { subjects } = useSubjects();
  const create = useCreateEvaluation();
  const update = useUpdateEvaluation();
  const remove = useDeleteEvaluation();

  const s0 = evaluation ? tz(evaluation.starts_at, timezone) : null;
  const e0 = evaluation ? tz(evaluation.ends_at, timezone) : null;

  const [subjectId, setSubjectId] = useState(evaluation?.subject_id ?? subjects.find((s) => s.priority === "haute")?.id ?? subjects[0]?.id ?? "");
  const [title, setTitle] = useState(evaluation?.title ?? "");
  const [type, setType] = useState<EvalType>(evaluation?.eval_type ?? "ds");
  const [date, setDate] = useState(s0 ? isoDate(s0) : (defaultDate ?? isoDate(tz(new Date(), timezone))));
  const [time, setTime] = useState(s0 ? fmt(s0, "HH:mm") : "08:00");
  const [duration, setDuration] = useState(s0 && e0 ? differenceInMinutes(e0, s0) : 120);
  const [notes, setNotes] = useState(evaluation?.notes ?? "");

  const effectiveSubject = subjectId || subjects[0]?.id || "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!effectiveSubject) {
      toast.error("Ajoute d'abord une matière");
      return;
    }
    const start = combine(date, time, timezone);
    const payload = {
      subject_id: effectiveSubject,
      title: title.trim(),
      eval_type: type,
      starts_at: start.toISOString(),
      ends_at: addMinutes(start, duration).toISOString(),
      notes: notes.trim(),
    };
    try {
      if (evaluation) {
        await update.mutateAsync({ id: evaluation.id, ...payload });
        toast.success("Évaluation mise à jour");
      } else {
        await create.mutateAsync(payload);
        toast.success("Évaluation ajoutée");
      }
      onClose();
    } catch {
      toast.error("Enregistrement impossible");
    }
  }

  async function del() {
    if (!evaluation || !confirm("Supprimer cette évaluation ?")) return;
    await remove.mutateAsync(evaluation.id);
    onClose();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-wider text-muted">Matière</p>
        <SubjectChips subjects={subjects} value={effectiveSubject} onChange={setSubjectId} />
      </div>
      <Field label="Type">
        <Segmented<EvalType>
          id="evaltype"
          value={type}
          onChange={setType}
          options={(Object.keys(EVAL_TYPE_LABEL) as EvalType[]).map((k) => ({ value: k, label: EVAL_TYPE_LABEL[k] }))}
        />
      </Field>
      <Field label="Intitulé (optionnel)">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. DS n°2 — suites et limites" />
      </Field>
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
        <Field label="Date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Heure">
          <Input type="time" step={300} value={time} onChange={(e) => setTime(e.target.value)} required />
        </Field>
        <Field label="Durée">
          <select
            className="h-10 w-full appearance-none rounded-md border border-border bg-surface-2 px-3 text-sm focus-ring"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {[30, 55, 60, 90, 120, 150, 180, 240].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ""}`}
              </option>
            ))}
            {![30, 55, 60, 90, 120, 150, 180, 240].includes(duration) ? <option value={duration}>{duration} min</option> : null}
          </select>
        </Field>
      </div>
      <Field label="Notes">
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Chapitres au programme, matériel autorisé…" className="min-h-[72px]" />
      </Field>
      <div className="flex items-center justify-between gap-2 pt-1">
        {evaluation ? (
          <Button type="button" variant="danger" size="sm" onClick={del} loading={remove.isPending}>
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button type="submit" loading={create.isPending || update.isPending}>
            <Flag className="h-4 w-4" /> {evaluation ? "Enregistrer" : "Ajouter l'éval"}
          </Button>
        </div>
      </div>
    </form>
  );
}
