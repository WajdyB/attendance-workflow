"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Star, TrendingUp, BarChart2 } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { Evaluation, SalaryHistory } from "@/components/performance/types";
import EvaluationList from "@/components/performance/evaluation-list";
import EvaluationForm from "@/components/performance/evaluation-form";
import SalaryHistoryList from "@/components/performance/salary-history-list";
import PerformanceReports from "@/components/performance/performance-reports";

type Tab = "evaluations" | "salary" | "reports";

interface CollaboratorOption {
  id: string;
  user: { firstName: string; lastName: string; jobTitle?: string };
}

export default function PerformancePage() {
  const { databaseUser, isLoading: authLoading } = useAuth();
  const { language } = useLanguage();
  const tl = (fr: string, en: string) => (language === "fr" ? fr : en);

  const role = (databaseUser?.role?.description ?? databaseUser?.role?.name ?? "").toUpperCase();
  const isAdmin = role.includes("ADMIN");
  const isManager = role.includes("MANAGER");
  const isCollaborator = !isAdmin && !isManager && !!databaseUser;

  const [tab, setTab] = useState<Tab>("evaluations");
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistory[]>([]);
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEvaluation, setEditEvaluation] = useState<Evaluation | null>(null);

  // Collaborator-specific: their own ID from the collaborator table
  const [myCollaboratorId, setMyCollaboratorId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!databaseUser) return;
    setLoading(true);
    try {
      if (isCollaborator) {
        // Fetch evaluations directly by collaborator endpoint (uses user id as collaborator id)
        const [myEvalsRes, salaryRes] = await Promise.allSettled([
          apiClient.get<Evaluation[]>(
            apiConfig.endpoints.evaluations.byCollaborator(databaseUser.id)
          ),
          apiClient.get<SalaryHistory[]>(
            apiConfig.endpoints.evaluations.salaryByUser(databaseUser.id)
          ),
        ]);

        const mine = myEvalsRes.status === "fulfilled"
          ? (Array.isArray(myEvalsRes.value) ? myEvalsRes.value : [])
          : [];
        setEvaluations(mine);

        if (mine.length > 0) {
          setMyCollaboratorId(mine[0].collaboratorId ?? mine[0].id ?? null);
        }

        if (salaryRes.status === "fulfilled") {
          setSalaryHistory(Array.isArray(salaryRes.value) ? salaryRes.value : []);
        }
      } else if (isManager) {
        // Manager: evaluations they created
        const evals = await apiClient.get<Evaluation[]>(
          apiConfig.endpoints.evaluations.all({ managerId: databaseUser.id })
        );
        setEvaluations(evals);

        // Get their collaborators — response is { message, collaborators: User[] }
        const collabsRes = await apiClient.get<any>(
          apiConfig.endpoints.users.getSupervisedCollaborators(databaseUser.id)
        ).catch(() => null);
        const collabUsers: any[] = collabsRes?.collaborators ?? (Array.isArray(collabsRes) ? collabsRes : []);
        setCollaborators(
          collabUsers.map((u: any) => ({
            id: u.collaborator?.id ?? u.id,
            user: { firstName: u.firstName, lastName: u.lastName, jobTitle: u.jobTitle },
          }))
        );
      } else if (isAdmin) {
        const [evals, allSalary, allCollabs] = await Promise.allSettled([
          apiClient.get<Evaluation[]>(apiConfig.endpoints.evaluations.all()),
          apiClient.get<SalaryHistory[]>(apiConfig.endpoints.evaluations.salaryAll()),
          apiClient.get<any[]>(apiConfig.endpoints.users.all),
        ]);
        if (evals.status === "fulfilled") setEvaluations(evals.value);
        if (allSalary.status === "fulfilled") setSalaryHistory(allSalary.value);
        if (allCollabs.status === "fulfilled") {
          const raw = Array.isArray(allCollabs.value) ? allCollabs.value : (allCollabs.value as any)?.data ?? [];
          setCollaborators(
            raw
              .filter((u: any) => u.collaborator)
              .map((u: any) => ({
                id: u.collaborator.id ?? u.id,
                user: { firstName: u.firstName, lastName: u.lastName, jobTitle: u.jobTitle },
              }))
          );
        }
      }
    } catch {
      // silently show empty state
    } finally {
      setLoading(false);
    }
  }, [databaseUser, isAdmin, isManager, isCollaborator]);

  useEffect(() => {
    if (databaseUser) fetchData();
  }, [databaseUser, fetchData]);

  const handleEvalCreated = (ev: Evaluation) => {
    setEvaluations((prev) => {
      const idx = prev.findIndex((e) => e.id === ev.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = ev;
        return next;
      }
      return [ev, ...prev];
    });
  };

  const handleDelete = async (ev: Evaluation) => {
    if (
      !confirm(
        language === "fr"
          ? "Supprimer cette évaluation ?"
          : "Delete this evaluation?"
      )
    )
      return;
    try {
      await apiClient.delete(apiConfig.endpoints.evaluations.delete(ev.id));
      setEvaluations((prev) => prev.filter((e) => e.id !== ev.id));
    } catch {
      // ignore
    }
  };

  if (authLoading || (!databaseUser && !authLoading)) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin" size={28} style={{ color: "var(--accent)" }} />
      </div>
    );
  }

  const tabs: { key: Tab; icon: React.ReactNode; fr: string; en: string }[] = [
    { key: "evaluations", icon: <Star size={15} />, fr: "Évaluations", en: "Evaluations" },
    { key: "salary", icon: <TrendingUp size={15} />, fr: "Historique Salaires", en: "Salary History" },
    ...(isAdmin || isManager
      ? [{ key: "reports" as Tab, icon: <BarChart2 size={15} />, fr: "Rapports", en: "Reports" }]
      : [{ key: "reports" as Tab, icon: <TrendingUp size={15} />, fr: "Mon évolution", en: "My Trend" }]),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{tl("Gestion de la Performance", "Performance Management")}</h1>
          <p className="page-subtitle">
            {isAdmin
              ? tl("Toutes les évaluations, salaires et rapports de performance", "All evaluations, salaries and performance reports")
              : isManager
              ? tl("Évaluez votre équipe et suivez leur progression", "Evaluate your team and track their progress")
              : tl("Vos évaluations et votre historique salarial", "Your evaluations and salary history")}
          </p>
        </div>

        {(isAdmin || isManager) && tab === "evaluations" && (
          <button
            onClick={() => { setEditEvaluation(null); setShowForm(true); }}
            className="btn-primary"
          >
            <Plus size={15} />
            {tl("Nouvelle évaluation", "New evaluation")}
          </button>
        )}
      </div>

      {/* KPI strip */}
      {!loading && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="stat-card">
            <p className="stat-label">{tl("Évaluations", "Evaluations")}</p>
            <p className="stat-value">{evaluations.length}</p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{tl("Note moyenne", "Avg score")}</p>
            <p className="stat-value">
              {evaluations.filter((e) => e.globalScore != null).length > 0
                ? (
                    evaluations.reduce((sum, e) => sum + (e.globalScore ?? 0), 0) /
                    evaluations.filter((e) => e.globalScore != null).length
                  ).toFixed(1)
                : "—"}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{tl("≥ 85 (excellent)", "≥ 85 (excellent)")}</p>
            <p className="stat-value" style={{ color: "var(--success)" }}>
              {evaluations.filter((e) => (e.globalScore ?? 0) >= 85).length}
            </p>
          </div>
          <div className="stat-card">
            <p className="stat-label">{tl("Augmentations", "Salary changes")}</p>
            <p className="stat-value">{salaryHistory.length}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="tab-bar">
        {tabs.map(({ key, icon, fr, en }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`tab ${tab === key ? "active" : ""}`}
          >
            <span className="flex items-center gap-1.5">
              {icon}
              {language === "fr" ? fr : en}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={32} className="animate-spin" style={{ color: "var(--accent)" }} />
        </div>
      ) : tab === "evaluations" ? (
        <EvaluationList
          evaluations={evaluations}
          canEdit={isAdmin || isManager}
          showCollaborator={isAdmin || isManager}
          onEdit={(ev) => {
            setEditEvaluation(ev);
            setShowForm(true);
          }}
          onDelete={handleDelete}
        />
      ) : tab === "salary" ? (
        <SalaryHistoryList
          history={salaryHistory}
          showUser={isAdmin}
        />
      ) : (
        <PerformanceReports
          isAdmin={isAdmin}
          collaboratorId={
            isCollaborator
              ? (myCollaboratorId ?? evaluations[0]?.collaboratorId)
              : undefined
          }
        />
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <EvaluationForm
          editEvaluation={editEvaluation ?? undefined}
          collaborators={collaborators}
          onClose={() => {
            setShowForm(false);
            setEditEvaluation(null);
          }}
          onSuccess={(ev) => {
            handleEvalCreated(ev);
            setShowForm(false);
          }}
        />
      )}
    </div>
  );
}
