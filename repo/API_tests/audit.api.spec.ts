import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdInterceptor } from '../src/common/interceptors/trace-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { registerWithPow } from './helpers/pow';

describe('Audit API (e2e)', () => {
  let app: INestApplication;
  let userToken: string;

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

    const username = `audit_user_${Date.now()}`;
    await registerWithPow(app, {
      username,
      password: 'P@ssw0rd!Strong123',
      displayName: 'Audit User',
    });
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password: 'P@ssw0rd!Strong123' });
    userToken = (loginRes.body.data || loginRes.body).token;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('GET /api/v1/audit-events forbids non-admin users', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/audit-events')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
