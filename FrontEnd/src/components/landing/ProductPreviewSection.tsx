"use client";

import { useMemo, useState } from "react";
import SectionReveal from "./SectionReveal";
import { useLanguage } from "@/context/LanguageContext";

type PreviewTab = "dashboard" | "timesheets" | "leave" | "projects" | "performance";

const tabDataEn: Record<
  PreviewTab,
  {
    title: string;
    subtitle: string;
    kpis: { label: string; value: string }[];
    rows: { name: string; status: string; metric: string }[];
  }
> = {
  dashboard: {
    title: "Operations Dashboard",
    subtitle: "Daily HR and workforce metrics in one role-based command center.",
    kpis: [
      { label: "Active Employees", value: "142" },
      { label: "Pending Approvals", value: "18" },
      { label: "Weekly Hours", value: "5,294" },
    ],
    rows: [
      { name: "Timesheet Batch", status: "Submitted", metric: "94% complete" },
      { name: "Leave Requests", status: "In Review", metric: "11 pending" },
      { name: "Project Allocation", status: "Balanced", metric: "82% utilization" },
    ],
  },
  timesheets: {
    title: "Weekly Timesheets",
    subtitle: "Track project effort with transparent approval states and lock rules.",
    kpis: [
      { label: "Submitted", value: "87" },
      { label: "Approved", value: "79" },
      { label: "Rejected", value: "8" },
    ],
    rows: [
      { name: "Engineering Team", status: "Approved", metric: "1,126h" },
      { name: "Finance Team", status: "Submitted", metric: "462h" },
      { name: "Marketing Team", status: "Draft", metric: "308h" },
    ],
  },
  leave: {
    title: "Leave Planning",
    subtitle: "Manage leave demand, team coverage, and balance updates in real time.",
    kpis: [
      { label: "Requests This Month", value: "34" },
      { label: "Approved", value: "26" },
      { label: "Remaining PTO", value: "1,184d" },
    ],
    rows: [
      { name: "Summer Window", status: "High Demand", metric: "12 requests" },
      { name: "Operations Team", status: "Stable", metric: "6% absent" },
      { name: "HR Team", status: "Optimal", metric: "2 planned leaves" },
    ],
  },
  projects: {
    title: "Project Time Visibility",
    subtitle: "Compare allocated budgets and actual effort across active initiatives.",
    kpis: [
      { label: "Active Projects", value: "21" },
      { label: "Tracked Hours", value: "8,420" },
      { label: "Over-Budget", value: "3" },
    ],
    rows: [
      { name: "ERP Migration", status: "In Progress", metric: "72% budget used" },
      { name: "Mobile Rollout", status: "On Track", metric: "58% budget used" },
      { name: "BI Reporting", status: "Watch", metric: "89% budget used" },
    ],
  },
  performance: {
    title: "Performance Reviews",
    subtitle: "Review cycles, outcomes, and recommendations with full history context.",
    kpis: [
      { label: "Reviews Completed", value: "96" },
      { label: "In Progress", value: "23" },
      { label: "Goal Alignment", value: "88%" },
    ],
    rows: [
      { name: "Q1 Review Cycle", status: "Running", metric: "67% complete" },
      { name: "Leadership Track", status: "Scheduled", metric: "14 employees" },
      { name: "Compensation Review", status: "Draft", metric: "9 proposals" },
    ],
  },
};

