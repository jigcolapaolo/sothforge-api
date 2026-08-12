import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule],
  providers: [RedisService],
  // Para ser usado en los modulos necesarios
  exports: [RedisService],
})
export class RedisModule {}
