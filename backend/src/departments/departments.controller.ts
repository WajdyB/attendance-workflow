// src/departments/departments.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { Role } from '../common/enums/role.enum';
import { RolesGuard } from '../common/guards/roles.guard';
import { RequireRoles } from '../common/decorator/roles.decorator';
@Controller('departments')
@UseGuards(RolesGuard)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post('add')
  @RequireRoles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDepartmentDto: CreateDepartmentDto) {
    return this.departmentsService.create(createDepartmentDto);
  }

  @Get()
  async findAll() {
    return this.departmentsService.findAll();
  }

  @Get('stats')
  async getStats() {
    return this.departmentsService.getDepartmentStats();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    // ✅ FIXED: Remove the + operator, id is already a string
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, // ✅ FIXED: Keep as string
    @Body() updateDepartmentDto: Prisma.DepartmentUpdateInput,
  ) {
    return this.departmentsService.update(id, updateDepartmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    // ✅ FIXED: Keep as string
    await this.departmentsService.remove(id);
    return;
  }
}
