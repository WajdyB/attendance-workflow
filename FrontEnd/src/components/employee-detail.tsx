"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/utils/api-client";
import apiConfig from "@/utils/api-config";
import { useLanguage } from "@/context/LanguageContext";
import { Camera, Save, X, Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";

type Role = {
  id: string;
  description: string;
};

type Department = {
  id: string;
  name: string;
  code?: string;
};

type DocumentCategory =
  | "HR"
  | "CONTRACT"
  | "PAYROLL"
  | "REQUEST_ATTACHMENT"
  | "OTHER";

type PendingDocument = {
  id: string;
  file: File | null;
  title: string;
  category: DocumentCategory;
  description: string;
  tags: string;
};

type EmployeeDocument = {
  id: string;
  title?: string | null;
  category: DocumentCategory;
  description?: string | null;
  versionNumber?: number | null;
  originalName?: string | null;
  tags?: string[] | null;
  fileUrl?: string | null;
  fileType?: string | null;
  uploadedBy?: string | null;
  createdAt?: string | null;
};

type EmployeeOption = {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string | null;
};

type EmployeeData = {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl?: string | null;
  personalEmail: string;
  workEmail?: string | null;
  birthdate?: string | null;
  phone?: string | null;
  phoneFixed?: string | null;
  address?: string | null;
  jobTitle?: string | null;
  bankName?: string | null;
  bankBicSwift?: string | null;
  rib?: string | null;
  cnssNumber?: string | null;
  roleId?: string | null;
  departmentId?: string | null;
  accountStatus?: "ACTIVE" | "INACTIVE";
  role?: Role | null;
  department?: Department | null;
};

type FormData = {
  firstName: string;
  lastName: string;
  personalEmail: string;
  workEmail: string;
  birthdate: string;
  phone: string;
  phoneFixed?: string;
  address: string;
  jobTitle: string;
  bankName: string;
  bankBicSwift?: string;
  rib?: string;
  cnssNumber: string;
  pictureUrl?: string;
  password?: string;
  accountStatus?: "ACTIVE" | "INACTIVE";
  roleId?: string;
  departmentId?: string;
};

interface EmployeeDetailProps {
  employeeId?: string;
  isNewEmployee?: boolean;
  isEditMode?: boolean;
}

const normalizeBirthdateForInput = (value?: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const trimmedValue = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return trimmedValue;
  }

  const parsed = new Date(trimmedValue);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return parsed.toISOString().slice(0, 10);
};

const toIsoBirthdate = (value?: unknown): string | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const trimmedValue = String(value).trim();
  if (!trimmedValue) {
    return undefined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
    return `${trimmedValue}T00:00:00.000Z`;
  }

  const parsed = new Date(trimmedValue);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
};

