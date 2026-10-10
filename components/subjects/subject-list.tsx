"use client";

import { useState } from "react";
import { DndContext, PointerSensor, KeyboardSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToParentElement } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { Archive, ArchiveRestore, GripVertical, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tip } from "@/components/ui/tooltip";
import { PRIORITY_LABEL, SubjectIcon } from "@/lib/subjects/icons";
import { useReorderSubjects, useSubjects, useUpdateSubject } from "@/lib/queries/subjects";
import type { Subject } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { SubjectFormDialog } from "./subject-form-dialog";

export function SubjectList() {
  const { subjects: all, isLoading } = useSubjects(true);
  const reorder = useReorderSubjects();
  const update = useUpdateSubject();
  const [editing, setEditing] = useState<Subject | null | undefined>(undefined);

  const active = all.filter((s) => !s.archived);
  const archived = all.filter((s) => s.archived);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active: a, over } = e;
    if (!over || a.id === over.id) return;
    const from = active.findIndex((s) => s.id === a.id);
    const to = active.findIndex((s) => s.id === over.id);
    const next = arrayMove(active, from, to);
    reorder.mutate([...next, ...archived]);
  }

  return (
    <div className="space-y-3">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
        <SortableContext items={active.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {active.map((s) => (
              <SubjectRow
                key={s.id}
                subject={s}
                onEdit={() => setEditing(s)}
                onArchive={() => update.mutate({ id: s.id, archived: true })}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      {isLoading ? <p className="text-sm text-muted">Chargement…</p> : null}

      <Button variant="secondary" className="w-full" onClick={() => setEditing(null)}>
        <Plus className="h-4 w-4" /> Ajouter une matière
      </Button>

      {archived.length ? (
        <div className="pt-2">
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">Archivées</p>
          <ul className="space-y-2">
            {archived.map((s) => (
              <li key={s.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2 opacity-70">
                <span className="flex h-8 w-8 items-center justify-center rounded-sm text-white" style={{ background: s.color }}>
                  <SubjectIcon name={s.icon} className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-semibold">{s.name}</span>
                <Tip label="Restaurer">
                  <Button variant="ghost" size="icon-sm" onClick={() => update.mutate({ id: s.id, archived: false })}>
                    <ArchiveRestore className="h-4 w-4" />
                  </Button>
                </Tip>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <SubjectFormDialog
        open={editing !== undefined}
        onOpenChange={(o) => !o && setEditing(undefined)}
        subject={editing ?? null}
        nextPosition={all.length}
      />
    </div>
  );
}

function SubjectRow({ subject, onEdit, onArchive }: { subject: Subject; onEdit: () => void; onArchive: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: subject.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 rounded-md border border-border bg-surface px-2 py-2 shadow-sm",
        isDragging && "z-10 shadow-lg ring-1 ring-accent",
      )}
    >
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex h-8 w-6 cursor-grab touch-none items-center justify-center rounded-sm text-muted hover:text-fg active:cursor-grabbing"
        aria-label="Réordonner"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-white shadow-sm" style={{ background: subject.color }}>
        <SubjectIcon name={subject.icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{subject.name}</p>
      </div>
      <Badge
        color={subject.priority === "haute" ? subject.color : undefined}
        className={cn(subject.priority === "light" && "opacity-70")}
      >
        {PRIORITY_LABEL[subject.priority]}
      </Badge>
      <Tip label="Modifier">
        <Button variant="ghost" size="icon-sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
        </Button>
      </Tip>
      <Tip label="Archiver">
        <Button variant="ghost" size="icon-sm" onClick={onArchive}>
          <Archive className="h-4 w-4" />
        </Button>
      </Tip>
    </li>
  );
}
