"use client";

import { useState } from "react";
import {
  Pencil,
  Trash2,
  Users,
  Clock,
  BarChart2,
  ChevronRight,
  FolderKanban,
  Loader2,
} from "lucide-react";
import { Project, ProjectStatus, STATUS_META } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  projects: Project[];
  isAdmin?: boolean;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onSelect: (project: Project) => void;
}

const STATUS_FILTER_TABS: { key: ProjectStatus | "ALL"; fr: string; en: string }[] = [
  { key: "ALL", fr: "Tous", en: "All" },
  { key: "IN_PROGRESS", fr: "En cours", en: "In Progress" },
  { key: "FINISHED", fr: "Terminés", en: "Finished" },
  { key: "SUSPENDED", fr: "Suspendus", en: "Suspended" },
];

export default function ProjectList({ projects, isAdmin, onEdit, onDelete, onSelect }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");

  const filtered = projects.filter((p) => {
    const matchStatus = filterStatus === "ALL" || p.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.client?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-orange-100/20 bg-white py-16 shadow-sm text-stone-400">
        <FolderKanban size={40} className="mb-3 opacity-30" />
        <p>{t("Aucun projet", "No projects")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {STATUS_FILTER_TABS.map((tab) => {
            const count =
              tab.key === "ALL"
                ? projects.length
                : projects.filter((p) => p.status === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setFilterStatus(tab.key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                  filterStatus === tab.key
                    ? "bg-orange-600 text-white"
                    : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
                }`}
              >
                {language === "fr" ? tab.fr : tab.en}
                <span className="ml-1.5 text-xs opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("Rechercher un projet...", "Search projects...")}
          className="flex-1 min-w-[200px] rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-orange-400"
        />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((project) => {
          const meta = STATUS_META[project.status];
          const usedPct = project.budgetHoursUsedPct ?? 0;
          const overBudget = usedPct > 100;

          return (
            <div
              key={project.id}
              className="group relative rounded-xl border border-orange-100/20 bg-white p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelect(project)}
            >
              {/* Status badge */}
              <div className="flex items-start justify-between mb-3">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
                >
                  <span className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {language === "fr" ? meta.fr : meta.en}
                </span>

                {isAdmin && (
                  <div
                    className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => onEdit?.(project)}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete?.(project)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Name & code */}
              <h3 className="font-semibold text-stone-800 leading-tight">
                {project.name ?? t("Sans nom", "Unnamed")}
              </h3>
              {project.code && (
                <p className="mt-0.5 text-xs text-stone-400 font-mono">{project.code}</p>
              )}
              {project.client && (
                <p className="mt-1 text-xs text-stone-500">
                  🏢 {project.client}
                </p>
              )}

              {/* Dates */}
              <div className="mt-3 flex items-center gap-1 text-xs text-stone-400">
                <Clock size={12} />
                {formatDate(project.startDate)} → {formatDate(project.endDate)}
              </div>

              {/* Stats row */}
              <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1">
                  <Users size={12} />
                  {project.assignments?.length ?? 0} {t("membres", "members")}
                </span>
                {project.totalHoursLogged !== undefined && (
                  <span className="flex items-center gap-1">
                    <BarChart2 size={12} />
                    {project.totalHoursLogged}h {t("loggées", "logged")}
                  </span>
                )}
              </div>

              {/* Budget progress */}
              {project.budgetHours && (
                <div className="mt-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className={overBudget ? "text-red-500 font-medium" : "text-stone-400"}>
                      {project.totalHoursLogged ?? 0}h / {Number(project.budgetHours)}h {t("budget", "budget")}
                    </span>
                    <span className={overBudget ? "text-red-500 font-medium" : "text-stone-400"}>
                      {usedPct}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-stone-100">
                    <div
                      className={`h-1.5 rounded-full transition-all ${overBudget ? "bg-red-500" : "bg-orange-500"}`}
                      style={{ width: `${Math.min(usedPct, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Lead */}
              {project.lead && (
                <div className="mt-3 flex items-center gap-2 text-xs text-stone-400">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-[10px] font-bold">
                    {project.lead.firstName[0]}
                  </div>
                  {project.lead.firstName} {project.lead.lastName}
                </div>
              )}

              <ChevronRight
                size={16}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 group-hover:text-orange-400 transition-colors"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
