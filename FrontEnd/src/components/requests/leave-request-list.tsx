"use client";

import { useState } from "react";
import { Pencil, Trash2, Send, AlertCircle, FileText } from "lucide-react";
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
}

const STATUS_TABS: { key: RequestStatus | "ALL"; fr: string; en: string }[] = [
  { key: "ALL", fr: "Tous", en: "All" },
  { key: "DRAFT", fr: "Brouillons", en: "Drafts" },
  { key: "PENDING", fr: "En attente", en: "Pending" },
  { key: "APPROVED", fr: "Approuvés", en: "Approved" },
  { key: "REJECTED", fr: "Rejetés", en: "Rejected" },
  { key: "CANCELLED", fr: "Annulés", en: "Cancelled" },
];

export default function LeaveRequestList({ requests, userId, onUpdate }: Props) {
  const { language } = useLanguage();
  const t = (fr: string, en: string) => (language === "fr" ? fr : en);
  const [activeTab, setActiveTab] = useState<RequestStatus | "ALL">("ALL");
  const [editRequest, setEditRequest] = useState<LeaveRequest | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const formatDate = (d?: string) =>
    d
      ? new Date(d).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  return (
    <div className="rounded-xl border border-orange-100/20 bg-white shadow-sm">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-stone-100 px-4 pt-4">
        {STATUS_TABS.map((tab) => {
          const count =
            tab.key === "ALL"
              ? requests.length
              : requests.filter((r) => r.status === tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 rounded-t-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? "border-b-2 border-orange-500 text-orange-600"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {language === "fr" ? tab.fr : tab.en}
              {count > 0 && (
                <span className="ml-1.5 rounded-full bg-stone-100 px-1.5 py-0.5 text-xs text-stone-500">
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="divide-y divide-stone-50">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-stone-400">
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
                className="flex items-center gap-4 px-5 py-4 hover:bg-stone-50/50 transition-colors"
              >
                {/* Color dot */}
                {leaveLabel && (
                  <span
                    className="h-3 w-3 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: leaveLabel.color }}
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-stone-800 text-sm">
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
                      <span className="text-xs text-stone-400">
                        {req.workingDaysCount}{" "}
                        {t("jour(s) ouvrable(s)", "working day(s)")}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-stone-400">
                    {formatDate(req.leaveStartDate)} →{" "}
                    {formatDate(req.leaveEndDate)}
                  </p>
                  {req.comment && (
                    <p className="mt-0.5 truncate text-xs text-stone-400 italic">
                      "{req.comment}"
                    </p>
                  )}
                  {req.decisionComment && req.status !== "APPROVED" && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-red-500">
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
                        className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
                        title={t("Modifier", "Edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleSubmit(req)}
                        disabled={actionLoading === req.id}
                        className="rounded-lg p-1.5 text-orange-400 hover:bg-orange-50 hover:text-orange-600 transition-colors cursor-pointer disabled:opacity-50"
                        title={t("Soumettre", "Submit")}
                      >
                        <Send size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmCancelId(req.id)}
                        className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer"
                        title={t("Supprimer", "Delete")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                  {req.status === "PENDING" && (
                    <button
                      onClick={() => setConfirmCancelId(req.id)}
                      className="rounded-lg px-2.5 py-1 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors cursor-pointer"
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

      {/* Cancel confirmation */}
      {confirmCancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-stone-800">
              {t("Confirmer l'annulation", "Confirm cancellation")}
            </h3>
            <p className="mt-2 text-sm text-stone-500">
              {t(
                "Voulez-vous vraiment annuler cette demande ?",
                "Are you sure you want to cancel this request?"
              )}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setConfirmCancelId(null)}
                className="rounded-lg border border-stone-200 px-4 py-2 text-sm text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                {t("Non", "No")}
              </button>
              <button
                onClick={() => {
                  const req = requests.find((r) => r.id === confirmCancelId);
                  if (req) handleCancel(req);
                }}
                disabled={actionLoading === confirmCancelId}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {t("Oui, annuler", "Yes, cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
