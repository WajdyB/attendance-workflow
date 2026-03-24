// src/users/users.module.ts
import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SupabaseModule } from '../../supabase/supabase.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    SupabaseModule, // 👈 IMPORTANT
  ],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