const tabDataFr: typeof tabDataEn = {
  dashboard: {
    title: "Tableau de bord opérations",
    subtitle: "Indicateurs RH et effectifs quotidiens dans un centre de pilotage par rôle.",
    kpis: [
      { label: "Employés actifs", value: "142" },
      { label: "Approbations en attente", value: "18" },
      { label: "Heures hebdomadaires", value: "5,294" },
    ],
    rows: [
      { name: "Lot de feuilles de temps", status: "Soumis", metric: "94% complété" },
      { name: "Demandes de congé", status: "En revue", metric: "11 en attente" },
      { name: "Allocation projet", status: "Équilibrée", metric: "82% d'utilisation" },
    ],
  },
  timesheets: {
    title: "Feuilles de temps hebdomadaires",
    subtitle: "Suivez l'effort projet avec des états d'approbation transparents.",
    kpis: [
      { label: "Soumises", value: "87" },
      { label: "Approuvées", value: "79" },
      { label: "Rejetées", value: "8" },
    ],
    rows: [
      { name: "Équipe Engineering", status: "Approuvé", metric: "1,126h" },
      { name: "Équipe Finance", status: "Soumis", metric: "462h" },
      { name: "Équipe Marketing", status: "Brouillon", metric: "308h" },
    ],
  },
  leave: {
    title: "Planification des congés",
    subtitle: "Gérez la demande, la couverture équipe et la mise à jour des soldes en temps réel.",
    kpis: [
      { label: "Demandes ce mois", value: "34" },
      { label: "Approuvées", value: "26" },
      { label: "Jours restants", value: "1,184j" },
    ],
    rows: [
      { name: "Période été", status: "Forte demande", metric: "12 demandes" },
      { name: "Équipe Opérations", status: "Stable", metric: "6% absent" },
      { name: "Équipe RH", status: "Optimal", metric: "2 congés planifiés" },
    ],
  },
  projects: {
    title: "Visibilité du temps projet",
    subtitle: "Comparez budgets alloués et effort réel sur les initiatives actives.",
    kpis: [
      { label: "Projets actifs", value: "21" },
      { label: "Heures suivies", value: "8,420" },
      { label: "Dépassements budget", value: "3" },
    ],
    rows: [
      { name: "Migration ERP", status: "En cours", metric: "72% budget utilisé" },
      { name: "Déploiement mobile", status: "Sur la bonne voie", metric: "58% budget utilisé" },
      { name: "Reporting BI", status: "À surveiller", metric: "89% budget utilisé" },
    ],
  },
  performance: {
    title: "Évaluations de performance",
    subtitle: "Suivez cycles, résultats et recommandations avec historique complet.",
    kpis: [
      { label: "Évaluations terminées", value: "96" },
      { label: "En cours", value: "23" },
      { label: "Alignement objectifs", value: "88%" },
    ],
    rows: [
      { name: "Cycle T1", status: "En cours", metric: "67% complété" },
      { name: "Parcours leadership", status: "Planifié", metric: "14 employés" },
      { name: "Revue salariale", status: "Brouillon", metric: "9 propositions" },
    ],
  },
};

export default function ProductPreviewSection() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<PreviewTab>("dashboard");
  const tabLabels = useMemo(
    () =>
      language === "fr"
        ? [
            { id: "dashboard" as PreviewTab, label: "Tableau de bord" },
            { id: "timesheets" as PreviewTab, label: "Feuilles de temps" },
            { id: "leave" as PreviewTab, label: "Calendrier congés" },
            { id: "projects" as PreviewTab, label: "Projets" },
            { id: "performance" as PreviewTab, label: "Performance" },
          ]
        : [
            { id: "dashboard" as PreviewTab, label: "Dashboard" },
            { id: "timesheets" as PreviewTab, label: "Timesheets" },
            { id: "leave" as PreviewTab, label: "Leave Calendar" },
            { id: "projects" as PreviewTab, label: "Projects" },
            { id: "performance" as PreviewTab, label: "Performance" },
          ],
    [language],
  );

  const data = useMemo(
    () => (language === "fr" ? tabDataFr[activeTab] : tabDataEn[activeTab]),
    [activeTab, language],
  );

  return (
    <SectionReveal className="space-y-6">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-orange-700">
          {language === "fr" ? "Aperçu produit" : "Product Preview"}
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-stone-900">{language === "fr" ? "Explorez les espaces clés" : "Explore key workspaces"}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-stone-600 md:text-base">
          {language === "fr"
            ? "Naviguez entre les zones majeures du produit pour visualiser l'expérience opérationnelle des équipes RH, managers et collaborateurs."
            : "Switch between major product areas to preview the operational experience for HR teams, managers, and employees."}
        </p>
      </div>

      <div className="mx-auto w-full max-w-5xl rounded-2xl border border-orange-100 bg-white/90 p-3 backdrop-blur-sm">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
          {tabLabels.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.id
                  ? "bg-orange-600 text-white"
                  : "bg-orange-50 text-stone-600 hover:bg-orange-100"
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-xl border border-orange-100 bg-white p-5 md:p-6">
          <div className="transition-all duration-300">
            <h3 className="text-lg font-semibold text-stone-900">{data.title}</h3>
            <p className="mt-1 text-sm text-stone-600">{data.subtitle}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {data.kpis.map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-orange-100 bg-gradient-to-br from-orange-50 to-white p-4"
                >
                  <p className="text-xs uppercase tracking-wide text-stone-500">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-900">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-orange-100">
              <table className="w-full text-left text-sm">
                <thead className="bg-orange-50 text-stone-600">
                  <tr>
                    <th className="px-4 py-3 font-medium">{language === "fr" ? "Zone" : "Area"}</th>
                    <th className="px-4 py-3 font-medium">{language === "fr" ? "Statut" : "Status"}</th>
                    <th className="px-4 py-3 font-medium">{language === "fr" ? "Indicateur" : "Metric"}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.name} className="border-t border-orange-100">
                      <td className="px-4 py-3 text-stone-900">{row.name}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                          {row.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-600">{row.metric}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </SectionReveal>
  );
}

