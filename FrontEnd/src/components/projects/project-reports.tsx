"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart2, Users, TrendingUp } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { Project, ResourceAllocation, STATUS_META } from "./types";
import { useLanguage } from "@/context/LanguageContext";

export default function ProjectReports() {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [viewMode, setViewMode] = useState<"projects" | "resources">("projects");

  const [projects, setProjects] = useState<Project[]>([]);
  const [resources, setResources] = useState<ResourceAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (viewMode === "projects") {
          const data = await apiClient.get<Project[]>(
            apiConfig.endpoints.projects.overviewReport(year, month)
          );
          setProjects(data);
        } else {
          const data = await apiClient.get<ResourceAllocation[]>(
            apiConfig.endpoints.projects.resourceAllocation(year, month)
          );
          setResources(data);
        }
      } catch {
        // show empty state
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [year, month, viewMode]);

  const MONTHS = [
    t("Janvier", "January"), t("Février", "February"), t("Mars", "March"),
    t("Avril", "April"), t("Mai", "May"), t("Juin", "June"),
    t("Juillet", "July"), t("Août", "August"), t("Septembre", "September"),
    t("Octobre", "October"), t("Novembre", "November"), t("Décembre", "December"),
  ];

  const maxHours = projects.reduce(
    (max, p) => Math.max(max, (p as any).periodHours ?? 0),
    0
  );

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-stone-200 bg-white overflow-hidden">
          <button
            onClick={() => setViewMode("projects")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              viewMode === "projects"
                ? "bg-orange-600 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <BarChart2 size={14} />
            {t("Par projet", "By project")}
          </button>
          <button
            onClick={() => setViewMode("resources")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              viewMode === "resources"
                ? "bg-orange-600 text-white"
                : "text-stone-600 hover:bg-stone-50"
            }`}
          >
            <Users size={14} />
            {t("Par ressource", "By resource")}
          </button>
        </div>

        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
        >
          {MONTHS.map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400"
        >
          {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-orange-500" />
        </div>
      ) : viewMode === "projects" ? (
        /* ── Projects View ── */
        <div className="space-y-3">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-orange-100/20 py-14 text-stone-400">
              <BarChart2 size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{t("Aucune donnée", "No data")}</p>
            </div>
          ) : (
            <>
              {/* Chart-like bar display */}
              <div className="rounded-xl border border-orange-100/20 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-semibold text-stone-700">
                  {t("Heures par projet", "Hours per project")} — {MONTHS[month - 1]} {year}
                </h3>
                <div className="space-y-3">
                  {projects
                    .filter((p) => (p as any).periodHours > 0)
                    .sort((a, b) => ((b as any).periodHours ?? 0) - ((a as any).periodHours ?? 0))
                    .map((p) => {
                      const ph = (p as any).periodHours ?? 0;
                      const pct = maxHours > 0 ? Math.round((ph / maxHours) * 100) : 0;
                      const meta = STATUS_META[p.status];
                      return (
                        <div key={p.id} className="flex items-center gap-3">
                          <div className="w-36 flex-shrink-0">
                            <p className="text-sm font-medium text-stone-700 truncate" title={p.name}>
                              {p.name ?? p.code}
                            </p>
                            <span className={`text-xs ${meta.badge} rounded-full px-1.5 py-0.5`}>
                              {language === "fr" ? meta.fr : meta.en}
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="h-6 rounded-md bg-stone-100 overflow-hidden">
                              <div
                                className="h-full rounded-md bg-orange-500 flex items-center pl-2 transition-all"
                                style={{ width: `${Math.max(pct, 3)}%` }}
                              >
                                <span className="text-xs font-medium text-white whitespace-nowrap">
                                  {ph}h
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="w-20 text-right text-xs text-stone-400">
                            {p.budgetHours
                              ? `/ ${Number(p.budgetHours)}h`
                              : ""}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Table */}
              <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-3 text-left">{t("Projet", "Project")}</th>
                      <th className="px-4 py-3 text-left">{t("Client", "Client")}</th>
                      <th className="px-4 py-3 text-left">{t("Statut", "Status")}</th>
                      <th className="px-4 py-3 text-right">{t("Membres", "Members")}</th>
                      <th className="px-4 py-3 text-right">{t("Heures (période)", "Hours (period)")}</th>
                      <th className="px-4 py-3 text-right">{t("Budget h.", "Budget h.")}</th>
                      <th className="px-4 py-3 text-right">{t("Utilisation", "Usage")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-50">
                    {projects.map((p) => {
                      const ph = (p as any).periodHours ?? 0;
                      const bh = p.budgetHours ? Number(p.budgetHours) : null;
                      const pct = bh ? Math.round((p.totalHoursLogged ?? 0) / bh * 100) : null;
                      const meta = STATUS_META[p.status];
                      return (
                        <tr key={p.id} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3">
                            <p className="font-medium text-stone-700">{p.name}</p>
                            {p.code && <p className="text-xs text-stone-400 font-mono">{p.code}</p>}
                          </td>
                          <td className="px-4 py-3 text-stone-500">{p.client ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                              {language === "fr" ? meta.fr : meta.en}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-stone-600">{(p as any).memberCount ?? p.assignments.length}</td>
                          <td className="px-4 py-3 text-right font-semibold text-stone-800">{ph}h</td>
                          <td className="px-4 py-3 text-right text-stone-500">{bh ? `${bh}h` : "—"}</td>
                          <td className="px-4 py-3 text-right">
                            {pct !== null ? (
                              <span className={pct > 100 ? "text-red-500 font-semibold" : "text-stone-600"}>
                                {pct}%
                              </span>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      ) : (
        /* ── Resource Allocation View ── */
        <div className="space-y-3">
          {resources.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-orange-100/20 py-14 text-stone-400">
              <Users size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{t("Aucune donnée", "No data")}</p>
            </div>
          ) : (
            resources
              .sort((a, b) => b.totalHours - a.totalHours)
              .map((user) => (
                <div
                  key={user.userId}
                  className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold">
                        {user.firstName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-stone-700">
                          {user.firstName} {user.lastName}
                        </p>
                        {user.department && (
                          <p className="text-xs text-stone-400">{user.department}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-stone-800">
                      <TrendingUp size={14} className="text-orange-500" />
                      {user.totalHours}h
                    </div>
                  </div>

                  {/* Project bars */}
                  <div className="space-y-2">
                    {user.projects
                      .sort((a, b) => b.hours - a.hours)
                      .map((proj) => (
                        <div key={proj.projectId} className="flex items-center gap-3">
                          <p className="w-36 text-xs text-stone-600 truncate" title={proj.projectName}>
                            {proj.projectName}
                          </p>
                          <div className="flex-1 h-4 rounded bg-stone-100 overflow-hidden">
                            <div
                              className="h-full rounded bg-orange-400"
                              style={{ width: `${proj.pct}%` }}
                            />
                          </div>
                          <div className="w-20 text-right text-xs text-stone-500">
                            {proj.hours}h ({proj.pct}%)
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
}
