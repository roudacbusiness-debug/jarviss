"use client";

import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { AnimatePresence, motion } from "framer-motion";
import { FileUp, Library, Search, UploadCloud, X } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Empty } from "@/components/ui/empty";
import { DOC_STATUS_LABEL, DOC_TYPE_LABEL, useDocuments } from "@/lib/queries/documents";
import { useSubjectMap, useSubjects } from "@/lib/queries/subjects";
import { SubjectIcon } from "@/lib/subjects/icons";
import type { Document } from "@/lib/types/database";
import { cn } from "@/lib/utils/cn";
import { DocumentCard } from "./document-card";
import { UploadDialog } from "./upload-dialog";
import { DocumentSheet } from "./document-sheet";

export function LibraryView() {
  const { documents, isLoading } = useDocuments();
  const { subjects } = useSubjects();
  const subjectMap = useSubjectMap();
  const [query, setQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [pending, setPending] = useState<File[]>([]);
  const [editing, setEditing] = useState<Document | null>(null);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    multiple: true,
    noClick: true,
    noKeyboard: true,
    onDrop: (accepted) => accepted.length && setPending(accepted),
  });

  const chapters = useMemo(() => Array.from(new Set(documents.map((d) => d.chapter).filter(Boolean))).sort(), [documents]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return documents.filter((d) => {
      if (subjectFilter === "none" ? d.subject_id !== null : subjectFilter && d.subject_id !== subjectFilter) return false;
      if (typeFilter && d.doc_type !== typeFilter) return false;
      if (statusFilter && d.status !== statusFilter) return false;
      if (q) {
        const hay = `${d.title} ${d.chapter} ${subjectMap.get(d.subject_id ?? "")?.name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [documents, query, subjectFilter, typeFilter, statusFilter, subjectMap]);

  // Regroupement : matière → chapitre
  const groups = useMemo(() => {
    const bySubject = new Map<string, Map<string, Document[]>>();
    for (const d of filtered) {
      const sKey = d.subject_id ?? "none";
      if (!bySubject.has(sKey)) bySubject.set(sKey, new Map());
      const byChapter = bySubject.get(sKey)!;
      const cKey = d.chapter || "";
      byChapter.set(cKey, [...(byChapter.get(cKey) ?? []), d]);
    }
    const order = [...subjects.map((s) => s.id), "none"];
    return order
      .filter((k) => bySubject.has(k))
      .map((k) => ({
        key: k,
        subject: subjectMap.get(k),
        chapters: Array.from(bySubject.get(k)!.entries()).sort(([a], [b]) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b))),
      }));
  }, [filtered, subjects, subjectMap]);

  const counts = useMemo(() => {
    const c = new Map<string, number>();
    for (const d of documents) c.set(d.subject_id ?? "none", (c.get(d.subject_id ?? "none") ?? 0) + 1);
    return c;
  }, [documents]);

  const hasFilters = !!(query || subjectFilter || typeFilter || statusFilter);

  return (
    <div {...getRootProps()} className="relative flex min-h-dvh flex-col outline-none md:min-h-0 md:flex-1">
      <input {...getInputProps()} />
      <PageHeader
        title="Bibliothèque"
        subtitle={documents.length ? `${documents.length} PDF · ${documents.filter((d) => d.status === "fait").length} terminés` : "Tes cours, exos, annales et corrigés"}
      >
        <Button onClick={open} size="sm">
          <FileUp className="h-4 w-4" /> Ajouter des PDF
        </Button>
      </PageHeader>

      {/* Filtres */}
      <div className="space-y-3 px-4 pb-3 md:px-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input className="pl-9" placeholder="Rechercher un titre, un chapitre…" value={query} onChange={(e) => setQuery(e.target.value)} />
            {query ? (
              <button className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xs p-1 text-muted hover:text-fg" onClick={() => setQuery("")} aria-label="Effacer">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:w-[300px]">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">Tous les types</option>
              {(Object.keys(DOC_TYPE_LABEL) as Document["doc_type"][]).map((k) => (
                <option key={k} value={k}>
                  {DOC_TYPE_LABEL[k]}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tous les statuts</option>
              {(Object.keys(DOC_STATUS_LABEL) as Document["status"][]).map((k) => (
                <option key={k} value={k}>
                  {DOC_STATUS_LABEL[k]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar md:-mx-6 md:px-6">
          <Chip active={!subjectFilter} onClick={() => setSubjectFilter("")}>
            Toutes
          </Chip>
          {subjects.map((s) => (
            <Chip key={s.id} active={subjectFilter === s.id} color={s.color} onClick={() => setSubjectFilter(subjectFilter === s.id ? "" : s.id)}>
              <SubjectIcon name={s.icon} className="h-3.5 w-3.5" />
              {s.name}
              {counts.get(s.id) ? <span className="ml-0.5 opacity-70 tabular">{counts.get(s.id)}</span> : null}
            </Chip>
          ))}
          {counts.get("none") ? (
            <Chip active={subjectFilter === "none"} onClick={() => setSubjectFilter(subjectFilter === "none" ? "" : "none")}>
              Sans matière <span className="ml-0.5 opacity-70 tabular">{counts.get("none")}</span>
            </Chip>
          ) : null}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 px-4 pb-24 md:px-6 md:pb-8">
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse-soft rounded-lg bg-surface-2" />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <Empty
            icon={<Library className="h-6 w-6" />}
            title="Aucun PDF pour l'instant"
            description="Glisse tes fichiers ici ou clique sur « Ajouter des PDF ». Tu pourras les lire, suivre ta progression et les lier à des blocs de révision."
            action={
              <Button onClick={open}>
                <FileUp className="h-4 w-4" /> Ajouter des PDF
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <Empty icon={<Search className="h-6 w-6" />} title="Rien ne correspond" description="Essaie d'autres filtres ou une autre recherche." />
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <section key={g.key}>
                <div className="mb-3 flex items-center gap-2">
                  {g.subject ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-sm text-white" style={{ background: g.subject.color }}>
                      <SubjectIcon name={g.subject.icon} className="h-4 w-4" />
                    </span>
                  ) : null}
                  <h2 className="font-display text-base font-bold">{g.subject?.name ?? "Sans matière"}</h2>
                  <span className="text-sm text-muted tabular">{g.chapters.reduce((a, [, docs]) => a + docs.length, 0)}</span>
                </div>
                <div className="space-y-4">
                  {g.chapters.map(([chapter, docs]) => (
                    <div key={chapter || "_"}>
                      {g.chapters.length > 1 || chapter ? (
                        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-muted">{chapter || "Sans chapitre"}</p>
                      ) : null}
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <AnimatePresence initial={false}>
                          {docs.map((d) => (
                            <motion.div key={d.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                              <DocumentCard doc={d} subject={subjectMap.get(d.subject_id ?? "")} onMore={() => setEditing(d)} />
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {hasFilters && filtered.length > 0 ? (
          <p className="mt-6 text-center text-xs text-muted">
            {filtered.length} / {documents.length} PDF affichés
          </p>
        ) : null}
      </div>

      {/* Zone de dépôt */}
      <AnimatePresence>
        {isDragActive ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-accent/20 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-accent bg-surface px-10 py-8 shadow-lg">
              <UploadCloud className="h-10 w-10 text-accent" />
              <p className="font-display text-lg font-bold">Dépose tes PDF ici</p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {pending.length ? (
        <UploadDialog files={pending} onClose={() => setPending([])} defaultSubjectId={subjectFilter && subjectFilter !== "none" ? subjectFilter : null} chapters={chapters} />
      ) : null}
      <DocumentSheet doc={editing} onClose={() => setEditing(null)} chapters={chapters} />
    </div>
  );
}

function Chip({ active, color, onClick, children }: { active: boolean; color?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-semibold transition-colors focus-ring",
        active ? "border-transparent text-white shadow-sm" : "border-border bg-surface text-fg-2 hover:border-border-strong",
        active && !color && "bg-fg text-bg",
      )}
      style={active && color ? { background: color } : undefined}
    >
      {children}
    </button>
  );
}
