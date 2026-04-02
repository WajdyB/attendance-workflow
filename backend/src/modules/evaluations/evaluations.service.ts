import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EvaluationType, Prisma } from '@prisma/client';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { NotificationsService, buildTitle } from '../notifications/notifications.service';

const EVALUATION_INCLUDE = {
  manager: {
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
} as const;

@Injectable()
export class EvaluationsService {
  private readonly logger = new Logger(EvaluationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  async findAll(filters?: {
    collaboratorId?: string;
    managerId?: string;
    evaluationType?: EvaluationType;
    year?: number;
  }) {
    const where: Prisma.EvaluationWhereInput = {};

    if (filters?.collaboratorId) where.collaboratorId = filters.collaboratorId;
    if (filters?.managerId) where.managerId = filters.managerId;
    if (filters?.evaluationType) where.evaluationType = filters.evaluationType;
    if (filters?.year) {
      const y = filters.year;
      const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999));
      where.OR = [
        { reviewDate: { gte: start, lte: end } },
        {
          AND: [
            { reviewDate: null },
            { createdAt: { gte: start, lte: end } },
          ],
        },
      ];
    }

    return this.prisma.evaluation.findMany({
      where,
      include: EVALUATION_INCLUDE,
      orderBy: { reviewDate: 'desc' },
    });
  }

  async findOne(id: string) {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id },
      include: EVALUATION_INCLUDE,
    });
    if (!evaluation) throw new NotFoundException('Evaluation not found');
    return evaluation;
  }

  async findByCollaborator(collaboratorId: string) {
    return this.prisma.evaluation.findMany({
      where: { collaboratorId },
      include: EVALUATION_INCLUDE,
      orderBy: { reviewDate: 'desc' },
    });
  }

  async create(managerId: string, dto: CreateEvaluationDto, isAdmin = false) {
    // Verify collaborator exists
    const collaborator = await this.prisma.collaborator.findUnique({
      where: { id: dto.collaboratorId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!collaborator) throw new NotFoundException('Collaborator not found');

    // Managers can only evaluate their own supervised collaborators
    if (!isAdmin && collaborator.managerId !== managerId) {
      throw new ForbiddenException(
        'You can only evaluate collaborators that are under your supervision',
      );
    }

    const evaluation = await this.prisma.evaluation.create({
      data: {
        managerId,
        collaboratorId: dto.collaboratorId,
        evaluationType: dto.evaluationType ?? EvaluationType.ANNUAL,
        period: dto.period ?? null,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : null,
        globalScore: dto.globalScore != null ? new Decimal(dto.globalScore) : null,
        technicalScore: dto.technicalScore != null ? new Decimal(dto.technicalScore) : null,
        softSkillScore: dto.softSkillScore != null ? new Decimal(dto.softSkillScore) : null,
        comments: dto.comments ?? null,
        objectives: dto.objectives ?? null,
        documentUrl: dto.documentUrl ?? null,
      },
      include: EVALUATION_INCLUDE,
    });

    // Notify the collaborator
    const evalTypeLabel: Record<string, string> = {
      ANNUAL: 'annuelle',
      SEMI_ANNUAL: 'semestrielle',
      PROJECT: 'de projet',
      FEEDBACK_360: '360°',
    };
    const typeLabel = evalTypeLabel[dto.evaluationType ?? 'ANNUAL'] ?? '';
    await this.notifications.create(
      collaborator.user.id,
      buildTitle('EVALUATION', 'Nouvelle évaluation de performance'),
      `Une évaluation ${typeLabel} a été réalisée pour vous. Consultez votre dossier pour en voir les détails.`,
    );

    this.logger.log(`Evaluation created: ${evaluation.id} by manager ${managerId}`);
    return evaluation;
  }

  async update(id: string, managerId: string, dto: Partial<CreateEvaluationDto>, isAdmin = false) {
    const evaluation = await this.findOne(id);

    if (!isAdmin && evaluation.managerId !== managerId) {
      throw new ForbiddenException('You can only edit your own evaluations');
    }

    return this.prisma.evaluation.update({
      where: { id },
      data: {
        evaluationType: dto.evaluationType,
        period: dto.period,
        reviewDate: dto.reviewDate ? new Date(dto.reviewDate) : undefined,
        globalScore: dto.globalScore != null ? new Decimal(dto.globalScore) : undefined,
        technicalScore: dto.technicalScore != null ? new Decimal(dto.technicalScore) : undefined,
        softSkillScore: dto.softSkillScore != null ? new Decimal(dto.softSkillScore) : undefined,
        comments: dto.comments,
        objectives: dto.objectives,
        documentUrl: dto.documentUrl,
      },
      include: EVALUATION_INCLUDE,
    });
  }

  async remove(id: string, managerId: string, isAdmin = false) {
    const evaluation = await this.findOne(id);
    if (!isAdmin && evaluation.managerId !== managerId) {
      throw new ForbiddenException('You can only delete your own evaluations');
    }
    await this.prisma.evaluation.delete({ where: { id } });
    return { success: true };
  }

  // ─── Salary History ───────────────────────────────────────────────────────────

  async getSalaryHistory(userId: string) {
    return this.prisma.salaryHistory.findMany({
      where: { userId },
      include: {
        manager: {
          include: {
            user: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { changeDate: 'desc' },
    });
  }

  async getAllSalaryHistories(departmentId?: string) {
    const where: Prisma.SalaryHistoryWhereInput = departmentId
      ? { user: { departmentId } }
      : {};

    return this.prisma.salaryHistory.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            jobTitle: true,
            department: { select: { name: true } },
          },
        },
        manager: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { changeDate: 'desc' },
    });
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  async getDepartmentStats(year?: number) {
    const dateFilter = year
      ? { reviewDate: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) } }
      : {};

    const evaluations = await this.prisma.evaluation.findMany({
      where: dateFilter,
      include: {
        collaborator: {
          include: {
            user: {
              select: { department: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });

    // Group by department
    const deptMap = new Map<
      string,
      { departmentId: string; departmentName: string; count: number; totalScore: number; scores: number[] }
    >();

    for (const ev of evaluations) {
      const dept = ev.collaborator.user.department;
      if (!dept) continue;
      const key = dept.name;
      const entry = deptMap.get(key) ?? {
        departmentId: dept.name,
        departmentName: dept.name,
        count: 0,
        totalScore: 0,
        scores: [],
      };
      entry.count++;
      if (ev.globalScore) {
        entry.totalScore += Number(ev.globalScore);
        entry.scores.push(Number(ev.globalScore));
      }
      deptMap.set(key, entry);
    }

    return Array.from(deptMap.values()).map((d) => ({
      ...d,
      avgScore: d.scores.length > 0 ? Math.round((d.totalScore / d.scores.length) * 10) / 10 : null,
    }));
  }

  async getCollaboratorTrend(collaboratorId: string) {
    const evaluations = await this.prisma.evaluation.findMany({
      where: { collaboratorId, reviewDate: { not: null } },
      select: {
        id: true,
        reviewDate: true,
        evaluationType: true,
        period: true,
        globalScore: true,
        technicalScore: true,
        softSkillScore: true,
      },
      orderBy: { reviewDate: 'asc' },
    });

    return evaluations.map((e) => ({
      ...e,
      globalScore: e.globalScore ? Number(e.globalScore) : null,
      technicalScore: e.technicalScore ? Number(e.technicalScore) : null,
      softSkillScore: e.softSkillScore ? Number(e.softSkillScore) : null,
    }));
  }

  async getPerformanceVsSalary(departmentId?: string) {
    const whereCollab: Prisma.CollaboratorWhereInput = departmentId
      ? { user: { departmentId } }
      : {};

    const collaborators = await this.prisma.collaborator.findMany({
      where: whereCollab,
      include: {
        user: {
          include: {
            department: { select: { name: true } },
            salaryHistory: { orderBy: { changeDate: 'desc' }, take: 1 },
          },
        },
        evaluations: {
          orderBy: { reviewDate: 'desc' },
          take: 1,
          select: { globalScore: true },
        },
      },
    });

    return collaborators
      .map((c) => ({
        collaboratorId: c.id,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        department: c.user.department?.name,
        latestScore:
          c.evaluations[0]?.globalScore != null
            ? Number(c.evaluations[0].globalScore)
            : null,
        currentSalary:
          c.user.salaryHistory[0]?.newSalary != null
            ? Number(c.user.salaryHistory[0].newSalary)
            : null,
      }))
      .filter((c) => c.latestScore !== null || c.currentSalary !== null);
  }
}
