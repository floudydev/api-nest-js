import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';

export enum RankingType {
  BALANCE = 'balance',
  IQ = 'iq',
  LEVEL = 'level',
  WIN_RATE = 'winRate',
  RANKING = 'ranking',
}

export class GetRankingDto {
  @IsOptional()
  @IsEnum(RankingType)
  type?: RankingType = RankingType.RANKING;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}
