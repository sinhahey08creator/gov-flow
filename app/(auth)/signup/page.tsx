"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/browser";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Password is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    const supabase = createBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setIsLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccessMessage("Password updated successfully. Redirecting to login...");

    setTimeout(() => {
      router.push("/login");
    }, 2000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-slate-900">GovFlow AI</h1>
          <p className="mt-2 text-sm text-slate-500">
            Government Workflow Operations
          </p>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            Set a New Password
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Choose a new password for your account.
          </p>
        </div>

        {/* General Error */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm text-green-600">{successMessage}</p>
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {/* New Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              New Password
            </label>

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
                placeholder="Enter your new password"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-500"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Confirm New Password
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                placeholder="Confirm your new password"
                disabled={isLoading}
                className="w-full rounded-lg border border-slate-300 px-4 py-3 pr-12 text-sm outline-none focus:border-slate-500"
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={
                  showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                }
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </main>
  );
}
