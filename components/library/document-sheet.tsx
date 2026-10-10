"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addMinutes } from "date-fns";
import { BookOpen, CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL, useDeleteDocument, useUpdateDocument } from "@/lib/queries/documents";
import { useSubjects } from "@/lib/queries/subjects";
import { useSettings } from "@/lib/queries/settings";
import { nowTz, roundToStep, toIso } from "@/lib/dates";
import { usePlanning } from "@/stores/planning";
import type { Document } from "@/lib/types/database";
import Link from "next/link";

export function DocumentSheet({ doc, onClose, chapters }: { doc: Document | null; onClose: () => void; chapters: string[] }) {
  return (
    <Sheet open={!!doc} onOpenChange={(o) => !o && onClose()}>
      <SheetContent title="PDF">{doc ? <DocForm key={doc.id} doc={doc} onClose={onClose} chapters={chapters} /> : null}</SheetContent>
    </Sheet>
  );
}

/** Crée un brouillon de bloc lié à ce PDF et ouvre le planning. */
export function usePlanDocument() {
  const router = useRouter();
  const { settings } = useSettings();
  const openDraft = usePlanning((s) => s.openDraft);
  return (doc: Document) => {
    const start = roundToStep(addMinutes(nowTz(settings.timezone), 15) as ReturnType<typeof nowTz>, 15);
    openDraft({
      starts_at: toIso(start),
      ends_at: toIso(addMinutes(start, 60)),
      subject_id: doc.subject_id ?? undefined,
      title: doc.title,
      document_ids: [doc.id],
    });
    router.push("/planning");
  };
}

function DocForm({ doc, onClose, chapters }: { doc: Document; onClose: () => void; chapters: string[] }) {
  const { subjects } = useSubjects();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const plan = usePlanDocument();
  const [title, setTitle] = useState(doc.title);
  const [chapter, setChapter] = useState(doc.chapter);

  function save(patch: Partial<Document>) {
    update.mutate({ id: doc.id, ...patch }, { onError: () => toast.error("Enregistrement impossible") });
  }

  async function del() {
    if (!confirm(`Supprimer « ${doc.title} » ? Le fichier sera effacé.`)) return;
    try {
      await remove.mutateAsync(doc);
      toast.success("PDF supprimé");
      onClose();
    } catch {
      toast.error("Suppression impossible");
    }
  }

  return (
    <div className="space-y-5">
      <Field label="Titre">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title !== doc.title && save({ title: title.trim() })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Matière">
          <Select value={doc.subject_id ?? ""} onChange={(e) => save({ subject_id: e.target.value || null })}>
            <option value="">Sans matière</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Chapitre">
          <Input list="chapters-edit" value={chapter} onChange={(e) => setChapter(e.target.value)} onBlur={() => chapter !== doc.chapter && save({ chapter: chapter.trim() })} />
          <datalist id="chapters-edit">
            {chapters.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
      </div>
      <Field label="Type">
        <Segmented<Document["doc_type"]>
          id="doctype-edit"
          value={doc.doc_type}
          onChange={(v) => save({ doc_type: v })}
          options={(Object.keys(DOC_TYPE_LABEL) as Document["doc_type"][]).map((k) => ({ value: k, label: DOC_TYPE_LABEL[k] }))}
        />
      </Field>
      <Field label="Statut">
        <Segmented<Document["status"]>
          id="docstatus-edit"
          value={doc.status}
          onChange={(v) => save({ status: v })}
          options={(Object.keys(DOC_STATUS_LABEL) as Document["status"][]).map((k) => ({ value: k, label: DOC_STATUS_LABEL[k] }))}
        />
      </Field>
      <div className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted">
        {doc.page_count ? `${doc.page_count} pages · dernière page lue : ${doc.last_page}` : "Nombre de pages inconnu"} ·{" "}
        {(doc.file_size / 1_048_576).toFixed(1)} Mo
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button variant="danger" size="sm" onClick={del} loading={remove.isPending}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" asChild>
            <Link href={`/bibliotheque/${doc.id}`}>
              <BookOpen className="h-4 w-4" /> Lire
            </Link>
          </Button>
          <Button onClick={() => plan(doc)}>
            <CalendarPlus className="h-4 w-4" /> Planifier
          </Button>
        </div>
      </div>
    </div>
  );
}
