"use client";

import { useState } from "react";
import { Pencil, Trash2, Send, AlertCircle, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import {
  LeaveRequest,
  RequestStatus,
  LEAVE_TYPE_LABELS,
  STATUS_LABELS,
} from "./types";
import { useLanguage } from "@/context/LanguageContext";
import LeaveRequestForm from "./leave-request-form";

interface Props {
  requests: LeaveRequest[];
  userId: string;
  onUpdate: (req: LeaveRequest) => void;
  /** When true the logged-in user is admin: shows approve/reject on all PENDING rows */
  isAdmin?: boolean;
}

const STATUS_TABS: { key: RequestStatus | "ALL"; fr: string; en: string }[] = [
  { key: "ALL", fr: "Tous", en: "All" },
  { key: "DRAFT", fr: "Brouillons", en: "Drafts" },
  { key: "PENDING", fr: "En attente", en: "Pending" },
  { key: "APPROVED", fr: "Approuvés", en: "Approved" },
  { key: "REJECTED", fr: "Rejetés", en: "Rejected" },
  { key: "CANCELLED", fr: "Annulés", en: "Cancelled" },
];

export default function LeaveRequestList({ requests, userId, onUpdate, isAdmin = false }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);
  const [activeTab, setActiveTab] = useState<RequestStatus | "ALL">("ALL");
  const [editRequest, setEditRequest] = useState<LeaveRequest | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [decideModal, setDecideModal] = useState<{ id: string; action: "approve" | "reject" } | null>(null);
  const [decideComment, setDecideComment] = useState("");

  const filtered =
    activeTab === "ALL"
      ? requests
      : requests.filter((r) => r.status === activeTab);

  const handleCancel = async (req: LeaveRequest) => {
    setActionLoading(req.id);
    try {
      const updated = await apiClient.post<LeaveRequest>(
        apiConfig.endpoints.requests.cancel(req.id, userId)
      );
      onUpdate(updated);
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
      setConfirmCancelId(null);
    }
  };

  const handleSubmit = async (req: LeaveRequest) => {
    setActionLoading(req.id);
    try {
      const updated = await apiClient.post<LeaveRequest>(
        apiConfig.endpoints.requests.submit(req.id)
      );
      onUpdate(updated);
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecide = async () => {
    if (!decideModal) return;
    setActionLoading(decideModal.id);
    try {
      const endpoint =
        decideModal.action === "approve"
          ? apiConfig.endpoints.requests.approve(decideModal.id)
          : apiConfig.endpoints.requests.reject(decideModal.id);
      const updated = await apiClient.post<LeaveRequest>(endpoint, {
        managerId: userId,
        decisionComment: decideComment || undefined,
      });
      onUpdate(updated);
    } catch {
      // ignore
    } finally {
      setActionLoading(null);
      setDecideModal(null);
      setDecideComment("");
    }
  };

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="card overflow-hidden p-0">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto px-4 pt-4" style={{ borderBottom: "1px solid var(--border)" }}>
        {STATUS_TABS.map((tab) => {
          const count =
            tab.key === "ALL"
              ? requests.length
              : requests.filter((r) => r.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-shrink-0 px-3 py-2 text-sm font-medium transition-colors cursor-pointer border-b-2"
              style={{
                borderColor: activeTab === tab.key ? "var(--accent)" : "transparent",
                color: activeTab === tab.key ? "var(--accent)" : "var(--text-3)",
              }}
            >
              {language === "fr" ? tab.fr : tab.en}
              {count > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs"
                  style={{ background: "var(--bg)", color: "var(--text-3)" }}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="divide-y" style={{ borderColor: "var(--border)" }}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12" style={{ color: "var(--text-3)" }}>
            <FileText size={32} className="mb-2 opacity-40" />
            <p className="text-sm">{t("Aucune demande", "No requests")}</p>
          </div>
        ) : (
          filtered.map((req) => {
            const leaveLabel = req.leaveType
              ? LEAVE_TYPE_LABELS[req.leaveType]
              : null;
            const statusMeta = STATUS_LABELS[req.status];

            return (
              <div
                key={req.id}
                className="flex items-center gap-4 px-5 py-4 transition-colors"
                style={{ background: "transparent" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                {/* Color dot */}
                {leaveLabel && (
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: leaveLabel.color }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  {/* Admin: show submitter name */}
                  {isAdmin && req.submitter && (
                    <p className="text-xs font-medium mb-0.5" style={{ color: "var(--accent)" }}>
                      {req.submitter.firstName} {req.submitter.lastName}
                      {req.submitter.department?.name && (
                        <span style={{ color: "var(--text-3)" }}> · {req.submitter.department.name}</span>
                      )}
                    </p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm" style={{ color: "var(--text-1)" }}>
                      {leaveLabel
                        ? language === "fr"
                          ? leaveLabel.fr
                          : leaveLabel.en
                        : req.requestType}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusMeta.badge}`}
                    >
                      {language === "fr" ? statusMeta.fr : statusMeta.en}
                    </span>
                    {req.workingDaysCount !== undefined && (
                      <span className="text-xs" style={{ color: "var(--text-3)" }}>
                        {req.workingDaysCount}{" "}
                        {t("jour(s) ouvrable(s)", "working day(s)")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-3)" }}>
                    {formatDate(req.leaveStartDate)} →{" "}
                    {formatDate(req.leaveEndDate)}
                  </p>
                  {req.comment && (
                    <p className="mt-0.5 truncate text-xs italic" style={{ color: "var(--text-3)" }}>
                      "{req.comment}"
                    </p>
                  )}
                  {req.decisionComment && req.status !== "APPROVED" && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs" style={{ color: "#f87171" }}>
                      <AlertCircle size={12} />
                      {req.decisionComment}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {req.status === "DRAFT" && (
                    <>
                      <button
                        onClick={() => setEditRequest(req)}
                        className="rounded-lg p-1.5 transition-colors cursor-pointer"
                        style={{ color: "var(--text-3)" }}
                        title={t("Modifier", "Edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleSubmit(req)}
                        disabled={actionLoading === req.id}
                        className="rounded-lg p-1.5 transition-colors cursor-pointer disabled:opacity-50"
                        style={{ color: "var(--accent)" }}
                        title={t("Soumettre", "Submit")}
                      >
                        <Send size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmCancelId(req.id)}
                        className="rounded-lg p-1.5 transition-colors cursor-pointer"
                        style={{ color: "#f87171" }}
                        title={t("Supprimer", "Delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {req.status === "PENDING" && (
                    <>
                      {isAdmin && (
                        <>
                          <button
                            onClick={() => { setDecideModal({ id: req.id, action: "approve" }); setDecideComment(""); }}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                            style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}
                          >
                            <CheckCircle size={12} />
                            {t("Approuver", "Approve")}
                          </button>
                          <button
                            onClick={() => { setDecideModal({ id: req.id, action: "reject" }); setDecideComment(""); }}
                            disabled={actionLoading === req.id}
                            className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                            style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}
                          >
                            <XCircle size={12} />
                            {t("Rejeter", "Reject")}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setConfirmCancelId(req.id)}
                        className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer"
                        style={{ border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                      >
                        {t("Annuler", "Cancel")}
                      </button>
                    </>
                  )}
                  {(req.status === "APPROVED" || req.status === "REJECTED") && isAdmin && (
                    <button
                      onClick={() => setConfirmCancelId(req.id)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer"
                      style={{ border: "1px solid var(--border)", color: "var(--text-3)" }}
                    >
                      {t("Annuler", "Cancel")}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit modal */}
      {editRequest && (
        <LeaveRequestForm
          userId={userId}
          editRequest={editRequest}
          onClose={() => setEditRequest(null)}
          onSuccess={(updated) => {
            onUpdate(updated);
            setEditRequest(null);
          }}
        />
      )}

      {/* Cancel confirmation modal */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <h3 className="font-semibold" style={{ color: "var(--text-1)" }}>
              {t("Confirmer l'annulation", "Confirm cancellation")}
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--text-3)" }}>
              {t(
                "Voulez-vous vraiment annuler cette demande ?",
                "Are you sure you want to cancel this request?"
              )}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="btn-ghost"
              >
                {t("Non", "No")}
              </button>
              <button
                onClick={() => {
                  const req = requests.find((r) => r.id === confirmCancelId);
                  if (req) handleCancel(req);
                }}
                disabled={actionLoading === confirmCancelId}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: "#ef4444" }}
              >
                {actionLoading === confirmCancelId && <Loader2 size={13} className="animate-spin" />}
                {t("Oui, annuler", "Yes, cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin approve/reject modal */}
      {decideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-3 mb-4">
              {decideModal.action === "approve" ? (
                <CheckCircle size={20} style={{ color: "#22c55e" }} />
              ) : (
                <XCircle size={20} style={{ color: "#ef4444" }} />
              )}
              <h3 className="font-semibold" style={{ color: "var(--text-1)" }}>
                {decideModal.action === "approve"
                  ? t("Approuver la demande", "Approve request")
                  : t("Rejeter la demande", "Reject request")}
              </h3>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-sm font-medium" style={{ color: "var(--text-2)" }}>
                {t("Commentaire", "Comment")}
                {decideModal.action === "reject" && (
                  <span className="ml-1 text-xs" style={{ color: "#f87171" }}>
                    ({t("recommandé", "recommended")})
                  </span>
                )}
              </label>
              <textarea
                rows={3}
                value={decideComment}
                onChange={(e) => setDecideComment(e.target.value)}
                placeholder={
                  decideModal.action === "reject"
                    ? t("Indiquez le motif du rejet...", "Provide a reason for rejection...")
                    : t("Commentaire optionnel...", "Optional comment...")
                }
                className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-1)" }}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setDecideModal(null); setDecideComment(""); }}
                className="btn-ghost"
              >
                {t("Annuler", "Cancel")}
              </button>
              <button
                onClick={handleDecide}
                disabled={actionLoading !== null}
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white cursor-pointer disabled:opacity-50"
                style={{ background: decideModal.action === "approve" ? "#22c55e" : "#ef4444" }}
              >
                {actionLoading !== null && <Loader2 size={13} className="animate-spin" />}
                {decideModal.action === "approve"
                  ? t("Confirmer l'approbation", "Confirm approval")
                  : t("Confirmer le rejet", "Confirm rejection")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
