import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';

@Injectable()
export class ContractsService {
  private readonly logger = new Logger(ContractsService.name);

  constructor(private prisma: PrismaService) {}

  async create(createContractDto: CreateContractDto) {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: createContractDto.userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const contract = await this.prisma.contract.create({
        data: {
          userId: createContractDto.userId,
          contractType: createContractDto.contractType,
          startDate: new Date(createContractDto.startDate),
          endDate: createContractDto.endDate
            ? new Date(createContractDto.endDate)
            : null,
          weeklyHours: createContractDto.weeklyHours
            ? new Decimal(createContractDto.weeklyHours)
            : null,
          baseSalary: createContractDto.baseSalary
            ? new Decimal(createContractDto.baseSalary)
            : null,
          netSalary: createContractDto.netSalary
            ? new Decimal(createContractDto.netSalary)
            : null,
          bonuses: createContractDto.bonuses
            ? new Decimal(createContractDto.bonuses)
            : null,
          benefitsInKind: createContractDto.benefitsInKind || null,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
            },
          },
        },
      });

      this.logger.log(
        `Contract created: ${contract.id} for user ${createContractDto.userId}`,
      );

      return {
        message: 'Contract created successfully',
        contract,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create contract: ${errorMessage}`);
      throw new BadRequestException('Failed to create contract');
    }
  }

  async findAll() {
    try {
      const contracts = await this.prisma.contract.findMany({
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              workEmail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.serializeForResponse(contracts);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch contracts: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch contracts');
    }
  }

  async findOne(id: string) {
    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
              workEmail: true,
              department: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      });

      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      return this.serializeForResponse(contract);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch contract ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch contract');
    }
  }

  async findByUserId(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const contracts = await this.prisma.contract.findMany({
        where: { userId },
        orderBy: { startDate: 'desc' },
      });

      return this.serializeForResponse(contracts);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to fetch contracts for user ${userId}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to fetch contracts');
    }
  }

  async update(id: string, updateContractDto: UpdateContractDto) {
    try {
      const existing = await this.prisma.contract.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundException('Contract not found');
      }

      const updateData: Prisma.ContractUpdateInput = {};

      if (updateContractDto.contractType) {
        updateData.contractType = updateContractDto.contractType;
      }
      if (updateContractDto.startDate) {
        updateData.startDate = new Date(updateContractDto.startDate);
      }
      if (updateContractDto.endDate !== undefined) {
        updateData.endDate = updateContractDto.endDate
          ? new Date(updateContractDto.endDate)
          : null;
      }
      if (updateContractDto.weeklyHours !== undefined) {
        updateData.weeklyHours = updateContractDto.weeklyHours
          ? new Decimal(updateContractDto.weeklyHours)
          : null;
      }
      if (updateContractDto.baseSalary !== undefined) {
        updateData.baseSalary = updateContractDto.baseSalary
          ? new Decimal(updateContractDto.baseSalary)
          : null;
      }
      if (updateContractDto.netSalary !== undefined) {
        updateData.netSalary = updateContractDto.netSalary
          ? new Decimal(updateContractDto.netSalary)
          : null;
      }
      if (updateContractDto.bonuses !== undefined) {
        updateData.bonuses = updateContractDto.bonuses
          ? new Decimal(updateContractDto.bonuses)
          : null;
      }
      if (updateContractDto.benefitsInKind !== undefined) {
        updateData.benefitsInKind = updateContractDto.benefitsInKind || null;
      }

      const contract = await this.prisma.contract.update({
        where: { id },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              jobTitle: true,
            },
          },
        },
      });

      this.logger.log(`Contract updated: ${id}`);

      return {
        message: 'Contract updated successfully',
        contract,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update contract ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to update contract');
    }
  }

  async delete(id: string) {
    try {
      const contract = await this.prisma.contract.findUnique({
        where: { id },
        select: { id: true, userId: true },
      });

      if (!contract) {
        throw new NotFoundException('Contract not found');
      }

      await this.prisma.contract.delete({
        where: { id },
      });

      this.logger.log(`Contract deleted: ${id}`);

      return {
        message: 'Contract deleted successfully',
        id,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete contract ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to delete contract');
    }
  }

  private serializeForResponse<T>(payload: T): T {
    return this.convertBigInt(payload) as T;
  }

  private convertBigInt(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map((entry) => this.convertBigInt(entry));
    }

    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
          key,
          this.convertBigInt(entry),
        ]),
      );
    }

    return value;
  }
}
