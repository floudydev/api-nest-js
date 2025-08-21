import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UserService', () => {
  let service: UserService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    username: 'testuser',
    password: '$2b$12$hashedpassword',
    balance: 1000,
    iq: 120,
    level: 5,
    experience: 5000,
    gamesPlayed: 10,
    gamesWon: 7,
    isActive: true,
    isOnline: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      increment: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createUser', () => {
    it('should successfully create a new user', async () => {
      const username = 'newuser';
      const password = 'password123';
      const hashedPassword = '$2b$12$hashedpassword';

      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue(hashedPassword as never);

      repository.findOne.mockResolvedValue(null);
      repository.create.mockReturnValue(mockUser as any);
      repository.save.mockResolvedValue(mockUser as any);

      const result = await service.createUser(username, password);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { username } });
      expect(hashSpy).toHaveBeenCalledWith(password, 12);
      expect(repository.create).toHaveBeenCalledWith({
        username,
        password: hashedPassword,
      });
      expect(result).toEqual(mockUser);

      hashSpy.mockRestore();
    });

    it('should throw ConflictException if user already exists', async () => {
      const username = 'existinguser';
      const password = 'password123';

      repository.findOne.mockResolvedValue(mockUser as any);

      await expect(service.createUser(username, password)).rejects.toThrow(ConflictException);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { username } });
    });
  });

  describe('findByUsername', () => {
    it('should return user when found', async () => {
      const username = 'testuser';
      repository.findOne.mockResolvedValue(mockUser as any);

      const result = await service.findByUsername(username);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { username } });
      expect(result).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      const username = 'nonexistent';
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByUsername(username);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { username } });
      expect(result).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return true for valid password', async () => {
      const password = 'password123';
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.validatePassword(mockUser as any, password);

      expect(compareSpy).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toBe(true);

      compareSpy.mockRestore();
    });

    it('should return false for invalid password', async () => {
      const password = 'wrongpassword';
      const compareSpy = jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const result = await service.validatePassword(mockUser as any, password);

      expect(compareSpy).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toBe(false);

      compareSpy.mockRestore();
    });
  });

  describe('updateOnlineStatus', () => {
    it('should update user online status', async () => {
      const userId = mockUser.id;
      const isOnline = true;

      repository.update.mockResolvedValue({ affected: 1 } as any);

      await service.updateOnlineStatus(userId, isOnline);

      expect(repository.update).toHaveBeenCalledWith(userId, { isOnline });
    });
  });

  describe('updateBalance', () => {
    it('should update user balance', async () => {
      const userId = mockUser.id;
      const amount = 500;

      repository.increment.mockResolvedValue({ affected: 1 } as any);

      await service.updateBalance(userId, amount);

      expect(repository.increment).toHaveBeenCalledWith({ id: userId }, 'balance', amount);
    });
  });

  describe('getActiveUsers', () => {
    it('should return active users', async () => {
      const activeUsers = [mockUser];
      repository.find.mockResolvedValue(activeUsers as any);

      const result = await service.getActiveUsers();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isActive: true },
        select: ['id', 'username', 'isOnline', 'balance', 'iq', 'level'],
      });
      expect(result).toEqual(activeUsers);
    });
  });

  describe('getOnlineUsers', () => {
    it('should return online users', async () => {
      const onlineUsers = [{ ...mockUser, isOnline: true }];
      repository.find.mockResolvedValue(onlineUsers as any);

      const result = await service.getOnlineUsers();

      expect(repository.find).toHaveBeenCalledWith({
        where: { isOnline: true, isActive: true },
        select: ['id', 'username', 'balance', 'iq', 'level'],
      });
      expect(result).toEqual(onlineUsers);
    });
  });
});
