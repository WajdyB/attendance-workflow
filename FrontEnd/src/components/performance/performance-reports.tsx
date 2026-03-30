"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart2, TrendingUp, Users } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import {
  DepartmentStat,
  PerformanceVsSalary,
  TrendPoint,
  scoreColor,
  scoreBg,
} from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  isAdmin?: boolean;
  collaboratorId?: string;
}

export default function PerformanceReports({ isAdmin, collaboratorId }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [tab, setTab] = useState<"departments" | "pvs" | "trend">(
    collaboratorId ? "trend" : "departments"
  );

  const [deptStats, setDeptStats] = useState<DepartmentStat[]>([]);
  const [pvs, setPvs] = useState<PerformanceVsSalary[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        if (tab === "departments") {
          const data = await apiClient.get<DepartmentStat[]>(
            apiConfig.endpoints.evaluations.departmentStats(year)
          );
          setDeptStats(data);
        } else if (tab === "pvs" && isAdmin) {
          const data = await apiClient.get<PerformanceVsSalary[]>(
            apiConfig.endpoints.evaluations.performanceVsSalary()
          );
          setPvs(data);
        } else if (tab === "trend" && collaboratorId) {
          const data = await apiClient.get<TrendPoint[]>(
            apiConfig.endpoints.evaluations.trend(collaboratorId)
          );
          setTrend(data);
        }
      } catch {
        // show empty state
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [tab, year, collaboratorId, isAdmin]);

  const maxScore = Math.max(...deptStats.map((d) => d.avgScore ?? 0), 1);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat(language === "fr" ? "fr-MA" : "en-US", {
      style: "currency",
      currency: "MAD",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex rounded-lg border border-stone-200 bg-white overflow-hidden">
          {!collaboratorId && (
            <button
              onClick={() => setTab("departments")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${tab === "departments" ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}
            >
              <BarChart2 size={14} />
              {t("Par département", "By department")}
            </button>
          )}
          {isAdmin && !collaboratorId && (
            <button
              onClick={() => setTab("pvs")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${tab === "pvs" ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}
            >
              <Users size={14} />
              {t("Perf. vs Salaire", "Perf. vs Salary")}
            </button>
          )}
          {collaboratorId && (
            <button
              onClick={() => setTab("trend")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${tab === "trend" ? "bg-orange-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}
            >
              <TrendingUp size={14} />
              {t("Évolution", "Trend")}
            </button>
          )}
        </div>

        {(tab === "departments") && (
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
          >
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-14">
          <Loader2 size={28} className="animate-spin text-orange-500" />
        </div>
      ) : tab === "departments" ? (
        /* ── Dept stats ── */
        deptStats.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-orange-100/20 py-14 text-stone-400">
            <BarChart2 size={36} className="mb-3 opacity-30" />
            <p className="text-sm">{t("Aucune donnée", "No data")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Bar chart */}
            <div className="rounded-xl border border-orange-100/20 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-stone-700">
                {t("Score moyen par département", "Avg score by department")} — {year}
              </h3>
              <div className="space-y-3">
                {[...deptStats]
                  .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
                  .map((d) => {
                    const pct = d.avgScore != null ? Math.round((d.avgScore / 100) * 100) : 0;
                    return (
                      <div key={d.departmentId} className="flex items-center gap-3">
                        <p className="w-32 text-sm font-medium text-stone-600 truncate">{d.departmentName}</p>
                        <div className="flex-1 h-7 rounded-lg bg-stone-100 overflow-hidden">
                          <div
                            className={`h-full rounded-lg flex items-center pl-2 ${scoreBg(d.avgScore)} transition-all`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          >
                            <span className="text-xs font-bold text-white whitespace-nowrap">
                              {d.avgScore ?? "—"}
                            </span>
                          </div>
                        </div>
                        <span className="w-10 text-right text-xs text-stone-400">
                          {d.count} {t("éval.", "eval.")}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )
      ) : tab === "pvs" ? (
        /* ── Performance vs Salary ── */
        pvs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-orange-100/20 py-14 text-stone-400">
            <Users size={36} className="mb-3 opacity-30" />
            <p className="text-sm">{t("Aucune donnée", "No data")}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">{t("Collaborateur", "Collaborator")}</th>
                  <th className="px-4 py-3 text-left">{t("Département", "Department")}</th>
                  <th className="px-4 py-3 text-right">{t("Dernière note", "Latest score")}</th>
                  <th className="px-4 py-3 text-right">{t("Salaire actuel", "Current salary")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {[...pvs]
                  .sort((a, b) => (b.latestScore ?? 0) - (a.latestScore ?? 0))
                  .map((p) => (
                    <tr key={p.collaboratorId} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-stone-700">
                          {p.firstName} {p.lastName}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-500">{p.department ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        {p.latestScore != null ? (
                          <span className={`font-bold ${scoreColor(p.latestScore)}`}>
                            {p.latestScore}/100
                          </span>
                        ) : (
                          <span className="text-stone-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-800">
                        {p.currentSalary != null ? formatCurrency(p.currentSalary) : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ── Trend ── */
        trend.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-orange-100/20 py-14 text-stone-400">
            <TrendingUp size={36} className="mb-3 opacity-30" />
            <p className="text-sm">{t("Aucune donnée d'évolution", "No trend data yet")}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-orange-100/20 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-stone-700">
              {t("Évolution des notes dans le temps", "Score trend over time")}
            </h3>
            <div className="space-y-3">
              {trend.map((point) => (
                <div key={point.id} className="flex items-center gap-4">
                  <div className="w-28 flex-shrink-0 text-xs text-stone-400">
                    {point.reviewDate
                      ? new Date(point.reviewDate).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", { month: "short", year: "numeric" })
                      : "—"}
                    {point.period && <span className="ml-1 text-stone-300">({point.period})</span>}
                  </div>
                  <div className="flex-1 h-6 rounded-lg bg-stone-100 overflow-hidden">
                    <div
                      className={`h-full rounded-lg ${scoreBg(point.globalScore)}`}
                      style={{ width: `${point.globalScore ?? 0}%` }}
                    />
                  </div>
                  <span className={`w-12 text-right text-sm font-bold ${scoreColor(point.globalScore)}`}>
                    {point.globalScore ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
