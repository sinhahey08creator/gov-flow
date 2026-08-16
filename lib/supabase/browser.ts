import { createBrowserClient as createSupabaseBrowserClient } from "@supabase/ssr";

/**
 * Browser-side client. Uses the public anon key only — safe to expose.
 * Anon key can only read (per RLS policies in 0002_rls.sql); it cannot
 * write. All writes go through server.ts using the service role key.
 *
 * Uses @supabase/ssr's cookie-based client (instead of plain
 * @supabase/supabase-js) so the auth session is stored in cookies and
 * is visible to the root middleware.ts / server components for route
 * protection, not just localStorage.
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  return createSupabaseBrowserClient(url, anonKey);
}
