// src/auth/auth.service.ts
import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private supabaseService: SupabaseService,
  ) {}

  async login(email: string, password: string) {
    try {
      // Validate input
      if (!email || !password) {
        throw new BadRequestException('Email and password are required');
      }

      // Attempt to sign in with Supabase
      const { data, error } =
        await this.supabaseService.client.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        this.logger.warn(`Login failed for ${email}: ${error.message}`);
        throw new UnauthorizedException(
          'Invalid credentials. Please check your email and password.',
        );
      }

      if (!data.user || !data.session) {
        this.logger.error(`Session creation failed for ${email}`);
        throw new UnauthorizedException('Session creation failed');
      }

      // Check if user exists in database
      const dbUser = await this.prisma.user.findUnique({
        where: { personalEmail: email },
        include: { role: true },
      });

      if (!dbUser) {
        this.logger.warn(
          `User ${email} authenticated but not found in database`,
        );
      }

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: data.user.id,
          email: data.user.email,
          lastSignIn: data.user.last_sign_in_at,
        },
        session: {
          accessToken: data.session.access_token,
          expiresIn: data.session.expires_in,
          refreshToken: data.session.refresh_token,
        },
        databaseUser: dbUser || null,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Unexpected error during login: ${errorMessage}`);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      if (!refreshToken) {
        throw new BadRequestException('Refresh token is required');
      }

      // Refresh the session using Supabase
      const { data, error } =
        await this.supabaseService.client.auth.refreshSession({
          refresh_token: refreshToken,
        });

      if (error || !data.session) {
        this.logger.warn(
          `Token refresh failed: ${error?.message || 'Unknown error'}`,
        );
        throw new UnauthorizedException('Failed to refresh token');
      }

      this.logger.log('Token refreshed successfully');

      return {
        success: true,
        message: 'Token refreshed successfully',
        session: {
          accessToken: data.session.access_token,
          expiresIn: data.session.expires_in,
          refreshToken: data.session.refresh_token,
        },
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unexpected error during token refresh: ${errorMessage}`,
      );
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  async logout() {
    try {
      await this.supabaseService.client.auth.signOut();
      this.logger.log('User logged out successfully');
      return {
        success: true,
        message: 'Logged out successfully',
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error during logout: ${errorMessage}`);
      throw new BadRequestException('Logout failed');
    }
  }

  async forgotPassword(email: string) {
    try {
      if (!email) {
        throw new BadRequestException('Email is required');
      }

      // Check if user exists in database
      const dbUser = await this.prisma.user.findUnique({
        where: { personalEmail: email },
      });

      if (!dbUser) {
        // Don't reveal if user exists (security best practice)
        this.logger.warn(
          `Password reset requested for non-existent user: ${email}`,
        );
        return {
          success: true,
          message:
            'If an account exists with this email, a password reset link will be sent.',
        };
      }

      // Send password reset email via Supabase
      const { error } =
        await this.supabaseService.client.auth.resetPasswordForEmail(email, {
          redirectTo:
            process.env.PASSWORD_RESET_REDIRECT_URL ||
            'http://localhost:3001/auth/reset-password',
        });

      if (error) {
        this.logger.error(
          `Failed to send password reset email for ${email}: ${error.message}`,
        );
        // Return success message anyway to not reveal user existence
        return {
          success: true,
          message:
            'If an account exists with this email, a password reset link will be sent.',
        };
      }

      this.logger.log(`Password reset email sent to ${email}`);

      return {
        success: true,
        message:
          'If an account exists with this email, a password reset link will be sent.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unexpected error during password reset request: ${errorMessage}`,
      );
      // Return success message for security
      return {
        success: true,
        message:
          'If an account exists with this email, a password reset link will be sent.',
      };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      if (!token || !newPassword) {
        throw new BadRequestException('Token and new password are required');
      }

      // First, verify the token with Supabase
      const { data: sessionData, error: sessionError } =
        await this.supabaseService.client.auth.verifyOtp({
          token_hash: token,
          type: 'recovery',
        });

      if (sessionError || !sessionData.session || !sessionData.user) {
        this.logger.warn(
          `Password reset verification failed: ${sessionError?.message || 'Invalid or missing session/user'}`,
        );
        throw new UnauthorizedException('Invalid or expired reset token');
      }

      // Get the user ID from the verified token
      const userId = sessionData.user.id;

      // Use admin client to update password directly
      const { data: updateData, error: updateError } =
        await this.supabaseService.adminClient.auth.admin.updateUserById(
          userId,
          { password: newPassword },
        );

      if (updateError || !updateData.user) {
        this.logger.warn(
          `Password update failed: ${updateError?.message || 'Unknown error'}`,
        );
        throw new UnauthorizedException('Failed to update password');
      }

      this.logger.log(`Password reset successful for user: ${userId}`);

      return {
        success: true,
        message:
          'Password reset successfully. You can now log in with your new password.',
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Unexpected error during password reset: ${errorMessage}`,
      );
      throw new UnauthorizedException('Password reset failed');
    }
  }
}
