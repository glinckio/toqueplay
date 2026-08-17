import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createTestUser, cleanupDatabase } from './helpers/auth.helper';

describe('ToquePlay API - Fase 6: Amistosos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  let user1: { id: string; email: string; accessToken: string };
  let user2: { id: string; email: string; accessToken: string };
  let user3: { id: string; email: string; accessToken: string };
  let team1Id: string;
  let team2Id: string;

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

    user1 = await createTestUser(prisma, jwtService, configService, {
      name: 'User 1',
      email: 'user1@test.com',
    });
    user2 = await createTestUser(prisma, jwtService, configService, {
      name: 'User 2',
      email: 'user2@test.com',
    });
    user3 = await createTestUser(prisma, jwtService, configService, {
      name: 'User 3',
      email: 'user3@test.com',
    });

    // Create teams
    const t1 = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${user1.accessToken}`)
      .send({ name: 'Team Alpha' })
      .expect(201);
    team1Id = t1.body.id;

    const t2 = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${user2.accessToken}`)
      .send({ name: 'Team Bravo' })
      .expect(201);
    team2Id = t2.body.id;
  });

  describe('POST /api/friendlies', () => {
    it('should create friendly between users', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          challengedId: user2.id,
          date: '2026-06-01',
          city: 'Sao Paulo',
          state: 'SP',
        })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.requesterId).toBe(user1.id);
      expect(res.body.challengedId).toBe(user2.id);
    });

    it('should create friendly between teams', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          requesterTeamId: team1Id,
          challengedTeamId: team2Id,
          date: '2026-06-01',
        })
        .expect(201);

      expect(res.body.status).toBe('PENDING');
      expect(res.body.requesterTeamId).toBe(team1Id);
      expect(res.body.challengedTeamId).toBe(team2Id);
    });

    it('should reject without challenged target', async () => {
      return request(app.getHttpServer())
        .post('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({ date: '2026-06-01' })
        .expect(400);
    });
  });

  describe('PATCH /api/friendlies/:id/accept', () => {
    let friendlyId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          challengedId: user2.id,
          date: '2026-06-01',
        })
        .expect(201);
      friendlyId = res.body.id;
    });

    it('should accept as challenged user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/friendlies/${friendlyId}/accept`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('ACCEPTED');
    });

    it('should reject if requester tries to accept own friendly', async () => {
      return request(app.getHttpServer())
        .patch(`/api/friendlies/${friendlyId}/accept`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(400);
    });

    it('should reject if third party tries to accept', async () => {
      return request(app.getHttpServer())
        .patch(`/api/friendlies/${friendlyId}/accept`)
        .set('Authorization', `Bearer ${user3.accessToken}`)
        .expect(403);
    });
  });

  describe('PATCH /api/friendlies/:id/reject', () => {
    let friendlyId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          challengedId: user2.id,
          date: '2026-06-01',
        })
        .expect(201);
      friendlyId = res.body.id;
    });

    it('should reject as challenged user', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/friendlies/${friendlyId}/reject`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('REJECTED');
    });
  });

  describe('PATCH /api/friendlies/:id/cancel', () => {
    let friendlyId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({
          challengedId: user2.id,
          date: '2026-06-01',
        })
        .expect(201);
      friendlyId = res.body.id;
    });

    it('should cancel as requester', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/friendlies/${friendlyId}/cancel`)
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('CANCELLED');
    });

    it('should reject if not requester', async () => {
      return request(app.getHttpServer())
        .patch(`/api/friendlies/${friendlyId}/cancel`)
        .set('Authorization', `Bearer ${user2.accessToken}`)
        .expect(403);
    });
  });

  describe('GET /api/friendlies', () => {
    it('should list my friendlies', async () => {
      await request(app.getHttpServer())
        .post('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .send({ challengedId: user2.id, date: '2026-06-01' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/api/friendlies')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/friendlies/nearby', () => {
    it('should return empty without coordinates', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/friendlies/nearby')
        .set('Authorization', `Bearer ${user1.accessToken}`)
        .expect(200);

      expect(res.body).toEqual([]);
    });
  });
});
