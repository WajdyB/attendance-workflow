"use client";

import { useState } from "react";
import { X, Loader2, AlertCircle, Star } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { Evaluation, EvaluationType, EVAL_TYPE_META } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface CollaboratorOption {
  id: string;
  user: { firstName: string; lastName: string; jobTitle?: string };
}

interface Props {
  onClose: () => void;
  onSuccess: (evaluation: Evaluation) => void;
  editEvaluation?: Evaluation;
  collaborators?: CollaboratorOption[];
  defaultCollaboratorId?: string;
}

function ScoreInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const num = Number(value);
  const color = !value ? "text-stone-400" : num >= 85 ? "text-green-600" : num >= 70 ? "text-orange-500" : "text-red-500";
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
          placeholder="0–100"
        />
        {value && (
          <span className={`text-lg font-bold ${color}`}>{value}/100</span>
        )}
      </div>
    </div>
  );
}

export default function EvaluationForm({ onClose, onSuccess, editEvaluation, collaborators = [], defaultCollaboratorId }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const [collaboratorId, setCollaboratorId] = useState(
    editEvaluation?.collaboratorId ?? defaultCollaboratorId ?? ""
  );
  const [evalType, setEvalType] = useState<EvaluationType>(editEvaluation?.evaluationType ?? "ANNUAL");
  const [period, setPeriod] = useState(editEvaluation?.period ?? "");
  const [reviewDate, setReviewDate] = useState(
    editEvaluation?.reviewDate ? new Date(editEvaluation.reviewDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
  );
  const [globalScore, setGlobalScore] = useState(editEvaluation?.globalScore?.toString() ?? "");
  const [technicalScore, setTechnicalScore] = useState(editEvaluation?.technicalScore?.toString() ?? "");
  const [softSkillScore, setSoftSkillScore] = useState(editEvaluation?.softSkillScore?.toString() ?? "");
  const [comments, setComments] = useState(editEvaluation?.comments ?? "");
  const [objectives, setObjectives] = useState(editEvaluation?.objectives ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!collaboratorId) {
      setError(t("Sélectionnez un collaborateur", "Select a collaborator"));
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      collaboratorId,
      evaluationType: evalType,
      period: period || undefined,
      reviewDate: reviewDate || undefined,
      globalScore: globalScore ? Number(globalScore) : undefined,
      technicalScore: technicalScore ? Number(technicalScore) : undefined,
      softSkillScore: softSkillScore ? Number(softSkillScore) : undefined,
      comments: comments || undefined,
      objectives: objectives || undefined,
    };

    try {
      const result = editEvaluation
        ? await apiClient.patch<Evaluation>(apiConfig.endpoints.evaluations.update(editEvaluation.id), payload)
        : await apiClient.post<Evaluation>(apiConfig.endpoints.evaluations.create, payload);
      onSuccess(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Erreur", "Error"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 flex items-center justify-between border-b border-stone-100 bg-white p-5">
          <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
            <Star size={18} className="text-orange-500" />
            {editEvaluation ? t("Modifier l'évaluation", "Edit evaluation") : t("Nouvelle évaluation", "New evaluation")}
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

          {/* Collaborator */}
          {!defaultCollaboratorId && collaborators.length > 0 && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Collaborateur", "Collaborator")} *
              </label>
              <select
                value={collaboratorId}
                onChange={(e) => setCollaboratorId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              >
                <option value="">{t("— Sélectionner —", "— Select —")}</option>
                {collaborators.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user.firstName} {c.user.lastName}
                    {c.user.jobTitle ? ` — ${c.user.jobTitle}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("Type d'évaluation", "Evaluation type")}
            </label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(EVAL_TYPE_META) as EvaluationType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEvalType(type)}
                  className={`rounded-lg border-2 px-3 py-1.5 text-sm font-medium transition-all cursor-pointer ${
                    evalType === type
                      ? "border-orange-400 bg-orange-50 text-orange-700"
                      : "border-transparent bg-stone-50 text-stone-600 hover:bg-stone-100"
                  }`}
                >
                  {language === "fr" ? EVAL_TYPE_META[type].fr : EVAL_TYPE_META[type].en}
                </button>
              ))}
            </div>
          </div>

          {/* Period + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Période", "Period")}
              </label>
              <input
                type="text"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                placeholder={t("Ex: 2026-S1, 2026, PRJ-001", "e.g. 2026-H1, 2026, PRJ-001")}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-stone-700">
                {t("Date de revue", "Review date")}
              </label>
              <input
                type="date"
                value={reviewDate}
                onChange={(e) => setReviewDate(e.target.value)}
                className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>

          {/* Scores */}
          <div>
            <p className="mb-2 text-sm font-medium text-stone-700">{t("Notes (0–100)", "Scores (0–100)")}</p>
            <div className="grid grid-cols-3 gap-3">
              <ScoreInput
                label={t("Note globale", "Global score")}
                value={globalScore}
                onChange={setGlobalScore}
              />
              <ScoreInput
                label={t("Compétences techniques", "Technical skills")}
                value={technicalScore}
                onChange={setTechnicalScore}
              />
              <ScoreInput
                label={t("Soft skills", "Soft skills")}
                value={softSkillScore}
                onChange={setSoftSkillScore}
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("Commentaires et recommandations", "Comments & recommendations")}
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none"
              placeholder={t("Points forts, axes d'amélioration...", "Strengths, areas for improvement...")}
            />
          </div>

          {/* Objectives */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-stone-700">
              {t("Objectifs pour la période suivante", "Objectives for next period")}
            </label>
            <textarea
              rows={3}
              value={objectives}
              onChange={(e) => setObjectives(e.target.value)}
              className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm outline-none focus:border-orange-400 resize-none"
              placeholder={t("Objectifs SMART pour la prochaine période...", "SMART objectives for next period...")}
            />
          </div>
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 border-t border-stone-100 bg-white p-5">
          <button onClick={onClose} className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 cursor-pointer">
            {t("Annuler", "Cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 cursor-pointer disabled:opacity-50"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editEvaluation ? t("Enregistrer", "Save") : t("Créer l'évaluation", "Create evaluation")}
          </button>
        </div>
      </div>
    </div>
  );
}
