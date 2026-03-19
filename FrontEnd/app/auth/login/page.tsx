// app/auth/login/page.tsx
"use client";

import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import { apiConfig } from "@/app/utils/api-config";
import Link from "next/link";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

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
  const router = useRouter();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(apiConfig.endpoints.auth.login, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Login failed. Please try again.");
        setIsLoading(false);
      } else {
        // Use context login with the full response
        login(data, rememberMe);
        // Navigate using router instead of window.location
        router.push("/dashboard");
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
      setIsLoading(false);
      console.error("Login error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-4 py-8 md:px-6 md:py-14">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-orange-100 bg-white p-7 shadow-sm md:p-10">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="rounded-xl bg-orange-100 p-2">
            <Image src="/logos/logo.svg" alt="Logo" width={34} height={34} />
          </div>
          <h1 className="text-xl font-semibold text-stone-900">RHpro</h1>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleLogin}>
          <div>
            <label className="text-sm font-medium text-stone-700">Email Address</label>
            <div className="mt-1 flex items-center rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-2.5 focus-within:border-orange-300">
              <Mail size={16} className="mr-2 text-orange-500" />
              <input
                type="email"
                placeholder="name@company.com"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm">
              <label className="font-medium text-stone-700">Password</label>
              <Link
                href="/auth/forget-password"
                className="font-medium text-orange-700 hover:text-orange-800 hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="mt-1 flex items-center rounded-lg border border-orange-200 bg-orange-50/40 px-3 py-2.5 focus-within:border-orange-300">
              <Lock size={16} className="mr-2 text-orange-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-transparent text-sm outline-none placeholder:text-stone-400"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-stone-400 hover:text-stone-700"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <label className="flex items-center text-sm text-stone-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="mr-2 h-4 w-4 rounded border-orange-300 text-orange-600 focus:ring-orange-200"
              disabled={isLoading}
            />
            Keep me logged in
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className={`
              flex w-full items-center justify-center gap-2 rounded-lg py-2.5 font-medium text-white transition
              ${
                isLoading
                  ? "cursor-not-allowed bg-orange-300"
                  : "bg-orange-600 hover:bg-orange-700"
              }
            `}
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Logging in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
