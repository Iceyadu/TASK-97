import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdInterceptor } from '../src/common/interceptors/trace-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { registerWithPow } from './helpers/pow';

describe('Categories API (e2e)', () => {
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

    const username = `cat_user_${Date.now()}`;
    await registerWithPow(app, {
      username,
      password: 'P@ssw0rd!Strong123',
      displayName: 'Cat User',
    });
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password: 'P@ssw0rd!Strong123' });
    token = (loginRes.body.data || loginRes.body).token;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/categories returns list with response metadata for authenticated users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({
      traceId: expect.any(String),
      timestamp: expect.any(String),
    });
  });

  it('POST /api/v1/categories requires enrollment_manager or admin', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Cat ${Date.now()}` });
    expect([403, 401]).toContain(res.status);
    expect(res.body.message).toEqual(expect.any(String));
    expect(res.body.traceId).toEqual(expect.any(String));
  });
});
