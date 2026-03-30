"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/utils/api-client";
import apiConfig from "@/utils/api-config";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl?: string | null;
  personalEmail: string;
  workEmail?: string | null;
  jobTitle?: string | null;
  role?: { id: string; description: string } | null;
  department?: { id: string; name: string } | null;
};

export default function EmployeesList() {
  const { language } = useLanguage();
  const { databaseUser } = useAuth();
  const router = useRouter();

  const [employees, setEmployees] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDeleteEmployeeId, setPendingDeleteEmployeeId] = useState<string | null>(null);

  const labels = useMemo(
    () =>
      language === "fr"
        ? {
            title: "Employés",
            subtitle: "Gestion de la list des employés",
            loading: "Chargement...",
            unauthorized: "Cette page est réservée aux administrateurs.",
            noEmployees: "Aucun employé trouvé.",
            view: "Voir",
            edit: "Modifier",
            delete: "Supprimer",
            confirmDeleteTitle: "Confirmer la suppression",
            add: "Ajouter un employé",
            hierarchy: "Hiérarchie",
            deleteConfirm: "Êtes-vous sûr de vouloir supprimer cet employé ?",
            deleteSuccess: "Employé supprimé avec succès.",
            deleteError: "Erreur lors de la suppression de l'employé.",
            refresh: "Rafraîchir",
            cancel: "Annuler",
          }
        : {
            title: "Employees",
            subtitle: "Manage the employees list",
            loading: "Loading...",
            unauthorized: "This page is restricted to administrators.",
            noEmployees: "No employees found.",
            view: "View",
            edit: "Edit",
            delete: "Delete",
            confirmDeleteTitle: "Confirm deletion",
            add: "Add an employee",
            hierarchy: "Hierarchy",
            deleteConfirm: "Are you sure you want to delete this employee?",
            deleteSuccess: "Employee deleted successfully.",
            deleteError: "Error deleting employee.",
            refresh: "Refresh",
            cancel: "Cancel",
          },
    [language],
  );

  const isAdmin = (databaseUser?.role?.description || "")
    .toLowerCase()
    .includes("admin");

  const fetchEmployees = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<UserRow[]>(apiConfig.endpoints.users.all);
      setEmployees(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load employees";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleView = (employeeId: string) => {
    router.push(`/employees/${employeeId}`);
  };

  const handleEdit = (employeeId: string) => {
    router.push(`/employees/${employeeId}/edit`);
  };

  const handleDelete = async (employeeId: string) => {
    setDeletingId(employeeId);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.delete(apiConfig.endpoints.users.delete(employeeId));
      setSuccess(labels.deleteSuccess);
      await fetchEmployees();
    } catch (err) {
      const message = err instanceof Error ? err.message : labels.deleteError;
      setError(message);
    } finally {
      setDeletingId(null);
      setPendingDeleteEmployeeId(null);
    }
  };

  const openDeleteConfirmation = (employeeId: string) => {
    setPendingDeleteEmployeeId(employeeId);
  };

  const closeDeleteConfirmation = () => {
    if (!deletingId) {
      setPendingDeleteEmployeeId(null);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{labels.unauthorized}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <span className="text-sm" style={{ color: "var(--text-3)" }}>{labels.loading}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="page-title">{labels.title}</h1>
          <p className="page-subtitle">{labels.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/employees/new")} className="btn-primary">
            <Plus size={15} />
            {labels.add}
          </button>
          <button onClick={() => router.push("/employees/hierarchy")} className="btn-ghost">
            {labels.hierarchy}
          </button>
          <button onClick={() => void fetchEmployees()} className="btn-ghost">
            {labels.refresh}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl text-sm" style={{ background: "rgba(34,197,94,0.1)", color: "#4ade80", border: "1px solid rgba(34,197,94,0.2)" }}>
          {success}
        </div>
      )}

      {/* Employees List */}
      {employees.length === 0 ? (
        <div className="empty-state">
          <p className="text-sm">{labels.noEmployees}</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          {employees.map((employee, idx) => (
            <div
              key={employee.id}
              className="flex items-center justify-between px-5 py-3.5 transition"
              style={{
                borderBottom: idx < employees.length - 1 ? "1px solid var(--border)" : "none",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "var(--surface-raised)")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {employee.pictureUrl ? (
                  <img
                    src={employee.pictureUrl}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
                  >
                    {employee.firstName[0]}{employee.lastName[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                    {employee.firstName} {employee.lastName}
                  </p>
                  {employee.jobTitle && (
                    <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                      {employee.jobTitle}
                    </p>
                  )}
                </div>
                {employee.department?.name && (
                  <span className="badge badge-stone hidden sm:inline-flex">
                    {employee.department.name}
                  </span>
                )}
                {employee.role?.description && (
                  <span className="badge badge-orange hidden md:inline-flex">
                    {employee.role.description}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1 ml-4">
                <button
                  onClick={() => handleView(employee.id)}
                  title={labels.view}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-dim)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
                >
                  <Eye size={15} />
                </button>
                <button
                  onClick={() => handleEdit(employee.id)}
                  title={labels.edit}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition cursor-pointer"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--accent-dim)"; (e.currentTarget as HTMLElement).style.color = "var(--accent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
                >
                  <Edit size={15} />
                </button>
                <button
                  onClick={() => openDeleteConfirmation(employee.id)}
                  disabled={deletingId === employee.id}
                  title={labels.delete}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-40 cursor-pointer"
                  style={{ color: "var(--text-3)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "var(--text-3)"; }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(pendingDeleteEmployeeId)}
        title={labels.confirmDeleteTitle}
        message={labels.deleteConfirm}
        confirmLabel={labels.delete}
        cancelLabel={labels.cancel}
        isLoading={Boolean(deletingId)}
        onCancel={closeDeleteConfirmation}
        onConfirm={() => {
          if (pendingDeleteEmployeeId) {
            void handleDelete(pendingDeleteEmployeeId);
          }
        }}
      />
    </div>
  );
}

