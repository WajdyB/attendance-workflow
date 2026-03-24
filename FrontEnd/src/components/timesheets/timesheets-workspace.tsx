"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import Link from "next/link";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";

type RoleView = "admin" | "manager" | "collaborator";

interface EntryInput {
  projectId: string;
  entryDate: string;
  taskName: string;
  hours: string;
  activityDescription: string;
  comments: string;
}

interface TimesheetItem {
  id: string;
  userId: string;
  weekStartDate: string;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  totalHours: number;
  overtimeHours: number;
  decisionComment?: string | null;
  entries?: Array<{
    id: string;
    projectId: string;
    taskName?: string | null;
    hours: number;
    entryDate: string;
  }>;
  user?: {
    firstName?: string;
    lastName?: string;
  };
}

interface ProjectOption {
  id: string;
  label: string;
  name?: string | null;
  code?: string | null;
  status: "IN_PROGRESS" | "FINISHED" | "SUSPENDED";
}

interface MonthlyReportResponse {
  totalTimesheets: number;
  totalHours: number;
  overtimeHours: number;
  byProject: Array<{
    projectName: string;
    hours: number;
  }>;
}

export default function TimesheetsWorkspace() {
  const { databaseUser } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [weekStartDate, setWeekStartDate] = useState(getDefaultWeekStartDate());
  const [entryMode, setEntryMode] = useState<"simple" | "detailed">("detailed");
  const [entries, setEntries] = useState<EntryInput[]>([
    {
      projectId: "",
      entryDate: getTodayDate(),
      taskName: "",
      hours: "",
      activityDescription: "",
      comments: "",
    },
  ]);
  const [currentTimesheetId, setCurrentTimesheetId] = useState<string | null>(null);
  const [managerQueue, setManagerQueue] = useState<TimesheetItem[]>([]);
  const [managerComment, setManagerComment] = useState("");
  const [monthlyReport, setMonthlyReport] = useState<MonthlyReportResponse | null>(null);
  const [projects, setProjects] = useState<ProjectOption[]>([]);

  const now = useMemo(() => new Date(), []);
  const reportYear = now.getFullYear();
  const reportMonth = now.getMonth() + 1;

  const resolveRoleView = (): RoleView => {
    const normalizedRole = databaseUser?.role?.description?.toLowerCase().trim() || "";

    if (normalizedRole.includes("admin")) return "admin";
    if (normalizedRole.includes("manager")) return "manager";
    return "collaborator";
  };

  const roleView = resolveRoleView();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await apiClient.get<ProjectOption[]>(
          apiConfig.endpoints.timesheets.projects,
        );
        setProjects(data);
      } catch {
        setProjects([]);
      }
    };

    void loadProjects();
  }, []);

  const totalEnteredHours = useMemo(
    () => entries.reduce((sum, entry) => sum + Number(entry.hours || 0), 0),
    [entries],
  );

  const handleAddEntry = () => {
    setEntries((prev) => [
      ...prev,
      {
        projectId: "",
        entryDate: getTodayDate(),
        taskName: "",
        hours: "",
        activityDescription: "",
        comments: "",
      },
    ]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
  };

  const handleEntryChange = (index: number, field: keyof EntryInput, value: string) => {
    setEntries((prev) =>
      prev.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  };

  const handleSaveDraft = async (): Promise<string | null> => {
    if (!databaseUser?.id) {
      setMessage(t("timesheets.error.noUser"));
      return null;
    }

    const cleanedEntries = entries
      .filter((entry) => entry.projectId.trim() && Number(entry.hours) > 0)
      .map((entry) => ({
        projectId: entry.projectId.trim(),
        entryDate: entry.entryDate,
        taskName: entryMode === "detailed" ? entry.taskName.trim() || undefined : undefined,
        hours: Number(entry.hours),
        activityDescription: entry.activityDescription.trim() || undefined,
        comments: entry.comments.trim() || undefined,
      }));

    if (!cleanedEntries.length) {
      setMessage(t("timesheets.error.emptyEntries"));
      return null;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await apiClient.post<{ timesheet: TimesheetItem }>(
        apiConfig.endpoints.timesheets.saveDraft,
        {
          userId: databaseUser.id,
          weekStartDate,
          entries: cleanedEntries,
        },
      );

      setCurrentTimesheetId(response.timesheet.id);
      setMessage(t("timesheets.success.saved"));
      return response.timesheet.id;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("timesheets.error.saveFailed"));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!databaseUser?.id) {
      setMessage(t("timesheets.error.noUser"));
      return;
    }

    let timesheetId = currentTimesheetId;

    if (!timesheetId) {
      const savedDraftId = await handleSaveDraft();
      if (!savedDraftId) {
        return;
      }

      timesheetId = savedDraftId;
    }

    setLoading(true);
    setMessage("");

    try {
      await apiClient.post(apiConfig.endpoints.timesheets.submit(timesheetId));
      setMessage(t("timesheets.success.submitted"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("timesheets.error.submitFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadManagerQueue = async () => {
    if (!databaseUser?.id) {
      setMessage(t("timesheets.error.noUser"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const queue = await apiClient.get<TimesheetItem[]>(
        apiConfig.endpoints.timesheets.submittedForManager(databaseUser.id),
      );
      setManagerQueue(queue);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("timesheets.error.loadQueueFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (timesheetId: string) => {
    if (!databaseUser?.id) {
      setMessage(t("timesheets.error.noUser"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await apiClient.post(apiConfig.endpoints.timesheets.approve(timesheetId), {
        managerId: databaseUser.id,
        comment: managerComment || undefined,
      });

      setManagerQueue((prev) => prev.filter((item) => item.id !== timesheetId));
      setManagerComment("");
      setMessage(t("timesheets.success.approved"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("timesheets.error.approveFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (timesheetId: string) => {
    if (!databaseUser?.id) {
      setMessage(t("timesheets.error.noUser"));
      return;
    }

    if (!managerComment.trim()) {
      setMessage(t("timesheets.error.rejectNeedsComment"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      await apiClient.post(apiConfig.endpoints.timesheets.reject(timesheetId), {
        managerId: databaseUser.id,
        comment: managerComment,
      });

      setManagerQueue((prev) => prev.filter((item) => item.id !== timesheetId));
      setManagerComment("");
      setMessage(t("timesheets.success.rejected"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("timesheets.error.rejectFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMonthlyReport = async () => {
    if (!databaseUser?.id) {
      setMessage(t("timesheets.error.noUser"));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const report = await apiClient.get<MonthlyReportResponse>(
        apiConfig.endpoints.timesheets.monthlyReport(
          databaseUser.id,
          reportYear,
          reportMonth,
        ),
      );
      setMonthlyReport(report);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("timesheets.error.reportFailed"));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "excel" | "pdf") => {
    const token =
      (typeof window !== "undefined" &&
        (localStorage.getItem("token") || sessionStorage.getItem("token"))) ||
      null;

    if (!token) {
      setMessage(t("timesheets.error.noSession"));
      return;
    }

    const url =
      format === "excel"
        ? apiConfig.endpoints.timesheets.exportExcel(reportYear, reportMonth)
        : apiConfig.endpoints.timesheets.exportPdf(reportYear, reportMonth);

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(t("timesheets.error.exportFailed"));
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download =
        format === "excel"
          ? `timesheets-${reportYear}-${reportMonth}.csv`
          : `timesheets-${reportYear}-${reportMonth}.pdf`;
      link.click();
      window.URL.revokeObjectURL(blobUrl);
      setMessage(t("timesheets.success.exported"));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("timesheets.error.exportFailed"));
    } finally {
      setLoading(false);
    }
  };

  const renderCollaboratorView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title={t("timesheets.card.weekHours")} value={`${totalEnteredHours.toFixed(2)}h`} />
        <Card
          title={t("timesheets.card.overtime")}
          value={`${Math.max(0, totalEnteredHours - 40).toFixed(2)}h`}
        />
        <Card title={t("timesheets.card.status")} value={currentTimesheetId ? "DRAFT" : "NEW"} />
      </div>

      <div className="rounded-xl border border-orange-100/20 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-orange-300">{t("timesheets.quickActions")}</h3>
        <p className="mt-1 text-sm text-stone-300">{t("timesheets.collaboratorHint")}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-stone-300">{t("timesheets.field.weekStart")}</label>
            <input
              type="date"
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
              value={weekStartDate}
              onChange={(event) => setWeekStartDate(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-300">{t("timesheets.field.entryMode")}</label>
            <select
              className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
              value={entryMode}
              onChange={(event) => setEntryMode(event.target.value as "simple" | "detailed")}
            >
              <option value="simple">{t("timesheets.mode.simple")}</option>
              <option value="detailed">{t("timesheets.mode.detailed")}</option>
            </select>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {entries.map((entry, index) => (
            <div key={`${index}-${entry.entryDate}`} className="rounded-lg border border-orange-100/30 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <input
                  type="date"
                  className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
                  value={entry.entryDate}
                  onChange={(event) => handleEntryChange(index, "entryDate", event.target.value)}
                />
                <select
                  className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
                  value={entry.projectId}
                  onChange={(event) => handleEntryChange(index, "projectId", event.target.value)}
                >
                  <option value="">{t("timesheets.field.project")}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.label}
                    </option>
                  ))}
                </select>
                {entryMode === "detailed" && (
                  <input
                    type="text"
                    className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
                    placeholder={t("timesheets.field.task")}
                    value={entry.taskName}
                    onChange={(event) => handleEntryChange(index, "taskName", event.target.value)}
                  />
                )}
                <input
                  type="number"
                  step="0.25"
                  min="0"
                  className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
                  placeholder={t("timesheets.field.hours")}
                  value={entry.hours}
                  onChange={(event) => handleEntryChange(index, "hours", event.target.value)}
                />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  type="text"
                  className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
                  placeholder={t("timesheets.field.description")}
                  value={entry.activityDescription}
                  onChange={(event) =>
                    handleEntryChange(index, "activityDescription", event.target.value)
                  }
                />
                <input
                  type="text"
                  className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
                  placeholder={t("timesheets.field.comments")}
                  value={entry.comments}
                  onChange={(event) => handleEntryChange(index, "comments", event.target.value)}
                />
              </div>
              {entries.length > 1 && (
                <button
                  type="button"
                  className="mt-3 text-xs font-medium text-red-500 hover:text-red-400"
                  onClick={() => handleRemoveEntry(index)}
                >
                  {t("timesheets.action.removeLine")}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          className="mt-3 rounded-lg border border-orange-300/30 bg-orange-100/20 px-4 py-2 text-sm font-medium text-orange-300"
          onClick={handleAddEntry}
        >
          {t("timesheets.action.addLine")}
        </button>

        {projects.length === 0 ? (
          <p className="mt-2 text-xs text-stone-400">{t("timesheets.error.noProjects")}</p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-orange-300/30 bg-orange-100/20 px-4 py-2 text-sm font-medium text-orange-300"
            onClick={handleSaveDraft}
            disabled={loading}
          >
            {t("timesheets.action.saveDraft")}
          </button>
          <button
            type="button"
            className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white"
            onClick={handleSubmit}
            disabled={loading}
          >
            {t("timesheets.action.submit")}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-orange-100/20 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-orange-300">{t("timesheets.monthlyReport")}</h3>
          <button
            type="button"
            className="rounded-lg border border-orange-300/30 bg-orange-100/20 px-3 py-1.5 text-xs font-medium text-orange-300"
            onClick={handleLoadMonthlyReport}
            disabled={loading}
          >
            {t("timesheets.action.loadReport")}
          </button>
        </div>
        {monthlyReport ? (
          <div className="mt-4 space-y-2 text-sm text-stone-300">
            <p>{t("timesheets.report.totalTimesheets")}: {monthlyReport.totalTimesheets}</p>
            <p>{t("timesheets.report.totalHours")}: {monthlyReport.totalHours.toFixed(2)}h</p>
            <p>{t("timesheets.report.overtime")}: {monthlyReport.overtimeHours.toFixed(2)}h</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-stone-300">{t("timesheets.report.empty")}</p>
        )}
      </div>
    </div>
  );

  const renderManagerView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title={t("timesheets.card.pendingApprovals")} value={String(managerQueue.length)} />
        <Card title={t("timesheets.card.teamHours")} value="312h" />
        <Card title={t("timesheets.card.teamOvertime")} value="26h" />
      </div>

      <div className="rounded-xl border border-orange-100/20 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-orange-300">{t("timesheets.pendingTitle")}</h3>
        <p className="mt-1 text-sm text-stone-300">{t("timesheets.managerHint")}</p>
        <div className="mt-4">
          <Link
            href="/approvals"
            className="text-sm font-medium text-orange-300 hover:text-orange-200"
          >
            {t("timesheets.openApprovals")}
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-orange-300/30 bg-orange-100/20 px-4 py-2 text-sm font-medium text-orange-300"
            onClick={handleLoadManagerQueue}
            disabled={loading}
          >
            {t("timesheets.action.loadQueue")}
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {managerQueue.map((item) => (
            <div key={item.id} className="rounded-lg border border-orange-100/30 p-3">
              <p className="text-sm font-medium text-stone-200">
                {item.user?.firstName} {item.user?.lastName} - {new Date(item.weekStartDate).toLocaleDateString()}
              </p>
              <p className="mt-1 text-xs text-stone-300">
                {t("timesheets.card.weekHours")}: {Number(item.totalHours || 0).toFixed(2)}h
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white"
                  onClick={() => handleApprove(item.id)}
                  disabled={loading}
                >
                  {t("timesheets.action.approve")}
                </button>
                <button
                  type="button"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
                  onClick={() => handleReject(item.id)}
                  disabled={loading}
                >
                  {t("timesheets.action.reject")}
                </button>
              </div>
            </div>
          ))}

          <input
            type="text"
            className="w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm text-stone-700"
            placeholder={t("timesheets.field.managerComment")}
            value={managerComment}
            onChange={(event) => setManagerComment(event.target.value)}
          />
        </div>
      </div>
    </div>
  );

  const renderAdminView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card title={t("timesheets.card.submittedThisWeek")} value="34" />
        <Card title={t("timesheets.card.approvedThisWeek")} value="21" />
        <Card title={t("timesheets.card.globalHours")} value="1420h" />
        <Card title={t("timesheets.card.globalOvertime")} value="87h" />
      </div>

      <div className="rounded-xl border border-orange-100/20 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-orange-300">{t("timesheets.reportingTitle")}</h3>
        <p className="mt-1 text-sm text-stone-300">{t("timesheets.adminHint")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-orange-300/30 bg-orange-100/20 px-4 py-2 text-sm font-medium text-orange-300"
            onClick={handleLoadMonthlyReport}
            disabled={loading}
          >
            {t("timesheets.action.loadReport")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-orange-300/30 bg-orange-100/20 px-4 py-2 text-sm font-medium text-orange-300"
            onClick={() => handleExport("excel")}
            disabled={loading}
          >
            {t("timesheets.action.exportExcel")}
          </button>
          <button
            type="button"
            className="rounded-lg border border-orange-300/30 bg-orange-100/20 px-4 py-2 text-sm font-medium text-orange-300"
            onClick={() => handleExport("pdf")}
            disabled={loading}
          >
            {t("timesheets.action.exportPdf")}
          </button>
        </div>

        {monthlyReport && (
          <div className="mt-4 space-y-2 text-sm text-stone-300">
            <p>{t("timesheets.report.totalTimesheets")}: {monthlyReport.totalTimesheets}</p>
            <p>{t("timesheets.report.totalHours")}: {monthlyReport.totalHours.toFixed(2)}h</p>
            <p>{t("timesheets.report.overtime")}: {monthlyReport.overtimeHours.toFixed(2)}h</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-orange-100/20 bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-semibold text-orange-300">{t("timesheets.title")}</h2>
        <p className="mt-1 text-sm text-stone-300">{t("timesheets.subtitle")}</p>
        {message && <p className="mt-3 text-sm text-orange-300">{message}</p>}
      </div>

      {roleView === "admin" && renderAdminView()}
      {roleView === "manager" && renderManagerView()}
      {roleView === "collaborator" && renderCollaboratorView()}
    </div>
  );
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultWeekStartDate() {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-orange-100/20 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-300">{title}</p>
      <p className="mt-1 text-2xl font-semibold text-orange-300">{value}</p>
    </div>
  );
}