export default function EmployeeDetail({
  employeeId,
  isNewEmployee = false,
  isEditMode = false,
}: EmployeeDetailProps) {
  const { language } = useLanguage();
  const router = useRouter();

  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    personalEmail: "",
    workEmail: "",
    birthdate: "",
    phone: "",
    phoneFixed: "",
    address: "",
    jobTitle: "",
    bankName: "",
    bankBicSwift: "",
    rib: "",
    cnssNumber: "",
    pictureUrl: "",
    accountStatus: "ACTIVE",
    roleId: "",
    departmentId: "",
  });

  const [isLoading, setIsLoading] = useState(!isNewEmployee);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [employeeDocuments, setEmployeeDocuments] = useState<EmployeeDocument[]>([]);
  const [pendingDeleteDocument, setPendingDeleteDocument] = useState<EmployeeDocument | null>(null);
  const [isDeletingDocument, setIsDeletingDocument] = useState(false);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentCategoryFilter, setDocumentCategoryFilter] = useState<"ALL" | DocumentCategory>("ALL");
  const [documentTagFilter, setDocumentTagFilter] = useState("");
  const [previewDocument, setPreviewDocument] = useState<EmployeeDocument | null>(null);
  const [employeesOptions, setEmployeesOptions] = useState<EmployeeOption[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [supervisedCollaborators, setSupervisedCollaborators] = useState<EmployeeOption[]>([]);

  const labels = useMemo(
    () =>
      language === "fr"
        ? {
            newEmployee: "Créer un employé",
            viewEmployee: "Détails de l'employé",
            editEmployee: "Modifier l'employé",
            loading: "Chargement...",
            save: "Enregistrer",
            cancel: "Annuler",
            changePicture: "Changer la photo",
            removePicture: "Supprimer la photo",
            documentsTitle: "Documents du dossier",
            existingDocumentsTitle: "Documents existants",
            addDocument: "Ajouter un document",
            removeDocument: "Retirer",
            deleteDocument: "Supprimer le document",
            confirmDeleteDocumentTitle: "Confirmer la suppression",
            confirmDeleteDocumentMessage: "Voulez-vous vraiment supprimer ce document ?",
            documentFile: "Fichier",
            documentTitle: "Titre",
            documentCategory: "Catégorie",
            documentDescription: "Description",
            documentTags: "Tags (séparés par des virgules)",
            documentVersion: "Version",
            documentCreatedAt: "Ajouté le",
            documentSearch: "Rechercher",
            documentFilterCategory: "Filtrer par catégorie",
            documentFilterTag: "Filtrer par tag",
            openDocument: "Ouvrir",
            previewDocument: "Prévisualiser",
            noExistingDocuments: "Aucun document disponible.",
            missingDocumentData: "Chaque document doit avoir un fichier, un titre et une catégorie.",
            documentUploadError: "Échec de l'envoi d'un ou plusieurs documents.",
            documentDeleteSuccess: "Document supprimé avec succès.",
            documentDeleteError: "Échec de la suppression du document.",
            previewNotAvailable: "Prévisualisation non disponible pour ce type de fichier.",
            firstName: "Prénom",
            lastName: "Nom",
            personalEmail: "Email personnel",
            workEmail: "Email professionnel",
            password: "Mot de passe",
            newPassword: "Nouveau mot de passe",
            newPasswordHint: "Laisser vide pour conserver le mot de passe actuel.",
            birthdate: "Date de naissance",
            phone: "Téléphone",
            phoneFixed: "Téléphone fixe",
            address: "Adresse",
            jobTitle: "Poste",
            bankName: "Banque",
            bankBicSwift: "BIC/SWIFT",
            rib: "RIB",
            cnssNumber: "N° CNSS",
            role: "Rôle",
            department: "Département",
            manager: "Manager direct",
            chooseManager: "Choisir un manager",
            supervisedCollaborators: "Collaborateurs supervisés",
            noSupervisedCollaborators: "Aucun collaborateur supervisé.",
            accountStatus: "Statut du compte",
            active: "Actif",
            inactive: "Inactif",
            chooseRole: "Choisir un rôle",
            chooseDepartment: "Choisir un département",
            required: "* Obligatoire",
            saveSuccess: "Employé enregistré avec succès.",
            saveError: "Erreur lors de l'enregistrement.",
          }
        : {
            newEmployee: "Create employee",
            viewEmployee: "Employee details",
            editEmployee: "Edit employee",
            loading: "Loading...",
            save: "Save",
            cancel: "Cancel",
            changePicture: "Change picture",
            removePicture: "Remove picture",
            documentsTitle: "Dossier documents",
            existingDocumentsTitle: "Existing documents",
            addDocument: "Add document",
            removeDocument: "Remove",
            deleteDocument: "Delete document",
            confirmDeleteDocumentTitle: "Confirm deletion",
            confirmDeleteDocumentMessage: "Are you sure you want to delete this document?",
            documentFile: "File",
            documentTitle: "Title",
            documentCategory: "Category",
            documentDescription: "Description",
            documentTags: "Tags (comma separated)",
            documentVersion: "Version",
            documentCreatedAt: "Added on",
            documentSearch: "Search",
            documentFilterCategory: "Filter by category",
            documentFilterTag: "Filter by tag",
            openDocument: "Open",
            previewDocument: "Preview",
            noExistingDocuments: "No documents available.",
            missingDocumentData: "Each document must have a file, title and category.",
            documentUploadError: "Failed to upload one or more documents.",
            documentDeleteSuccess: "Document deleted successfully.",
            documentDeleteError: "Failed to delete document.",
            previewNotAvailable: "Preview is not available for this file type.",
            firstName: "First name",
            lastName: "Last name",
            personalEmail: "Personal email",
            workEmail: "Work email",
            password: "Password",
            newPassword: "New password",
            newPasswordHint: "Leave empty to keep the current password.",
            birthdate: "Birth date",
            phone: "Phone",
            phoneFixed: "Phone fixed",
            address: "Address",
            jobTitle: "Job title",
            bankName: "Bank",
            bankBicSwift: "BIC/SWIFT",
            rib: "RIB",
            cnssNumber: "CNSS number",
            role: "Role",
            department: "Department",
            manager: "Direct manager",
            chooseManager: "Choose a manager",
            supervisedCollaborators: "Supervised collaborators",
            noSupervisedCollaborators: "No supervised collaborators.",
            accountStatus: "Account status",
            active: "Active",
            inactive: "Inactive",
            chooseRole: "Choose a role",
            chooseDepartment: "Choose a department",
            required: "* Required",
            saveSuccess: "Employee saved successfully.",
            saveError: "Error saving employee.",
          },
    [language],
  );

  // Fetch employee data
  useEffect(() => {
    if (isNewEmployee || !employeeId) return;

    const fetchEmployee = async () => {
      setIsLoading(true);
      try {
        const data = await apiClient.get<EmployeeData>(
          apiConfig.endpoints.users.byId(employeeId),
        );
        setFormData({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          personalEmail: data.personalEmail || "",
          workEmail: data.workEmail || "",
          birthdate: normalizeBirthdateForInput(data.birthdate),
          phone: data.phone || "",
          phoneFixed: data.phoneFixed || "",
          address: data.address || "",
          jobTitle: data.jobTitle || "",
          bankName: data.bankName || "",
          bankBicSwift: data.bankBicSwift || "",
          rib: data.rib || "",
          cnssNumber: data.cnssNumber || "",
          pictureUrl: data.pictureUrl || "",
          accountStatus: (data.accountStatus || "ACTIVE") as "ACTIVE" | "INACTIVE",
          roleId: data.roleId || "",
          departmentId: data.departmentId || "",
        });
        setPreviewUrl(data.pictureUrl || null);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load employee";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchEmployee();
  }, [employeeId, isNewEmployee]);

  const loadEmployeeDocuments = async (userId: string) => {
    try {
      const params = new URLSearchParams();
      if (documentCategoryFilter !== "ALL") {
        params.set("category", documentCategoryFilter);
      }
      if (documentSearch.trim()) {
        params.set("search", documentSearch.trim());
      }
      if (documentTagFilter.trim()) {
        params.set("tag", documentTagFilter.trim());
      }

      const docs = await apiClient.get<EmployeeDocument[]>(
        `${apiConfig.endpoints.documents.byUser(userId)}${
          params.toString() ? `?${params.toString()}` : ""
        }`,
      );
      setEmployeeDocuments(docs);
    } catch {
      setEmployeeDocuments([]);
    }
  };

  useEffect(() => {
    if (isNewEmployee || !employeeId) return;

    void loadEmployeeDocuments(employeeId);
  }, [employeeId, isNewEmployee, documentSearch, documentCategoryFilter, documentTagFilter]);

  // Fetch roles and departments
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [rolesData, departmentsData, usersData] = await Promise.all([
          apiClient.get<Role[]>(apiConfig.endpoints.roles.all),
          apiClient.get<Department[]>(apiConfig.endpoints.departments.all),
          apiClient.get<EmployeeOption[]>(apiConfig.endpoints.users.all),
        ]);
        setRoles(rolesData);
        setDepartments(departmentsData);
        setEmployeesOptions(usersData);
      } catch {
        // Silent error, just don't populate options
      }
    };

    void fetchOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isNewEmployee || !employeeId) {
      setSelectedManagerId("");
      setSupervisedCollaborators([]);
      return;
    }

    const fetchHierarchy = async () => {
      try {
        const [managerResponse, supervisedResponse] = await Promise.all([
          apiClient.get<{ manager: EmployeeOption | null }>(
            apiConfig.endpoints.users.getManager(employeeId),
          ),
          apiClient.get<{ collaborators: EmployeeOption[] }>(
            apiConfig.endpoints.users.getSupervisedCollaborators(employeeId),
          ),
        ]);

        setSelectedManagerId(managerResponse?.manager?.id || "");
        setSupervisedCollaborators(supervisedResponse?.collaborators || []);
      } catch {
        setSelectedManagerId("");
        setSupervisedCollaborators([]);
      }
    };

    void fetchHierarchy();
  }, [employeeId, isNewEmployee]);

  const handlePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPictureFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleRemovePicture = async () => {
    setError(null);
    setSuccess(null);

    if (isNewEmployee) {
      setPictureFile(null);
      setPreviewUrl(null);
      setFormData((prev) => ({ ...prev, pictureUrl: "" }));
      return;
    }

    if (!employeeId) {
      return;
    }

    try {
      const response = await apiClient.delete<{ user?: EmployeeData }>(
        apiConfig.endpoints.users.removePicture(employeeId),
      );
      setPictureFile(null);
      setPreviewUrl(null);
      setFormData((prev) => ({ ...prev, pictureUrl: "" }));
      if (response?.user) {
        setFormData((prev) => ({
          ...prev,
          pictureUrl: response.user?.pictureUrl || "",
        }));
      }
      setSuccess(
        language === "fr"
          ? "Photo supprimée avec succès."
          : "Picture removed successfully.",
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : language === "fr"
            ? "Échec de la suppression de la photo."
            : "Failed to remove picture.";
      setError(message);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const addPendingDocument = () => {
    setPendingDocuments((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file: null,
        title: "",
        category: "OTHER",
        description: "",
        tags: "",
      },
    ]);
  };

  const removePendingDocument = (id: string) => {
    setPendingDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const updatePendingDocument = (
    id: string,
    field: keyof Omit<PendingDocument, "id">,
    value: string | File | null,
  ) => {
    setPendingDocuments((prev) =>
      prev.map((doc) =>
        doc.id === id
          ? {
              ...doc,
              [field]: value,
            }
          : doc,
      ),
    );
  };

  const handleDeleteDocument = async () => {
    if (!employeeId || !pendingDeleteDocument) {
      return;
    }

    setIsDeletingDocument(true);
    setError(null);
    setSuccess(null);

    try {
      await apiClient.delete(
        apiConfig.endpoints.documents.delete(pendingDeleteDocument.id, employeeId),
      );
      await loadEmployeeDocuments(employeeId);
      setSuccess(labels.documentDeleteSuccess);
      setPendingDeleteDocument(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : labels.documentDeleteError;
      setError(message);
    } finally {
      setIsDeletingDocument(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const payload: Partial<FormData> = { ...formData };
      let resolvedEmployeeId = employeeId;
      const isoBirthdate = toIsoBirthdate(payload.birthdate);

      if (
        pendingDocuments.some(
          (doc) => !doc.file || !doc.title.trim() || !doc.category,
        )
      ) {
        setError(labels.missingDocumentData);
        setIsSaving(false);
        return;
      }
      
      if (isNewEmployee) {
        // For new employees, password is required
        if (!formData.password) {
          setError("Password is required for new employees");
          setIsSaving(false);
          return;
        }

        if (!isoBirthdate) {
          setError("Birthdate is required and must be a valid date");
          setIsSaving(false);
          return;
        }

        payload.password = formData.password;
        payload.birthdate = isoBirthdate;
      }

      if (isNewEmployee) {
        const createResponse = await apiClient.post<{ user?: { id?: string } }>(
          apiConfig.endpoints.users.create,
          payload,
        );
        resolvedEmployeeId = createResponse?.user?.id;
      } else if (employeeId) {
        delete payload.password;
        if (isoBirthdate) {
          payload.birthdate = isoBirthdate;
        } else {
          delete payload.birthdate;
        }
        await apiClient.patch(apiConfig.endpoints.users.byId(employeeId), payload);

        const nextPassword =
          typeof formData.password === "string" ? formData.password.trim() : "";

        if (nextPassword) {
          await apiClient.patch(apiConfig.endpoints.users.updatePassword(employeeId), {
            newPassword: nextPassword,
          });
        }
      }

      if (pictureFile && resolvedEmployeeId) {
        const formDataPayload = new FormData();
        formDataPayload.append("file", pictureFile);
        const pictureResponse = await apiClient.post<{ user?: EmployeeData }>(
          apiConfig.endpoints.users.uploadPicture(resolvedEmployeeId),
          formDataPayload,
        );
        if (pictureResponse?.user?.pictureUrl) {
          setPreviewUrl(pictureResponse.user.pictureUrl);
        }
      }

      if (resolvedEmployeeId && pendingDocuments.length > 0) {
        try {
          for (const document of pendingDocuments) {
            if (!document.file) {
              continue;
            }

            const documentFormData = new FormData();
            documentFormData.append("file", document.file);
            documentFormData.append("title", document.title.trim());
            documentFormData.append("category", document.category);
            if (document.description.trim()) {
              documentFormData.append("description", document.description.trim());
            }
            if (document.tags.trim()) {
              documentFormData.append("tags", document.tags.trim());
            }

            await apiClient.post(
              apiConfig.endpoints.documents.upload(resolvedEmployeeId),
              documentFormData,
            );
          }
        } catch {
          throw new Error(labels.documentUploadError);
        }
      }

      if (resolvedEmployeeId && selectedManagerId) {
        await apiClient.post(
          apiConfig.endpoints.users.setManager(resolvedEmployeeId, selectedManagerId),
          {},
        );
      }

      setSuccess(labels.saveSuccess);
      setTimeout(() => {
        router.push("/employees");
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : labels.saveError;
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const title = isNewEmployee
    ? labels.newEmployee
    : isEditMode
      ? labels.editEmployee
      : labels.viewEmployee;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-stone-400">{labels.loading}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-orange-400 mb-2">{title}</h1>
        </div>
        <button
          onClick={() => router.back()}
          className="p-2 text-stone-400 hover:text-white hover:bg-stone-700/30 rounded-lg transition-all"
          title={labels.cancel}
        >
          <X size={24} />
        </button>
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

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Profile Picture */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Profile"
                className="w-32 h-32 rounded-lg object-cover border-2 border-orange-500/50"
              />
            ) : (
              <div className="w-32 h-32 rounded-lg bg-orange-500/20 border-2 border-orange-500/50 flex items-center justify-center">
                <Camera className="text-orange-400" size={48} />
              </div>
            )}
            {isEditMode || isNewEmployee ? (
              <label className="absolute bottom-0 right-0 p-2 bg-orange-500/90 hover:bg-orange-600 rounded-lg cursor-pointer transition-colors">
                <Camera size={16} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePictureChange}
                  className="hidden"
                />
              </label>
            ) : null}
          </div>
        </div>
        {(isEditMode || isNewEmployee) && previewUrl ? (
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={() => void handleRemovePicture()}
              className="flex items-center gap-2 px-3 py-2 bg-red-900/20 hover:bg-red-900/30 border border-red-700/50 text-red-300 rounded-lg transition-all text-sm"
            >
              <Trash2 size={16} />
              {labels.removePicture}
            </button>
          </div>
        ) : null}

        {isNewEmployee || isEditMode ? (
          <div className="mt-8 rounded-xl border border-orange-400/20 bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-orange-300">
                {labels.documentsTitle}
              </h2>
              <button
                type="button"
                onClick={addPendingDocument}
                className="rounded-lg border border-orange-400/35 bg-orange-500/15 px-3 py-2 text-sm font-medium text-orange-300 transition hover:bg-orange-500/25"
              >
                {labels.addDocument}
              </button>
            </div>

            {pendingDocuments.length === 0 ? (
              <p className="text-sm text-stone-400">
                {language === "fr"
                  ? "Ajoutez des documents pour compléter le dossier employé."
                  : "Add documents to complete the employee dossier."}
              </p>
            ) : (
              <div className="space-y-4">
                {pendingDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-lg border border-orange-400/15 bg-black/20 p-3"
                  >
                    <div className="mb-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removePendingDocument(document.id)}
                        className="rounded-lg border border-red-500/40 bg-red-900/25 px-3 py-1 text-xs text-red-200 transition hover:bg-red-900/40"
                      >
                        {labels.removeDocument}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm text-stone-300">
                          {labels.documentFile}
                        </label>
                        <input
                          type="file"
                          onChange={(e) =>
                            updatePendingDocument(
                              document.id,
                              "file",
                              e.target.files?.[0] ?? null,
                            )
                          }
                          className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-stone-300">
                          {labels.documentTitle}
                        </label>
                        <input
                          type="text"
                          value={document.title}
                          onChange={(e) =>
                            updatePendingDocument(document.id, "title", e.target.value)
                          }
                          className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-stone-300">
                          {labels.documentCategory}
                        </label>
                        <select
                          value={document.category}
                          onChange={(e) =>
                            updatePendingDocument(
                              document.id,
                              "category",
                              e.target.value as DocumentCategory,
                            )
                          }
                          className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                        >
                          <option value="HR">HR</option>
                          <option value="CONTRACT">CONTRACT</option>
                          <option value="PAYROLL">PAYROLL</option>
                          <option value="REQUEST_ATTACHMENT">REQUEST_ATTACHMENT</option>
                          <option value="OTHER">OTHER</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-1 block text-sm text-stone-300">
                          {labels.documentTags}
                        </label>
                        <input
                          type="text"
                          value={document.tags}
                          onChange={(e) =>
                            updatePendingDocument(document.id, "tags", e.target.value)
                          }
                          className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <label className="mb-1 block text-sm text-stone-300">
                        {labels.documentDescription}
                      </label>
                      <textarea
                        value={document.description}
                        onChange={(e) =>
                          updatePendingDocument(document.id, "description", e.target.value)
                        }
                        rows={2}
                        className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {!isNewEmployee ? (
          <div className="mt-8 rounded-xl border border-orange-400/20 bg-white/5 p-4">
            <h2 className="mb-4 text-base font-semibold text-orange-300">
              {labels.existingDocumentsTitle}
            </h2>

            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-stone-300">
                  {labels.documentSearch}
                </label>
                <input
                  type="text"
                  value={documentSearch}
                  onChange={(e) => setDocumentSearch(e.target.value)}
                  className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-300">
                  {labels.documentFilterCategory}
                </label>
                <select
                  value={documentCategoryFilter}
                  onChange={(e) =>
                    setDocumentCategoryFilter(e.target.value as "ALL" | DocumentCategory)
                  }
                  className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                >
                  <option value="ALL">ALL</option>
                  <option value="HR">HR</option>
                  <option value="CONTRACT">CONTRACT</option>
                  <option value="PAYROLL">PAYROLL</option>
                  <option value="REQUEST_ATTACHMENT">REQUEST_ATTACHMENT</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm text-stone-300">
                  {labels.documentFilterTag}
                </label>
                <input
                  type="text"
                  value={documentTagFilter}
                  onChange={(e) => setDocumentTagFilter(e.target.value)}
                  className="w-full rounded-lg border border-stone-600/30 bg-white/10 px-3 py-2 text-sm text-stone-200"
                />
              </div>
            </div>

            {employeeDocuments.length === 0 ? (
              <p className="text-sm text-stone-400">{labels.noExistingDocuments}</p>
            ) : (
              <div className="space-y-3">
                {employeeDocuments.map((document) => (
                  <div
                    key={document.id}
                    className="rounded-lg border border-orange-400/15 bg-black/20 p-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-medium text-stone-100">
                          {document.title || document.originalName || "Untitled"}
                        </p>
                        <p className="mt-1 text-xs text-stone-400">
                          {labels.documentCategory}: {document.category}
                          {document.versionNumber
                            ? ` · ${labels.documentVersion} ${document.versionNumber}`
                            : ""}
                        </p>
                        {document.createdAt ? (
                          <p className="mt-1 text-xs text-stone-500">
                            {labels.documentCreatedAt}: {new Date(document.createdAt).toLocaleDateString()}
                          </p>
                        ) : null}
                        {document.description ? (
                          <p className="mt-2 text-sm text-stone-300">{document.description}</p>
                        ) : null}
                        {document.tags && document.tags.length > 0 ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {document.tags.map((tag) => (
                              <span
                                key={`${document.id}-${tag}`}
                                className="rounded-md border border-orange-400/30 bg-orange-500/10 px-2 py-1 text-xs text-orange-300"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {document.fileUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewDocument(document)}
                            className="rounded-lg border border-stone-500/35 bg-stone-700/20 px-3 py-2 text-xs font-medium text-stone-200 transition hover:bg-stone-700/35"
                          >
                            {labels.previewDocument}
                          </button>
                        ) : null}
                        {document.fileUrl ? (
                          <a
                            href={document.fileUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg border border-orange-400/35 bg-orange-500/10 px-3 py-2 text-xs font-medium text-orange-300 transition hover:bg-orange-500/20"
                          >
                            {labels.openDocument}
                          </a>
                        ) : null}
                        {isEditMode ? (
                          <button
                            type="button"
                            onClick={() => setPendingDeleteDocument(document)}
                            className="rounded-lg border border-red-500/40 bg-red-900/25 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-900/40"
                          >
                            {labels.deleteDocument}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        <ConfirmModal
          isOpen={Boolean(pendingDeleteDocument)}
          title={labels.confirmDeleteDocumentTitle}
          message={
            pendingDeleteDocument?.title
              ? `${labels.confirmDeleteDocumentMessage} (${pendingDeleteDocument.title})`
              : labels.confirmDeleteDocumentMessage
          }
          confirmLabel={labels.deleteDocument}
          cancelLabel={labels.cancel}
          isLoading={isDeletingDocument}
          onCancel={() => {
            if (!isDeletingDocument) {
              setPendingDeleteDocument(null);
            }
          }}
          onConfirm={() => {
            void handleDeleteDocument();
          }}
        />

        {previewDocument ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-4xl rounded-xl border border-orange-400/30 bg-stone-900 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-orange-300">
                  {previewDocument.title || previewDocument.originalName || labels.previewDocument}
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewDocument(null)}
                  className="rounded-md border border-stone-600/40 px-2 py-1 text-xs text-stone-300 hover:bg-stone-700/40"
                >
                  {labels.cancel}
                </button>
              </div>

              <div className="h-[65vh] overflow-hidden rounded-lg border border-stone-700/40 bg-black/40">
                {previewDocument.fileUrl ? (
                  previewDocument.fileType?.startsWith("image/") ? (
                    <img
                      src={previewDocument.fileUrl}
                      alt={previewDocument.title || "document"}
                      className="h-full w-full object-contain"
                    />
                  ) : previewDocument.fileType?.includes("pdf") ? (
                    <iframe
                      src={previewDocument.fileUrl}
                      title={previewDocument.title || "document-preview"}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-stone-400">
                      {labels.previewNotAvailable}
                    </div>
                  )
                ) : (
                  <div className="flex h-full items-center justify-center p-6 text-center text-sm text-stone-400">
                    {labels.previewNotAvailable}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {/* Personal Information */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            {language === "fr" ? "Informations personnelles" : "Personal Information"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label={labels.firstName}
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
              required
            />
            <InputField
              label={labels.lastName}
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
              required
            />
            <InputField
              label={labels.personalEmail}
              name="personalEmail"
              type="email"
              value={formData.personalEmail}
              onChange={handleInputChange}
              disabled={!isNewEmployee}
              required
            />
            <InputField
              label={labels.workEmail}
              name="workEmail"
              type="email"
              value={formData.workEmail}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
            <InputField
              label={labels.birthdate}
              name="birthdate"
              type="date"
              value={formData.birthdate}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
            <InputField
              label={labels.jobTitle}
              name="jobTitle"
              value={formData.jobTitle}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
          </div>
        </div>

        {/* Contact Information */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            {language === "fr" ? "Contact" : "Contact"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label={labels.phone}
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
            <InputField
              label={labels.phoneFixed}
              name="phoneFixed"
              value={formData.phoneFixed || ""}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
            <InputField
              label={labels.address}
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
          </div>
        </div>

        {/* Bank Information */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            {language === "fr" ? "Informations bancaires" : "Bank Information"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InputField
              label={labels.bankName}
              name="bankName"
              value={formData.bankName}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
            <InputField
              label={labels.bankBicSwift}
              name="bankBicSwift"
              value={formData.bankBicSwift || ""}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
            <InputField
              label={labels.rib}
              name="rib"
              value={formData.rib || ""}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
            <InputField
              label={labels.cnssNumber}
              name="cnssNumber"
              value={formData.cnssNumber}
              onChange={handleInputChange}
              disabled={!isEditMode && !isNewEmployee}
            />
          </div>
        </div>

        {/* Organization Information */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            {language === "fr" ? "Organisation" : "Organization"}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label={labels.role}
              name="roleId"
              value={formData.roleId || ""}
              onChange={handleInputChange}
              options={roles.map((r) => ({ id: r.id, label: r.description }))}
              placeholder={labels.chooseRole}
              disabled={!isEditMode && !isNewEmployee}
            />
            <SelectField
              label={labels.department}
              name="departmentId"
              value={formData.departmentId || ""}
              onChange={handleInputChange}
              options={departments.map((d) => ({ id: d.id, label: d.name }))}
              placeholder={labels.chooseDepartment}
              disabled={!isEditMode && !isNewEmployee}
            />
            <SelectField
              label={labels.manager}
              name="managerId"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              options={employeesOptions
                .filter((entry) => entry.id !== employeeId)
                .map((entry) => ({
                  id: entry.id,
                  label: `${entry.firstName} ${entry.lastName}${entry.jobTitle ? ` (${entry.jobTitle})` : ""}`,
                }))}
              placeholder={labels.chooseManager}
              disabled={!isEditMode && !isNewEmployee}
            />
            <SelectField
              label={labels.accountStatus}
              name="accountStatus"
              value={formData.accountStatus || "ACTIVE"}
              onChange={handleInputChange}
              options={[
                { id: "ACTIVE", label: labels.active },
                { id: "INACTIVE", label: labels.inactive },
              ]}
              disabled={!isEditMode && !isNewEmployee}
            />
            {(isNewEmployee || isEditMode) && (
              <InputField
                label={isNewEmployee ? labels.password : labels.newPassword}
                name="password"
                type="password"
                value={formData.password || ""}
                onChange={handleInputChange}
                required={isNewEmployee}
              />
            )}
          </div>

          {!isNewEmployee && isEditMode ? (
            <p className="mt-2 text-xs text-stone-400">{labels.newPasswordHint}</p>
          ) : null}

          {!isNewEmployee ? (
            <div className="mt-4 rounded-lg border border-stone-600/30 bg-black/20 p-3">
              <p className="mb-2 text-sm font-medium text-stone-200">{labels.supervisedCollaborators}</p>
              {supervisedCollaborators.length === 0 ? (
                <p className="text-sm text-stone-400">{labels.noSupervisedCollaborators}</p>
              ) : (
                <ul className="space-y-1 text-sm text-stone-300">
                  {supervisedCollaborators.map((entry) => (
                    <li key={entry.id}>
                      {entry.firstName} {entry.lastName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
        </div>

        {/* Form Actions */}
        {(isEditMode || isNewEmployee) && (
          <div className="flex gap-3 pt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-lg transition-all font-medium"
            >
              <Save size={18} />
              {labels.save}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 bg-stone-700/30 hover:bg-stone-700/50 text-stone-300 rounded-lg transition-all font-medium border border-stone-600/50"
            >
              {labels.cancel}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

interface InputFieldProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  required?: boolean;
}

function InputField({
  label,
  name,
  type = "text",
  value,
  onChange,
  disabled,
  required,
}: InputFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-300 mb-2">
        {label} {required && <span className="text-orange-400">*</span>}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className="w-full px-3 py-2 bg-white/10 border border-stone-600/30 text-white placeholder-stone-500 rounded-lg focus:border-orange-500/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      />
    </div>
  );
}

interface SelectFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: Array<{ id: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
}

function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: SelectFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-300 mb-2">
        {label}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-3 py-2 bg-white/10 border border-stone-600/30 text-white rounded-lg focus:border-orange-500/50 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

