"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiClient } from "@/utils/api-client";
import apiConfig from "@/utils/api-config";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@/context/AuthContext";

type Role = {
  id: string;
  description: string;
};

type Department = {
  id: string;
  name: string;
  code?: string;
};

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  personalEmail: string;
  workEmail: string;
  phone?: string | null;
  phoneFixed?: string | null;
  address?: string | null;
  jobTitle?: string | null;
  bankName?: string | null;
  bankBicSwift?: string | null;
  rib?: string | null;
  cnssNumber?: string | null;
  accountStatus?: string | null;
  roleId?: string | null;
  departmentId?: string | null;
  role?: Role | null;
  department?: Department | null;
};

type CreateEmployeePayload = {
  personalEmail: string;
  password: string;
  firstName: string;
  lastName: string;
  birthdate: string;
  phone: string;
  phoneFixed?: string;
  address: string;
  workEmail: string;
  jobTitle: string;
  bankName: string;
  bankBicSwift?: string;
  rib?: string;
  cnssNumber: string;
  accountStatus?: "ACTIVE" | "INACTIVE";
  roleId?: string;
  departmentId?: string;
};

type UpdateEmployeePayload = Partial<CreateEmployeePayload>;

const emptyCreateForm: CreateEmployeePayload = {
  personalEmail: "",
  password: "",
  firstName: "",
  lastName: "",
  birthdate: "",
  phone: "",
  phoneFixed: "",
  address: "",
  workEmail: "",
  jobTitle: "",
  bankName: "",
  bankBicSwift: "",
  rib: "",
  cnssNumber: "",
  accountStatus: "ACTIVE",
  roleId: "",
  departmentId: "",
};

