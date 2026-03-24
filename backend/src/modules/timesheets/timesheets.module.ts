import { Module } from '@nestjs/common';
import { TimesheetsService } from './timesheets.service';
import { TimesheetsController } from './timesheets.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { SupabaseModule } from '../../supabase/supabase.module';

@Module({
  imports: [PrismaModule, SupabaseModule],
  providers: [TimesheetsService],
  controllers: [TimesheetsController],
  exports: [TimesheetsService],
})
export class TimesheetsModule {}
