"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { useEffect, useMemo, useState } from "react";
import RecentDocuments from "./documents";

type DossierContract = {
  id: string;
  contractType: string;
  startDate: string;
  endDate: string | null;
  weeklyHours: string | null;
  baseSalary: string | null;
  netSalary: string | null;
  bonuses: string | null;
  benefitsInKind: string | null;
};

type SalaryHistoryEntry = {
  id: string;
  oldSalary: string;
  newSalary: string;
  changeDate: string;
};

type DossierProfile = {
  id: string;
  firstName: string;
  lastName: string;
  personalEmail?: string | null;
  workEmail?: string | null;
  phone?: string | null;
  phoneFixed?: string | null;
  address?: string | null;
  birthdate?: string | null;
  jobTitle?: string | null;
  bankName?: string | null;
  bankBicSwift?: string | null;
  rib?: string | null;
  cnssNumber?: string | null;
  createdAt: string;
  role?: { description: string } | null;
  department?: { name: string; code: string } | null;
};

type DossierResponse = {
  profile: DossierProfile;
  hierarchy: {
    directManager: {
      firstName: string;
      lastName: string;
      role?: { description: string } | null;
    } | null;
    supervisedCollaborators: Array<{
      id: string;
      firstName: string;
      lastName: string;
      role?: { description: string } | null;
    }>;
  };
  contracts: {
    latest: DossierContract | null;
    history: DossierContract[];
    salaryHistory: SalaryHistoryEntry[];
  };
  documents: Array<{
    id: string;
    title: string;
    category: string;
    description?: string | null;
    versionNumber: number;
    tags: string[];
    fileUrl: string;
    fileType: string;
    fileSize: number;
    createdAt: string;
    originalName?: string | null;
  }>;
};

