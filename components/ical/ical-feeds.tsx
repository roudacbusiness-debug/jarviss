"use client";

import { useState } from "react";
import { Link2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAddIcalFeed, useDeleteIcalFeed, useIcalFeeds, useSyncIcal, useToggleIcalFeed } from "@/lib/queries/ical";
import { relative } from "@/lib/dates";

export function IcalFeeds() {
  const { feeds } = useIcalFeeds();
  const add = useAddIcalFeed();
  const del = useDeleteIcalFeed();
  const toggle = useToggleIcalFeed();
  const sync = useSyncIcal();
  const [url, setUrl] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = url.trim().replace(/^webcal:\/\//i, "https://");
    if (!/^https?:\/\//i.test(clean)) {
      toast.error("Colle un lien commençant par https:// ou webcal://");
      return;
    }
    try {
      const feed = await add.mutateAsync({ name: "Pronote", url: clean });
      setUrl("");
      const r = await sync.mutateAsync(feed.id);
      toast.success(`Emploi du temps importé (${r.synced ?? 0} cours)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import impossible");
    }
  }

  return (
    <div className="space-y-3">
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            className="pl-9"
            placeholder="https://…/ical/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
        <Button type="submit" loading={add.isPending || sync.isPending} disabled={!url.trim()}>
          Importer
        </Button>
      </form>

      {feeds.length ? (
        <ul className="space-y-2">
          {feeds.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
              <Switch checked={f.enabled} onCheckedChange={(enabled) => toggle.mutate({ id: f.id, enabled })} aria-label="Activer" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{f.name}</p>
                <p className="truncate text-xs text-muted">
                  {f.last_error
                    ? `Erreur : ${f.last_error}`
                    : f.last_synced_at
                      ? `Synchronisé ${relative(new Date(f.last_synced_at))}`
                      : "Jamais synchronisé"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rafraîchir"
                loading={sync.isPending && sync.variables === f.id}
                onClick={async () => {
                  try {
                    const r = await sync.mutateAsync(f.id);
                    toast.success(`${r.synced ?? 0} cours synchronisés`);
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Synchronisation impossible");
                  }
                }}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Supprimer" onClick={() => del.mutate(f.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">
          Dans Pronote : Emploi du temps → icône « Exporter » (ou « Lien iCal ») → copie l&apos;adresse.
        </p>
      )}
    </div>
  );
}
