import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdInterceptor } from '../src/common/interceptors/trace-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { registerWithPow } from './helpers/pow';

describe('Offerings list API (e2e)', () => {
  let app: INestApplication;
  let token: string;

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

    const username = `offerings_user_${Date.now()}`;
    await registerWithPow(app, {
      username,
      password: 'P@ssw0rd!Strong123',
      displayName: 'Offerings User',
    });
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password: 'P@ssw0rd!Strong123' });
    token = (loginRes.body.data || loginRes.body).token;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/offerings returns data with pagination metadata', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/offerings?page=1&pageSize=10')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({
      traceId: expect.any(String),
      timestamp: expect.any(String),
      page: 1,
      pageSize: 10,
      totalCount: expect.any(Number),
    });
  });

  it('GET /api/v1/offerings rejects invalid status filter', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/offerings?status=invalid_status',
    ).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid status');
    expect(res.body.traceId).toEqual(expect.any(String));
  });

  it('GET /api/v1/offerings ignores unrelated query params but keeps valid filters', async () => {
    const res = await request(app.getHttpServer()).get(
      '/api/v1/offerings?page=1&pageSize=5&status=open&unusedParam=ignored',
    ).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.pageSize).toBe(5);
  });
});
