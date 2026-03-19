"use client";

import Link from "next/link";
import { Mail, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { apiConfig } from "@/app/utils/api-config";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiConfig.endpoints.auth.forgotPassword || `${apiConfig.baseUrl}/auth/forgot-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to send reset link");
        return;
      }

      setSubmitted(true);
      setEmail("");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Forgot password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
        <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
          {/* Success Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-orange-100 p-3">
              <CheckCircle className="h-10 w-10 text-orange-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-stone-900 text-center">
            Check your email
          </h2>

          <p className="mt-4 text-sm text-stone-600 text-center">
            We have sent a password reset link to your email address. Please check your inbox and follow the instructions to reset your password.
          </p>

          {/* Tip Box */}
          <div className="mt-6 rounded-lg border border-orange-200 bg-orange-50 p-4">
            <p className="text-sm text-orange-800">
              <strong>Tip:</strong> The reset link will expire in 24 hours. If you do not see the email, check your spam folder.
            </p>
          </div>

          {/* Back to Login */}
          <div className="mt-6 flex items-center justify-center gap-1">
            <span className="text-sm text-stone-600">Remember your password?</span>
            <Link
              href="/auth/login"
              className="text-sm font-medium text-orange-700 hover:text-orange-800 hover:underline"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        {/* Title */}
        <h2 className="text-2xl font-semibold text-stone-900">
          Forgot password?
        </h2>

        <p className="mt-2 mb-6 text-sm text-stone-600">
          No worries, we’ll send you reset instructions.
        </p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              Email Address
            </label>

            <div className="flex items-center rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-2.5">
              <Mail size={16} className="mr-2 text-orange-500" />
              <input
                type="email"
                placeholder="e.g. alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full py-2.5 rounded-lg font-medium transition flex items-center justify-center gap-2
              ${
                isLoading
                  ? "bg-orange-300 cursor-not-allowed"
                  : "bg-orange-600 hover:bg-orange-700"
              } text-white
            `}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail size={18} />
                Send Reset Link
              </>
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-4 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-orange-700 hover:text-orange-800 hover:underline"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
