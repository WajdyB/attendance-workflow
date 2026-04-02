"use client";

import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Users,
  BarChart2,
  Clock,
  Calendar,
  Building2,
  UserPlus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { Project, ProjectMember, ProjectHoursReport, STATUS_META } from "./types";
import { useLanguage } from "@/context/LanguageContext";
import { AppSelect } from "@/components/ui/app-select";

interface CollaboratorOption {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
}

interface Props {
  project: Project;
  isAdmin?: boolean;
  isManager?: boolean;
  onBack: () => void;
  onEdit?: () => void;
}

export default function ProjectDetail({ project: initial, isAdmin, isManager, onBack, onEdit }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const [project, setProject] = useState<Project>(initial);
  const [hoursReport, setHoursReport] = useState<ProjectHoursReport | null>(null);
  const [collaborators, setCollaborators] = useState<CollaboratorOption[]>([]);
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState("");
  const [roleOnProject, setRoleOnProject] = useState("");
  const [loadingHours, setLoadingHours] = useState(true);
  const [addingMember, setAddingMember] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "team" | "hours">("overview");

  useEffect(() => {
    const fetchHours = async () => {
      try {
        const data = await apiClient.get<ProjectHoursReport>(
          apiConfig.endpoints.projects.hours(project.id)
        );
        setHoursReport(data);
      } catch {
        // no hours yet
      } finally {
        setLoadingHours(false);
      }
    };
    fetchHours();
  }, [project.id]);

  useEffect(() => {
    if (!isAdmin && !isManager) return;
    const fetchCollaborators = async () => {
      try {
        const data = await apiClient.get<any>(apiConfig.endpoints.users.all);
        const raw: any[] = Array.isArray(data) ? data : (data as any)?.data ?? [];
        setCollaborators(
          raw
            .filter((u: any) => u.collaborator || u.role?.description?.toLowerCase().includes("collaborator"))
            .map((u: any) => ({
              id: u.collaborator?.id ?? u.id,
              firstName: u.firstName ?? "",
              lastName: u.lastName ?? "",
              jobTitle: u.jobTitle,
            }))
        );
      } catch {
        // silently ignore
      }
    };
    fetchCollaborators();
  }, [isAdmin, isManager]);

  const handleRefreshProject = async () => {
    const fresh = await apiClient.get<Project>(apiConfig.endpoints.projects.byId(project.id));
    setProject(fresh);
  };

  const handleAssign = async () => {
    if (!selectedCollaboratorId) return;
    setAddingMember(true);
    setError(null);
    try {
      await apiClient.post(apiConfig.endpoints.projects.assignMember(project.id), {
        collaboratorId: selectedCollaboratorId,
        roleOnProject: roleOnProject || undefined,
      });
      setSelectedCollaboratorId("");
      setRoleOnProject("");
      await handleRefreshProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Erreur", "Error"));
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (collaboratorId: string) => {
    setRemovingId(collaboratorId);
    try {
      await apiClient.delete(
        apiConfig.endpoints.projects.removeMember(project.id, collaboratorId)
      );
      await handleRefreshProject();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Erreur", "Error"));
    } finally {
      setRemovingId(null);
    }
  };

  const meta = STATUS_META[project.status];
  const totalHoursLogged = hoursReport?.totalHours ?? project.totalHoursLogged ?? 0;
  const usedPct =
    project.budgetHours
      ? Math.round((totalHoursLogged / Number(project.budgetHours)) * 100)
      : null;
  const overBudget = (usedPct ?? 0) > 100;

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";

  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex flex-wrap items-start gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-600 hover:bg-stone-50 cursor-pointer"
        >
          <ArrowLeft size={16} />
          {t("Retour", "Back")}
        </button>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-stone-800">
              {project.name ?? t("Projet sans nom", "Unnamed project")}
            </h1>
            {project.code && (
              <span className="rounded-md bg-stone-100 px-2 py-0.5 text-xs font-mono text-stone-500">
                {project.code}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}>
              <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
              {language === "fr" ? meta.fr : meta.en}
            </span>
          </div>
          {project.client && (
            <p className="mt-1 text-sm text-stone-500">
              <Building2 size={13} className="inline mr-1" />
              {project.client}
            </p>
          )}
        </div>

        {(isAdmin || isManager) && onEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100 cursor-pointer"
          >
            {t("Modifier", "Edit")}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-stone-100">
        {(["overview", "team", "hours"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              activeTab === tab
                ? "border-orange-500 text-orange-700"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab === "overview" && t("Aperçu", "Overview")}
            {tab === "team" && t("Équipe", "Team")}
            {tab === "hours" && t("Heures", "Hours")}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hours budget card */}
          <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm sm:col-span-2">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
              {t("Budget heures", "Hours budget")}
            </p>
            {project.budgetHours ? (
              <>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-2xl font-bold text-stone-800">
                    {totalHoursLogged}
                    <span className="text-base font-normal text-stone-400">
                      /{Number(project.budgetHours)}h
                    </span>
                  </span>
                  <span className={`text-lg font-bold ${overBudget ? "text-red-500" : "text-stone-500"}`}>
                    {usedPct}%
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-stone-100">
                  <div
                    className={`h-2 rounded-full ${overBudget ? "bg-red-500" : "bg-orange-500"}`}
                    style={{ width: `${Math.min(usedPct ?? 0, 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-2xl font-bold text-stone-800">{totalHoursLogged}h</p>
            )}
          </div>

          {/* Team */}
          <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
              {t("Membres", "Members")}
            </p>
            <div className="flex items-center gap-2">
              <Users size={20} className="text-orange-500" />
              <span className="text-2xl font-bold text-stone-800">{project.assignments.length}</span>
            </div>
          </div>

          {/* Budget amount */}
          <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-1">
              {t("Budget montant", "Budget amount")}
            </p>
            <div className="flex items-center gap-2">
              <BarChart2 size={20} className="text-orange-500" />
              <span className="text-2xl font-bold text-stone-800">
                {project.budgetAmount
                  ? `${Number(project.budgetAmount).toLocaleString()} MAD`
                  : "—"}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm sm:col-span-2">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-3">
              {t("Calendrier", "Timeline")}
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <p className="text-stone-400 text-xs">{t("Début", "Start")}</p>
                <p className="font-medium text-stone-700 flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(project.startDate)}
                </p>
              </div>
              <div className="flex-1 h-0.5 bg-stone-100 relative">
                <div className="absolute inset-0 bg-orange-300 rounded-full" style={{ width: "50%" }} />
              </div>
              <div className="text-right">
                <p className="text-stone-400 text-xs">{t("Fin", "End")}</p>
                <p className="font-medium text-stone-700 flex items-center gap-1">
                  <Calendar size={12} /> {formatDate(project.endDate)}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {project.description && (
            <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm sm:col-span-2">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                {t("Description", "Description")}
              </p>
              <p className="text-sm text-stone-600 leading-relaxed">{project.description}</p>
            </div>
          )}

          {/* Lead */}
          {project.lead && (
            <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wide mb-2">
                {t("Chef de projet", "Project lead")}
              </p>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm">
                  {project.lead.firstName[0]}
                </div>
                <span className="text-sm font-medium text-stone-700">
                  {project.lead.firstName} {project.lead.lastName}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TEAM TAB ── */}
      {activeTab === "team" && (
        <div className="space-y-4">
          {/* Assign form */}
          {(isAdmin || isManager) && (
            <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-stone-700">
                {t("Ajouter un membre", "Add member")}
              </h3>
              <div className="flex flex-wrap gap-3">
                <AppSelect<string>
                  id="project-detail-add-member"
                  value={selectedCollaboratorId}
                  onChange={setSelectedCollaboratorId}
                  options={[
                    {
                      value: "",
                      label: t(
                        "— Sélectionner un collaborateur —",
                        "— Select a collaborator —",
                      ),
                    },
                    ...collaborators.map((c) => ({
                      value: c.id,
                      label: `${c.firstName} ${c.lastName}${c.jobTitle ? ` — ${c.jobTitle}` : ""}`,
                    })),
                  ]}
                  ariaLabel={t("Collaborateur", "Collaborator")}
                  tone="default"
                  triggerClassName="flex-1 min-w-[200px]"
                />
                <input
                  type="text"
                  value={roleOnProject}
                  onChange={(e) => setRoleOnProject(e.target.value)}
                  placeholder={t("Rôle sur le projet", "Role on project")}
                  className="flex-1 min-w-[180px] rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
                <button
                  onClick={handleAssign}
                  disabled={!selectedCollaboratorId || addingMember}
                  className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 cursor-pointer disabled:opacity-50"
                >
                  {addingMember ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <UserPlus size={14} />
                  )}
                  {t("Ajouter", "Add")}
                </button>
              </div>
            </div>
          )}

          {/* Member list */}
          <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm overflow-hidden">
            {project.assignments.length === 0 ? (
              <div className="py-10 text-center text-stone-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">{t("Aucun membre assigné", "No members assigned")}</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-stone-50 text-stone-500 text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-4 py-3 text-left">{t("Collaborateur", "Collaborator")}</th>
                    <th className="px-4 py-3 text-left">{t("Département", "Department")}</th>
                    <th className="px-4 py-3 text-left">{t("Rôle projet", "Project role")}</th>
                    <th className="px-4 py-3 text-left">{t("Assigné le", "Assigned on")}</th>
                    {(isAdmin || isManager) && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {project.assignments.map((member) => (
                    <tr key={member.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs">
                            {member.collaborator.user.firstName[0]}
                          </div>
                          <span className="font-medium text-stone-700">
                            {member.collaborator.user.firstName}{" "}
                            {member.collaborator.user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {member.collaborator.user.department?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {member.roleOnProject ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {new Date(member.assignedAt).toLocaleDateString(
                          language === "fr" ? "fr-FR" : "en-GB"
                        )}
                      </td>
                      {(isAdmin || isManager) && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleRemoveMember(member.collaboratorId)}
                            disabled={removingId === member.collaboratorId}
                            className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                          >
                            {removingId === member.collaboratorId ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Trash2 size={14} />
                            )}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── HOURS TAB ── */}
      {activeTab === "hours" && (
        <div className="space-y-4">
          {loadingHours ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-orange-500" />
            </div>
          ) : hoursReport && hoursReport.totalHours > 0 ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm">
                  <p className="text-xs text-stone-400 mb-1">{t("Total heures", "Total hours")}</p>
                  <p className="text-2xl font-bold text-stone-800">{hoursReport.totalHours}h</p>
                </div>
                <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm">
                  <p className="text-xs text-stone-400 mb-1">{t("Entrées", "Entries")}</p>
                  <p className="text-2xl font-bold text-stone-800">{hoursReport.entriesCount}</p>
                </div>
                <div className="rounded-xl border border-orange-100/20 bg-white p-4 shadow-sm">
                  <p className="text-xs text-stone-400 mb-1">{t("Contributeurs", "Contributors")}</p>
                  <p className="text-2xl font-bold text-stone-800">{hoursReport.byCollaborator.length}</p>
                </div>
              </div>

              {/* By collaborator */}
              <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b border-stone-50">
                  <h3 className="text-sm font-semibold text-stone-700">
                    {t("Répartition par collaborateur", "Hours by collaborator")}
                  </h3>
                </div>
                <div className="divide-y divide-stone-50">
                  {hoursReport.byCollaborator.map((c) => {
                    const pct = hoursReport.totalHours > 0
                      ? Math.round((c.hours / hoursReport.totalHours) * 100)
                      : 0;
                    return (
                      <div key={c.userId} className="flex items-center gap-4 px-4 py-3">
                        <div className="h-7 w-7 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-xs flex-shrink-0">
                          {c.firstName[0]}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-stone-700">
                            {c.firstName} {c.lastName}
                          </p>
                          {c.department && (
                            <p className="text-xs text-stone-400">{c.department}</p>
                          )}
                          <div className="mt-1 h-1.5 w-full rounded-full bg-stone-100">
                            <div
                              className="h-1.5 rounded-full bg-orange-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-stone-800">{c.hours}h</p>
                          <p className="text-xs text-stone-400">{pct}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-xl border border-orange-100/20 bg-white py-16 text-stone-400">
              <Clock size={36} className="mb-3 opacity-30" />
              <p className="text-sm">{t("Aucune heure enregistrée", "No hours logged yet")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
