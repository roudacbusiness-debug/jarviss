"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Subject, TablesInsert, TablesUpdate } from "@/lib/types/database";
import { qk } from "./keys";

export function useSubjects(includeArchived = false) {
  const q = useQuery({
    queryKey: qk.subjects,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("subjects")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const subjects = (q.data ?? []).filter((s) => includeArchived || !s.archived);
  return { ...q, subjects };
}

export function useSubjectMap() {
  const { subjects } = useSubjects(true);
  const map = new Map<string, Subject>();
  for (const s of subjects) map.set(s.id, s);
  return map;
}

export function useCreateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"subjects">) => {
      const { data, error } = await createClient().from("subjects").insert(input).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.subjects }),
  });
}

export function useUpdateSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"subjects"> & { id: string }) => {
      const { data, error } = await createClient().from("subjects").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.subjects });
      const prev = qc.getQueryData<Subject[]>(qk.subjects);
      if (prev) qc.setQueryData(qk.subjects, prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.subjects, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.subjects }),
  });
}

export function useDeleteSubject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.subjects }),
  });
}

export function useReorderSubjects() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ordered: Subject[]) => {
      const supabase = createClient();
      const updates = ordered.map((s, i) => supabase.from("subjects").update({ position: i }).eq("id", s.id));
      const results = await Promise.all(updates);
      const failed = results.find((r) => r.error);
      if (failed?.error) throw failed.error;
    },
    onMutate: async (ordered) => {
      await qc.cancelQueries({ queryKey: qk.subjects });
      const prev = qc.getQueryData<Subject[]>(qk.subjects);
      qc.setQueryData(qk.subjects, ordered.map((s, i) => ({ ...s, position: i })));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.subjects, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.subjects }),
  });
}
