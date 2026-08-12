import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from 'src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(private readonly configService: ConfigService) {
    const pool = new Pool({
      connectionString: configService.get<string>('database.url'),
    });

    const adapter = new PrismaPg(pool);

    super({ adapter });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async checkConnection(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }
}
