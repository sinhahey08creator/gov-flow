"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

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

        {/* Login Form */}
        <form className="space-y-5">
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
              placeholder="Enter your username or email"
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
                placeholder="Enter your password"
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
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Login
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