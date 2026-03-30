import {
  BadRequestException,
  ForbiddenException,
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
import { NotificationsService, buildTitle } from '../notifications/notifications.service';

@Injectable()
export class TimesheetsService {
  private readonly logger = new Logger(TimesheetsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

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
      include: {
        entries: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            collaborator: { select: { managerId: true } },
          },
        },
      },
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
      include: { entries: true },
    });

    // Notify the collaborator's manager
    const fullName = `${timesheet.user.firstName} ${timesheet.user.lastName}`;
    const managerId = timesheet.user.collaborator?.managerId;
    if (managerId) {
      await this.notifications.create(
        managerId,
        buildTitle('TIMESHEET', 'Nouvelle feuille de temps soumise'),
        `${fullName} a soumis une feuille de temps en attente de validation.`,
      );
    }
    // Notify admins
    await this.notifications.notifyAdmins(
      buildTitle('TIMESHEET', 'Feuille de temps soumise'),
      `${fullName} a soumis une feuille de temps.`,
    );

    return {
      message: 'Timesheet submitted for approval',
      timesheet: updated,
    };
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { select: { description: true } } },
    });
    return user?.role?.description?.toLowerCase().includes('admin') ?? false;
  }

  async approve(timesheetId: string, dto: ApproveTimesheetDto) {
    const isAdmin = await this.isAdminUser(dto.managerId);
    const managerRecord = await this.prisma.manager.findUnique({
      where: { id: dto.managerId },
      include: { collaborators: { select: { id: true } } },
    });

    if (!isAdmin && !managerRecord) {
      throw new NotFoundException('Manager not found');
    }
    const decidedBy = managerRecord ? dto.managerId : null;

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

    // Managers can only approve timesheets of their own supervisees
    if (!isAdmin && managerRecord) {
      const superviseeIds = new Set(managerRecord.collaborators.map((c) => c.id));
      if (!superviseeIds.has(timesheet.userId)) {
        throw new ForbiddenException(
          'You can only approve timesheets from members of your team',
        );
      }
    }

    const updated = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: TimesheetStatus.APPROVED,
        decidedBy,
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

    // Notify the collaborator
    await this.notifications.create(
      timesheet.user.id,
      buildTitle('TIMESHEET', 'Feuille de temps approuvée'),
      `Votre feuille de temps a été approuvée.${dto.comment ? ` Commentaire : ${dto.comment}` : ''}`,
    );

    return {
      message: 'Timesheet approved successfully',
      timesheet: updated,
    };
  }

  async reject(timesheetId: string, dto: RejectTimesheetDto) {
    const isAdmin = await this.isAdminUser(dto.managerId);
    const managerRecord = await this.prisma.manager.findUnique({
      where: { id: dto.managerId },
      include: { collaborators: { select: { id: true } } },
    });

    if (!isAdmin && !managerRecord) {
      throw new NotFoundException('Manager not found');
    }
    const decidedBy = managerRecord ? dto.managerId : null;

    const timesheet = await this.prisma.timesheet.findUnique({
      where: { id: timesheetId },
      select: { id: true, status: true, userId: true },
    });

    if (!timesheet) {
      throw new NotFoundException('Timesheet not found');
    }

    if (timesheet.status !== TimesheetStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted timesheets can be rejected');
    }

    // Managers can only reject timesheets of their own supervisees
    if (!isAdmin && managerRecord) {
      const superviseeIds = new Set(managerRecord.collaborators.map((c) => c.id));
      if (!superviseeIds.has(timesheet.userId)) {
        throw new ForbiddenException(
          'You can only reject timesheets from members of your team',
        );
      }
    }

    const updated = await this.prisma.timesheet.update({
      where: { id: timesheetId },
      data: {
        status: TimesheetStatus.REJECTED,
        decidedBy,
        rejectedAt: new Date(),
        approvedAt: null,
        lockedAt: null,
        decisionComment: dto.comment,
      },
      include: {
        entries: true,
      },
    });

    // Notify the collaborator
    await this.notifications.create(
      timesheet.userId,
      buildTitle('TIMESHEET', 'Feuille de temps refusée'),
      `Votre feuille de temps a été refusée.${dto.comment ? ` Raison : ${dto.comment}` : ''} Vous pouvez la corriger et la soumettre à nouveau.`,
    );

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
    const isAdmin = await this.isAdminUser(managerId);

    let collaboratorIds: string[];

    if (isAdmin) {
      // Admin sees all submitted timesheets
      const allCollaborators = await this.prisma.collaborator.findMany({
        select: { id: true },
      });
      collaboratorIds = allCollaborators.map((c) => c.id);
    } else {
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

      collaboratorIds = manager.collaborators.map((collaborator) => collaborator.id);
    }

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

  async getAdminMonthlyStats(year: number, month: number) {
    this.assertYearMonth(year, month);
    const range = this.getMonthRange(year, month);

    const timesheets = await this.prisma.timesheet.findMany({
      where: { weekStartDate: { gte: range.start, lt: range.end } },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            department: { select: { name: true } },
          },
        },
        entries: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: [{ user: { lastName: 'asc' } }, { weekStartDate: 'asc' }],
    });

    const totalHours = timesheets.reduce((s, ts) => s + Number(ts.totalHours ?? 0), 0);
    const overtimeHours = timesheets.reduce((s, ts) => s + Number(ts.overtimeHours ?? 0), 0);
    const uniqueEmployees = new Set(timesheets.map((ts) => ts.userId)).size;

    const byStatus: Record<string, number> = {};
    for (const ts of timesheets) {
      byStatus[ts.status] = (byStatus[ts.status] ?? 0) + 1;
    }

    const projectTotals = await this.getProjectTotals(year, month);

    return {
      year,
      month,
      totalTimesheets: timesheets.length,
      uniqueEmployees,
      totalHours,
      overtimeHours,
      byStatus,
      projectCount: projectTotals.length,
      timesheets,
      projectTotals,
    };
  }

  async exportMonthlyExcel(year: number, month: number) {
    const stats = await this.getAdminMonthlyStats(year, month);
    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;
    const generatedAt = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const rows: string[] = [];

    // ── Header ──────────────────────────────────────────────────────────────
    rows.push(this.escapeCsv(`RAPPORT DES FEUILLES DE TEMPS — ${monthLabel}`));
    rows.push(this.escapeCsv(`Généré le : ${generatedAt}`));
    rows.push('');

    // ── Summary ──────────────────────────────────────────────────────────────
    rows.push(this.escapeCsv('RÉSUMÉ GLOBAL'));
    rows.push(['Indicateur', 'Valeur'].join(','));
    rows.push([this.escapeCsv('Feuilles de temps'), stats.totalTimesheets].join(','));
    rows.push([this.escapeCsv('Employés actifs'), stats.uniqueEmployees].join(','));
    rows.push([this.escapeCsv('Heures totales'), stats.totalHours.toFixed(2) + 'h'].join(','));
    rows.push([this.escapeCsv('Heures supplémentaires'), stats.overtimeHours.toFixed(2) + 'h'].join(','));
    rows.push([this.escapeCsv('Projets actifs'), stats.projectCount].join(','));
    rows.push([this.escapeCsv('Approuvées'), stats.byStatus['APPROVED'] ?? 0].join(','));
    rows.push([this.escapeCsv('En attente'), stats.byStatus['SUBMITTED'] ?? 0].join(','));
    rows.push([this.escapeCsv('Brouillons'), stats.byStatus['DRAFT'] ?? 0].join(','));
    rows.push([this.escapeCsv('Rejetées'), stats.byStatus['REJECTED'] ?? 0].join(','));
    rows.push('');

    // ── Project breakdown ────────────────────────────────────────────────────
    rows.push(this.escapeCsv('RÉPARTITION PAR PROJET'));
    rows.push(['Projet', 'Heures totales', 'Contributeurs', '% du total'].join(','));
    for (const p of stats.projectTotals) {
      const pct = stats.totalHours > 0
        ? ((p.totalHours / stats.totalHours) * 100).toFixed(1)
        : '0.0';
      rows.push([
        this.escapeCsv(p.projectName),
        p.totalHours.toFixed(2) + 'h',
        String(p.contributorsCount),
        pct + '%',
      ].join(','));
    }
    rows.push([
      this.escapeCsv('TOTAL'),
      stats.totalHours.toFixed(2) + 'h',
      String(stats.uniqueEmployees),
      '100%',
    ].join(','));
    rows.push('');

    // ── Employee detail ──────────────────────────────────────────────────────
    rows.push(this.escapeCsv('DÉTAIL PAR EMPLOYÉ'));
    rows.push([
      'Nom', 'Prénom', 'Département', 'Semaine du',
      'Statut', 'Heures totales', 'Heures supp.',
    ].join(','));

    for (const ts of stats.timesheets) {
      const weekStr = new Date(ts.weekStartDate).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
      });
      rows.push([
        this.escapeCsv(ts.user?.lastName ?? '—'),
        this.escapeCsv(ts.user?.firstName ?? '—'),
        this.escapeCsv(ts.user?.department?.name ?? '—'),
        this.escapeCsv(weekStr),
        this.escapeCsv(ts.status),
        Number(ts.totalHours ?? 0).toFixed(2) + 'h',
        Number(ts.overtimeHours ?? 0).toFixed(2) + 'h',
      ].join(','));
    }
    rows.push('');

    // ── Entry detail ─────────────────────────────────────────────────────────
    rows.push(this.escapeCsv('DÉTAIL DES ENTRÉES'));
    rows.push(['Employé', 'Date', 'Projet', 'Tâche', 'Heures'].join(','));

    for (const ts of stats.timesheets) {
      const name = `${ts.user?.firstName ?? ''} ${ts.user?.lastName ?? ''}`.trim();
      for (const entry of ts.entries) {
        rows.push([
          this.escapeCsv(name),
          this.escapeCsv(
            new Date(entry.entryDate).toLocaleDateString('fr-FR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            }),
          ),
          this.escapeCsv(entry.project?.name ?? entry.project?.code ?? '—'),
          this.escapeCsv(entry.taskName ?? '—'),
          Number(entry.hours ?? 0).toFixed(2) + 'h',
        ].join(','));
      }
    }

    return rows.join('\n');
  }

  async exportMonthlyPdf(year: number, month: number) {
    const stats = await this.getAdminMonthlyStats(year, month);

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
    ];
    const monthLabel = `${monthNames[month - 1]} ${year}`;
    const generatedAt = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks: Buffer[] = [];

    const ORANGE = '#F97316';
    const DARK   = '#1C1917';
    const GRAY   = '#78716C';
    const LIGHT  = '#F5F5F4';
    const WHITE  = '#FFFFFF';
    const pageW  = 595 - 100; // A4 width minus margins

    const drawHRule = (y: number, color = '#E7E5E4') => {
      doc.moveTo(50, y).lineTo(545, y).strokeColor(color).lineWidth(0.5).stroke();
    };

    const tableHeader = (cols: { label: string; width: number; align?: string }[], y: number) => {
      let x = 50;
      doc.rect(50, y, pageW, 18).fill(ORANGE);
      for (const col of cols) {
        doc.fillColor(WHITE).fontSize(8).font('Helvetica-Bold')
          .text(col.label, x + 4, y + 5, { width: col.width - 8, align: (col.align as any) ?? 'left' });
        x += col.width;
      }
      return y + 18;
    };

    const tableRow = (
      cells: string[],
      widths: number[],
      y: number,
      bg: string,
      textColor = DARK,
    ) => {
      doc.rect(50, y, pageW, 16).fill(bg);
      let x = 50;
      for (let i = 0; i < cells.length; i++) {
        doc.fillColor(textColor).fontSize(8).font('Helvetica')
          .text(cells[i], x + 4, y + 4, { width: widths[i] - 8, align: i === widths.length - 1 ? 'right' : 'left' });
        x += widths[i];
      }
      drawHRule(y + 16, '#E7E5E4');
      return y + 16;
    };

    return new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (chunk) => chunks.push(chunk as Buffer));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (error) => reject(error));

      // ── Cover / Header ────────────────────────────────────────────────────
      doc.rect(0, 0, 595, 110).fill(DARK);

      doc.fillColor(ORANGE).fontSize(22).font('Helvetica-Bold')
        .text('RAPPORT DES FEUILLES DE TEMPS', 50, 28, { width: pageW });

      doc.fillColor(WHITE).fontSize(13).font('Helvetica')
        .text(monthLabel, 50, 56, { width: pageW });

      doc.fillColor('#A8A29E').fontSize(9).font('Helvetica')
        .text(`Généré le ${generatedAt}`, 50, 76, { width: pageW });

      // ── Executive Summary ─────────────────────────────────────────────────
      let y = 125;
      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('RÉSUMÉ EXÉCUTIF', 50, y);
      y += 18;
      drawHRule(y - 4, ORANGE);

      const kpis = [
        { label: 'Feuilles de temps', value: String(stats.totalTimesheets) },
        { label: 'Employés actifs', value: String(stats.uniqueEmployees) },
        { label: 'Heures totales', value: `${stats.totalHours.toFixed(1)}h` },
        { label: 'Heures supp.', value: `${stats.overtimeHours.toFixed(1)}h` },
        { label: 'Projets actifs', value: String(stats.projectCount) },
        { label: 'Approuvées', value: String(stats.byStatus['APPROVED'] ?? 0) },
      ];

      const kpiW = Math.floor(pageW / 3);
      kpis.forEach((kpi, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const kx = 50 + col * kpiW;
        const ky = y + row * 46;
        doc.rect(kx + 2, ky, kpiW - 4, 40).fill(LIGHT);
        doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(kpi.label, kx + 8, ky + 6, { width: kpiW - 12 });
        doc.fillColor(DARK).fontSize(16).font('Helvetica-Bold').text(kpi.value, kx + 8, ky + 18, { width: kpiW - 12 });
      });

      y += Math.ceil(kpis.length / 3) * 46 + 16;
      drawHRule(y);

      // ── Status Breakdown ──────────────────────────────────────────────────
      y += 10;
      const statusOrder = ['APPROVED', 'SUBMITTED', 'DRAFT', 'REJECTED'];
      const statusLabels: Record<string, string> = {
        APPROVED: 'Approuvées', SUBMITTED: 'Soumises', DRAFT: 'Brouillons', REJECTED: 'Rejetées',
      };
      const statusColors: Record<string, string> = {
        APPROVED: '#22C55E', SUBMITTED: '#60A5FA', DRAFT: '#94A3B8', REJECTED: '#F87171',
      };

      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('STATUT DES FEUILLES', 50, y);
      y += 18;
      drawHRule(y - 4, ORANGE);

      const statusBarW = pageW - 12;
      doc.rect(50, y, statusBarW, 16).fill(LIGHT);
      let barX = 50;
      for (const s of statusOrder) {
        const cnt = stats.byStatus[s] ?? 0;
        if (cnt === 0 || stats.totalTimesheets === 0) continue;
        const barPct = cnt / stats.totalTimesheets;
        const w = Math.floor(statusBarW * barPct);
        doc.rect(barX, y, w, 16).fill(statusColors[s]);
        barX += w;
      }
      y += 20;

      let statusX = 50;
      for (const s of statusOrder) {
        const cnt = stats.byStatus[s] ?? 0;
        doc.rect(statusX, y, 10, 10).fill(statusColors[s]);
        doc.fillColor(GRAY).fontSize(8).font('Helvetica')
          .text(`${statusLabels[s]}: ${cnt}`, statusX + 13, y + 1, { width: 90 });
        statusX += 120;
      }
      y += 22;
      drawHRule(y);

      // ── Project Breakdown ─────────────────────────────────────────────────
      y += 12;
      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('RÉPARTITION PAR PROJET', 50, y);
      y += 16;

      const projCols = [
        { label: 'Projet', width: 200 },
        { label: 'Contributeurs', width: 80 },
        { label: 'Heures', width: 80 },
        { label: '% Total', width: 85 },
      ];
      y = tableHeader(projCols, y);

      for (let i = 0; i < stats.projectTotals.length; i++) {
        const p = stats.projectTotals[i];
        const pct = stats.totalHours > 0
          ? ((p.totalHours / stats.totalHours) * 100).toFixed(1) + '%'
          : '0%';
        const name = p.projectName.length > 30 ? p.projectName.slice(0, 28) + '…' : p.projectName;
        y = tableRow(
          [name, String(p.contributorsCount), p.totalHours.toFixed(1) + 'h', pct],
          projCols.map((c) => c.width),
          y,
          i % 2 === 0 ? WHITE : LIGHT,
        );
        if (y > 720) {
          doc.addPage();
          y = 50;
          y = tableHeader(projCols, y);
        }
      }

      // Total row
      doc.rect(50, y, pageW, 16).fill('#FFF7ED');
      doc.fillColor(ORANGE).fontSize(8).font('Helvetica-Bold')
        .text('TOTAL', 54, y + 4, { width: 196 });
      doc.text(String(stats.uniqueEmployees), 254, y + 4, { width: 76, align: 'left' });
      doc.text(stats.totalHours.toFixed(1) + 'h', 334, y + 4, { width: 76, align: 'left' });
      doc.text('100%', 414, y + 4, { width: 81, align: 'right' });
      y += 22;

      // ── Employee Detail ───────────────────────────────────────────────────
      if (y > 680) { doc.addPage(); y = 50; }
      else { drawHRule(y); y += 12; }

      doc.fillColor(DARK).fontSize(11).font('Helvetica-Bold').text('DÉTAIL PAR EMPLOYÉ', 50, y);
      y += 16;

      const empCols = [
        { label: 'Employé', width: 145 },
        { label: 'Département', width: 100 },
        { label: 'Semaine du', width: 85 },
        { label: 'Statut', width: 80 },
        { label: 'Heures', width: 55 },
        { label: 'Supp.', width: 50, align: 'right' },
      ];
      y = tableHeader(empCols, y);

      for (let i = 0; i < stats.timesheets.length; i++) {
        const ts = stats.timesheets[i];
        const weekStr = new Date(ts.weekStartDate).toLocaleDateString('fr-FR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
        });
        const name = `${ts.user?.firstName ?? ''} ${ts.user?.lastName ?? ''}`.trim();
        const statusFr: Record<string, string> = {
          APPROVED: 'Approuvée', SUBMITTED: 'Soumise', DRAFT: 'Brouillon', REJECTED: 'Rejetée',
        };
        y = tableRow(
          [
            name.length > 20 ? name.slice(0, 18) + '…' : name,
            (ts.user?.department?.name ?? '—').slice(0, 14),
            weekStr,
            statusFr[ts.status] ?? ts.status,
            Number(ts.totalHours ?? 0).toFixed(1) + 'h',
            Number(ts.overtimeHours ?? 0).toFixed(1) + 'h',
          ],
          empCols.map((c) => c.width),
          y,
          i % 2 === 0 ? WHITE : LIGHT,
        );
        if (y > 720) {
          doc.addPage();
          y = 50;
          y = tableHeader(empCols, y);
        }
      }

      // ── Footer ────────────────────────────────────────────────────────────
      const footerY = 800;
      doc.rect(0, footerY, 595, 42).fill(DARK);
      doc.fillColor(GRAY).fontSize(8).font('Helvetica')
        .text(
          `Rapport confidentiel — ${monthLabel} — Généré le ${generatedAt}`,
          50, footerY + 14,
          { width: pageW, align: 'center' },
        );

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
