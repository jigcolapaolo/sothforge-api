import { Test, TestingModule } from '@nestjs/testing';
import { BoardsService } from 'src/boards/boards.service';
import { PrismaService } from 'src/database/prisma.service';

describe('BoardsService', () => {
  let service: BoardsService;

  let prisma: {
    board: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      board: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a board', async () => {
      const projectId = 'project-1';

      const dto = {
        name: 'Development',
        description: 'Development board',
      };

      const board = {
        id: 'board-1',
        projectId,
        name: dto.name,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prisma.board.create.mockResolvedValue(board);

      const result = await service.create(projectId, dto);

      expect(prisma.board.create).toHaveBeenCalledWith({
        data: {
          projectId,
          ...dto,
        },
      });

      expect(result).toEqual(board);
    });
  });

  describe('findAll', () => {
    it('should return all boards of a project', async () => {
      const projectId = 'project-1';

      const boards = [
        {
          id: 'board-1',
          projectId,
          name: 'Development',
        },
        {
          id: 'board-2',
          projectId,
          name: 'Testing',
        },
      ];

      prisma.board.findMany.mockResolvedValue(boards);

      const result = await service.findAll(projectId);

      expect(prisma.board.findMany).toHaveBeenCalledWith({
        where: {
          projectId,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      expect(result).toEqual(boards);
    });
  });

  describe('findOne', () => {
    it('should return a board', async () => {
      const boardId = 'board-1';

      const board = {
        id: boardId,
        projectId: 'project-1',
        name: 'Development',
        description: 'Development board',
      };

      prisma.board.findFirst.mockResolvedValue(board);

      const result = await service.findOne(boardId);

      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: {
          id: boardId,
        },
      });

      expect(result).toEqual(board);
    });

    it('should throw NotFoundException when the board does not exist', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(service.findOne('board-1')).rejects.toThrow(
        'Board not found',
      );
    });
  });

  describe('update', () => {
    it('should update a board', async () => {
      const boardId = 'board-1';

      const existingBoard = {
        id: boardId,
        projectId: 'project-1',
        name: 'Development',
        description: 'Old description',
      };

      const dto = {
        name: 'Updated Development',
        description: 'Updated description',
      };

      const updatedBoard = {
        ...existingBoard,
        ...dto,
      };

      prisma.board.findFirst.mockResolvedValue(existingBoard);
      prisma.board.update.mockResolvedValue(updatedBoard);

      const result = await service.update(boardId, dto);

      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: {
          id: boardId,
        },
      });

      expect(prisma.board.update).toHaveBeenCalledWith({
        where: {
          id: boardId,
        },
        data: {
          ...dto,
        },
      });

      expect(result).toEqual(updatedBoard);
    });

    it('should throw NotFoundException when the board does not exist', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(
        service.update('board-1', {
          name: 'Updated Development',
        }),
      ).rejects.toThrow('Board not found');

      expect(prisma.board.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should delete a board', async () => {
      const boardId = 'board-1';

      const board = {
        id: boardId,
        projectId: 'project-1',
        name: 'Development',
      };

      prisma.board.findFirst.mockResolvedValue(board);
      prisma.board.delete.mockResolvedValue(board);

      await service.remove(boardId);

      expect(prisma.board.findFirst).toHaveBeenCalledWith({
        where: {
          id: boardId,
        },
      });

      expect(prisma.board.delete).toHaveBeenCalledWith({
        where: {
          id: boardId,
        },
      });
    });

    it('should throw NotFoundException when the board does not exist', async () => {
      prisma.board.findFirst.mockResolvedValue(null);

      await expect(service.remove('board-1')).rejects.toThrow(
        'Board not found',
      );

      expect(prisma.board.delete).not.toHaveBeenCalled();
    });
  });
});
