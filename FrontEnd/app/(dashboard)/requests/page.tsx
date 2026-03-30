"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, RefreshCw, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { LeaveRequest } from "@/components/requests/types";
import LeaveBalanceCard from "@/components/requests/leave-balance-card";
import LeaveRequestForm from "@/components/requests/leave-request-form";
import LeaveRequestList from "@/components/requests/leave-request-list";
import LeaveCalendar from "@/components/requests/leave-calendar";
import ManagerApprovals from "@/components/requests/manager-approvals";
import HolidayManager from "@/components/requests/holiday-manager";
import BalanceManager from "@/components/requests/balance-manager";
type DashboardView = "admin" | "manager" | "collaborator";

export default function RequestsPage() {
  return <RequestsContent />;
}

function RequestsContent() {
  const { databaseUser } = useAuth();
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const normalizedRole =
    databaseUser?.role?.description?.toLowerCase().trim() ?? "";

  const view: DashboardView = normalizedRole.includes("admin")
    ? "admin"
    : normalizedRole.includes("manager")
      ? "manager"
      : "collaborator";

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeAdminTab, setActiveAdminTab] = useState<
    "requests" | "balances" | "holidays"
  >("requests");

  const userId = databaseUser?.id ?? "";

  const loadRequests = useCallback(() => {
    if (!userId) return;
    setLoadingRequests(true);

    const endpoint =
      view === "admin"
        ? apiConfig.endpoints.requests.allForAdmin
        : apiConfig.endpoints.requests.byUser(userId);

    apiClient
      .get<LeaveRequest[]>(endpoint)
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoadingRequests(false));
  }, [userId, view]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleRequestUpdate = (updated: LeaveRequest) => {
    setRequests((prev) => {
      const exists = prev.find((r) => r.id === updated.id);
      return exists
        ? prev.map((r) => (r.id === updated.id ? updated : r))
        : [updated, ...prev];
    });
  };

  if (!databaseUser) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  // ─── Collaborator View ────────────────────────────────────────────────────

  if (view === "collaborator") {
    return (
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{t("Mes Congés", "My Leave")}</h1>
            <p className="page-subtitle">
              {t(
                "Gérez vos demandes de congé et consultez votre solde",
                "Manage your leave requests and check your balance"
              )}
            </p>
          </div>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus size={15} />
            {t("Nouvelle demande", "New request")}
          </button>
        </div>

        {/* Balance card */}
        <LeaveBalanceCard userId={userId} />

        {/* Requests list */}
        {loadingRequests ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : (
          <LeaveRequestList
            requests={requests}
            userId={userId}
            onUpdate={handleRequestUpdate}
          />
        )}

        {/* Calendar */}
        <LeaveCalendar />

        {/* New request form modal */}
        {showForm && (
          <LeaveRequestForm
            userId={userId}
            onClose={() => setShowForm(false)}
            onSuccess={(req) => {
              handleRequestUpdate(req);
              setShowForm(false);
            }}
          />
        )}
      </div>
    );
  }

  // ─── Manager View ─────────────────────────────────────────────────────────

  if (view === "manager") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="page-title">{t("Congés & Absences", "Leave & Absences")}</h1>
            <p className="page-subtitle">
              {t("Approuvez les demandes et gérez vos propres congés", "Approve requests and manage your own leave")}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(true)} className="btn-primary">
              <Plus size={15} />
              {t("Ma demande", "My request")}
            </button>
            <button onClick={loadRequests} className="btn-ghost">
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Main layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Pending approvals (team requests to decide) */}
            <ManagerApprovals managerId={userId} onUpdate={loadRequests} />

            {/* My own leave balance */}
            <LeaveBalanceCard userId={userId} />

            {/* My own requests */}
            <div className="card overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                  {t("Mes propres demandes", "My own requests")}
                </h3>
              </div>
              {loadingRequests ? (
                <div className="flex h-32 items-center justify-center">
                  <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
                </div>
              ) : (
                <LeaveRequestList requests={requests} userId={userId} onUpdate={handleRequestUpdate} />
              )}
            </div>
          </div>

          <div className="space-y-4">
            <LeaveCalendar />
          </div>
        </div>

        {/* New request form */}
        {showForm && (
          <LeaveRequestForm
            userId={userId}
            onClose={() => setShowForm(false)}
            onSuccess={(req) => { handleRequestUpdate(req); setShowForm(false); }}
          />
        )}
      </div>
    );
  }

  // ─── Admin View ───────────────────────────────────────────────────────────

  const adminTabs = [
    { key: "requests" as const, fr: "Demandes", en: "Requests" },
    { key: "balances" as const, fr: "Soldes", en: "Balances" },
    { key: "holidays" as const, fr: "Jours fériés", en: "Holidays" },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{t("Gestion des Congés", "Leave Management")}</h1>
          <p className="page-subtitle">
            {t(
              "Supervisez toutes les demandes, soldes et jours fériés",
              "Oversee all requests, balances, and public holidays"
            )}
          </p>
        </div>
        <button onClick={loadRequests} className="btn-ghost">
          <RefreshCw size={14} />
          {t("Rafraîchir", "Refresh")}
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: t("Total demandes", "Total requests"), value: requests.length, color: "var(--text-1)" },
          { label: t("En attente", "Pending"), value: requests.filter((r) => r.status === "PENDING").length, color: "var(--warning)" },
          { label: t("Approuvées", "Approved"), value: requests.filter((r) => r.status === "APPROVED").length, color: "var(--success)" },
          { label: t("Rejetées", "Rejected"), value: requests.filter((r) => r.status === "REJECTED").length, color: "var(--danger)" },
        ].map(({ label, value, color }) => (
          <div key={label} className="stat-card">
            <p className="stat-label">{label}</p>
            <p className="stat-value" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tab navigation */}
      <div className="tab-bar">
        {adminTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveAdminTab(tab.key)}
            className={`tab ${activeAdminTab === tab.key ? "active" : ""}`}
          >
            {language === "fr" ? tab.fr : tab.en}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeAdminTab === "requests" && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {loadingRequests ? (
              <div className="flex h-40 items-center justify-center">
                <Loader2 size={24} className="animate-spin" style={{ color: "var(--accent)" }} />
              </div>
            ) : (
              <LeaveRequestList
                requests={requests}
                userId={userId}
                onUpdate={handleRequestUpdate}
                isAdmin
              />
            )}
          </div>
          <div>
            <LeaveCalendar />
          </div>
        </div>
      )}

      {activeAdminTab === "balances" && <BalanceManager />}

      {activeAdminTab === "holidays" && <HolidayManager />}
    </div>
  );
}
