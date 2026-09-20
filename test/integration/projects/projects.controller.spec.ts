import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import * as bcrypt from 'bcrypt';
import { AppModule } from 'src/app.module';
import { PrismaService } from 'src/database/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import { cleanDatabase } from '../cleanup';
import type { LoginResponse } from 'test/types/auth.types';
import type { ProjectResponse } from 'test/types/project.types';

describe('ProjectsController (integration)', () => {
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

  it('should allow an owner to create a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Project Organization',
        description: 'Project integration test',
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
      .post(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'SothForge',
        description: 'Project management API',
      })
      .expect(201);

    const body = response.body as ProjectResponse;

    expect(body.name).toBe('SothForge');
    expect(body.description).toBe('Project management API');
    expect(body.organizationId).toBe(organization.id);

    const project = await prisma.project.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(project).not.toBeNull();
    expect(project?.organizationId).toBe(organization.id);
    expect(project?.name).toBe('SothForge');
    expect(project?.description).toBe('Project management API');
  });

  it('should allow an admin to create a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        username: 'project-admin',
        email: 'project-admin@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Admin Project Organization',
        description: 'Admin project integration test',
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

    const response = await request(app.getHttpServer() as Server)
      .post(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Admin Project',
        description: 'Created by an administrator',
      })
      .expect(201);

    const body = response.body as ProjectResponse;

    expect(body.name).toBe('Admin Project');
    expect(body.description).toBe('Created by an administrator');
    expect(body.organizationId).toBe(organization.id);

    const project = await prisma.project.findUnique({
      where: {
        id: body.id,
      },
    });

    expect(project).not.toBeNull();
    expect(project?.organizationId).toBe(organization.id);
    expect(project?.name).toBe('Admin Project');
  });

  it('should reject a member from creating a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'project-member',
        email: 'project-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Member Project Organization',
        description: 'Member project authorization test',
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
      .post(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Unauthorized Project',
        description: 'This project should not be created',
      })
      .expect(403);

    const projects = await prisma.project.findMany({
      where: {
        organizationId: organization.id,
      },
    });

    expect(projects).toHaveLength(0);
  });

  it('should return the projects of an organization for an authenticated member', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'project-member',
        email: 'project-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Projects Organization',
        description: 'Projects listing integration test',
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

    const olderProject = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Older Project',
        description: 'Older project',
      },
    });

    const newerProject = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Newer Project',
        description: 'Newer project',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: member.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const projects = response.body as ProjectResponse[];

    expect(projects).toHaveLength(2);

    expect(projects[0].id).toBe(newerProject.id);
    expect(projects[0].name).toBe('Newer Project');

    expect(projects[1].id).toBe(olderProject.id);
    expect(projects[1].name).toBe('Older Project');
  });

  it('should return cached projects on subsequent requests', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Projects Cache Organization',
        description: 'Projects cache integration test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Original Project Name',
        description: 'Original description',
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

    const firstResponse = await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const firstProjects = firstResponse.body as ProjectResponse[];

    expect(firstProjects).toHaveLength(1);
    expect(firstProjects[0].name).toBe('Original Project Name');

    const cacheKey = `projects:${organization.id}`;

    const cachedProjects = await redis.get(cacheKey);

    expect(cachedProjects).not.toBeNull();

    await prisma.project.update({
      where: {
        id: project.id,
      },
      data: {
        name: 'Updated Directly In Database',
      },
    });

    const secondResponse = await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const secondProjects = secondResponse.body as ProjectResponse[];

    expect(secondProjects).toHaveLength(1);
    expect(secondProjects[0].name).toBe('Original Project Name');
  });

  it('should invalidate the project cache when creating a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Projects Cache Invalidation Organization',
        description: 'Project cache invalidation test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Existing Project',
        description: 'Existing project',
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

    // Populate the cache.
    const firstResponse = await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const firstProjects = firstResponse.body as ProjectResponse[];

    expect(firstProjects).toHaveLength(1);
    expect(firstProjects[0].name).toBe('Existing Project');

    const cacheKey = `projects:${organization.id}`;

    expect(await redis.get(cacheKey)).not.toBeNull();

    // Creating a project should invalidate the cache.
    await request(app.getHttpServer() as Server)
      .post(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'New Project',
        description: 'Newly created project',
      })
      .expect(201);

    expect(await redis.get(cacheKey)).toBeNull();

    // The next GET must query PostgreSQL again and rebuild the cache.
    const secondResponse = await request(app.getHttpServer() as Server)
      .get(`/organizations/${organization.id}/projects`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const secondProjects = secondResponse.body as ProjectResponse[];

    expect(secondProjects).toHaveLength(2);

    expect(
      secondProjects.some((project) => project.name === 'Existing Project'),
    ).toBe(true);

    expect(
      secondProjects.some((project) => project.name === 'New Project'),
    ).toBe(true);

    expect(await redis.get(cacheKey)).not.toBeNull();
  });

  it('should return a project for an authenticated member', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'project-member',
        email: 'project-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Project Access Organization',
        description: 'Project access integration test',
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

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Accessible Project',
        description: 'Project accessible to organization members',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: member.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .get(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const body = response.body as ProjectResponse;

    expect(body.id).toBe(project.id);
    expect(body.organizationId).toBe(organization.id);
    expect(body.name).toBe('Accessible Project');
    expect(body.description).toBe('Project accessible to organization members');
  });

  it('should reject a member of another organization from accessing a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const projectOwner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const outsider = await prisma.user.create({
      data: {
        username: 'project-outsider',
        email: 'project-outsider@example.com',
        passwordHash,
      },
    });

    const projectOrganization = await prisma.organization.create({
      data: {
        name: 'Project Organization',
        description: 'Organization containing the project',
      },
    });

    const outsiderOrganization = await prisma.organization.create({
      data: {
        name: 'Outsider Organization',
        description: 'Different organization',
      },
    });

    await prisma.organizationMember.createMany({
      data: [
        {
          userId: projectOwner.id,
          organizationId: projectOrganization.id,
          role: 'OWNER',
        },
        {
          userId: outsider.id,
          organizationId: outsiderOrganization.id,
          role: 'OWNER',
        },
      ],
    });

    const project = await prisma.project.create({
      data: {
        organizationId: projectOrganization.id,
        name: 'Private Project',
        description: 'Project belonging to another organization',
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
      .get(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);

    const persistedProject = await prisma.project.findUnique({
      where: {
        id: project.id,
      },
    });

    expect(persistedProject).not.toBeNull();
    expect(persistedProject?.organizationId).toBe(projectOrganization.id);
    expect(persistedProject?.name).toBe('Private Project');
  });

  it('should allow an owner to update a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Project Update Organization',
        description: 'Project update integration test',
      },
    });

    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: organization.id,
        role: 'OWNER',
      },
    });

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Original Project',
        description: 'Original description',
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
      .patch(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Updated Project',
        description: 'Updated description',
      })
      .expect(200);

    const body = response.body as ProjectResponse;

    expect(body.id).toBe(project.id);
    expect(body.organizationId).toBe(organization.id);
    expect(body.name).toBe('Updated Project');
    expect(body.description).toBe('Updated description');

    const persistedProject = await prisma.project.findUnique({
      where: {
        id: project.id,
      },
    });

    expect(persistedProject).not.toBeNull();
    expect(persistedProject?.name).toBe('Updated Project');
    expect(persistedProject?.description).toBe('Updated description');
  });

  it('should allow an admin to update a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        username: 'project-admin',
        email: 'project-admin@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Admin Project Update Organization',
        description: 'Admin project update integration test',
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

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Original Project',
        description: 'Original description',
      },
    });

    const loginResponse = await request(app.getHttpServer() as Server)
      .post('/auth/login')
      .send({
        email: admin.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const response = await request(app.getHttpServer() as Server)
      .patch(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Updated By Admin',
        description: 'Updated by administrator',
      })
      .expect(200);

    const body = response.body as ProjectResponse;

    expect(body.id).toBe(project.id);
    expect(body.name).toBe('Updated By Admin');
    expect(body.description).toBe('Updated by administrator');

    const persistedProject = await prisma.project.findUnique({
      where: {
        id: project.id,
      },
    });

    expect(persistedProject).not.toBeNull();
    expect(persistedProject?.name).toBe('Updated By Admin');
    expect(persistedProject?.description).toBe('Updated by administrator');
  });

  it('should reject a member from updating a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'project-member',
        email: 'project-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Member Project Update Organization',
        description: 'Member project update authorization test',
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

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Original Project',
        description: 'Original description',
      },
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
      .patch(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .send({
        name: 'Unauthorized Update',
        description: 'This update should not be allowed',
      })
      .expect(403);

    const persistedProject = await prisma.project.findUnique({
      where: {
        id: project.id,
      },
    });

    expect(persistedProject).not.toBeNull();
    expect(persistedProject?.name).toBe('Original Project');
    expect(persistedProject?.description).toBe('Original description');
  });

  it('should allow an admin to delete a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const admin = await prisma.user.create({
      data: {
        username: 'project-admin',
        email: 'project-admin@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Admin Project Delete Organization',
        description: 'Admin project delete integration test',
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

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Project To Delete',
        description: 'Project that should be deleted',
      },
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
      .delete(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(204);

    const deletedProject = await prisma.project.findUnique({
      where: {
        id: project.id,
      },
    });

    expect(deletedProject).toBeNull();

    const organizationStillExists = await prisma.organization.findUnique({
      where: {
        id: organization.id,
      },
    });

    expect(organizationStillExists).not.toBeNull();
  });

  it('should reject a member from deleting a project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const owner = await prisma.user.create({
      data: {
        username: 'project-owner',
        email: 'project-owner@example.com',
        passwordHash,
      },
    });

    const member = await prisma.user.create({
      data: {
        username: 'project-member',
        email: 'project-member@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Member Project Delete Organization',
        description: 'Member project delete authorization test',
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

    const project = await prisma.project.create({
      data: {
        organizationId: organization.id,
        name: 'Protected Project',
        description: 'This project should not be deleted',
      },
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
      .delete(`/projects/${project.id}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);

    const persistedProject = await prisma.project.findUnique({
      where: {
        id: project.id,
      },
    });

    expect(persistedProject).not.toBeNull();
    expect(persistedProject?.name).toBe('Protected Project');
    expect(persistedProject?.description).toBe(
      'This project should not be deleted',
    );
  });

  it('should reject access to a nonexistent project', async () => {
    const password = 'Password123!';
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username: 'project-user',
        email: 'project-user@example.com',
        passwordHash,
      },
    });

    const organization = await prisma.organization.create({
      data: {
        name: 'Nonexistent Project Organization',
        description: 'Nonexistent project integration test',
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
        email: user.email,
        password,
      })
      .expect(201);

    const loginBody = loginResponse.body as LoginResponse;

    const nonexistentProjectId = '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer() as Server)
      .get(`/projects/${nonexistentProjectId}`)
      .set('Authorization', `Bearer ${loginBody.accessToken}`)
      .expect(403);
  });
});
