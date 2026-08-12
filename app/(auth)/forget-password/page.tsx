"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
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

        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            Forgot Password?
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Enter your email address and we&apos;ll help you reset your
            password.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-700">
              If an account exists with this email address, password reset
              instructions will be sent to you.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email Address
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-slate-500"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Send Reset Instructions
            </button>
          </form>
        )}

        {/* Back to Login */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-slate-900 hover:underline"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}