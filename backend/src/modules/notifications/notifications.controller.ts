import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RolesGuard } from '../../common/guards/roles.guard';

@UseGuards(RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** GET /notifications/user/:userId — list last 30 notifications */
  @Get('user/:userId')
  getByUser(@Param('userId') userId: string) {
    return this.notificationsService.findByUser(userId);
  }

  /** GET /notifications/user/:userId/count — unread count */
  @Get('user/:userId/count')
  getUnreadCount(@Param('userId') userId: string) {
    return this.notificationsService.getUnreadCount(userId);
  }

  /** PATCH /notifications/user/:userId/read-all — mark all seen (must come before :id) */
  @Patch('user/:userId/read-all')
  markAllSeen(@Param('userId') userId: string) {
    return this.notificationsService.markAllSeen(userId);
  }

  /** PATCH /notifications/:id/seen — mark single notification seen */
  @Patch(':id/seen')
  markSeen(@Param('id') id: string) {
    return this.notificationsService.markSeen(id);
  }
}
