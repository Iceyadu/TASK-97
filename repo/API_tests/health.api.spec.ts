import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdInterceptor } from '../src/common/interceptors/trace-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

describe('Health API (e2e)', () => {
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

  it('GET /api/v1/health returns health payload and metadata', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health');
    expect(res.status).toBe(200);
    const body = res.body.data || res.body;
    expect(body).toMatchObject({
      status: expect.any(String),
      database: expect.any(String),
      fileStorage: expect.any(String),
      uptime: expect.any(Number),
    });
    expect(['ok', 'degraded']).toContain(body.status);
    expect(['connected', 'error', 'disconnected']).toContain(body.database);
    expect(['accessible', 'not_accessible']).toContain(body.fileStorage);
    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(res.body.meta).toMatchObject({
      traceId: expect.any(String),
      timestamp: expect.any(String),
    });
  });
});
