"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import {
  SUBJECT_ICON_NAMES,
  SUBJECT_PALETTE,
  SubjectIcon,
} from "@/lib/subjects/icons";
import {
  useCreateSubject,
  useDeleteSubject,
  useUpdateSubject,
} from "@/lib/queries/subjects";
import type { Subject } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

type Priority = Subject["priority"];

export function SubjectFormDialog({
  open,
  onOpenChange,
  subject,
  nextPosition = 0,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  subject?: Subject | null;
  nextPosition?: number;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={subject ? "Modifier la matière" : "Nouvelle matière"}
      >
        <SubjectForm
          key={subject?.id ?? "new"}
          subject={subject ?? null}
          nextPosition={nextPosition}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  );
}

function SubjectForm({
  subject,
  nextPosition,
  onOpenChange,
}: {
  subject: Subject | null;
  nextPosition: number;
  onOpenChange: (o: boolean) => void;
}) {
  const [name, setName] = useState(subject?.name ?? "");
  const [color, setColor] = useState(
    () =>
      subject?.color ??
      SUBJECT_PALETTE[Math.floor(Math.random() * SUBJECT_PALETTE.length)],
  );
  const [icon, setIcon] = useState(subject?.icon ?? "book-open");
  const [priority, setPriority] = useState<Priority>(
    subject?.priority ?? "normale",
  );

  const create = useCreateSubject();
  const update = useUpdateSubject();
  const remove = useDeleteSubject();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { name: name.trim(), color, icon, priority };
    try {
      if (subject) {
        await update.mutateAsync({ id: subject.id, ...payload });
        toast.success("Matière mise à jour");
      } else {
        await create.mutateAsync({ ...payload, position: nextPosition });
        toast.success("Matière ajoutée");
      }
      onOpenChange(false);
    } catch {
      toast.error("Enregistrement impossible");
    }
  }

  async function del() {
    if (!subject) return;
    if (
      !confirm(
        `Supprimer « ${subject.name} » ? Les blocs et évaluations liés doivent d'abord être supprimés.`,
      )
    )
      return;
    try {
      await remove.mutateAsync(subject.id);
      toast.success("Matière supprimée");
      onOpenChange(false);
    } catch {
      toast.error(
        "Impossible : des blocs ou évaluations utilisent encore cette matière. Tu peux l'archiver à la place.",
      );
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-center gap-4">
        <div
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg text-white shadow-md transition-colors"
          style={{ background: color }}
        >
          <SubjectIcon name={icon} className="h-6 w-6" />
        </div>
        <Field label="Nom" className="flex-1">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={60}
            autoFocus
            placeholder="Ex. Physique-Chimie"
          />
        </Field>
      </div>

      <Field label="Couleur">
        <div className="grid grid-cols-8 gap-2">
          {SUBJECT_PALETTE.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ background: c }}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md transition-transform hover:scale-110 focus-ring",
                color === c &&
                  "ring-2 ring-fg ring-offset-2 ring-offset-surface",
              )}
              aria-label={c}
            >
              {color === c ? <Check className="h-4 w-4 text-white" /> : null}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Icône">
        <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
          {SUBJECT_ICON_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setIcon(n)}
              className={cn(
                "flex aspect-square items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-2 hover:text-fg focus-ring",
                icon === n && "bg-accent-soft text-accent",
              )}
              aria-label={n}
            >
              <SubjectIcon name={n} className="h-[18px] w-[18px]" />
            </button>
          ))}
        </div>
      </Field>

      <Field
        label="Priorité"
        hint="La priorité sert à trier et à mettre en avant les matières importantes."
      >
        <Segmented<Priority>
          id="priority"
          value={priority}
          onChange={setPriority}
          options={[
            { value: "haute", label: "Haute" },
            { value: "normale", label: "Normale" },
            { value: "light", label: "Light" },
          ]}
        />
      </Field>

      <div className="flex items-center justify-between gap-2 pt-1">
        {subject ? (
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={del}
            loading={remove.isPending}
          >
            <Trash2 className="h-4 w-4" /> Supprimer
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
          <Button
            type="submit"
            loading={create.isPending || update.isPending}
            disabled={!name.trim()}
          >
            {subject ? "Enregistrer" : "Ajouter"}
          </Button>
        </div>
      </div>
    </form>
  );
}
