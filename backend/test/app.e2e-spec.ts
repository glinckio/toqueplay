import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';

describe('ToquePlay API - Fase 1 (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/google (POST)', () => {
    it('should reject invalid Google token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/google')
        .send({ token: 'invalid-token' })
        .expect(401);
    });

    it('should validate required fields', () => {
      return request(app.getHttpServer())
        .post('/api/auth/google')
        .send({})
        .expect(400);
    });
  });

  describe('/api/auth/refresh (POST)', () => {
    it('should reject invalid refresh token', () => {
      return request(app.getHttpServer())
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  describe('/api/users/me (GET)', () => {
    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .expect(401);
    });

    it('should reject request with invalid token', () => {
      return request(app.getHttpServer())
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('/api/users/me (PATCH)', () => {
    it('should reject request without token', () => {
      return request(app.getHttpServer())
        .patch('/api/users/me')
        .send({ name: 'Test' })
        .expect(401);
    });
  });
});
