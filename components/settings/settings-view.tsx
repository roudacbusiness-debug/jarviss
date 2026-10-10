"use client";

import { useState } from "react";
import type { Settings } from "@/lib/types/database";
import { PageHeader } from "@/components/layout/page-header";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { SubjectList } from "@/components/subjects/subject-list";
import { Field, Input, Select } from "@/components/ui/input";
import { useSettings, useUpdateSettings } from "@/lib/queries/settings";
import { TimetableEditor } from "@/components/timetable/timetable-editor";
import { IcalFeeds } from "@/components/ical/ical-feeds";

const TIMEZONES = [
  "Africa/Casablanca",
  "Europe/Paris",
  "Europe/London",
  "Europe/Madrid",
  "Africa/Algiers",
  "Africa/Tunis",
  "Asia/Dubai",
  "America/New_York",
  "America/Montreal",
];

export function SettingsView() {
  const { settings } = useSettings();
  const update = useUpdateSettings();
  const [draft, setDraft] = useState<Partial<Settings>>({});
  const local = { ...settings, ...draft };

  function setLocal(fn: (l: Settings) => Settings) {
    setDraft((d) => {
      const next = fn({ ...settings, ...d });
      return { ...d, ...next };
    });
  }

  function commit<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    update.mutate({ [key]: value });
  }

  return (
    <>
      <PageHeader title="Réglages" subtitle="Matières, affichage, emploi du temps" />
      <div className="mx-auto grid w-full max-w-5xl gap-6 px-4 pb-10 md:grid-cols-[1.1fr_1fr] md:px-6">
        <Section title="Matières" description="Glisse pour réordonner. La couleur sert dans tout le planning.">
          <SubjectList />
        </Section>

        <div className="space-y-6">
          <Section title="Apparence">
            <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <span className="text-sm font-semibold">Thème</span>
              <ThemeToggle withLabel className="h-9" />
            </div>
          </Section>

          <Section title="Planning">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Fuseau horaire" className="sm:col-span-2">
                <Select value={local.timezone} onChange={(e) => commit("timezone", e.target.value)}>
                  {TIMEZONES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Début de la grille">
                <Select value={local.day_start_hour} onChange={(e) => commit("day_start_hour", Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, h) => (
                    <option key={h} value={h}>
                      {String(h).padStart(2, "0")}:00
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Fin de la grille">
                <Select value={local.day_end_hour} onChange={(e) => commit("day_end_hour", Number(e.target.value))}>
                  {Array.from({ length: 24 }, (_, h) => h + 1).map((h) => (
                    <option key={h} value={h}>
                      {h === 24 ? "24:00" : `${String(h).padStart(2, "0")}:00`}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Session focus (min)">
                <Input
                  type="number"
                  min={5}
                  max={180}
                  value={local.focus_minutes}
                  onChange={(e) => setLocal((l) => ({ ...l, focus_minutes: Number(e.target.value) }))}
                  onBlur={(e) => commit("focus_minutes", Math.min(180, Math.max(5, Number(e.target.value) || 50)))}
                />
              </Field>
              <Field label="Pause (min)">
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={local.break_minutes}
                  onChange={(e) => setLocal((l) => ({ ...l, break_minutes: Number(e.target.value) }))}
                  onBlur={(e) => commit("break_minutes", Math.min(60, Math.max(1, Number(e.target.value) || 10)))}
                />
              </Field>
            </div>
          </Section>

          <Section title="Emploi du temps Pronote (iCal)" description="Colle le lien iCal fourni par Pronote. Les cours apparaissent en gris dans le planning.">
            <IcalFeeds />
          </Section>
        </div>

        <Section title="Emploi du temps fixe" description="Cours récurrents chaque semaine, affichés en gris. Utile sans lien iCal." className="md:col-span-2">
          <TimetableEditor />
        </Section>
      </div>
    </>
  );
}

function Section({ title, description, children, className }: { title: string; description?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-3">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      <div className="surface rounded-lg p-4">{children}</div>
    </section>
  );
}
