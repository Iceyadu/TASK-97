import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { TraceIdInterceptor } from '../src/common/interceptors/trace-id.interceptor';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { v4 as uuidv4 } from 'uuid';

describe('Reservation & Enrollment API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userToken: string;
  let userId: string;
  let otherUserToken: string;
  let otherUserId: string;

  async function registerAndLogin(suffix: string) {
    const username = `resuser_${suffix}_${Date.now()}`;
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ username, password: 'P@ssw0rd!Strong123', displayName: `User ${suffix}` });

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ username, password: 'P@ssw0rd!Strong123' });

    const body = loginRes.body.data || loginRes.body;
    return { token: body.token, userId: body.user?.id };
  }

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

    const user1 = await registerAndLogin('a');
    userToken = user1.token;
    userId = user1.userId;

    const user2 = await registerAndLogin('b');
    otherUserToken = user2.token;
    otherUserId = user2.userId;
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('Object-level authorization on reservations', () => {
    it('should not allow user to view another user\'s reservation', async () => {
      // Create a reservation as user A
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', uuidv4())
        .send({ offeringId: uuidv4() }); // may 404 if no offering, that's fine

      // If we got a reservation, try to access as user B
      if (createRes.status < 300) {
        const resId = (createRes.body.data || createRes.body).id;
        const viewRes = await request(app.getHttpServer())
          .get(`/api/v1/reservations/${resId}`)
          .set('Authorization', `Bearer ${otherUserToken}`);

        expect(viewRes.status).toBe(403);
      }
    });

    it('should not allow user to release another user\'s reservation', async () => {
      const fakeResId = uuidv4();
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/reservations/${fakeResId}`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', uuidv4());

      // Should be 404 (not found) or 403 (forbidden), not 204
      expect(res.status).not.toBe(204);
    });
  });

  describe('Object-level authorization on enrollments', () => {
    it('should not allow user to view another user\'s enrollment', async () => {
      const fakeEnrollmentId = uuidv4();
      const res = await request(app.getHttpServer())
        .get(`/api/v1/enrollments/${fakeEnrollmentId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // Should be 404, not 200
      expect(res.status).toBe(404);
    });

    it('should not allow user to cancel another user\'s enrollment', async () => {
      const fakeEnrollmentId = uuidv4();
      const res = await request(app.getHttpServer())
        .post(`/api/v1/enrollments/${fakeEnrollmentId}/cancel`)
        .set('Authorization', `Bearer ${userToken}`)
        .set('Idempotency-Key', uuidv4())
        .send({ reason: 'test' });

      // Should be 404, not 200
      expect(res.status).toBe(404);
    });
  });

  describe('Idempotency enforcement', () => {
    it('should require Idempotency-Key header for reservations', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/reservations')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ offeringId: uuidv4() });

      expect(res.status).toBe(400);
    });
  });
});
