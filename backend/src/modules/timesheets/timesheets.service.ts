import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import { TimesheetStatus } from '@prisma/client';
import { UpsertTimesheetDraftDto } from './dto/upsert-timesheet-draft.dto';
import { ApproveTimesheetDto } from './dto/approve-timesheet.dto';
import { RejectTimesheetDto } from './dto/reject-timesheet.dto';
import PDFDocument from 'pdfkit';

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listProjects() {
    const projects = await this.prisma.project.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
      orderBy: [{ name: 'asc' }, { code: 'asc' }],
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      code: project.code,
      status: project.status,
      label:
        project.name?.trim() || project.code?.trim()
          ? [project.name?.trim(), project.code?.trim()]
              .filter(Boolean)
              .join(' - ')
          : project.id,
    }));
  }

  async upsertDraft(dto: UpsertTimesheetDraftDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const weekStartDate = new Date(dto.weekStartDate);

    if (Number.isNaN(weekStartDate.getTime())) {
      throw new BadRequestException('Invalid weekStartDate');
    }

    const projectIds = [...new Set(dto.entries.map((entry) => entry.projectId))];
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: { id: true },
    });

    if (projects.length !== projectIds.length) {
      throw new BadRequestException('One or more projects are invalid');
    }

    const existing = await this.prisma.timesheet.findUnique({
      where: {
        userId_weekStartDate: {
          userId: dto.userId,
          weekStartDate,
        },
      },
      select: { id: true, status: true },
    });

    if (existing && existing.status === TimesheetStatus.APPROVED) {
      throw new BadRequestException('Approved timesheets are locked');
    }

    const totalHours = dto.entries.reduce((sum, entry) => sum + Number(entry.hours), 0);
    const contractualHours = await this.getContractualWeeklyHours(dto.userId, weekStartDate);

    const regularHours = Math.min(totalHours, contractualHours);
    const overtimeHours = Math.max(0, totalHours - contractualHours);

    const timesheet = await this.prisma.timesheet.upsert({
      where: {
        userId_weekStartDate: {
          userId: dto.userId,
          weekStartDate,
        },
      },
      create: {
        userId: dto.userId,
        weekStartDate,
        status: TimesheetStatus.DRAFT,
        totalHours: new Decimal(totalHours),
        regularHours: new Decimal(regularHours),
        overtimeHours: new Decimal(overtimeHours),
        entries: {
          create: dto.entries.map((entry) => ({
            projectId: entry.projectId,
            entryDate: new Date(entry.entryDate),
            taskName: entry.taskName ?? null,
            hours: new Decimal(entry.hours),
            activityDescription: entry.activityDescription ?? null,
            comments: entry.comments ?? null,
          })),
        },
      },
      update: {
        status: TimesheetStatus.DRAFT,
        submittedAt: null,
        approvedAt: null,
        rejectedAt: null,
        lockedAt: null,
        decisionComment: null,
        decidedBy: null,
        totalHours: new Decimal(totalHours),
        regularHours: new Decimal(regularHours),
        overtimeHours: new Decimal(overtimeHours),
        entries: {
          deleteMany: {},
          create: dto.entries.map((entry) => ({
            projectId: entry.projectId,
            entryDate: new Date(entry.entryDate),
            taskName: entry.taskName ?? null,
            hours: new Decimal(entry.hours),
            activityDescription: entry.activityDescription ?? null,
            comments: entry.comments ?? null,
          })),
        },
      },
      include: {
        entries: true,
      },
    });

    this.logger.log(`Timesheet draft upserted for user ${dto.userId}`);

    return {
      message: 'Timesheet draft saved successfully',
      timesheet,
    };
  }

  async submit(timesheetId: string) {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { entries: true },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    if (timesheet.status === TimesheetStatus.APPROVED) {
      throw new BadRequestException('Approved timesheets are locked');
    }

    if (!timesheet.entries.length) {
      throw new BadRequestException('Cannot submit an empty timesheet');
    }

    const updated = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: TimesheetStatus.SUBMITTED,
        submittedAt: new Date(),
      },
      include: {
        entries: true,
      },
    });

    return {
      message: 'Timesheet submitted for approval',
      timesheet: updated,
    };
  }

  async approve(timesheetId: string, dto: ApproveTimesheetDto) {
    const manager = await this.prisma.manager.findUnique({
      where: { id: dto.managerId },
      select: { id: true },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: { user: { select: { id: true } } },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted timesheets can be approved');
    }

    const updated = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: TimesheetStatus.APPROVED,
        decidedBy: dto.managerId,
        approvedAt: new Date(),
        lockedAt: new Date(),
        rejectedAt: null,
        decisionComment: dto.comment ?? null,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        entries: true,
      },
    });

    return {
      message: 'Timesheet approved successfully',
      timesheet: updated,
    };
  }

  async reject(timesheetId: string, dto: RejectTimesheetDto) {
    const manager = await this.prisma.manager.findUnique({
      where: { id: dto.managerId },
      select: { id: true },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id: timesheetId },
      select: { id: true, status: true },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted timesheets can be rejected');
    }

    const updated = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: TimesheetStatus.REJECTED,
        decidedBy: dto.managerId,
        rejectedAt: new Date(),
        approvedAt: null,
        lockedAt: null,
        decisionComment: dto.comment,
      },
      include: {
        entries: true,
      },
    });

    return {
      message: 'Timesheet rejected. Collaborator can edit and resubmit.',
      timesheet: updated,
    };
  }

  async findById(timesheetId: string) {
    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id: timesheetId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        entries: {
          include: {
            project: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { entryDate: 'asc' },
        },
      },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    return timesheet;
  }

  async findByUser(userId: string, weekStartDate?: string) {
    const where = weekStartDate
      ? {
          userId,
          weekStartDate: new Date(weekStartDate),
        }
      : { userId };

    const timesheets = await this.prisma.timesheet.findMany({
      where,
      include: {
        entries: {
          include: {
            project: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { entryDate: 'asc' },
        },
      },
      orderBy: { weekStartDate: 'desc' },
    });

    return timesheets;
  }

  async findSubmittedForManager(managerId: string) {
    const manager = await this.prisma.manager.findUnique({
      where: { id: managerId },
      include: {
        collaborators: {
          select: { id: true },
        },
      },
    });

    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    const collaboratorIds = manager.collaborators.map((collaborator) => collaborator.id);

    return this.prisma.timesheet.findMany({
      where: {
        userId: { in: collaboratorIds },
        status: TimesheetStatus.SUBMITTED,
      },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        entries: true,
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getWeeklyReport(userId: string, weekStartDate: string) {
    const timesheet = await this.prisma.timesheet.findFirst({
      where: {
        userId,
        weekStartDate: new Date(weekStartDate),
      },
      include: {
        entries: {
          include: {
            project: {
              select: { id: true, name: true, code: true },
            },
          },
          orderBy: { entryDate: 'asc' },
        },
      },
    });

    if (!timesheet) {
      throw new NotFoundException('Weekly timesheet not found');
    }

    const byProject = new Map<
      string,
      { projectId: string; projectName: string; hours: number; overtimeHours: number }
    >();

    for (const entry of timesheet.entries) {
      const key = entry.projectId;
      const current = byProject.get(key) ?? {
        projectId: entry.projectId,
        projectName: entry.project?.name ?? entry.project?.code ?? 'Unnamed project',
        hours: 0,
        overtimeHours: 0,
      };

      const entryHours = Number(entry.hours);
      current.hours += entryHours;
      byProject.set(key, current);
    }

    const totalHours = Number(timesheet.totalHours ?? 0);
    const overtimeHours = Number(timesheet.overtimeHours ?? 0);

    return {
      timesheetId: timesheet.id,
      status: timesheet.status,
      weekStartDate: timesheet.weekStartDate,
      totalHours,
      regularHours: Number(timesheet.regularHours ?? 0),
      overtimeHours,
      byProject: Array.from(byProject.values()),
      entriesCount: timesheet.entries.length,
    };
  }

  async getMonthlyReport(userId: string, year: number, month: number) {
    this.assertYearMonth(year, month);

    const range = this.getMonthRange(year, month);

    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        userId,
        weekStartDate: {
          gte: range.start,
          lt: range.end,
        },
      },
      include: {
        entries: {
          include: {
            project: {
              select: { id: true, name: true, code: true },
            },
          },
        },
      },
      orderBy: { weekStartDate: 'asc' },
    });

    const byProject = new Map<
      string,
      { projectId: string; projectName: string; hours: number; overtimeHours: number }
    >();

    let totalHours = 0;
    let overtimeHours = 0;

    for (const timesheet of timesheets) {
      const sheetHours = Number(timesheet.totalHours ?? 0);
      const sheetOvertime = Number(timesheet.overtimeHours ?? 0);

      totalHours += sheetHours;
      overtimeHours += sheetOvertime;

      for (const entry of timesheet.entries) {
        const key = entry.projectId;
        const current = byProject.get(key) ?? {
          projectId: entry.projectId,
          projectName: entry.project?.name ?? entry.project?.code ?? 'Unnamed project',
          hours: 0,
          overtimeHours: 0,
        };

        current.hours += Number(entry.hours);
        byProject.set(key, current);
      }
    }

    return {
      userId,
      year,
      month,
      totalTimesheets: timesheets.length,
      totalHours,
      overtimeHours,
      byProject: Array.from(byProject.values()),
      weeks: timesheets.map((sheet) => ({
        timesheetId: sheet.id,
        weekStartDate: sheet.weekStartDate,
        status: sheet.status,
        totalHours: Number(sheet.totalHours ?? 0),
        overtimeHours: Number(sheet.overtimeHours ?? 0),
      })),
    };
  }

  async getProjectTotals(year: number, month: number) {
    this.assertYearMonth(year, month);

    const range = this.getMonthRange(year, month);

    const entries = await this.prisma.timesheetEntry.findMany({
      where: {
        entryDate: {
          gte: range.start,
          lt: range.end,
        },
      },
      include: {
        project: {
          select: { id: true, name: true, code: true },
        },
        timesheet: {
          select: { userId: true },
        },
      },
    });

    const totals = new Map<
      string,
      { projectId: string; projectName: string; totalHours: number; contributors: Set<string> }
    >();

    for (const entry of entries) {
      const key = entry.projectId;
      const current = totals.get(key) ?? {
        projectId: entry.projectId,
        projectName: entry.project?.name ?? entry.project?.code ?? 'Unnamed project',
        totalHours: 0,
        contributors: new Set<string>(),
      };

      current.totalHours += Number(entry.hours);
      current.contributors.add(entry.timesheet.userId);
      totals.set(key, current);
    }

    return Array.from(totals.values())
      .map((item) => ({
        projectId: item.projectId,
        projectName: item.projectName,
        totalHours: item.totalHours,
        contributorsCount: item.contributors.size,
      }))
      .sort((a, b) => b.totalHours - a.totalHours);
  }

  async exportMonthlyExcel(year: number, month: number) {
    const projectTotals = await this.getProjectTotals(year, month);

    const rows = [
      ['Project ID', 'Project Name', 'Total Hours', 'Contributors'].join(','),
      ...projectTotals.map((item) =>
        [
          this.escapeCsv(item.projectId),
          this.escapeCsv(item.projectName),
          item.totalHours.toFixed(2),
          String(item.contributorsCount),
        ].join(','),
      ),
    ];

    return rows.join('\n');
  }

  async exportMonthlyPdf(year: number, month: number) {
    const projectTotals = await this.getProjectTotals(year, month);

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));

      doc.fontSize(18).text(`Timesheets Report - ${year}-${String(month).padStart(2, '0')}`);
      doc.moveDown();
      doc.fontSize(12).text('Project totals');
      doc.moveDown(0.5);

      for (const item of projectTotals) {
        doc
          .fontSize(10)
          .text(
            `${item.projectName} (${item.projectId}) - ${item.totalHours.toFixed(2)}h - ${item.contributorsCount} contributors`,
          );
      }

      doc.end();
    });
  }

  private assertYearMonth(year: number, month: number) {
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('Invalid year');
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new BadRequestException('Invalid month');
    }
  }

  private getMonthRange(year: number, month: number) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 1));

    return { start, end };
  }

  private escapeCsv(value: string) {
    const escaped = value.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  private async getContractualWeeklyHours(userId: string, weekStartDate: Date) {
    const contract = await this.prisma.contract.findFirst({
      where: {
        userId,
        startDate: { lte: weekStartDate },
        OR: [{ endDate: null }, { endDate: { gte: weekStartDate } }],
      },
      orderBy: { startDate: 'desc' },
      select: { weeklyHours: true },
    });

    return Number(contract?.weeklyHours ?? 40);
  }
}
