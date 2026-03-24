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
      <div className="flex items-center justify-center h-screen">
        <p className="text-stone-400">{labels.loading}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-orange-400 mb-2">{labels.title}</h1>
        <p className="text-stone-300">{labels.subtitle}</p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-4 bg-green-900/20 border border-green-700/50 rounded-lg text-green-400 text-sm">
          {success}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-6 flex gap-3">
        <button
          onClick={() => router.push("/employees/new")}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-400 rounded-lg transition-all text-sm font-medium"
        >
          <Plus size={16} />
          {labels.add}
        </button>
        <button
          onClick={() => router.push("/employees/hierarchy")}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/40 text-orange-300 rounded-lg transition-all text-sm font-medium"
        >
          {labels.hierarchy}
        </button>
        <button
          onClick={() => void fetchEmployees()}
          className="flex items-center gap-2 px-4 py-2 bg-stone-700/20 hover:bg-stone-700/30 border border-stone-600/50 text-stone-300 rounded-lg transition-all text-sm font-medium"
        >
          {labels.refresh}
        </button>
      </div>

      {/* Employees List */}
      {employees.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <p>{labels.noEmployees}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="flex items-center justify-between p-4 bg-white/70 backdrop-blur-md border border-orange-100/20 rounded-lg hover:bg-white/80 transition-colors"
            >
              {/* Employee Info */}
              <div className="flex items-center gap-4 flex-1">
                {/* Picture */}
                {employee.pictureUrl ? (
                  <img
                    src={employee.pictureUrl}
                    alt={`${employee.firstName} ${employee.lastName}`}
                    className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0 border border-orange-500/50">
                    <span className="text-orange-400 font-bold text-sm">
                      {employee.firstName[0]}
                      {employee.lastName[0]}
                    </span>
                  </div>
                )}

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">
                    {employee.firstName} {employee.lastName}
                  </p>
                  {employee.jobTitle && (
                    <p className="text-stone-300 text-sm">{employee.jobTitle}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleView(employee.id)}
                  title={labels.view}
                  className="p-2 text-stone-300 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all"
                >
                  <Eye size={18} />
                </button>
                <button
                  onClick={() => handleEdit(employee.id)}
                  title={labels.edit}
                  className="p-2 text-stone-300 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-all"
                >
                  <Edit size={18} />
                </button>
                <button
                  onClick={() => openDeleteConfirmation(employee.id)}
                  disabled={deletingId === employee.id}
                  title={labels.delete}
                  className="p-2 text-stone-300 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all disabled:opacity-50"
                >
                  <Trash2 size={18} />
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

