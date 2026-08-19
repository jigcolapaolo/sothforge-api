import { Module } from '@nestjs/common';
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
import { RedisService } from './redis/redis.service';
import { RedisThrottlerStorage, ThrottlerAlgorithm } from '@nestjs-redis/throttler-storage';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    // ThrottlerModule.forRootAsync({
    //   imports: [RedisModule],
    //   inject: [RedisService],
    //   useFactory: (redisService: RedisService) => ({
    //     throttlers: [
    //       {
    //         limit: 20,
    //         ttl: 60_000,
    //       },
    //     ],
    //     storage: new RedisThrottlerStorage(
    //       redisService.getClient(),
    //       ThrottlerAlgorithm.SlidingWindowCounter,
    //     ),
    //   }),
    // }),
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
