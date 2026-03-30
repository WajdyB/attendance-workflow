"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/utils/api-client";
import apiConfig from "@/utils/api-config";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

type UserRole = {
  id: string;
  description: string;
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
  role?: UserRole | null;
  department?: { id: string; name: string } | null;
};

type ManagerResponse = {
  manager: UserRow | null;
};

type SupervisedResponse = {
  collaborators: UserRow[];
};

type AssignmentMap = Record<string, string | null>;

type SupervisionMap = Record<string, UserRow[]>;

const normalizeRole = (value: string | undefined | null): string =>
  (value || "").toLowerCase().trim();

export default function HierarchyManagement() {
  const { language } = useLanguage();
  const { databaseUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [assignments, setAssignments] = useState<AssignmentMap>({});
  const [supervisions, setSupervisions] = useState<SupervisionMap>({});
  const [selectedCollaboratorId, setSelectedCollaboratorId] = useState("");
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const labels = useMemo(
    () =>
      language === "fr"
        ? {
            title: "Hiérarchie collaborateurs",
            subtitle:
              "Affectez uniquement les collaborateurs à des managers après création des utilisateurs.",
            unauthorized: "Cette page est réservée aux administrateurs.",
            loading: "Chargement...",
            refresh: "Rafraîchir",
            assign: "Affecter",
            collaborator: "Collaborateur",
            manager: "Manager",
            chooseCollaborator: "Choisir un collaborateur",
            chooseManager: "Choisir un manager",
            currentManager: "Manager actuel",
            none: "Non affecté",
            visualTitle: "Vue hiérarchique",
            noManagers: "Aucun manager trouvé.",
            noCollaborators: "Aucun collaborateur trouvé.",
            noManaged: "Aucun collaborateur supervisé",
            assignSuccess: "Affectation enregistrée avec succès.",
            assignError: "Échec de l'affectation hiérarchique.",
            rules: "Règle: seulement Collaborator -> Manager",
            back: "Retour aux employés",
          }
        : {
            title: "Collaborator hierarchy",
            subtitle:
              "Assign collaborators to managers only after user creation.",
            unauthorized: "This page is restricted to administrators.",
            loading: "Loading...",
            refresh: "Refresh",
            assign: "Assign",
            collaborator: "Collaborator",
            manager: "Manager",
            chooseCollaborator: "Choose a collaborator",
            chooseManager: "Choose a manager",
            currentManager: "Current manager",
            none: "Not assigned",
            visualTitle: "Hierarchy visual",
            noManagers: "No managers found.",
            noCollaborators: "No collaborators found.",
            noManaged: "No supervised collaborators",
            assignSuccess: "Hierarchy assignment saved successfully.",
            assignError: "Failed to assign hierarchy.",
            rules: "Rule: Collaborator can only be assigned to Manager",
            back: "Back to employees",
          },
    [language],
  );

  const isAdmin = (databaseUser?.role?.description || "")
    .toLowerCase()
    .includes("admin");

  const collaborators = useMemo(
    () =>
      users.filter((entry) =>
        normalizeRole(entry.role?.description).includes("collaborator"),
      ),
    [users],
  );

  const managers = useMemo(
    () =>
      users.filter((entry) =>
        normalizeRole(entry.role?.description).includes("manager"),
      ),
    [users],
  );

  const selectedCollaborator = useMemo(
    () => collaborators.find((entry) => entry.id === selectedCollaboratorId) ?? null,
    [collaborators, selectedCollaboratorId],
  );

  const selectedCollaboratorCurrentManagerName = useMemo(() => {
    const managerId = assignments[selectedCollaboratorId];
    if (!managerId) {
      return labels.none;
    }

    const manager = users.find((entry) => entry.id === managerId);
    return manager
      ? `${manager.firstName} ${manager.lastName}`
      : labels.none;
  }, [assignments, labels.none, selectedCollaboratorId, users]);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const allUsers = await apiClient.get<UserRow[]>(apiConfig.endpoints.users.all);
      setUsers(allUsers);

      const collaboratorUsers = allUsers.filter((entry) =>
        normalizeRole(entry.role?.description).includes("collaborator"),
      );
      const managerUsers = allUsers.filter((entry) =>
        normalizeRole(entry.role?.description).includes("manager"),
      );

      const managerResults = await Promise.all(
        collaboratorUsers.map(async (entry) => {
          try {
            const response = await apiClient.get<ManagerResponse>(
              apiConfig.endpoints.users.getManager(entry.id),
            );
            return [entry.id, response.manager?.id || null] as const;
          } catch {
            return [entry.id, null] as const;
          }
        }),
      );

      const nextAssignments: AssignmentMap = {};
      for (const [collaboratorId, managerId] of managerResults) {
        nextAssignments[collaboratorId] = managerId;
      }
      setAssignments(nextAssignments);

      const supervisedResults = await Promise.all(
        managerUsers.map(async (entry) => {
          try {
            const response = await apiClient.get<SupervisedResponse>(
              apiConfig.endpoints.users.getSupervisedCollaborators(entry.id),
            );
            return [entry.id, response.collaborators || []] as const;
          } catch {
            return [entry.id, [] as UserRow[]] as const;
          }
        }),
      );

      const nextSupervisions: SupervisionMap = {};
      for (const [managerId, supervised] of supervisedResults) {
        nextSupervisions[managerId] = supervised;
      }
      setSupervisions(nextSupervisions);

      if (collaboratorUsers.length > 0 && !selectedCollaboratorId) {
        setSelectedCollaboratorId(collaboratorUsers[0].id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : labels.assignError;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAssign = async () => {
    if (!selectedCollaboratorId || !selectedManagerId) {
      return;
    }

    setIsAssigning(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.post(
        apiConfig.endpoints.users.setManager(
          selectedCollaboratorId,
          selectedManagerId,
        ),
        {},
      );
      setSuccess(labels.assignSuccess);
      await loadData();
    } catch (err) {
      const message = err instanceof Error ? err.message : labels.assignError;
      setError(message);
    } finally {
      setIsAssigning(false);
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
    <div className="w-full max-w-6xl mx-auto p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-orange-400 mb-2">{labels.title}</h1>
          <p className="text-stone-300">{labels.subtitle}</p>
          <p className="text-xs text-orange-300 mt-2">{labels.rules}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadData()}
            className="px-3 py-2 text-sm rounded-lg border border-stone-600/50 hover:border-stone-600/70 bg-stone-700/20 hover:bg-stone-700/40 text-stone-300 hover:text-stone-200 transition-all cursor-pointer"
          >
            {labels.refresh}
          </button>
          <button
            onClick={() => router.push("/employees")}
            className="px-3 py-2 text-sm rounded-lg border border-orange-500/50 hover:border-orange-500/70 bg-orange-500/15 hover:bg-orange-500/35 text-orange-300 hover:text-orange-200 transition-all cursor-pointer"
          >
            {labels.back}
          </button>
        </div>
      </div>

      {error ? (
        <div className="p-3 rounded-lg border border-red-700/50 bg-red-900/20 text-red-300 text-sm">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="p-3 rounded-lg border border-green-700/50 bg-green-900/20 text-green-300 text-sm">
          {success}
        </div>
      ) : null}

      <div className="rounded-xl border border-orange-400/20 bg-white/5 p-4">
        <h2 className="text-base font-semibold text-orange-300 mb-4">{labels.assign}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-sm text-stone-300">{labels.collaborator}</label>
            <select
              value={selectedCollaboratorId}
              onChange={(e) => setSelectedCollaboratorId(e.target.value)}
              className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
            >
              <option value="">{labels.chooseCollaborator}</option>
              {collaborators.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.firstName} {entry.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm text-stone-300">{labels.manager}</label>
            <select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
            >
              <option value="">{labels.chooseManager}</option>
              {managers
                .filter((entry) => entry.id !== selectedCollaborator?.id)
                .map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    {entry.firstName} {entry.lastName}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void handleAssign()}
              disabled={isAssigning || !selectedCollaboratorId || !selectedManagerId}
              className="w-full rounded-lg border border-orange-500/50 hover:border-orange-500/70 bg-orange-500/20 hover:bg-orange-500/40 px-3 py-2 text-sm font-medium text-orange-300 hover:text-orange-200 transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {labels.assign}
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-stone-400">
          {labels.currentManager}: {selectedCollaboratorCurrentManagerName}
        </p>
      </div>

      <div className="rounded-xl border border-orange-400/20 bg-white/5 p-4">
        <h2 className="text-base font-semibold text-orange-300 mb-4">{labels.visualTitle}</h2>

        {managers.length === 0 ? (
          <p className="text-sm text-stone-400">{labels.noManagers}</p>
        ) : (
          <div className="space-y-4">
            {managers.map((manager) => {
              const managed = supervisions[manager.id] || [];
              return (
                <div
                  key={manager.id}
                  className="rounded-lg border border-orange-400/15 bg-black/20 p-3"
                >
                  <p className="text-sm font-semibold text-stone-100">
                    {manager.firstName} {manager.lastName}
                    {manager.jobTitle ? ` · ${manager.jobTitle}` : ""}
                  </p>

                  {managed.length === 0 ? (
                    <p className="mt-2 text-sm text-stone-400">{labels.noManaged}</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {managed.map((entry) => (
                        <span
                          key={entry.id}
                          className="rounded-md border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-xs text-orange-300"
                        >
                          {entry.firstName} {entry.lastName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {collaborators.length === 0 ? (
        <div className="rounded-xl border border-stone-600/30 bg-black/20 p-3 text-sm text-stone-400">
          {labels.noCollaborators}
        </div>
      ) : null}
    </div>
  );
}

