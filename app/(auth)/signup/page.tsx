"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [errors, setErrors] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    general: "",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSuccessMessage("");

    const newErrors = {
      username: "",
      password: "",
      confirmPassword: "",
      general: "",
    };

    // Username / Email validation
    if (!username.trim()) {
      newErrors.username = "Username / Email is required";
    } else if (!username.includes("@")) {
      newErrors.username = "Please enter a valid email address";
    }

    // Password validation
    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    // Confirm Password validation
    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    // Stop if validation errors exist
    if (
      newErrors.username ||
      newErrors.password ||
      newErrors.confirmPassword
    ) {
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: username.trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setErrors((prev) => ({
          ...prev,
          general: data.error || "Unable to create account.",
        }));

        setIsLoading(false);
        return;
      }

      setSuccessMessage(
        data.message ||
          "Account created successfully. Please check your email to verify your account."
      );

      setIsLoading(false);

      // Clear password fields
      setPassword("");
      setConfirmPassword("");

      // Go to login after a short delay
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (error) {
      console.error("Signup error:", error);

      setErrors((prev) => ({
        ...prev,
        general: "Something went wrong. Please try again.",
      }));

      setIsLoading(false);
    }
  };

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

        {/* Signup Heading */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-slate-900">
            Create Account
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Create your GovFlow AI account
          </p>
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm text-red-600">
              {errors.general}
            </p>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
            <p className="text-sm text-green-600">
              {successMessage}
            </p>
          </div>
        )}

        {/* Signup Form */}
        <form
          className="space-y-5"
          onSubmit={handleSubmit}
        >

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
              type="email"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);

                if (e.target.value.trim()) {
                  setErrors((prev) => ({
                    ...prev,
                    username: "",
                    general: "",
                  }));
                }
              }}
              placeholder="Enter your email"
              disabled={isLoading}
              className={`w-full rounded-lg border px-4 py-3 text-sm outline-none focus:border-slate-500 ${
                errors.username
                  ? "border-red-500"
                  : "border-slate-300"
              }`}
            />

            {errors.username && (
              <p className="mt-1 text-sm text-red-500">
                {errors.username}
              </p>
            )}
          </div>

          {/* Create Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Create Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  const value = e.target.value;

                  setPassword(value);

                  let passwordError = "";

                  if (!value) {
                    passwordError = "Password is required";
                  } else if (value.length < 8) {
                    passwordError =
                      "Password must be at least 8 characters";
                  }

                  let confirmError = "";

                  if (confirmPassword && value !== confirmPassword) {
                    confirmError = "Passwords do not match";
                  }

                  setErrors((prev) => ({
                    ...prev,
                    password: passwordError,
                    confirmPassword: confirmError,
                    general: "",
                  }));
                }}
                placeholder="Create your password"
                disabled={isLoading}
                className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm outline-none focus:border-slate-500 ${
                  errors.password
                    ? "border-red-500"
                    : "border-slate-300"
                }`}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            {password && password.length < 8 && (
              <p className="mt-1 text-sm text-slate-500">
                Use at least 8 characters.
              </p>
            )}

            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password}
              </p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Confirm Password
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={
                  showConfirmPassword
                    ? "text"
                    : "password"
                }
                value={confirmPassword}
                onChange={(e) => {
                  const value = e.target.value;

                  setConfirmPassword(value);

                  let confirmError = "";

                  if (!value) {
                    confirmError =
                      "Please confirm your password";
                  } else if (password !== value) {
                    confirmError =
                      "Passwords do not match";
                  }

                  setErrors((prev) => ({
                    ...prev,
                    confirmPassword: confirmError,
                    general: "",
                  }));
                }}
                placeholder="Confirm your password"
                disabled={isLoading}
                className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm outline-none focus:border-slate-500 ${
                  errors.confirmPassword
                    ? "border-red-500"
                    : "border-slate-300"
                }`}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(
                    !showConfirmPassword
                  )
                }
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} />
                ) : (
                  <Eye size={20} />
                )}
              </button>
            </div>

            {errors.confirmPassword ? (
              <p className="mt-1 text-sm text-red-500">
                {errors.confirmPassword}
              </p>
            ) : (
              confirmPassword &&
              password === confirmPassword &&
              password.length >= 8 && (
                <p className="mt-1 text-sm text-green-600">
                  Passwords match.
                </p>
              )
            )}
          </div>

          {/* Create Account */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading
              ? "Creating Account..."
              : "Create Account"}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
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