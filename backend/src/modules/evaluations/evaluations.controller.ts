import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EvaluationsService } from './evaluations.service';
import { CreateEvaluationDto } from './dto/create-evaluation.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorator/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { EvaluationType } from '@prisma/client';
import { Request } from 'express';

type AuthenticatedRequest = Request & { user?: { id: string; role?: { description: string } } };

@Controller('evaluations')
@UseGuards(RolesGuard)
export class EvaluationsController {
  constructor(private readonly evaluationsService: EvaluationsService) {}

  // ─── Evaluations ──────────────────────────────────────────────────────────────

  @Get()
  async findAll(
    @Query('collaboratorId') collaboratorId?: string,
    @Query('managerId') managerId?: string,
    @Query('type') evaluationType?: EvaluationType,
    @Query('year') year?: string,
  ) {
    return this.evaluationsService.findAll({
      collaboratorId,
      managerId,
      evaluationType,
      year: year ? Number(year) : undefined,
    });
  }

  @Get('reports/departments')
  async getDepartmentStats(@Query('year') year?: string) {
    return this.evaluationsService.getDepartmentStats(year ? Number(year) : undefined);
  }

  @Get('reports/performance-vs-salary')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  async getPerformanceVsSalary(@Query('departmentId') departmentId?: string) {
    return this.evaluationsService.getPerformanceVsSalary(departmentId);
  }

  @Get('collaborator/:collaboratorId')
  async findByCollaborator(
    @Param('collaboratorId', new ParseUUIDPipe()) collaboratorId: string,
  ) {
    return this.evaluationsService.findByCollaborator(collaboratorId);
  }

  @Get('collaborator/:collaboratorId/trend')
  async getCollaboratorTrend(
    @Param('collaboratorId', new ParseUUIDPipe()) collaboratorId: string,
  ) {
    return this.evaluationsService.getCollaboratorTrend(collaboratorId);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.evaluationsService.findOne(id);
  }

  @Post()
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateEvaluationDto) {
    const managerId = (req.user as any)?.id ?? '';
    const isAdmin = [Role.ADMIN].includes((req.user as any)?.roleName);
    return this.evaluationsService.create(managerId, dto, isAdmin);
  }

  @Patch(':id')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: Partial<CreateEvaluationDto>,
  ) {
    const managerId = (req.user as any)?.id ?? '';
    const isAdmin = [Role.ADMIN].includes((req.user as any)?.roleName);
    return this.evaluationsService.update(id, managerId, dto, isAdmin);
  }

  @Delete(':id')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string, @Req() req: AuthenticatedRequest) {
    const managerId = (req.user as any)?.id ?? '';
    const isAdmin = [Role.ADMIN].includes((req.user as any)?.roleName);
    await this.evaluationsService.remove(id, managerId, isAdmin);
  }

  // ─── Salary History ───────────────────────────────────────────────────────────

  @Get('salary/all')
  @RequireRoles(Role.ADMIN)
  async getAllSalaryHistories(@Query('departmentId') departmentId?: string) {
    return this.evaluationsService.getAllSalaryHistories(departmentId);
  }

  @Get('salary/user/:userId')
  async getSalaryHistory(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.evaluationsService.getSalaryHistory(userId);
  }
}
