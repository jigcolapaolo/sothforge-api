import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}
}
