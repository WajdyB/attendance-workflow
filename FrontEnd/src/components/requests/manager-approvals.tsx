"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Loader2, Clock, User, Calendar, AlertCircle } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { LeaveRequest, LEAVE_TYPE_LABELS, STATUS_LABELS } from "./types";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  managerId: string;
  onUpdate?: () => void;
}

interface DecideModal {
  request: LeaveRequest;
  action: "approve" | "reject";
}

export default function ManagerApprovals({ managerId, onUpdate }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);

  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<DecideModal | null>(null);
  const [comment, setComment] = useState("");
  const [deciding, setDeciding] = useState(false);

  const load = () => {
    setLoading(true);
    apiClient
      .get<LeaveRequest[]>(apiConfig.endpoints.requests.pendingForManager(managerId))
      .then(setRequests)
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [managerId]);

  const handleDecide = async () => {
    if (!modal) return;
    setDeciding(true);
    try {
      const endpoint =
        modal.action === "approve"
          ? apiConfig.endpoints.requests.approve(modal.request.id)
          : apiConfig.endpoints.requests.reject(modal.request.id);

      await apiClient.post(endpoint, {
        managerId,
        decisionComment: comment || undefined,
      });

      setRequests((prev) => prev.filter((r) => r.id !== modal.request.id));
      setModal(null);
      setComment("");
      onUpdate?.();
    } catch {
      // keep modal open on error
    } finally {
      setDeciding(false);
    }
  };

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "short",
        })
      : "—";

  return (
    <>
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: "var(--accent)" }} />
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
              {t("Demandes en attente d'approbation", "Pending approvals")}
            </h3>
          </div>
          {requests.length > 0 && (
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
            >
              {requests.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
          </div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <CheckCircle size={32} style={{ color: "var(--text-3)" }} className="opacity-40" />
            <p className="text-sm" style={{ color: "var(--text-3)" }}>
              {t("Aucune demande en attente", "No pending requests")}
            </p>
          </div>
        ) : (
          <div style={{ divide: "1px solid var(--border)" }}>
            {requests.map((req, idx) => {
              const leaveLabel = req.leaveType ? LEAVE_TYPE_LABELS[req.leaveType] : null;
              return (
                <div
                  key={req.id}
                  className="px-5 py-4"
                  style={{
                    borderBottom: idx < requests.length - 1 ? "1px solid var(--border)" : undefined,
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Employee info */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                        style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                      >
                        {req.submitter.pictureUrl ? (
                          <img src={req.submitter.pictureUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <User size={16} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                          {req.submitter.firstName} {req.submitter.lastName}
                        </p>
                        <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                          {req.submitter.department?.name ?? req.submitter.jobTitle ?? "—"}
                        </p>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => { setModal({ request: req, action: "reject" }); setComment(""); }}
                        className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                        style={{
                          borderColor: "color-mix(in srgb, #ef4444 30%, transparent)",
                          color: "#ef4444",
                          background: "color-mix(in srgb, #ef4444 8%, transparent)",
                        }}
                      >
                        <XCircle size={13} />
                        {t("Rejeter", "Reject")}
                      </button>
                      <button
                        onClick={() => { setModal({ request: req, action: "approve" }); setComment(""); }}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                        style={{ background: "#22c55e", color: "#fff" }}
                      >
                        <CheckCircle size={13} />
                        {t("Approuver", "Approve")}
                      </button>
                    </div>
                  </div>

                  {/* Leave details */}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {leaveLabel && (
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-medium text-white"
                        style={{ backgroundColor: leaveLabel.color }}
                      >
                        {language === "fr" ? leaveLabel.fr : leaveLabel.en}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--text-3)" }}>
                      <Calendar size={11} />
                      {formatDate(req.leaveStartDate)} → {formatDate(req.leaveEndDate)}
                    </span>
                    {req.workingDaysCount !== undefined && (
                      <span
                        className="rounded px-2 py-0.5 text-xs font-medium"
                        style={{ background: "var(--surface-2, var(--surface))", color: "var(--text-2)" }}
                      >
                        {req.workingDaysCount} {t("j. ouvrables", "working days")}
                      </span>
                    )}
                  </div>

                  {req.comment && (
                    <p
                      className="mt-2 rounded-lg px-3 py-2 text-xs italic"
                      style={{ background: "var(--surface)", color: "var(--text-2)" }}
                    >
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
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-2xl"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-3 mb-4">
              {modal.action === "approve" ? (
                <CheckCircle size={20} style={{ color: "#22c55e" }} />
              ) : (
                <AlertCircle size={20} style={{ color: "#ef4444" }} />
              )}
              <h3 className="font-semibold" style={{ color: "var(--text-1)" }}>
                {modal.action === "approve"
                  ? t("Approuver la demande", "Approve request")
                  : t("Rejeter la demande", "Reject request")}
              </h3>
            </div>

            <div className="rounded-lg p-3 text-sm mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
              <p className="font-medium" style={{ color: "var(--text-1)" }}>
                {modal.request.submitter.firstName} {modal.request.submitter.lastName}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                {modal.request.leaveType && LEAVE_TYPE_LABELS[modal.request.leaveType]
                  ? language === "fr"
                    ? LEAVE_TYPE_LABELS[modal.request.leaveType].fr
                    : LEAVE_TYPE_LABELS[modal.request.leaveType].en
                  : modal.request.requestType}{" "}
                • {formatDate(modal.request.leaveStartDate)} → {formatDate(modal.request.leaveEndDate)}
                {modal.request.workingDaysCount ? ` (${modal.request.workingDaysCount} ${t("j.", "d.")})` : ""}
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
                {t("Commentaire", "Comment")}
                {modal.action === "reject" && (
                  <span className="ml-1 text-xs" style={{ color: "#ef4444" }}>
                    ({t("recommandé", "recommended")})
                  </span>
                )}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={
                  modal.action === "reject"
                    ? t("Indiquez le motif du rejet...", "Provide a reason for rejection...")
                    : t("Commentaire optionnel...", "Optional comment...")
                }
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  color: "var(--text-1)",
                }}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="btn-ghost"
              >
                {t("Annuler", "Cancel")}
              </button>
              <button
                onClick={handleDecide}
                disabled={deciding}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors cursor-pointer disabled:opacity-50"
                style={{ background: modal.action === "approve" ? "#22c55e" : "#ef4444" }}
              >
                {deciding && <Loader2 size={14} className="animate-spin" />}
                {modal.action === "approve"
                  ? t("Confirmer l'approbation", "Confirm approval")
                  : t("Confirmer le rejet", "Confirm rejection")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
