import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from 'src/tasks/tasks.service';
import { PrismaService } from 'src/database/prisma.service';
import { AuthorizationService } from 'src/common/authorization/authorization.service';
import { TaskPriority, TaskStatus } from 'src/generated/prisma/enums';

describe('TasksService', () => {
  let service: TasksService;

  let prisma: {
    task: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  let authorizationService: {
    getOrganizationMembership: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      task: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    authorizationService = {
      getOrganizationMembership: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a task without an assignee', async () => {
      const boardId = 'board-1';
      const createdById = 'user-1';
      const organizationId = 'organization-1';

      const dto = {
        title: 'Implement authentication',
        description: 'Create JWT authentication',
        priority: TaskPriority.HIGH,
        dueDate: '2026-09-15T18:00:00.000Z',
        estimatedHours: 8,
      };

      const task = {
        id: 'task-1',
        boardId,
        createdById,
        title: dto.title,
        description: dto.description,
        priority: dto.priority,
        dueDate: new Date(dto.dueDate),
        estimatedHours: dto.estimatedHours,
        assignedToId: undefined,
      };

      prisma.task.create.mockResolvedValue(task);

      const result = await service.create(
        boardId,
        createdById,
        organizationId,
        dto,
      );

      expect(
        authorizationService.getOrganizationMembership,
      ).not.toHaveBeenCalled();

      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          boardId,
          createdById,
          title: dto.title,
          description: dto.description,
          priority: dto.priority,
          dueDate: new Date(dto.dueDate),
          estimatedHours: dto.estimatedHours,
          assignedToId: undefined,
        },
      });

      expect(result).toEqual(task);
    });

    it('should validate the assignee before creating the task', async () => {
      const boardId = 'board-1';
      const createdById = 'user-1';
      const organizationId = 'organization-1';

      const dto = {
        title: 'Implement authentication',
        assignedToId: 'user-2',
      };

      const membership = {
        id: 'membership-1',
        userId: 'user-2',
        organizationId,
        role: 'MEMBER',
        joinedAt: new Date(),
      };

      const task = {
        id: 'task-1',
        boardId,
        createdById,
        title: dto.title,
        assignedToId: dto.assignedToId,
      };

      authorizationService.getOrganizationMembership.mockResolvedValue(
        membership,
      );

      prisma.task.create.mockResolvedValue(task);

      const result = await service.create(
        boardId,
        createdById,
        organizationId,
        dto,
      );

      expect(
        authorizationService.getOrganizationMembership,
      ).toHaveBeenCalledWith(dto.assignedToId, organizationId);

      expect(prisma.task.create).toHaveBeenCalled();

      expect(result).toEqual(task);
    });
  });

  describe('findAll', () => {
    it('should return tasks with default pagination and sorting', async () => {
      const boardId = 'board-1';

      const tasks = [
        {
          id: 'task-1',
          boardId,
          title: 'Task 1',
          description: 'Description 1',
          labels: [],
        },
      ];

      prisma.task.findMany.mockResolvedValue(tasks);
      prisma.task.count.mockResolvedValue(1);

      const result = await service.findAll(boardId, {});

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: {
          boardId,
        },
        skip: 0,
        take: 20,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          labels: {
            select: {
              label: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });

      expect(prisma.task.count).toHaveBeenCalledWith({
        where: {
          boardId,
        },
      });

      expect(result).toEqual({
        data: [
          {
            id: 'task-1',
            boardId,
            title: 'Task 1',
            description: 'Description 1',
            labels: [],
          },
        ],
        meta: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      });
    });

    it('should apply filters and search criteria', async () => {
      const boardId = 'board-1';

      const query = {
        page: 2,
        limit: 10,
        search: 'authentication',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignedToId: 'user-2',
        labelId: 'label-1',
        sortBy: 'priority' as const,
        sortOrder: 'asc' as const,
      };

      prisma.task.findMany.mockResolvedValue([]);
      prisma.task.count.mockResolvedValue(0);

      const result = await service.findAll(boardId, query);

      const expectedWhere = {
        boardId,
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        assignedToId: 'user-2',
        labels: {
          some: {
            labelId: 'label-1',
          },
        },
        OR: [
          {
            title: {
              contains: 'authentication',
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: 'authentication',
              mode: 'insensitive',
            },
          },
        ],
      };

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 10,
        take: 10,
        orderBy: {
          priority: 'asc',
        },
        include: {
          labels: {
            select: {
              label: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });

      expect(prisma.task.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });

      expect(result).toEqual({
        data: [],
        meta: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      });
    });

    it('should transform nested labels and calculate pagination metadata', async () => {
      const boardId = 'board-1';

      const tasks = [
        {
          id: 'task-1',
          boardId,
          title: 'Task 1',
          labels: [
            {
              label: {
                id: 'label-1',
                name: 'Backend',
                color: '#000000',
              },
            },
            {
              label: {
                id: 'label-2',
                name: 'Urgent',
                color: '#FF0000',
              },
            },
          ],
        },
      ];

      prisma.task.findMany.mockResolvedValue(tasks);
      prisma.task.count.mockResolvedValue(25);

      const result = await service.findAll(boardId, {
        page: 2,
        limit: 10,
      });

      expect(result).toEqual({
        data: [
          {
            id: 'task-1',
            boardId,
            title: 'Task 1',
            labels: [
              {
                id: 'label-1',
                name: 'Backend',
                color: '#000000',
              },
              {
                id: 'label-2',
                name: 'Urgent',
                color: '#FF0000',
              },
            ],
          },
        ],
        meta: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      });

      expect(result.data[0]).not.toHaveProperty('labels[0].label');
    });
  });

  describe('findOne', () => {
    it('should return a task with flattened labels', async () => {
      const taskId = 'task-1';

      const task = {
        id: taskId,
        boardId: 'board-1',
        title: 'Implement authentication',
        description: 'Create JWT authentication',
        labels: [
          {
            label: {
              id: 'label-1',
              name: 'Backend',
              color: '#000000',
            },
          },
          {
            label: {
              id: 'label-2',
              name: 'Urgent',
              color: '#FF0000',
            },
          },
        ],
      };

      prisma.task.findFirst.mockResolvedValue(task);

      const result = await service.findOne(taskId);

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
        include: {
          labels: {
            select: {
              label: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                },
              },
            },
          },
        },
      });

      expect(result).toEqual({
        id: taskId,
        boardId: 'board-1',
        title: 'Implement authentication',
        description: 'Create JWT authentication',
        labels: [
          {
            id: 'label-1',
            name: 'Backend',
            color: '#000000',
          },
          {
            id: 'label-2',
            name: 'Urgent',
            color: '#FF0000',
          },
        ],
      });
    });

    it('should throw NotFoundException when the task does not exist', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.findOne('task-1')).rejects.toThrow('Task not found');
    });
  });

  describe('update', () => {
    it('should update a task with a new due date', async () => {
      const taskId = 'task-1';

      const existingTask = {
        id: taskId,
        title: 'Old title',
      };

      const dto = {
        title: 'Updated title',
        description: 'Updated description',
        dueDate: '2026-09-20T18:00:00.000Z',
        estimatedHours: 10,
      };

      const updatedTask = {
        id: taskId,
        title: dto.title,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        estimatedHours: dto.estimatedHours,
      };

      prisma.task.findFirst.mockResolvedValue(existingTask);
      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.update(taskId, dto);

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
      });

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
        data: {
          title: dto.title,
          description: dto.description,
          dueDate: new Date(dto.dueDate),
          estimatedHours: dto.estimatedHours,
        },
      });

      expect(result).toEqual(updatedTask);
    });

    it('should clear the due date when dueDate is null', async () => {
      const taskId = 'task-1';

      const existingTask = {
        id: taskId,
        title: 'Task',
      };

      const dto = {
        dueDate: null,
      };

      const updatedTask = {
        id: taskId,
        title: 'Task',
        dueDate: null,
      };

      prisma.task.findFirst.mockResolvedValue(existingTask);
      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.update(taskId, dto);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
        data: {
          title: undefined,
          description: undefined,
          dueDate: null,
          estimatedHours: undefined,
        },
      });

      expect(result).toEqual(updatedTask);
    });

    it('should throw NotFoundException when the task does not exist', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(
        service.update('task-1', {
          title: 'Updated title',
        }),
      ).rejects.toThrow('Task not found');

      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove an existing task', async () => {
      const taskId = 'task-1';

      const task = {
        id: taskId,
        title: 'Task to delete',
      };

      prisma.task.findFirst.mockResolvedValue(task);
      prisma.task.delete.mockResolvedValue(task);

      const result = await service.remove(taskId);

      expect(prisma.task.findFirst).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
      });

      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
      });

      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when the task does not exist', async () => {
      prisma.task.findFirst.mockResolvedValue(null);

      await expect(service.remove('task-1')).rejects.toThrow('Task not found');

      expect(prisma.task.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignTask', () => {
    it('should assign a task to a user who belongs to the organization', async () => {
      const taskId = 'task-1';
      const organizationId = 'organization-1';

      const dto = {
        userId: 'user-2',
      };

      const membership = {
        id: 'membership-1',
        userId: dto.userId,
        organizationId,
        role: 'MEMBER',
        joinedAt: new Date(),
      };

      const updatedTask = {
        id: taskId,
        assignedToId: dto.userId,
      };

      authorizationService.getOrganizationMembership.mockResolvedValue(
        membership,
      );

      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.assignTask(taskId, organizationId, dto);

      expect(
        authorizationService.getOrganizationMembership,
      ).toHaveBeenCalledWith(dto.userId, organizationId);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
        data: {
          assignedToId: dto.userId,
        },
      });

      expect(result).toEqual(updatedTask);
    });

    it('should throw ForbiddenException when the user does not belong to the organization', async () => {
      const taskId = 'task-1';
      const organizationId = 'organization-1';

      const dto = {
        userId: 'user-2',
      };

      authorizationService.getOrganizationMembership.mockResolvedValue(null);

      await expect(
        service.assignTask(taskId, organizationId, dto),
      ).rejects.toThrow('Assigned user does not belong to this organization');

      expect(prisma.task.update).not.toHaveBeenCalled();
    });
  });

  describe('removeAssignee', () => {
    it('should remove the current assignee from a task', async () => {
      const taskId = 'task-1';

      const updatedTask = {
        id: taskId,
        assignedToId: null,
      };

      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.removeAssignee(taskId);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
        data: {
          assignedToId: null,
        },
      });

      expect(result).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('should update the task status', async () => {
      const taskId = 'task-1';

      const dto = {
        status: TaskStatus.DONE,
      };

      const updatedTask = {
        id: taskId,
        status: dto.status,
      };

      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.updateStatus(taskId, dto);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
        data: {
          status: dto.status,
        },
      });

      expect(result).toEqual(updatedTask);
    });
  });

  describe('updatePriority', () => {
    it('should update the task priority', async () => {
      const taskId = 'task-1';

      const dto = {
        priority: TaskPriority.URGENT,
      };

      const updatedTask = {
        id: taskId,
        priority: dto.priority,
      };

      prisma.task.update.mockResolvedValue(updatedTask);

      const result = await service.updatePriority(taskId, dto);

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: taskId,
        },
        data: {
          priority: dto.priority,
        },
      });

      expect(result).toEqual(updatedTask);
    });
  });
});
