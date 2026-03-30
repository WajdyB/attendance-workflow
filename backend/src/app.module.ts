// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseProvider } from './supabase/supabase.provider';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './modules/auth/auth.module';
import { RequestValidationMiddleware } from './common/middleware/request-validation.middleware';
import { DepartmentsModule } from './departments/departments.module';
import { DocumentsModule } from './documents/documents.module';
import { ContractsModule } from './contracts/contracts.module';
import { TimesheetsModule } from './modules/timesheets/timesheets.module';
import { RequestsModule } from './modules/requests/requests.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { NotificationsModule } from './modules/notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    SupabaseModule,
    UsersModule,
    RolesModule,
    AuthModule,
    DepartmentsModule,
    DocumentsModule,
    ContractsModule,
    TimesheetsModule,
    RequestsModule,
    HolidaysModule,
    ProjectsModule,
    EvaluationsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseProvider],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestValidationMiddleware).forRoutes('*');
  }
}
