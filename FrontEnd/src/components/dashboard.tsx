"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, FileText, FolderKanban, ClipboardList, Loader2, TrendingUp, CheckCircle, XCircle, Send, Save, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";

type DashboardRole = "admin" | "manager" | "collaborator";

interface StatCard {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}

interface ActivityItem {
  title: string;
  description: string;
  time: string;
}

interface ProjectItem {
  id: string;
  status: string;
}

interface TimesheetItem {
  id: string;
  status: string;
  totalHours?: number;
  weekStartDate?: string;
}

interface RequestItem {
  id: string;
  status: string;
  leaveType?: string;
  leaveStartDate?: string;
  leaveEndDate?: string;
  createdAt?: string;
}

interface WeeklyReport {
  totalHours: number;
  status: string;
}

const TS_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:     { label: "Brouillon",  color: "#94a3b8" },
  SUBMITTED: { label: "Soumise",    color: "#60a5fa" },
  APPROVED:  { label: "Approuvée",  color: "#4ade80" },
  REJECTED:  { label: "Rejetée",    color: "#f87171" },
};

const REQ_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT:    { label: "Brouillon",  color: "#94a3b8" },
  PENDING:  { label: "En attente", color: "#60a5fa" },
  APPROVED: { label: "Approuvée",  color: "#4ade80" },
  REJECTED: { label: "Rejetée",    color: "#f87171" },
  CANCELLED:{ label: "Annulée",    color: "#6b7280" },
};

const LEAVE_LABELS: Record<string, string> = {
  PTO: "Congé payé", SICK: "Maladie", MATERNITY: "Maternité",
  PATERNITY: "Paternité", UNPAID: "Sans solde", OTHER: "Autre",
};

