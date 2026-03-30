"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import {
  Plus, Trash2, ChevronLeft, ChevronRight, Download,
  FileSpreadsheet, FileText as FilePdf, RefreshCw, Loader2,
  CheckCircle, XCircle, Clock, Send, Save, AlertCircle,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, AreaChart, Area,
} from "recharts";

// ─── Types ─────────────────────────────────────────────────────────────────

type RoleView = "admin" | "manager" | "collaborator";

interface EntryInput {
  projectId: string;
  entryDate: string;
  taskName: string;
  hours: string;
  activityDescription: string;
  comments: string;
}

interface TimesheetItem {
  id: string;
  userId: string;
  weekStartDate: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  totalHours: number;
  overtimeHours: number;
  decisionComment?: string | null;
  entries?: Array<{ id: string; projectId: string; taskName?: string | null; hours: number; entryDate: string; project?: { name: string } | null }>;
  user?: { firstName?: string; lastName?: string };
}

interface ProjectOption {
  id: string;
  label: string;
  name?: string | null;
  code?: string | null;
  status: "IN_PROGRESS" | "FINISHED" | "SUSPENDED";
}

interface MonthlyReport {
  totalTimesheets: number;
  totalHours: number;
  overtimeHours: number;
  byProject: Array<{ projectName: string; hours: number }>;
}

interface ProjectTotal {
  projectId: string;
  projectName: string;
  totalHours: number;
  contributorsCount?: number;
}

interface AdminStats {
  year: number;
  month: number;
  totalTimesheets: number;
  uniqueEmployees: number;
  totalHours: number;
  overtimeHours: number;
  projectCount: number;
  byStatus: Record<string, number>;
  projectTotals: ProjectTotal[];
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ACCENT = "#f97316";
const COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#eab308", "#06b6d4", "#ec4899"];
const FR_MONTHS = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const FR_MONTHS_SHORT = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  DRAFT:     { label: "Brouillon",  color: "#94a3b8", bg: "rgba(148,163,184,0.12)", icon: <Save size={11} /> },
  SUBMITTED: { label: "Soumise",    color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  icon: <Send size={11} /> },
  APPROVED:  { label: "Approuvée",  color: "#4ade80", bg: "rgba(74,222,128,0.12)",  icon: <CheckCircle size={11} /> },
  REJECTED:  { label: "Rejetée",    color: "#f87171", bg: "rgba(248,113,113,0.12)", icon: <XCircle size={11} /> },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getMonday(d: Date) {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function toISO(d: Date) { return d.toISOString().slice(0, 10); }
function getTodayDate() { return toISO(new Date()); }
function getDefaultWeekStart() { return toISO(getMonday(new Date())); }

function addWeeks(dateStr: string, n: number) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n * 7);
  return toISO(d);
}

