import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import * as bcrypt from 'bcrypt';

import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/redis/redis.service';

import { cleanDatabase } from '../cleanup';

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
};

type OrganizationResponse = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type OrganizationMemberResponse = {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    avatar: string | null;
  };
};

describe('OrganizationsController (integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    prisma = moduleRef.get(PrismaService);
    redis = moduleRef.get(RedisService);

    await app.init();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
    await redis.getClient().flushDb();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('should create an organization for the authenticated user', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'organization-owner@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .post('/organizations')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Integration Organization',
        description: 'Organization created during integration testing',
      })
      .expect(201);

    const organization = response.body as OrganizationResponse;

    expect(typeof organization.id).toBe('string');
    expect(organization.name).toBe('Integration Organization');
    expect(organization.description).toBe(
      'Organization created during integration testing',
    );

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: user.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('OWNER');
  });

  it('should return the organizations of the authenticated user', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'organization-user',
        email: 'organization-user@example.com',
        passwordHash,
      },
    });

    const organizationOne = await prisma.organization.create({
      data: {
        name: 'Organization One',
        description: 'First organization',
      },
    });

    const organizationTwo = await prisma.organization.create({
      data: {
        name: 'Organization Two',
        description: 'Second organization',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: user.id,
          organizationId: organizationOne.id,
          role: 'OWNER',
        },
        {
          userId: user.id,
          organizationId: organizationTwo.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'organization-user@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get('/organizations')
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const organizations = response.body as Array<
      OrganizationResponse & {
        memberCount: number;
        role: string;
        joinedAt: string;
      }
    >;

    expect(organizations).toHaveLength(2);

    const firstOrganization = organizations.find(
      (organization) => organization.id === organizationOne.id,
    );

    const secondOrganization = organizations.find(
      (organization) => organization.id === organizationTwo.id,
    );

    expect(firstOrganization).toBeDefined();
    expect(secondOrganization).toBeDefined();

    expect(firstOrganization?.name).toBe('Organization One');
    expect(firstOrganization?.description).toBe('First organization');
    expect(firstOrganization?.memberCount).toBe(1);
    expect(firstOrganization?.role).toBe('OWNER');
    expect(firstOrganization?.joinedAt).toEqual(expect.any(String));

    expect(secondOrganization?.name).toBe('Organization Two');
    expect(secondOrganization?.description).toBe('Second organization');
    expect(secondOrganization?.memberCount).toBe(1);
    expect(secondOrganization?.role).toBe('MEMBER');
    expect(secondOrganization?.joinedAt).toEqual(expect.any(String));
  });

  it('should return an organization for an authenticated member', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Detailed Organization',
        description: 'Organization detail integration test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'organization-member@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const organizationResponse = response.body as OrganizationResponse & {
      memberCount: number;
      role: string;
      joinedAt: string;
    };

    expect(organizationResponse.id).toBe(organization.id);
    expect(organizationResponse.name).toBe('Detailed Organization');
    expect(organizationResponse.description).toBe(
      'Organization detail integration test',
    );
    expect(organizationResponse.memberCount).toBe(1);
    expect(organizationResponse.role).toBe('MEMBER');
    expect(organizationResponse.joinedAt).toEqual(expect.any(String));
  });

  it('should reject an authenticated user who is not a member of the organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const organizationOwner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    await prisma.user.create({
      data: {
        username: 'unauthorized-user',
        email: 'unauthorized-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Private Organization',
        description: 'Organization with restricted access',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: organizationOwner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'unauthorized-user@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });

  it('should update an organization when requested by an owner', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Original Organization',
        description: 'Original description',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'organization-owner@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .patch(`/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Updated Organization',
        description: 'Updated description',
      })
      .expect(200);

    const updatedOrganization = response.body as OrganizationResponse;

    expect(updatedOrganization.id).toBe(organization.id);
    expect(updatedOrganization.name).toBe('Updated Organization');
    expect(updatedOrganization.description).toBe('Updated description');

    const persistedOrganization = await prisma.organization.findUnique({
      where: {
        id: organization.id,
      },
    });

    expect(persistedOrganization).not.toBeNull();
    expect(persistedOrganization?.name).toBe('Updated Organization');
    expect(persistedOrganization?.description).toBe('Updated description');
  });

  it('should reject a member when updating an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Protected Organization',
        description: 'Original description',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: organization.id,
        role: 'MEMBER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: 'organization-member@example.com',
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .patch(`/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Unauthorized Update',
        description: 'This update should be rejected',
      })
      .expect(403);

    const persistedOrganization = await prisma.organization.findUnique({
      where: {
        id: organization.id,
      },
    });

    expect(persistedOrganization?.name).toBe('Protected Organization');
    expect(persistedOrganization?.description).toBe('Original description');
  });

  it('should add a user as a member of an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'new-member',
        email: 'new-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Team Organization',
        description: 'Organization for member integration testing',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .post(`/organizations/${organization.id}/members`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        userId: member.id,
      })
      .expect(201);

    const memberResponse = response.body as OrganizationMemberResponse;

    expect(memberResponse.user.id).toBe(member.id);
    expect(memberResponse.user.username).toBe('new-member');
    expect(memberResponse.user.email).toBe('new-member@example.com');
    expect(memberResponse.role).toBe('VIEWER');
    expect(memberResponse.joinedAt).toEqual(expect.any(String));

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: member.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('VIEWER');
  });

  it('should return the members of an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Members Organization',
        description: 'Organization members integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: member.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}/members`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const members = response.body as OrganizationMemberResponse[];

    expect(members).toHaveLength(2);

    const ownerResponse = members.find(
      (organizationMember) => organizationMember.user.id === owner.id,
    );

    const memberResponse = members.find(
      (organizationMember) => organizationMember.user.id === member.id,
    );

    expect(ownerResponse).toBeDefined();
    expect(memberResponse).toBeDefined();

    expect(ownerResponse?.role).toBe('OWNER');
    expect(ownerResponse?.user.username).toBe('organization-owner');
    expect(ownerResponse?.user.email).toBe('organization-owner@example.com');

    expect(memberResponse?.role).toBe('MEMBER');
    expect(memberResponse?.user.username).toBe('organization-member');
    expect(memberResponse?.user.email).toBe('organization-member@example.com');
  });

  it('should update a member role when requested by an owner', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Role Organization',
        description: 'Role update integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: member.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .patch(`/organizations/${organization.id}/members/${member.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        role: 'ADMIN',
      })
      .expect(200);

    const memberResponse = response.body as OrganizationMemberResponse;

    expect(memberResponse.user.id).toBe(member.id);
    expect(memberResponse.user.username).toBe('organization-member');
    expect(memberResponse.user.email).toBe('organization-member@example.com');
    expect(memberResponse.role).toBe('ADMIN');

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: member.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('ADMIN');
  });

  it('should reject assigning the OWNER role through the member role endpoint', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Ownership Organization',
        description: 'Ownership role restriction test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: member.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .patch(`/organizations/${organization.id}/members/${member.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        role: 'OWNER',
      })
      .expect(400);

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: member.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('MEMBER');
  });

  it('should transfer ownership to another member', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const currentOwner = await prisma.user.create({
      data: {
        username: 'current-owner',
        email: 'current-owner@example.com',
        passwordHash,
      },
    });

    const newOwner = await prisma.user.create({
      data: {
        username: 'new-owner',
        email: 'new-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Transfer Organization',
        description: 'Ownership transfer integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: currentOwner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: newOwner.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: currentOwner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const response = await request(app.getHttpServer() as Server)
      .patch(`/organizations/${organization.id}/transfer-ownership`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        userId: newOwner.id,
      })
      .expect(200);

    const memberships = await prisma.organizationMember.findMany({
      where: {
        organizationId: organization.id,
      },
    });

    const currentOwnerMembership = memberships.find(
      (membership) => membership.userId === currentOwner.id,
    );

    const newOwnerMembership = memberships.find(
      (membership) => membership.userId === newOwner.id,
    );

    expect(currentOwnerMembership).toBeDefined();
    expect(newOwnerMembership).toBeDefined();

    expect(currentOwnerMembership?.role).toBe('ADMIN');
    expect(newOwnerMembership?.role).toBe('OWNER');
  });

  it('should reject transferring ownership to the current owner', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'current-owner',
        email: 'current-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Self Transfer Organization',
        description: 'Self ownership transfer test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .patch(`/organizations/${organization.id}/transfer-ownership`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        userId: owner.id,
      })
      .expect(400);

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('OWNER');
  });

  it('should reject transferring ownership to a user who is not a member', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const nonMember = await prisma.user.create({
      data: {
        username: 'non-member',
        email: 'non-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Transfer Organization',
        description: 'Non-member transfer test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .patch(`/organizations/${organization.id}/transfer-ownership`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        userId: nonMember.id,
      })
      .expect(404);

    const ownerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(ownerMembership).not.toBeNull();
    expect(ownerMembership?.role).toBe('OWNER');

    const nonMemberMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: nonMember.id,
          organizationId: organization.id,
        },
      },
    });

    expect(nonMemberMembership).toBeNull();
  });

  it('should allow a non-owner member to leave an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Leave Organization',
        description: 'Leave organization integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: member.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: member.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}/members/me`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: member.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).toBeNull();

    const persistedOrganization = await prisma.organization.findUnique({
      where: {
        id: organization.id,
      },
    });

    expect(persistedOrganization).not.toBeNull();

    const ownerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(ownerMembership?.role).toBe('OWNER');
  });

  it('should reject the owner from leaving an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Owner Leave Organization',
        description: 'Owner leave restriction test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}/members/me`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).not.toBeNull();
    expect(membership?.role).toBe('OWNER');
  });

  it('should allow an owner to remove a member from an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Remove Member Organization',
        description: 'Remove member integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: member.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}/members/${member.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: member.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).toBeNull();

    const ownerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(ownerMembership).not.toBeNull();
    expect(ownerMembership?.role).toBe('OWNER');
  });

  it('should reject an admin from removing the owner of an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        username: 'organization-admin',
        email: 'organization-admin@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Protected Owner Organization',
        description: 'Owner protection integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: admin.id,
          organizationId: organization.id,
          role: 'ADMIN',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: admin.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}/members/${owner.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);

    const ownerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(ownerMembership).not.toBeNull();
    expect(ownerMembership?.role).toBe('OWNER');

    const adminMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: admin.id,
          organizationId: organization.id,
        },
      },
    });

    expect(adminMembership).not.toBeNull();
    expect(adminMembership?.role).toBe('ADMIN');
  });

  it('should reject a member from removing another member from an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const targetMember = await prisma.user.create({
      data: {
        username: 'organization-target',
        email: 'organization-target@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Member Removal Organization',
        description: 'Member removal authorization test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: member.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
        {
          userId: targetMember.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: member.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}/members/${targetMember.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);

    const memberMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: member.id,
          organizationId: organization.id,
        },
      },
    });

    expect(memberMembership).not.toBeNull();
    expect(memberMembership?.role).toBe('MEMBER');

    const targetMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: targetMember.id,
          organizationId: organization.id,
        },
      },
    });

    expect(targetMembership).not.toBeNull();
    expect(targetMembership?.role).toBe('MEMBER');
  });

  it('should allow an admin to remove a member from an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        username: 'organization-admin',
        email: 'organization-admin@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'organization-member',
        email: 'organization-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Admin Removal Organization',
        description: 'Admin removal integration test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: admin.id,
          organizationId: organization.id,
          role: 'ADMIN',
        },
        {
          userId: member.id,
          organizationId: organization.id,
          role: 'MEMBER',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: admin.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}/members/${member.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    const memberMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: member.id,
          organizationId: organization.id,
        },
      },
    });

    expect(memberMembership).toBeNull();

    const adminMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: admin.id,
          organizationId: organization.id,
        },
      },
    });

    expect(adminMembership).not.toBeNull();
    expect(adminMembership?.role).toBe('ADMIN');

    const ownerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(ownerMembership).not.toBeNull();
    expect(ownerMembership?.role).toBe('OWNER');
  });

  it('should allow an owner to delete an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Delete Organization',
        description: 'Delete organization integration test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: owner.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    const deletedOrganization = await prisma.organization.findUnique({
      where: {
        id: organization.id,
      },
    });

    expect(deletedOrganization).toBeNull();

    const membership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(membership).toBeNull();
  });

  it('should reject an admin from deleting an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        username: 'organization-admin',
        email: 'organization-admin@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Protected Organization',
        description: 'Admin deletion restriction test',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: owner.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
        {
          userId: admin.id,
          organizationId: organization.id,
          role: 'ADMIN',
        },
      ],
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: admin.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);

    const persistedOrganization = await prisma.organization.findUnique({
      where: {
        id: organization.id,
      },
    });

    expect(persistedOrganization).not.toBeNull();

    const ownerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(ownerMembership).not.toBeNull();
    expect(ownerMembership?.role).toBe('OWNER');

    const adminMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: admin.id,
          organizationId: organization.id,
        },
      },
    });

    expect(adminMembership).not.toBeNull();
    expect(adminMembership?.role).toBe('ADMIN');
  });

  it('should reject a non-member from deleting an organization', async () => {
    const password = 'Password123!';

    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'organization-owner',
        email: 'organization-owner@example.com',
        passwordHash,
      },
    });

    const outsider = await prisma.user.create({
      data: {
        username: 'organization-outsider',
        email: 'organization-outsider@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Protected Organization',
        description: 'Non-member deletion restriction test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: outsider.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    await request(app.getHttpServer() as Server)
      .delete(`/organizations/${organization.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);

    const persistedOrganization = await prisma.organization.findUnique({
      where: {
        id: organization.id,
      },
    });

    expect(persistedOrganization).not.toBeNull();

    const ownerMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: owner.id,
          organizationId: organization.id,
        },
      },
    });

    expect(ownerMembership).not.toBeNull();
    expect(ownerMembership?.role).toBe('OWNER');

    const outsiderMembership = await prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId: outsider.id,
          organizationId: organization.id,
        },
      },
    });

    expect(outsiderMembership).toBeNull();
  });
});
