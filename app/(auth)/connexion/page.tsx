"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, KeyRound, MailCheck, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Step = "email" | "code";

export default function ConnexionPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(params.get("erreur"));

  async function sendLink(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(
        error.message.includes("réservée")
          ? "Cette application est réservée à un seul utilisateur."
          : "Impossible d'envoyer l'e-mail. Vérifie l'adresse et réessaie.",
      );
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Code invalide ou expiré. Demande un nouveau code.");
      return;
    }
    router.replace("/planning");
    router.refresh();
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10">
      {/* Fond décoratif */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-20%] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[420px] w-[420px] rounded-full bg-[#06B6D4]/15 blur-[120px]" />
      </div>

      <div className="w-full max-w-sm animate-scale-in">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-md">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold leading-none tracking-tight">Jarvis</h1>
            <p className="mt-1 text-sm text-muted">Planning de révision · Terminale</p>
          </div>
        </div>

        <div className="surface rounded-xl p-6">
          {step === "email" ? (
            <form onSubmit={sendLink} className="space-y-4">
              <div>
                <h2 className="font-display text-lg font-bold">Connexion</h2>
                <p className="mt-1 text-sm text-muted">
                  Entre ton adresse : tu recevras un lien et un code de connexion.
                </p>
              </div>
              <div>
                <Label htmlFor="email">Adresse e-mail</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  required
                  placeholder="prenom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" size="lg" className="w-full" loading={loading}>
                Recevoir le lien <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-success/15 text-success">
                  <MailCheck className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold">E-mail envoyé</h2>
                  <p className="mt-1 text-sm text-muted">
                    Clique sur le lien reçu à <span className="font-semibold text-fg">{email}</span>, ou saisis le
                    code à 6 chiffres ci-dessous.
                  </p>
                </div>
              </div>
              <div>
                <Label htmlFor="code">Code de connexion</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <Input
                    id="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6,8}"
                    placeholder="123456"
                    className="pl-9 font-mono text-base tracking-[0.3em]"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    autoFocus
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <Button type="submit" size="lg" className="w-full" loading={loading} disabled={code.length < 6}>
                Se connecter
              </Button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setError(null);
                }}
                className="w-full text-center text-sm text-muted hover:text-fg"
              >
                Changer d'adresse ou renvoyer
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
