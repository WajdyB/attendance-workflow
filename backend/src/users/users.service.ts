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

  async create(createUserDto: CreateUserDto, avatarFile?: Express.Multer.File) {
    let authUserId: string | null = null;
    let avatarUrl: string | null = null;

    try {
      const { personalEmail, password, roleId, ...profileData } = createUserDto; // 👈 Removed accountStatus

      // Check for existing user
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

      // Resolve role
      let resolvedRoleId = roleId;
      if (!resolvedRoleId) {
        const defaultRole = await this.prisma.role.findFirst({
          where: { description: 'USER' },
          select: { id: true },
        });

        if (!defaultRole) {
          throw new BadRequestException('No default role found');
        }
        resolvedRoleId = defaultRole.id;
      }

      // Create user in Supabase Auth
      const { data, error } =
        await this.supabaseService.adminClient.auth.admin.createUser({
          email: personalEmail,
          password,
          email_confirm: true,
        });

      if (error || !data.user) {
        throw new BadRequestException(
          error?.message || 'Failed to create auth user',
        );
      }

      const authUser = data.user;
      authUserId = authUser.id;

      // Handle avatar upload if file exists
      if (avatarFile) {
        try {
          const fileName = `avatars/${authUser.id}/${Date.now()}-${avatarFile.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;

          const { error: uploadError } =
            await this.supabaseService.adminClient.storage
              .from('avatars')
              .upload(fileName, avatarFile.buffer, {
                contentType: avatarFile.mimetype,
                upsert: true,
              });

          if (!uploadError) {
            const {
              data: { publicUrl },
            } = this.supabaseService.adminClient.storage
              .from('avatars')
              .getPublicUrl(fileName);

            avatarUrl = publicUrl;
            this.logger.log(`Avatar uploaded successfully: ${avatarUrl}`);
          } else {
            this.logger.error(`Avatar upload failed: ${uploadError.message}`);
          }
        } catch (uploadError) {
          const errorMessage =
            uploadError instanceof Error
              ? uploadError.message
              : 'Unknown upload error';
          this.logger.error(`Avatar upload exception: ${errorMessage}`);
        }
      }

      // Create user in database - WITHOUT accountStatus
      // In users.service.ts - create method
      const user = await this.prisma.user.create({
        data: {
          authId: authUser.id,
          personalEmail,
          roleId: resolvedRoleId,
          avatarUrl,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          birthdate: profileData.birthdate,
          phone: profileData.phone,
          address: profileData.address,
          workEmail: profileData.workEmail,
          jobTitle: profileData.jobTitle,
          bankName: profileData.bankName,
          cnssNumber: profileData.cnssNumber,
          departmentId: profileData.departmentId,
          accountStatus: 'ACTIVE',
        },
        include: {
          role: true,
          documents: true,
          department: true,
        },
      });

      this.logger.log(
        `User created successfully: ${user.id} ${avatarUrl ? 'with avatar' : 'without avatar'}`,
      );

      return {
        message: 'User created successfully',
        user,
      };
    } catch (error) {
      // Cleanup on failure
      if (authUserId) {
        try {
          await this.supabaseService.adminClient.auth.admin.deleteUser(
            authUserId,
          );
        } catch (cleanupError) {
          const cleanupMessage =
            cleanupError instanceof Error
              ? cleanupError.message
              : 'Unknown cleanup error';
          this.logger.error(`Failed to cleanup auth user: ${cleanupMessage}`);
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';

      this.logger.error(`User creation failed: ${errorMessage}`);
      throw new BadRequestException('Failed to create user');
    }
  }

  async findAll() {
    try {
      return await this.prisma.user.findMany({
        include: { role: true, documents: true, department: true },
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
        include: { role: true, documents: true, department: true },
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

  async updateUser(userId: string, updateData: any) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
        include: { role: true, documents: true, department: true },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating user ${userId}: ${errorMessage}`);
      throw new BadRequestException('Failed to update user');
    }
  }
}
