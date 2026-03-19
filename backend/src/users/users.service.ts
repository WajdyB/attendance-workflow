// src/users/users.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { Role } from 'src/common/enums/role.enum';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    let authUserId: string | null = null;

    try {
      const { personalEmail, password, roleId, accountStatus, ...profileData } =
        createUserDto;

      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { personalEmail },
            { workEmail: profileData.workEmail },
            { cnssNumber: profileData.cnssNumber },
          ],
        },
        select: {
          personalEmail: true,
          workEmail: true,
          cnssNumber: true,
        },
      });

      if (existingUser) {
        throw new BadRequestException(
          'User with same personal email, work email, or CNSS number already exists',
        );
      }

      let resolvedRoleId = roleId;

      if (resolvedRoleId) {
        const roleExists = await this.prisma.role.findUnique({
          where: { id: resolvedRoleId },
          select: { id: true },
        });

        if (!roleExists) {
          throw new BadRequestException('Invalid roleId provided');
        }
      } else {
        const defaultRole = await this.prisma.role.findUnique({
          where: { description: Role.USER },
          select: { id: true },
        });

        if (!defaultRole) {
          throw new BadRequestException(
            'Role is required: provide roleId or create USER role first',
          );
        }

        resolvedRoleId = defaultRole.id;
      }

      // Create user in Supabase Auth with admin privileges
      const { data, error } =
        await this.supabaseService.adminClient.auth.admin.createUser({
          email: personalEmail,
          password,
          email_confirm: true,
        });

      if (error) {
        this.logger.error(`Supabase signup error: ${error.message}`);
        throw new BadRequestException(error.message);
      }

      if (!data.user) {
        this.logger.error('User creation failed in Supabase');
        throw new BadRequestException('User creation failed in Supabase');
      }

      const authUser = data.user;
      authUserId = authUser.id;

      // Create profile in database
      let user;

      try {
        user = await this.prisma.user.create({
          data: {
            authId: authUser.id,
            personalEmail,
            roleId: resolvedRoleId,
            accountStatus: accountStatus || 'ACTIVE',
            ...profileData,
          },
          include: { role: true },
        });
      } catch (dbError) {
        if (authUserId) {
          const { error: deleteError } =
            await this.supabaseService.adminClient.auth.admin.deleteUser(
              authUserId,
            );

          if (deleteError) {
            this.logger.error(
              `Failed to rollback Supabase user ${authUserId}: ${deleteError.message}`,
            );
          }
        }

        if (
          dbError instanceof Prisma.PrismaClientKnownRequestError &&
          dbError.code === 'P2002'
        ) {
          throw new BadRequestException(
            'Duplicate user data: personalEmail, workEmail, or cnssNumber already exists',
          );
        }

        throw dbError;
      }

      this.logger.log(`User created successfully: ${user.id}`);

      return {
        message: 'User created successfully',
        user,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unexpected error during user creation: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll() {
    try {
      return await this.prisma.user.findMany({
        include: { role: true },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching users: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch users');
    }
  }

  async findOne(id: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: { role: true },
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      return user;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching user ${id}: ${errorMessage}`);
      throw new BadRequestException('Failed to fetch user');
    }
  }
}
