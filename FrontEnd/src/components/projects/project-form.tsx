"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { Project, ProjectStatus, STATUS_META } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface UserOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface Props {
  onClose: () => void;
  onSuccess: (project: Project) => void;
  editProject?: Project;
  users?: UserOption[];
}

export default function ProjectForm({ onClose, onSuccess, editProject, users = [] }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const [name, setName] = useState(editProject?.name ?? "");
  const [code, setCode] = useState(editProject?.code ?? "");
  const [description, setDescription] = useState(editProject?.description ?? "");
  const [client, setClient] = useState(editProject?.client ?? "");
  const [status, setStatus] = useState<ProjectStatus>(editProject?.status ?? "IN_PROGRESS");
  const [startDate, setStartDate] = useState(
    editProject?.startDate ? new Date(editProject.startDate).toISOString().split("T")[0] : ""
  );
  const [endDate, setEndDate] = useState(
    editProject?.endDate ? new Date(editProject.endDate).toISOString().split("T")[0] : ""
  );
  const [budgetHours, setBudgetHours] = useState(editProject?.budgetHours?.toString() ?? "");
  const [budgetAmount, setBudgetAmount] = useState(editProject?.budgetAmount?.toString() ?? "");
  const [leadId, setLeadId] = useState(editProject?.leadId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError(t("Le nom du projet est requis", "Project name is required"));
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      code: code.trim() || undefined,
      description: description.trim() || undefined,
      client: client.trim() || undefined,
      status,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      budgetHours: budgetHours ? Number(budgetHours) : undefined,
      budgetAmount: budgetAmount ? Number(budgetAmount) : undefined,
      leadId: leadId || undefined,
    };

    try {
      const result = editProject
        ? await apiClient.patch<Project>(apiConfig.endpoints.projects.update(editProject.id), payload)
        : await apiClient.post<Project>(apiConfig.endpoints.projects.create, payload);
      onSuccess(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Une erreur est survenue", "An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-800">
            {editProject
              ? t("Modifier le projet", "Edit project")
              : t("Nouveau projet", "New project")}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Name + Code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Nom du projet", "Project name")} *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder={t("Ex: Refonte site web", "e.g. Website redesign")}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Code projet", "Project code")}
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="PRJ-001"
              />
            </div>
          </div>

          {/* Client */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("Client / Commanditaire", "Client / Sponsor")}
            </label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              placeholder={t("Nom du client", "Client name")}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("Description", "Description")}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none"
              placeholder={t("Description du projet...", "Project description...")}
            />
          </div>

          {/* Status */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("Statut", "Status")}
            </label>
            <div className="flex gap-2">
              {(Object.entries(STATUS_META) as [ProjectStatus, typeof STATUS_META[ProjectStatus]][]).map(
                ([s, meta]) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all cursor-pointer ${
                      status === s
                        ? "border-orange-400 bg-orange-50 text-orange-700"
                        : "border-transparent bg-stone-50 text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    {language === "fr" ? meta.fr : meta.en}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Date de début", "Start date")}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Date de fin", "End date")}
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>

          {/* Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Budget (heures)", "Budget (hours)")}
              </label>
              <input
                type="number"
                min={0}
                value={budgetHours}
                onChange={(e) => setBudgetHours(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Budget (montant)", "Budget (amount)")}
              </label>
              <input
                type="number"
                min={0}
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                placeholder="0"
              />
            </div>
          </div>

          {/* Lead */}
          {users.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Chef de projet", "Project lead")}
              </label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              >
                <option value="">{t("— Aucun chef de projet —", "— No project lead —")}</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.firstName} {u.lastName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-stone-100 bg-white p-5">
          <button
            onClick={onClose}
            className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 cursor-pointer"
          >
            {t("Annuler", "Cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 cursor-pointer disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editProject ? t("Enregistrer", "Save") : t("Créer le projet", "Create project")}
          </button>
        </div>
      </div>
    </div>
  );
}
