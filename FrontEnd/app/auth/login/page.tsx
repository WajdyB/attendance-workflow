// app/auth/login/page.tsx
"use client";

import { Mail, Lock, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { apiConfig } from "@/utils/api-config";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") return false;
    const storageMode = localStorage.getItem("authStorage");
    return (
      storageMode === "local" &&
      !!localStorage.getItem("token") &&
      !!localStorage.getItem("user")
    );
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { login, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) router.push("/dashboard");
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t("auth.login.fillAll"));
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(apiConfig.endpoints.auth.login, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const contentType = res.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const data = isJson ? await res.json() : null;

      if (!isJson) {
        setError(t("auth.login.invalidResponse").replace("{baseUrl}", apiConfig.baseUrl));
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.message || "Login failed. Please try again.");
        setIsLoading(false);
      } else {
        login(data, rememberMe);
        router.push("/dashboard");
      }
    } catch (error) {
      setError(t("auth.login.network"));
      setIsLoading(false);
      console.error("Login error:", error);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
      style={{ background: "var(--bg)" }}
    >
      {/* Back to home */}
      <div className="w-full max-w-sm mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm transition"
          style={{ color: "var(--text-3)" }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-1)")}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = "var(--text-3)")}
        >
          <ArrowLeft size={14} />
          {t("auth.login.backHome")}
        </Link>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{ background: "var(--accent-dim)" }}
          >
            <Image src="/logos/logo.svg" alt="RHpro" width={26} height={26} />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>
              Connexion à RHpro
            </h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
              {t("auth.login.subtitle")}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="mb-5 rounded-xl p-3 text-sm"
            style={{
              background: "rgba(239,68,68,0.1)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#f87171",
            }}
          >
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          {/* Email */}
          <div>
            <label
              className="block text-xs font-medium mb-1.5"
              style={{ color: "var(--text-2)" }}
            >
              {t("auth.login.email")}
            </label>
            <div
              className="auth-input-shell flex items-center rounded-xl px-3 py-2.5 gap-2 transition-[box-shadow,border-color] outline-none focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent)_45%,transparent)] focus-within:border-[var(--accent)]"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <Mail size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <input
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                className="w-full min-w-0 bg-transparent text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
                style={{ border: "none", boxShadow: "none", background: "transparent" }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                {t("auth.login.password")}
              </label>
              <Link
                href="/auth/forget-password"
                className="text-xs transition"
                style={{ color: "var(--accent)" }}
              >
                {t("auth.login.forgot")}
              </Link>
            </div>
            <div
              className="auth-input-shell flex items-center rounded-xl px-3 py-2.5 gap-2 transition-[box-shadow,border-color] outline-none focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--accent)_45%,transparent)] focus-within:border-[var(--accent)]"
              style={{
                background: "var(--surface-raised)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <Lock size={15} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full min-w-0 flex-1 bg-transparent text-sm text-[var(--text-1)] placeholder:text-[var(--text-3)] outline-none ring-0 focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
                style={{ border: "none", boxShadow: "none", background: "transparent" }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="flex-shrink-0 transition cursor-pointer disabled:opacity-40"
                style={{ color: "var(--text-3)" }}
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded"
              style={{ accentColor: "var(--accent)" }}
              disabled={isLoading}
            />
            <span style={{ color: "var(--text-3)" }}>{t("auth.login.remember")}</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary w-full justify-center py-2.5"
            style={{ marginTop: 8 }}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {t("auth.login.loading")}
              </>
            ) : (
              t("auth.login.submit")
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
