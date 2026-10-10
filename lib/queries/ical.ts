"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { qk } from "./keys";

export function useIcalFeeds() {
  const q = useQuery({
    queryKey: qk.icalFeeds,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await createClient().from("ical_feeds").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });
  return { ...q, feeds: q.data ?? [] };
}

export function useAddIcalFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; url: string }) => {
      const { data, error } = await createClient().from("ical_feeds").insert(input).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.icalFeeds }),
  });
}

export function useDeleteIcalFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await createClient().from("ical_feeds").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.icalFeeds });
      qc.invalidateQueries({ queryKey: qk.icalEventsAll });
    },
  });
}

export function useToggleIcalFeed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await createClient().from("ical_feeds").update({ enabled }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.icalFeeds });
      qc.invalidateQueries({ queryKey: qk.icalEventsAll });
    },
  });
}

/** Déclenche la synchronisation serveur d'un flux (ou de tous). */
export function useSyncIcal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (feedId?: string) => {
      const res = await fetch("/api/ical/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedId: feedId ?? null }),
      });
      const json = (await res.json()) as { ok: boolean; synced?: number; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? "Synchronisation impossible");
      return json;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.icalFeeds });
      qc.invalidateQueries({ queryKey: qk.icalEventsAll });
    },
  });
}

/** Cours iCal entre deux dates ISO. */
export function useIcalEvents(fromIso: string, toIso: string, enabled = true) {
  const q = useQuery({
    queryKey: qk.icalEvents(fromIso, toIso),
    enabled,
    queryFn: async () => {
      const { data, error } = await createClient()
        .from("ical_events")
        .select("*, ical_feeds!inner(enabled)")
        .eq("ical_feeds.enabled", true)
        .gte("ends_at", fromIso)
        .lte("starts_at", toIso)
        .order("starts_at");
      if (error) throw error;
      return data;
    },
  });
  return { ...q, icalEvents: q.data ?? [] };
}
