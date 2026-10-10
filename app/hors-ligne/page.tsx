import { WifiOff } from "lucide-react";

export const metadata = { title: "Hors ligne" };

export default function HorsLignePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-surface-2 text-muted">
        <WifiOff className="h-6 w-6" />
      </div>
      <h1 className="font-display text-xl font-bold">Pas de connexion</h1>
      <p className="mt-2 max-w-xs text-sm text-muted">
        Jarvis a besoin d&apos;internet pour charger ton planning et tes PDF. Réessaie dès que tu es reconnecté.
      </p>
    </main>
  );
}
