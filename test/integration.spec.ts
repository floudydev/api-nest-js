import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { UserService } from '../src/user/user.service';
import { RankingService } from '../src/ranking/ranking.service';
import { TokenService } from '../src/token/token.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/entities/user.entity';
import { Token } from '../src/token/entities/token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RankingType } from '../src/ranking/dto/ranking.dto';
import * as bcrypt from 'bcrypt';

describe('API Gateway Integration Tests - Fixed', () => {
  let authService: AuthService;
  let userService: UserService;
  let rankingService: RankingService;
  let tokenService: TokenService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
    increment: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        { id: '1', username: 'user1', balance: 2000, iq: 150, level: 2 },
        { id: '2', username: 'user2', balance: 1500, iq: 130, level: 2 },
        { id: '3', username: 'user3', balance: 1000, iq: 120, level: 1 },
      ]),
      getRawOne: jest.fn().mockResolvedValue({
        totalUsers: 100,
        avgBalance: 1250,
        avgIQ: 125,
        avgLevel: 1.5,
        maxBalance: 2000,
        maxIQ: 150,
        maxLevel: 2,
        onlineUsers: 50,
      }),
    })),
  };

  const mockTokenRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn().mockResolvedValue(0), // Mock для tokenExists
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        JWT_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
        TEMP_TOKEN_EXPIRATION: '10',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UserService,
        RankingService,
        TokenService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Token),
          useValue: mockTokenRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    rankingService = module.get<RankingService>(RankingService);
    tokenService = module.get<TokenService>(TokenService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('AuthService Integration', () => {
    it('should create a temporary token', async () => {
      // Mock создания токена
      mockTokenRepository.save.mockResolvedValue({
        id: 1,
        token: 'temp-token-123',
        type: 'temporary',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        createdAt: new Date(),
      });

      const result = await authService.getTemporaryToken();

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresIn', '10 минут');
      expect(mockTokenRepository.save).toHaveBeenCalled();
    });

    it('should register a new user with valid temporary token', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: 'hashed-password',
        email: 'test@example.com',
        balance: 1000,
        iq: 120,
        level: 1,
        experience: 0,
        isActive: true,
        isOnline: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = {
        id: 1,
        token: 'temp-token-123',
        type: 'temporary' as any,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        createdAt: new Date(),
      };

      // Mock проверки токена
      mockTokenRepository.findOne.mockResolvedValue(mockToken);
      // Mock создания пользователя
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      // Mock хеширования пароля
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      const registerDto = {
        username: 'testuser',
        password: 'password123',
        registrationToken: 'temp-token-123',
      };

      const result = await authService.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it('should login with valid credentials', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: 'hashed-password',
        email: 'test@example.com',
        balance: 1000,
        iq: 120,
        level: 1,
        experience: 0,
        isActive: true,
        isOnline: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock поиска пользователя и проверки пароля
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const result = await authService.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should validate a token', async () => {
      // Mock JWT verify to throw an error (invalid token)
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const validateDto = {
        token: 'valid-token',
      };

      const result = await authService.validateToken(validateDto);

      expect(result).toHaveProperty('isValid', false);
      expect(mockJwtService.verify).toHaveBeenCalledWith('valid-token', {
        secret: 'test-secret',
      });
    });
  });

  describe('RankingService Integration', () => {
    it('should get ranking stats', async () => {
      const result = await rankingService.getRankingStats();

      expect(result).toHaveProperty('totalUsers');
      expect(result).toHaveProperty('avgBalance');
      expect(result).toHaveProperty('avgIQ');
      expect(result).toHaveProperty('avgLevel');
      expect(typeof result.totalUsers).toBe('number');
    });

    it('should get ranking by balance', async () => {
      const result = await rankingService.getRanking({ type: RankingType.BALANCE });

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('username');
        expect(result[0]).toHaveProperty('balance');
      }
    });
  });

  describe('Service Integration Flow', () => {
    it('should complete full registration flow', async () => {
      // 1. Create temporary token
      mockTokenRepository.save.mockResolvedValue({
        id: 1,
        token: 'temp-token-123',
        type: 'temporary',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        createdAt: new Date(),
      });

      const tempTokenResult = await authService.getTemporaryToken();
      expect(tempTokenResult).toHaveProperty('token');

      // 2. Register user with temporary token
      const mockUser = {
        id: '1',
        username: 'testuser',
        password: 'hashed-password',
        email: 'test@example.com',
        balance: 1000,
        iq: 120,
        level: 1,
        experience: 0,
        isActive: true,
        isOnline: false,
        lastLoginAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockToken = {
        id: 1,
        token: 'temp-token-123',
        type: 'temporary' as any,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        isUsed: false,
        createdAt: new Date(),
      };

      mockTokenRepository.findOne.mockResolvedValue(mockToken);
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      const registerResult = await authService.register({
        username: 'testuser',
        password: 'password123',
        registrationToken: tempTokenResult.token,
      });

      expect(registerResult).toHaveProperty('accessToken');
      expect(registerResult).toHaveProperty('user');

      // 3. Login with registered user
      mockUserRepository.findOne.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const loginResult = await authService.login({
        username: 'testuser',
        password: 'password123',
      });

      expect(loginResult).toHaveProperty('accessToken');
      expect(loginResult).toHaveProperty('user');
    });
  });
});
