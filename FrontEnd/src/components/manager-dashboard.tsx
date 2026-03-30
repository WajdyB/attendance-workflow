"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Users,
  Clock,
  FileCheck,
  FolderKanban,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  CalendarOff,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: { name: string };
}

interface PendingLeave {
  id: string;
  leaveType?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  workingDaysCount?: number;
  submitter?: { firstName: string; lastName: string };
}

interface PendingTimesheet {
  id: string;
  weekStartDate: string;
  totalHours: number;
  collaborator?: { user: { firstName: string; lastName: string } };
}

interface Project {
  id: string;
  name: string;
  status: string;
  endDate?: string;
}

interface ProjectTotal {
  projectId: string;
  projectName: string;
  totalHours: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ManagerDashboard() {
  const { databaseUser } = useAuth();
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const managerId = databaseUser?.id ?? "";

  const [team, setTeam] = useState<TeamMember[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [pendingTimesheets, setPendingTimesheets] = useState<PendingTimesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectHours, setProjectHours] = useState<ProjectTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const fetchAll = useCallback(async () => {
    if (!managerId) return;
    setLoading(true);
    try {
      const [teamRes, leavesRes, tsRes, projRes, hoursRes] = await Promise.allSettled([
        apiClient.get<any>(apiConfig.endpoints.users.getSupervisedCollaborators(managerId)),
        apiClient.get<PendingLeave[]>(apiConfig.endpoints.requests.pendingForManager(managerId)),
        apiClient.get<PendingTimesheet[]>(apiConfig.endpoints.timesheets.submittedForManager(managerId)),
        apiClient.get<Project[]>(apiConfig.endpoints.projects.byUser(managerId)),
        apiClient.get<ProjectTotal[]>(apiConfig.endpoints.timesheets.projectTotals(year, month)),
      ]);

      if (teamRes.status === "fulfilled") {
        const raw = teamRes.value;
        const members: TeamMember[] = raw?.collaborators ?? (Array.isArray(raw) ? raw : []);
        setTeam(members);
      }
      if (leavesRes.status === "fulfilled") setPendingLeaves(leavesRes.value ?? []);
      if (tsRes.status === "fulfilled") setTimesheets(tsRes.value ?? []);
      if (projRes.status === "fulfilled") {
        const raw = projRes.value;
        setProjects(Array.isArray(raw) ? raw : (raw as any)?.data ?? []);
      }
      if (hoursRes.status === "fulfilled") {
        const raw = hoursRes.value;
        setProjectHours(Array.isArray(raw) ? raw : (raw as any)?.data ?? []);
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  }, [managerId, year, month]);

  const setTimesheets = (v: PendingTimesheet[]) => setPendingTimesheets(v);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS");

  // Upcoming project deadlines (within 30 days)
  const upcomingDeadlines = activeProjects
    .filter((p) => p.endDate && new Date(p.endDate) <= new Date(Date.now() + 30 * 86400000))
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
    .slice(0, 3);

  // Project hours chart data (top 6)
  const chartData = projectHours
    .filter((p) => p.totalHours > 0)
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 6)
    .map((p) => ({
      name: p.projectName.length > 14 ? p.projectName.slice(0, 13) + "…" : p.projectName,
      hours: p.totalHours,
    }));

  const totalPendingActions = pendingLeaves.length + pendingTimesheets.length;

  const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short" }) : "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">
            {t("Bonjour", "Hello")},{" "}
            <span style={{ color: "var(--accent)" }}>{databaseUser?.firstName ?? t("Manager", "Manager")}</span> 👋
          </h1>
          <p className="page-subtitle">
            {t(
              "Voici un aperçu de votre équipe et des actions en attente",
              "Here's an overview of your team and pending actions"
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button onClick={fetchAll} className="btn-ghost" disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {t("Rafraîchir", "Refresh")}
          </button>
          <p className="text-xs" style={{ color: "var(--text-3)" }}>
            {t("Mis à jour", "Updated")}{" "}
            {lastRefresh.toLocaleTimeString(language === "fr" ? "fr-FR" : "en-GB", { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
      </div>

      {/* Pending actions alert */}
      {!loading && totalPendingActions > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl px-5 py-4"
          style={{
            background: "color-mix(in srgb, var(--accent) 10%, transparent)",
            border: "1px solid color-mix(in srgb, var(--accent) 30%, transparent)",
          }}
        >
          <AlertTriangle size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            {totalPendingActions}{" "}
            {t(
              "action(s) en attente de votre validation",
              "action(s) awaiting your approval"
            )}
          </p>
          <Link href="/approvals" className="ml-auto flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
            {t("Voir", "View")} <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <Users size={15} style={{ color: "var(--accent)" }} />
            <p className="stat-label">{t("Équipe", "Team")}</p>
          </div>
          <p className="stat-value">{loading ? "—" : team.length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            {t("collaborateurs", "collaborators")}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <CalendarOff size={15} style={{ color: "#f59e0b" }} />
            <p className="stat-label">{t("Congés en attente", "Leaves pending")}</p>
          </div>
          <p className="stat-value" style={pendingLeaves.length > 0 ? { color: "#f59e0b" } : undefined}>
            {loading ? "—" : pendingLeaves.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            {t("à approuver", "to approve")}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <FileCheck size={15} style={{ color: "#6366f1" }} />
            <p className="stat-label">{t("Timesheets", "Timesheets")}</p>
          </div>
          <p className="stat-value" style={pendingTimesheets.length > 0 ? { color: "#6366f1" } : undefined}>
            {loading ? "—" : pendingTimesheets.length}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            {t("à valider", "to validate")}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2 mb-1">
            <FolderKanban size={15} style={{ color: "#22c55e" }} />
            <p className="stat-label">{t("Projets actifs", "Active projects")}</p>
          </div>
          <p className="stat-value">{loading ? "—" : activeProjects.length}</p>
          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
            {t("en cours", "in progress")}
          </p>
        </div>
      </div>

      {/* Mid row: chart + deadlines */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Hours by project chart */}
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              {t("Heures par projet ce mois", "Hours by project this month")}
            </h3>
            <span className="text-xs" style={{ color: "var(--text-3)" }}>
              {new Date().toLocaleString(language === "fr" ? "fr-FR" : "en-GB", { month: "long", year: "numeric" })}
            </span>
          </div>
          {loading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-40 items-center justify-center">
              <p className="text-sm" style={{ color: "var(--text-3)" }}>
                {t("Aucune donnée ce mois", "No data this month")}
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <XAxis type="number" tick={{ fontSize: 11, fill: "var(--text-3)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 11, fill: "var(--text-2)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v: number) => [`${v}h`, t("Heures", "Hours")]}
                  contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: "var(--text-1)", fontWeight: 600 }}
                />
                <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "var(--accent)" : `color-mix(in srgb, var(--accent) ${80 - i * 10}%, var(--surface))`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Upcoming deadlines */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ color: "var(--text-1)" }}>
            {t("Échéances proches", "Upcoming deadlines")}
          </h3>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : upcomingDeadlines.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 gap-2">
              <CheckCircle size={24} style={{ color: "var(--text-3)" }} className="opacity-40" />
              <p className="text-xs text-center" style={{ color: "var(--text-3)" }}>
                {t("Aucune échéance dans les 30 jours", "No deadlines in the next 30 days")}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlines.map((p) => {
                const daysLeft = Math.ceil((new Date(p.endDate!).getTime() - Date.now()) / 86400000);
                return (
                  <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5" style={{ background: "var(--bg)" }}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>{p.name}</p>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{fmtDate(p.endDate)}</p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-semibold flex-shrink-0"
                      style={{
                        background: daysLeft <= 7 ? "color-mix(in srgb, #ef4444 15%, transparent)" : "color-mix(in srgb, #f59e0b 15%, transparent)",
                        color: daysLeft <= 7 ? "#ef4444" : "#f59e0b",
                      }}
                    >
                      {daysLeft}j
                    </span>
                  </div>
                );
              })}
              <Link href="/projects" className="flex items-center gap-1 text-xs pt-1" style={{ color: "var(--accent)" }}>
                {t("Tous les projets", "All projects")} <ArrowRight size={11} />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Bottom row: pending queues */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pending leaves */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <Clock size={15} style={{ color: "#f59e0b" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                {t("Congés en attente", "Pending leaves")}
              </h3>
            </div>
            {pendingLeaves.length > 0 && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "color-mix(in srgb, #f59e0b 15%, transparent)", color: "#f59e0b" }}>
                {pendingLeaves.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : pendingLeaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle size={28} style={{ color: "var(--text-3)" }} className="opacity-30" />
              <p className="text-xs" style={{ color: "var(--text-3)" }}>{t("Tout est à jour", "All clear")}</p>
            </div>
          ) : (
            <>
              <div>
                {pendingLeaves.slice(0, 4).map((req, idx) => (
                  <div key={req.id} className="flex items-center justify-between px-5 py-3 gap-3" style={{ borderBottom: idx < Math.min(pendingLeaves.length, 4) - 1 ? "1px solid var(--border)" : undefined }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                        {req.submitter?.firstName?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
                          {req.submitter?.firstName} {req.submitter?.lastName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>
                          {fmtDate(req.leaveStartDate)} → {fmtDate(req.leaveEndDate)}
                          {req.workingDaysCount ? ` · ${req.workingDaysCount}j` : ""}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                <Link href="/approvals" className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                  {t("Gérer tous les congés", "Manage all leaves")} <ArrowRight size={12} />
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Pending timesheets */}
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2">
              <FileCheck size={15} style={{ color: "#6366f1" }} />
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                {t("Feuilles de temps en attente", "Pending timesheets")}
              </h3>
            </div>
            {pendingTimesheets.length > 0 && (
              <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold" style={{ background: "color-mix(in srgb, #6366f1 15%, transparent)", color: "#6366f1" }}>
                {pendingTimesheets.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
            </div>
          ) : pendingTimesheets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <CheckCircle size={28} style={{ color: "var(--text-3)" }} className="opacity-30" />
              <p className="text-xs" style={{ color: "var(--text-3)" }}>{t("Tout est à jour", "All clear")}</p>
            </div>
          ) : (
            <>
              <div>
                {pendingTimesheets.slice(0, 4).map((ts, idx) => (
                  <div key={ts.id} className="flex items-center justify-between px-5 py-3 gap-3" style={{ borderBottom: idx < Math.min(pendingTimesheets.length, 4) - 1 ? "1px solid var(--border)" : undefined }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold flex-shrink-0" style={{ background: "color-mix(in srgb, #6366f1 15%, transparent)", color: "#6366f1" }}>
                        {ts.collaborator?.user.firstName?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
                          {ts.collaborator?.user.firstName} {ts.collaborator?.user.lastName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>
                          {t("Semaine du", "Week of")} {fmtDate(ts.weekStartDate)} · {ts.totalHours}h
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3" style={{ borderTop: "1px solid var(--border)" }}>
                <Link href="/approvals?tab=timesheets" className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
                  {t("Valider les feuilles", "Validate timesheets")} <ArrowRight size={12} />
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Team members */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Users size={15} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              {t("Mon équipe", "My team")} {!loading && `(${team.length})`}
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : team.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Users size={28} style={{ color: "var(--text-3)" }} className="opacity-30" />
            <p className="text-xs" style={{ color: "var(--text-3)" }}>
              {t("Aucun collaborateur assigné", "No collaborators assigned")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
            {team.map((m) => (
              <div key={m.id} className="flex items-center gap-2.5 rounded-xl px-3 py-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}>
                  {m.firstName?.[0]?.toUpperCase()}{m.lastName?.[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {m.firstName} {m.lastName}
                  </p>
                  <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                    {m.jobTitle ?? m.department?.name ?? "—"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
