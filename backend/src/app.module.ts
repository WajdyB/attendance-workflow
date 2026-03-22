// src/app.module.ts
import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseProvider } from './supabase/supabase.provider';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { RequestValidationMiddleware } from './common/middleware/request-validation.middleware';
import { DepartmentsModule } from './departments/departments.module';
import { DocumentsModule } from './documents/documents.module';

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
  ],
  controllers: [AppController],
  providers: [AppService, SupabaseProvider],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestValidationMiddleware).forRoutes('*');
  }
}
