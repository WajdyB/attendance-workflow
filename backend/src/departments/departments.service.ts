// src/departments/departments.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createDepartmentDto: CreateDepartmentDto) {
    try {
      // Check if department with same code already exists
      const existingDept = await this.prisma.department.findUnique({
        where: { code: createDepartmentDto.code },
      });

      if (existingDept) {
        throw new BadRequestException(
          `Department with code ${createDepartmentDto.code} already exists`,
        );
      }

      const department = await this.prisma.department.create({
        data: createDepartmentDto,
      });

      this.logger.log(
        `Department created: ${department.name} (${department.code})`,
      );

      return {
        message: 'Department created successfully',
        department,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // ✅ FIXED: Type check for error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create department: ${errorMessage}`);
      throw new BadRequestException('Failed to create department');
    }
  }

  async findAll() {
    try {
      const departments = await this.prisma.department.findMany({
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      // Transform to include user count
      return departments.map((dept: { users: string | any[] }) => ({
        ...dept,
        userCount: dept.users.length,
        users: undefined, // Remove users array from response
      }));
    } catch (error) {
      // ✅ FIXED: Type check for error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch departments: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch departments');
    }
  }

  async findOne(id: string) {
    try {
      const department = await this.prisma.department.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              workEmail: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!department) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }

      return {
        ...department,
        userCount: department.users.length,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      // ✅ FIXED: Type check for error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch department ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch department');
    }
  }

  async update(id: string, updateDepartmentDto: any) {
    try {
      // Check if department exists
      const existingDept = await this.prisma.department.findUnique({
        where: { id },
      });

      if (!existingDept) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }

      // If code is being updated, check it's not taken
      if (
        updateDepartmentDto.code &&
        updateDepartmentDto.code !== existingDept.code
      ) {
        const codeTaken = await this.prisma.department.findUnique({
          where: { code: updateDepartmentDto.code },
        });

        if (codeTaken) {
          throw new BadRequestException(
            `Code ${updateDepartmentDto.code} is already in use`,
          );
        }
      }

      const department = await this.prisma.department.update({
        where: { id },
        data: updateDepartmentDto,
      });

      this.logger.log(
        `Department updated: ${department.name} (${department.code})`,
      );

      return {
        message: 'Department updated successfully',
        department,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // ✅ FIXED: Type check for error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update department ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to update department');
    }
  }

  async remove(id: string) {
    try {
      // Check if department exists
      const department = await this.prisma.department.findUnique({
        where: { id },
        include: {
          users: {
            select: { id: true },
          },
        },
      });

      if (!department) {
        throw new NotFoundException(`Department with ID ${id} not found`);
      }

      // Check if department has users
      if (department.users.length > 0) {
        throw new BadRequestException(
          `Cannot delete department with ${department.users.length} assigned users. Please reassign users first.`,
        );
      }

      await this.prisma.department.delete({
        where: { id },
      });

      this.logger.log(
        `Department deleted: ${department.name} (${department.code})`,
      );

      return {
        message: 'Department deleted successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      // ✅ FIXED: Type check for error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete department ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to delete department');
    }
  }

  async getDepartmentStats() {
    try {
      const stats = await this.prisma.department.aggregate({
        _count: {
          _all: true,
        },
      });

      const departmentsWithUsers = await this.prisma.department.findMany({
        select: {
          id: true,
          name: true,
          code: true,
          _count: {
            select: { users: true },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      return {
        totalDepartments: stats._count._all,
        departments: departmentsWithUsers.map((dept) => ({
          id: dept.id,
          name: dept.name,
          code: dept.code,
          userCount: dept._count.users,
        })),
      };
    } catch (error) {
      // ✅ FIXED: Type check for error
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get department stats: ${errorMessage}`);
      throw new BadRequestException('Failed to get department statistics');
    }
  }
}
