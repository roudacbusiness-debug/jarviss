"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { StudyEvent, TablesInsert, TablesUpdate } from "@/lib/types/database";
import { qk } from "./keys";

export type EventWithMeta = StudyEvent & {
  tasks: { id: string; done: boolean }[];
  event_documents: { document_id: string }[];
};

const SELECT = "*, tasks(id, done), event_documents(document_id)";

export function useEvents(fromIso: string, toIso: string) {
  const q = useQuery({
    queryKey: qk.events(fromIso, toIso),
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("events")
        .select(SELECT)
        .gte("ends_at", fromIso)
        .lte("starts_at", toIso)
        .order("starts_at");
      if (error) throw error;
      return data as EventWithMeta[];
    },
  });
  return { ...q, events: q.data ?? [] };
}

export function useEvent(id: string | null) {
  return useQuery({
    queryKey: ["event", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await createClient().from("events").select(SELECT).eq("id", id!).single();
      if (error) throw error;
      return data as EventWithMeta;
    },
  });
}

function patchCaches(qc: ReturnType<typeof useQueryClient>, id: string, patch: Partial<StudyEvent>) {
  qc.setQueriesData<EventWithMeta[]>({ queryKey: qk.eventsAll }, (old) =>
    old ? old.map((e) => (e.id === id ? { ...e, ...patch } : e)) : old,
  );
  qc.setQueryData<EventWithMeta>(["event", id], (old) => (old ? { ...old, ...patch } : old));
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"events"> & { document_ids?: string[] }) => {
      const { document_ids, ...row } = input;
      const supabase = createClient();
      const { data, error } = await supabase.from("events").insert(row).select(SELECT).single();
      if (error) throw error;
      if (document_ids?.length) {
        const { error: e2 } = await supabase
          .from("event_documents")
          .insert(document_ids.map((document_id) => ({ event_id: data.id, document_id })));
        if (e2) throw e2;
      }
      return data as EventWithMeta;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.eventsAll }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"events"> & { id: string }) => {
      const { data, error } = await createClient().from("events").update(patch).eq("id", id).select(SELECT).single();
      if (error) throw error;
      return data as EventWithMeta;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.eventsAll });
      const snapshots = qc.getQueriesData<EventWithMeta[]>({ queryKey: qk.eventsAll });
      patchCaches(qc, id, patch as Partial<StudyEvent>);
      return { snapshots };
    },
    onError: (_e, _v, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_d, _e, v) => {
      qc.invalidateQueries({ queryKey: qk.eventsAll });
      qc.invalidateQueries({ queryKey: ["event", v.id] });
    },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.eventsAll });
      qc.setQueriesData<EventWithMeta[]>({ queryKey: qk.eventsAll }, (old) => old?.filter((e) => e.id !== id));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.eventsAll }),
  });
}

/** Tâches (checklist) d'un bloc. */
export function useTasks(eventId: string | null) {
  const q = useQuery({
    queryKey: qk.tasks(eventId ?? ""),
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await createClient().from("tasks").select("*").eq("event_id", eventId!).order("position").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  return { ...q, tasks: q.data ?? [] };
}

export function useTaskMutations(eventId: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: qk.tasks(eventId) });
    qc.invalidateQueries({ queryKey: qk.eventsAll });
    qc.invalidateQueries({ queryKey: ["event", eventId] });
  };
  const add = useMutation({
    mutationFn: async ({ label, position }: { label: string; position: number }) => {
      const { error } = await createClient().from("tasks").insert({ event_id: eventId, label, position });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: async ({ id, ...patch }: TablesUpdate<"tasks"> & { id: string }) => {
      const { error } = await createClient().from("tasks").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: qk.tasks(eventId) });
      qc.setQueryData<{ id: string; done: boolean; label: string }[]>(qk.tasks(eventId), (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      );
    },
    onSettled: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, update, remove };
}
