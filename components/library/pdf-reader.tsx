"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Document as PdfDocument, Page as PdfPage, pdfjs } from "react-pdf";
import { ArrowLeft, CalendarPlus, Check, ChevronLeft, ChevronRight, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tip } from "@/components/ui/tooltip";
import { useDocument, useSignedUrl, useUpdateDocument, DOC_STATUS_LABEL } from "@/lib/queries/documents";
import { useSubjectMap } from "@/lib/queries/subjects";
import { usePlanDocument } from "./document-sheet";
import { StatusIcon } from "./document-card";
import { cn } from "@/lib/utils/cn";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

const ZOOMS = [0.6, 0.8, 1, 1.25, 1.5, 2];

export function PdfReader({ id }: { id: string }) {
  const { data: doc, isLoading } = useDocument(id);
  const { data: url } = useSignedUrl(doc?.storage_path ?? null);
  const subjects = useSubjectMap();
  const update = useUpdateDocument();
  const plan = usePlanDocument();

  const subject = doc?.subject_id ? subjects.get(doc.subject_id) : undefined;
  const [numPages, setNumPages] = useState<number | null>(null);
  const [current, setCurrent] = useState<number>(1);
  const [zoomIdx, setZoomIdx] = useState(2);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const initialScrolled = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Largeur disponible
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageWidth = Math.min(containerWidth - 24, 900) * ZOOMS[zoomIdx];

  // Sauvegarde (debounce) de la dernière page lue
  const persistPage = useCallback(
    (p: number) => {
      if (!doc || p === doc.last_page) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const patch: { last_page: number; status?: "en_cours" | "fait" } = { last_page: p };
        if (doc.status === "a_faire" && p > 1) patch.status = "en_cours";
        update.mutate({ id: doc.id, ...patch });
      }, 800);
    },
    [doc, update],
  );

  // Observation de la page visible
  useEffect(() => {
    if (!numPages) return;
    const root = containerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        let best: { p: number; ratio: number } | null = null;
        for (const e of entries) {
          const p = Number((e.target as HTMLElement).dataset.page);
          if (e.isIntersecting && (!best || e.intersectionRatio > best.ratio)) best = { p, ratio: e.intersectionRatio };
        }
        if (best) {
          setCurrent(best.p);
          persistPage(best.p);
        }
      },
      { root, threshold: [0.25, 0.5, 0.75] },
    );
    pageRefs.current.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [numPages, persistPage, pageWidth]);

  function scrollTo(p: number, smooth = true) {
    const el = pageRefs.current.get(p);
    if (el) el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }

  // Reprise à la dernière page lue
  useEffect(() => {
    if (!numPages || !doc || initialScrolled.current) return;
    initialScrolled.current = true;
    if (doc.last_page > 1) setTimeout(() => scrollTo(Math.min(doc.last_page, numPages), false), 50);
    if (doc.page_count !== numPages) update.mutate({ id: doc.id, page_count: numPages });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numPages, doc?.id]);

  // Raccourcis clavier
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") scrollTo(Math.min(current + 1, numPages ?? 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") scrollTo(Math.max(current - 1, 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [current, numPages]);

  const file = useMemo(() => (url ? { url } : null), [url]);
  const pages = useMemo(() => (numPages ? Array.from({ length: numPages }, (_, i) => i + 1) : []), [numPages]);

  function cycleStatus() {
    if (!doc) return;
    const next = doc.status === "fait" ? "a_faire" : doc.status === "en_cours" ? "fait" : "en_cours";
    update.mutate({ id: doc.id, status: next });
    toast.success(`Statut : ${DOC_STATUS_LABEL[next]}`);
  }

  if (isLoading || !doc) {
    return (
      <div className="flex h-dvh items-center justify-center text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col md:h-dvh">
      {/* Barre */}
      <header className="flex items-center gap-2 border-b border-border bg-bg-elev px-2 py-2 md:px-4 safe-top">
        <Button variant="ghost" size="icon-sm" asChild>
          <Link href="/bibliotheque" aria-label="Retour">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight">{doc.title}</p>
          <p className="truncate text-[11px] text-muted">
            {subject?.name ?? "Sans matière"}
            {doc.chapter ? ` · ${doc.chapter}` : ""}
          </p>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <Button variant="ghost" size="icon-sm" onClick={() => setZoomIdx((z) => Math.max(0, z - 1))} aria-label="Réduire">
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center font-mono text-xs text-muted tabular">{Math.round(ZOOMS[zoomIdx] * 100)}%</span>
          <Button variant="ghost" size="icon-sm" onClick={() => setZoomIdx((z) => Math.min(ZOOMS.length - 1, z + 1))} aria-label="Agrandir">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-0.5 rounded-md bg-surface-2 px-1">
          <Button variant="ghost" size="icon-sm" onClick={() => scrollTo(Math.max(1, current - 1))} aria-label="Page précédente">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[64px] text-center font-mono text-xs tabular">
            {current} / {numPages ?? "…"}
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => scrollTo(Math.min(numPages ?? 1, current + 1))} aria-label="Page suivante">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Tip label={`Statut : ${DOC_STATUS_LABEL[doc.status]} (cliquer pour changer)`}>
          <button onClick={cycleStatus} className="flex h-8 w-8 items-center justify-center rounded-sm hover:bg-surface-2 focus-ring" aria-label="Changer le statut">
            {doc.status === "fait" ? <Check className="h-4 w-4 text-success" /> : <StatusIcon status={doc.status} className="h-4 w-4" />}
          </button>
        </Tip>
        <Button size="sm" onClick={() => plan(doc)} className="hidden sm:inline-flex">
          <CalendarPlus className="h-4 w-4" /> Planifier
        </Button>
        <Button size="icon-sm" onClick={() => plan(doc)} className="sm:hidden" aria-label="Planifier">
          <CalendarPlus className="h-4 w-4" />
        </Button>
      </header>

      {/* Progression */}
      <div className="h-[3px] w-full bg-surface-2">
        <div className="h-full transition-[width] duration-300" style={{ width: numPages ? `${(current / numPages) * 100}%` : "0%", background: subject?.color ?? "var(--accent)" }} />
      </div>

      {/* Pages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overscroll-contain bg-surface-2/60 px-3 py-4" data-scroll>
        {file ? (
          <PdfDocument
            file={file}
            onLoadSuccess={(pdf) => setNumPages(pdf.numPages)}
            onLoadError={() => toast.error("Impossible d'ouvrir ce PDF")}
            loading={
              <div className="flex justify-center py-20 text-muted">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            }
            className="mx-auto flex flex-col items-center gap-4"
          >
            {pages.map((p) => {
              const near = Math.abs(p - current) <= 2;
              return (
                <div
                  key={p}
                  data-page={p}
                  ref={(el) => {
                    if (el) pageRefs.current.set(p, el);
                    else pageRefs.current.delete(p);
                  }}
                  className={cn("relative flex justify-center", !near && "bg-surface rounded-md")}
                  style={!near ? { width: pageWidth, height: pageWidth * 1.414 } : undefined}
                >
                  {near ? (
                    <PdfPage
                      pageNumber={p}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={<div className="rounded-md bg-surface" style={{ width: pageWidth, height: pageWidth * 1.414 }} />}
                    />
                  ) : null}
                  <span className="pointer-events-none absolute bottom-2 right-2 rounded-xs bg-black/50 px-1.5 font-mono text-[10px] text-white tabular">{p}</span>
                </div>
              );
            })}
          </PdfDocument>
        ) : (
          <div className="flex justify-center py-20 text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
