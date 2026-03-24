import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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
      const { personalEmail, password, roleId, ...profileData } = createUserDto;

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
          where: { description: 'Collaborator' },
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

      const normalizedBirthdate = this.normalizeBirthdate(
        profileData.birthdate,
      );

      const user = await this.prisma.user.create({
        data: {
          id: authUser.id,
          personalEmail,
          roleId: resolvedRoleId,
          firstName: profileData.firstName,
          lastName: profileData.lastName,
          birthdate: normalizedBirthdate,
          phone: profileData.phone,
          phoneFixed: profileData.phoneFixed,
          address: profileData.address,
          workEmail: profileData.workEmail,
          jobTitle: profileData.jobTitle,
          bankName: profileData.bankName,
          bankBicSwift: profileData.bankBicSwift,
          rib: profileData.rib,
          cnssNumber: profileData.cnssNumber,
          pictureUrl: profileData.pictureUrl || null,
          departmentId: profileData.departmentId,
          accountStatus: 'ACTIVE',
        },
        include: {
          role: true,
          documents: true,
          department: true,
        },
      });

      this.logger.log(`User created successfully: ${user.id}`);

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
      const users = await this.prisma.user.findMany({
        include: { role: true, documents: true, department: true },
      });

      return this.serializeForResponse(users);
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

      return this.serializeForResponse(user);
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

  async getDossier(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
          department: true,
          contracts: {
            orderBy: { startDate: 'desc' },
          },
          salaryHistory: {
            orderBy: { changeDate: 'desc' },
          },
          documents: {
            orderBy: [{ title: 'asc' }, { versionNumber: 'desc' }],
          },
          collaborator: {
            include: {
              manager: {
                include: {
                  user: {
                    include: {
                      role: true,
                      department: true,
                    },
                  },
                },
              },
            },
          },
          manager: {
            include: {
              collaborators: {
                include: {
                  user: {
                    include: {
                      role: true,
                      department: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const latestContract = user.contracts[0] ?? null;
      const contractHistory = user.contracts;

      const dossier = {
        profile: {
          ...user,
          contracts: undefined,
        },
        hierarchy: {
          directManager: user.collaborator?.manager?.user ?? null,
          supervisedCollaborators:
            user.manager?.collaborators?.map((entry) => entry.user) ?? [],
        },
        contracts: {
          latest: latestContract,
          history: contractHistory,
          salaryHistory: user.salaryHistory,
        },
        documents: user.documents,
      };

      return this.serializeForResponse(dossier);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error fetching dossier for ${userId}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to fetch dossier');
    }
  }

  async updateUser(userId: string, updateData: UpdateUserDto) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundException('User not found');
      }

      const profileData = {
        ...updateData,
      } as UpdateUserDto & { password?: string };

      if (Object.prototype.hasOwnProperty.call(profileData, 'password')) {
        delete profileData.password;
      }

      const normalizedUpdateData: Prisma.UserUpdateInput = {
        ...profileData,
        accountStatus: updateData.accountStatus
          ? (updateData.accountStatus as AccountStatus)
          : undefined,
      };
      if (
        Object.prototype.hasOwnProperty.call(normalizedUpdateData, 'birthdate')
      ) {
        const birthdateValue = (
          normalizedUpdateData as Prisma.UserUpdateInput & {
            birthdate?: unknown;
          }
        ).birthdate;

        normalizedUpdateData.birthdate =
          this.normalizeBirthdate(birthdateValue);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: normalizedUpdateData,
        include: { role: true, documents: true, department: true },
      });

      return this.serializeForResponse(updatedUser);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error updating user ${userId}: ${errorMessage}`);
      throw new BadRequestException('Failed to update user');
    }
  }

  async updateUserPassword(userId: string, newPassword: string) {
    try {
      const existing = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!existing) {
        throw new NotFoundException('User not found');
      }

      const trimmedPassword = newPassword.trim();
      if (trimmedPassword.length < 8) {
        throw new BadRequestException('Password must be at least 8 characters');
      }

      const { error: passwordUpdateError } =
        await this.supabaseService.adminClient.auth.admin.updateUserById(
          userId,
          {
            password: trimmedPassword,
          },
        );

      if (passwordUpdateError) {
        this.logger.error(
          `Error updating password for user ${userId}: ${passwordUpdateError.message}`,
        );
        throw new BadRequestException('Failed to update user password');
      }

      return {
        message: 'User password updated successfully',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error updating password for user ${userId}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to update user password');
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

  private normalizeBirthdate(value: unknown): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value === '') {
      return null;
    }

    if (value instanceof Date) {
      if (Number.isNaN(value.getTime())) {
        throw new BadRequestException('Invalid birthdate format');
      }
      return value;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('Invalid birthdate format');
    }

    const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(value.trim());
    const normalizedInput = dateOnlyMatch
      ? `${value.trim()}T00:00:00.000Z`
      : value;
    const parsedDate = new Date(normalizedInput);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid birthdate format');
    }

    return parsedDate;
  }

  async delete(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          personalEmail: true,
          manager: { select: { id: true } },
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.prisma.$transaction(async (tx) => {
        if (user.manager) {
          await tx.collaborator.deleteMany({
            where: { managerId: userId },
          });
        }

        await tx.user.delete({
          where: { id: userId },
        });
      });

      try {
        await this.supabaseService.adminClient.auth.admin.deleteUser(userId);
      } catch (authError) {
        const authMessage =
          authError instanceof Error ? authError.message : String(authError);
        this.logger.warn(
          `User ${userId} deleted from database but auth cleanup failed: ${authMessage}`,
        );
      }

      this.logger.log(`User deleted: ${userId}`);

      return {
        message: 'User deleted successfully',
        id: userId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error deleting user ${userId}: ${errorMessage}`);
      throw new BadRequestException(`Failed to delete user: ${errorMessage}`);
    }
  }

  async uploadPicture(userId: string, file?: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('Picture file is required');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await this.ensureProfilePicturesBucket();

      const extension = file.originalname.includes('.')
        ? file.originalname.split('.').pop()
        : 'jpg';
      const fileName = `profiles/${userId}/${Date.now()}.${extension}`;

      const { error: uploadError } =
        await this.supabaseService.adminClient.storage
          .from('profile-pictures')
          .upload(fileName, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

      if (uploadError) {
        throw new BadRequestException(
          `Failed to upload picture: ${uploadError.message}`,
        );
      }

      const {
        data: { publicUrl },
      } = this.supabaseService.adminClient.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { pictureUrl: publicUrl },
        include: { role: true, documents: true, department: true },
      });

      return {
        message: 'Profile picture updated successfully',
        user: this.serializeForResponse(updatedUser),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to upload profile picture for ${userId}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  async removePicture(userId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, pictureUrl: true },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.pictureUrl) {
        const storagePath = this.extractProfilePicturePath(user.pictureUrl);
        if (storagePath) {
          const { error } = await this.supabaseService.adminClient.storage
            .from('profile-pictures')
            .remove([storagePath]);

          if (error) {
            this.logger.warn(
              `Failed to remove picture from storage for ${userId}: ${error.message}`,
            );
          }
        }
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { pictureUrl: null },
        include: { role: true, documents: true, department: true },
      });

      return {
        message: 'Profile picture removed successfully',
        user: this.serializeForResponse(updatedUser),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to remove profile picture for ${userId}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to remove profile picture');
    }
  }

  private async ensureProfilePicturesBucket() {
    try {
      const { data: buckets } =
        await this.supabaseService.adminClient.storage.listBuckets();
      const bucketExists = buckets?.some(
        (bucket) => bucket.name === 'profile-pictures',
      );

      if (!bucketExists) {
        await this.supabaseService.adminClient.storage.createBucket(
          'profile-pictures',
          {
            public: true,
            fileSizeLimit: 5242880,
            allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          },
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error ensuring profile pictures bucket: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to initialize picture storage');
    }
  }

  private extractProfilePicturePath(pictureUrl: string): string | null {
    try {
      const marker = '/profile-pictures/';
      const markerIndex = pictureUrl.indexOf(marker);
      if (markerIndex === -1) {
        return null;
      }

      const path = pictureUrl.substring(markerIndex + marker.length);
      return path || null;
    } catch {
      return null;
    }
  }

  async setManager(collaboratorId: string, managerId: string) {
    try {
      if (collaboratorId === managerId) {
        throw new BadRequestException(
          'A user cannot be assigned as their own manager',
        );
      }

      // Verify both users exist
      const collaborator = await this.prisma.user.findUnique({
        where: { id: collaboratorId },
        include: {
          role: {
            select: { description: true },
          },
        },
      });

      if (!collaborator) {
        throw new NotFoundException('Collaborator user not found');
      }

      const collaboratorRole =
        collaborator.role?.description?.toLowerCase().trim() ?? '';
      if (!collaboratorRole.includes('collaborator')) {
        throw new BadRequestException(
          'Only users with Collaborator role can be assigned to a manager',
        );
      }

      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        include: {
          role: {
            select: { description: true },
          },
        },
      });

      if (!manager) {
        throw new NotFoundException('Manager user not found');
      }

      const managerRole = manager.role?.description?.toLowerCase().trim() ?? '';
      if (!managerRole.includes('manager')) {
        throw new BadRequestException(
          'Only users with Manager role can supervise collaborators',
        );
      }

      // Check if collaborator already has a collaborator record
      let collaboratorRecord = await this.prisma.collaborator.findUnique({
        where: { id: collaboratorId },
      });

      if (collaboratorRecord) {
        // Update existing
        collaboratorRecord = await this.prisma.collaborator.update({
          where: { id: collaboratorId },
          data: { managerId },
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
      } else {
        // Create new collaborator record
        collaboratorRecord = await this.prisma.collaborator.create({
          data: {
            id: collaboratorId,
            managerId,
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
      }

      // Ensure manager has a manager record
      const managerRecord = await this.prisma.manager.findUnique({
        where: { id: managerId },
      });

      if (!managerRecord) {
        await this.prisma.manager.create({
          data: { id: managerId },
        });
      }

      this.logger.log(
        `Manager set for collaborator ${collaboratorId}: ${managerId}`,
      );

      return {
        message: 'Manager assigned successfully',
        collaborator: collaboratorRecord,
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set manager: ${errorMessage}`);
      throw new BadRequestException('Failed to set manager');
    }
  }

  async getManager(userId: string) {
    try {
      const collaborator = await this.prisma.collaborator.findUnique({
        where: { id: userId },
        include: {
          manager: {
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!collaborator || !collaborator.manager) {
        return {
          message: 'No manager assigned',
          manager: null,
        };
      }

      return {
        message: 'Manager retrieved successfully',
        manager: collaborator.manager.user,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get manager for ${userId}: ${errorMessage}`);
      throw new BadRequestException('Failed to get manager');
    }
  }

  async getSupervisedCollaborators(managerId: string) {
    try {
      const manager = await this.prisma.manager.findUnique({
        where: { id: managerId },
        include: {
          collaborators: {
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
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!manager) {
        return {
          message: 'Manager not found',
          collaborators: [],
        };
      }

      return {
        message: 'Supervised collaborators retrieved successfully',
        collaborators: manager.collaborators.map((c) => c.user),
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to get supervised collaborators for ${managerId}: ${errorMessage}`,
      );
      throw new BadRequestException('Failed to get supervised collaborators');
    }
  }
}
