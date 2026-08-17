import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { createTestUser, cleanupDatabase } from './helpers/auth.helper';

function stageDate(daysFromNow: number): string {
  return new Date(Date.now() + daysFromNow * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

describe('ToquePlay API - Fase 3: Torneios (e2e)', () => {
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

  describe('POST /api/tournaments', () => {
    it('should create a tournament with DRAFT status', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          name: 'Torneio Teste',
        })
        .expect(201);

      expect(res.body.name).toBe('Torneio Teste');
      expect(res.body.status).toBe('DRAFT');
      expect(res.body.isPublished).toBe(false);
      expect(res.body.ownerId).toBe(owner.id);
    });

    it('should reject without auth', () => {
      return request(app.getHttpServer())
        .post('/api/tournaments')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should reject missing required fields', () => {
      return request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({})
        .expect(400);
    });
  });

  describe('PATCH /api/tournaments/:id/structure', () => {
    let tournamentId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Test' });
      tournamentId = res.body.id;
    });

    it('should set structure with stages and categories', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tournaments/${tournamentId}/structure`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          eventType: 'CIRCUIT',
          stages: [
            { name: 'Etapa 1', date: stageDate(10) },
            { name: 'Etapa 2', date: stageDate(20) },
          ],
          categories: [
            { type: 'MALE', format: 'PAIR', modality: 'BEACH' },
          ],
        })
        .expect(200);

      expect(res.body.eventType).toBe('CIRCUIT');
      expect(res.body.stages).toHaveLength(2);
      expect(res.body.categories).toHaveLength(1);
    });

    it('should reject CIRCUIT without stages', async () => {
      return request(app.getHttpServer())
        .patch(`/api/tournaments/${tournamentId}/structure`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ eventType: 'CIRCUIT', stages: [] })
        .expect(400);
    });

    it('should reject non-owner', async () => {
      return request(app.getHttpServer())
        .patch(`/api/tournaments/${tournamentId}/structure`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({ eventType: 'SINGLE' })
        .expect(403);
    });
  });

  describe('PATCH /api/tournaments/:id/location', () => {
    let tournamentId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Test' });
      tournamentId = res.body.id;
    });

    it('should update location', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/tournaments/${tournamentId}/location`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          address: 'Rua Teste, 123',
          city: 'Sao Paulo',
          state: 'SP',
          latitude: -23.5,
          longitude: -46.6,
          regionRadius: 50,
        })
        .expect(200);

      expect(res.body.city).toBe('Sao Paulo');
      expect(res.body.state).toBe('SP');
    });

    it('should reject lat without lng', async () => {
      return request(app.getHttpServer())
        .patch(`/api/tournaments/${tournamentId}/location`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ latitude: -23.5 })
        .expect(400);
    });
  });

  describe('PATCH /api/tournaments/:id/registration', () => {
    let tournamentId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Test' });
      tournamentId = res.body.id;
    });

    it('should update registration settings', async () => {
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app.getHttpServer())
        .patch(`/api/tournaments/${tournamentId}/registration`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          maxTeams: 16,
          registrationPrice: 150.0,
          registrationDeadline: futureDate,
          registrationRules: 'Pagamento via PIX',
        })
        .expect(200);

      expect(res.body.maxTeams).toBe(16);
    });
  });

  describe('POST /api/tournaments/:id/facilities', () => {
    let tournamentId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Test' });
      tournamentId = res.body.id;
    });

    it('should add facilities in batch', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/facilities`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          facilities: [
            { name: 'Estacionamento' },
            { name: 'Churrasqueira' },
            { name: 'Cozinha' },
          ],
        })
        .expect(201);

      expect(res.body.facilities).toHaveLength(3);
    });
  });

  describe('POST /api/tournaments/:id/sponsors', () => {
    let tournamentId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Test' });
      tournamentId = res.body.id;
    });

    it('should add sponsors in batch', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/sponsors`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          sponsors: [
            { name: 'Patrocinador 1', description: 'Apoio' },
            { name: 'Patrocinador 2' },
          ],
        })
        .expect(201);

      expect(res.body.sponsors).toHaveLength(2);
    });
  });

  describe('Full wizard flow', () => {
    it('should complete all 7 steps and publish', async () => {
      // Step 1: Create
      const createRes = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Torneio Completo' })
        .expect(201);

      const id = createRes.body.id;
      expect(createRes.body.status).toBe('DRAFT');

      // Step 2: Structure
      const structureRes = await request(app.getHttpServer())
        .patch(`/api/tournaments/${id}/structure`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          eventType: 'CIRCUIT',
          stages: [
            { name: 'Etapa 1', date: stageDate(10) },
            { name: 'Etapa 2', date: stageDate(20) },
            { name: 'Etapa 3', date: stageDate(30) },
          ],
          categories: [
            { type: 'MALE', format: 'PAIR', modality: 'BEACH' },
            { type: 'FEMALE', format: 'PAIR', modality: 'BEACH' },
          ],
        })
        .expect(200);

      expect(structureRes.body.stages).toHaveLength(3);
      expect(structureRes.body.categories).toHaveLength(2);

      // Step 3: Location
      const locationRes = await request(app.getHttpServer())
        .patch(`/api/tournaments/${id}/location`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          address: 'Arena Volei, Rua 1',
          city: 'Sao Paulo',
          state: 'SP',
          latitude: -23.5,
          longitude: -46.6,
          regionRadius: 30,
        })
        .expect(200);

      expect(locationRes.body.city).toBe('Sao Paulo');

      // Step 4: Registration
      const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const regRes = await request(app.getHttpServer())
        .patch(`/api/tournaments/${id}/registration`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          maxTeams: 32,
          registrationPrice: 200.0,
          registrationDeadline: futureDate,
          registrationRules: 'Inscricoes ate o prazo',
        })
        .expect(200);

      expect(regRes.body.maxTeams).toBe(32);

      // Step 5: Facilities
      await request(app.getHttpServer())
        .post(`/api/tournaments/${id}/facilities`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          facilities: [
            { name: 'Estacionamento' },
            { name: 'Churrasqueira' },
            { name: 'Copa' },
          ],
        })
        .expect(201);

      // Step 6: Sponsors
      await request(app.getHttpServer())
        .post(`/api/tournaments/${id}/sponsors`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          sponsors: [
            { name: 'Nike', description: 'Apoio oficial' },
            { name: 'Gatorade' },
          ],
        })
        .expect(201);

      // Step 7: Summary & Publish
      const summaryRes = await request(app.getHttpServer())
        .get(`/api/tournaments/${id}/summary`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(summaryRes.body.stages).toHaveLength(3);
      expect(summaryRes.body.categories).toHaveLength(2);
      expect(summaryRes.body.facilities).toHaveLength(3);
      expect(summaryRes.body.sponsors).toHaveLength(2);

      const publishRes = await request(app.getHttpServer())
        .patch(`/api/tournaments/${id}/publish`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(publishRes.body.status).toBe('PUBLISHED');
      expect(publishRes.body.isPublished).toBe(true);
    });

    it('should reject publish when missing required fields', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Torneio Vazio' })
        .expect(201);

      // Try publish without structure, location, etc.
      await request(app.getHttpServer())
        .patch(`/api/tournaments/${createRes.body.id}/publish`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(400);
    });
  });

  describe('GET /api/tournaments', () => {
    it('should list tournaments with filters', async () => {
      await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'T1' });

      const res = await request(app.getHttpServer())
        .get('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/tournaments/mine', () => {
    it('should return only user tournaments', async () => {
      await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Meu Torneio' });

      const res = await request(app.getHttpServer())
        .get('/api/tournaments/mine')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.every((t: any) => t.ownerId === owner.id)).toBe(true);
    });
  });

  describe('GET /api/tournaments/:id', () => {
    it('should return tournament details', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Detalhe' });

      const res = await request(app.getHttpServer())
        .get(`/api/tournaments/${createRes.body.id}`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .expect(200);

      expect(res.body.name).toBe('Detalhe');
    });

    it('should return 404 for non-existent tournament', () => {
      return request(app.getHttpServer())
        .get('/api/tournaments/non-existent-id')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(404);
    });
  });

  describe('DELETE /api/tournaments/:id', () => {
    it('should cancel a DRAFT tournament', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Cancelar' });

      await request(app.getHttpServer())
        .delete(`/api/tournaments/${createRes.body.id}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(204);
    });

    it('should reject non-owner cancel', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/tournaments')
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ name: 'Cancelar' });

      return request(app.getHttpServer())
        .delete(`/api/tournaments/${createRes.body.id}`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .expect(403);
    });
  });
});
