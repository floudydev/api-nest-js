import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RankingService } from './ranking.service';
import { User } from '../user/entities/user.entity';
import { RankingType } from './dto/ranking.dto';

describe('RankingService', () => {
  let service: RankingService;
  let repository: jest.Mocked<Repository<User>>;

  const mockUsers = [
    {
      id: '1',
      username: 'user1',
      balance: 1000,
      iq: 120,
      level: 5,
      experience: 5000,
      gamesPlayed: 10,
      gamesWon: 8,
      isOnline: true,
      isActive: true,
      createdAt: new Date(),
    },
    {
      id: '2',
      username: 'user2',
      balance: 800,
      iq: 110,
      level: 4,
      experience: 4000,
      gamesPlayed: 8,
      gamesWon: 5,
      isOnline: false,
      isActive: true,
      createdAt: new Date(),
    },
  ];

  beforeEach(async () => {
    const mockRepository = {
      createQueryBuilder: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockUsers),
        getRawOne: jest.fn(),
      })),
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RankingService,
        { provide: getRepositoryToken(User), useValue: mockRepository },
      ],
    }).compile();

    service = module.get<RankingService>(RankingService);
    repository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRanking', () => {
    it('should fetch and return ranking', async () => {
      const result = await service.getRanking({ type: RankingType.BALANCE });

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('position', 1);
      expect(result[0]).toHaveProperty('username', 'user1');
      expect(result[0]).toHaveProperty('balance', 1000);
      expect(result[0]).toHaveProperty('winRate');
      expect(result[0]).toHaveProperty('ranking');
    });

    it('should handle different ranking types', async () => {
      // Test IQ ranking
      await service.getRanking({ type: RankingType.IQ });
      expect(repository.createQueryBuilder).toHaveBeenCalled();

      // Test LEVEL ranking
      await service.getRanking({ type: RankingType.LEVEL });
      expect(repository.createQueryBuilder).toHaveBeenCalled();

      // Test WIN_RATE ranking
      await service.getRanking({ type: RankingType.WIN_RATE });
      expect(repository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getUserPosition', () => {
    it('should query and return position', async () => {
      repository.query.mockResolvedValue([{ position: 3 }]);

      const result = await service.getUserPosition('user1', RankingType.BALANCE);

      expect(result).toBe(3);
      expect(repository.query).toHaveBeenCalled();
    });

    it('should return null when user not found in ranking', async () => {
      repository.query.mockResolvedValue([]);

      const result = await service.getUserPosition('nonexistent', RankingType.BALANCE);

      expect(result).toBeNull();
    });
  });

  describe('getRankingStats', () => {
    it('should fetch and return stats', async () => {
      const mockStats = {
        totalUsers: '100',
        onlineUsers: '20',
        avgBalance: '750.5',
        maxBalance: '2000',
        avgIQ: '115.5',
        maxIQ: '150',
        avgLevel: '3.5',
        maxLevel: '10',
      };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue(mockStats),
      };

      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getRankingStats();

      expect(result).toEqual({
        totalUsers: 100,
        onlineUsers: 20,
        avgBalance: 750.5,
        maxBalance: 2000,
        avgIQ: 115.5,
        maxIQ: 150,
        avgLevel: 3.5,
        maxLevel: 10,
      });
    });
  });
});
