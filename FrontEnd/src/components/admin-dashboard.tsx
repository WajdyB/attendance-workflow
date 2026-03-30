"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users, FolderKanban, FileText, Clock, Star, TrendingUp,
  TrendingDown, RefreshCw, AlertCircle, CheckCircle, XCircle,
  Loader2, Calendar, Building2, ArrowUpRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  role?: { description: string } | null;
  department?: { id: string; name: string } | null;
  createdAt?: string;
}

interface Project {
  id: string;
  name: string;
  status: "IN_PROGRESS" | "FINISHED" | "SUSPENDED";
  budgetHours?: number;
  endDate?: string;
  lead?: { firstName: string; lastName: string };
}

interface LeaveRequest {
  id: string;
  leaveType?: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  leaveStartDate?: string;
  leaveEndDate?: string;
  createdAt: string;
  workingDaysCount?: number;
  submitter?: { firstName: string; lastName: string; department?: { name: string } };
}

interface Evaluation {
  id: string;
  globalScore?: number | null;
  evaluationDate: string;
  evaluationType: string;
  collaborator: { user: { firstName: string; lastName: string; department?: { name: string } | null } };
}

interface DeptStat {
  departmentName: string;
  departmentId?: string;
  avgScore: number | null;
  count: number;
}

interface ProjectTotal {
  projectId: string;
  projectName: string;
  totalHours: number;
}

interface Snapshot {
  employees: UserRow[];
  projects: Project[];
  requests: LeaveRequest[];
  evaluations: Evaluation[];
  deptStats: DeptStat[];
  projectTotals: ProjectTotal[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACCENT = "#f97316";
const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#ef4444", "#06b6d4"];

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:   { label: "En attente",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)"  },
  APPROVED:  { label: "Approuvée",   color: "#4ade80", bg: "rgba(74,222,128,0.12)"  },
  REJECTED:  { label: "Rejetée",     color: "#f87171", bg: "rgba(248,113,113,0.12)" },
  CANCELLED: { label: "Annulée",     color: "#94a3b8", bg: "rgba(148,163,184,0.1)"  },
  DRAFT:     { label: "Brouillon",   color: "#94a3b8", bg: "rgba(148,163,184,0.1)"  },
};

const PROJ_STATUS_META: Record<string, { label: string; color: string }> = {
  IN_PROGRESS: { label: "En cours",  color: "#f97316" },
  FINISHED:    { label: "Terminé",   color: "#22c55e" },
  SUSPENDED:   { label: "Suspendu",  color: "#f87171" },
};

const FR_MONTHS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

function pct(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

/** Group requests by month for the area chart */
function buildMonthlyRequestTrend(requests: LeaveRequest[]) {
  const year = new Date().getFullYear();
  const byMonth: Record<number, { approved: number; rejected: number; pending: number }> = {};
  for (let m = 1; m <= 12; m++) byMonth[m] = { approved: 0, rejected: 0, pending: 0 };

  requests.forEach((r) => {
    // Use leaveStartDate if available, fall back to createdAt for requests without dates
    const dateStr = r.leaveStartDate ?? r.createdAt;
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime()) || d.getFullYear() !== year) return;
    const m = d.getMonth() + 1;
    if (r.status === "APPROVED") byMonth[m].approved++;
    else if (r.status === "REJECTED") byMonth[m].rejected++;
    else if (r.status === "PENDING") byMonth[m].pending++;
  });

  return Object.entries(byMonth).map(([m, v]) => ({
    month: FR_MONTHS[Number(m) - 1],
    ...v,
  }));
}

/** Group users by department */
function buildDeptHeadcount(users: UserRow[]) {
  const map: Record<string, number> = {};
  users.forEach((u) => {
    const name = u.department?.name ?? "N/A";
    map[name] = (map[name] ?? 0) + 1;
  });
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .map(([dept, count]) => ({ dept, count }));
}

// ─── Tooltip Styles ───────────────────────────────────────────────────────────

