// app/auth/reset-password/page.tsx
"use client";

import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { apiConfig } from "@/utils/api-config";
import { useLanguage } from "@/context/LanguageContext";

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--bg)",
  padding: "24px 16px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 400,
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 20,
  padding: 32,
  boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div style={pageStyle}>
          <div style={cardStyle} className="text-center text-sm">
            <span style={{ color: "var(--text-3)" }}>Chargement...</span>
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
  const token = searchParams.get("token_hash") || searchParams.get("token");

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
    if (!password) { setError("Please enter a new password"); return false; }
    if (password.length < 8) { setError("Password must be at least 8 characters"); return false; }
    if (password !== confirmPassword) { setError("Passwords do not match"); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validatePasswords() || !token) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        apiConfig.endpoints.auth.resetPassword || `${apiConfig.baseUrl}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, newPassword: password }),
        }
      );
      const data = await response.json();
      if (!response.ok) { setError(data.message || "Failed to reset password"); return; }
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

  const fieldStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--surface-raised)",
    border: "1px solid var(--border-strong)",
    borderRadius: 12,
    padding: "10px 14px",
  };

  if (!tokenValid) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle} className="text-center">
          <div className="flex justify-center mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(239,68,68,0.1)" }}>
              <AlertCircle size={28} style={{ color: "#f87171" }} />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-1)" }}>{t("auth.reset.invalidTitle")}</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>{t("auth.reset.invalidBody")}</p>
          <Link href="/auth/forget-password" className="btn-primary w-full justify-center">
            {t("auth.reset.requestNew")}
          </Link>
          <Link href="/auth/login" className="block mt-3 text-sm text-center transition" style={{ color: "var(--text-3)" }}>
            {t("auth.reset.back")}
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle} className="text-center">
          <div className="flex justify-center mb-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(34,197,94,0.1)" }}>
              <CheckCircle size={28} style={{ color: "#4ade80" }} />
            </div>
          </div>
          <h2 className="text-lg font-semibold mb-2" style={{ color: "var(--text-1)" }}>{t("auth.reset.successTitle")}</h2>
          <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>{t("auth.reset.successBody")}</p>
          <Link href="/auth/login" className="btn-primary w-full justify-center">
            {t("auth.reset.goLogin")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <h2 className="text-lg font-semibold mb-1" style={{ color: "var(--text-1)" }}>{t("auth.reset.title")}</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-3)" }}>{t("auth.reset.subtitle")}</p>

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-xl p-3 text-sm"
               style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
              {t("auth.reset.newPassword")}
            </label>
            <div style={fieldStyle}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nouveau mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ border: "none", background: "transparent" }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading} className="flex-shrink-0 transition"
                      style={{ color: "var(--text-3)" }}>
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text-3)" }}>{t("auth.reset.passwordHint")}</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-2)" }}>
              {t("auth.reset.confirmPassword")}
            </label>
            <div style={fieldStyle}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirmer le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ border: "none", background: "transparent" }}
              />
              <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isLoading} className="flex-shrink-0 transition"
                      style={{ color: "var(--text-3)" }}>
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={isLoading} className="btn-primary w-full justify-center py-2.5" style={{ marginTop: 8 }}>
            {isLoading ? (
              <><Loader2 size={16} className="animate-spin" />{t("auth.reset.loading")}</>
            ) : t("auth.reset.submit")}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href="/auth/login" className="text-sm transition" style={{ color: "var(--text-3)" }}>
            {t("auth.reset.back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
