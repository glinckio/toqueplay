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

describe('ToquePlay API - Fase 5: Brackets e Matches (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  let owner: { id: string; email: string; accessToken: string };
  let otherUser: { id: string; email: string; accessToken: string };
  let teamOwner1: { id: string; email: string; accessToken: string };
  let teamOwner2: { id: string; email: string; accessToken: string };
  let teamOwner3: { id: string; email: string; accessToken: string };
  let teamOwner4: { id: string; email: string; accessToken: string };

  let tournamentId: string;
  let categoryId: string;
  let team1Id: string;
  let team2Id: string;
  let team3Id: string;
  let team4Id: string;

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
    teamOwner1 = await createTestUser(prisma, jwtService, configService, {
      name: 'Team1 Owner',
      email: 'team1@test.com',
    });
    teamOwner2 = await createTestUser(prisma, jwtService, configService, {
      name: 'Team2 Owner',
      email: 'team2@test.com',
    });
    teamOwner3 = await createTestUser(prisma, jwtService, configService, {
      name: 'Team3 Owner',
      email: 'team3@test.com',
    });
    teamOwner4 = await createTestUser(prisma, jwtService, configService, {
      name: 'Team4 Owner',
      email: 'team4@test.com',
    });

    // Create 4 teams
    const t1 = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${teamOwner1.accessToken}`)
      .send({ name: 'Team Alpha' })
      .expect(201);
    team1Id = t1.body.id;

    const t2 = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${teamOwner2.accessToken}`)
      .send({ name: 'Team Bravo' })
      .expect(201);
    team2Id = t2.body.id;

    const t3 = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${teamOwner3.accessToken}`)
      .send({ name: 'Team Charlie' })
      .expect(201);
    team3Id = t3.body.id;

    const t4 = await request(app.getHttpServer())
      .post('/api/teams')
      .set('Authorization', `Bearer ${teamOwner4.accessToken}`)
      .send({ name: 'Team Delta' })
      .expect(201);
    team4Id = t4.body.id;

    // Add members to teams (minMembers = 2)
    await prisma.teamMember.createMany({
      data: [
        { teamId: team1Id, userId: teamOwner1.id, isCaptain: true },
        { teamId: team2Id, userId: teamOwner2.id, isCaptain: true },
        { teamId: team3Id, userId: teamOwner3.id, isCaptain: true },
        { teamId: team4Id, userId: teamOwner4.id, isCaptain: true },
      ],
    });

    // Create tournament with structure
    const tournamentRes = await request(app.getHttpServer())
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({ name: 'Torneio Bracket Test' })
      .expect(201);
    tournamentId = tournamentRes.body.id;

    // Add structure with stage 1 day from now (within 2-day rule)
    const structureRes = await request(app.getHttpServer())
      .patch(`/api/tournaments/${tournamentId}/structure`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        eventType: 'SINGLE',
        stages: [
          {
            name: 'Etapa Principal',
            date: stageDate(1),
            city: 'Sao Paulo',
            state: 'SP',
          },
        ],
        categories: [
          { type: 'MALE', format: 'PAIR', modality: 'BEACH', minMembers: 1, maxMembers: 4 },
        ],
      })
      .expect(200);

    categoryId = structureRes.body.categories[0].id;

    // Publish tournament
    await request(app.getHttpServer())
      .patch(`/api/tournaments/${tournamentId}/publish`)
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .expect(200);

    // Register teams
    await request(app.getHttpServer())
      .post(`/api/tournaments/${tournamentId}/register`)
      .set('Authorization', `Bearer ${teamOwner1.accessToken}`)
      .send({ categoryId, teamId: team1Id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/tournaments/${tournamentId}/register`)
      .set('Authorization', `Bearer ${teamOwner2.accessToken}`)
      .send({ categoryId, teamId: team2Id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/tournaments/${tournamentId}/register`)
      .set('Authorization', `Bearer ${teamOwner3.accessToken}`)
      .send({ categoryId, teamId: team3Id })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/tournaments/${tournamentId}/register`)
      .set('Authorization', `Bearer ${teamOwner4.accessToken}`)
      .send({ categoryId, teamId: team4Id })
      .expect(201);

    // Confirm registrations (free tournament → PENDING_CONFIRMATION → confirm by owner)
    const regs = await prisma.registration.findMany({
      where: { tournamentId, categoryId },
    });

    for (const reg of regs) {
      await request(app.getHttpServer())
        .patch(`/api/tournaments/${tournamentId}/registrations/${reg.id}/confirm`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);
    }
  });

  describe('POST /api/tournaments/:id/generate-bracket', () => {
    it('should generate single elimination bracket', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/generate-bracket`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({
          categoryId,
          type: 'SINGLE_ELIMINATION',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.type).toBe('SINGLE_ELIMINATION');
      expect(res.body.matches).toBeDefined();
      // 4 teams = 2 semi-finals + 1 final = 3 matches
      expect(res.body.matches.length).toBe(3);
    });

    it('should reject non-owner', async () => {
      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/generate-bracket`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({ categoryId, type: 'SINGLE_ELIMINATION' })
        .expect(403);
    });

    it('should reject duplicate bracket for same category', async () => {
      await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/generate-bracket`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ categoryId, type: 'SINGLE_ELIMINATION' })
        .expect(201);

      return request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/generate-bracket`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ categoryId, type: 'SINGLE_ELIMINATION' })
        .expect(409);
    });
  });

  describe('GET /api/tournaments/:id/bracket', () => {
    it('should return bracket with rounds grouped', async () => {
      await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/generate-bracket`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ categoryId, type: 'SINGLE_ELIMINATION' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/tournaments/${tournamentId}/bracket`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].rounds).toBeDefined();
      expect(res.body[0].rounds['1']).toBeDefined(); // first round
    });

    it('should filter by categoryId', async () => {
      await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/generate-bracket`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ categoryId, type: 'SINGLE_ELIMINATION' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get(`/api/tournaments/${tournamentId}/bracket?categoryId=${categoryId}`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
    });
  });

  describe('Match lifecycle', () => {
    let matchId: string;

    beforeEach(async () => {
      const bracketRes = await request(app.getHttpServer())
        .post(`/api/tournaments/${tournamentId}/generate-bracket`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ categoryId, type: 'SINGLE_ELIMINATION' })
        .expect(201);

      // Pick a first-round match with both teams
      const firstRoundMatches = bracketRes.body.matches.filter(
        (m: any) => m.round === 1 && m.teamAId && m.teamBId,
      );
      matchId = firstRoundMatches[0].id;
    });

    it('should start a match', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.startedAt).toBeDefined();
    });

    it('should reject start by non-owner', async () => {
      return request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .expect(403);
    });

    it('should register points and finish match', async () => {
      // Start match
      await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      // Register point for team A
      const pointRes = await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/point`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ team: 'A' })
        .expect(200);

      expect(pointRes.body.scoreTeamA).toBe(1);

      // Register point for team B
      const pointRes2 = await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/point`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ team: 'B' })
        .expect(200);

      expect(pointRes2.body.scoreTeamB).toBe(1);

      // Finish set
      await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/set-finish`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ setNumber: 1 })
        .expect(200);

      // Add more points to team A
      await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/point`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ team: 'A' })
        .expect(200);

      // Finish match
      const finishRes = await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/finish`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(finishRes.body.status).toBe('FINISHED');
      expect(finishRes.body.winnerId).toBeDefined();
    });

    it('should reject double start', async () => {
      await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      return request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/start`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(400);
    });

    it('should declare walkover', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/walkover`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ winnerTeam: 'A' })
        .expect(200);

      expect(res.body.status).toBe('WALKOVER');
      expect(res.body.winnerId).toBeDefined();
    });

    it('should reject point on non-started match', async () => {
      return request(app.getHttpServer())
        .patch(`/api/matches/${matchId}/point`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .send({ team: 'A' })
        .expect(400);
    });
  });

  describe('GET /api/tournaments/:id/ranking', () => {
    it('should return ranking', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/tournaments/${tournamentId}/ranking`)
        .set('Authorization', `Bearer ${owner.accessToken}`)
        .expect(200);

      expect(res.body.tournamentId).toBe(tournamentId);
      expect(res.body.ranking).toBeInstanceOf(Array);
    });
  });
});
