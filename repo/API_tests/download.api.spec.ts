import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdInterceptor } from '../src/common/interceptors/trace-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Download API (e2e)', () => {
  let app: INestApplication;

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
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /api/v1/files/download', () => {
    it('should require authentication', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/files/download?token=invalid');

      expect(res.status).toBe(401);
    });

    it('should reject invalid download token with auth', async () => {
      // Register and login first
      const username = `dluser_${Date.now()}`;
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ username, password: 'P@ssw0rd!Strong123', displayName: 'DL User' });

      const loginRes = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ username, password: 'P@ssw0rd!Strong123' });

      const token = (loginRes.body.data || loginRes.body).token;

      const res = await request(app.getHttpServer())
        .get('/api/v1/files/download?token=forged.token')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });
});
