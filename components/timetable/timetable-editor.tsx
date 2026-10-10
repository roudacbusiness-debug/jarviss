"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/input";
import { useDeleteSlot, useTimetable, useUpsertSlot } from "@/lib/queries/timetable";
import type { TimetableSlot } from "@/lib/types/database";

export const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

function hhmm(t: string) {
  return t.slice(0, 5);
}

export function TimetableEditor() {
  const { slots, isLoading } = useTimetable();
  const remove = useDeleteSlot();
  const [editing, setEditing] = useState<TimetableSlot | null | undefined>(undefined);

  const byDay = new Map<number, TimetableSlot[]>();
  for (const s of slots) byDay.set(s.weekday, [...(byDay.get(s.weekday) ?? []), s]);
  const days = [1, 2, 3, 4, 5, 6, 7].filter((d) => byDay.has(d));

  return (
    <div className="space-y-4">
      {isLoading ? <p className="text-sm text-muted">Chargement…</p> : null}
      {!isLoading && slots.length === 0 ? (
        <p className="text-sm text-muted">Aucun cours fixe. Ajoute tes cours hebdomadaires pour planifier autour.</p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {days.map((d) => (
          <div key={d}>
            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">{WEEKDAYS[d - 1]}</p>
            <ul className="space-y-1.5">
              {byDay.get(d)!.map((s) => (
                <li key={s.id} className="group flex items-start gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[11px] text-muted tabular">
                      {hhmm(s.start_time)} – {hhmm(s.end_time)}
                    </p>
                    <p className="truncate text-[13px] font-semibold leading-tight">{s.label}</p>
                    {s.teacher || s.room ? (
                      <p className="truncate text-[11px] text-muted">
                        {[s.teacher, s.room].filter(Boolean).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-col gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
                    <button className="rounded-xs p-1 text-muted hover:text-fg" onClick={() => setEditing(s)} aria-label="Modifier">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      className="rounded-xs p-1 text-muted hover:text-danger"
                      onClick={() => remove.mutate(s.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Button variant="secondary" onClick={() => setEditing(null)}>
        <Plus className="h-4 w-4" /> Ajouter un cours
      </Button>
      <SlotDialog open={editing !== undefined} onOpenChange={(o) => !o && setEditing(undefined)} slot={editing ?? null} />
    </div>
  );
}

function SlotDialog({ open, onOpenChange, slot }: { open: boolean; onOpenChange: (o: boolean) => void; slot: TimetableSlot | null }) {
  const upsert = useUpsertSlot();
  const [form, setForm] = useState({ weekday: 1, start_time: "08:00", end_time: "09:00", label: "", teacher: "", room: "" });
  const [seeded, setSeeded] = useState<string | null>(null);

  const key = open ? (slot?.id ?? "new") : "closed";
  if (open && seeded !== key) {
    setSeeded(key);
    setForm({
      weekday: slot?.weekday ?? 1,
      start_time: slot ? hhmm(slot.start_time) : "08:00",
      end_time: slot ? hhmm(slot.end_time) : "09:00",
      label: slot?.label ?? "",
      teacher: slot?.teacher ?? "",
      room: slot?.room ?? "",
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (form.end_time <= form.start_time) {
      toast.error("L'heure de fin doit être après le début");
      return;
    }
    try {
      await upsert.mutateAsync(slot ? { id: slot.id, ...form } : form);
      onOpenChange(false);
    } catch {
      toast.error("Enregistrement impossible");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={slot ? "Modifier le cours" : "Nouveau cours"} size="sm">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Jour">
            <Select value={form.weekday} onChange={(e) => setForm((f) => ({ ...f, weekday: Number(e.target.value) }))}>
              {WEEKDAYS.map((d, i) => (
                <option key={d} value={i + 1}>
                  {d}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Début">
              <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} required />
            </Field>
            <Field label="Fin">
              <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} required />
            </Field>
          </div>
          <Field label="Cours">
            <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} required placeholder="Mathématiques" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prof">
              <Input value={form.teacher} onChange={(e) => setForm((f) => ({ ...f, teacher: e.target.value }))} placeholder="BAHAJ H." />
            </Field>
            <Field label="Salle">
              <Input value={form.room} onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))} placeholder="L205" />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" loading={upsert.isPending}>
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
