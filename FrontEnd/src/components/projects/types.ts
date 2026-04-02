export type ProjectStatus = "IN_PROGRESS" | "FINISHED" | "SUSPENDED";

export interface ProjectLead {
  id: string;
  firstName: string;
  lastName: string;
  pictureUrl?: string;
}

export interface ProjectMember {
  id: string;
  collaboratorId: string;
  roleOnProject?: string;
  assignedAt: string;
  collaborator: {
    user: {
      id: string;
      firstName: string;
      lastName: string;
      pictureUrl?: string;
      jobTitle?: string;
      department?: { name: string };
    };
  };
}

export interface Project {
  id: string;
  code?: string;
  name?: string;
  description?: string;
  client?: string;
  status: ProjectStatus;
  startDate?: string;
  endDate?: string;
  budgetHours?: number;
  budgetAmount?: number;
  leadId?: string;
  lead?: ProjectLead;
  /** Omitted on some list payloads; detail fetch includes full team. */
  assignments?: ProjectMember[];
  totalHoursLogged?: number;
  budgetHoursUsedPct?: number;
  _count?: { timesheetEntries: number; assignments: number };
  createdAt: string;
  updatedAt: string;
}

export interface ProjectHoursReport {
  projectId: string;
  totalHours: number;
  entriesCount: number;
  byCollaborator: {
    userId: string;
    firstName: string;
    lastName: string;
    department?: string;
    hours: number;
  }[];
}

export interface ResourceAllocation {
  userId: string;
  firstName: string;
  lastName: string;
  department?: string;
  totalHours: number;
  projects: {
    projectId: string;
    projectName: string;
    hours: number;
    pct: number;
  }[];
}

export const STATUS_META: Record<
  ProjectStatus,
  { fr: string; en: string; badge: string; dot: string }
> = {
  IN_PROGRESS: {
    fr: "En cours",
    en: "In Progress",
    badge: "bg-green-100 text-green-700",
    dot: "bg-green-500",
  },
  FINISHED: {
    fr: "Terminé",
    en: "Finished",
    badge: "bg-stone-100 text-stone-600",
    dot: "bg-stone-400",
  },
  SUSPENDED: {
    fr: "Suspendu",
    en: "Suspended",
    badge: "bg-amber-100 text-amber-700",
    dot: "bg-amber-500",
  },
};
