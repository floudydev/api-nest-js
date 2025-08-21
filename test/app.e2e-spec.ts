import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { ValidationPipe } from '@nestjs/common';

describe('API Gateway (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Authentication Flow', () => {
    let tempToken: string;
    let accessToken: string;
    let refreshToken: string;

    it('/auth/token/temporary (POST) - should create temporary token', () => {
      return request(app.getHttpServer())
        .post('/auth/token/temporary')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('token');
          expect(res.body).toHaveProperty('expiresIn', '10 минут');
          tempToken = res.body.token;
        });
    });

    it('/auth/register (POST) - should register new user with valid token', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          registrationToken: tempToken,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user).not.toHaveProperty('password');
          accessToken = res.body.accessToken;
          refreshToken = res.body.refreshToken;
        });
    });

    it('/auth/login (POST) - should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('user');
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('/auth/login (POST) - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);
    });

    it('/auth/token/validate (POST) - should validate access token', () => {
      return request(app.getHttpServer())
        .post('/auth/token/validate')
        .send({
          token: accessToken,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body.isValid).toBe(true);
          expect(res.body).toHaveProperty('user');
        });
    });

    it('/auth/token/refresh (POST) - should refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/token/refresh')
        .send({
          refreshToken,
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should fail to register with same username', () => {
      // First get a new temp token
      return request(app.getHttpServer())
        .post('/auth/token/temporary')
        .expect(200)
        .then((tempRes) => {
          return request(app.getHttpServer())
            .post('/auth/register')
            .send({
              username: 'testuser', // Same username
              password: 'password456',
              registrationToken: tempRes.body.token,
            })
            .expect(409); // Conflict
        });
    });
  });

  describe('Ranking Endpoints', () => {
    it('/ranking (GET) - should get default ranking', () => {
      return request(app.getHttpServer())
        .get('/ranking')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          if (res.body.length > 0) {
            expect(res.body[0]).toHaveProperty('position');
            expect(res.body[0]).toHaveProperty('username');
            expect(res.body[0]).toHaveProperty('balance');
            expect(res.body[0]).toHaveProperty('ranking');
          }
        });
    });

    it('/ranking (GET) - should get balance ranking', () => {
      return request(app.getHttpServer())
        .get('/ranking?type=balance&limit=5')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeLessThanOrEqual(5);
        });
    });

    it('/ranking/stats (GET) - should get ranking stats', () => {
      return request(app.getHttpServer())
        .get('/ranking/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalUsers');
          expect(res.body).toHaveProperty('onlineUsers');
          expect(res.body).toHaveProperty('avgBalance');
          expect(res.body).toHaveProperty('maxBalance');
        });
    });
  });

  describe('Input Validation', () => {
    it('should validate login input', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'ab', // Too short
          password: '123', // Too short
        })
        .expect(400);
    });

    it('should validate registration input', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: '', // Empty
          password: 'valid_password',
          registrationToken: 'token',
        })
        .expect(400);
    });

    it('should validate ranking query parameters', () => {
      return request(app.getHttpServer())
        .get('/ranking?type=invalid_type')
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      const promises = [];
      
      // Make multiple requests quickly
      for (let i = 0; i < 150; i++) {
        promises.push(
          request(app.getHttpServer())
            .get('/ranking/stats')
        );
      }

      const responses = await Promise.all(promises);
      const tooManyRequests = responses.some(res => res.status === 429);
      
      expect(tooManyRequests).toBe(true);
    });
  });
});
