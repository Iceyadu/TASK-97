import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdInterceptor } from '../src/common/interceptors/trace-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { registerWithPow } from './helpers/pow';

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new TraceIdInterceptor(), new ResponseInterceptor());
    await app.init();

    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user', async () => {
      const res = await registerWithPow(app, {
        username: `testuser_${Date.now()}`,
        password: 'P@ssw0rd!Strong123',
        displayName: 'Test User',
      });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data || res.body).toHaveProperty('id');
    });

    it('should reject weak passwords', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          username: 'weakpwduser',
          password: '123',
          displayName: 'Weak Pwd User',
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject duplicate usernames', async () => {
      const username = `dup_${Date.now()}`;
      await registerWithPow(app, {
        username,
        password: 'P@ssw0rd!Strong123',
        displayName: 'First',
      });

      const res = await registerWithPow(app, {
        username,
        password: 'P@ssw0rd!Strong456',
        displayName: 'Second',
      });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    const username = `loginuser_${Date.now()}`;

    beforeAll(async () => {
      await registerWithPow(app, {
        username,
        password: 'P@ssw0rd!Strong123',
        displayName: 'Login User',
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password: 'P@ssw0rd!Strong123' });

      expect([200, 201]).toContain(res.status);
      const body = res.body.data || res.body;
      expect(body).toHaveProperty('token');
      expect(body).toHaveProperty('expiresAt');
    });

    it('should reject invalid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password: 'wrongpassword123' });

      expect(res.status).toBe(401);
    });
  });

  describe('Protected endpoints require auth', () => {
    it('should reject unauthenticated access to /users/me', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me');

      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated access to /enrollments', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/enrollments');

      expect(res.status).toBe(401);
    });

    it('should reject unauthenticated access to /files/download', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/files/download?token=invalid');

      expect(res.status).toBe(401);
    });
  });
});
