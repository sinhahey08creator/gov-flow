"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    console.log("LOGIN SUBMIT FIRED");
    setError("");

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }

    setIsLoading(true);

    const supabase = createBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    console.log("LOGIN RESULT", { error: signInError });

    if (signInError) {
      // Log the real error for debugging; show a safe, friendly message.
      console.error("Login error:", signInError.status, signInError.message);

      setIsLoading(false);

      if (
        signInError.message.toLowerCase().includes("invalid login credentials")
      ) {
        setError("Invalid email or password.");
      } else if (
        signInError.message.toLowerCase().includes("email not confirmed")
      ) {
        setError(
          "Your account isn't confirmed yet. Please contact support."
        );
      } else {
        setError(signInError.message);
      }
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    console.log("SESSION AFTER LOGIN", sessionData);

    // Success: session cookie has been written by the browser client.
    // router.refresh() re-runs Server Components + proxy.ts with the new
    // cookie, and router.push() then completes the client-side navigation.
    router.refresh();
    router.push("/");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">
            GovFlow AI
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Government Workflow Operations
          </p>
        </div>

        {/* Login Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            Welcome Back
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Login to your GovFlow AI account
          </p>
        </div>

        {/* General Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* Username / Email */}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Username / Email
            </label>

            <input
              id="username"
              name="username"
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="Enter your username or email"
              disabled={isLoading}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <Link
                href="/forget-password"
                className="text-sm font-medium text-slate-600 hover:underline"
              >
                Forget Password?
              </Link>
            </div>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Enter your password"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        {/* Signup Link */}
        <div className="mt-6 text-center text-sm text-slate-500">
          New user?{" "}
          <Link
            href="/signup"
            className="font-semibold text-slate-900 hover:underline"
          >
            Create Account
          </Link>
        </div>
      </div>
    </main>
  );
}