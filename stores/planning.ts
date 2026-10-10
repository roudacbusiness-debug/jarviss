"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CalendarView = "week" | "day";

export type DraftBlock = {
  starts_at: string;
  ends_at: string;
  subject_id?: string;
  title?: string;
  document_ids?: string[];
};

type PlanningState = {
  view: CalendarView | null; // null = choisir selon l'écran
  anchor: string; // YYYY-MM-DD du jour affiché (ou d'un jour de la semaine)
  selectedEventId: string | null;
  draft: DraftBlock | null;
  evalDialog: { open: boolean; id: string | null; date?: string };
  focusEventId: string | null;
  setView: (v: CalendarView) => void;
  setAnchor: (iso: string) => void;
  openEvent: (id: string | null) => void;
  openDraft: (d: DraftBlock | null) => void;
  openEval: (id: string | null, date?: string) => void;
  closeEval: () => void;
  startFocus: (eventId: string | null) => void;
};

export const usePlanning = create<PlanningState>()(
  persist(
    (set) => ({
      view: null,
      anchor: new Date().toISOString().slice(0, 10),
      selectedEventId: null,
      draft: null,
      evalDialog: { open: false, id: null },
      focusEventId: null,
      setView: (view) => set({ view }),
      setAnchor: (anchor) => set({ anchor }),
      openEvent: (selectedEventId) => set({ selectedEventId, draft: null }),
      openDraft: (draft) => set({ draft, selectedEventId: null }),
      openEval: (id, date) => set({ evalDialog: { open: true, id, date } }),
      closeEval: () => set((s) => ({ evalDialog: { ...s.evalDialog, open: false } })),
      startFocus: (focusEventId) => set({ focusEventId }),
    }),
    {
      name: "jarvis-planning",
      partialize: (s) => ({ view: s.view }),
    },
  ),
);
