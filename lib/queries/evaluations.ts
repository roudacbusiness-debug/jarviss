"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Evaluation, TablesInsert, TablesUpdate } from "@/lib/types/database";
import { qk } from "./keys";

export const EVAL_TYPE_LABEL: Record<Evaluation["eval_type"], string> = {
  ds: "DS",
  controle: "Contrôle",
  oral: "Oral",
};

export function useEvaluations() {
  const q = useQuery({
    queryKey: qk.evaluations,
    queryFn: async () => {
      const { data, error } = await createClient().from("evaluations").select("*").order("starts_at");
      if (error) throw error;
      return data;
    },
  });
  return { ...q, evaluations: q.data ?? [] };
}

export function useCreateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"evaluations">) => {
      const { data, error } = await createClient().from("evaluations").insert(input).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.evaluations }),
  });
}

export function useUpdateEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"evaluations"> & { id: string }) => {
      const { data, error } = await createClient().from("evaluations").update(patch).eq("id", id).select("*").single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.evaluations });
      const prev = qc.getQueryData<Evaluation[]>(qk.evaluations);
      qc.setQueryData<Evaluation[]>(qk.evaluations, (old) => old?.map((e) => (e.id === id ? { ...e, ...patch } : e)));
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(qk.evaluations, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: qk.evaluations }),
  });
}

export function useDeleteEvaluation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("evaluations").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.evaluations });
      qc.setQueryData<Evaluation[]>(qk.evaluations, (old) => old?.filter((e) => e.id !== id));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.evaluations }),
  });
}
