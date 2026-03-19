// src/common/guards/roles.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { ROLES_KEY } from '../decorator/roles.decorator';
import { Role } from '../enums/role.enum';
import { Request } from 'express';

type AuthenticatedRequest = Request & {
  user?: unknown;
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Get required roles from decorator
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles required, allow access
    if (!requiredRoles) {
      return true;
    }

    // Get token from header
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // 1. Verify token with Supabase
      const {
        data: { user: authUser },
        error,
      } = await this.supabaseService.client.auth.getUser(token);

      if (error || !authUser) {
        throw new UnauthorizedException('Invalid token');
      }

      // 2. Get user from your database with role information
      const dbUser = await this.prisma.user.findUnique({
        where: {
          personalEmail: authUser.email ?? '',
        },
        include: {
          role: true,
        },
      });

      if (!dbUser) {
        throw new UnauthorizedException('User not found in database');
      }

      // 3. Attach user to request for use in controllers
      request.user = {
        ...authUser,
        ...dbUser,
        roleName: dbUser.role?.description,
      };

      // 4. Check if user has required role
      const userRoleName = dbUser.role?.description;

      if (!userRoleName) {
        throw new ForbiddenException('User has no role assigned');
      }

      const isRoleEnumValue = (value: string): value is Role =>
        Object.values(Role).includes(value as Role);

      if (!isRoleEnumValue(userRoleName)) {
        throw new ForbiddenException(`Invalid role value: ${userRoleName}`);
      }

      const hasRequiredRole = requiredRoles.includes(userRoleName);

      if (!hasRequiredRole) {
        throw new ForbiddenException(
          `Access denied. Required roles: ${requiredRoles.join(', ')}. Your role: ${userRoleName}`,
        );
      }

      return true;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
