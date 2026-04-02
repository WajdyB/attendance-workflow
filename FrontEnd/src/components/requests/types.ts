export type LeaveType =
  | "PTO"
  | "SICK"
  | "MATERNITY"
  | "PATERNITY"
  | "UNPAID"
  | "TRAINING"
  | "FAMILY_EVENT"
  | "OTHER";

export type RequestStatus =
  | "DRAFT"
  | "SENT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type RequestType = "LEAVE" | "AUGMENTATION" | "OTHER";

export interface LeaveRequest {
  id: string;
  submittedBy: string;
  decidedBy?: string;
  requestType: RequestType;
  leaveType?: LeaveType;
  status: RequestStatus;
  comment?: string;
  decisionComment?: string;
  leavePaid?: boolean;
  leaveStartDate?: string;
  leaveEndDate?: string;
  workingDaysCount?: number;
  attachmentUrl?: string;
  createdAt: string;
  updatedAt: string;
  submitter: {
    id: string;
    firstName: string;
    lastName: string;
    personalEmail?: string;
    pictureUrl?: string;
    jobTitle?: string;
    role?: { description: string };
    department?: { name: string };
  };
  manager?: {
    user: { id: string; firstName: string; lastName: string };
  };
}

export interface LeaveBalance {
  id: string;
  userId: string;
  year: number;
  allocatedDays: number;
  usedDays: number;
  pendingDays: number;
  remainingDays: number;
}

export interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  year?: number;
}

export const LEAVE_TYPE_LABELS: Record<LeaveType, { fr: string; en: string; color: string }> = {
  PTO:          { fr: "Congé Payé", en: "Paid Leave", color: "#f97316" },
  SICK:         { fr: "Congé Maladie", en: "Sick Leave", color: "#ef4444" },
  MATERNITY:    { fr: "Congé Maternité", en: "Maternity", color: "#ec4899" },
  PATERNITY:    { fr: "Congé Paternité", en: "Paternity", color: "#8b5cf6" },
  UNPAID:       { fr: "Congé Sans Solde", en: "Unpaid Leave", color: "#6b7280" },
  TRAINING:     { fr: "Congé Formation", en: "Training", color: "#3b82f6" },
  FAMILY_EVENT: { fr: "Événement Familial", en: "Family Event", color: "#10b981" },
  OTHER:        { fr: "Autre", en: "Other", color: "#d97706" },
};

export const STATUS_LABELS: Record<RequestStatus, { fr: string; en: string; badge: string }> = {
  DRAFT:     { fr: "Brouillon", en: "Draft", badge: "bg-stone-100 text-stone-600" },
  SENT:      { fr: "Envoyé", en: "Sent", badge: "bg-blue-100 text-blue-700" },
  PENDING:   { fr: "En attente", en: "Pending", badge: "bg-amber-100 text-amber-700" },
  APPROVED:  { fr: "Approuvé", en: "Approved", badge: "bg-green-100 text-green-700" },
  REJECTED:  { fr: "Rejeté", en: "Rejected", badge: "bg-red-100 text-red-700" },
  CANCELLED: { fr: "Annulé", en: "Cancelled", badge: "bg-stone-100 text-stone-500" },
};