export default function EmployeesSettings() {
  const { language } = useLanguage();
  const { databaseUser } = useAuth();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [createForm, setCreateForm] = useState<CreateEmployeePayload>(emptyCreateForm);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [editForm, setEditForm] = useState<UpdateEmployeePayload>({});

  const labels = useMemo(
    () =>
      language === "fr"
        ? {
            title: "Gestion des employés",
            subtitle: "Créer un employé et configurer son dossier RH (profil).",
            loading: "Chargement...",
            unauthorized: "Cette page est réservée aux administrateurs.",
            createTitle: "Créer un employé",
            updateTitle: "Modifier le dossier employé",
            employeesList: "Employés existants",
            selectEmployee: "Sélectionner un employé",
            noEmployees: "Aucun employé trouvé.",
            submitCreate: "Créer l'employé",
            submitUpdate: "Mettre à jour le dossier",
            required: "* Obligatoire",
            firstName: "Prénom",
            lastName: "Nom",
            personalEmail: "Email personnel",
            workEmail: "Email professionnel",
            password: "Mot de passe",
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
            accountStatus: "Statut du compte",
            active: "Actif",
            inactive: "Inactif",
            chooseRole: "Choisir un rôle",
            chooseDepartment: "Choisir un département",
            refresh: "Rafraîchir",
          }
        : {
            title: "Employees management",
            subtitle: "Create employees and configure their HR dossier (profile).",
            loading: "Loading...",
            unauthorized: "This page is restricted to administrators.",
            createTitle: "Create employee",
            updateTitle: "Update employee dossier",
            employeesList: "Existing employees",
            selectEmployee: "Select an employee",
            noEmployees: "No employees found.",
            submitCreate: "Create employee",
            submitUpdate: "Update dossier",
            required: "* Required",
            firstName: "First name",
            lastName: "Last name",
            personalEmail: "Personal email",
            workEmail: "Work email",
            password: "Password",
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
            accountStatus: "Account status",
            active: "Active",
            inactive: "Inactive",
            chooseRole: "Choose a role",
            chooseDepartment: "Choose a department",
            refresh: "Refresh",
          },
    [language],
  );

  const isAdmin = (databaseUser?.role?.description || "")
    .toLowerCase()
    .includes("admin");

  const hydrateEditForm = (user: UserRow) => {
    setEditForm({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      birthdate: "",
      phone: user.phone || "",
      phoneFixed: user.phoneFixed || "",
      address: user.address || "",
      personalEmail: user.personalEmail || "",
      workEmail: user.workEmail || "",
      jobTitle: user.jobTitle || "",
      bankName: user.bankName || "",
      bankBicSwift: user.bankBicSwift || "",
      rib: user.rib || "",
      cnssNumber: user.cnssNumber || "",
      roleId: user.roleId || "",
      departmentId: user.departmentId || "",
      accountStatus: (user.accountStatus as "ACTIVE" | "INACTIVE") || "ACTIVE",
    });
  };

  const fetchAll = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [usersData, rolesData, departmentsData] = await Promise.all([
        apiClient.get<UserRow[]>(apiConfig.endpoints.users.all),
        apiClient.get<Role[]>(apiConfig.endpoints.roles.all),
        apiClient.get<Department[]>(apiConfig.endpoints.departments.all),
      ]);

      setUsers(usersData);
      setRoles(rolesData);
      setDepartments(departmentsData);

      if (usersData.length > 0 && !selectedUserId) {
        setSelectedUserId(usersData[0].id);
        hydrateEditForm(usersData[0]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load employees data";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmittingCreate(true);

    try {
      const payload: CreateEmployeePayload = {
        ...createForm,
        roleId: createForm.roleId || undefined,
        departmentId: createForm.departmentId || undefined,
        phoneFixed: createForm.phoneFixed || undefined,
        bankBicSwift: createForm.bankBicSwift || undefined,
        rib: createForm.rib || undefined,
      };

      await apiClient.post(apiConfig.endpoints.users.create, payload);
      setCreateForm(emptyCreateForm);
      setSuccess(language === "fr" ? "Employé créé avec succès." : "Employee created successfully.");
      await fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create employee";
      setError(message);
    } finally {
      setIsSubmittingCreate(false);
    }
  };

  const handleUserSelection = (userId: string) => {
    setSelectedUserId(userId);
    const selected = users.find((entry) => entry.id === userId);
    if (selected) {
      hydrateEditForm(selected);
    }
  };

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUserId) return;

    setError(null);
    setSuccess(null);
    setIsSubmittingEdit(true);

    try {
      const payload: UpdateEmployeePayload = Object.entries(editForm).reduce(
        (acc, [key, value]) => {
          if (value !== "" && value !== undefined && value !== null) {
            acc[key as keyof UpdateEmployeePayload] = value as never;
          }
          return acc;
        },
        {} as UpdateEmployeePayload,
      );

      await apiClient.patch(apiConfig.endpoints.users.byId(selectedUserId), payload);
      setSuccess(language === "fr" ? "Dossier mis à jour avec succès." : "Dossier updated successfully.");
      await fetchAll();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update employee dossier";
      setError(message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  if (!isAdmin) {
    return (
      <section className="rounded-2xl border border-orange-100 bg-white p-6">
        <h1 className="text-2xl font-semibold text-stone-900">{labels.title}</h1>
        <p className="mt-3 text-sm text-red-600">{labels.unauthorized}</p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl border border-orange-100 bg-white p-6">
        <h1 className="text-2xl font-semibold text-stone-900">{labels.title}</h1>
        <p className="mt-1 text-sm text-stone-600">{labels.subtitle}</p>
        <button
          type="button"
          onClick={() => void fetchAll()}
          className="mt-4 rounded-lg border border-orange-200 px-3 py-2 text-sm text-orange-700 hover:bg-orange-50"
        >
          {labels.refresh}
        </button>
      </header>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {success ? <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</p> : null}

      {isLoading ? (
        <div className="rounded-2xl border border-orange-100 bg-white p-6 text-sm text-stone-600">{labels.loading}</div>
      ) : (
        <>
          <div className="rounded-2xl border border-orange-100 bg-white p-6">
            <h2 className="text-lg font-semibold text-stone-900">{labels.employeesList}</h2>
            {users.length === 0 ? (
              <p className="mt-3 text-sm text-stone-500">{labels.noEmployees}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-orange-100 text-left text-stone-500">
                      <th className="py-2 pr-4">{labels.firstName}</th>
                      <th className="py-2 pr-4">{labels.lastName}</th>
                      <th className="py-2 pr-4">{labels.personalEmail}</th>
                      <th className="py-2 pr-4">{labels.role}</th>
                      <th className="py-2 pr-4">{labels.department}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((entry) => (
                      <tr
                        key={entry.id}
                        onClick={() => handleUserSelection(entry.id)}
                        className={`cursor-pointer border-b border-orange-50 ${
                          selectedUserId === entry.id ? "bg-orange-50" : "hover:bg-orange-50/50"
                        }`}
                      >
                        <td className="py-2 pr-4">{entry.firstName}</td>
                        <td className="py-2 pr-4">{entry.lastName}</td>
                        <td className="py-2 pr-4">{entry.personalEmail}</td>
                        <td className="py-2 pr-4">{entry.role?.description || "-"}</td>
                        <td className="py-2 pr-4">{entry.department?.name || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <form onSubmit={handleCreate} className="rounded-2xl border border-orange-100 bg-white p-6">
            <h2 className="text-lg font-semibold text-stone-900">{labels.createTitle}</h2>
            <p className="mt-1 text-xs text-stone-500">{labels.required}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InputField label={labels.firstName} required value={createForm.firstName} onChange={(value) => setCreateForm((prev) => ({ ...prev, firstName: value }))} />
              <InputField label={labels.lastName} required value={createForm.lastName} onChange={(value) => setCreateForm((prev) => ({ ...prev, lastName: value }))} />
              <InputField label={labels.personalEmail} type="email" required value={createForm.personalEmail} onChange={(value) => setCreateForm((prev) => ({ ...prev, personalEmail: value }))} />
              <InputField label={labels.workEmail} type="email" required value={createForm.workEmail} onChange={(value) => setCreateForm((prev) => ({ ...prev, workEmail: value }))} />
              <InputField label={labels.password} type="password" required value={createForm.password} onChange={(value) => setCreateForm((prev) => ({ ...prev, password: value }))} />
              <InputField label={labels.birthdate} type="date" required value={createForm.birthdate} onChange={(value) => setCreateForm((prev) => ({ ...prev, birthdate: value }))} />
              <InputField label={labels.phone} required value={createForm.phone} onChange={(value) => setCreateForm((prev) => ({ ...prev, phone: value }))} />
              <InputField label={labels.phoneFixed} value={createForm.phoneFixed || ""} onChange={(value) => setCreateForm((prev) => ({ ...prev, phoneFixed: value }))} />
              <InputField label={labels.address} required value={createForm.address} onChange={(value) => setCreateForm((prev) => ({ ...prev, address: value }))} />
              <InputField label={labels.jobTitle} required value={createForm.jobTitle} onChange={(value) => setCreateForm((prev) => ({ ...prev, jobTitle: value }))} />
              <InputField label={labels.bankName} required value={createForm.bankName} onChange={(value) => setCreateForm((prev) => ({ ...prev, bankName: value }))} />
              <InputField label={labels.bankBicSwift} value={createForm.bankBicSwift || ""} onChange={(value) => setCreateForm((prev) => ({ ...prev, bankBicSwift: value }))} />
              <InputField label={labels.rib} value={createForm.rib || ""} onChange={(value) => setCreateForm((prev) => ({ ...prev, rib: value }))} />
              <InputField label={labels.cnssNumber} required value={createForm.cnssNumber} onChange={(value) => setCreateForm((prev) => ({ ...prev, cnssNumber: value }))} />
              <SelectField
                label={labels.role}
                value={createForm.roleId || ""}
                onChange={(value) => setCreateForm((prev) => ({ ...prev, roleId: value }))}
                options={roles.map((entry) => ({ value: entry.id, label: entry.description }))}
                placeholder={labels.chooseRole}
              />
              <SelectField
                label={labels.department}
                value={createForm.departmentId || ""}
                onChange={(value) => setCreateForm((prev) => ({ ...prev, departmentId: value }))}
                options={departments.map((entry) => ({ value: entry.id, label: entry.name }))}
                placeholder={labels.chooseDepartment}
              />
              <SelectField
                label={labels.accountStatus}
                value={createForm.accountStatus || "ACTIVE"}
                onChange={(value) => setCreateForm((prev) => ({ ...prev, accountStatus: value as "ACTIVE" | "INACTIVE" }))}
                options={[
                  { value: "ACTIVE", label: labels.active },
                  { value: "INACTIVE", label: labels.inactive },
                ]}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmittingCreate}
              className="mt-5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingCreate ? labels.loading : labels.submitCreate}
            </button>
          </form>

          <form onSubmit={handleUpdate} className="rounded-2xl border border-orange-100 bg-white p-6">
            <h2 className="text-lg font-semibold text-stone-900">{labels.updateTitle}</h2>
            <div className="mt-4">
              <SelectField
                label={labels.selectEmployee}
                value={selectedUserId}
                onChange={handleUserSelection}
                options={users.map((entry) => ({
                  value: entry.id,
                  label: `${entry.firstName} ${entry.lastName} (${entry.personalEmail})`,
                }))}
              />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <InputField label={labels.firstName} value={String(editForm.firstName || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, firstName: value }))} />
              <InputField label={labels.lastName} value={String(editForm.lastName || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, lastName: value }))} />
              <InputField label={labels.personalEmail} type="email" value={String(editForm.personalEmail || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, personalEmail: value }))} />
              <InputField label={labels.workEmail} type="email" value={String(editForm.workEmail || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, workEmail: value }))} />
              <InputField label={labels.phone} value={String(editForm.phone || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, phone: value }))} />
              <InputField label={labels.phoneFixed} value={String(editForm.phoneFixed || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, phoneFixed: value }))} />
              <InputField label={labels.address} value={String(editForm.address || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, address: value }))} />
              <InputField label={labels.jobTitle} value={String(editForm.jobTitle || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, jobTitle: value }))} />
              <InputField label={labels.bankName} value={String(editForm.bankName || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, bankName: value }))} />
              <InputField label={labels.bankBicSwift} value={String(editForm.bankBicSwift || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, bankBicSwift: value }))} />
              <InputField label={labels.rib} value={String(editForm.rib || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, rib: value }))} />
              <InputField label={labels.cnssNumber} value={String(editForm.cnssNumber || "")} onChange={(value) => setEditForm((prev) => ({ ...prev, cnssNumber: value }))} />
              <SelectField
                label={labels.role}
                value={String(editForm.roleId || "")}
                onChange={(value) => setEditForm((prev) => ({ ...prev, roleId: value }))}
                options={roles.map((entry) => ({ value: entry.id, label: entry.description }))}
                placeholder={labels.chooseRole}
              />
              <SelectField
                label={labels.department}
                value={String(editForm.departmentId || "")}
                onChange={(value) => setEditForm((prev) => ({ ...prev, departmentId: value }))}
                options={departments.map((entry) => ({ value: entry.id, label: entry.name }))}
                placeholder={labels.chooseDepartment}
              />
              <SelectField
                label={labels.accountStatus}
                value={String(editForm.accountStatus || "ACTIVE")}
                onChange={(value) =>
                  setEditForm((prev) => ({
                    ...prev,
                    accountStatus: value as "ACTIVE" | "INACTIVE",
                  }))
                }
                options={[
                  { value: "ACTIVE", label: labels.active },
                  { value: "INACTIVE", label: labels.inactive },
                ]}
              />
            </div>
            <button
              type="submit"
              disabled={!selectedUserId || isSubmittingEdit}
              className="mt-5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmittingEdit ? labels.loading : labels.submitUpdate}
            </button>
          </form>
        </>
      )}
    </section>
  );
}

function InputField({
  label,
  value,
  onChange,
  required = false,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-stone-700">
      <span>{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm text-stone-700">
      <span>{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-lg border border-orange-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

