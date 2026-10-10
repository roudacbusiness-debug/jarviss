"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Settings, TablesUpdate } from "@/lib/types/database";
import { DEFAULT_TZ } from "@/lib/dates";
import { qk } from "./keys";

export const DEFAULT_SETTINGS: Settings = {
  user_id: "",
  theme: "dark",
  timezone: DEFAULT_TZ,
  week_start: 1,
  day_start_hour: 0,
  day_end_hour: 23,
  focus_minutes: 50,
  break_minutes: 10,
  created_at: "",
  updated_at: "",
};

export function useSettings() {
  const q = useQuery({
    queryKey: qk.settings,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase.from("settings").select("*").maybeSingle();
      if (error) throw error;
      if (data) return data;
      // Filet de sécurité : si la ligne n'existe pas encore, on la crée.
      const { data: user } = await supabase.auth.getUser();
      const { data: created, error: e2 } = await supabase
        .from("settings")
        .insert({ user_id: user.user!.id })
        .select("*")
        .single();
      if (e2) throw e2;
      return created;
    },
  });
  return { ...q, settings: q.data ?? DEFAULT_SETTINGS };
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"settings">) => {
      const supabase = createClient();
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("settings")
        .update(patch)
        .eq("user_id", user.user!.id)
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: qk.settings });
      const prev = qc.getQueryData<Settings>(qk.settings);
      if (prev) qc.setQueryData(qk.settings, { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _p, ctx) => {
      if (ctx?.prev) qc.setQueryData(qk.settings, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: qk.settings }),
  });
}