const TooltipBox = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface-overlay)", border: "1px solid var(--border-strong)", borderRadius: 12, padding: "10px 14px", fontSize: 12 }}>
      {label && <p style={{ color: "var(--text-2)", marginBottom: 6 }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? "var(--text-1)", margin: "2px 0" }}>
          <span style={{ fontWeight: 600 }}>{p.value}</span> {p.name}
        </p>
      ))}
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label, value, icon, trend, trendLabel, color = ACCENT,
}: {
  label: string; value: string | number; icon: React.ReactNode;
  trend?: number; trendLabel?: string; color?: string;
}) {
  return (
    <div className="stat-card flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: `${color}1a`, color }}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <span
            className="flex items-center gap-0.5 text-xs font-medium"
            style={{ color: trend >= 0 ? "var(--success)" : "var(--danger)" }}
          >
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
        {trendLabel && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{trendLabel}</p>}
      </div>
    </div>
  );
}

function ScoreKpiCard({ avgScore, evalCount }: { avgScore: string | number; evalCount: number }) {
  const hasScore = avgScore !== "—" && avgScore !== null;
  const numericScore = hasScore ? Number(avgScore) : 0;
  const pct = Math.round((numericScore / 5) * 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="stat-card flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: "#a855f71a", color: "#a855f7" }}
        >
          <Star size={16} />
        </div>
        {hasScore && (
          <div
            className="h-1.5 w-12 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
          </div>
        )}
      </div>
      <div>
        <p className="stat-label">Performance moy.</p>
        <p className="stat-value">{hasScore ? `${pct}%` : "—"}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
          {hasScore ? `${evalCount} éval.` : "Aucune évaluation"}
        </p>
      </div>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{title}</h3>
      {subtitle && <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>{subtitle}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        usersRes, projectsRes, requestsRes,
        evalsRes, deptStatsRes, projectTotalsRes,
      ] = await Promise.allSettled([
        apiClient.get<UserRow[]>(apiConfig.endpoints.users.all),
        apiClient.get<Project[]>(apiConfig.endpoints.projects.all()),
        apiClient.get<LeaveRequest[]>(apiConfig.endpoints.requests.allForAdmin),
        apiClient.get<Evaluation[]>(apiConfig.endpoints.evaluations.all()),
        apiClient.get<DeptStat[]>(apiConfig.endpoints.evaluations.departmentStats(year)),
        apiClient.get<ProjectTotal[]>(apiConfig.endpoints.timesheets.projectTotals(year, month)),
      ]);

      setSnapshot({
        employees:     usersRes.status === "fulfilled" ? usersRes.value : [],
        projects:      projectsRes.status === "fulfilled" ? projectsRes.value : [],
        requests:      requestsRes.status === "fulfilled" ? requestsRes.value : [],
        evaluations:   evalsRes.status === "fulfilled" ? evalsRes.value : [],
        deptStats:     deptStatsRes.status === "fulfilled" ? deptStatsRes.value : [],
        projectTotals: projectTotalsRes.status === "fulfilled" ? projectTotalsRes.value : [],
      });
      setLastRefresh(new Date());
    } catch (e) {
      console.error("Admin dashboard load error", e);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  if (loading && !snapshot) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin" style={{ color: ACCENT }} />
      </div>
    );
  }

  const s = snapshot!;

  // ── Derived KPIs ──────────────────────────────────────────────────────────

  const totalEmployees = s.employees.length;
  const activeProjects = s.projects.filter((p) => p.status === "IN_PROGRESS").length;
  const pendingRequests = s.requests.filter((r) => r.status === "PENDING").length;
  const approvedRequests = s.requests.filter((r) => r.status === "APPROVED").length;
  const rejectedRequests = s.requests.filter((r) => r.status === "REJECTED").length;
  const totalRequests = s.requests.length;

  const scoredEvals = s.evaluations.filter((e) => e.globalScore != null);
  const avgScore =
    scoredEvals.length > 0
      ? (scoredEvals.reduce((sum, e) => sum + Number(e.globalScore ?? 0), 0) / scoredEvals.length).toFixed(1)
      : "—";

  const totalHoursThisMonth = s.projectTotals.reduce((sum, pt) => sum + (pt.totalHours ?? 0), 0);

  // ── Chart Data ────────────────────────────────────────────────────────────

  const monthlyRequestData = buildMonthlyRequestTrend(s.requests);

  const projectStatusData = [
    { name: "En cours",  value: s.projects.filter((p) => p.status === "IN_PROGRESS").length, color: "#f97316" },
    { name: "Terminé",   value: s.projects.filter((p) => p.status === "FINISHED").length,    color: "#22c55e" },
    { name: "Suspendu",  value: s.projects.filter((p) => p.status === "SUSPENDED").length,   color: "#f87171" },
  ].filter((d) => d.value > 0);

  const deptHeadcount = buildDeptHeadcount(s.employees);

  const hoursChartData = s.projectTotals
    .sort((a, b) => b.totalHours - a.totalHours)
    .slice(0, 8)
    .map((pt) => ({ name: pt.projectName.length > 18 ? pt.projectName.slice(0, 16) + "…" : pt.projectName, hours: pt.totalHours }));

  const deptPerfData = s.deptStats
    .filter((d) => d.avgScore != null && Number(d.avgScore) > 0)
    .sort((a, b) => Number(b.avgScore ?? 0) - Number(a.avgScore ?? 0))
    .slice(0, 6)
    .map((d) => ({
      dept: (d.departmentName ?? "").length > 12 ? (d.departmentName ?? "").slice(0, 10) + "…" : (d.departmentName ?? "N/A"),
      score: Number(Number(d.avgScore ?? 0).toFixed(1)),
      count: d.count,
    }));

  const leaveTypeData = (() => {
    const map: Record<string, number> = {};
    s.requests.filter((r) => r.status === "APPROVED").forEach((r) => {
      map[r.leaveType] = (map[r.leaveType] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] }));
  })();

  // ── Recent items ──────────────────────────────────────────────────────────

  const recentRequests = [...s.requests]
    .sort((a, b) => new Date(b.leaveStartDate ?? b.createdAt).getTime() - new Date(a.leaveStartDate ?? a.createdAt).getTime())
    .slice(0, 6);

  const recentEvals = [...s.evaluations]
    .sort((a, b) => new Date(b.evaluationDate).getTime() - new Date(a.evaluationDate).getTime())
    .slice(0, 5);

  const upcomingProjects = s.projects
    .filter((p) => p.status === "IN_PROGRESS" && p.endDate)
    .sort((a, b) => new Date(a.endDate!).getTime() - new Date(b.endDate!).getTime())
    .slice(0, 5);

  const cardStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: 20,
  };

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Tableau de bord</h1>
          <p className="page-subtitle">
            Vue d'ensemble · {now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--text-3)" }}>
            Mis à jour {lastRefresh.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <button
            onClick={load}
            disabled={loading}
            className="btn-ghost"
            style={{ padding: "6px 12px" }}
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Rafraîchir
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KpiCard label="Employés" value={totalEmployees} icon={<Users size={16} />} color="#f97316" />
        <KpiCard label="Projets actifs" value={activeProjects} icon={<FolderKanban size={16} />} color="#3b82f6" />
        <KpiCard label="Congés en attente" value={pendingRequests} icon={<FileText size={16} />} color="#eab308" />
        <KpiCard label="Congés approuvés" value={approvedRequests} icon={<CheckCircle size={16} />} color="#22c55e" />
        <ScoreKpiCard avgScore={avgScore} evalCount={scoredEvals.length} />
        <KpiCard label={`Heures ${FR_MONTHS[month - 1]}`} value={`${totalHoursThisMonth}h`} icon={<Clock size={16} />} color="#06b6d4" />
      </div>

      {/* ── Request trend + Project status ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Area chart - monthly leave trends */}
        <div style={cardStyle} className="lg:col-span-2">
          <SectionHeader
            title="Tendance des congés"
            subtitle={`Demandes par mois — ${year}`}
          />
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={monthlyRequestData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#eab308" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gRejected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipBox />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: "var(--text-3)" }} />
              <Area type="monotone" dataKey="approved" name="Approuvées" stroke="#22c55e" fill="url(#gApproved)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="pending"  name="En attente" stroke="#eab308" fill="url(#gPending)"  strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="rejected" name="Rejetées"   stroke="#ef4444" fill="url(#gRejected)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie chart - project status */}
        <div style={cardStyle}>
          <SectionHeader title="Statut des projets" subtitle={`${s.projects.length} projets total`} />
          {projectStatusData.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 0" }}><p className="text-xs">Aucun projet</p></div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={projectStatusData}
                    cx="50%" cy="50%"
                    innerRadius={48} outerRadius={72}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {projectStatusData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {projectStatusData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                      <span style={{ color: "var(--text-2)" }}>{d.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: "var(--text-1)" }}>
                      {d.value} <span style={{ color: "var(--text-3)" }}>({pct(d.value, s.projects.length)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Hours by project + Dept headcount ───────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Horizontal bar - hours by project */}
        <div style={cardStyle}>
          <SectionHeader
            title="Heures par projet"
            subtitle={`${FR_MONTHS[month - 1]} ${year} — Top 8 projets`}
          />
          {hoursChartData.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 0" }}><p className="text-xs">Aucune donnée</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hoursChartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-2)", fontSize: 11 }} width={110} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} />
                <Bar dataKey="hours" name="heures" fill={ACCENT} radius={[0, 6, 6, 0]} maxBarSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar chart - headcount by department */}
        <div style={cardStyle}>
          <SectionHeader
            title="Effectif par département"
            subtitle={`${totalEmployees} employés au total`}
          />
          {deptHeadcount.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 0" }}><p className="text-xs">Aucune donnée</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptHeadcount} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dept" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipBox />} />
                <Bar dataKey="count" name="employés" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {deptHeadcount.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Dept performance + Leave types ──────────────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Bar chart - department performance scores */}
        <div style={cardStyle}>
          <SectionHeader
            title="Score de performance par département"
            subtitle={`Évaluations ${year} — note /5`}
          />
          {deptPerfData.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 0" }}><p className="text-xs">Aucune évaluation</p></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptPerfData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dept" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<TooltipBox />} />
                <Bar dataKey="score" name="score" radius={[6, 6, 0, 0]} maxBarSize={40}>
                  {deptPerfData.map((d, i) => (
                    <Cell key={i} fill={d.score >= 75 ? "#22c55e" : d.score >= 50 ? "#eab308" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Score legend */}
          <div className="flex gap-4 mt-3">
            {[{ color: "#22c55e", label: "≥ 75 Excellent" }, { color: "#eab308", label: "50–74 Moyen" }, { color: "#ef4444", label: "< 50 Faible" }].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-3)" }}>
                <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>

        {/* Pie chart - leave types (approved only) */}
        <div style={cardStyle}>
          <SectionHeader
            title="Types de congés approuvés"
            subtitle={`${approvedRequests} congés approuvés au total`}
          />
          {leaveTypeData.length === 0 ? (
            <div className="empty-state" style={{ padding: "40px 0" }}><p className="text-xs">Aucun congé approuvé</p></div>
          ) : (
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={180}>
                <PieChart>
                  <Pie
                    data={leaveTypeData}
                    cx="50%" cy="50%"
                    innerRadius={44} outerRadius={68}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {leaveTypeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<TooltipBox />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {leaveTypeData.map((d) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span style={{ color: "var(--text-2)" }}>{d.name}</span>
                    </div>
                    <span className="font-semibold" style={{ color: "var(--text-1)" }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity tables ──────────────────────────────────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Recent leave requests */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Dernières demandes</h3>
              <p className="text-xs" style={{ color: "var(--text-3)" }}>{totalRequests} demandes total</p>
            </div>
            <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-3)" }}>
              <span style={{ color: "#fbbf24" }}>{pendingRequests} en attente</span>
              <span style={{ color: "#f87171" }}>{rejectedRequests} rejetées</span>
            </div>
          </div>
          <div>
            {recentRequests.length === 0 ? (
              <div className="empty-state"><p className="text-xs">Aucune demande</p></div>
            ) : recentRequests.map((r, i) => {
              const meta = STATUS_META[r.status] ?? STATUS_META.DRAFT;
              return (
                <div
                  key={r.id}
                  className="flex items-center gap-3 px-5 py-3 transition"
                  style={{ borderBottom: i < recentRequests.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-raised)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
                      {r.submitter ? `${r.submitter.firstName} ${r.submitter.lastName}` : "—"}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      {r.leaveType ?? "—"} · {r.leaveStartDate ? new Date(r.leaveStartDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : "—"}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: meta.bg, color: meta.color }}
                  >
                    {meta.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent evaluations */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Évaluations récentes</h3>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Score moyen : {avgScore}/5</p>
          </div>
          <div>
            {recentEvals.length === 0 ? (
              <div className="empty-state"><p className="text-xs">Aucune évaluation</p></div>
            ) : recentEvals.map((ev, i) => {
              const score = ev.globalScore ?? null;
              const scoreColor = score == null ? "var(--text-3)" : score >= 75 ? "#4ade80" : score >= 50 ? "#fbbf24" : "#f87171";
              return (
                <div
                  key={ev.id}
                  className="flex items-center gap-3 px-5 py-3 transition"
                  style={{ borderBottom: i < recentEvals.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-raised)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
                      {ev.collaborator.user.firstName} {ev.collaborator.user.lastName}
                    </p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      {ev.evaluationType} · {new Date(ev.evaluationDate).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <span
                    className="text-xs font-bold"
                    style={{ color: scoreColor, minWidth: 32, textAlign: "right" }}
                  >
                    {score != null ? `${score}` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming project deadlines */}
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Projets en cours — échéances</h3>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>{activeProjects} projets actifs</p>
          </div>
          <div>
            {upcomingProjects.length === 0 ? (
              <div className="empty-state"><p className="text-xs">Aucun projet avec échéance</p></div>
            ) : upcomingProjects.map((p, i) => {
              const daysLeft = Math.ceil(
                (new Date(p.endDate!).getTime() - Date.now()) / 86_400_000
              );
              const urgentColor = daysLeft <= 7 ? "#f87171" : daysLeft <= 30 ? "#fbbf24" : "#4ade80";
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-5 py-3 transition"
                  style={{ borderBottom: i < upcomingProjects.length - 1 ? "1px solid var(--border)" : "none" }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-raised)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                >
                  <div
                    className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ background: "var(--accent-dim)" }}
                  >
                    <FolderKanban size={13} style={{ color: ACCENT }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>{p.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--text-3)" }}>
                      {p.lead ? `${p.lead.firstName} ${p.lead.lastName}` : "Aucun responsable"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold" style={{ color: urgentColor }}>
                      {daysLeft > 0 ? `J-${daysLeft}` : daysLeft === 0 ? "Aujourd'hui" : "Dépassé"}
                    </p>
                    <p className="text-[10px]" style={{ color: "var(--text-3)" }}>
                      {new Date(p.endDate!).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Summary bar ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-4 flex flex-wrap items-center gap-6"
        style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center gap-2">
          <AlertCircle size={14} style={{ color: "#fbbf24" }} />
          <span className="text-xs" style={{ color: "var(--text-2)" }}>
            <span className="font-semibold" style={{ color: "#fbbf24" }}>{pendingRequests}</span> congé{pendingRequests !== 1 ? "s" : ""} en attente d'approbation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle size={14} style={{ color: "#f87171" }} />
          <span className="text-xs" style={{ color: "var(--text-2)" }}>
            <span className="font-semibold" style={{ color: "#f87171" }}>{s.projects.filter(p => p.status === "SUSPENDED").length}</span> projet{s.projects.filter(p => p.status === "SUSPENDED").length !== 1 ? "s" : ""} suspendu{s.projects.filter(p => p.status === "SUSPENDED").length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Star size={14} style={{ color: "#a855f7" }} />
          <span className="text-xs" style={{ color: "var(--text-2)" }}>
            <span className="font-semibold" style={{ color: "#a855f7" }}>{scoredEvals.filter(e => (e.globalScore ?? 0) >= 85).length}</span> évaluations excellentes (≥ 85)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} style={{ color: "#06b6d4" }} />
          <span className="text-xs" style={{ color: "var(--text-2)" }}>
            <span className="font-semibold" style={{ color: "#06b6d4" }}>{totalHoursThisMonth}h</span> loggées ce mois
          </span>
        </div>
      </div>
    </div>
  );
}
