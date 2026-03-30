import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectStatus, Prisma } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService, buildTitle } from '../notifications/notifications.service';

const PROJECT_INCLUDE = {
  lead: {
    select: { id: true, firstName: true, lastName: true, pictureUrl: true },
  },
  assignments: {
    where: { unassignedAt: null },
    include: {
      collaborator: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              pictureUrl: true,
              jobTitle: true,
              department: { select: { name: true } },
            },
          },
        },
      },
    },
  },
  _count: { select: { timesheetEntries: true, assignments: true } },
} as const;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(status?: ProjectStatus) {
    const where: Prisma.ProjectWhereInput = status ? { status } : {};
    const projects = await this.prisma.project.findMany({
      where,
      include: PROJECT_INCLUDE,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    // Attach aggregated hours
    const projectIds = projects.map((p) => p.id);
    const hourTotals = await this.prisma.timesheetEntry.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds } },
      _sum: { hours: true },
    });

    const hoursMap = new Map(
      hourTotals.map((h) => [h.projectId, Number(h._sum.hours ?? 0)]),
    );

    return projects.map((p) => ({
      ...p,
      totalHoursLogged: hoursMap.get(p.id) ?? 0,
      budgetHoursUsedPct:
        p.budgetHours && hoursMap.get(p.id) !== undefined
          ? Math.round(
              ((hoursMap.get(p.id) ?? 0) / Number(p.budgetHours)) * 100,
            )
          : null,
    }));
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: PROJECT_INCLUDE,
    });
    if (!project) throw new NotFoundException('Project not found');

    const hourTotals = await this.prisma.timesheetEntry.groupBy({
      by: ['projectId'],
      where: { projectId: id },
      _sum: { hours: true },
    });
    const totalHoursLogged = Number(hourTotals[0]?._sum?.hours ?? 0);

    return {
      ...project,
      totalHoursLogged,
      budgetHoursUsedPct:
        project.budgetHours
          ? Math.round((totalHoursLogged / Number(project.budgetHours)) * 100)
          : null,
    };
  }

  async findByManager(managerId: string) {
    // Return projects where this manager is the lead OR at least one of
    // their supervised collaborators has an active assignment.
    const manager = await this.prisma.manager.findUnique({
      where: { id: managerId },
      include: { collaborators: { select: { id: true } } },
    });

    if (!manager) return this.findAll();

    const superviseeIds = manager.collaborators.map((c) => c.id);

    const projects = await this.prisma.project.findMany({
      where: {
        OR: [
          { leadId: managerId },
          {
            assignments: {
              some: {
                collaboratorId: { in: superviseeIds },
                unassignedAt: null,
              },
            },
          },
        ],
      },
      include: PROJECT_INCLUDE,
      orderBy: [{ status: 'asc' }, { name: 'asc' }],
    });

    const projectIds = projects.map((p) => p.id);
    const hourTotals = await this.prisma.timesheetEntry.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds } },
      _sum: { hours: true },
    });
    const hoursMap = new Map(
      hourTotals.map((h) => [h.projectId, Number(h._sum.hours ?? 0)]),
    );
    return projects.map((p) => ({
      ...p,
      totalHoursLogged: hoursMap.get(p.id) ?? 0,
      budgetHoursUsedPct:
        p.budgetHours && hoursMap.get(p.id) !== undefined
          ? Math.round(((hoursMap.get(p.id) ?? 0) / Number(p.budgetHours)) * 100)
          : null,
    }));
  }

  async findByUser(userId: string) {
    const collaborator = await this.prisma.collaborator.findUnique({
      where: { id: userId },
      include: {
        assignments: {
          where: { unassignedAt: null },
          include: {
            project: { include: { lead: { select: { id: true, firstName: true, lastName: true } } } },
          },
        },
      },
    });

    if (!collaborator) {
      // Check if this is a manager — return only their scoped projects
      const isManager = await this.prisma.manager.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (isManager) return this.findByManager(userId);
      // Admin or unknown role — return all
      return this.findAll();
    }

    return collaborator.assignments.map((a) => ({
      ...a.project,
      roleOnProject: a.roleOnProject,
      assignedAt: a.assignedAt,
    }));
  }

  async create(dto: CreateProjectDto) {
    if (dto.leadId) {
      const user = await this.prisma.user.findUnique({ where: { id: dto.leadId } });
      if (!user) throw new NotFoundException('Lead user not found');
    }

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        client: dto.client,
        status: dto.status ?? ProjectStatus.IN_PROGRESS,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        budgetHours: dto.budgetHours != null ? new Decimal(dto.budgetHours) : null,
        budgetAmount: dto.budgetAmount != null ? new Decimal(dto.budgetAmount) : null,
        leadId: dto.leadId ?? null,
      },
      include: PROJECT_INCLUDE,
    });

    this.logger.log(`Project created: ${project.id} — ${project.name}`);
    return project;
  }

  async update(id: string, dto: Partial<CreateProjectDto>) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        client: dto.client,
        status: dto.status,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        budgetHours: dto.budgetHours != null ? new Decimal(dto.budgetHours) : undefined,
        budgetAmount: dto.budgetAmount != null ? new Decimal(dto.budgetAmount) : undefined,
        leadId: dto.leadId,
      },
      include: PROJECT_INCLUDE,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.project.delete({ where: { id } });
    return { success: true };
  }

  // ─── Team Assignments ─────────────────────────────────────────────────────────

  async getTeam(projectId: string) {
    await this.findOne(projectId);
    return this.prisma.projectAssignment.findMany({
      where: { projectId, unassignedAt: null },
      include: {
        collaborator: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                pictureUrl: true,
                jobTitle: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { assignedAt: 'asc' },
    });
  }

  async assignMember(projectId: string, dto: AssignMemberDto) {
    const project = await this.findOne(projectId);

    const collaborator = await this.prisma.collaborator.findUnique({
      where: { id: dto.collaboratorId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!collaborator) throw new NotFoundException('Collaborator not found');

    const existing = await this.prisma.projectAssignment.findFirst({
      where: {
        projectId,
        collaboratorId: dto.collaboratorId,
        unassignedAt: null,
      },
    });
    if (existing) throw new ConflictException('Member already assigned to this project');

    const assignment = await this.prisma.projectAssignment.create({
      data: {
        projectId,
        collaboratorId: dto.collaboratorId,
        roleOnProject: dto.roleOnProject ?? null,
        assignedAt: new Date(),
      },
      include: {
        collaborator: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                pictureUrl: true,
                jobTitle: true,
              },
            },
          },
        },
      },
    });

    // Notify the collaborator
    await this.notifications.create(
      collaborator.user.id,
      buildTitle('PROJECT', 'Assigné à un projet'),
      `Vous avez été assigné au projet "${(project as any).name}"${dto.roleOnProject ? ` en tant que ${dto.roleOnProject}` : ''}.`,
    );

    return assignment;
  }

  async removeMember(projectId: string, collaboratorId: string) {
    const assignment = await this.prisma.projectAssignment.findFirst({
      where: { projectId, collaboratorId, unassignedAt: null },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.projectAssignment.update({
      where: { id: assignment.id },
      data: { unassignedAt: new Date() },
    });
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async getProjectHours(projectId: string, year?: number, month?: number) {
    await this.findOne(projectId);

    const dateFilter: Prisma.TimesheetEntryWhereInput = { projectId };
    if (year) {
      const start = month
        ? new Date(year, month - 1, 1)
        : new Date(year, 0, 1);
      const end = month
        ? new Date(year, month, 0, 23, 59, 59)
        : new Date(year, 11, 31, 23, 59, 59);
      dateFilter.entryDate = { gte: start, lte: end };
    }

    // Hours by collaborator
    const byCollaborator = await this.prisma.timesheetEntry.groupBy({
      by: ['timesheetId'],
      where: dateFilter,
      _sum: { hours: true },
    });

    // Full entries for detailed view
    const entries = await this.prisma.timesheetEntry.findMany({
      where: dateFilter,
      include: {
        timesheet: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { entryDate: 'desc' },
    });

    // Aggregate by user
    const byUser = new Map<
      string,
      { userId: string; firstName: string; lastName: string; department?: string; hours: number }
    >();

    for (const entry of entries) {
      const user = entry.timesheet.user;
      const key = user.id;
      const current = byUser.get(key) ?? {
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        department: user.department?.name,
        hours: 0,
      };
      current.hours += Number(entry.hours);
      byUser.set(key, current);
    }

    const totalHours = Array.from(byUser.values()).reduce(
      (sum, u) => sum + u.hours,
      0,
    );

    return {
      projectId,
      totalHours,
      byCollaborator: Array.from(byUser.values()).sort(
        (a, b) => b.hours - a.hours,
      ),
      entriesCount: entries.length,
    };
  }

  async getOverviewReport(year: number, month?: number) {
    const projects = await this.findAll();

    const enriched = await Promise.all(
      projects.map(async (p) => {
        const hours = await this.getProjectHours(p.id, year, month);
        return {
          ...p,
          period: { year, month },
          periodHours: hours.totalHours,
          memberCount: p.assignments.length,
        };
      }),
    );

    return enriched;
  }

  async getResourceAllocation(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const entries = await this.prisma.timesheetEntry.findMany({
      where: { entryDate: { gte: start, lte: end } },
      include: {
        project: { select: { id: true, name: true, code: true } },
        timesheet: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                department: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Group by user → project
    const userMap = new Map<
      string,
      {
        userId: string;
        firstName: string;
        lastName: string;
        department?: string;
        totalHours: number;
        projects: Map<string, { projectId: string; projectName: string; hours: number }>;
      }
    >();

    for (const entry of entries) {
      const user = entry.timesheet.user;
      const uid = user.id;

      if (!userMap.has(uid)) {
        userMap.set(uid, {
          userId: uid,
          firstName: user.firstName,
          lastName: user.lastName,
          department: user.department?.name,
          totalHours: 0,
          projects: new Map(),
        });
      }

      const userEntry = userMap.get(uid)!;
      userEntry.totalHours += Number(entry.hours);

      const pid = entry.projectId;
      const projEntry = userEntry.projects.get(pid) ?? {
        projectId: pid,
        projectName: entry.project.name ?? entry.project.code ?? pid,
        hours: 0,
      };
      projEntry.hours += Number(entry.hours);
      userEntry.projects.set(pid, projEntry);
    }

    return Array.from(userMap.values()).map((u) => ({
      ...u,
      projects: Array.from(u.projects.values()).map((p) => ({
        ...p,
        pct: u.totalHours > 0 ? Math.round((p.hours / u.totalHours) * 100) : 0,
      })),
    }));
  }
}
