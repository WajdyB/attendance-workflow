// app/auth/reset-password/page.tsx
"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiConfig } from "@/utils/api-config";
import { useLanguage } from "@/context/LanguageContext";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
          <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-sm text-center text-sm text-stone-600">
            Loading reset link...
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValid, setTokenValid] = useState(true);

  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      setError("Invalid or missing reset token.");
    }
  }, [token]);

  const validatePasswords = () => {
    if (!password) {
      setError("Please enter a new password");
      return false;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validatePasswords() || !token) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(apiConfig.endpoints.auth.resetPassword || `${apiConfig.baseUrl}/auth/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Failed to reset password");
        return;
      }

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error("Reset password error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!tokenValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
        <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
          {/* Error Icon */}
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-orange-100 p-3">
              <AlertCircle className="h-10 w-10 text-orange-600" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-stone-900 text-center">
            {t("auth.reset.invalidTitle")}
          </h2>

          <p className="mt-4 text-sm text-stone-600 text-center">
            {t("auth.reset.invalidBody")}
          </p>

          {/* Action Buttons */}
          <div className="mt-6 space-y-2">
            <Link
              href="/auth/forget-password"
              className="inline-block w-full rounded-lg bg-orange-600 py-2.5 text-center font-medium text-white transition hover:bg-orange-700"
            >
              {t("auth.reset.requestNew")}
            </Link>
            <Link
              href="/auth/login"
              className="inline-block w-full py-2 text-center text-sm text-orange-700 hover:text-orange-800 hover:underline"
            >
              {t("auth.reset.back")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
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
            {t("auth.reset.successTitle")}
          </h2>

          <p className="mt-4 text-sm text-stone-600 text-center">
            {t("auth.reset.successBody")}
          </p>

          {/* Action Button */}
          <Link
            href="/auth/login"
            className="mt-6 block w-full rounded-lg bg-orange-600 py-2.5 text-center font-medium text-white transition hover:bg-orange-700"
          >
            {t("auth.reset.goLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-orange-50 to-white px-4">
      <div className="w-full max-w-md rounded-2xl border border-orange-100 bg-white p-8 shadow-sm">
        {/* Title */}
        <h2 className="text-2xl font-semibold text-stone-900">
          {t("auth.reset.title")}
        </h2>

        <p className="mt-2 mb-6 text-sm text-stone-600">
          {t("auth.reset.subtitle")}
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
          {/* Password Field */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              {t("auth.reset.newPassword")}
            </label>

            <div className="flex items-center rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-2.5">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="ml-2 text-stone-400 hover:text-stone-700 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>

            <p className="mt-1 text-xs text-stone-500">
              {t("auth.reset.passwordHint")}
            </p>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">
              {t("auth.reset.confirmPassword")}
            </label>

            <div className="flex items-center rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-2.5">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400 disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
                className="ml-2 text-stone-400 hover:text-stone-700 disabled:opacity-50"
              >
                {showConfirmPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
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
                {t("auth.reset.loading")}
              </>
            ) : (
              t("auth.reset.submit")
            )}
          </button>
        </form>

        {/* Back to Login Link */}
        <div className="mt-4 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-orange-700 hover:text-orange-800 hover:underline"
          >
            {t("auth.reset.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}

