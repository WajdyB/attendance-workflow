"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  FileCheck,
  RefreshCw,
  User,
  Calendar,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { LeaveRequest, LEAVE_TYPE_LABELS } from "@/components/requests/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimesheetEntry {
  id: string;
  date: string;
  projectId?: string;
  project?: { name: string; code: string };
  hoursWorked: number;
  description?: string;
}

interface PendingTimesheet {
  id: string;
  weekStartDate: string;
  status: string;
  totalHours: number;
  submittedAt?: string;
  collaborator?: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      jobTitle?: string;
      department?: { name: string };
    };
  };
  entries?: TimesheetEntry[];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ApprovalsPage() {
  const { databaseUser } = useAuth();
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const managerId = databaseUser?.id ?? "";
  const [tab, setTab] = useState<"leaves" | "timesheets">("leaves");
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  if (!managerId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{t("Centre d'approbations", "Approvals Center")}</h1>
          <p className="page-subtitle">
            {t(
              "Gérez les demandes de congés et les feuilles de temps en attente",
              "Manage pending leave requests and timesheets"
            )}
          </p>
        </div>
        <button onClick={refresh} className="btn-ghost">
          <RefreshCw size={14} />
          {t("Rafraîchir", "Refresh")}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button
          className={`tab ${tab === "leaves" ? "tab-active" : ""}`}
          onClick={() => setTab("leaves")}
        >
          <Clock size={15} />
          {t("Congés & Absences", "Leave & Absences")}
        </button>
        <button
          className={`tab ${tab === "timesheets" ? "tab-active" : ""}`}
          onClick={() => setTab("timesheets")}
        >
          <FileCheck size={15} />
          {t("Feuilles de temps", "Timesheets")}
        </button>
      </div>

      {/* Content */}
      {tab === "leaves" ? (
        <LeaveApprovalsPanel key={`leaves-${refreshKey}`} managerId={managerId} language={language} t={t} />
      ) : (
        <TimesheetApprovalsPanel key={`ts-${refreshKey}`} managerId={managerId} language={language} t={t} />
      )}
    </div>
  );
}

// ─── Leave Approvals Panel ────────────────────────────────────────────────────

