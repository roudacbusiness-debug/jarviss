"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Document, TablesInsert, TablesUpdate } from "@/lib/types/database";
import { qk } from "./keys";

export const DOC_TYPE_LABEL: Record<Document["doc_type"], string> = {
  cours: "Cours",
  exos: "Exos",
  annale: "Annale",
  corrige: "Corrigé",
};
export const DOC_STATUS_LABEL: Record<Document["status"], string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
};

export const BUCKET = "pdfs";

export function useDocuments() {
  const q = useQuery({
    queryKey: qk.documents,
    queryFn: async () => {
      const { data, error } = await createClient().from("documents").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  return { ...q, documents: q.data ?? [] };
}

export function useDocument(id: string | null) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.document(id ?? ""),
    enabled: !!id,
    initialData: () => qc.getQueryData<Document[]>(qk.documents)?.find((d) => d.id === id),
    queryFn: async () => {
      const { data, error } = await createClient().from("documents").select("*").eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

/** URL signée (1 h) pour lire un PDF. */
export function useSignedUrl(path: string | null) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await createClient().storage.from(BUCKET).createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export type UploadInput = {
  file: File;
  title: string;
  subject_id: string | null;
  chapter: string;
  doc_type: Document["doc_type"];
  page_count: number | null;
};

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UploadInput) => {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user!.id;
      const id = crypto.randomUUID();
      const path = `${userId}/${id}.pdf`;

      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, input.file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (upErr) throw upErr;

      const row: TablesInsert<"documents"> = {
        id,
        title: input.title,
        subject_id: input.subject_id,
        chapter: input.chapter,
        doc_type: input.doc_type,
        storage_path: path,
        file_size: input.file.size,
        page_count: input.page_count,
      };
      const { data, error } = await supabase.from("documents").insert(row).select("*").single();
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.documents }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"documents"> & { id: string }) => {
      const { data, error } = await createClient().from("documents").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.documents });
      const prev = qc.getQueryData<Document[]>(qk.documents);
      qc.setQueryData<Document[]>(qk.documents, (old) => old?.map((d) => (d.id === id ? { ...d, ...patch } : d)));
      qc.setQueryData<Document>(qk.document(id), (old) => (old ? { ...old, ...patch } : old));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.documents, ctx.prev),
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: qk.documents });
      qc.invalidateQueries({ queryKey: qk.document(v.id) });
    },
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (doc: Document) => {
      const supabase = createClient();
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
      await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.documents });
      qc.invalidateQueries({ queryKey: qk.eventsAll });
    },
  });
}

/** PDF liés à un bloc. */
export function useEventDocuments(eventId: string | null) {
  const q = useQuery({
    queryKey: qk.eventDocuments(eventId ?? ""),
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("event_documents")
        .select("document_id, documents(*)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return data.map((r) => r.documents).filter((d): d is Document => !!d);
    },
  });
  return { ...q, documents: q.data ?? [] };
}

export function useLinkDocument(eventId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.eventDocuments(eventId) });
    qc.invalidateQueries({ queryKey: qk.eventsAll });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };
  const link = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await createClient().from("event_documents").insert({ event_id: eventId, document_id: documentId });
      if (error && error.code !== "23505") throw error;
    },
    onSuccess: invalidate,
  });
  const unlink = useMutation({
    mutationFn: async (documentId: string) => {
      const { error } = await createClient().from("event_documents").delete().eq("event_id", eventId).eq("document_id", documentId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { link, unlink };
}
