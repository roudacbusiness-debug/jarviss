"use client";

import { useState } from "react";
import { CheckCircle2, FileText, Loader2, UploadCloud, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { DOC_TYPE_LABEL, useUploadDocument } from "@/lib/queries/documents";
import { useSubjects } from "@/lib/queries/subjects";
import type { Document } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";

type DocType = Document["doc_type"];
type Item = { file: File; title: string; status: "pending" | "uploading" | "done" | "error"; error?: string };

async function countPages(file: File): Promise<number | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const n = doc.numPages;
    await doc.cleanup();
    return n;
  } catch {
    return null;
  }
}

function cleanTitle(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function UploadDialog({
  files,
  onClose,
  defaultSubjectId,
  chapters,
}: {
  files: File[];
  onClose: () => void;
  defaultSubjectId?: string | null;
  chapters: string[];
}) {
  const { subjects } = useSubjects();
  const upload = useUploadDocument();
  const [items, setItems] = useState<Item[]>(() => files.map((f) => ({ file: f, title: cleanTitle(f.name), status: "pending" })));
  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId ?? subjects[0]?.id ?? "");
  const [chapter, setChapter] = useState("");
  const [docType, setDocType] = useState<DocType>("cours");
  const [running, setRunning] = useState(false);

  const open = files.length > 0;
  const allDone = items.length > 0 && items.every((i) => i.status === "done" || i.status === "error");

  async function start() {
    setRunning(true);
    let ok = 0;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (it.status === "done") continue;
      setItems((arr) => arr.map((x, j) => (j === i ? { ...x, status: "uploading" } : x)));
      try {
        const page_count = await countPages(it.file);
        await upload.mutateAsync({
          file: it.file,
          title: it.title.trim() || cleanTitle(it.file.name),
          subject_id: subjectId || null,
          chapter: chapter.trim(),
          doc_type: docType,
          page_count,
        });
        ok++;
        setItems((arr) => arr.map((x, j) => (j === i ? { ...x, status: "done" } : x)));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur";
        setItems((arr) => arr.map((x, j) => (j === i ? { ...x, status: "error", error: message } : x)));
      }
    }
    setRunning(false);
    if (ok) toast.success(ok === 1 ? "PDF ajouté" : `${ok} PDF ajoutés`);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !running && onClose()}>
      <DialogContent title={files.length === 1 ? "Ajouter un PDF" : `Ajouter ${files.length} PDF`} description="Rangés par matière puis par chapitre.">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Matière">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} disabled={running}>
                <option value="">Sans matière</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Chapitre (tag libre)">
              <Input list="chapters" value={chapter} onChange={(e) => setChapter(e.target.value)} placeholder="Ex. Suites, Ondes, Chap. 3…" disabled={running} />
              <datalist id="chapters">
                {chapters.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
          </div>
          <Field label="Type">
            <Segmented<DocType>
              id="doctype"
              value={docType}
              onChange={setDocType}
              options={(Object.keys(DOC_TYPE_LABEL) as DocType[]).map((k) => ({ value: k, label: DOC_TYPE_LABEL[k] }))}
            />
          </Field>

          <ul className="max-h-64 space-y-1.5 overflow-y-auto" data-scroll>
            {items.map((it, i) => (
              <li key={i} className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5 py-2">
                <FileText className="h-4 w-4 shrink-0 text-muted" />
                <input
                  value={it.title}
                  onChange={(e) => setItems((arr) => arr.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                  disabled={running || it.status === "done"}
                  className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none disabled:opacity-70"
                />
                <span className="font-mono text-[11px] text-muted tabular">{(it.file.size / 1_048_576).toFixed(1)} Mo</span>
                {it.status === "uploading" ? <Loader2 className="h-4 w-4 animate-spin text-accent" /> : null}
                {it.status === "done" ? <CheckCircle2 className="h-4 w-4 text-success" /> : null}
                {it.status === "error" ? (
                  <span title={it.error}>
                    <XCircle className="h-4 w-4 text-danger" />
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          <div className={cn("flex justify-end gap-2")}>
            {allDone ? (
              <Button onClick={onClose}>Terminer</Button>
            ) : (
              <>
                <Button variant="ghost" onClick={onClose} disabled={running}>
                  Annuler
                </Button>
                <Button onClick={start} loading={running}>
                  <UploadCloud className="h-4 w-4" /> Importer
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
