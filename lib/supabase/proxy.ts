import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import { AUTO_LOGIN } from "@/lib/supabase/auto-login";

const PUBLIC_PATHS = ["/connexion", "/auth/callback", "/manifest.webmanifest", "/sw.js", "/hors-ligne"];

/** Rafraîchit la session Supabase ; sans session, connecte automatiquement le compte unique. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Ne pas insérer de logique entre createServerClient et getClaims().
  const { data } = await supabase.auth.getClaims();
  let user: boolean = !!data?.claims;

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!user && !isPublic) {
    const { data: signed, error } = await supabase.auth.signInWithPassword(AUTO_LOGIN);
    if (!error && signed.session) user = true;
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/connexion") {
    const url = request.nextUrl.clone();
    url.pathname = "/planning";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
