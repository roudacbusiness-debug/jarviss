"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/lib/types/database";
import { qk } from "./keys";

export function useTimetable() {
  const q = useQuery({
    queryKey: qk.timetable,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("timetable_slots")
        .select("*")
        .order("weekday")
        .order("start_time");
      if (error) throw error;
      return data;
    },
  });
  return { ...q, slots: q.data ?? [] };
}

export function useUpsertSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"timetable_slots"> | (TablesUpdate<"timetable_slots"> & { id: string })) => {
      const supabase = createClient();
      if ("id" in input && input.id) {
        const { id, ...patch } = input;
        const { error } = await supabase.from("timetable_slots").update(patch).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("timetable_slots").insert(input as TablesInsert<"timetable_slots">);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.timetable }),
  });
}

export function useDeleteSlot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("timetable_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.timetable }),
  });
}
