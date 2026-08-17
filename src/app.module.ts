import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { BoardsModule } from './boards/boards.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { LabelsModule } from './labels/labels.module';
import { PrismaModule } from './database/prisma.module';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { envValidationSchema } from './config/env.validation';
import { RedisModule } from './redis/redis.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 min
        limit: 20, // 20 requests Max.
      },
    ]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    ProjectsModule,
    BoardsModule,
    TasksModule,
    CommentsModule,
    LabelsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
