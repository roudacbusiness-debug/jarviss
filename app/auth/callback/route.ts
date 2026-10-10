import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Point d'arrivée du lien magique (PKCE `code` ou `token_hash`). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const supabase = await createClient();
  let ok = false;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    ok = !error;
  }

  if (ok) {
    return NextResponse.redirect(`${origin}/planning`);
  }

  const message = encodeURIComponent(
    "Le lien est invalide ou a expiré. Utilise le code à 6 chiffres de l'e-mail, ou demande un nouveau lien.",
  );
  return NextResponse.redirect(`${origin}/connexion?erreur=${message}`);
}
