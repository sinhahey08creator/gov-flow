import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // email_confirm: true marks the account as confirmed immediately.
    // This app has no "check your inbox to verify" step in the UI, so an
    // unconfirmed account (email_confirm: false) would be created
    // successfully but then be permanently unable to log in — Supabase
    // rejects signInWithPassword for unconfirmed users with
    // "Email not confirmed". That is exactly why login was failing.
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        message: "Account created successfully.",
        userId: data.user?.id,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Something went wrong while creating the account." },
      { status: 500 }
    );
  }
}