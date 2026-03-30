export type EvaluationType = "ANNUAL" | "SEMIANNUAL" | "PROJECT" | "THREE_SIXTY";
export type SalaryIncreaseReason = "PROMOTION" | "PERFORMANCE" | "INFLATION" | "ANNUAL_REVIEW" | "OTHER";
export type ApprovalStatus = "VALIDATED" | "INVALIDATED";

export interface EvaluatorUser {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl?: string;
  jobTitle?: string;
}

export interface CollaboratorUser {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl?: string;
  jobTitle?: string;
  department?: { name: string };
}

export interface Evaluation {
  id: string;
  managerId: string;
  collaboratorId: string;
  evaluationType: EvaluationType;
  period?: string;
  reviewDate?: string;
  globalScore?: number;
  technicalScore?: number;
  softSkillScore?: number;
  comments?: string;
  objectives?: string;
  documentUrl?: string;
  manager: { id: string; user: EvaluatorUser };
  collaborator: { id: string; user: CollaboratorUser };
  createdAt: string;
  updatedAt: string;
}

export interface SalaryHistory {
  id: string;
  userId: string;
  validatedBy?: string;
  oldSalary: number;
  newSalary: number;
  changeDate: string;
  reason?: SalaryIncreaseReason;
  status: ApprovalStatus;
  decisionComment?: string;
  attachmentUrl?: string;
  user?: { id: string; firstName: string; lastName: string; jobTitle?: string; department?: { name: string } };
  manager?: { id: string; user: { id: string; firstName: string; lastName: string } };
  createdAt: string;
}

export interface TrendPoint {
  id: string;
  reviewDate?: string;
  evaluationType: EvaluationType;
  period?: string;
  globalScore?: number;
  technicalScore?: number;
  softSkillScore?: number;
}

export interface DepartmentStat {
  departmentId: string;
  departmentName: string;
  count: number;
  avgScore: number | null;
}

export interface PerformanceVsSalary {
  collaboratorId: string;
  firstName: string;
  lastName: string;
  department?: string;
  latestScore: number | null;
  currentSalary: number | null;
}

export const EVAL_TYPE_META: Record<EvaluationType, { fr: string; en: string; badge: string }> = {
  ANNUAL: { fr: "Annuelle", en: "Annual", badge: "bg-blue-100 text-blue-700" },
  SEMIANNUAL: { fr: "Semestrielle", en: "Semi-annual", badge: "bg-indigo-100 text-indigo-700" },
  PROJECT: { fr: "Projet", en: "Project", badge: "bg-violet-100 text-violet-700" },
  THREE_SIXTY: { fr: "360°", en: "360°", badge: "bg-pink-100 text-pink-700" },
};

export const REASON_META: Record<SalaryIncreaseReason, { fr: string; en: string }> = {
  PROMOTION: { fr: "Promotion", en: "Promotion" },
  PERFORMANCE: { fr: "Performance", en: "Performance" },
  INFLATION: { fr: "Inflation", en: "Inflation" },
  ANNUAL_REVIEW: { fr: "Révision annuelle", en: "Annual review" },
  OTHER: { fr: "Autre", en: "Other" },
};

export function scoreColor(score?: number | null): string {
  if (score == null) return "text-stone-400";
  if (score >= 85) return "text-green-600";
  if (score >= 70) return "text-orange-500";
  return "text-red-500";
}

export function scoreBg(score?: number | null): string {
  if (score == null) return "bg-stone-100";
  if (score >= 85) return "bg-green-500";
  if (score >= 70) return "bg-orange-400";
  return "bg-red-500";
}
