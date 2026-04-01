import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppModule } from '../src/app.module';

describe('SADAD API (e2e)', () => {
  let app: INestApplication;
  let mongo: MongoMemoryServer | null = null;
  let accessToken: string;
  let customerId: string;
  let debtId: string;
  let installmentId: string;

  beforeAll(async () => {
    if (!process.env.MONGODB_URI) {
      mongo = await MongoMemoryServer.create();
      process.env.MONGODB_URI = mongo.getUri();
    }
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_EXPIRATION = '1h';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
    if (mongo) await mongo.stop();
  });

  it('register -> login -> me', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'a@test.com', password: 'password123', fullName: 'A Test' })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'a@test.com', password: 'password123' })
      .expect(200);

    expect(loginRes.body.accessToken).toBeTruthy();
    accessToken = loginRes.body.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meRes.body.email).toBe('a@test.com');
  });

  it('rejects unauthorized access', async () => {
    await request(app.getHttpServer())
      .get('/api/customers?page=1&limit=10')
      .expect(401);
  });

  it('rejects invalid reset token', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/reset-password')
      .send({ token: 'bad-token', newPassword: 'newpass123' })
      .expect(400);
  });

  it('customers CRUD basic', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/customers')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'individual',
        name: 'Customer One',
        phone: '0551234567',
      })
      .expect(201);

    customerId = createRes.body.id;
    expect(customerId).toBeTruthy();

    const listRes = await request(app.getHttpServer())
      .get('/api/customers?page=1&limit=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(listRes.body.items.length).toBeGreaterThan(0);

    await request(app.getHttpServer())
      .patch(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'late' })
      .expect(200);
  });

  it('create debt (installments) -> pay installment -> reminders/analytics', async () => {
    const debtRes = await request(app.getHttpServer())
      .post('/api/debts')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        customerId,
        principalAmount: 15000,
        currency: 'SAR',
        planType: 'installments',
        dueDate: new Date().toISOString(),
        installmentsPlan: { count: 3, period: 'monthly' },
        hasGuarantor: true,
        guarantor: { name: 'G One', phone: '+966501234567' },
      })
      .expect(201);

    debtId = debtRes.body.debt.id;
    installmentId = debtRes.body.installments[0].id;
    const installmentAmount = debtRes.body.installments[0].amount;

    await request(app.getHttpServer())
      .post(`/api/installments/${installmentId}/payments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ method: 'cash', amount: installmentAmount + 1 })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/installments/${installmentId}/payments`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ method: 'cash' })
      .expect(201);

    await request(app.getHttpServer())
      .get('/api/reminders/upcoming?days=30')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/api/analytics/summary')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // customer debts listing
    await request(app.getHttpServer())
      .get(`/api/customers/${customerId}/debts`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    // guarantors list
    await request(app.getHttpServer())
      .get('/api/guarantors')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });
});
