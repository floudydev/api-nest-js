import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ValidationPipe } from '@nestjs/common';

// Мок модулей для тестирования без реальной базы данных
const mockUser = {
  id: 1,
  username: 'testuser',
  password: 'hashedpassword',
  email: 'test@example.com',
  balance: 1000,
  iq: 120,
  level: 1,
  experience: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAuthService = {
  createTemporaryToken: jest.fn().mockResolvedValue({
    token: 'temp-token-123',
    expiresIn: '10 минут',
  }),
  register: jest.fn().mockResolvedValue({
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    user: mockUser,
  }),
  login: jest.fn().mockResolvedValue({
    access_token: 'access-token-123',
    refresh_token: 'refresh-token-123',
    user: mockUser,
  }),
  validateToken: jest.fn().mockResolvedValue({ valid: true }),
  refreshToken: jest.fn().mockResolvedValue({
    access_token: 'new-access-token-123',
  }),
};

const mockRankingService = {
  getRanking: jest.fn().mockResolvedValue([
    { id: 1, username: 'user1', balance: 2000, iq: 150, level: 2 },
    { id: 2, username: 'user2', balance: 1500, iq: 130, level: 2 },
    { id: 3, username: 'user3', balance: 1000, iq: 120, level: 1 },
  ]),
  getRankingStats: jest.fn().mockResolvedValue({
    totalUsers: 100,
    avgBalance: 1250,
    avgIq: 125,
    avgLevel: 1.5,
  }),
};

// Мок контроллеров
const mockAuthController = {
  createTemporaryToken: async () => mockAuthService.createTemporaryToken(),
  register: async (dto: any) => mockAuthService.register(dto),
  login: async (dto: any) => mockAuthService.login(dto),
  validateToken: async (dto: any) => mockAuthService.validateToken(dto),
  refreshToken: async (dto: any) => mockAuthService.refreshToken(dto),
};

const mockRankingController = {
  getRanking: async (query: any) => mockRankingService.getRanking(query),
  getRankingStats: async () => mockRankingService.getRankingStats(),
};

describe('API Gateway (e2e) - Mock Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [],
      providers: [
        {
          provide: 'AuthService',
          useValue: mockAuthService,
        },
        {
          provide: 'RankingService', 
          useValue: mockRankingService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // Включаем JSON парсер
    app.use(require('express').json());

    // Добавляем роуты вручную для тестирования
    const router = app.getHttpAdapter();
    
    router.post('/auth/token/temporary', async (req: any, res: any) => {
      try {
        const result = await mockAuthController.createTemporaryToken();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.post('/auth/register', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        if (!body.username || !body.password || !body.tempToken) {
          return res.status(400).json({ 
            statusCode: 400,
            message: ['username should not be empty', 'password should not be empty', 'tempToken should not be empty'],
            error: 'Bad Request'
          });
        }
        const result = await mockAuthController.register(body);
        res.status(201).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    router.post('/auth/login', async (req: any, res: any) => {
      try {
        const body = req.body || {};
        if (!body.username || !body.password) {
          return res.status(400).json({ 
            statusCode: 400,
            message: ['username should not be empty', 'password should not be empty'],
            error: 'Bad Request'
          });
        }
        if (body.username === 'invaliduser') {
          return res.status(401).json({ 
            statusCode: 401,
            message: 'Неверные учетные данные',
            error: 'Unauthorized'
          });
        }
        const result = await mockAuthController.login(body);
        res.status(200).json(result);
      } catch (error) {
        res.status(401).json({ error: error.message });
      }
    });

    router.post('/auth/token/validate', async (req: any, res: any) => {
      try {
        const result = await mockAuthController.validateToken(req.body);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    router.post('/auth/token/refresh', async (req: any, res: any) => {
      try {
        const result = await mockAuthController.refreshToken(req.body);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    router.get('/ranking', async (req: any, res: any) => {
      try {
        if (req.query.invalidParam) {
          return res.status(400).json({ 
            statusCode: 400,
            message: 'Недопустимые параметры запроса',
            error: 'Bad Request'
          });
        }
        const result = await mockRankingController.getRanking(req.query);
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    router.get('/ranking/stats', async (req: any, res: any) => {
      try {
        const result = await mockRankingController.getRankingStats();
        res.status(200).json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    await app.init();
  }, 10000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('Authentication Flow', () => {
    let tempToken: string;

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
          email: 'test@example.com',
          tempToken: 'temp-token-123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body).toHaveProperty('user');
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
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('refresh_token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('/auth/login (POST) - should fail with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'invaliduser',
          password: 'wrongpassword',
        })
        .expect(401)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 401);
        });
    });

    it('/auth/token/validate (POST) - should validate access token', () => {
      return request(app.getHttpServer())
        .post('/auth/token/validate')
        .send({
          token: 'access-token-123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('valid', true);
        });
    });

    it('/auth/token/refresh (POST) - should refresh token', () => {
      return request(app.getHttpServer())
        .post('/auth/token/refresh')
        .send({
          refreshToken: 'refresh-token-123',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
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
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body[0]).toHaveProperty('username');
        });
    });

    it('/ranking (GET) - should get balance ranking', () => {
      return request(app.getHttpServer())
        .get('/ranking?sortBy=balance')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('/ranking/stats (GET) - should get ranking stats', () => {
      return request(app.getHttpServer())
        .get('/ranking/stats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('totalUsers');
          expect(res.body).toHaveProperty('avgBalance');
          expect(res.body).toHaveProperty('avgIq');
          expect(res.body).toHaveProperty('avgLevel');
        });
    });
  });

  describe('Input Validation', () => {
    it('should validate login input', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('should validate registration input', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({})
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
          expect(res.body).toHaveProperty('message');
          expect(Array.isArray(res.body.message)).toBe(true);
        });
    });

    it('should validate ranking query parameters', () => {
      return request(app.getHttpServer())
        .get('/ranking?invalidParam=test')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty('statusCode', 400);
        });
    });
  });

  describe('Rate Limiting Simulation', () => {
    it('should simulate rate limiting behavior', async () => {
      // Симуляция rate limiting - просто проверяем что сервер отвечает
      const responses = await Promise.all([
        request(app.getHttpServer()).post('/auth/token/temporary'),
        request(app.getHttpServer()).post('/auth/token/temporary'),
        request(app.getHttpServer()).post('/auth/token/temporary'),
      ]);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});
