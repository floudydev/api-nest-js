import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { RankingService } from './ranking.service';
import { GetRankingDto, RankingType } from './dto/ranking.dto';

@Controller('ranking')
@UseGuards(ThrottlerGuard)
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  // Получение рейтинга
  @Get()
  async getRanking(@Query() getRankingDto: GetRankingDto) {
    return this.rankingService.getRanking(getRankingDto);
  }

  // Получение позиции пользователя
  @Get('user/:userId/position')
  async getUserPosition(
    @Param('userId') userId: string,
    @Query('type') type?: RankingType,
  ) {
    const position = await this.rankingService.getUserPosition(userId, type);
    return { userId, position, type: type || RankingType.RANKING };
  }

  // Получение статистики рейтинга
  @Get('stats')
  async getRankingStats() {
    return this.rankingService.getRankingStats();
  }
}
