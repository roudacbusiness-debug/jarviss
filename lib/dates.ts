import { TZDate } from "@date-fns/tz";
import { format, formatDistanceToNowStrict, differenceInCalendarDays, startOfWeek, addDays } from "date-fns";
import { fr } from "date-fns/locale";

export const DEFAULT_TZ = "Africa/Casablanca";

/** Convertit n'importe quelle date/ISO en TZDate dans le fuseau donné. */
export function tz(date: Date | string | number, timezone: string): TZDate {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new TZDate(d.getTime(), timezone);
}

export function nowTz(timezone: string): TZDate {
  return TZDate.tz(timezone);
}

/** Construit une date locale (fuseau) à partir de composants. */
export function makeTz(timezone: string, y: number, m: number, d: number, h = 0, min = 0): TZDate {
  return new TZDate(y, m, d, h, min, 0, 0, timezone);
}

/** Lundi de la semaine contenant `date`. */
export function weekStart(date: Date, timezone: string, weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = 1): TZDate {
  return startOfWeek(tz(date, timezone), { weekStartsOn }) as TZDate;
}

export function weekDays(start: TZDate, count = 7): TZDate[] {
  return Array.from({ length: count }, (_, i) => addDays(start, i) as TZDate);
}

export function fmt(date: Date, pattern: string): string {
  return format(date, pattern, { locale: fr });
}

/** "lun. 14 oct." */
export function fmtDayShort(date: Date) {
  return fmt(date, "EEE d MMM");
}

/** "14:30" */
export function fmtTime(date: Date) {
  return fmt(date, "HH:mm");
}

export function fmtRange(start: Date, end: Date) {
  return `${fmtTime(start)} – ${fmtTime(end)}`;
}

/** Nombre de jours calendaires jusqu'à la date (0 = aujourd'hui, négatif = passé). */
export function daysUntil(date: Date, timezone: string): number {
  return differenceInCalendarDays(tz(date, timezone), nowTz(timezone));
}

export function countdownLabel(date: Date, timezone: string): string {
  const d = daysUntil(date, timezone);
  if (d < 0) return "passée";
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "demain";
  return `J-${d}`;
}

export function relative(date: Date) {
  return formatDistanceToNowStrict(date, { locale: fr, addSuffix: true });
}

/** Minutes depuis minuit (dans le fuseau de la date). */
export function minutesOfDay(date: Date): number {
  return date.getHours() * 60 + date.getMinutes();
}

/** Durée en heures décimales. */
export function hoursBetween(start: Date | string, end: Date | string): number {
  const s = typeof start === "string" ? new Date(start) : start;
  const e = typeof end === "string" ? new Date(end) : end;
  return Math.max(0, (e.getTime() - s.getTime()) / 3_600_000);
}

export function fmtHours(h: number): string {
  if (h === 0) return "0 h";
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (min === 0) return `${whole} h`;
  if (whole === 0) return `${min} min`;
  return `${whole} h ${String(min).padStart(2, "0")}`;
}

/** Arrondit une date au pas de `step` minutes. */
export function roundToStep(date: TZDate, step = 15): TZDate {
  const m = date.getMinutes();
  const r = Math.round(m / step) * step;
  const d = new TZDate(date.getTime(), date.timeZone);
  d.setMinutes(r, 0, 0);
  return d;
}

/** Date ISO (YYYY-MM-DD) dans le fuseau. */
export function isoDate(date: Date): string {
  return fmt(date, "yyyy-MM-dd");
}

/** Combine une date ISO et une heure "HH:mm" en TZDate. */
export function combine(dateIso: string, time: string, timezone: string): TZDate {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return makeTz(timezone, y, m - 1, d, h, min);
}

/** Jour de semaine ISO (1 = lundi … 7 = dimanche). */
export function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}
