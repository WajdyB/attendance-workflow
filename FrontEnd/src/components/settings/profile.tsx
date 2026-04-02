"use client";

import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { apiClient } from "@/utils/api-client";
import { apiConfig } from "@/utils/api-config";
import { useEffect, useState } from "react";
import {
  User,
  Phone,
  MapPin,
  Landmark,
  Building2,
  Mail,
  Calendar,
  TrendingUp,
  Star,
  FileText,
  Loader2,
  ChevronRight,
  Shield,
  BadgeCheck,
  Users,
  Pencil,
  Save,
  X,
  Camera,
  Trash2,
} from "lucide-react";
import DocumentsPanel from "./documents";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  reason?: string;
  approvedBy?: string;
};

type DossierProfile = {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl?: string | null;
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
      id?: string;
      firstName: string;
      lastName: string;
      jobTitle?: string;
      role?: { description: string } | null;
    } | null;
    supervisedCollaborators: Array<{
      id: string;
      firstName: string;
      lastName: string;
      jobTitle?: string;
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

type Evaluation = {
  id: string;
  evaluationType: string;
  evaluationDate: string;
  globalScore?: number | null;
  technicalScore?: number | null;
  softSkillsScore?: number | null;
  comments?: string | null;
  objectives?: string | null;
  manager?: { user: { firstName: string; lastName: string } } | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (d: string | null | undefined, locale: string) =>
  d ? new Date(d).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtSalary = (v: string | null | undefined) =>
  v ? `${Number(v).toLocaleString("fr-FR")} MAD` : "—";

const pctChange = (oldV: string, newV: string) => {
  const o = Number(oldV);
  const n = Number(newV);
  if (!o || isNaN(o) || isNaN(n)) return null;
  return (((n - o) / o) * 100).toFixed(1);
};

const evalTypeLabel = (type: string, fr: boolean) => {
  const map: Record<string, [string, string]> = {
    ANNUAL: ["Annuelle", "Annual"],
    SEMI_ANNUAL: ["Semestrielle", "Semi-annual"],
    PROJECT: ["Projet", "Project"],
    "360": ["360°", "360°"],
  };
  const entry = map[type] ?? [type, type];
  return fr ? entry[0] : entry[1];
};

const ScoreBadge = ({ score }: { score?: number | null }) => {
  if (score == null) return <span style={{ color: "var(--text-3)" }}>—</span>;
  const n = Number(score);
  const color = n >= 4 ? "#22c55e" : n >= 3 ? "#f59e0b" : "#ef4444";
  return (
    <span className="rounded-full px-2.5 py-0.5 text-xs font-bold" style={{ background: `${color}22`, color }}>
      {n.toFixed(1)}/5
    </span>
  );
};

const Avatar = ({ firstName, lastName, size = "md" }: { firstName: string; lastName: string; size?: "sm" | "md" | "lg" }) => {
  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
  const s = size === "lg" ? "w-20 h-20 text-2xl" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  return (
    <div
      className={`${s} rounded-full flex items-center justify-center font-bold flex-shrink-0`}
      style={{ background: "color-mix(in srgb, var(--accent) 20%, transparent)", color: "var(--accent)" }}
    >
      {initials || <User size={size === "lg" ? 28 : 16} />}
    </div>
  );
};

const ProfileAvatar = ({
  firstName,
  lastName,
  pictureUrl,
  size = "md",
}: {
  firstName: string;
  lastName: string;
  pictureUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) => {
  const s = size === "lg" ? "w-20 h-20 text-2xl" : size === "md" ? "w-10 h-10 text-sm" : "w-8 h-8 text-xs";
  const src = pictureUrl?.trim();
  if (src) {
    return (
      <img
        src={src}
        alt=""
        className={`${s} rounded-full object-cover flex-shrink-0`}
        style={{ border: "1px solid var(--border)" }}
      />
    );
  }
  return <Avatar firstName={firstName} lastName={lastName} size={size} />;
};

const InfoRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => (
  <div className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid var(--border)" }}>
    <div className="flex items-center gap-2">
      {icon && <span style={{ color: "var(--text-3)" }}>{icon}</span>}
      <span className="text-sm" style={{ color: "var(--text-3)" }}>{label}</span>
    </div>
    <span className="text-sm font-medium text-right" style={{ color: value ? "var(--text-1)" : "var(--text-3)" }}>
      {value || "—"}
    </span>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

type DossierEditFormState = {
  firstName: string;
  lastName: string;
  personalEmail: string;
  workEmail: string;
  phone: string;
  phoneFixed: string;
  address: string;
  birthdate: string;
  jobTitle: string;
  bankName: string;
  bankBicSwift: string;
  rib: string;
  cnssNumber: string;
};

/** API may return ISO string or a Date-like value */
function birthdateToInputValue(b: unknown): string {
  if (b == null || b === "") return "";
  if (typeof b === "string") return b.length >= 10 ? b.slice(0, 10) : b;
  const d = b instanceof Date ? b : new Date(String(b));
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function profileToEditForm(u: DossierProfile): DossierEditFormState {
  return {
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    personalEmail: u.personalEmail || "",
    workEmail: u.workEmail || "",
    phone: u.phone || "",
    phoneFixed: u.phoneFixed || "",
    address: u.address || "",
    birthdate: birthdateToInputValue(u.birthdate),
    jobTitle: u.jobTitle || "",
    bankName: u.bankName || "",
    bankBicSwift: u.bankBicSwift || "",
    rib: u.rib || "",
    cnssNumber: u.cnssNumber || "",
  };
}

export default function EmployeeProfile() {
  const { databaseUser, isLoading, updateUser } = useAuth();
  const { language } = useLanguage();
  const fr = language === "fr";
  const locale = fr ? "fr-FR" : "en-US";

  const [activeTab, setActiveTab] = useState<"personal" | "hierarchy" | "contracts" | "performance" | "documents">("personal");
  const [dossier, setDossier] = useState<DossierResponse | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loadingDossier, setLoadingDossier] = useState(false);
  const [loadingEvals, setLoadingEvals] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [dossierEditForm, setDossierEditForm] = useState<DossierEditFormState | null>(null);
  const [savingPersonal, setSavingPersonal] = useState(false);
  const [personalSaveError, setPersonalSaveError] = useState<string | null>(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [pictureError, setPictureError] = useState<string | null>(null);

  const isAdmin = (databaseUser?.role?.description || "")
    .toLowerCase()
    .includes("admin");

  useEffect(() => {
    if (!databaseUser?.id) return;
    setLoadingDossier(true);
    setError(null);
    apiClient
      .get<DossierResponse>(apiConfig.endpoints.users.dossier(databaseUser.id))
      .then(setDossier)
      .catch(() => setError(fr ? "Impossible de charger le dossier." : "Unable to load dossier."))
      .finally(() => setLoadingDossier(false));
  }, [databaseUser?.id]);

  useEffect(() => {
    if (activeTab !== "performance" || !databaseUser?.id) return;
    setLoadingEvals(true);
    apiClient
      .get<Evaluation[]>(apiConfig.endpoints.evaluations.byCollaborator(databaseUser.id))
      .then((res) => setEvaluations(Array.isArray(res) ? res : []))
      .catch(() => setEvaluations([]))
      .finally(() => setLoadingEvals(false));
  }, [activeTab, databaseUser?.id]);

  if (isLoading || loadingDossier) {
    return (
      <div className="flex h-64 items-center justify-center gap-3">
        <Loader2 size={22} className="animate-spin" style={{ color: "var(--accent)" }} />
        <span className="text-sm" style={{ color: "var(--text-2)" }}>
          {fr ? "Chargement du dossier…" : "Loading dossier…"}
        </span>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm" style={{ color: "#ef4444" }}>{error || (fr ? "Données non disponibles" : "Data unavailable")}</p>
      </div>
    );
  }

  const user = dossier.profile;
  const { hierarchy, contracts } = dossier;
  const latestContract = contracts.latest;

  const refreshDossierAndAuthPicture = async () => {
    if (!databaseUser?.id) return;
    const fresh = await apiClient.get<DossierResponse>(
      apiConfig.endpoints.users.dossier(databaseUser.id),
    );
    setDossier(fresh);
    updateUser({ pictureUrl: fresh.profile.pictureUrl ?? null });
  };

  const onProfilePictureFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !databaseUser?.id) return;
    setPictureUploading(true);
    setPictureError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiClient.post<{ user?: { pictureUrl?: string | null } }>(
        apiConfig.endpoints.users.uploadPicture(databaseUser.id),
        fd,
      );
      await refreshDossierAndAuthPicture();
    } catch {
      setPictureError(fr ? "Impossible d'envoyer la photo." : "Could not upload photo.");
    } finally {
      setPictureUploading(false);
    }
  };

  const removeProfilePicture = async () => {
    if (!databaseUser?.id || !user.pictureUrl) return;
    setPictureUploading(true);
    setPictureError(null);
    try {
      await apiClient.delete(apiConfig.endpoints.users.removePicture(databaseUser.id));
      await refreshDossierAndAuthPicture();
    } catch {
      setPictureError(fr ? "Impossible de supprimer la photo." : "Could not remove photo.");
    } finally {
      setPictureUploading(false);
    }
  };

  const savePersonalDossier = async () => {
    if (!databaseUser?.id || !dossierEditForm) return;
    setSavingPersonal(true);
    setPersonalSaveError(null);
    const f = dossierEditForm;
    const payload: Record<string, string | undefined> = {
      firstName: f.firstName.trim(),
      lastName: f.lastName.trim(),
      personalEmail: f.personalEmail.trim(),
      workEmail: f.workEmail.trim(),
      phone: f.phone.trim(),
      address: f.address.trim(),
      jobTitle: f.jobTitle.trim(),
      bankName: f.bankName.trim(),
      cnssNumber: f.cnssNumber.trim(),
    };
    if (f.phoneFixed.trim()) payload.phoneFixed = f.phoneFixed.trim();
    if (f.bankBicSwift.trim()) payload.bankBicSwift = f.bankBicSwift.trim();
    if (f.rib.trim()) payload.rib = f.rib.trim();
    if (f.birthdate.trim()) {
      payload.birthdate = new Date(`${f.birthdate}T12:00:00`).toISOString();
    }
    try {
      await apiClient.patch(apiConfig.endpoints.users.byId(databaseUser.id), payload);
      const fresh = await apiClient.get<DossierResponse>(
        apiConfig.endpoints.users.dossier(databaseUser.id),
      );
      setDossier(fresh);
      const p = fresh.profile;
      updateUser({
        firstName: p.firstName,
        lastName: p.lastName,
        personalEmail: p.personalEmail ?? "",
        workEmail: p.workEmail ?? "",
        phone: p.phone ?? "",
        address: p.address ?? "",
        birthdate: p.birthdate ? String(p.birthdate).slice(0, 10) : "",
        jobTitle: p.jobTitle ?? "",
        bankName: p.bankName ?? "",
        cnssNumber: p.cnssNumber ?? "",
        pictureUrl: p.pictureUrl ?? null,
      });
      setEditingPersonal(false);
      setDossierEditForm(null);
    } catch (e) {
      setPersonalSaveError(
        fr
          ? "Enregistrement impossible. Vérifiez les champs ou vos droits."
          : "Could not save. Check fields or permissions.",
      );
      console.error(e);
    } finally {
      setSavingPersonal(false);
    }
  };

  const startEditPersonal = () => {
    setDossierEditForm(profileToEditForm(user));
    setPersonalSaveError(null);
    setEditingPersonal(true);
  };

  const cancelEditPersonal = () => {
    setEditingPersonal(false);
    setDossierEditForm(null);
    setPersonalSaveError(null);
  };

  const inputClass =
    "w-full rounded-lg px-3 py-2 text-sm outline-none transition-[border-color] focus:border-[var(--accent)]";
  const inputStyle: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
  };

  const tabs: { key: typeof activeTab; label: string; icon: React.ReactNode }[] = [
    { key: "personal",     label: fr ? "Informations"   : "Personal",     icon: <User size={14} /> },
    { key: "hierarchy",    label: fr ? "Hiérarchie"     : "Hierarchy",    icon: <Users size={14} /> },
    { key: "contracts",    label: fr ? "Contrat"        : "Contract",     icon: <FileText size={14} /> },
    { key: "performance",  label: fr ? "Performances"   : "Performance",  icon: <Star size={14} /> },
    { key: "documents",    label: fr ? "Documents"      : "Documents",    icon: <FileText size={14} /> },
  ];

  return (
    <div className="space-y-0 rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border)", background: "var(--surface)" }}>

      {/* ── Profile header ── */}
      <div className="p-6 pb-0" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-start gap-5 pb-6">
          <div className="relative flex-shrink-0">
            <ProfileAvatar
              firstName={user.firstName}
              lastName={user.lastName}
              pictureUrl={user.pictureUrl}
              size="lg"
            />
            <label
              className={`absolute -bottom-0.5 -right-0.5 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 shadow-md transition hover:opacity-90 ${
                pictureUploading ? "pointer-events-none opacity-70" : ""
              }`}
              style={{
                background: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--accent)",
              }}
              title={fr ? "Changer la photo de profil" : "Change profile photo"}
            >
              {pictureUploading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Camera size={16} />
              )}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={pictureUploading}
                onChange={onProfilePictureFile}
              />
            </label>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold" style={{ color: "var(--text-1)" }}>
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-sm mt-0.5" style={{ color: "var(--text-2)" }}>
              {user.jobTitle || (fr ? "Poste non renseigné" : "No job title")}
            </p>
            {pictureError && (
              <p className="mt-2 text-xs" style={{ color: "#ef4444" }}>
                {pictureError}
              </p>
            )}
            {user.pictureUrl && (
              <button
                type="button"
                onClick={() => void removeProfilePicture()}
                disabled={pictureUploading}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium transition hover:opacity-80 disabled:opacity-50"
                style={{ color: "var(--text-3)" }}
              >
                <Trash2 size={12} />
                {fr ? "Supprimer la photo" : "Remove photo"}
              </button>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              {user.role && (
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                >
                  <Shield size={11} />
                  {user.role.description}
                </span>
              )}
              {user.department && (
                <span
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: "var(--bg)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                >
                  <Building2 size={11} />
                  {user.department.name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick info bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-5">
          <div className="flex items-center gap-2">
            <Mail size={14} style={{ color: "var(--text-3)" }} />
            <span className="text-xs truncate" style={{ color: "var(--text-2)" }}>
              {user.workEmail || user.personalEmail || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 size={14} style={{ color: "var(--text-3)" }} />
            <span className="text-xs" style={{ color: "var(--text-2)" }}>
              {user.department?.name || "—"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: "var(--text-3)" }} />
            <span className="text-xs" style={{ color: "var(--text-2)" }}>
              {fr ? "Depuis" : "Since"} {fmtDate(user.createdAt, locale)}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="tab-bar -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`tab flex items-center gap-1.5 ${activeTab === tab.key ? "active" : ""}`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.icon}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="p-6">

        {/* ── Personal info ── */}
        {activeTab === "personal" && (
          <div className="space-y-6">
            {!isAdmin && (
              <p className="text-xs rounded-lg px-3 py-2" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", color: "var(--text-2)" }}>
                {fr
                  ? "Les informations du dossier ci-dessous sont en lecture seule. Vous pouvez toutefois modifier votre photo de profil depuis l’en-tête ci-dessus. Seuls les administrateurs peuvent modifier les champs du dossier sur cette page."
                  : "The dossier fields below are read-only. You can still change your profile photo using the camera control on your picture above. Only administrators can edit dossier fields on this page."}
              </p>
            )}
            {isAdmin && !editingPersonal && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={startEditPersonal}
                  className="btn-primary inline-flex items-center gap-2"
                  style={{ padding: "8px 14px" }}
                >
                  <Pencil size={14} />
                  {fr ? "Modifier le dossier" : "Edit dossier"}
                </button>
              </div>
            )}
            {isAdmin && editingPersonal && dossierEditForm ? (
              <>
                {personalSaveError && (
                  <p className="text-xs rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444" }}>
                    {personalSaveError}
                  </p>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                    {fr ? "Contact" : "Contact"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "Prénom" : "First name"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.firstName}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, firstName: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "Nom" : "Last name"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.lastName}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, lastName: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "E-mail professionnel" : "Work email"}
                      <input
                        type="email"
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.workEmail}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, workEmail: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "E-mail personnel" : "Personal email"}
                      <input
                        type="email"
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.personalEmail}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, personalEmail: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "Téléphone mobile" : "Mobile"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.phone}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, phone: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "Téléphone fixe" : "Landline"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.phoneFixed}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, phoneFixed: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs sm:col-span-2" style={{ color: "var(--text-2)" }}>
                      {fr ? "Adresse" : "Address"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.address}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, address: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "Date de naissance" : "Birth date"}
                      <input
                        type="date"
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.birthdate}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, birthdate: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      {fr ? "Poste" : "Job title"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.jobTitle}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, jobTitle: e.target.value } : p))}
                      />
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                    {fr ? "Informations financières & administratives" : "Financial & administrative info"}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-xs sm:col-span-2" style={{ color: "var(--text-2)" }}>
                      {fr ? "Banque" : "Bank"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.bankName}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, bankName: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      BIC / SWIFT
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.bankBicSwift}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, bankBicSwift: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-2)" }}>
                      RIB / IBAN
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.rib}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, rib: e.target.value } : p))}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-xs sm:col-span-2" style={{ color: "var(--text-2)" }}>
                      {fr ? "Numéro CNSS" : "CNSS number"}
                      <input
                        className={inputClass}
                        style={inputStyle}
                        value={dossierEditForm.cnssNumber}
                        onChange={(e) => setDossierEditForm((p) => (p ? { ...p, cnssNumber: e.target.value } : p))}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={cancelEditPersonal}
                    disabled={savingPersonal}
                    className="btn-ghost inline-flex items-center gap-2"
                  >
                    <X size={14} />
                    {fr ? "Annuler" : "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={savePersonalDossier}
                    disabled={savingPersonal}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    {savingPersonal ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    {fr ? "Enregistrer" : "Save"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Contact */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                    {fr ? "Contact" : "Contact"}
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="px-4">
                      <InfoRow label={fr ? "E-mail professionnel" : "Work email"} value={user.workEmail} icon={<Mail size={14} />} />
                      <InfoRow label={fr ? "E-mail personnel" : "Personal email"} value={user.personalEmail} icon={<Mail size={14} />} />
                      <InfoRow label={fr ? "Téléphone mobile" : "Mobile"} value={user.phone} icon={<Phone size={14} />} />
                      <InfoRow label={fr ? "Téléphone fixe" : "Landline"} value={user.phoneFixed} icon={<Phone size={14} />} />
                      <InfoRow label={fr ? "Adresse" : "Address"} value={user.address} icon={<MapPin size={14} />} />
                      <div className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span style={{ color: "var(--text-3)" }}><Calendar size={14} /></span>
                            <span className="text-sm" style={{ color: "var(--text-3)" }}>{fr ? "Date de naissance" : "Birth date"}</span>
                          </div>
                          <span className="text-sm font-medium" style={{ color: user.birthdate ? "var(--text-1)" : "var(--text-3)" }}>
                            {user.birthdate
                              ? new Date(user.birthdate).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })
                              : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Financial */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                    {fr ? "Informations financières & administratives" : "Financial & administrative info"}
                  </p>
                  <div className="rounded-xl overflow-hidden" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                    <div className="px-4">
                      <InfoRow label={fr ? "Banque" : "Bank"} value={user.bankName} icon={<Landmark size={14} />} />
                      <InfoRow label="BIC / SWIFT" value={user.bankBicSwift} icon={<Landmark size={14} />} />
                      <InfoRow label="RIB / IBAN" value={user.rib} icon={<Landmark size={14} />} />
                      <InfoRow label={fr ? "Numéro CNSS" : "CNSS number"} value={user.cnssNumber} icon={<BadgeCheck size={14} />} />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Hierarchy ── */}
        {activeTab === "hierarchy" && (
          <div className="space-y-6">
            {/* Direct manager */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                {fr ? "Manager direct" : "Direct manager"}
              </p>
              {hierarchy.directManager ? (
                <div
                  className="flex items-center gap-4 rounded-xl p-4"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                >
                  <Avatar firstName={hierarchy.directManager.firstName} lastName={hierarchy.directManager.lastName} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                      {hierarchy.directManager.firstName} {hierarchy.directManager.lastName}
                    </p>
                    {hierarchy.directManager.jobTitle && (
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                        {hierarchy.directManager.jobTitle}
                      </p>
                    )}
                    {hierarchy.directManager.role && (
                      <span
                        className="mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                      >
                        {hierarchy.directManager.role.description}
                      </span>
                    )}
                  </div>
                  <ChevronRight size={16} className="ml-auto" style={{ color: "var(--text-3)" }} />
                </div>
              ) : (
                <div
                  className="rounded-xl p-4 text-sm text-center"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-3)" }}
                >
                  {fr ? "Aucun manager assigné" : "No manager assigned"}
                </div>
              )}
            </div>

            {/* Supervised collaborators */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                {fr ? "Collaborateurs supervisés" : "Supervised collaborators"}
                {hierarchy.supervisedCollaborators.length > 0 && (
                  <span
                    className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ background: "color-mix(in srgb, var(--accent) 15%, transparent)", color: "var(--accent)" }}
                  >
                    {hierarchy.supervisedCollaborators.length}
                  </span>
                )}
              </p>
              {hierarchy.supervisedCollaborators.length === 0 ? (
                <div
                  className="rounded-xl p-4 text-sm text-center"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-3)" }}
                >
                  {fr ? "Aucun collaborateur supervisé" : "No supervised collaborators"}
                </div>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {hierarchy.supervisedCollaborators.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-xl p-3"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}
                    >
                      <Avatar firstName={c.firstName} lastName={c.lastName} size="sm" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-1)" }}>
                          {c.firstName} {c.lastName}
                        </p>
                        {(c.jobTitle || c.role) && (
                          <p className="text-xs truncate" style={{ color: "var(--text-3)" }}>
                            {c.jobTitle ?? c.role?.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Contract & compensation ── */}
        {activeTab === "contracts" && (
          <div className="space-y-6">
            {/* Current contract highlight */}
            {!latestContract ? (
              <div className="rounded-xl p-6 text-center" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                <FileText size={32} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-3)" }} />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>
                  {fr ? "Aucun contrat disponible" : "No contract available"}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                  {fr ? "Contrat actuel" : "Current contract"}
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {/* Contract type header */}
                  <div
                    className="px-5 py-4 flex items-center justify-between"
                    style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderBottom: "1px solid var(--border)" }}
                  >
                    <div>
                      <p className="text-sm font-semibold" style={{ color: "var(--text-1)" }}>
                        {latestContract.contractType}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                        {fr ? "Depuis" : "Since"} {fmtDate(latestContract.startDate, locale)}
                        {latestContract.endDate ? ` → ${fmtDate(latestContract.endDate, locale)}` : (fr ? " · CDI" : " · Permanent")}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-xs font-semibold"
                      style={{ background: "#22c55e22", color: "#22c55e" }}
                    >
                      {fr ? "Actif" : "Active"}
                    </span>
                  </div>

                  {/* Salary highlight */}
                  <div className="grid grid-cols-2 gap-px" style={{ background: "var(--border)" }}>
                    <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{fr ? "Salaire brut" : "Gross salary"}</p>
                      <p className="text-lg font-bold mt-1" style={{ color: "var(--text-1)" }}>
                        {fmtSalary(latestContract.baseSalary)}
                      </p>
                    </div>
                    <div className="px-5 py-4" style={{ background: "var(--surface)" }}>
                      <p className="text-xs" style={{ color: "var(--text-3)" }}>{fr ? "Salaire net" : "Net salary"}</p>
                      <p className="text-lg font-bold mt-1" style={{ color: "var(--accent)" }}>
                        {fmtSalary(latestContract.netSalary)}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="px-5" style={{ background: "var(--bg)" }}>
                    <InfoRow label={fr ? "Heures / semaine" : "Weekly hours"} value={latestContract.weeklyHours ? `${latestContract.weeklyHours}h` : undefined} />
                    <InfoRow label={fr ? "Primes" : "Bonuses"} value={latestContract.bonuses} />
                    <InfoRow label={fr ? "Avantages en nature" : "Benefits in kind"} value={latestContract.benefitsInKind} />
                  </div>
                </div>
              </div>
            )}

            {/* Salary increase history */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                {fr ? "Historique des augmentations" : "Salary increase history"}
              </p>
              {contracts.salaryHistory.length === 0 ? (
                <div
                  className="rounded-xl p-4 text-sm text-center"
                  style={{ background: "var(--bg)", border: "1px solid var(--border)", color: "var(--text-3)" }}
                >
                  {fr ? "Aucune augmentation enregistrée" : "No salary increases recorded"}
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {contracts.salaryHistory.map((entry, idx) => {
                    const pct = pctChange(entry.oldSalary, entry.newSalary);
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-4 px-5 py-4"
                        style={{ borderBottom: idx < contracts.salaryHistory.length - 1 ? "1px solid var(--border)" : undefined, background: "var(--bg)" }}
                      >
                        <div
                          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                          style={{ background: "#22c55e22", color: "#22c55e" }}
                        >
                          <TrendingUp size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                            {fmtSalary(entry.oldSalary)} → {fmtSalary(entry.newSalary)}
                          </p>
                          {entry.reason && (
                            <p className="text-xs mt-0.5 truncate" style={{ color: "var(--text-3)" }}>{entry.reason}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          {pct && (
                            <span className="text-xs font-bold" style={{ color: "#22c55e" }}>+{pct}%</span>
                          )}
                          <p className="text-xs mt-0.5" style={{ color: "var(--text-3)" }}>
                            {fmtDate(entry.changeDate, locale)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contract history */}
            {contracts.history.length > 1 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                  {fr ? "Historique des contrats" : "Contract history"}
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                  {contracts.history.map((c, idx) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-5 py-3"
                      style={{ borderBottom: idx < contracts.history.length - 1 ? "1px solid var(--border)" : undefined, background: "var(--bg)" }}
                    >
                      <div>
                        <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>{c.contractType}</p>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>
                          {fmtDate(c.startDate, locale)}{c.endDate ? ` → ${fmtDate(c.endDate, locale)}` : ""}
                        </p>
                      </div>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "var(--surface)", color: "var(--text-2)", border: "1px solid var(--border)" }}
                      >
                        {c.contractType}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Performance ── */}
        {activeTab === "performance" && (
          <div className="space-y-6">
            {loadingEvals ? (
              <div className="flex h-40 items-center justify-center gap-2">
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent)" }} />
                <span className="text-sm" style={{ color: "var(--text-2)" }}>
                  {fr ? "Chargement…" : "Loading…"}
                </span>
              </div>
            ) : evaluations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Star size={40} style={{ color: "var(--text-3)" }} className="opacity-30" />
                <p className="text-sm" style={{ color: "var(--text-3)" }}>
                  {fr ? "Aucune évaluation enregistrée" : "No evaluations recorded"}
                </p>
              </div>
            ) : (
              <>
                {/* Latest score highlight */}
                {evaluations[0] && (
                  <div
                    className="rounded-xl p-5"
                    style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--accent)" }}>
                          {fr ? "Dernière évaluation" : "Latest evaluation"}
                        </p>
                        <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                          {evalTypeLabel(evaluations[0].evaluationType, fr)} · {fmtDate(evaluations[0].evaluationDate, locale)}
                        </p>
                        {evaluations[0].manager && (
                          <p className="text-xs mt-1" style={{ color: "var(--text-3)" }}>
                            {fr ? "Par" : "By"}{" "}
                            {evaluations[0].manager.user.firstName} {evaluations[0].manager.user.lastName}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold" style={{ color: "var(--accent)" }}>
                          {Number(evaluations[0].globalScore ?? 0).toFixed(1)}
                          <span className="text-sm font-normal" style={{ color: "var(--text-3)" }}>/5</span>
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3" style={{ background: "var(--surface)" }}>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>{fr ? "Compétences techniques" : "Technical skills"}</p>
                        <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-1)" }}>
                          {Number(evaluations[0].technicalScore ?? 0).toFixed(1)} / 5
                        </p>
                      </div>
                      <div className="rounded-lg p-3" style={{ background: "var(--surface)" }}>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>{fr ? "Soft skills" : "Soft skills"}</p>
                        <p className="text-sm font-semibold mt-1" style={{ color: "var(--text-1)" }}>
                          {Number(evaluations[0].softSkillsScore ?? 0).toFixed(1)} / 5
                        </p>
                      </div>
                    </div>
                    {evaluations[0].comments && (
                      <p className="mt-3 text-xs italic" style={{ color: "var(--text-2)" }}>
                        "{evaluations[0].comments}"
                      </p>
                    )}
                    {evaluations[0].objectives && (
                      <div className="mt-3 rounded-lg p-3" style={{ background: "var(--surface)" }}>
                        <p className="text-xs font-medium mb-1" style={{ color: "var(--text-2)" }}>
                          {fr ? "Objectifs" : "Objectives"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-3)" }}>{evaluations[0].objectives}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Evaluation history */}
                {evaluations.length > 1 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-3)" }}>
                      {fr ? "Historique des évaluations" : "Evaluation history"}
                    </p>
                    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
                      {evaluations.slice(1).map((ev, idx) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-4 px-5 py-4"
                          style={{ borderBottom: idx < evaluations.length - 2 ? "1px solid var(--border)" : undefined, background: "var(--bg)" }}
                        >
                          <div
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold"
                            style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)", color: "var(--accent)" }}
                          >
                            <Star size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: "var(--text-1)" }}>
                              {evalTypeLabel(ev.evaluationType, fr)}
                            </p>
                            <p className="text-xs" style={{ color: "var(--text-3)" }}>
                              {fmtDate(ev.evaluationDate, locale)}
                              {ev.manager ? ` · ${ev.manager.user.firstName} ${ev.manager.user.lastName}` : ""}
                            </p>
                          </div>
                          <ScoreBadge score={ev.globalScore} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Documents ── */}
        {activeTab === "documents" && (
          <DocumentsPanel
            userId={user.id}
            initialDocuments={dossier.documents}
            canUpload={isAdmin}
          />
        )}
      </div>
    </div>
  );
}
