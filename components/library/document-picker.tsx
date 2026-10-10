"use client";

import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DOC_TYPE_LABEL, useDocuments } from "@/lib/queries/documents";
import { useSubjectMap } from "@/lib/queries/subjects";
import { cn } from "@/lib/utils/cn";
import { StatusIcon, TYPE_COLOR } from "./document-card";

export function DocumentPicker({
  open,
  onOpenChange,
  selected,
  onToggle,
  subjectId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  selected: string[];
  onToggle: (id: string, next: boolean) => void;
  subjectId?: string;
}) {
  const { documents } = useDocuments();
  const subjects = useSubjectMap();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return [...documents]
      .filter((d) => !needle || `${d.title} ${d.chapter}`.toLowerCase().includes(needle))
      .sort((a, b) => {
        const sa = a.subject_id === subjectId ? 0 : 1;
        const sb = b.subject_id === subjectId ? 0 : 1;
        return sa - sb || a.title.localeCompare(b.title);
      });
  }, [documents, q, subjectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Lier des PDF" description="Les PDF de la matière du bloc apparaissent en premier.">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <ul className="max-h-[50dvh] space-y-1 overflow-y-auto" data-scroll>
          {list.length === 0 ? <li className="py-6 text-center text-sm text-muted">Aucun PDF. Ajoute-en dans la bibliothèque.</li> : null}
          {list.map((d) => {
            const on = selected.includes(d.id);
            const s = d.subject_id ? subjects.get(d.subject_id) : undefined;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => onToggle(d.id, !on)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition-colors focus-ring",
                    on ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-2",
                  )}
                >
                  <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border", on ? "border-accent bg-accent text-accent-fg" : "border-border-strong")}>
                    {on ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <StatusIcon status={d.status} className="h-4 w-4 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{d.title}</p>
                    <p className="truncate text-xs text-muted">
                      {s?.name ?? "Sans matière"}
                      {d.chapter ? ` · ${d.chapter}` : ""}
                    </p>
                  </div>
                  <span className="rounded-xs px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ background: TYPE_COLOR[d.doc_type] }}>
                    {DOC_TYPE_LABEL[d.doc_type]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => onOpenChange(false)}>Terminer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