function LeaveApprovalsPanel({
  managerId,
  language,
  t,
}: {
  managerId: string;
  language: string;
  t: (fr: string, en: string) => string;
}) {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ req: LeaveRequest; action: "approve" | "reject" } | null>(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<LeaveRequest[]>(apiConfig.endpoints.requests.pendingForManager(managerId))
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  }, [managerId]);

  useEffect(() => { load(); }, [load]);

  const decide = async () => {
    if (!modal) return;
    setDeciding(true);
    try {
      const ep =
        modal.action === "approve"
          ? apiConfig.endpoints.requests.approve(modal.req.id)
          : apiConfig.endpoints.requests.reject(modal.req.id);
      await apiClient.post(ep, { managerId, decisionComment: comment || undefined });
      setRequests((prev) => prev.filter((r) => r.id !== modal.req.id));
      setModal(null);
      setComment("");
    } finally {
      setDeciding(false);
    }
  };

  const fmt = (d?: string) =>
    d ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

  const approved = requests.filter((r) => r.status === "APPROVED").length;
  const pending = requests.filter((r) => !["APPROVED", "REJECTED", "CANCELLED"].includes(r.status ?? "")).length;

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="stat-card">
          <p className="stat-label">{t("En attente", "Pending")}</p>
          <p className="stat-value">{loading ? "—" : pending}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t("Total reçu", "Total received")}</p>
          <p className="stat-value">{loading ? "—" : requests.length}</p>
        </div>
        <div className="stat-card sm:col-span-1 col-span-2">
          <p className="stat-label">{t("Jours cumulés demandés", "Total days requested")}</p>
          <p className="stat-value">
            {loading ? "—" : requests.reduce((s, r) => s + (r.workingDaysCount ?? 0), 0)}
          </p>
        </div>
      </div>

      {/* Requests list */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              {t("Demandes en attente", "Pending requests")}
            </h3>
          </div>
          {pending > 0 && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
            >
              {pending}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle size={40} style={{ color: "var(--text-3)" }} className="opacity-30" />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              {t("Aucune demande en attente", "No pending requests")}
            </p>
          </div>
        ) : (
          <div>
            {requests.map((req, idx) => {
              const label = req.leaveType ? LEAVE_TYPE_LABELS[req.leaveType] : null;
              return (
                <div
                  key={req.id}
                  className="px-5 py-4"
                  style={{ borderBottom: idx < requests.length - 1 ? "1px solid var(--border)" : undefined }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                        style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        {req.submitter?.firstName?.[0]?.toUpperCase() ?? <User size={14} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                          {req.submitter?.firstName} {req.submitter?.lastName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>
                          {req.submitter?.department?.name ?? req.submitter?.jobTitle ?? "—"}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setModal({ req, action: "reject" }); setComment(""); }}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors"
                        style={{ borderColor: "color-mix(in srgb, #ef4444 30%, transparent)", color: "#ef4444", background: "color-mix(in srgb, #ef4444 8%, transparent)" }}
                      >
                        <XCircle size={13} />
                        {t("Rejeter", "Reject")}
                      </button>
                      <button
                        onClick={() => { setModal({ req, action: "approve" }); setComment(""); }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer"
                        style={{ background: "#22c55e", color: "#fff" }}
                      >
                        <CheckCircle size={13} />
                        {t("Approuver", "Approve")}
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {label && (
                      <span className="rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ backgroundColor: label.color }}>
                        {language === "fr" ? label.fr : label.en}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
                      <Calendar size={11} />
                      {fmt(req.leaveStartDate)} → {fmt(req.leaveEndDate)}
                    </span>
                    {req.workingDaysCount !== undefined && (
                      <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ background: "var(--bg)", color: "var(--text-2)" }}>
                        {req.workingDaysCount} {t("j. ouvrables", "working days")}
                      </span>
                    )}
                  </div>

                  {req.comment && (
                    <p className="mt-2 rounded-lg px-3 py-2 text-xs italic" style={{ background: "var(--bg)", color: "var(--text-2)" }}>
                      "{req.comment}"
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              {modal.action === "approve" ? (
                <CheckCircle size={20} style={{ color: "#22c55e" }} />
              ) : (
                <AlertCircle size={20} style={{ color: "#ef4444" }} />
              )}
              <h3 className="font-semibold" style={{ color: "var(--text-1)" }}>
                {modal.action === "approve" ? t("Approuver la demande", "Approve request") : t("Rejeter la demande", "Reject request")}
              </h3>
            </div>

            <div className="rounded-lg p-3 mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                {modal.req.submitter?.firstName} {modal.req.submitter?.lastName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                {modal.req.leaveType && LEAVE_TYPE_LABELS[modal.req.leaveType]
                  ? language === "fr" ? LEAVE_TYPE_LABELS[modal.req.leaveType].fr : LEAVE_TYPE_LABELS[modal.req.leaveType].en
                  : modal.req.requestType}
                {" • "}{fmt(modal.req.leaveStartDate)} → {fmt(modal.req.leaveEndDate)}
                {modal.req.workingDaysCount ? ` (${modal.req.workingDaysCount} ${t("j.", "d.")})` : ""}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
                {t("Commentaire", "Comment")}
                {modal.action === "reject" && (
                  <span className="ml-1 text-xs" style={{ color: "#ef4444" }}>({t("recommandé", "recommended")})</span>
                )}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={modal.action === "reject"
                  ? t("Indiquez le motif du rejet...", "Provide a reason...")
                  : t("Commentaire optionnel...", "Optional comment...")}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setModal(null)} className="btn-ghost">{t("Annuler", "Cancel")}</button>
              <button
                onClick={decide}
                disabled={deciding}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: modal.action === "approve" ? "#22c55e" : "#ef4444" }}
              >
                {deciding && <Loader2 size={14} className="animate-spin" />}
                {modal.action === "approve" ? t("Confirmer", "Confirm") : t("Rejeter", "Reject")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Timesheet Approvals Panel ────────────────────────────────────────────────

function TimesheetApprovalsPanel({
  managerId,
  language,
  t,
}: {
  managerId: string;
  language: string;
  t: (fr: string, en: string) => string;
}) {
  const [timesheets, setTimesheets] = useState<PendingTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    apiClient
      .get<PendingTimesheet[]>(apiConfig.endpoints.timesheets.submittedForManager(managerId))
      .then((res) => setTimesheets(Array.isArray(res) ? res : []))
      .catch(() => setTimesheets([]))
      .finally(() => setLoading(false));
  }, [managerId]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: "approve" | "reject") => {
    setActing(id);
    try {
      const ep = action === "approve"
        ? apiConfig.endpoints.timesheets.approve(id)
        : apiConfig.endpoints.timesheets.reject(id);
      await apiClient.post(ep, { managerId, comment: comment[id] || undefined });
      setTimesheets((prev) => prev.filter((ts) => ts.id !== id));
    } finally {
      setActing(null);
    }
  };

  const fmtWeek = (d?: string) =>
    d ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", { day: "2-digit", month: "short" }) : "—";

  const totalHours = timesheets.reduce((s, ts) => s + (ts.totalHours ?? 0), 0);
  const uniqueCollabs = new Set(timesheets.map((ts) => ts.collaborator?.user?.id)).size;

  return (
    <>
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card">
          <p className="stat-label">{t("En attente", "Pending")}</p>
          <p className="stat-value">{loading ? "—" : timesheets.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t("Heures totales", "Total hours")}</p>
          <p className="stat-value">{loading ? "—" : `${totalHours}h`}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">{t("Collaborateurs", "Collaborators")}</p>
          <p className="stat-value">{loading ? "—" : uniqueCollabs}</p>
        </div>
      </div>

      {/* List */}
      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <FileCheck size={16} style={{ color: "var(--accent)" }} />
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
            {t("Feuilles de temps soumises", "Submitted timesheets")}
          </h3>
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : timesheets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <CheckCircle size={40} style={{ color: "var(--text-3)" }} className="opacity-30" />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              {t("Aucune feuille de temps en attente", "No timesheets pending approval")}
            </p>
          </div>
        ) : (
          <div>
            {timesheets.map((ts, idx) => {
              const user = ts.collaborator?.user;
              const isExpanded = expanded === ts.id;
              return (
                <div
                  key={ts.id}
                  style={{ borderBottom: idx < timesheets.length - 1 ? "1px solid var(--border)" : undefined }}
                >
                  {/* Row header */}
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold"
                          style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                        >
                          {user?.firstName?.[0]?.toUpperCase() ?? <User size={14} />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                            {user ? `${user.firstName} ${user.lastName}` : t("Collaborateur", "Collaborator")}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-3)" }}>
                            {user?.department?.name ?? user?.jobTitle ?? "—"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs font-medium" style={{ color: "var(--text-1)" }}>
                            {t("Semaine du", "Week of")} {fmtWeek(ts.weekStartDate)}
                          </p>
                          <p className="text-xs" style={{ color: "var(--text-3)" }}>
                            {ts.totalHours ?? 0}h {t("déclarées", "logged")}
                          </p>
                        </div>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : ts.id)}
                          className="btn-ghost py-1.5 px-2"
                        >
                          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Inline comment + actions */}
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <MessageSquare size={13} style={{ color: "var(--text-3)", flexShrink: 0 }} />
                        <input
                          type="text"
                          value={comment[ts.id] ?? ""}
                          onChange={(e) => setComment((prev) => ({ ...prev, [ts.id]: e.target.value }))}
                          placeholder={t("Commentaire optionnel...", "Optional comment...")}
                          className="flex-1 min-w-0 rounded-lg px-3 py-1.5 text-xs outline-none"
                          style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
                        />
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => act(ts.id, "reject")}
                          disabled={acting === ts.id}
                          className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
                          style={{ borderColor: "color-mix(in srgb, #ef4444 30%, transparent)", color: "#ef4444", background: "color-mix(in srgb, #ef4444 8%, transparent)" }}
                        >
                          {acting === ts.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />}
                          {t("Rejeter", "Reject")}
                        </button>
                        <button
                          onClick={() => act(ts.id, "approve")}
                          disabled={acting === ts.id}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
                          style={{ background: "#22c55e", color: "#fff" }}
                        >
                          {acting === ts.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={13} />}
                          {t("Approuver", "Approve")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded entries */}
                  {isExpanded && ts.entries && ts.entries.length > 0 && (
                    <div className="px-5 pb-4" style={{ borderTop: "1px solid var(--border)", background: "var(--bg)" }}>
                      <p className="py-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-3)" }}>
                        {t("Détail des entrées", "Entry details")}
                      </p>
                      <div className="space-y-1">
                        {ts.entries.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "var(--surface)" }}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-xs" style={{ color: "var(--text-3)" }}>
                                {new Date(entry.date).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", { weekday: "short", day: "2-digit", month: "short" })}
                              </span>
                              <span className="text-xs font-medium truncate" style={{ color: "var(--text-2)" }}>
                                {entry.project?.name ?? "—"}
                              </span>
                              {entry.description && (
                                <span className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                                  — {entry.description}
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-semibold flex-shrink-0" style={{ color: "var(--accent)" }}>
                              {entry.hoursWorked}h
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
