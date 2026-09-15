import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/database/prisma.service';
import { OrganizationRole } from 'src/generated/prisma/enums';
import { OrganizationsService } from 'src/organizations/organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: { $transaction: jest.Mock };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an organization and assign the creator as OWNER', async () => {
      type TransactionClient = {
        organization: {
          create: jest.Mock;
        };
        organizationMember: {
          create: jest.Mock;
        };
      };

      const userId = 'user-1';

      const dto = {
        name: 'Test Organization',
        description: 'Test description',
      };

      const organization = {
        id: 'organization-1',
        name: dto.name,
        description: dto.description,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const tx: TransactionClient = {
        organization: {
          create: jest.fn().mockResolvedValue(organization),
        },
        organizationMember: {
          create: jest.fn().mockResolvedValue({
            id: 'membership-1',
          }),
        },
      };

      prisma.$transaction.mockImplementation(
        async (callback: (tx: TransactionClient) => Promise<unknown>) => {
          return callback(tx);
        },
      );

      const result = await service.create(userId, dto);

      expect(tx.organization.create).toHaveBeenCalledWith({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
      expect(tx.organizationMember.create).toHaveBeenCalledWith({
        data: {
          userId,
          organizationId: organization.id,
          role: OrganizationRole.OWNER,
        },
      });
      expect(result).toEqual(organization);
    });
  });
});
