import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { TokenService } from '../token/token.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('AuthService', () => {
  let service: AuthService;
  let userService: jest.Mocked<UserService>;
  let tokenService: jest.Mocked<TokenService>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password: '$2b$12$hashedpassword',
    balance: 1000,
    iq: 120,
    level: 5,
    isActive: true,
    isOnline: false,
  };

  beforeEach(async () => {
    const mockUserService = {
      findByUsername: jest.fn(),
      validatePassword: jest.fn(),
      updateOnlineStatus: jest.fn(),
      createUser: jest.fn(),
      findById: jest.fn(),
    };

    const mockTokenService = {
      createAccessToken: jest.fn(),
      createRefreshToken: jest.fn(),
      validateTemporaryToken: jest.fn(),
      validateRefreshToken: jest.fn(),
      validateAccessToken: jest.fn(),
      invalidateRefreshToken: jest.fn(),
      createTemporaryToken: jest.fn(),
      tokenExists: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserService, useValue: mockUserService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userService = module.get(UserService);
    tokenService = module.get(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = { username: 'testuser', password: 'password123' };
      
      userService.findByUsername.mockResolvedValue(mockUser as any);
      userService.validatePassword.mockResolvedValue(true);
      tokenService.createAccessToken.mockResolvedValue('access_token');
      tokenService.createRefreshToken.mockResolvedValue('refresh_token');
      userService.updateOnlineStatus.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
      expect(result.user).not.toHaveProperty('password');
      expect(userService.updateOnlineStatus).toHaveBeenCalledWith(mockUser.id, true);
    });

    it('should throw UnauthorizedException for invalid username', async () => {
      const loginDto = { username: 'invaliduser', password: 'password123' };
      
      userService.findByUsername.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const loginDto = { username: 'testuser', password: 'wrongpassword' };
      
      userService.findByUsername.mockResolvedValue(mockUser as any);
      userService.validatePassword.mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const loginDto = { username: 'testuser', password: 'password123' };
      const inactiveUser = { ...mockUser, isActive: false };
      
      userService.findByUsername.mockResolvedValue(inactiveUser as any);
      userService.validatePassword.mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should successfully register with valid token', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
        registrationToken: 'valid_token',
      };

      tokenService.validateTemporaryToken.mockResolvedValue(true);
      userService.createUser.mockResolvedValue(mockUser as any);
      tokenService.createAccessToken.mockResolvedValue('access_token');
      tokenService.createRefreshToken.mockResolvedValue('refresh_token');
      userService.updateOnlineStatus.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access_token');
      expect(result).toHaveProperty('refreshToken', 'refresh_token');
    });

    it('should throw BadRequestException for invalid token', async () => {
      const registerDto = {
        username: 'newuser',
        password: 'password123',
        registrationToken: 'invalid_token',
      };

      tokenService.validateTemporaryToken.mockResolvedValue(false);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTemporaryToken', () => {
    it('should create and return temporary token', async () => {
      const token = 'temp_token_123';
      tokenService.createTemporaryToken.mockResolvedValue(token);

      const result = await service.getTemporaryToken();

      expect(result).toEqual({
        token,
        expiresIn: '10 минут',
      });
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh token with valid credentials', async () => {
      const refreshDto = {
        refreshToken: 'valid_refresh_token',
        password: 'password123',
      };

      tokenService.validateRefreshToken.mockResolvedValue(mockUser as any);
      userService.validatePassword.mockResolvedValue(true);
      tokenService.invalidateRefreshToken.mockResolvedValue(undefined);
      tokenService.createAccessToken.mockResolvedValue('new_access_token');
      tokenService.createRefreshToken.mockResolvedValue('new_refresh_token');

      const result = await service.refreshToken(refreshDto);

      expect(result).toEqual({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });
      expect(tokenService.invalidateRefreshToken).toHaveBeenCalledWith(refreshDto.refreshToken);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshDto = {
        refreshToken: 'invalid_refresh_token',
        password: 'password123',
      };

      tokenService.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refreshToken(refreshDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateToken', () => {
    it('should validate access token successfully', async () => {
      const validateDto = { token: 'valid_access_token' };
      const payload = { sub: mockUser.id, username: mockUser.username };

      tokenService.validateAccessToken.mockResolvedValue(payload);
      userService.findById.mockResolvedValue(mockUser as any);

      const result = await service.validateToken(validateDto);

      expect(result.isValid).toBe(true);
      expect(result.user).toHaveProperty('id', mockUser.id);
      expect(result.user).toHaveProperty('username', mockUser.username);
    });

    it('should return false for invalid access token', async () => {
      const validateDto = { token: 'invalid_token' };

      tokenService.validateAccessToken.mockRejectedValue(new Error('Invalid token'));
      tokenService.tokenExists.mockResolvedValue(false);

      const result = await service.validateToken(validateDto);

      expect(result.isValid).toBe(false);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      const userId = mockUser.id;
      const refreshToken = 'refresh_token';

      userService.updateOnlineStatus.mockResolvedValue(undefined);
      tokenService.invalidateRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout(userId, refreshToken);

      expect(result.message).toBe('Успешный выход из системы');
      expect(userService.updateOnlineStatus).toHaveBeenCalledWith(userId, false);
      expect(tokenService.invalidateRefreshToken).toHaveBeenCalledWith(refreshToken);
    });
  });
});