export default function EmployeeProfile() {
  const { databaseUser, isLoading } = useAuth();
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState("personal");
  const [dossier, setDossier] = useState<DossierResponse | null>(null);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labels = useMemo(
    () =>
      language === "fr"
        ? {
            personal: "Informations personnelles",
            hierarchy: "Hiérarchie",
            contracts: "Contrat & rémunération",
            documents: "Documents",
            id: "ID",
            email: "E-mail",
            department: "Département",
            joining: "Date d'entrée",
            phone: "Téléphone mobile",
            phoneFixed: "Téléphone fixe",
            location: "Adresse",
            role: "Rôle",
            bank: "Banque",
            bic: "Code BIC/SWIFT",
            rib: "RIB/IBAN",
            cnss: "Numéro CNSS",
            manager: "Manager direct",
            supervised: "Collaborateurs supervisés",
            latestContract: "Contrat actuel",
            contractHistory: "Historique des contrats",
            salaryHistory: "Historique des augmentations",
            contractType: "Type",
            weeklyHours: "Heures / semaine",
            grossSalary: "Salaire brut",
            netSalary: "Salaire net",
            bonuses: "Primes",
            benefits: "Avantages",
            noContract: "Aucun contrat disponible",
            loading: "Chargement du dossier...",
            error: "Impossible de charger le dossier collaborateur.",
            notSpecified: "Non renseigné",
          }
        : {
            personal: "Personal Info",
            hierarchy: "Hierarchy",
            contracts: "Contract & compensation",
            documents: "Documents",
            id: "ID",
            email: "Email",
            department: "Department",
            joining: "Joining Date",
            phone: "Mobile Phone",
            phoneFixed: "Landline",
            location: "Address",
            role: "Role",
            bank: "Bank",
            bic: "BIC/SWIFT",
            rib: "RIB/IBAN",
            cnss: "CNSS Number",
            manager: "Direct manager",
            supervised: "Supervised collaborators",
            latestContract: "Current contract",
            contractHistory: "Contract history",
            salaryHistory: "Salary increase history",
            contractType: "Type",
            weeklyHours: "Weekly hours",
            grossSalary: "Gross salary",
            netSalary: "Net salary",
            bonuses: "Bonuses",
            benefits: "Benefits in kind",
            noContract: "No contract available",
            loading: "Loading dossier...",
            error: "Unable to load collaborator dossier.",
            notSpecified: "Not specified",
          },
    [language],
  );

  useEffect(() => {
    if (!databaseUser?.id) return;

    const loadDossier = async () => {
      setLoadingDossier(true);
      setError(null);

      try {
        const data = await apiClient.get<DossierResponse>(
          apiConfig.endpoints.users.dossier(databaseUser.id),
        );
        setDossier(data);
      } catch {
        setError(labels.error);
      } finally {
        setLoadingDossier(false);
      }
    };

    void loadDossier();
  }, [databaseUser?.id, labels.error]);

  if (isLoading || loadingDossier) {
    return (
      <div className="bg-white rounded-2xl border border-orange-100 p-8">
        <div className="flex justify-center items-center gap-3 text-sm text-stone-600">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600"></div>
          <span>{labels.loading}</span>
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="bg-white rounded-2xl border border-orange-100 p-8 text-sm text-red-600">
        {error || labels.error}
      </div>
    );
  }

  const user = dossier.profile;
  const latestContract = dossier.contracts.latest;
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`;

  return (
    <div className="bg-white rounded-2xl border border-orange-100 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-orange-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center shadow-md">
              <span className="text-2xl font-bold text-white">{initials || "U"}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-sm text-stone-600 mt-1">
                {user.jobTitle || labels.notSpecified}
              </p>
              <span className="inline-block mt-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                {user.role?.description || labels.notSpecified}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-stone-400">{labels.id}</p>
            <p className="text-sm font-mono text-stone-600">
              {user.id.slice(-8).toUpperCase()}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 border-b border-orange-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">{labels.email}</p>
            <p className="text-sm text-stone-700 mt-1">{user.personalEmail || labels.notSpecified}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">{labels.department}</p>
            <p className="text-sm text-stone-700 mt-1">{user.department?.name || labels.notSpecified}</p>
          </div>
          <div>
            <p className="text-xs text-stone-400 uppercase tracking-wide">{labels.joining}</p>
            <p className="text-sm text-stone-700 mt-1">
              {new Date(user.createdAt).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pt-4">
        <div className="flex flex-wrap gap-6 border-b border-orange-100">
          {["personal", "hierarchy", "contracts", "documents"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 text-sm font-medium transition ${
                activeTab === tab
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-stone-500 hover:text-stone-700"
              }`}
            >
              {tab === "personal"
                ? labels.personal
                : tab === "hierarchy"
                  ? labels.hierarchy
                  : tab === "contracts"
                    ? labels.contracts
                    : labels.documents}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {activeTab === "personal" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.phone}</span><span className="text-stone-700">{user.phone || labels.notSpecified}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.phoneFixed}</span><span className="text-stone-700">{user.phoneFixed || labels.notSpecified}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.location}</span><span className="text-stone-700">{user.address || labels.notSpecified}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.role}</span><span className="text-stone-700">{user.role?.description || labels.notSpecified}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.bank}</span><span className="text-stone-700">{user.bankName || labels.notSpecified}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.bic}</span><span className="text-stone-700">{user.bankBicSwift || labels.notSpecified}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.rib}</span><span className="text-stone-700">{user.rib || labels.notSpecified}</span></div>
            <div className="flex justify-between text-sm py-2 border-b border-orange-50"><span className="text-stone-500">{labels.cnss}</span><span className="text-stone-700">{user.cnssNumber || labels.notSpecified}</span></div>
          </div>
        )}

        {activeTab === "hierarchy" && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl border border-orange-100 bg-orange-50 p-4">
              <p className="text-stone-500">{labels.manager}</p>
              <p className="mt-1 font-medium text-stone-900">
                {dossier.hierarchy.directManager
                  ? `${dossier.hierarchy.directManager.firstName} ${dossier.hierarchy.directManager.lastName}`
                  : labels.notSpecified}
              </p>
            </div>
            <div className="rounded-xl border border-orange-100 bg-white p-4">
              <p className="text-stone-500 mb-2">{labels.supervised}</p>
              {dossier.hierarchy.supervisedCollaborators.length === 0 ? (
                <p className="text-stone-700">{labels.notSpecified}</p>
              ) : (
                <ul className="space-y-1">
                  {dossier.hierarchy.supervisedCollaborators.map((entry) => (
                    <li key={entry.id} className="text-stone-800">
                      {entry.firstName} {entry.lastName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === "contracts" && (
          <div className="space-y-4 text-sm">
            {!latestContract ? (
              <p className="text-stone-600">{labels.noContract}</p>
            ) : (
              <div className="rounded-xl border border-orange-100 bg-orange-50 p-4 space-y-2">
                <p className="font-semibold text-stone-900">{labels.latestContract}</p>
                <div className="flex justify-between"><span className="text-stone-500">{labels.contractType}</span><span>{latestContract.contractType}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{labels.weeklyHours}</span><span>{latestContract.weeklyHours ?? labels.notSpecified}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{labels.grossSalary}</span><span>{latestContract.baseSalary ?? labels.notSpecified}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{labels.netSalary}</span><span>{latestContract.netSalary ?? labels.notSpecified}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{labels.bonuses}</span><span>{latestContract.bonuses ?? labels.notSpecified}</span></div>
                <div className="flex justify-between"><span className="text-stone-500">{labels.benefits}</span><span>{latestContract.benefitsInKind ?? labels.notSpecified}</span></div>
              </div>
            )}

            <div className="rounded-xl border border-orange-100 bg-white p-4">
              <p className="font-semibold text-stone-900 mb-3">{labels.contractHistory}</p>
              <div className="space-y-2">
                {dossier.contracts.history.map((contract) => (
                  <div key={contract.id} className="flex items-center justify-between border-b border-orange-50 pb-2 last:border-b-0">
                    <span className="text-stone-700">{contract.contractType}</span>
                    <span className="text-xs text-stone-500">
                      {new Date(contract.startDate).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-orange-100 bg-white p-4">
              <p className="font-semibold text-stone-900 mb-3">{labels.salaryHistory}</p>
              {dossier.contracts.salaryHistory.length === 0 ? (
                <p className="text-stone-600">{labels.notSpecified}</p>
              ) : (
                <div className="space-y-2">
                  {dossier.contracts.salaryHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between border-b border-orange-50 pb-2 last:border-b-0"
                    >
                      <span className="text-stone-700">
                        {entry.oldSalary} → {entry.newSalary}
                      </span>
                      <span className="text-xs text-stone-500">
                        {new Date(entry.changeDate).toLocaleDateString(language === "fr" ? "fr-FR" : "en-US")}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "documents" && (
          <RecentDocuments userId={user.id} initialDocuments={dossier.documents} />
        )}
      </div>
    </div>
  );
}