export default function Dashboard() {
  const { databaseUser } = useAuth();
  const { t } = useLanguage();

  const [stats, setStats] = useState<StatCard[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentTimesheets, setRecentTimesheets] = useState<TimesheetItem[]>([]);
  const [recentRequests, setRecentRequests] = useState<RequestItem[]>([]);

  const getUserName = () => {
    if (databaseUser?.firstName && databaseUser?.lastName) {
      return `${databaseUser.firstName} ${databaseUser.lastName}`;
    }
    return t("dashboard.user");
  };

  const getRole = useCallback((): DashboardRole => {
    const normalizedRole = databaseUser?.role?.description?.toLowerCase().trim() || "";
    if (normalizedRole.includes("admin")) return "admin";
    if (normalizedRole.includes("manager")) return "manager";
    return "collaborator";
  }, [databaseUser?.role?.description]);

  const role = getRole();

  const getRoleSubtitle = () => {
    if (role === "admin") return t("dashboard.role.admin");
    if (role === "manager") return t("dashboard.role.manager");
    return t("dashboard.role.collaborator");
  };

  const getMondayISO = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split("T")[0];
  };

  useEffect(() => {
    if (!databaseUser?.id) return;

    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        if (role === "admin") {
          const [usersResult, projectsResult] = await Promise.allSettled([
            apiClient.get<unknown[]>(apiConfig.endpoints.users.all),
            apiClient.get<ProjectItem[]>(apiConfig.endpoints.timesheets.projects),
          ]);

          const totalEmployees =
            usersResult.status === "fulfilled" ? String(usersResult.value.length) : "—";
          const activeProjects =
            projectsResult.status === "fulfilled"
              ? String(projectsResult.value.filter((p) => p.status === "IN_PROGRESS").length)
              : "—";

          setStats([
            { label: t("dashboard.stat.totalEmployees"), value: totalEmployees, icon: <ClipboardList size={16} /> },
            { label: t("dashboard.stat.activeProjects"), value: activeProjects, icon: <FolderKanban size={16} /> },
            { label: t("dashboard.stat.pendingRequests"), value: "—", icon: <FileText size={16} /> },
            { label: t("dashboard.stat.timesheetsSubmitted"), value: "—", icon: <Clock size={16} /> },
          ]);
        } else if (role === "manager") {
          const [teamResult, pendingResult, projectsResult] = await Promise.allSettled([
            apiClient.get<unknown[]>(
              apiConfig.endpoints.users.getSupervisedCollaborators(databaseUser.id)
            ),
            apiClient.get<unknown[]>(
              apiConfig.endpoints.timesheets.submittedForManager(databaseUser.id)
            ),
            apiClient.get<ProjectItem[]>(apiConfig.endpoints.timesheets.projects),
          ]);

          const supervisedRaw = teamResult.status === "fulfilled" ? teamResult.value : null;
          const teamMembers = supervisedRaw
            ? String((supervisedRaw as any).collaborators?.length ?? (Array.isArray(supervisedRaw) ? supervisedRaw.length : 0))
            : "—";
          const toApprove = pendingResult.status === "fulfilled" ? String(pendingResult.value.length) : "—";
          const activeProjects =
            projectsResult.status === "fulfilled"
              ? String(projectsResult.value.filter((p) => p.status === "IN_PROGRESS").length)
              : "—";

          setStats([
            { label: t("dashboard.stat.teamMembers"), value: teamMembers, icon: <ClipboardList size={16} /> },
            { label: t("dashboard.stat.toApprove"), value: toApprove, icon: <FileText size={16} /> },
            { label: t("dashboard.stat.teamHoursWeek"), value: "—", icon: <Clock size={16} /> },
            { label: t("dashboard.stat.activeProjects"), value: activeProjects, icon: <FolderKanban size={16} /> },
          ]);
        } else {
          const weekStart = getMondayISO();
          const [timesheetsResult, weeklyReport, projectsResult, requestsResult] = await Promise.allSettled([
            apiClient.get<TimesheetItem[]>(apiConfig.endpoints.timesheets.byUser(databaseUser.id)),
            apiClient.get<WeeklyReport>(
              apiConfig.endpoints.timesheets.weeklyReport(databaseUser.id, weekStart),
              { silent: true }
            ).catch(() => null),
            apiClient.get<ProjectItem[]>(apiConfig.endpoints.timesheets.projects),
            apiClient.get<RequestItem[]>(apiConfig.endpoints.requests.byUser(databaseUser.id)),
          ]);

          const timesheets = timesheetsResult.status === "fulfilled" ? (timesheetsResult.value ?? []) : [];
          const sortedTs = [...timesheets].sort(
            (a, b) => new Date((b as any).weekStartDate ?? 0).getTime() - new Date((a as any).weekStartDate ?? 0).getTime()
          );
          const latestTimesheet = sortedTs[0];
          const latestStatus = latestTimesheet?.status ?? "—";

          const weekly = weeklyReport.status === "fulfilled" ? weeklyReport.value : null;
          const weeklyHours = weekly ? `${Number(weekly.totalHours).toFixed(0)}h` : "0h";

          const activeProjects =
            projectsResult.status === "fulfilled"
              ? String(projectsResult.value.filter((p) => p.status === "IN_PROGRESS").length)
              : "—";

          const allRequests = requestsResult.status === "fulfilled" ? (requestsResult.value ?? []) : [];
          const pendingRequests = String(allRequests.filter((r) => r.status === "PENDING").length);

          // Store recent items for activity feed
          setRecentTimesheets(sortedTs.slice(0, 4));
          setRecentRequests(
            [...allRequests]
              .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
              .slice(0, 4)
          );

          setStats([
            { label: t("dashboard.stat.weeklyHours"), value: weeklyHours, icon: <Clock size={16} />, color: "#f97316" },
            { label: t("dashboard.stat.timesheetStatus"), value: latestStatus !== "—" ? (TS_STATUS[latestStatus]?.label ?? latestStatus) : "—", icon: <FileText size={16} />, color: TS_STATUS[latestStatus]?.color },
            { label: t("dashboard.stat.pendingRequests"), value: pendingRequests, icon: <ClipboardList size={16} />, color: Number(pendingRequests) > 0 ? "#60a5fa" : "#4ade80" },
            { label: t("dashboard.stat.activeProjects"), value: activeProjects, icon: <FolderKanban size={16} />, color: "#a855f7" },
          ]);
        }
      } catch (error) {
        console.error("Failed to load dashboard stats:", error);
      } finally {
        setStatsLoading(false);
      }
    };

    fetchStats();
  }, [databaseUser?.id, role, t]);

  const getActivities = (): ActivityItem[] => {
    if (role === "admin") {
      return [
        { title: t("dashboard.activity.admin.title1"), description: t("dashboard.activity.admin.description1"), time: t("dashboard.activity.time2h") },
        { title: t("dashboard.activity.admin.title2"), description: t("dashboard.activity.admin.description2"), time: t("dashboard.activity.time5h") },
      ];
    }
    if (role === "manager") {
      return [
        { title: t("dashboard.activity.manager.title1"), description: t("dashboard.activity.manager.description1"), time: t("dashboard.activity.time1h") },
        { title: t("dashboard.activity.manager.title2"), description: t("dashboard.activity.manager.description2"), time: t("dashboard.activity.time4h") },
      ];
    }
    return [
      { title: t("dashboard.activity.collaborator.title1"), description: t("dashboard.activity.collaborator.description1"), time: t("dashboard.activity.time2h") },
      { title: t("dashboard.activity.collaborator.title2"), description: t("dashboard.activity.collaborator.description2"), time: t("dashboard.activity.time5h") },
    ];
  };

  const getFocusItems = () => {
    if (role === "admin") {
      return [
        { name: t("dashboard.focus.admin.item1"), progress: 85 },
        { name: t("dashboard.focus.admin.item2"), progress: 60 },
        { name: t("dashboard.focus.admin.item3"), progress: 40 },
      ];
    }
    if (role === "manager") {
      return [
        { name: t("dashboard.focus.manager.item1"), progress: 75 },
        { name: t("dashboard.focus.manager.item2"), progress: 50 },
        { name: t("dashboard.focus.manager.item3"), progress: 30 },
      ];
    }
    return [
      { name: t("dashboard.focus.collaborator.item1"), progress: 75 },
      { name: t("dashboard.focus.collaborator.item2"), progress: 40 },
      { name: t("dashboard.focus.collaborator.item3"), progress: 90 },
    ];
  };

  const activities = getActivities();
  const focusItems = getFocusItems();
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">

      {/* Welcome banner */}
      <div
        className="rounded-2xl p-6 flex items-center justify-between"
        style={{
          background: "linear-gradient(135deg, var(--surface-raised) 0%, var(--surface) 100%)",
          border: "1px solid var(--border-strong)",
        }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
            {today}
          </p>
          <h1 className="text-xl font-semibold" style={{ color: "var(--text-1)" }}>
            {t("dashboard.welcomeBack")}, {getUserName()} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--text-3)" }}>
            {getRoleSubtitle()} · {t("dashboard.todayOverview")}
          </p>
        </div>
        <div
          className="hidden md:flex items-center justify-center w-16 h-16 rounded-2xl"
          style={{ background: "var(--accent-dim)" }}
        >
          <TrendingUp size={28} style={{ color: "var(--accent)" }} />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="stat-card flex items-center justify-center" style={{ minHeight: 108 }}>
                <Loader2 size={18} className="animate-spin" style={{ color: "var(--accent)" }} />
              </div>
            ))
          : stats.map((item) => (
              <div key={item.label} className="stat-card">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-xl mb-3"
                  style={{ background: item.color ? `${item.color}20` : "var(--accent-dim)", color: item.color ?? "var(--accent)" }}
                >
                  {item.icon}
                </div>
                <p className="stat-label">{item.label}</p>
                <p className="stat-value" style={{ color: item.color ?? "var(--text-1)" }}>{item.value}</p>
              </div>
            ))}
      </div>

      {/* Bottom section */}
      <div className="grid md:grid-cols-3 gap-6">

        {/* Recent activity — real data for collaborators, translated for others */}
        <div className="md:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              {t("dashboard.recentActivity")}
            </h3>
          </div>

          {role === "collaborator" && !statsLoading ? (
            <div className="space-y-0 divide-y" style={{ borderColor: "var(--border)" }}>
              {/* Recent timesheets */}
              {recentTimesheets.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest pb-2" style={{ color: "var(--text-3)" }}>
                    Feuilles de temps
                  </p>
                  {recentTimesheets.map((ts) => {
                    const cfg = TS_STATUS[ts.status] ?? { label: ts.status, color: "var(--text-3)" };
                    const weekLabel = ts.weekStartDate
                      ? new Date(ts.weekStartDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                      : "—";
                    return (
                      <div key={ts.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                              Semaine du {weekLabel}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-3)" }}>
                              {ts.totalHours != null ? `${Number(ts.totalHours).toFixed(1)}h` : "—"}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              {/* Recent leave requests */}
              {recentRequests.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold uppercase tracking-widest pt-4 pb-2" style={{ color: "var(--text-3)" }}>
                    Demandes de congé
                  </p>
                  {recentRequests.map((req) => {
                    const cfg = REQ_STATUS[req.status] ?? { label: req.status, color: "var(--text-3)" };
                    const dateLabel = req.leaveStartDate
                      ? new Date(req.leaveStartDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
                      : "—";
                    return (
                      <div key={req.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.color }} />
                          <div>
                            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                              {LEAVE_LABELS[req.leaveType ?? ""] ?? req.leaveType ?? "Congé"}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-3)" }}>À partir du {dateLabel}</p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: `${cfg.color}20`, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </>
              )}

              {recentTimesheets.length === 0 && recentRequests.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--text-3)" }}>Aucune activité récente</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Soumettez votre première feuille de temps ou demande de congé</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.title} className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <div
                      className="mt-0.5 flex-shrink-0 w-1.5 h-1.5 rounded-full"
                      style={{ background: "var(--accent)", marginTop: 6 }}
                    />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                        {activity.title}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                        {activity.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs flex-shrink-0" style={{ color: "var(--text-3)" }}>
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Focus / Progress */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold mb-5" style={{ color: "var(--text-1)" }}>
            {t("dashboard.focusTitle")}
          </h3>

          <div className="space-y-5">
            {focusItems.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-medium" style={{ color: "var(--text-2)" }}>
                    {item.name}
                  </p>
                  <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                    {item.progress}%
                  </span>
                </div>
                <div
                  className="h-1.5 w-full rounded-full overflow-hidden"
                  style={{ background: "var(--surface-raised)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.progress}%`, background: "var(--accent)" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
