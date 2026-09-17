import { Test, TestingModule } from '@nestjs/testing';
import { LabelsService } from 'src/labels/labels.service';
import { PrismaService } from 'src/database/prisma.service';

describe('LabelsService', () => {
  let service: LabelsService;

  let prisma: {
    label: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    taskLabel: {
      findUnique: jest.Mock;
      create: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      label: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      taskLabel: {
        findUnique: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a label when the name is available', async () => {
      const organizationId = 'organization-1';

      const dto = {
        name: 'Backend',
        color: '#3B82F6',
      };

      const label = {
        id: 'label-1',
        organizationId,
        name: dto.name,
        color: dto.color,
      };

      prisma.label.findFirst.mockResolvedValue(null);
      prisma.label.create.mockResolvedValue(label);

      const result = await service.create(organizationId, dto);

      expect(prisma.label.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId,
          name: dto.name,
        },
      });

      expect(prisma.label.create).toHaveBeenCalledWith({
        data: {
          organizationId,
          name: dto.name,
          color: dto.color,
        },
      });

      expect(result).toEqual(label);
    });

    it('should throw ConflictException when the label name already exists', async () => {
      const organizationId = 'organization-1';

      const dto = {
        name: 'Backend',
        color: '#3B82F6',
      };

      prisma.label.findFirst.mockResolvedValue({
        id: 'existing-label',
        organizationId,
        name: dto.name,
        color: '#000000',
      });

      await expect(service.create(organizationId, dto)).rejects.toThrow(
        'A label with this name already exists in the organization',
      );

      expect(prisma.label.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all labels for an organization', async () => {
      const organizationId = 'organization-1';

      const labels = [
        {
          id: 'label-1',
          organizationId,
          name: 'Backend',
          color: '#3B82F6',
        },
        {
          id: 'label-2',
          organizationId,
          name: 'Frontend',
          color: '#10B981',
        },
      ];

      prisma.label.findMany.mockResolvedValue(labels);

      const result = await service.findAll(organizationId, {});

      expect(prisma.label.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
        },
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toEqual(labels);
    });

    it('should filter labels by name when search is provided', async () => {
      const organizationId = 'organization-1';

      const query = {
        search: 'back',
      };

      const labels = [
        {
          id: 'label-1',
          organizationId,
          name: 'Backend',
          color: '#3B82F6',
        },
      ];

      prisma.label.findMany.mockResolvedValue(labels);

      const result = await service.findAll(organizationId, query);

      expect(prisma.label.findMany).toHaveBeenCalledWith({
        where: {
          organizationId,
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      expect(result).toEqual(labels);
    });
  });

  describe('findOne', () => {
    it('should return an existing label', async () => {
      const labelId = 'label-1';

      const label = {
        id: labelId,
        organizationId: 'organization-1',
        name: 'Backend',
        color: '#3B82F6',
      };

      prisma.label.findUnique.mockResolvedValue(label);

      const result = await service.findOne(labelId);

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          id: labelId,
        },
      });

      expect(result).toEqual(label);
    });

    it('should throw NotFoundException when the label does not exist', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      await expect(service.findOne('label-1')).rejects.toThrow(
        'Label not found',
      );
    });
  });

  describe('update', () => {
    it('should update a label when the label exists and the new name is available', async () => {
      const labelId = 'label-1';

      const dto = {
        name: 'Backend Updated',
        color: '#EF4444',
      };

      const updatedLabel = {
        id: labelId,
        organizationId: 'organization-1',
        name: dto.name,
        color: dto.color,
      };

      prisma.label.findUnique.mockResolvedValue({
        organizationId: 'organization-1',
      });

      prisma.label.findFirst.mockResolvedValue(null);
      prisma.label.update.mockResolvedValue(updatedLabel);

      const result = await service.update(labelId, dto);

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          id: labelId,
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.label.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'organization-1',
          name: dto.name,
          NOT: {
            id: labelId,
          },
        },
      });

      expect(prisma.label.update).toHaveBeenCalledWith({
        where: {
          id: labelId,
        },
        data: {
          name: dto.name,
          color: dto.color,
        },
      });

      expect(result).toEqual(updatedLabel);
    });

    it('should update a label without checking name availability when only the color changes', async () => {
      const labelId = 'label-1';

      const dto = {
        color: '#EF4444',
      };

      const updatedLabel = {
        id: labelId,
        organizationId: 'organization-1',
        name: 'Backend',
        color: dto.color,
      };

      prisma.label.findUnique.mockResolvedValue({
        organizationId: 'organization-1',
      });

      prisma.label.update.mockResolvedValue(updatedLabel);

      const result = await service.update(labelId, dto);

      expect(prisma.label.findFirst).not.toHaveBeenCalled();

      expect(prisma.label.update).toHaveBeenCalledWith({
        where: {
          id: labelId,
        },
        data: {
          name: undefined,
          color: dto.color,
        },
      });

      expect(result).toEqual(updatedLabel);
    });

    it('should throw NotFoundException when the label does not exist', async () => {
      prisma.label.findUnique.mockResolvedValue(null);

      await expect(
        service.update('label-1', {
          name: 'Backend Updated',
        }),
      ).rejects.toThrow('Label not found');

      expect(prisma.label.findFirst).not.toHaveBeenCalled();
      expect(prisma.label.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the new name is already used by another label', async () => {
      const labelId = 'label-1';

      prisma.label.findUnique.mockResolvedValue({
        organizationId: 'organization-1',
      });

      prisma.label.findFirst.mockResolvedValue({
        id: 'label-2',
        organizationId: 'organization-1',
        name: 'Frontend',
        color: '#10B981',
      });

      await expect(
        service.update(labelId, {
          name: 'Frontend',
        }),
      ).rejects.toThrow(
        'A label with this name already exists in the organization',
      );

      expect(prisma.label.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete an existing label', async () => {
      const labelId = 'label-1';

      const label = {
        id: labelId,
        organizationId: 'organization-1',
        name: 'Backend',
        color: '#3B82F6',
      };

      prisma.label.findUnique.mockResolvedValue(label);
      prisma.label.delete.mockResolvedValue(label);

      const result = await service.remove(labelId);

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          id: labelId,
        },
      });

      expect(prisma.label.delete).toHaveBeenCalledWith({
        where: {
          id: labelId,
        },
      });

      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when the label does not exist', async () => {
      const labelId = 'label-1';

      prisma.label.findUnique.mockResolvedValue(null);

      await expect(service.remove(labelId)).rejects.toThrow('Label not found');

      expect(prisma.label.delete).not.toHaveBeenCalled();
    });
  });

  describe('assignToTask', () => {
    it('should assign a label to a task when the label belongs to the task organization', async () => {
      const taskId = 'task-1';
      const labelId = 'label-1';
      const organizationId = 'organization-1';

      const taskLabel = {
        taskId,
        labelId,
      };

      prisma.label.findUnique.mockResolvedValue({
        organizationId,
      });

      prisma.taskLabel.findUnique.mockResolvedValue(null);
      prisma.taskLabel.create.mockResolvedValue(taskLabel);

      const result = await service.assignToTask(
        taskId,
        labelId,
        organizationId,
      );

      expect(prisma.label.findUnique).toHaveBeenCalledWith({
        where: {
          id: labelId,
        },
        select: {
          organizationId: true,
        },
      });

      expect(prisma.taskLabel.findUnique).toHaveBeenCalledWith({
        where: {
          taskId_labelId: {
            taskId,
            labelId,
          },
        },
      });

      expect(prisma.taskLabel.create).toHaveBeenCalledWith({
        data: {
          taskId,
          labelId,
        },
      });

      expect(result).toEqual(taskLabel);
    });

    it('should throw NotFoundException when the label does not exist', async () => {
      const taskId = 'task-1';
      const labelId = 'label-1';

      prisma.label.findUnique.mockResolvedValue(null);

      await expect(
        service.assignToTask(taskId, labelId, 'organization-1'),
      ).rejects.toThrow('Label not found');

      expect(prisma.taskLabel.findUnique).not.toHaveBeenCalled();
      expect(prisma.taskLabel.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the label belongs to another organization', async () => {
      const taskId = 'task-1';
      const labelId = 'label-1';

      prisma.label.findUnique.mockResolvedValue({
        organizationId: 'organization-2',
      });

      await expect(
        service.assignToTask(taskId, labelId, 'organization-1'),
      ).rejects.toThrow('The label does not belong to the task organization');

      expect(prisma.taskLabel.findUnique).not.toHaveBeenCalled();
      expect(prisma.taskLabel.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the label is already assigned to the task', async () => {
      const taskId = 'task-1';
      const labelId = 'label-1';

      prisma.label.findUnique.mockResolvedValue({
        organizationId: 'organization-1',
      });

      prisma.taskLabel.findUnique.mockResolvedValue({
        taskId,
        labelId,
      });

      await expect(
        service.assignToTask(taskId, labelId, 'organization-1'),
      ).rejects.toThrow('The label is already assigned to this task');

      expect(prisma.taskLabel.create).not.toHaveBeenCalled();
    });
  });

  describe('removeFromTask', () => {
    it('should remove a label from a task', async () => {
      const taskId = 'task-1';
      const labelId = 'label-1';

      const taskLabel = {
        taskId,
        labelId,
      };

      prisma.taskLabel.findUnique.mockResolvedValue(taskLabel);
      prisma.taskLabel.delete.mockResolvedValue(taskLabel);

      const result = await service.removeFromTask(taskId, labelId);

      expect(prisma.taskLabel.findUnique).toHaveBeenCalledWith({
        where: {
          taskId_labelId: {
            taskId,
            labelId,
          },
        },
      });

      expect(prisma.taskLabel.delete).toHaveBeenCalledWith({
        where: {
          taskId_labelId: {
            taskId,
            labelId,
          },
        },
      });

      expect(result).toBeUndefined();
    });

    it('should throw NotFoundException when the label is not assigned to the task', async () => {
      const taskId = 'task-1';
      const labelId = 'label-1';

      prisma.taskLabel.findUnique.mockResolvedValue(null);

      await expect(service.removeFromTask(taskId, labelId)).rejects.toThrow(
        'The label is not assigned to this task',
      );

      expect(prisma.taskLabel.delete).not.toHaveBeenCalled();
    });
  });
});
