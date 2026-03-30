import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { DecideRequestDto } from './dto/decide-request.dto';
import { UpdateBalanceDto } from './dto/update-balance.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorator/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { RequestStatus, RequestType } from '@prisma/client';

@Controller('requests')
@UseGuards(RolesGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  // ─── Request lifecycle ───────────────────────────────────────────────────────

  @Post()
  async createDraft(@Body() dto: CreateRequestDto) {
    return this.requestsService.createDraft(dto);
  }

  @Patch(':id')
  async updateDraft(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Partial<CreateRequestDto>,
  ) {
    return this.requestsService.updateDraft(id, dto);
  }

  @Post(':id/submit')
  async submit(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.requestsService.submit(id);
  }

  @Post(':id/approve')
  @RequireRoles(Role.MANAGER, Role.ADMIN)
  async approve(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DecideRequestDto,
  ) {
    return this.requestsService.approve(id, dto);
  }

  @Post(':id/reject')
  @RequireRoles(Role.MANAGER, Role.ADMIN)
  async reject(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: DecideRequestDto,
  ) {
    return this.requestsService.reject(id, dto);
  }

  @Post(':id/cancel')
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.requestsService.cancel(id, userId);
  }

  // ─── Queries ─────────────────────────────────────────────────────────────────

  @Get('user/:userId')
  async findByUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.requestsService.findByUser(userId);
  }

  @Get('manager/:managerId/pending')
  @RequireRoles(Role.MANAGER, Role.ADMIN)
  async findPendingForManager(
    @Param('managerId', new ParseUUIDPipe()) managerId: string,
  ) {
    return this.requestsService.findPendingForManager(managerId);
  }

  @Get('admin/all')
  @RequireRoles(Role.ADMIN)
  async findAllForAdmin(
    @Query('status') status?: RequestStatus,
    @Query('type') type?: RequestType,
  ) {
    return this.requestsService.findAllForAdmin(status, type);
  }

  // ─── Calendar ────────────────────────────────────────────────────────────────

  @Get('calendar')
  async getCalendarData(
    @Query('month', new ParseIntPipe()) month: number,
    @Query('year', new ParseIntPipe()) year: number,
  ) {
    return this.requestsService.getCalendarData(month, year);
  }

  // ─── Leave balance ───────────────────────────────────────────────────────────

  @Get('balance/:userId')
  async getLeaveBalance(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Query('year', new ParseIntPipe()) year: number,
  ) {
    return this.requestsService.getLeaveBalance(userId, year);
  }

  @Patch('balance/:userId')
  @RequireRoles(Role.ADMIN)
  async updateLeaveBalance(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @Body() dto: UpdateBalanceDto,
  ) {
    return this.requestsService.updateLeaveBalance(userId, dto);
  }

  @Get('balance')
  @RequireRoles(Role.ADMIN)
  async getAllBalances(@Query('year', new ParseIntPipe()) year: number) {
    return this.requestsService.getAllBalances(year);
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  @Get('stats')
  @RequireRoles(Role.ADMIN)
  async getStats(@Query('year', new ParseIntPipe()) year: number) {
    return this.requestsService.getStats(year);
  }

  // ─── Notifications ───────────────────────────────────────────────────────────

  @Get('notifications/:userId')
  async getNotifications(
    @Param('userId', new ParseUUIDPipe()) userId: string,
  ) {
    return this.requestsService.getNotifications(userId);
  }

  @Patch('notifications/:id/seen')
  async markNotificationSeen(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.requestsService.markNotificationSeen(id);
  }
}
