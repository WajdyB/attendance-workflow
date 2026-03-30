"use client";

import React, { useState } from "react";
import { Loader2, AlertCircle, X } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { LeaveRequest, LeaveType, LEAVE_TYPE_LABELS } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  userId: string;
  onSuccess: (request: LeaveRequest) => void;
  onClose: () => void;
  editRequest?: LeaveRequest;
}

export default function LeaveRequestForm({ userId, onSuccess, onClose, editRequest }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const [leaveType, setLeaveType] = useState<LeaveType>(
    editRequest?.leaveType ?? "PTO"
  );
  const [startDate, setStartDate] = useState(
    editRequest?.leaveStartDate
      ? new Date(editRequest.leaveStartDate).toISOString().split("T")[0]
      : ""
  );
  const [endDate, setEndDate] = useState(
    editRequest?.leaveEndDate
      ? new Date(editRequest.leaveEndDate).toISOString().split("T")[0]
      : ""
  );
  const [comment, setComment] = useState(editRequest?.comment ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState(editRequest?.attachmentUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const buildPayload = () => ({
    submittedBy: userId,
    requestType: "LEAVE" as const,
    leaveType,
    leaveStartDate: startDate || undefined,
    leaveEndDate: endDate || undefined,
    comment: comment || undefined,
    attachmentUrl: attachmentUrl || undefined,
  });

  const validate = () => {
    if (!startDate) return t("La date de début est requise", "Start date is required");
    if (!endDate) return t("La date de fin est requise", "End date is required");
    if (new Date(startDate) > new Date(endDate))
      return t("La date de début doit être avant la date de fin", "Start date must be before end date");
    return null;
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSaving(true);
    setError(null);
    try {
      let result: LeaveRequest;
      if (editRequest) {
        result = await apiClient.patch<LeaveRequest>(
          apiConfig.endpoints.requests.update(editRequest.id),
          buildPayload()
        );
      } else {
        result = await apiClient.post<LeaveRequest>(
          apiConfig.endpoints.requests.create,
          buildPayload()
        );
      }
      onSuccess(result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Une erreur est survenue", "An error occurred"));
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    setError(null);
    try {
      // Save first (create/update), then submit
      let request: LeaveRequest;
      if (editRequest) {
        request = await apiClient.patch<LeaveRequest>(
          apiConfig.endpoints.requests.update(editRequest.id),
          buildPayload()
        );
      } else {
        request = await apiClient.post<LeaveRequest>(
          apiConfig.endpoints.requests.create,
          buildPayload()
        );
      }
      const submitted = await apiClient.post<LeaveRequest>(
        apiConfig.endpoints.requests.submit(request.id)
      );
      onSuccess(submitted);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("Une erreur est survenue", "An error occurred"));
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: "0.5rem",
    border: "1px solid var(--border)",
    background: "var(--bg)",
    color: "var(--text-1)",
    padding: "0.5rem 0.75rem",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl"
        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between p-5"
          style={{ borderBottom: "1px solid var(--border)" }}
        >
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-1)" }}>
            {editRequest
              ? t("Modifier la demande", "Edit request")
              : t("Nouvelle demande de congé", "New leave request")}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors cursor-pointer"
            style={{ color: "var(--text-3)" }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--bg)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div
              className="flex items-start gap-2 rounded-lg p-3 text-sm"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
              {t("Type de congé", "Leave type")}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(LEAVE_TYPE_LABELS) as [LeaveType, typeof LEAVE_TYPE_LABELS[LeaveType]][]).map(
                ([type, meta]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setLeaveType(type)}
                    style={{
                      borderColor: leaveType === type ? meta.color : "var(--border)",
                      backgroundColor: leaveType === type ? `${meta.color}20` : "var(--bg)",
                      color: "var(--text-1)",
                    }}
                    className="flex items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm text-left transition-all cursor-pointer"
                  >
                    <span
                      className="h-3 w-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="font-medium">
                      {language === "fr" ? meta.fr : meta.en}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
                {t("Date de début", "Start date")}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
                {t("Date de fin", "End date")}
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
              {t("Motif / Commentaire", "Reason / Comment")}
              <span className="ml-1 font-normal" style={{ color: "var(--text-3)" }}>
                ({t("optionnel", "optional")})
              </span>
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t(
                "Précisez le motif de votre demande...",
                "Describe the reason for your request..."
              )}
              style={{ ...inputStyle, resize: "none" }}
            />
          </div>

          {/* Attachment (URL) — shown for SICK type */}
          {leaveType === "SICK" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
                {t("Lien du certificat médical", "Medical certificate URL")}
                <span className="ml-1 font-normal" style={{ color: "var(--text-3)" }}>
                  ({t("optionnel", "optional")})
                </span>
              </label>
              <input
                type="url"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                placeholder="https://..."
                style={inputStyle}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div
          className="flex justify-end gap-2 p-5"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="btn-ghost"
          >
            {t("Annuler", "Cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving || submitting}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer disabled:opacity-50"
            style={{ border: "1px solid var(--accent)", color: "var(--accent)", background: "rgba(234,88,12,0.1)" }}
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              t("Enregistrer brouillon", "Save draft")
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || submitting}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {t("Soumettre", "Submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
