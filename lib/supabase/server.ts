import { createClient } from "@supabase/supabase-js";
import { createServerClient as createSSRServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-only client (Route Handlers / Server Actions / Server Components).
 * Uses the service role key, which bypasses RLS — this file must never be
 * imported into a "use client" component. Next.js will throw if you try to
 * import server-only env vars into client code, but stay disciplined anyway.
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase not configured: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}

/**
 * Returns true if Supabase env vars are present, so calling code can fall
 * back to in-memory demo data (lib/demo/seedData.ts) when they're not —
 * same fallback pattern used for Gemini in lib/gemini/client.ts.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

/**
 * Cookie-aware client for reading the *logged-in user's* session in
 * Server Components / Route Handlers. Uses the anon key (not the service
 * role key) and respects RLS — this is for auth/session checks, not data
 * writes. Data writes still go through createServerClient() above.
 */
export async function createSessionServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase not configured: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  const cookieStore = await cookies();

  return createSSRServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — the session cookie refresh
          // is handled by the root middleware instead, so this is safe.
        }
      },
    },
  });
}
