import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from 'src/projects/projects.service';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { AuditService } from 'src/audit/audit.service';
import { Prisma } from 'src/generated/prisma/client';

describe('ProjectsService', () => {
  let service: ProjectsService;

  let prisma: {
    $transaction: jest.Mock;
    project: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  let redis: {
    get: jest.Mock;
    setWithTtl: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
      project: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      setWithTtl: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: RedisService,
          useValue: redis,
        },
        {
          provide: AuditService,
          useValue: {
            create: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a project and invalidate the organization cache', async () => {
      const userId = 'user-1';
      const organizationId = 'organization-1';

      const dto = {
        name: 'Test Project',
        description: 'Test description',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-12-15T00:00:00.000Z',
      };

      const project = {
        id: 'project-1',
        organizationId,
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      };

      const createProject = jest.fn().mockResolvedValue(project);

      const tx = {
        project: {
          create: createProject,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      redis.delete.mockResolvedValue(undefined);

      const result = await service.create(userId, organizationId, dto);

      expect(createProject).toHaveBeenCalledWith({
        data: {
          organizationId,
          name: dto.name,
          description: dto.description,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      });

      expect(redis.delete).toHaveBeenCalledWith(`projects:${organizationId}`);

      expect(result).toEqual(project);
    });

    it('should allow optional dates to be undefined', async () => {
      const userId = 'user-1';
      const organizationId = 'organization-1';

      const dto = {
        name: 'Test Project',
      };

      const project = {
        id: 'project-1',
        organizationId,
        name: dto.name,
        description: undefined,
        startDate: undefined,
        endDate: undefined,
      };

      const createProject = jest.fn().mockResolvedValue(project);

      const tx = {
        project: {
          create: createProject,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      redis.delete.mockResolvedValue(undefined);

      const result = await service.create(userId, organizationId, dto);

      expect(createProject).toHaveBeenCalledWith({
        data: {
          organizationId,
          name: dto.name,
          description: undefined,
          startDate: undefined,
          endDate: undefined,
        },
      });

      expect(redis.delete).toHaveBeenCalledWith(`projects:${organizationId}`);

      expect(result).toEqual(project);
    });
  });

  describe('findAll', () => {
    it('should return cached projects when they exist in Redis', async () => {
      const organizationId = 'organization-1';

      const projects = [
        {
          id: 'project-1',
          organizationId,
          name: 'Project 1',
        },
      ];

      redis.get.mockResolvedValue(JSON.stringify(projects));

      const result = await service.findAll(organizationId);

      expect(redis.get).toHaveBeenCalledWith(`projects:${organizationId}`);

      expect(result).toEqual(projects);

      expect(prisma.project.findMany).not.toHaveBeenCalled();
      expect(redis.setWithTtl).not.toHaveBeenCalled();
    });

    it('should fetch projects from the database and cache them when Redis has no data', async () => {
      const organizationId = 'organization-1';

      const projects = [
        {
          id: 'project-1',
          organizationId,
          name: 'Project 1',
        },
        {
          id: 'project-2',
          organizationId,
          name: 'Project 2',
        },
      ];

      redis.get.mockResolvedValue(null);
      prisma.project.findMany.mockResolvedValue(projects);
      redis.setWithTtl.mockResolvedValue(undefined);

      const result = await service.findAll(organizationId);

      expect(redis.get).toHaveBeenCalledWith(`projects:${organizationId}`);

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(redis.setWithTtl).toHaveBeenCalledWith(
        `projects:${organizationId}`,
        JSON.stringify(projects),
        60,
      );

      expect(result).toEqual(projects);
    });
  });

  describe('findOne', () => {
    it('should return a project', async () => {
      const projectId = 'project-1';

      const project = {
        id: projectId,
        organizationId: 'organization-1',
        name: 'Test Project',
        description: 'Test description',
      };

      prisma.project.findFirst.mockResolvedValue(project);

      const result = await service.findOne(projectId);

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: projectId,
        },
      });

      expect(result).toEqual(project);
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.findOne('project-1')).rejects.toThrow(
        'Project not found',
      );
    });
  });

  describe('update', () => {
    it('should update a project and invalidate the organization cache', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'organization-1';

      const existingProject = {
        id: projectId,
        organizationId,
        name: 'Old Project',
        description: 'Old description',
      };

      const dto = {
        name: 'Updated Project',
        description: 'Updated description',
        startDate: '2026-09-01T00:00:00.000Z',
        endDate: '2026-12-15T00:00:00.000Z',
      };

      const updatedProject = {
        ...existingProject,
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      };

      prisma.project.findFirst.mockResolvedValue(existingProject);

      const updateProject = jest.fn().mockResolvedValue(updatedProject);

      const tx = {
        project: {
          update: updateProject,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      redis.delete.mockResolvedValue(undefined);

      const result = await service.update(userId, projectId, dto);

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: projectId,
        },
      });

      expect(updateProject).toHaveBeenCalledWith({
        where: {
          id: projectId,
        },
        data: {
          ...dto,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
        },
      });

      expect(redis.delete).toHaveBeenCalledWith(`projects:${organizationId}`);

      expect(result).toEqual(updatedProject);
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.update('user-1', 'project-1', {
          name: 'Updated Project',
        }),
      ).rejects.toThrow('Project not found');

      expect(prisma.project.update).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(redis.delete).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a project and invalidate the organization cache', async () => {
      const userId = 'user-1';
      const projectId = 'project-1';
      const organizationId = 'organization-1';

      const project = {
        id: projectId,
        organizationId,
        name: 'Test Project',
      };

      prisma.project.findFirst.mockResolvedValue(project);

      const deleteProject = jest.fn().mockResolvedValue(project);

      const tx = {
        project: {
          delete: deleteProject,
        },
      } as unknown as Prisma.TransactionClient;

      prisma.$transaction.mockImplementation(
        async (callback: (tx: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      );

      redis.delete.mockResolvedValue(undefined);

      await service.remove(userId, projectId);

      expect(prisma.project.findFirst).toHaveBeenCalledWith({
        where: {
          id: projectId,
        },
      });

      expect(deleteProject).toHaveBeenCalledWith({
        where: {
          id: projectId,
        },
      });

      expect(redis.delete).toHaveBeenCalledWith(`projects:${organizationId}`);
    });

    it('should throw NotFoundException when the project does not exist', async () => {
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'project-1')).rejects.toThrow(
        'Project not found',
      );

      expect(prisma.project.delete).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(redis.delete).not.toHaveBeenCalled();
    });
  });
});
