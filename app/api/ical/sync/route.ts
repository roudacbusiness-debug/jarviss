import { NextResponse, type NextRequest } from "next/server";
import ICAL from "ical.js";
import { TZDate } from "@date-fns/tz";
import { createClient } from "@/lib/supabase/server";
import type { TablesInsert } from "@/lib/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW_PAST_DAYS = 60;
const WINDOW_FUTURE_DAYS = 200;
const MAX_EVENTS = 5000;

type Row = Omit<TablesInsert<"ical_events">, "user_id">;

function toDate(time: ICAL.Time, fallbackTz: string): Date {
  // Heure flottante (sans fuseau) : on l'interprète dans le fuseau de l'utilisateur.
  if (!time.zone || (time.zone.tzid === "floating" && !time.isDate)) {
    return new TZDate(time.year, time.month - 1, time.day, time.hour, time.minute, time.second, 0, fallbackTz);
  }
  if (time.isDate) {
    return new TZDate(time.year, time.month - 1, time.day, 0, 0, 0, 0, fallbackTz);
  }
  return time.toJSDate();
}

function parseIcs(ics: string, feedId: string, tzFallback: string): Row[] {
  const jcal = ICAL.parse(ics);
  const comp = new ICAL.Component(jcal);

  // Enregistre les fuseaux déclarés dans le fichier.
  for (const vtz of comp.getAllSubcomponents("vtimezone")) {
    const tzid = vtz.getFirstPropertyValue("tzid");
    if (typeof tzid === "string" && !ICAL.TimezoneService.has(tzid)) {
      ICAL.TimezoneService.register(vtz);
    }
  }

  const now = Date.now();
  const from = now - WINDOW_PAST_DAYS * 86_400_000;
  const to = now + WINDOW_FUTURE_DAYS * 86_400_000;
  const rows: Row[] = [];
  const seen = new Set<string>();

  const push = (uid: string, start: Date, end: Date, summary: string, location: string) => {
    if (end.getTime() < from || start.getTime() > to) return;
    const key = `${uid}|${start.toISOString()}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      feed_id: feedId,
      uid,
      summary: summary.slice(0, 200),
      location: location.slice(0, 200),
      starts_at: new Date(start.getTime()).toISOString(),
      ends_at: new Date(end.getTime()).toISOString(),
    });
  };

  for (const vevent of comp.getAllSubcomponents("vevent")) {
    if (rows.length >= MAX_EVENTS) break;
    const ev = new ICAL.Event(vevent);
    const uid = ev.uid || `${ev.summary}-${ev.startDate?.toString()}`;
    const summary = ev.summary ?? "";
    const location = ev.location ?? "";

    if (ev.isRecurring()) {
      const it = ev.iterator();
      let next: ICAL.Time | null;
      let guard = 0;
      while ((next = it.next()) && guard++ < 1000) {
        const occ = ev.getOccurrenceDetails(next);
        const s = toDate(occ.startDate, tzFallback);
        const e = toDate(occ.endDate, tzFallback);
        if (s.getTime() > to) break;
        push(uid, s, e, summary, location);
      }
    } else {
      const s = toDate(ev.startDate, tzFallback);
      const e = ev.endDate ? toDate(ev.endDate, tzFallback) : new Date(s.getTime() + 3_600_000);
      push(uid, s, e, summary, location);
    }
  }
  return rows;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return NextResponse.json({ ok: false, error: "Non connecté" }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { feedId?: string | null };

  let query = supabase.from("ical_feeds").select("*").eq("enabled", true);
  if (body.feedId) query = query.eq("id", body.feedId);
  const { data: feeds, error } = await query;
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const { data: settings } = await supabase.from("settings").select("timezone").maybeSingle();
  const tzFallback = settings?.timezone ?? "Africa/Casablanca";

  let total = 0;
  const errors: string[] = [];

  for (const feed of feeds ?? []) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15_000);
      const res = await fetch(feed.url.replace(/^webcal:\/\//i, "https://"), {
        signal: controller.signal,
        headers: { "User-Agent": "Jarvis/1.0 (+ical)", Accept: "text/calendar, */*" },
        cache: "no-store",
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ics = await res.text();
      if (!/BEGIN:VCALENDAR/i.test(ics)) throw new Error("Le lien ne renvoie pas un calendrier iCal");

      const rows = parseIcs(ics, feed.id, tzFallback);

      const { error: delErr } = await supabase.from("ical_events").delete().eq("feed_id", feed.id);
      if (delErr) throw delErr;
      for (let i = 0; i < rows.length; i += 500) {
        const { error: insErr } = await supabase.from("ical_events").insert(rows.slice(i, i + 500));
        if (insErr) throw insErr;
      }
      await supabase
        .from("ical_feeds")
        .update({ last_synced_at: new Date().toISOString(), last_error: null })
        .eq("id", feed.id);
      total += rows.length;
    } catch (err) {
      const message = err instanceof Error ? (err.name === "AbortError" ? "Délai dépassé" : err.message) : "Erreur inconnue";
      errors.push(`${feed.name} : ${message}`);
      await supabase.from("ical_feeds").update({ last_error: message.slice(0, 300) }).eq("id", feed.id);
    }
  }

  if (errors.length && total === 0) {
    return NextResponse.json({ ok: false, error: errors.join(" · ") }, { status: 502 });
  }
  return NextResponse.json({ ok: true, synced: total, errors });
}
