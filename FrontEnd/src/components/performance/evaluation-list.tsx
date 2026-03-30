"use client";

import { useState } from "react";
import { Pencil, Trash2, Star, FileText, ChevronDown, ChevronUp } from "lucide-react";
import {
  Evaluation,
  EvaluationType,
  EVAL_TYPE_META,
  scoreColor,
  scoreBg,
} from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  evaluations: Evaluation[];
  canEdit?: boolean;
  onEdit?: (evaluation: Evaluation) => void;
  onDelete?: (evaluation: Evaluation) => void;
  showCollaborator?: boolean;
}

export default function EvaluationList({ evaluations, canEdit, onEdit, onDelete, showCollaborator = true }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<EvaluationType | "ALL">("ALL");

  const filtered =
    filterType === "ALL"
      ? evaluations
      : evaluations.filter((e) => e.evaluationType === filterType);

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";

  if (evaluations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl bg-white border border-orange-100/20 py-14 text-stone-400">
        <Star size={36} className="mb-3 opacity-30" />
        <p className="text-sm">{t("Aucune évaluation", "No evaluations")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {(["ALL", ...Object.keys(EVAL_TYPE_META)] as (EvaluationType | "ALL")[]).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              filterType === type
                ? "bg-orange-600 text-white"
                : "bg-white border border-stone-200 text-stone-600 hover:bg-stone-50"
            }`}
          >
            {type === "ALL"
              ? t("Toutes", "All")
              : language === "fr"
              ? EVAL_TYPE_META[type as EvaluationType].fr
              : EVAL_TYPE_META[type as EvaluationType].en}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((ev) => {
          const meta = EVAL_TYPE_META[ev.evaluationType];
          const isExpanded = expanded === ev.id;

          return (
            <div
              key={ev.id}
              className="rounded-xl border border-orange-100/20 bg-white shadow-sm overflow-hidden"
            >
              {/* Header row */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-stone-50/50"
                onClick={() => setExpanded(isExpanded ? null : ev.id)}
              >
                {/* Score circle */}
                <div className="relative h-12 w-12 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" strokeWidth="3" stroke="#f3f4f6" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none" strokeWidth="3"
                      stroke={ev.globalScore != null ? (ev.globalScore >= 85 ? "#22c55e" : ev.globalScore >= 70 ? "#f97316" : "#ef4444") : "#e5e7eb"}
                      strokeDasharray={`${ev.globalScore ?? 0} 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor(ev.globalScore)}`}>
                    {ev.globalScore != null ? ev.globalScore : "—"}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                      {language === "fr" ? meta.fr : meta.en}
                    </span>
                    {ev.period && (
                      <span className="text-xs text-stone-400">{ev.period}</span>
                    )}
                  </div>

                  {showCollaborator && (
                    <p className="text-sm font-semibold text-stone-700">
                      {ev.collaborator.user.firstName} {ev.collaborator.user.lastName}
                      {ev.collaborator.user.department && (
                        <span className="ml-1.5 text-xs font-normal text-stone-400">
                          — {ev.collaborator.user.department.name}
                        </span>
                      )}
                    </p>
                  )}

                  <p className="text-xs text-stone-400 mt-0.5">
                    {t("Par", "By")} {ev.manager.user.firstName} {ev.manager.user.lastName}
                    {" · "}
                    {formatDate(ev.reviewDate)}
                  </p>
                </div>

                {/* Actions */}
                {canEdit && (
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onEdit?.(ev)}
                      className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 cursor-pointer"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete?.(ev)}
                      className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                {isExpanded ? (
                  <ChevronUp size={16} className="text-stone-400 flex-shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-stone-400 flex-shrink-0" />
                )}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-stone-50 px-4 py-4 space-y-4">
                  {/* Score breakdown */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: t("Global", "Global"), value: ev.globalScore },
                      { label: t("Technique", "Technical"), value: ev.technicalScore },
                      { label: t("Soft skills", "Soft skills"), value: ev.softSkillScore },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-lg bg-stone-50 p-3">
                        <p className="text-xs text-stone-400 mb-1">{label}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-stone-200">
                            <div
                              className={`h-1.5 rounded-full ${scoreBg(value)}`}
                              style={{ width: `${value ?? 0}%` }}
                            />
                          </div>
                          <span className={`text-sm font-bold ${scoreColor(value)}`}>
                            {value != null ? value : "—"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {ev.comments && (
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                        {t("Commentaires", "Comments")}
                      </p>
                      <p className="text-sm text-stone-600 leading-relaxed">{ev.comments}</p>
                    </div>
                  )}

                  {ev.objectives && (
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                        {t("Objectifs pour la prochaine période", "Next period objectives")}
                      </p>
                      <p className="text-sm text-stone-600 leading-relaxed">{ev.objectives}</p>
                    </div>
                  )}

                  {ev.documentUrl && (
                    <a
                      href={ev.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-orange-600 hover:underline"
                    >
                      <FileText size={14} />
                      {t("Document signé", "Signed document")}
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
