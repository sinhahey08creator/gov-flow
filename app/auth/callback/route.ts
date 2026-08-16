import { NextResponse } from "next/server";
import { createSessionServerClient } from "@/lib/supabase/server";

/**
 * Handles the redirect from Supabase auth emails (password reset, etc).
 * Exchanges the one-time `code` for a real session, then forwards the
 * user to `next` (defaults to /reset-password).
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";

  if (code) {
    const supabase = await createSessionServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
