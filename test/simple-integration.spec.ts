import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '../src/user/user.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/user/entities/user.entity';
import * as bcrypt from 'bcrypt';

describe('API Gateway - Working Integration Tests', () => {
  let userService: UserService;

  const mockUserRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    increment: jest.fn().mockResolvedValue({ affected: 1 }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    userService = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UserService', () => {
    it('should create a new user', async () => {
      const mockUser = {
        id: 1,
        username: 'newuser',
        password: 'hashed-password',
        email: null,
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

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      const result = await userService.createUser('newuser', 'password123');

      expect(result).toMatchObject({
        username: 'newuser',
        balance: 1000,
        iq: 120,
        level: 1,
        isActive: true,
      });
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
    });

    it('should find user by username', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashed-password',
        email: null,
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

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findByUsername('testuser');

      expect(result).toMatchObject({
        username: 'testuser',
        balance: 1000,
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { username: 'testuser' },
      });
    });

    it('should find user by id', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashed-password',
        email: null,
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

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findById('1');

      expect(result).toMatchObject({
        username: 'testuser',
        id: 1,
      });
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should update online status', async () => {
      await userService.updateOnlineStatus('1', true);

      expect(mockUserRepository.update).toHaveBeenCalledWith('1', { isOnline: true });
    });

    it('should update user balance', async () => {
      await userService.updateBalance('1', 1500);

      expect(mockUserRepository.increment).toHaveBeenCalledWith({ id: '1' }, 'balance', 1500);
    });

    it('should update user experience', async () => {
      // Mock найти пользователя
      const mockUser = {
        id: '1',
        experience: 100,
      };
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await userService.updateExperience('1', 500);

      expect(mockUserRepository.update).toHaveBeenCalledWith('1', { 
        experience: 600, 
        level: 0 
      });
    });

    it('should handle user creation conflict', async () => {
      const existingUser = {
        id: 1,
        username: 'existinguser',
        password: 'hashed-password',
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(userService.createUser('existinguser', 'password123'))
        .rejects
        .toThrow('Пользователь с таким именем уже существует');

      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('should return null for non-existent user', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await userService.findByUsername('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('Service Integration Scenarios', () => {
    it('should complete user creation flow', async () => {
      // 1. Check user doesn't exist
      mockUserRepository.findOne.mockResolvedValue(null);

      // 2. Create user
      const mockUser = {
        id: 1,
        username: 'testuser',
        password: 'hashed-password',
        email: null,
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

      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      const newUser = await userService.createUser('testuser', 'password123');
      expect(newUser.username).toBe('testuser');
      expect(newUser.isActive).toBe(true);

      // 3. Update online status
      await userService.updateOnlineStatus(newUser.id.toString(), true);

      // 4. Update balance (uses increment, not update)
      await userService.updateBalance(newUser.id.toString(), 1500);

      // 5. Update experience (calls findById first, then update)
      mockUserRepository.findOne.mockResolvedValueOnce({
        id: newUser.id,
        experience: 0,
      });
      await userService.updateExperience(newUser.id.toString(), 250);

      // Verify all operations
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mockUserRepository.update).toHaveBeenCalledTimes(2); // onlineStatus + experience
      expect(mockUserRepository.increment).toHaveBeenCalledTimes(1); // balance
    });

    it('should handle user lookup after creation', async () => {
      const mockUser = {
        id: 1,
        username: 'lookupuser',
        password: 'hashed-password',
        email: null,
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

      // Mock creation first
      mockUserRepository.findOne.mockResolvedValueOnce(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);

      // Create user
      await userService.createUser('lookupuser', 'password123');

      // Mock finding the user
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      // Find by username
      const foundByUsername = await userService.findByUsername('lookupuser');
      expect(foundByUsername).toMatchObject({ username: 'lookupuser' });

      // Find by id
      const foundById = await userService.findById('1');
      expect(foundById).toMatchObject({ id: 1, username: 'lookupuser' });
    });
  });
});
