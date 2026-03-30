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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { RequireRoles } from '../../common/decorator/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { ProjectStatus } from '@prisma/client';

@Controller('projects')
@UseGuards(RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  // ─── CRUD ────────────────────────────────────────────────────────────────────

  @Get()
  async findAll(@Query('status') status?: ProjectStatus) {
    return this.projectsService.findAll(status);
  }

  // ─── Reports (must be before :id to avoid route conflicts) ──────────────────

  @Get('reports/overview')
  async getOverviewReport(
    @Query('year') year: string,
    @Query('month') month?: string,
  ) {
    return this.projectsService.getOverviewReport(
      Number(year),
      month ? Number(month) : undefined,
    );
  }

  @Get('reports/resources')
  async getResourceAllocation(
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.projectsService.getResourceAllocation(Number(year), Number(month));
  }

  @Get('user/:userId')
  async findByUser(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.projectsService.findByUser(userId);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @RequireRoles(Role.ADMIN)
  async create(@Body() dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: Partial<CreateProjectDto>,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  @RequireRoles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.projectsService.remove(id);
  }

  // ─── Team ─────────────────────────────────────────────────────────────────────

  @Get(':id/team')
  async getTeam(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.getTeam(id);
  }

  @Post(':id/team')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  async assignMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: AssignMemberDto,
  ) {
    return this.projectsService.assignMember(id, dto);
  }

  @Delete(':id/team/:collaboratorId')
  @RequireRoles(Role.ADMIN, Role.MANAGER)
  async removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('collaboratorId', new ParseUUIDPipe()) collaboratorId: string,
  ) {
    return this.projectsService.removeMember(id, collaboratorId);
  }

  // ─── Reports ─────────────────────────────────────────────────────────────────

  @Get(':id/hours')
  async getProjectHours(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.projectsService.getProjectHours(
      id,
      year ? Number(year) : undefined,
      month ? Number(month) : undefined,
    );
  }

}
