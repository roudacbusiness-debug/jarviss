"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Coffee, Pause, Play, SkipForward, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useEvent, useUpdateEvent } from "@/lib/queries/events";
import { useSettings } from "@/lib/queries/settings";
import { useSubjectMap } from "@/lib/queries/subjects";
import { usePlanning } from "@/stores/planning";
import { cn } from "@/lib/utils/cn";

type Phase = "focus" | "break" | "done";

export function FocusOverlay() {
  const eventId = usePlanning((s) => s.focusEventId);
  if (!eventId) return null;
  return <FocusSession key={eventId} eventId={eventId} />;
}

function FocusSession({ eventId }: { eventId: string }) {
  const stop = usePlanning((s) => s.startFocus);
  const { settings } = useSettings();
  const { data: event } = useEvent(eventId);
  const subjects = useSubjectMap();
  const update = useUpdateEvent();
  const subject = event ? subjects.get(event.subject_id) : undefined;
  const color = subject?.color ?? "#8a8aff";

  const focusMs = settings.focus_minutes * 60_000;
  const breakMs = settings.break_minutes * 60_000;

  const [phase, setPhase] = useState<Phase>("focus");
  const [remaining, setRemaining] = useState(focusMs);
  const [paused, setPaused] = useState(false);
  const endsAt = useRef<number | null>(null);
  const pausedRemaining = useRef<number | null>(null);
  const markedDone = useRef(false);

  const total = phase === "focus" ? focusMs : breakMs;
  const progress = phase === "done" ? 1 : 1 - remaining / total;

  const markDone = useCallback(async () => {
    if (markedDone.current) return;
    markedDone.current = true;
    try {
      await update.mutateAsync({ id: eventId, status: "fait" });
      toast.success("Bloc marqué comme fait");
    } catch {
      toast.error("Impossible de marquer le bloc");
    }
  }, [eventId, update]);

  // Boucle du minuteur
  useEffect(() => {
    if (paused || phase === "done") return;
    if (endsAt.current === null) endsAt.current = Date.now() + focusMs;
    const id = setInterval(() => {
      const r = Math.max(0, (endsAt.current ?? 0) - Date.now());
      setRemaining(r);
      if (r === 0) {
        beep();
        if (phase === "focus") {
          void markDone();
          setPhase("break");
          endsAt.current = Date.now() + breakMs;
          setRemaining(breakMs);
        } else {
          setPhase("done");
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [paused, phase, breakMs, focusMs, markDone]);

  // Wake lock + échap
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && stop(null);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      lock?.release().catch(() => {});
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [stop]);

  function togglePause() {
    if (paused) {
      endsAt.current = Date.now() + (pausedRemaining.current ?? remaining);
      pausedRemaining.current = null;
      setPaused(false);
    } else {
      pausedRemaining.current = Math.max(0, (endsAt.current ?? 0) - Date.now());
      setPaused(true);
    }
  }

  function skip() {
    if (phase === "focus") {
      void markDone();
      setPhase("break");
      endsAt.current = Date.now() + breakMs;
      setRemaining(breakMs);
      setPaused(false);
    } else {
      setPhase("done");
    }
  }

  const mm = Math.floor(remaining / 60_000);
  const ss = Math.floor((remaining % 60_000) / 1000);
  const R = 120;
  const C = 2 * Math.PI * R;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-bg text-fg safe-top safe-bottom"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50 transition-colors duration-1000"
        style={{ background: `radial-gradient(60% 50% at 50% 40%, color-mix(in oklab, ${phase === "break" ? "#3ddc84" : color} 30%, transparent), transparent 70%)` }}
      />

      <button onClick={() => stop(null)} className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-fg focus-ring safe-top" aria-label="Quitter">
        <X className="h-5 w-5" />
      </button>

      <div className="relative z-10 flex w-full max-w-md flex-col items-center px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-2 flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em] text-muted"
          >
            {phase === "focus" ? "Session focus" : phase === "break" ? <><Coffee className="h-3.5 w-3.5" /> Pause</> : "Session terminée"}
          </motion.p>
        </AnimatePresence>
        <h1 className="font-display text-xl font-bold leading-tight tracking-tight">{event?.title || subject?.name || "Révision"}</h1>
        {event?.title && subject ? <p className="mt-0.5 text-sm text-muted">{subject.name}</p> : null}

        <div className="relative my-8 h-[280px] w-[280px]">
          <svg viewBox="0 0 280 280" className="h-full w-full -rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" stroke="var(--surface-3)" strokeWidth="10" />
            <motion.circle
              cx="140"
              cy="140"
              r={R}
              fill="none"
              stroke={phase === "break" ? "#3ddc84" : color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              animate={{ strokeDashoffset: C * (1 - progress) }}
              transition={{ ease: "linear", duration: 0.25 }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {phase === "done" ? (
              <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-success text-white">
                <Check className="h-10 w-10" />
              </motion.div>
            ) : (
              <p className={cn("font-display text-[64px] font-extrabold leading-none tabular", paused && "animate-pulse-soft")}>
                {String(mm).padStart(2, "0")}
                <span className="text-muted">:</span>
                {String(ss).padStart(2, "0")}
              </p>
            )}
            <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">
              {phase === "done" ? "Bravo" : paused ? "En pause" : `${Math.round(total / 60_000)} min`}
            </p>
          </div>
        </div>

        {phase === "done" ? (
          <Button size="lg" onClick={() => stop(null)} className="min-w-[180px]">
            Retour au planning
          </Button>
        ) : (
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="icon" onClick={skip} aria-label={phase === "focus" ? "Passer à la pause" : "Terminer"}>
              <SkipForward className="h-5 w-5" />
            </Button>
            <Button size="lg" onClick={togglePause} className="min-w-[160px]" style={{ background: phase === "break" ? "#3ddc84" : color, color: "#fff" }}>
              {paused ? <Play className="h-5 w-5 fill-current" /> : <Pause className="h-5 w-5 fill-current" />}
              {paused ? "Reprendre" : "Pause"}
            </Button>
            <Button variant="secondary" size="icon" onClick={() => stop(null)} aria-label="Quitter">
              <X className="h-5 w-5" />
            </Button>
          </div>
        )}
        {phase === "focus" ? <p className="mt-6 text-xs text-muted">À la fin du minuteur, le bloc sera marqué « fait » automatiquement.</p> : null}
      </div>
    </motion.div>
  );
}

function beep() {
  try {
    navigator.vibrate?.([200, 100, 200]);
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    [0, 0.25, 0.5].forEach((t, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = i === 2 ? 1046 : 784;
      g.gain.setValueAtTime(0.0001, now + t);
      g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.2);
      o.connect(g).connect(ctx.destination);
      o.start(now + t);
      o.stop(now + t + 0.22);
    });
  } catch {
    // audio indisponible
  }
}
