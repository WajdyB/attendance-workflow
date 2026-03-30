import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationChannel, NotificationStatus } from '@prisma/client';

export type NotifType =
  | 'LEAVE_REQUEST'
  | 'TIMESHEET'
  | 'PROJECT'
  | 'EVALUATION'
  | 'SYSTEM';

/** Title convention: "[TYPE] Human-readable title" */
export function buildTitle(type: NotifType, text: string): string {
  return `[${type}] ${text}`;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Core create ────────────────────────────────────────────────────────────

  async create(recipientId: string, title: string, message: string) {
    try {
      return await this.prisma.notification.create({
        data: {
          recipientId,
          channel: NotificationChannel.IN_APP,
          title,
          message,
        },
      });
    } catch (err) {
      this.logger.warn(`Notification creation failed: ${String(err)}`);
    }
  }

  /** Notify all Admin users */
  async notifyAdmins(title: string, message: string) {
    try {
      const admins = await this.prisma.user.findMany({
        where: { role: { description: { contains: 'Admin', mode: 'insensitive' } } },
        select: { id: true },
      });
      await Promise.allSettled(
        admins.map((a) => this.create(a.id, title, message)),
      );
    } catch (err) {
      this.logger.warn(`Admin notification broadcast failed: ${String(err)}`);
    }
  }

  /** Notify a user's direct manager */
  async notifyManager(collaboratorUserId: string, title: string, message: string) {
    try {
      const collaborator = await this.prisma.collaborator.findUnique({
        where: { id: collaboratorUserId },
        select: { managerId: true },
      });
      if (collaborator?.managerId) {
        await this.create(collaborator.managerId, title, message);
      }
    } catch (err) {
      this.logger.warn(`Manager notification failed: ${String(err)}`);
    }
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  async findByUser(userId: string, limit = 30) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, status: NotificationStatus.UNSEEN },
    });
    return { count };
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  async markSeen(notificationId: string) {
    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { status: NotificationStatus.SEEN },
    });
  }

  async markAllSeen(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, status: NotificationStatus.UNSEEN },
      data: { status: NotificationStatus.SEEN },
    });
    return { success: true };
  }
}
