"use client";

import { useEffect, useState } from "react";
import { Loader2, TrendingUp, Clock, CheckCircle, Calendar } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { LeaveBalance } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  userId: string;
  year?: number;
}

export default function LeaveBalanceCard({ userId, year }: Props) {
  const { language } = useLanguage();
  const currentYear = year ?? new Date().getFullYear();
  const [balance, setBalance] = useState<LeaveBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  useEffect(() => {
    apiClient
      .get<LeaveBalance>(apiConfig.endpoints.requests.balance(userId, currentYear))
      .then(setBalance)
      .catch(() => setBalance(null))
      .finally(() => setLoading(false));
  }, [userId, currentYear]);

  if (loading) {
    return (
      <div className="card flex items-center justify-center min-h-[140px]">
        <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  if (!balance) return null;

  const allocated = Number(balance.allocatedDays);
  const used      = Number(balance.usedDays);
  const pending   = Number(balance.pendingDays);
  const remaining = Number(balance.remainingDays);
  const usedPct   = allocated > 0 ? Math.min(Math.round((used / allocated) * 100), 100) : 0;

  const items = [
    { icon: TrendingUp,   label: t("Alloués",   "Allocated"), value: allocated, color: "var(--accent)" },
    { icon: CheckCircle,  label: t("Utilisés",  "Used"),      value: used,      color: "#22c55e"       },
    { icon: Clock,        label: t("En attente","Pending"),   value: pending,   color: "#f59e0b"       },
    { icon: Calendar,     label: t("Restants",  "Remaining"), value: remaining, color: "#6366f1"       },
  ];

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
          {t("Solde de congés", "Leave balance")} {currentYear}
        </h3>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
        >
          PTO
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {items.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: `${color}1a` }}
            >
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-xl font-bold" style={{ color: "var(--text-1)" }}>{value}</p>
            <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs" style={{ color: "var(--text-3)" }}>
          <span>{t("Jours utilisés", "Days used")}</span>
          <span>{usedPct}%</span>
        </div>
        <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${usedPct}%`,
              background: usedPct >= 90 ? "#ef4444" : usedPct >= 70 ? "#f59e0b" : "var(--accent)",
            }}
          />
        </div>
        {remaining <= 3 && remaining >= 0 && (
          <p className="text-xs" style={{ color: "#f59e0b" }}>
            {remaining === 0
              ? t("Solde épuisé", "Balance exhausted")
              : t(`Plus que ${remaining} jour(s) restant(s)`, `Only ${remaining} day(s) remaining`)}
          </p>
        )}
      </div>
    </div>
  );
}
