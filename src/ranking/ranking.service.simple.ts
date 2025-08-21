import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entities/user.entity';
import { GetRankingDto, RankingType } from './dto/ranking.dto';

@Injectable()
export class RankingService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // Получение топа пользователей
  async getRanking(getRankingDto: GetRankingDto) {
    const { type = RankingType.RANKING, limit = 10, offset = 0 } = getRankingDto;

    let orderBy: string;
    let orderDirection: 'ASC' | 'DESC' = 'DESC';

    // Определяем поле для сортировки
    switch (type) {
      case RankingType.BALANCE:
        orderBy = 'balance';
        break;
      case RankingType.IQ:
        orderBy = 'iq';
        break;
      case RankingType.LEVEL:
        orderBy = 'level';
        break;
      case RankingType.WIN_RATE:
        // Для win rate нужен специальный запрос
        orderBy = '(CASE WHEN "gamesPlayed" > 0 THEN ("gamesWon"::float / "gamesPlayed"::float) * 100 ELSE 0 END)';
        break;
      case RankingType.RANKING:
      default:
        // Комплексный рейтинг
        orderBy = '("balance" * 0.4 + "iq" * 0.3 + "level" * 0.2 + (CASE WHEN "gamesPlayed" > 0 THEN ("gamesWon"::float / "gamesPlayed"::float) * 100 * 0.1 ELSE 0 END))';
        break;
    }

    const query = this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.username',
        'user.balance',
        'user.iq',
        'user.level',
        'user.experience',
        'user.gamesPlayed',
        'user.gamesWon',
        'user.isOnline',
      ])
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy(orderBy, orderDirection)
      .addOrderBy('user.createdAt', 'ASC') // Дополнительная сортировка для стабильности
      .limit(limit)
      .offset(offset);

    const users = await query.getMany();

    // Добавляем вычисляемые поля
    const ranking = users.map((user, index) => ({
      position: offset + index + 1,
      id: user.id,
      username: user.username,
      balance: parseFloat(user.balance.toString()),
      iq: user.iq,
      level: user.level,
      experience: user.experience,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      winRate: user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed) * 100 : 0,
      ranking: user.balance * 0.4 + user.iq * 0.3 + user.level * 0.2 + 
               (user.gamesPlayed > 0 ? (user.gamesWon / user.gamesPlayed) * 100 * 0.1 : 0),
      isOnline: user.isOnline,
    }));

    return ranking;
  }

  // Получение позиции конкретного пользователя в рейтинге
  async getUserPosition(userId: string, type: RankingType = RankingType.RANKING): Promise<number> {
    let orderBy: string;

    switch (type) {
      case RankingType.BALANCE:
        orderBy = 'balance';
        break;
      case RankingType.IQ:
        orderBy = 'iq';
        break;
      case RankingType.LEVEL:
        orderBy = 'level';
        break;
      case RankingType.WIN_RATE:
        orderBy = '(CASE WHEN "gamesPlayed" > 0 THEN ("gamesWon"::float / "gamesPlayed"::float) * 100 ELSE 0 END)';
        break;
      case RankingType.RANKING:
      default:
        orderBy = '("balance" * 0.4 + "iq" * 0.3 + "level" * 0.2 + (CASE WHEN "gamesPlayed" > 0 THEN ("gamesWon"::float / "gamesPlayed"::float) * 100 * 0.1 ELSE 0 END))';
        break;
    }

    const query = `
      SELECT position FROM (
        SELECT 
          id,
          ROW_NUMBER() OVER (ORDER BY ${orderBy} DESC, "createdAt" ASC) as position
        FROM users 
        WHERE "isActive" = true
      ) ranked
      WHERE id = $1
    `;

    const result = await this.userRepository.query(query, [userId]);
    const position = result.length > 0 ? result[0].position : null;

    return position;
  }

  // Получение статистики рейтинга
  async getRankingStats() {
    const stats = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'COUNT(*) as totalUsers',
        'COUNT(CASE WHEN "isOnline" = true THEN 1 END) as onlineUsers',
        'AVG("balance") as avgBalance',
        'MAX("balance") as maxBalance',
        'AVG("iq") as avgIQ',
        'MAX("iq") as maxIQ',
        'AVG("level") as avgLevel',
        'MAX("level") as maxLevel',
      ])
      .where('isActive = :isActive', { isActive: true })
      .getRawOne();

    const result = {
      totalUsers: parseInt(stats.totalUsers),
      onlineUsers: parseInt(stats.onlineUsers),
      avgBalance: parseFloat(stats.avgBalance || 0),
      maxBalance: parseFloat(stats.maxBalance || 0),
      avgIQ: parseFloat(stats.avgIQ || 0),
      maxIQ: parseInt(stats.maxIQ || 0),
      avgLevel: parseFloat(stats.avgLevel || 0),
      maxLevel: parseInt(stats.maxLevel || 0),
    };

    return result;
  }
}
