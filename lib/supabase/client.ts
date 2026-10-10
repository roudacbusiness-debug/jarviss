import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Client Supabase côté navigateur (singleton). */
export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
    );
  }
  return client;
}
