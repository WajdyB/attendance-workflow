import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(private prisma: PrismaService) {}

  async create(createRoleDto: CreateRoleDto) {
    try {
      const role = await this.prisma.role.create({
        data: {
          description: createRoleDto.description,
        },
      });
      this.logger.log(`Role created: ${role.id}`);
      return role;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error creating role: ${errorMessage}`);
      throw new BadRequestException('Failed to create role');
    }
  }

  async findAll() {
    try {
      return await this.prisma.role.findMany({
        include: {
          users: true,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching roles: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch roles');
    }
  }

  async findOne(id: string) {
    try {
      const role = await this.prisma.role.findUnique({
        where: { id },
        include: { users: true },
      });

      if (!role) {
        throw new BadRequestException('Role not found');
      }

      return role;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching role ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch role');
    }
  }

  async update(id: string, updateRoleDto: UpdateRoleDto) {
    try {
      const role = await this.prisma.role.update({
        where: { id },
        data: updateRoleDto,
        include: { users: true },
      });
      this.logger.log(`Role updated: ${id}`);
      return role;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating role ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to update role');
    }
  }

  async delete(id: string) {
    try {
      const role = await this.prisma.role.delete({
        where: { id },
      });
      this.logger.log(`Role deleted: ${id}`);
      return role;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deleting role ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to delete role');
    }
  }
}
