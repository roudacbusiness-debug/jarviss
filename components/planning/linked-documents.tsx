"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, Link2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentPicker } from "@/components/library/document-picker";
import { StatusIcon, TYPE_COLOR } from "@/components/library/document-card";
import { DOC_TYPE_LABEL, useDocuments, useEventDocuments, useLinkDocument } from "@/lib/queries/documents";
import type { Document } from "@/lib/types/database";

export function LinkedDocuments({
  eventId,
  draftDocs,
  onDraftChange,
  subjectId,
}: {
  eventId: string | null;
  draftDocs: string[];
  onDraftChange: (ids: string[]) => void;
  subjectId: string;
}) {
  const [picker, setPicker] = useState(false);
  const { documents: linked } = useEventDocuments(eventId);
  const { documents: all } = useDocuments();
  const { link, unlink } = useLinkDocument(eventId ?? "");

  const docs: Document[] = eventId ? linked : all.filter((d) => draftDocs.includes(d.id));
  const selected = eventId ? linked.map((d) => d.id) : draftDocs;

  function toggle(id: string, next: boolean) {
    if (eventId) {
      if (next) link.mutate(id);
      else unlink.mutate(id);
    } else {
      onDraftChange(next ? [...draftDocs, id] : draftDocs.filter((x) => x !== id));
    }
  }

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">PDF liés</p>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => setPicker(true)}>
          <Link2 className="h-3.5 w-3.5" /> Lier
        </Button>
      </div>
      {docs.length === 0 ? (
        <button
          type="button"
          onClick={() => setPicker(true)}
          className="w-full rounded-md border border-dashed border-border px-3 py-3 text-center text-sm text-muted transition-colors hover:border-border-strong hover:text-fg"
        >
          Aucun PDF lié. Lie un cours, des exos ou une annale.
        </button>
      ) : (
        <ul className="space-y-1.5">
          {docs.map((d) => {
            const progress = d.page_count ? Math.round((d.last_page / d.page_count) * 100) : null;
            return (
              <li key={d.id} className="group flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-2">
                <span className="rounded-xs px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white" style={{ background: TYPE_COLOR[d.doc_type] }}>
                  {DOC_TYPE_LABEL[d.doc_type]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{d.title}</p>
                  <p className="flex items-center gap-1 text-[11px] text-muted">
                    <StatusIcon status={d.status} className="h-3 w-3" />
                    {progress !== null ? `${progress} % lu` : d.chapter || "—"}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" asChild>
                  <Link href={`/bibliotheque/${d.id}`} aria-label="Ouvrir">
                    <BookOpen className="h-4 w-4" />
                  </Link>
                </Button>
                <button
                  type="button"
                  onClick={() => toggle(d.id, false)}
                  className="rounded-xs p-1 text-muted opacity-60 hover:text-danger group-hover:opacity-100"
                  aria-label="Délier"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <DocumentPicker open={picker} onOpenChange={setPicker} selected={selected} onToggle={toggle} subjectId={subjectId} />
    </div>
  );
}
