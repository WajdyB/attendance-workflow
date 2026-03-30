import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  RequestStatus,
  RequestType,
  LeaveType,
  ApprovalStatus,
  SalaryIncreaseReason,
  Prisma,
} from '@prisma/client';
import { NotificationsService, buildTitle } from '../notifications/notifications.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { DecideRequestDto } from './dto/decide-request.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { Decimal } from '@prisma/client/runtime/library';

// Leave types that deduct from the PTO balance
const BALANCE_AFFECTING_TYPES = new Set<LeaveType>([LeaveType.PTO]);

const REQUEST_INCLUDE = {
  submitter: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      personalEmail: true,
      pictureUrl: true,
      role: { select: { description: true } },
      department: { select: { name: true } },
    },
  },
  manager: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  },
} as const;

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getHolidayDatesForRange(
    start: Date,
    end: Date,
  ): Promise<Set<string>> {
    const holidays = await this.prisma.publicHoliday.findMany({
      where: {
        OR: [
          { year: null }, // recurring
          { year: start.getFullYear() },
          { year: end.getFullYear() },
        ],
      },
    });

    const holidaySet = new Set<string>();
    for (const h of holidays) {
      const d = new Date(h.date);
      if (h.year === null) {
        // recurring: match month+day for every year in range
        for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
          holidaySet.add(`${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
        }
      } else {
        holidaySet.add(d.toISOString().split('T')[0]);
      }
    }
    return holidaySet;
  }

  private calculateWorkingDays(
    startDate: Date,
    endDate: Date,
    holidaySet: Set<string>,
  ): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        const key = current.toISOString().split('T')[0];
        if (!holidaySet.has(key)) count++;
      }
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  private async getOrCreateBalance(userId: string, year: number) {
    const existing = await this.prisma.leaveBalance.findUnique({
      where: { userId_year: { userId, year } },
    });
    if (existing) return existing;

    return this.prisma.leaveBalance.create({
      data: {
        userId,
        year,
        allocatedDays: new Decimal(18),
        usedDays: new Decimal(0),
        pendingDays: new Decimal(0),
        remainingDays: new Decimal(18),
      },
    });
  }

  // ─── CRUD ───────────────────────────────────────────────────────────────────

  async createDraft(dto: CreateRequestDto) {
    let workingDaysCount: number | undefined;

    if (
      dto.requestType === RequestType.LEAVE &&
      dto.leaveStartDate &&
      dto.leaveEndDate
    ) {
      const start = new Date(dto.leaveStartDate);
      const end = new Date(dto.leaveEndDate);
      if (start > end) {
        throw new BadRequestException('Start date must be before end date');
      }
      const holidaySet = await this.getHolidayDatesForRange(start, end);
      workingDaysCount = this.calculateWorkingDays(start, end, holidaySet);
    }

    const leavePaid =
      dto.leaveType !== undefined
        ? dto.leaveType !== LeaveType.UNPAID
        : undefined;

    const request = await this.prisma.request.create({
      data: {
        submittedBy: dto.submittedBy,
        requestType: dto.requestType,
        leaveType: dto.leaveType,
        status: RequestStatus.DRAFT,
        comment: dto.comment,
        attachmentUrl: dto.attachmentUrl,
        leaveStartDate: dto.leaveStartDate
          ? new Date(dto.leaveStartDate)
          : undefined,
        leaveEndDate: dto.leaveEndDate ? new Date(dto.leaveEndDate) : undefined,
        workingDaysCount,
        leavePaid,
      },
      include: REQUEST_INCLUDE,
    });

    this.logger.log(`Draft request created: ${request.id}`);
    return request;
  }

  async updateDraft(
    id: string,
    dto: Partial<CreateRequestDto>,
  ) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException('Only draft requests can be edited');
    }

    let workingDaysCount = request.workingDaysCount;

    const startDate = dto.leaveStartDate
      ? new Date(dto.leaveStartDate)
      : request.leaveStartDate
        ? new Date(request.leaveStartDate)
        : null;
    const endDate = dto.leaveEndDate
      ? new Date(dto.leaveEndDate)
      : request.leaveEndDate
        ? new Date(request.leaveEndDate)
        : null;

    if (startDate && endDate) {
      if (startDate > endDate)
        throw new BadRequestException('Start date must be before end date');
      const holidaySet = await this.getHolidayDatesForRange(startDate, endDate);
      workingDaysCount = this.calculateWorkingDays(
        startDate,
        endDate,
        holidaySet,
      );
    }

    const leaveType = dto.leaveType ?? request.leaveType ?? undefined;
    const leavePaid =
      leaveType !== undefined ? leaveType !== LeaveType.UNPAID : request.leavePaid ?? undefined;

    return this.prisma.request.update({
      where: { id },
      data: {
        leaveType: leaveType ?? undefined,
        comment: dto.comment ?? request.comment ?? undefined,
        attachmentUrl: dto.attachmentUrl ?? request.attachmentUrl ?? undefined,
        leaveStartDate: startDate ?? undefined,
        leaveEndDate: endDate ?? undefined,
        workingDaysCount: workingDaysCount ?? undefined,
        leavePaid,
      },
      include: REQUEST_INCLUDE,
    });
  }

  async submit(id: string) {
    const request = await this.prisma.request.findUnique({
      where: { id },
      include: {
        submitter: {
          include: { collaborator: { include: { manager: true } } },
        },
      },
    });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.DRAFT) {
      throw new BadRequestException('Only draft requests can be submitted');
    }

    if (request.requestType === RequestType.LEAVE) {
      if (!request.leaveStartDate || !request.leaveEndDate) {
        throw new BadRequestException(
          'Leave dates are required before submission',
        );
      }
      if (!request.leaveType) {
        throw new BadRequestException('Leave type is required before submission');
      }
    }

    // Deduct from balance if PTO
    if (
      request.requestType === RequestType.LEAVE &&
      request.leaveType &&
      BALANCE_AFFECTING_TYPES.has(request.leaveType) &&
      request.workingDaysCount
    ) {
      const year = new Date(request.leaveStartDate!).getFullYear();
      const balance = await this.getOrCreateBalance(request.submittedBy, year);
      const days = new Decimal(request.workingDaysCount);

      if (balance.remainingDays.lt(days)) {
        throw new BadRequestException(
          `Insufficient leave balance. Remaining: ${balance.remainingDays} days, Requested: ${days} days`,
        );
      }

      await this.prisma.leaveBalance.update({
        where: { id: balance.id },
        data: {
          pendingDays: balance.pendingDays.add(days),
          remainingDays: balance.remainingDays.sub(days),
        },
      });
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: { status: RequestStatus.PENDING },
      include: REQUEST_INCLUDE,
    });

    // Notify manager + admins
    const managerId = request.submitter.collaborator?.managerId;
    const submitterName = `${request.submitter.firstName} ${request.submitter.lastName}`;
    const leaveLabel = request.leaveType ?? 'leave';
    if (managerId) {
      await this.notifications.create(
        managerId,
        buildTitle('LEAVE_REQUEST', 'Nouvelle demande de congé'),
        `${submitterName} a soumis une demande de congé (${leaveLabel}) en attente de votre approbation.`,
      );
    }
    await this.notifications.notifyAdmins(
      buildTitle('LEAVE_REQUEST', 'Nouvelle demande de congé'),
      `${submitterName} a soumis une demande de congé (${leaveLabel}).`,
    );

    this.logger.log(`Request ${id} submitted for approval`);
    return updated;
  }

  async approve(id: string, dto: DecideRequestDto) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    // Allow admins to approve even if they are not in the manager table
    const isAdmin = await this.isAdminUser(dto.managerId);
    const managerRecord = await this.prisma.manager.findUnique({
      where: { id: dto.managerId },
      include: { collaborators: { select: { id: true } } },
    });
    if (!isAdmin && !managerRecord) {
      throw new NotFoundException('Manager not found');
    }
    // Managers can only approve requests from their own supervisees
    if (!isAdmin && managerRecord) {
      const superviseeIds = new Set(managerRecord.collaborators.map((c) => c.id));
      if (!superviseeIds.has(request.submittedBy)) {
        throw new ForbiddenException(
          'You can only approve requests from members of your team',
        );
      }
    }
    // decidedBy FK points to the Manager table — store null for admins
    const decidedBy = managerRecord ? dto.managerId : null;

    // Move pending → used in balance
    if (
      request.requestType === RequestType.LEAVE &&
      request.leaveType &&
      BALANCE_AFFECTING_TYPES.has(request.leaveType) &&
      request.workingDaysCount
    ) {
      const year = new Date(request.leaveStartDate!).getFullYear();
      const balance = await this.prisma.leaveBalance.findUnique({
        where: { userId_year: { userId: request.submittedBy, year } },
      });
      if (balance) {
        const days = new Decimal(request.workingDaysCount);
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: Decimal.max(
              new Decimal(0),
              balance.pendingDays.sub(days),
            ),
            usedDays: balance.usedDays.add(days),
          },
        });
      }
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        decidedBy,
        decisionComment: dto.decisionComment,
      },
      include: REQUEST_INCLUDE,
    });

    // For AUGMENTATION requests: create a SalaryHistory record on approval
    if (
      request.requestType === RequestType.AUGMENTATION &&
      request.proposedSalary &&
      request.effectiveDate
    ) {
      const latestSalary = await this.prisma.salaryHistory.findFirst({
        where: { userId: request.submittedBy },
        orderBy: { changeDate: 'desc' },
      });

      // Fallback: try to get current salary from active contract
      let currentSalary = latestSalary?.newSalary;
      if (!currentSalary) {
        const contract = await this.prisma.contract.findFirst({
          where: { userId: request.submittedBy },
          orderBy: { startDate: 'desc' },
        });
        currentSalary = contract?.baseSalary ?? new Decimal(0);
      }

      await this.prisma.salaryHistory.create({
        data: {
          userId: request.submittedBy,
          validatedBy: decidedBy ?? dto.managerId,
          oldSalary: currentSalary,
          newSalary: request.proposedSalary,
          changeDate: request.effectiveDate,
          reason: SalaryIncreaseReason.PERFORMANCE,
          status: ApprovalStatus.VALIDATED,
          decisionComment: dto.decisionComment ?? null,
        },
      });

      this.logger.log(
        `SalaryHistory created for user ${request.submittedBy} on augmentation approval`,
      );
    }

    const isLeave = request.requestType === RequestType.LEAVE;
    await this.notifications.create(
      request.submittedBy,
      buildTitle('LEAVE_REQUEST', isLeave ? 'Demande de congé approuvée' : 'Augmentation salariale approuvée'),
      isLeave
        ? `Votre demande de congé a été approuvée.${dto.decisionComment ? ` Commentaire : ${dto.decisionComment}` : ''}`
        : `Votre demande d'augmentation salariale a été approuvée.${dto.decisionComment ? ` Commentaire : ${dto.decisionComment}` : ''}`,
    );

    this.logger.log(`Request ${id} approved by manager ${dto.managerId}`);
    return updated;
  }

  async reject(id: string, dto: DecideRequestDto) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    const isAdmin = await this.isAdminUser(dto.managerId);
    const managerRecord = await this.prisma.manager.findUnique({
      where: { id: dto.managerId },
      include: { collaborators: { select: { id: true } } },
    });
    if (!isAdmin && !managerRecord) {
      throw new NotFoundException('Manager not found');
    }
    // Managers can only reject requests from their own supervisees
    if (!isAdmin && managerRecord) {
      const superviseeIds = new Set(managerRecord.collaborators.map((c) => c.id));
      if (!superviseeIds.has(request.submittedBy)) {
        throw new ForbiddenException(
          'You can only reject requests from members of your team',
        );
      }
    }
    const decidedBy = managerRecord ? dto.managerId : null;

    // Restore balance
    if (
      request.requestType === RequestType.LEAVE &&
      request.leaveType &&
      BALANCE_AFFECTING_TYPES.has(request.leaveType) &&
      request.workingDaysCount
    ) {
      const year = new Date(request.leaveStartDate!).getFullYear();
      const balance = await this.prisma.leaveBalance.findUnique({
        where: { userId_year: { userId: request.submittedBy, year } },
      });
      if (balance) {
        const days = new Decimal(request.workingDaysCount);
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: Decimal.max(
              new Decimal(0),
              balance.pendingDays.sub(days),
            ),
            remainingDays: balance.remainingDays.add(days),
          },
        });
      }
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        decidedBy,
        decisionComment: dto.decisionComment,
      },
      include: REQUEST_INCLUDE,
    });

    await this.notifications.create(
      request.submittedBy,
      buildTitle('LEAVE_REQUEST', 'Demande de congé refusée'),
      `Votre demande de congé a été refusée.${dto.decisionComment ? ` Raison : ${dto.decisionComment}` : ''}`,
    );

    this.logger.log(`Request ${id} rejected by manager ${dto.managerId}`);
    return updated;
  }

  private async isAdminUser(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { select: { description: true } } },
    });
    return (
      user?.role?.description?.toLowerCase().includes('admin') ?? false
    );
  }

  async cancel(id: string, userId: string) {
    const request = await this.prisma.request.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Request not found');

    const isAdmin = await this.isAdminUser(userId);

    if (!isAdmin && request.submittedBy !== userId) {
      throw new ForbiddenException('You can only cancel your own requests');
    }

    if (
      request.status !== RequestStatus.DRAFT &&
      request.status !== RequestStatus.PENDING
    ) {
      throw new BadRequestException(
        'Only draft or pending requests can be cancelled',
      );
    }

    // Restore balance if it was pending
    if (
      request.status === RequestStatus.PENDING &&
      request.requestType === RequestType.LEAVE &&
      request.leaveType &&
      BALANCE_AFFECTING_TYPES.has(request.leaveType) &&
      request.workingDaysCount
    ) {
      const year = new Date(request.leaveStartDate!).getFullYear();
      const balance = await this.prisma.leaveBalance.findUnique({
        where: { userId_year: { userId: request.submittedBy, year } },
      });
      if (balance) {
        const days = new Decimal(request.workingDaysCount);
        await this.prisma.leaveBalance.update({
          where: { id: balance.id },
          data: {
            pendingDays: Decimal.max(
              new Decimal(0),
              balance.pendingDays.sub(days),
            ),
            remainingDays: balance.remainingDays.add(days),
          },
        });
      }
    }

    const updated = await this.prisma.request.update({
      where: { id },
      data: { status: RequestStatus.CANCELLED },
      include: REQUEST_INCLUDE,
    });

    // Notify submitter when an admin cancels their request
    if (isAdmin && request.submittedBy !== userId) {
      await this.notifications.create(
        request.submittedBy,
        buildTitle('LEAVE_REQUEST', 'Demande de congé annulée'),
        `Votre demande de congé a été annulée par un administrateur.`,
      );
    }

    this.logger.log(`Request ${id} cancelled by user ${userId}`);
    return updated;
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findByUser(userId: string) {
    return this.prisma.request.findMany({
      where: { submittedBy: userId },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPendingForManager(managerId: string) {
    const isAdmin = await this.isAdminUser(managerId);

    let collaboratorIds: string[];

    if (isAdmin) {
      // Admin sees all pending requests
      const allCollaborators = await this.prisma.collaborator.findMany({
        select: { id: true },
      });
      collaboratorIds = allCollaborators.map((c) => c.id);
    } else {
      const manager = await this.prisma.manager.findUnique({
        where: { id: managerId },
        include: { collaborators: { select: { id: true } } },
      });
      if (!manager) throw new NotFoundException('Manager not found');
      collaboratorIds = manager.collaborators.map((c) => c.id);
    }

    return this.prisma.request.findMany({
      where: {
        submittedBy: { in: collaboratorIds },
        status: RequestStatus.PENDING,
      },
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'asc' },
    });
  }

  async findAllForAdmin(status?: RequestStatus, type?: RequestType) {
    const where: Prisma.RequestWhereInput = {};
    if (status) where.status = status;
    if (type) where.requestType = type;

    return this.prisma.request.findMany({
      where,
      include: REQUEST_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLeaveBalance(userId: string, year: number) {
    return this.getOrCreateBalance(userId, year);
  }

  async updateLeaveBalance(userId: string, dto: UpdateBalanceDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const { allocatedDays, year } = dto;
    const existing = await this.prisma.leaveBalance.findUnique({
      where: { userId_year: { userId, year } },
    });

    const allocated = new Decimal(allocatedDays);
    const used = existing ? existing.usedDays : new Decimal(0);
    const pending = existing ? existing.pendingDays : new Decimal(0);
    const remaining = allocated.sub(used).sub(pending);

    if (existing) {
      return this.prisma.leaveBalance.update({
        where: { id: existing.id },
        data: {
          allocatedDays: allocated,
          remainingDays: Decimal.max(new Decimal(0), remaining),
        },
      });
    }

    return this.prisma.leaveBalance.create({
      data: {
        userId,
        year,
        allocatedDays: allocated,
        usedDays: new Decimal(0),
        pendingDays: new Decimal(0),
        remainingDays: allocated,
      },
    });
  }

  async getAllBalances(year: number) {
    return this.prisma.leaveBalance.findMany({
      where: { year },
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
      orderBy: [{ user: { lastName: 'asc' } }],
    });
  }

  async getCalendarData(month: number, year: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [requests, holidays] = await Promise.all([
      this.prisma.request.findMany({
        where: {
          requestType: RequestType.LEAVE,
          status: { in: [RequestStatus.APPROVED, RequestStatus.PENDING] },
          OR: [
            { leaveStartDate: { lte: end }, leaveEndDate: { gte: start } },
          ],
        },
        include: {
          submitter: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              department: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.publicHoliday.findMany({
        where: {
          OR: [{ year: null }, { year }],
          date: { gte: start, lte: end },
        },
      }),
    ]);

    return { requests, holidays };
  }

  async getNotifications(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  async markNotificationSeen(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: 'SEEN' },
    });
  }

  async getStats(year: number) {
    const [total, approved, pending, rejected] = await Promise.all([
      this.prisma.request.count({
        where: { requestType: RequestType.LEAVE, leaveStartDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.LEAVE, status: RequestStatus.APPROVED, leaveStartDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.LEAVE, status: RequestStatus.PENDING },
      }),
      this.prisma.request.count({
        where: { requestType: RequestType.LEAVE, status: RequestStatus.REJECTED, leaveStartDate: { gte: new Date(year, 0, 1), lt: new Date(year + 1, 0, 1) } },
      }),
    ]);

    return { year, total, approved, pending, rejected };
  }
}
