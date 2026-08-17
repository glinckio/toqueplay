import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  createTestUser,
  cleanupDatabase,
} from './helpers/auth.helper';

describe('ToquePlay API - Teams (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  let owner: { id: string; email: string; accessToken: string };
  let otherUser: { id: string; email: string; accessToken: string };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    jwtService = moduleFixture.get<JwtService>(JwtService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await cleanupDatabase(prisma);
    await app.close();
  });

  beforeEach(async () => {
    await cleanupDatabase(prisma);

    owner = await createTestUser(prisma, jwtService, configService, {
      name: 'Owner',
      email: 'owner@test.com',
    });
    otherUser = await createTestUser(prisma, jwtService, configService, {
      name: 'Other',
      email: 'other@test.com',
    });
  });

  describe('POST /api/teams', () => {
    it('should create a team and add owner as captain', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Time Teste' })
        .expect(201);

      expect(res.body.name).toBe('Time Teste');
      expect(res.body.ownerId).toBe(owner.id);
      expect(res.body.members).toHaveLength(1);
      expect(res.body.members[0].isCaptain).toBe(true);
      expect(res.body.members[0].userId).toBe(owner.id);
    });

    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/api/teams')
        .send({ name: 'Time' })
        .expect(401);
    });

    it('should reject without name', () => {
      return request(app.getHttpServer())
        .post('/api/teams')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/teams', () => {
    it('should list teams where user is owner or member', async () => {
      await prisma.team.create({
        data: {
          name: 'Team A',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      await prisma.team.create({
        data: {
          name: 'Team B',
          ownerId: otherUser.id,
          members: {
            create: [
              { userId: otherUser.id, isCaptain: true },
              { userId: owner.id, isCaptain: false },
            ],
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get('/api/teams')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });

    it('should reject without auth', () => {
      return request(app.getHttpServer()).get('/api/teams').expect(401);
    });
  });

  describe('GET /api/teams/:id', () => {
    it('should return team details for owner', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team Detail',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/teams/${team.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.name).toBe('Team Detail');
      expect(res.body.members).toHaveLength(1);
    });

    it('should return 404 for non-existent team', () => {
      return request(app.getHttpServer())
        .get('/api/teams/non-existent-id')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });

    it('should return 404 for user not in team', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Private Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      return request(app.getHttpServer())
        .get(`/api/teams/${team.id}`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .expect(404);
    });
  });

  describe('PATCH /api/teams/:id', () => {
    it('should update team when user is owner', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Old Name',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/teams/${team.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'New Name' })
        .expect(200);

      expect(res.body.name).toBe('New Name');
    });

    it('should reject update from non-owner', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      return request(app.getHttpServer())
        .patch(`/api/teams/${team.id}`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({ name: 'Hack' })
        .expect(403);
    });
  });

  describe('DELETE /api/teams/:id', () => {
    it('should delete team when user is owner', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'To Delete',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/teams/${team.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);

      const found = await prisma.team.findUnique({ where: { id: team.id } });
      expect(found).toBeNull();
    });

    it('should reject delete from non-owner', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      return request(app.getHttpServer())
        .delete(`/api/teams/${team.id}`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .expect(403);
    });
  });

  // ─── Gestão do Elenco ────────────────────────────────────

  describe('POST /api/teams/:teamId/members', () => {
    it('should add member by email with CPF', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ email: otherUser.email, cpf: '02222222206' })
        .expect(201);

      expect(res.body.userId).toBe(otherUser.id);
      expect(res.body.cpf).toBe('02222222206');
    });

    it('should reject adding same user twice', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      await request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ email: otherUser.email, cpf: '02222222206' })
        .expect(201);

      return request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ email: otherUser.email, cpf: '03333333309' })
        .expect(409);
    });

    it('should reject duplicate CPF in same team', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      // Add first member with CPF
      await request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ email: otherUser.email, cpf: '02222222206' })
        .expect(201);

      // Try adding guest with same CPF
      return request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members/guest`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ guestName: 'Clone', cpf: '02222222206' })
        .expect(409);
    });

    it('should reject non-existent email', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      return request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ email: 'nobody@test.com', cpf: '05555555504' })
        .expect(404);
    });

    it('should reject add from non-owner', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: {
            create: [
              { userId: owner.id, isCaptain: true },
              { userId: otherUser.id, isCaptain: false },
            ],
          },
        },
      });

      return request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({ email: 'someone@test.com', cpf: '03333333309' })
        .expect(403);
    });
  });

  describe('POST /api/teams/:teamId/members/guest', () => {
    it('should add a guest member with CPF', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members/guest`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ guestName: 'Convidado Teste', cpf: '04444444401' })
        .expect(201);

      expect(res.body.isGuest).toBe(true);
      expect(res.body.guestName).toBe('Convidado Teste');
      expect(res.body.cpf).toBe('04444444401');
    });

    it('should reject without guestName', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      return request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members/guest`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ cpf: '04444444401' })
        .expect(400);
    });

    it('should reject without cpf', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: { create: { userId: owner.id, isCaptain: true } },
        },
      });

      return request(app.getHttpServer())
        .post(`/api/teams/${team.id}/members/guest`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ guestName: 'Sem CPF' })
        .expect(400);
    });
  });

  describe('GET /api/teams/:teamId/members', () => {
    it('should list all members', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: {
            create: [
              { userId: owner.id, isCaptain: true },
              { userId: otherUser.id, isCaptain: false },
            ],
          },
        },
      });

      const res = await request(app.getHttpServer())
        .get(`/api/teams/${team.id}/members`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body).toHaveLength(2);
    });
  });

  describe('PATCH /api/teams/:teamId/members/:memberId', () => {
    it('should update member captain status', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: {
            create: [
              { userId: owner.id, isCaptain: true },
              { userId: otherUser.id, isCaptain: false },
            ],
          },
        },
      });

      const member = await prisma.teamMember.findFirst({
        where: { teamId: team.id, userId: otherUser.id },
      });

      const res = await request(app.getHttpServer())
        .patch(`/api/teams/${team.id}/members/${member!.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ isCaptain: true })
        .expect(200);

      expect(res.body.isCaptain).toBe(true);
    });
  });

  describe('DELETE /api/teams/:teamId/members/:memberId', () => {
    it('should remove a member from the team', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: {
            create: [
              { userId: owner.id, isCaptain: true },
              { userId: otherUser.id, isCaptain: false },
            ],
          },
        },
      });

      const member = await prisma.teamMember.findFirst({
        where: { teamId: team.id, userId: otherUser.id },
      });

      await request(app.getHttpServer())
        .delete(`/api/teams/${team.id}/members/${member!.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);

      const remaining = await prisma.teamMember.findMany({
        where: { teamId: team.id },
      });
      expect(remaining).toHaveLength(1);
    });

    it('should not allow removing the owner', async () => {
      const team = await prisma.team.create({
        data: {
          name: 'Team',
          ownerId: owner.id,
          members: {
            create: [
              { userId: owner.id, isCaptain: true },
              { userId: otherUser.id, isCaptain: false },
            ],
          },
        },
      });

      const ownerMember = await prisma.teamMember.findFirst({
        where: { teamId: team.id, userId: owner.id },
      });

      return request(app.getHttpServer())
        .delete(`/api/teams/${team.id}/members/${ownerMember!.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(400);
    });
  });
});