function fmtDateFR(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

function weekRangeLabel(weekStart: string) {
  const start = new Date(weekStart);
  const end = new Date(weekStart);
  end.setDate(start.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  return `${start.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", opts)}`;
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "var(--surface-overlay)", border: "1px solid var(--border-strong)", borderRadius: 10, padding: "8px 12px", fontSize: 12 }}>
      {label && <p style={{ color: "var(--text-2)", marginBottom: 4 }}>{label}</p>}
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color ?? "var(--text-1)", margin: "2px 0" }}>
          <span style={{ fontWeight: 600 }}>{typeof p.value === "number" ? p.value.toFixed(1) : p.value}</span>h {p.name}
        </p>
      ))}
    </div>
  );
};

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function TimesheetsWorkspace() {
  const { databaseUser } = useAuth();
  const { t } = useLanguage();

  const role: RoleView = useMemo(() => {
    const r = databaseUser?.role?.description?.toLowerCase().trim() ?? "";
    if (r.includes("admin")) return "admin";
    if (r.includes("manager")) return "manager";
    return "collaborator";
  }, [databaseUser?.role?.description]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">{t("timesheets.title")}</h1>
        <p className="page-subtitle">{t("timesheets.subtitle")}</p>
      </div>
      {role === "admin"        && <AdminTimesheets userId={databaseUser?.id ?? ""} t={t} />}
      {role === "manager"      && <ManagerTimesheets userId={databaseUser?.id ?? ""} t={t} />}
      {role === "collaborator" && <CollaboratorTimesheets userId={databaseUser?.id ?? ""} t={t} />}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN VIEW
// ══════════════════════════════════════════════════════════════════════════════

function AdminTimesheets({ userId, t }: { userId: string; t: (k: string) => string }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [projectTotals, setProjectTotals] = useState<ProjectTotal[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<"excel" | "pdf" | null>(null);
  const [exportSuccess, setExportSuccess] = useState<"excel" | "pdf" | null>(null);
  const [tab, setTab] = useState<"overview" | "export">("overview");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [totalsRes, statsRes] = await Promise.allSettled([
        apiClient.get<ProjectTotal[]>(apiConfig.endpoints.timesheets.projectTotals(year, month)),
        apiClient.get<AdminStats>(apiConfig.endpoints.timesheets.adminStats(year, month)),
      ]);
      if (totalsRes.status === "fulfilled") setProjectTotals(totalsRes.value ?? []);
      if (statsRes.status === "fulfilled") setAdminStats(statsRes.value);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleExport = async (format: "excel" | "pdf") => {
    const token = (typeof window !== "undefined" && (localStorage.getItem("token") || sessionStorage.getItem("token"))) ?? null;
    if (!token) return;
    setExporting(format);
    setExportSuccess(null);
    try {
      const url = format === "excel"
        ? apiConfig.endpoints.timesheets.exportExcel(year, month)
        : apiConfig.endpoints.timesheets.exportPdf(year, month);
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `rapport-feuilles-${year}-${String(month).padStart(2, "0")}.${format === "excel" ? "csv" : "pdf"}`;
      link.click();
      URL.revokeObjectURL(link.href);
      setExportSuccess(format);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch { /* silent */ }
    finally { setExporting(null); }
  };

  const totalHours = adminStats?.totalHours ?? projectTotals.reduce((s, p) => s + Number(p.totalHours ?? 0), 0);
  const overtimeHours = adminStats?.overtimeHours ?? 0;
  const topProject = [...projectTotals].sort((a, b) => Number(b.totalHours) - Number(a.totalHours))[0];

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const chartData = [...projectTotals]
    .sort((a, b) => Number(b.totalHours) - Number(a.totalHours))
    .slice(0, 10)
    .map(p => ({ name: p.projectName.length > 20 ? p.projectName.slice(0, 18) + "…" : p.projectName, hours: Number(Number(p.totalHours ?? 0).toFixed(1)) }));

  const STATUS_COLORS: Record<string, string> = {
    APPROVED: "#22c55e", SUBMITTED: "#60a5fa", DRAFT: "#94a3b8", REJECTED: "#f87171",
  };
  const STATUS_LABELS_FR: Record<string, string> = {
    APPROVED: "Approuvées", SUBMITTED: "Soumises", DRAFT: "Brouillons", REJECTED: "Rejetées",
  };

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="btn-ghost" style={{ padding: "6px 10px" }}><ChevronLeft size={15} /></button>
          <span className="text-sm font-semibold px-2" style={{ color: "var(--text-1)", minWidth: 140, textAlign: "center" }}>
            {FR_MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="btn-ghost" style={{ padding: "6px 10px" }}><ChevronRight size={15} /></button>
        </div>
        <button onClick={load} disabled={loading} className="btn-ghost" style={{ padding: "6px 12px" }}>
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} />Actualiser
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total heures loggées", value: loading ? "…" : `${Number(totalHours).toFixed(0)}h`, sub: `${adminStats?.totalTimesheets ?? 0} feuilles`, color: ACCENT },
          { label: "Employés actifs", value: loading ? "…" : String(adminStats?.uniqueEmployees ?? 0), sub: "ce mois", color: "#3b82f6" },
          { label: "Heures supp.", value: loading ? "…" : `${Number(overtimeHours).toFixed(0)}h`, sub: "au-delà 40h/sem", color: "#eab308" },
          { label: "Projet top", value: loading ? "…" : topProject?.projectName?.slice(0, 14) ?? "—", sub: topProject ? `${Number(topProject.totalHours).toFixed(0)}h` : "", color: "#22c55e" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value" style={{ fontSize: 22, color }}>{value}</p>
            {sub && <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[{ key: "overview", label: "Répartition" }, { key: "export", label: "Export & Rapport" }].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key as any)} className={`tab ${tab === tb.key ? "active" : ""}`}>{tb.label}</button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="space-y-6">
          {/* Status breakdown bar */}
          {adminStats && adminStats.totalTimesheets > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-2)" }}>Statut des feuilles</p>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-3">
                {["APPROVED","SUBMITTED","DRAFT","REJECTED"].map(s => {
                  const cnt = adminStats.byStatus[s] ?? 0;
                  if (!cnt) return null;
                  const pct = (cnt / adminStats.totalTimesheets) * 100;
                  return <div key={s} title={`${STATUS_LABELS_FR[s]}: ${cnt}`} style={{ width: `${pct}%`, background: STATUS_COLORS[s] }} />;
                })}
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {["APPROVED","SUBMITTED","DRAFT","REJECTED"].map(s => {
                  const cnt = adminStats.byStatus[s] ?? 0;
                  return (
                    <div key={s} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: STATUS_COLORS[s] }} />
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>{STATUS_LABELS_FR[s]}: <span style={{ color: "var(--text-1)", fontWeight: 600 }}>{cnt}</span></span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Bar chart */}
            <div className="card p-5 lg:col-span-2">
              <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-1)" }}>
                Heures par projet — {FR_MONTHS_SHORT[month - 1]} {year}
              </p>
              {loading ? (
                <div className="flex items-center justify-center h-52"><Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} /></div>
              ) : chartData.length === 0 ? (
                <div className="empty-state" style={{ height: 200 }}><p className="text-xs">Aucune donnée pour cette période</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-2)", fontSize: 11 }} width={130} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="hours" name="heures" radius={[0, 6, 6, 0]} maxBarSize={14}>
                      {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Project table */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Détail par projet</p>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin" style={{ color: ACCENT }} /></div>
              ) : projectTotals.length === 0 ? (
                <div className="empty-state"><p className="text-xs">Aucune donnée</p></div>
              ) : (
                <div className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {[...projectTotals].sort((a, b) => Number(b.totalHours) - Number(a.totalHours)).map((p, i) => {
                    const pct = totalHours > 0 ? Math.round((Number(p.totalHours) / totalHours) * 100) : 0;
                    return (
                      <div key={p.projectId} className="px-4 py-2.5 transition"
                           onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)"}
                           onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                            <span className="text-xs truncate" style={{ color: "var(--text-2)", maxWidth: 100 }}>{p.projectName}</span>
                          </div>
                          <span className="text-xs font-bold flex-shrink-0 ml-2" style={{ color: "var(--text-1)" }}>{Number(p.totalHours ?? 0).toFixed(1)}h</span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                        </div>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-3)" }}>
                          {pct}% du total
                          {p.contributorsCount !== undefined && ` · ${p.contributorsCount} contrib.`}
                        </p>
                      </div>
                    );
                  })}
                  <div className="flex items-center justify-between px-4 py-2.5" style={{ background: "var(--surface-raised)" }}>
                    <span className="text-xs font-semibold" style={{ color: "var(--text-2)" }}>Total</span>
                    <span className="text-xs font-bold" style={{ color: ACCENT }}>{Number(totalHours).toFixed(1)}h</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EXPORT TAB ───────────────────────────────────────────────────── */}
      {tab === "export" && (
        <div className="space-y-6">
          {/* Export actions card */}
          <div className="card p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  Exporter le rapport — {FR_MONTHS[month - 1]} {year}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                  Le rapport comprend : résumé global, répartition par projet, détail par employé et liste des entrées.
                </p>
              </div>
              {exportSuccess && (
                <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                     style={{ background: "rgba(34,197,94,0.12)", color: "#4ade80" }}>
                  <CheckCircle size={13} />
                  {exportSuccess === "excel" ? "CSV téléchargé" : "PDF téléchargé"}
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* CSV Card */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(34,197,94,0.12)" }}>
                    <FileSpreadsheet size={20} style={{ color: "#22c55e" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>CSV / Excel</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Format tabulaire multi-sections</p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {["Résumé global + KPIs","Répartition par projet","Détail par employé","Liste complète des entrées"].map(item => (
                    <li key={item} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-3)" }}>
                      <CheckCircle size={11} style={{ color: "#22c55e", flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleExport("excel")} disabled={!!exporting || loading}
                  className="w-full btn-primary" style={{ justifyContent: "center" }}>
                  {exporting === "excel" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Télécharger CSV
                </button>
              </div>

              {/* PDF Card */}
              <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)" }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.12)" }}>
                    <FilePdf size={20} style={{ color: ACCENT }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>PDF Professionnel</p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Rapport mis en page, prêt à imprimer</p>
                  </div>
                </div>
                <ul className="space-y-1">
                  {["En-tête avec titre et période","Résumé exécutif visuel","Tableau des projets avec % total","Tableau des employés avec statuts"].map(item => (
                    <li key={item} className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-3)" }}>
                      <CheckCircle size={11} style={{ color: ACCENT, flexShrink: 0 }} />{item}
                    </li>
                  ))}
                </ul>
                <button onClick={() => handleExport("pdf")} disabled={!!exporting || loading}
                  className="btn-ghost w-full" style={{ justifyContent: "center" }}>
                  {exporting === "pdf" ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  Télécharger PDF
                </button>
              </div>
            </div>
          </div>

          {/* Data preview */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Aperçu des données</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  Ce que contiendra le rapport exporté
                </p>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} />
              </div>
            ) : !adminStats ? (
              <div className="empty-state">
                <p className="text-xs">Aucune donnée disponible pour cette période</p>
              </div>
            ) : (
              <div>
                {/* Summary section */}
                <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
                    Résumé global
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Feuilles", value: adminStats.totalTimesheets, color: "var(--text-1)" },
                      { label: "Employés", value: adminStats.uniqueEmployees, color: "#3b82f6" },
                      { label: "Heures totales", value: `${Number(adminStats.totalHours).toFixed(1)}h`, color: ACCENT },
                      { label: "Heures supp.", value: `${Number(adminStats.overtimeHours).toFixed(1)}h`, color: "#eab308" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-lg p-3 text-center" style={{ background: "var(--surface-raised)" }}>
                        <p className="text-[10px] mb-1" style={{ color: "var(--text-3)" }}>{label}</p>
                        <p className="text-base font-bold" style={{ color }}>{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project preview table */}
                <div className="px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-3)" }}>
                    Répartition par projet ({adminStats.projectCount} projets)
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="grid text-[10px] font-semibold uppercase tracking-wide px-4 py-2"
                         style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: "1px solid var(--border)", color: "var(--text-3)", background: "var(--surface-raised)" }}>
                      <span>Projet</span>
                      <span className="text-center">Contributeurs</span>
                      <span className="text-right">Heures</span>
                      <span className="text-right">% Total</span>
                    </div>
                    {[...projectTotals]
                      .sort((a, b) => Number(b.totalHours) - Number(a.totalHours))
                      .slice(0, 8)
                      .map((p, i) => {
                        const pct = Number(adminStats.totalHours) > 0
                          ? ((Number(p.totalHours) / Number(adminStats.totalHours)) * 100).toFixed(1)
                          : "0";
                        return (
                          <div key={p.projectId} className="grid items-center px-4 py-2.5 text-xs"
                               style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", borderBottom: i < Math.min(projectTotals.length, 8) - 1 ? "1px solid var(--border)" : "none" }}>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                              <span className="truncate" style={{ color: "var(--text-2)" }}>{p.projectName}</span>
                            </div>
                            <span className="text-center" style={{ color: "var(--text-3)" }}>{p.contributorsCount ?? "—"}</span>
                            <span className="text-right font-semibold" style={{ color: "var(--text-1)" }}>{Number(p.totalHours).toFixed(1)}h</span>
                            <span className="text-right" style={{ color: "var(--text-3)" }}>{pct}%</span>
                          </div>
                        );
                      })
                    }
                    {projectTotals.length > 8 && (
                      <div className="px-4 py-2 text-xs text-center" style={{ color: "var(--text-3)", background: "var(--surface-raised)" }}>
                        +{projectTotals.length - 8} autres projets dans le rapport complet
                      </div>
                    )}
                    <div className="grid px-4 py-2.5 text-xs font-bold"
                         style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr", background: "var(--surface-raised)", borderTop: "1px solid var(--border)" }}>
                      <span style={{ color: "var(--text-2)" }}>TOTAL</span>
                      <span className="text-center" style={{ color: "var(--text-2)" }}>{adminStats.uniqueEmployees}</span>
                      <span className="text-right" style={{ color: ACCENT }}>{Number(adminStats.totalHours).toFixed(1)}h</span>
                      <span className="text-right" style={{ color: "var(--text-3)" }}>100%</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MANAGER VIEW
// ══════════════════════════════════════════════════════════════════════════════

function ManagerTimesheets({ userId, t }: { userId: string; t: (k: string) => string }) {
  const [queue, setQueue] = useState<TimesheetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient.get<TimesheetItem[]>(apiConfig.endpoints.timesheets.submittedForManager(userId));
      setQueue(data ?? []);
    } catch { setQueue([]); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    if (action === "reject" && !comment.trim()) {
      setMsg({ type: "err", text: "Un commentaire est requis pour rejeter une feuille." });
      return;
    }
    setActionId(id);
    try {
      await apiClient.post(
        action === "approve" ? apiConfig.endpoints.timesheets.approve(id) : apiConfig.endpoints.timesheets.reject(id),
        { managerId: userId, comment: comment || undefined },
      );
      setQueue(prev => prev.filter(item => item.id !== id));
      setComment("");
      setMsg({ type: "ok", text: action === "approve" ? "Feuille approuvée." : "Feuille rejetée." });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Erreur lors de l'action." });
    } finally { setActionId(null); }
  };

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">En attente</p>
          <p className="stat-value" style={{ color: "#60a5fa" }}>{loading ? "…" : queue.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Heures totales (file)</p>
          <p className="stat-value">{loading ? "…" : `${queue.reduce((s, i) => s + Number(i.totalHours ?? 0), 0).toFixed(0)}h`}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Collaborateurs</p>
          <p className="stat-value">{loading ? "…" : new Set(queue.map(i => i.userId)).size}</p>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div className="flex items-center gap-2 rounded-xl p-3 text-sm"
             style={{ background: msg.type === "ok" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: msg.type === "ok" ? "#4ade80" : "#f87171", border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          {msg.type === "ok" ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {/* Queue */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>File d'approbation</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Feuilles soumises par votre équipe</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-ghost" style={{ padding: "5px 10px" }}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Comment field (shared) */}
        <div className="px-5 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Commentaire (obligatoire pour rejeter)"
            className="w-full rounded-xl px-3 py-2 text-sm"
            style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-1)" }}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} /></div>
        ) : queue.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={32} style={{ color: "#4ade80", opacity: 0.4 }} />
            <p className="text-sm font-medium" style={{ color: "var(--text-2)" }}>File vide</p>
            <p className="text-xs" style={{ color: "var(--text-3)" }}>Toutes les feuilles ont été traitées</p>
          </div>
        ) : (
          <div>
            {queue.map((item, i) => (
              <div key={item.id} className="transition"
                   style={{ borderBottom: i < queue.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div className="flex items-center gap-4 px-5 py-4">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold flex-shrink-0"
                    style={{ background: "var(--accent-dim)", color: ACCENT }}
                  >
                    {item.user?.firstName?.[0]}{item.user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                      {item.user?.firstName} {item.user?.lastName}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>
                      Semaine du {fmtDateFR(item.weekStartDate)} · {Number(item.totalHours ?? 0).toFixed(1)}h
                      {Number(item.overtimeHours) > 0 && <span style={{ color: "#eab308" }}> (+{Number(item.overtimeHours).toFixed(1)}h supp.)</span>}
                    </p>
                    {item.entries?.length ? (
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                        {item.entries.length} entrée{item.entries.length > 1 ? "s" : ""}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => act(item.id, "approve")}
                      disabled={!!actionId}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
                      style={{ background: "#16a34a" }}
                    >
                      {actionId === item.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={12} />}
                      Approuver
                    </button>
                    <button
                      onClick={() => act(item.id, "reject")}
                      disabled={!!actionId}
                      className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-white transition disabled:opacity-50"
                      style={{ background: "#dc2626" }}
                    >
                      {actionId === item.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={12} />}
                      Rejeter
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COLLABORATOR VIEW
// ══════════════════════════════════════════════════════════════════════════════

const FR_DAY_NAMES   = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi"];
const FR_MONTH_SHORT = ["jan.","fév.","mars","avr.","mai","juin","juil.","août","sep.","oct.","nov.","déc."];

interface DraftEntry {
  projectId: string;
  taskName: string;
  hours: string;
  activityDescription: string;
}

function CollaboratorTimesheets({ userId, t }: { userId: string; t: (k: string) => string }) {
  const now = new Date();
  const [tab, setTab] = useState<"entry" | "history" | "stats">("entry");

  // ── Week / entry state ─────────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState(getDefaultWeekStart());
  const [entryMode, setEntryMode] = useState<"weekly" | "daily">("weekly");
  const [selectedDay, setSelectedDay] = useState(getTodayDate());

  // weekEntries: per ISO-date list of entry inputs (the source of truth for the form)
  const [weekEntries, setWeekEntries] = useState<Record<string, EntryInput[]>>({});
  const [addingToDay, setAddingToDay] = useState<string | null>(null);
  const [draftEntry, setDraftEntry] = useState<DraftEntry>({ projectId: "", taskName: "", hours: "", activityDescription: "" });
  const [isDirty, setIsDirty] = useState(false);

  // ── DB / status state ─────────────────────────────────────────────────────
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<string | null>(null);
  const [dbDecisionComment, setDbDecisionComment] = useState<string | null>(null);

  // ── Projects + saving ─────────────────────────────────────────────────────
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err" | "info"; text: string } | null>(null);

  // ── KPI state (loaded on mount) ───────────────────────────────────────────
  const [kpiLoading, setKpiLoading] = useState(true);
  const [approvedCount, setApprovedCount] = useState<number>(0);

  // ── History state ─────────────────────────────────────────────────────────
  const [history, setHistory] = useState<TimesheetItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Stats state ───────────────────────────────────────────────────────────
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReport | null>(null);
  const [statsYear, setStatsYear] = useState(now.getFullYear());
  const [statsMonth, setStatsMonth] = useState(now.getMonth() + 1);
  const [statsLoading, setStatsLoading] = useState(false);

  function blankEntry(): EntryInput {
    return { projectId: "", entryDate: getTodayDate(), taskName: "", hours: "", activityDescription: "", comments: "" };
  }

  const blankDraft = (): DraftEntry => ({ projectId: "", taskName: "", hours: "", activityDescription: "" });

  // ── Load projects on mount ─────────────────────────────────────────────────
  useEffect(() => {
    apiClient.get<ProjectOption[]>(apiConfig.endpoints.timesheets.projects)
      .then(setProjects).catch(() => setProjects([]));
  }, []);

  // ── Bootstrap: load full history + monthly snapshot ────────────────────────
  const loadAll = useCallback(async () => {
    if (!userId) return;
    setKpiLoading(true);
    const [histRes, monthRes] = await Promise.allSettled([
      apiClient.get<TimesheetItem[]>(apiConfig.endpoints.timesheets.byUser(userId)),
      apiClient.get<MonthlyReport>(
        apiConfig.endpoints.timesheets.monthlyReport(userId, now.getFullYear(), now.getMonth() + 1),
        { silent: true }
      ).catch(() => null),
    ]);
    if (histRes.status === "fulfilled" && histRes.value) {
      const all = histRes.value;
      setHistory(all);
      setApprovedCount(all.filter(ts => ts.status === "APPROVED").length);
    }
    if (monthRes.status === "fulfilled" && monthRes.value) setMonthlyReport(monthRes.value);
    setKpiLoading(false);
  }, [userId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── When weekStart or history changes, populate form from DB ───────────────
  useEffect(() => {
    const thisWeek = history.find(ts => ts.weekStartDate?.slice(0, 10) === weekStart);
    if (thisWeek) {
      setCurrentId(thisWeek.id);
      setDbStatus(thisWeek.status);
      setDbDecisionComment(thisWeek.decisionComment ?? null);
      // Group entries by day
      const byDay: Record<string, EntryInput[]> = {};
      for (const e of thisWeek.entries ?? []) {
        const day = e.entryDate?.slice(0, 10) ?? "";
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push({
          projectId: e.projectId,
          entryDate: day,
          taskName: e.taskName ?? "",
          hours: String(Number(e.hours ?? 0)),
          activityDescription: "",
          comments: "",
        });
      }
      setWeekEntries(byDay);
    } else {
      setCurrentId(null);
      setDbStatus(null);
      setDbDecisionComment(null);
      setWeekEntries({});
    }
    setIsDirty(false);
    setAddingToDay(null);
  }, [weekStart, history]);

  // ── History tab refresh ────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    if (!userId) return;
    setHistoryLoading(true);
    try {
      const data = await apiClient.get<TimesheetItem[]>(apiConfig.endpoints.timesheets.byUser(userId));
      const all = data ?? [];
      setHistory(all);
      setApprovedCount(all.filter(ts => ts.status === "APPROVED").length);
    } catch { setHistory([]); }
    finally { setHistoryLoading(false); }
  }, [userId]);

  useEffect(() => { if (tab === "history") loadHistory(); }, [tab, loadHistory]);

  // ── Monthly stats ──────────────────────────────────────────────────────────
  const loadStats = useCallback(async () => {
    if (!userId) return;
    setStatsLoading(true);
    try {
      const data = await apiClient.get<MonthlyReport>(
        apiConfig.endpoints.timesheets.monthlyReport(userId, statsYear, statsMonth)
      );
      setMonthlyReport(data);
    } catch { setMonthlyReport(null); }
    finally { setStatsLoading(false); }
  }, [userId, statsYear, statsMonth]);

  useEffect(() => { if (tab === "stats") loadStats(); }, [tab, loadStats]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const weekDays = useMemo(() => Array.from({ length: 5 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    const dateStr = toISO(d);
    return {
      dateStr,
      label: `${FR_DAY_NAMES[i]} ${d.getDate()} ${FR_MONTH_SHORT[d.getMonth()]}`,
      shortLabel: FR_DAY_NAMES[i],
      isToday: dateStr === getTodayDate(),
    };
  }), [weekStart]);

  const totalWeekHours = Object.values(weekEntries).flat().reduce((s, e) => s + Number(e.hours || 0), 0);
  const totalOvertime   = Math.max(0, totalWeekHours - 40);
  const isEditable = !dbStatus || dbStatus === "DRAFT" || dbStatus === "REJECTED";
  const currentMonthLabel = `${FR_MONTHS[now.getMonth()]} ${now.getFullYear()}`;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const collectEntries = (entries: Record<string, EntryInput[]>) =>
    Object.entries(entries).flatMap(([day, list]) =>
      list.filter(e => e.projectId && Number(e.hours) > 0).map(e => ({
        projectId: e.projectId,
        entryDate: day,
        taskName: e.taskName || undefined,
        hours: Number(e.hours),
        activityDescription: e.activityDescription || undefined,
        comments: e.comments || undefined,
      }))
    );

  const persistDraft = async (entries: Record<string, EntryInput[]>): Promise<TimesheetItem | null> => {
    const cleaned = collectEntries(entries);
    if (!cleaned.length) { setMsg({ type: "err", text: "Ajoutez au moins une entrée valide (projet + heures)." }); return null; }
    setSaving(true); setMsg(null);
    try {
      const res = await apiClient.post<{ timesheet: TimesheetItem }>(
        apiConfig.endpoints.timesheets.saveDraft,
        { userId, weekStartDate: weekStart, entries: cleaned }
      );
      const ts = res.timesheet;
      setCurrentId(ts.id);
      setDbStatus("DRAFT");
      setIsDirty(false);
      // Update history cache
      setHistory(prev => {
        const exists = prev.find(h => h.id === ts.id);
        if (exists) return prev.map(h => h.id === ts.id ? { ...h, ...ts } : h);
        return [ts, ...prev];
      });
      return ts;
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Erreur lors de la sauvegarde." });
      return null;
    } finally { setSaving(false); }
  };

  const saveDraft = async () => {
    const ts = await persistDraft(weekEntries);
    if (ts) setMsg({ type: "ok", text: "Brouillon sauvegardé avec succès." });
  };

  const submitWeek = async () => {
    let id = currentId;
    if (!id || isDirty) {
      const ts = await persistDraft(weekEntries);
      if (!ts) return;
      id = ts.id;
    }
    setSaving(true); setMsg(null);
    try {
      await apiClient.post(apiConfig.endpoints.timesheets.submit(id!));
      setDbStatus("SUBMITTED");
      setHistory(prev => prev.map(h => h.id === id ? { ...h, status: "SUBMITTED" as any } : h));
      setMsg({ type: "ok", text: "Feuille soumise ! En attente d'approbation du manager." });
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message ?? "Erreur lors de la soumission." });
    } finally { setSaving(false); }
  };

  const addEntryToDay = async (dateStr: string) => {
    if (!draftEntry.projectId || !Number(draftEntry.hours)) {
      setMsg({ type: "err", text: "Sélectionnez un projet et entrez les heures." });
      return;
    }
    const newE: EntryInput = {
      projectId: draftEntry.projectId,
      entryDate: dateStr,
      taskName: draftEntry.taskName,
      hours: draftEntry.hours,
      activityDescription: draftEntry.activityDescription,
      comments: "",
    };
    const updated = { ...weekEntries, [dateStr]: [...(weekEntries[dateStr] ?? []), newE] };
    setWeekEntries(updated);
    setAddingToDay(null);
    setDraftEntry(blankDraft());
    // Auto-persist
    const ts = await persistDraft(updated);
    if (ts) setMsg({ type: "ok", text: "Entrée ajoutée et sauvegardée automatiquement." });
  };

  const removeEntry = (dateStr: string, idx: number) => {
    setWeekEntries(prev => {
      const list = (prev[dateStr] ?? []).filter((_, i) => i !== idx);
      const updated = { ...prev };
      if (list.length === 0) delete updated[dateStr]; else updated[dateStr] = list;
      return updated;
    });
    setIsDirty(true);
  };

  const prevWeek = () => { setWeekStart(w => addWeeks(w, -1)); };
  const nextWeek = () => { setWeekStart(w => addWeeks(w, 1)); };

  // Status breakdown for history
  const statusBars: Record<string, number> = {};
  history.forEach(h => { statusBars[h.status] = (statusBars[h.status] ?? 0) + 1; });

  const prevStatsMonth = () => { if (statsMonth === 1) { setStatsMonth(12); setStatsYear(y => y - 1); } else setStatsMonth(m => m - 1); };
  const nextStatsMonth = () => { if (statsMonth === 12) { setStatsMonth(1); setStatsYear(y => y + 1); } else setStatsMonth(m => m + 1); };

  return (
    <div className="space-y-5">

      {/* ── Real-data KPI strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Heures cette semaine", value: kpiLoading ? "…" : `${totalWeekHours.toFixed(1)}h`, sub: "/ 40h objectif", color: totalWeekHours >= 40 ? "#4ade80" : ACCENT },
          { label: "Heures supp.", value: kpiLoading ? "…" : `${totalOvertime.toFixed(1)}h`, sub: totalOvertime > 0 ? "au-delà du seuil" : "dans les normes", color: totalOvertime > 0 ? "#eab308" : "#4ade80" },
          { label: "Feuilles approuvées", value: kpiLoading ? "…" : String(approvedCount), sub: "depuis le début", color: "#4ade80" },
          { label: "Ce mois", value: kpiLoading ? "…" : monthlyReport ? `${Number(monthlyReport.totalHours).toFixed(1)}h` : "—", sub: currentMonthLabel, color: "#60a5fa" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value" style={{ color, fontSize: 22 }}>{value}</p>
            <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        {[
          { key: "entry",   label: "Saisie" },
          { key: "history", label: `Historique${history.length ? ` (${history.length})` : ""}` },
          { key: "stats",   label: "Rapport mensuel" },
        ].map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key as any)} className={`tab ${tab === tb.key ? "active" : ""}`}>
            {tb.label}
          </button>
        ))}
      </div>

      {/* ── ENTRY TAB ──────────────────────────────────────────────────────── */}
      {tab === "entry" && (
        <div className="space-y-4">

          {/* Week navigator + status */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button onClick={prevWeek} className="btn-ghost" style={{ padding: "5px 10px" }}><ChevronLeft size={15} /></button>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>{weekRangeLabel(weekStart)}</p>
              </div>
              <button onClick={nextWeek} className="btn-ghost" style={{ padding: "5px 10px" }}><ChevronRight size={15} /></button>
            </div>
            <div className="flex items-center gap-2">
              {dbStatus && <StatusBadge status={dbStatus} />}
              <button onClick={loadAll} disabled={kpiLoading} className="btn-ghost" style={{ padding: "5px 10px" }}>
                <RefreshCw size={13} className={kpiLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* ── Status banners ── */}
          {dbStatus === "SUBMITTED" && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.3)" }}>
              <Send size={15} style={{ color: "#60a5fa", flexShrink: 0 }} />
              <div>
                <p className="font-semibold" style={{ color: "#60a5fa" }}>Feuille soumise — en attente d'approbation</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  Votre manager va examiner cette feuille. Vous recevrez une notification une fois traitée.
                </p>
              </div>
            </div>
          )}
          {dbStatus === "APPROVED" && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)" }}>
              <CheckCircle size={15} style={{ color: "#4ade80", flexShrink: 0 }} />
              <div>
                <p className="font-semibold" style={{ color: "#4ade80" }}>Feuille approuvée ✓</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                  Cette feuille est verrouillée et ne peut plus être modifiée.
                </p>
              </div>
            </div>
          )}
          {dbStatus === "REJECTED" && (
            <div className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm"
              style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)" }}>
              <XCircle size={15} style={{ color: "#f87171", flexShrink: 0 }} />
              <div className="flex-1">
                <p className="font-semibold" style={{ color: "#f87171" }}>Feuille rejetée — corrections requises</p>
                {dbDecisionComment && (
                  <p className="text-xs mt-0.5 italic" style={{ color: "#f87171" }}>"{dbDecisionComment}"</p>
                )}
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                  Modifiez vos entrées ci-dessous puis cliquez sur "Corriger & Soumettre".
                </p>
              </div>
            </div>
          )}

          {/* ── Entry mode toggle (only when editable) ── */}
          {isEditable && (
            <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: "var(--surface-raised)" }}>
              {[{ key: "weekly", label: "Vue semaine" }, { key: "daily", label: "Saisie rapide" }].map(m => (
                <button key={m.key} onClick={() => setEntryMode(m.key as any)}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={{
                    background: entryMode === m.key ? "var(--surface)" : "transparent",
                    color: entryMode === m.key ? "var(--text-1)" : "var(--text-3)",
                    boxShadow: entryMode === m.key ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                  }}>
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* ══ WEEKLY GRID MODE ══ */}
          {(entryMode === "weekly" || !isEditable) && (
            <div className="space-y-3">
              {weekDays.map(({ dateStr, label, isToday }) => {
                const dayList = weekEntries[dateStr] ?? [];
                const dayTotal = dayList.reduce((s, e) => s + Number(e.hours || 0), 0);
                const isOpen = addingToDay === dateStr;

                return (
                  <div key={dateStr} className="card overflow-hidden">
                    {/* Day header */}
                    <div className="flex items-center justify-between px-4 py-3"
                      style={{
                        borderBottom: (dayList.length > 0 || isOpen) ? "1px solid var(--border)" : "none",
                        background: isToday ? "rgba(249,115,22,0.04)" : "transparent",
                      }}>
                      <div className="flex items-center gap-2">
                        {isToday && <div className="w-2 h-2 rounded-full" style={{ background: ACCENT }} />}
                        <span className="text-sm font-semibold" style={{ color: isToday ? ACCENT : "var(--text-1)" }}>{label}</span>
                        {isToday && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(249,115,22,0.15)", color: ACCENT }}>Aujourd'hui</span>
                        )}
                      </div>
                      <span className="text-sm font-bold" style={{ color: dayTotal > 0 ? "var(--text-1)" : "var(--text-3)" }}>
                        {dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : "—"}
                      </span>
                    </div>

                    {/* Existing entries */}
                    {dayList.map((entry, idx) => {
                      const proj = projects.find(p => p.id === entry.projectId);
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-2.5 transition"
                          style={{ borderBottom: (idx < dayList.length - 1 || isOpen) ? "1px solid var(--border)" : "none" }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "var(--text-1)" }}>
                              {proj?.label ?? entry.projectId}
                            </p>
                            {entry.taskName && <p className="text-[11px]" style={{ color: "var(--text-3)" }}>{entry.taskName}</p>}
                          </div>
                          <span className="text-sm font-bold flex-shrink-0" style={{ color: ACCENT }}>
                            {Number(entry.hours).toFixed(1)}h
                          </span>
                          {isEditable && (
                            <button onClick={() => removeEntry(dateStr, idx)}
                              className="flex-shrink-0 transition" style={{ color: "var(--text-3)" }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f87171"}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-3)"}>
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Inline add form */}
                    {isEditable && isOpen && (
                      <div className="px-4 py-3 space-y-2" style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
                        <div className="grid grid-cols-3 gap-2">
                          <select value={draftEntry.projectId}
                            onChange={e => setDraftEntry(prev => ({ ...prev, projectId: e.target.value }))}
                            className="rounded-lg px-3 py-2 text-sm"
                            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-1)" }}>
                            <option value="">— Projet</option>
                            {projects.filter(p => p.status === "IN_PROGRESS").map(p => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                          <input type="text" placeholder="Tâche (optionnel)" value={draftEntry.taskName}
                            onChange={e => setDraftEntry(prev => ({ ...prev, taskName: e.target.value }))}
                            className="rounded-lg px-3 py-2 text-sm"
                            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-1)" }} />
                          <input type="number" step="0.5" min="0.5" max="24" placeholder="Heures"
                            value={draftEntry.hours}
                            onChange={e => setDraftEntry(prev => ({ ...prev, hours: e.target.value }))}
                            className="rounded-lg px-3 py-2 text-sm"
                            style={{ background: "var(--surface)", border: "1px solid var(--border-strong)", color: "var(--text-1)" }} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => addEntryToDay(dateStr)} disabled={saving}
                            className="btn-primary" style={{ fontSize: 12, padding: "5px 14px" }}>
                            {saving ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
                            Ajouter
                          </button>
                          <button onClick={() => { setAddingToDay(null); setDraftEntry(blankDraft()); }}
                            className="btn-ghost" style={{ fontSize: 12, padding: "5px 12px" }}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Add entry button */}
                    {isEditable && !isOpen && (
                      <button
                        onClick={() => { setAddingToDay(dateStr); setDraftEntry(blankDraft()); }}
                        className="w-full flex items-center gap-1.5 px-4 py-2.5 text-xs transition"
                        style={{ color: "var(--text-3)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = ACCENT; (e.currentTarget as HTMLElement).style.background = "rgba(249,115,22,0.04)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <Plus size={12} />
                        Ajouter une entrée pour {label.split(" ")[0].toLowerCase()}
                      </button>
                    )}

                    {dayList.length === 0 && !isOpen && (
                      <div className="px-4 py-2 text-xs" style={{ color: "var(--text-3)" }}>
                        {isEditable ? "" : "Aucune entrée ce jour"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ══ DAILY QUICK-ADD MODE ══ */}
          {entryMode === "daily" && isEditable && (
            <div className="space-y-4">
              {/* Day selector */}
              <div className="flex gap-2">
                {weekDays.map(({ dateStr, shortLabel, isToday }) => (
                  <button key={dateStr} onClick={() => { setSelectedDay(dateStr); setAddingToDay(null); setDraftEntry(blankDraft()); }}
                    className="flex-1 rounded-xl py-2 text-xs font-semibold transition"
                    style={{
                      background: selectedDay === dateStr ? ACCENT : "var(--surface-raised)",
                      color: selectedDay === dateStr ? "white" : isToday ? ACCENT : "var(--text-2)",
                      border: isToday && selectedDay !== dateStr ? `1px solid ${ACCENT}` : "1px solid transparent",
                    }}>
                    {shortLabel}
                    {isToday && <span className="block text-[9px] opacity-80">auj.</span>}
                    {(weekEntries[dateStr] ?? []).length > 0 && (
                      <span className="block text-[9px]"
                        style={{ color: selectedDay === dateStr ? "rgba(255,255,255,0.8)" : "var(--text-3)" }}>
                        {(weekEntries[dateStr] ?? []).reduce((s, e) => s + Number(e.hours || 0), 0).toFixed(0)}h
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Quick-add form */}
              <div className="card p-4 space-y-3">
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  Ajouter une entrée — {weekDays.find(d => d.dateStr === selectedDay)?.label ?? selectedDay}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <select value={draftEntry.projectId}
                    onChange={e => setDraftEntry(prev => ({ ...prev, projectId: e.target.value }))}
                    className="rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-1)" }}>
                    <option value="">— Sélectionner un projet</option>
                    {projects.filter(p => p.status === "IN_PROGRESS").map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                  <input type="text" placeholder="Tâche / description (optionnel)" value={draftEntry.taskName}
                    onChange={e => setDraftEntry(prev => ({ ...prev, taskName: e.target.value }))}
                    className="rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-1)" }} />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <input type="number" step="0.5" min="0.5" max="24" placeholder="0.0"
                      value={draftEntry.hours}
                      onChange={e => setDraftEntry(prev => ({ ...prev, hours: e.target.value }))}
                      className="w-24 rounded-xl px-3 py-2.5 text-sm font-mono text-center"
                      style={{ background: "var(--surface-raised)", border: "1px solid var(--border-strong)", color: "var(--text-1)" }} />
                    <span className="text-sm" style={{ color: "var(--text-3)" }}>heures</span>
                  </div>
                  <button onClick={() => addEntryToDay(selectedDay)} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                    Ajouter & sauvegarder
                  </button>
                </div>
              </div>

              {/* Entries for selected day */}
              <div className="card overflow-hidden">
                <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
                  <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                    Entrées — {weekDays.find(d => d.dateStr === selectedDay)?.label}
                  </p>
                </div>
                {(weekEntries[selectedDay] ?? []).length === 0 ? (
                  <div className="empty-state" style={{ height: 80 }}>
                    <p className="text-xs" style={{ color: "var(--text-3)" }}>Aucune entrée pour ce jour</p>
                  </div>
                ) : (
                  <div>
                    {(weekEntries[selectedDay] ?? []).map((entry, idx) => {
                      const proj = projects.find(p => p.id === entry.projectId);
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3"
                          style={{ borderBottom: idx < (weekEntries[selectedDay]?.length ?? 0) - 1 ? "1px solid var(--border)" : "none" }}>
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[idx % COLORS.length] }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{proj?.label ?? entry.projectId}</p>
                            {entry.taskName && <p className="text-xs" style={{ color: "var(--text-3)" }}>{entry.taskName}</p>}
                          </div>
                          <span className="text-sm font-bold" style={{ color: ACCENT }}>{Number(entry.hours).toFixed(1)}h</span>
                          <button onClick={() => removeEntry(selectedDay, idx)} style={{ color: "var(--text-3)" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f87171"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--text-3)"}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                    <div className="flex justify-between px-4 py-2" style={{ background: "var(--surface-raised)" }}>
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>Total du jour</span>
                      <span className="text-sm font-bold" style={{ color: ACCENT }}>
                        {(weekEntries[selectedDay] ?? []).reduce((s, e) => s + Number(e.hours || 0), 0).toFixed(1)}h
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Week summary mini-grid in daily mode */}
              <div className="card p-4">
                <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-2)" }}>Résumé de la semaine</p>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {weekDays.map(({ dateStr, shortLabel }) => {
                    const dt = (weekEntries[dateStr] ?? []).reduce((s, e) => s + Number(e.hours || 0), 0);
                    return (
                      <div key={dateStr}>
                        <p className="text-[10px]" style={{ color: "var(--text-3)" }}>{shortLabel}</p>
                        <p className="text-sm font-bold" style={{ color: dt > 0 ? ACCENT : "var(--text-3)" }}>
                          {dt > 0 ? `${dt.toFixed(0)}h` : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Week total progress + actions ── */}
          {(isEditable || dbStatus === "SUBMITTED" || dbStatus === "APPROVED") && (
            <div className="card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  Total semaine : <span style={{ color: totalWeekHours >= 40 ? "#4ade80" : ACCENT }}>{totalWeekHours.toFixed(1)}h</span> / 40h
                </span>
                <span className="text-xs font-medium" style={{ color: totalWeekHours >= 40 ? "#4ade80" : "var(--text-3)" }}>
                  {totalWeekHours >= 40 ? "✓ Objectif atteint" : `${(40 - totalWeekHours).toFixed(1)}h restantes`}
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden" style={{ background: "var(--surface-raised)" }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalWeekHours / 40) * 100)}%`, background: totalWeekHours >= 40 ? "#22c55e" : ACCENT }} />
              </div>
            </div>
          )}

          {/* Feedback */}
          {msg && (
            <div className="flex items-center gap-2 rounded-xl p-3 text-xs"
              style={{
                background: msg.type === "ok" ? "rgba(34,197,94,0.1)" : msg.type === "err" ? "rgba(239,68,68,0.1)" : "rgba(249,115,22,0.1)",
                color: msg.type === "ok" ? "#4ade80" : msg.type === "err" ? "#f87171" : ACCENT,
                border: `1px solid ${msg.type === "ok" ? "rgba(34,197,94,0.2)" : msg.type === "err" ? "rgba(239,68,68,0.2)" : "rgba(249,115,22,0.2)"}`,
              }}>
              {msg.type === "ok" ? <CheckCircle size={13} /> : <AlertCircle size={13} />}
              {msg.text}
            </div>
          )}

          {/* Action buttons */}
          {isEditable && (
            <div className="flex gap-3">
              {isDirty && (
                <button onClick={saveDraft} disabled={saving} className="btn-ghost">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Sauvegarder brouillon
                </button>
              )}
              <button onClick={submitWeek} disabled={saving || totalWeekHours === 0} className="btn-primary">
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {dbStatus === "REJECTED" ? "Corriger & Soumettre" : "Soumettre la semaine"}
              </button>
            </div>
          )}

          {/* No projects warning */}
          {projects.filter(p => p.status === "IN_PROGRESS").length === 0 && !kpiLoading && (
            <div className="flex items-center gap-2 rounded-xl p-3 text-xs"
              style={{ background: "rgba(234,179,8,0.1)", color: "#fbbf24", border: "1px solid rgba(234,179,8,0.2)" }}>
              <AlertCircle size={13} /> Aucun projet actif assigné. Contactez votre manager pour être ajouté à un projet.
            </div>
          )}
        </div>
      )}

      {/* ── HISTORY TAB ────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-4">
          {/* Status breakdown mini-KPIs */}
          <div className="grid grid-cols-4 gap-3">
            {(["APPROVED", "SUBMITTED", "REJECTED", "DRAFT"] as const).map(s => (
              <div key={s} className="stat-card" style={{ padding: 14 }}>
                <p className="stat-label" style={{ fontSize: 10 }}>{STATUS_CONFIG[s]?.label}</p>
                <p className="stat-value" style={{ fontSize: 20, color: STATUS_CONFIG[s]?.color }}>
                  {historyLoading ? "…" : statusBars[s] ?? 0}
                </p>
              </div>
            ))}
          </div>

          <div className="card overflow-hidden">
            <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--border)" }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>Mes feuilles de temps</p>
                <p className="text-xs" style={{ color: "var(--text-3)" }}>{history.length} feuille{history.length !== 1 ? "s" : ""} au total</p>
              </div>
              <button onClick={loadHistory} disabled={historyLoading} className="btn-ghost" style={{ padding: "5px 10px" }}>
                <RefreshCw size={13} className={historyLoading ? "animate-spin" : ""} />
              </button>
            </div>

            {historyLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} />
              </div>
            ) : history.length === 0 ? (
              <div className="empty-state">
                <Clock size={32} style={{ opacity: 0.2 }} />
                <p className="text-sm" style={{ color: "var(--text-2)" }}>Aucune feuille enregistrée</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Commencez par saisir votre première semaine</p>
              </div>
            ) : (
              <div>
                {[...history]
                  .sort((a, b) => new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime())
                  .map((item, i) => (
                    <div key={item.id} style={{ borderBottom: i < history.length - 1 ? "1px solid var(--border)" : "none" }}>
                      <div
                        className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition"
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--surface-raised)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                      >
                        {/* Color dot */}
                        <div className="w-1 h-10 rounded-full flex-shrink-0"
                          style={{ background: STATUS_CONFIG[item.status]?.color ?? "var(--border)" }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                            Semaine du {fmtDateFR(item.weekStartDate)}
                          </p>
                          {item.decisionComment && (
                            <p className="text-xs mt-0.5 italic" style={{ color: "#f87171" }}>"{item.decisionComment}"</p>
                          )}
                          {item.entries?.length ? (
                            <p className="text-[11px] mt-0.5" style={{ color: "var(--text-3)" }}>
                              {item.entries.length} entrée{item.entries.length > 1 ? "s" : ""}
                              {item.entries[0]?.project?.name ? ` · ${item.entries[0].project.name}` : ""}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-bold" style={{ color: "var(--text-1)" }}>{Number(item.totalHours ?? 0).toFixed(1)}h</p>
                            {Number(item.overtimeHours) > 0 && (
                              <p className="text-[10px]" style={{ color: "#eab308" }}>+{Number(item.overtimeHours).toFixed(1)}h supp.</p>
                            )}
                          </div>
                          <StatusBadge status={item.status} />
                          <ChevronRight size={14} style={{ color: "var(--text-3)", transform: expandedId === item.id ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                        </div>
                      </div>

                      {/* Expanded entries */}
                      {expandedId === item.id && item.entries && item.entries.length > 0 && (
                        <div className="px-5 pb-4" style={{ background: "var(--surface-raised)" }}>
                          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                            <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide"
                              style={{ borderBottom: "1px solid var(--border)", color: "var(--text-3)", background: "var(--surface)" }}>
                              <span>Date</span><span>Tâche / Projet</span><span className="text-right">Heures</span>
                            </div>
                            {item.entries.map((en, ei) => (
                              <div key={en.id} className="grid grid-cols-3 items-center px-4 py-2.5 text-xs"
                                style={{ borderBottom: ei < (item.entries?.length ?? 0) - 1 ? "1px solid var(--border)" : "none", color: "var(--text-2)" }}>
                                <span style={{ color: "var(--text-3)" }}>{fmtDateFR(en.entryDate)}</span>
                                <span className="truncate">{en.project?.name ?? "—"}{en.taskName ? ` · ${en.taskName}` : ""}</span>
                                <span className="text-right font-semibold" style={{ color: "var(--text-1)" }}>{Number(en.hours ?? 0).toFixed(1)}h</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── STATS TAB ──────────────────────────────────────────────────────── */}
      {tab === "stats" && (
        <div className="space-y-4">
          {/* Month selector */}
          <div className="flex items-center gap-3">
            <button onClick={prevStatsMonth} className="btn-ghost" style={{ padding: "5px 10px" }}><ChevronLeft size={15} /></button>
            <span className="text-sm font-semibold px-2" style={{ color: "var(--text-1)", minWidth: 140, textAlign: "center" }}>
              {FR_MONTHS[statsMonth - 1]} {statsYear}
            </span>
            <button onClick={nextStatsMonth} className="btn-ghost" style={{ padding: "5px 10px" }}><ChevronRight size={15} /></button>
            <button onClick={loadStats} disabled={statsLoading} className="btn-ghost" style={{ padding: "5px 10px" }}>
              <RefreshCw size={13} className={statsLoading ? "animate-spin" : ""} />
            </button>
          </div>

          {statsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} />
            </div>
          ) : !monthlyReport ? (
            <div className="empty-state">
              <Clock size={32} style={{ opacity: 0.2 }} />
              <p className="text-sm" style={{ color: "var(--text-2)" }}>Aucune donnée pour cette période</p>
              <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>Soumettez des feuilles pour voir vos statistiques</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="stat-card">
                  <p className="stat-label">Feuilles</p>
                  <p className="stat-value">{monthlyReport.totalTimesheets}</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>ce mois</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Total heures</p>
                  <p className="stat-value" style={{ color: ACCENT }}>{Number(monthlyReport.totalHours).toFixed(1)}h</p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>{FR_MONTHS[statsMonth - 1]}</p>
                </div>
                <div className="stat-card">
                  <p className="stat-label">Heures supp.</p>
                  <p className="stat-value" style={{ color: Number(monthlyReport.overtimeHours) > 0 ? "#eab308" : "#4ade80" }}>
                    {Number(monthlyReport.overtimeHours).toFixed(1)}h
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-3)" }}>au-delà de 40h/sem</p>
                </div>
              </div>

              {/* Chart + breakdown */}
              {monthlyReport.byProject.length > 0 ? (
                <div className="card p-5">
                  <p className="text-sm font-semibold mb-4" style={{ color: "var(--text-1)" }}>
                    Répartition par projet — {FR_MONTHS[statsMonth - 1]} {statsYear}
                  </p>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={monthlyReport.byProject.map(p => ({
                        name: p.projectName.length > 18 ? p.projectName.slice(0, 16) + "…" : p.projectName,
                        hours: Number(Number(p.hours).toFixed(1)),
                      }))}
                      layout="vertical"
                      margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: "var(--text-3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fill: "var(--text-2)", fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="hours" name="heures" radius={[0, 6, 6, 0]} maxBarSize={14}>
                        {monthlyReport.byProject.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Table */}
                  <div className="mt-4 rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                    <div className="grid grid-cols-3 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide"
                      style={{ borderBottom: "1px solid var(--border)", color: "var(--text-3)", background: "var(--surface-raised)" }}>
                      <span>Projet</span><span className="text-center">Part</span><span className="text-right">Heures</span>
                    </div>
                    {[...monthlyReport.byProject].sort((a, b) => Number(b.hours) - Number(a.hours)).map((p, i) => (
                      <div key={p.projectName} className="grid grid-cols-3 items-center px-4 py-2.5 text-xs"
                        style={{ borderBottom: i < monthlyReport.byProject.length - 1 ? "1px solid var(--border)" : "none" }}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="truncate" style={{ color: "var(--text-2)" }}>{p.projectName}</span>
                        </div>
                        <span className="text-center" style={{ color: "var(--text-3)" }}>
                          {Number(monthlyReport.totalHours) > 0
                            ? Math.round((Number(p.hours) / Number(monthlyReport.totalHours)) * 100)
                            : 0}%
                        </span>
                        <span className="text-right font-semibold" style={{ color: "var(--text-1)" }}>{Number(p.hours).toFixed(1)}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <p className="text-xs" style={{ color: "var(--text-3)" }}>Aucune répartition par projet disponible</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
