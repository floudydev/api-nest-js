import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Token, TokenType } from './entities/token.entity';
import { User } from '../user/entities/user.entity';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(Token)
    private readonly tokenRepository: Repository<Token>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // Создание временного токена для регистрации
  async createTemporaryToken(): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setMinutes(
      expiresAt.getMinutes() + 
      parseInt(this.configService.get('TEMP_TOKEN_EXPIRATION', '10'))
    );

    await this.tokenRepository.save({
      token,
      type: TokenType.TEMPORARY,
      expiresAt,
    });

    return token;
  }

  // Создание JWT access токена
  async createAccessToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      username: user.username,
      type: 'access',
    };

    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
    });
  }

  // Создание refresh токена
  async createRefreshToken(user: User): Promise<string> {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 дней

    await this.tokenRepository.save({
      token,
      type: TokenType.REFRESH,
      userId: user.id,
      expiresAt,
    });

    return token;
  }

  // Валидация временного токена
  async validateTemporaryToken(token: string): Promise<boolean> {
    const tokenEntity = await this.tokenRepository.findOne({
      where: { 
        token, 
        type: TokenType.TEMPORARY,
        isActive: true,
        isUsed: false,
      },
    });

    if (!tokenEntity || tokenEntity.isExpired) {
      return false;
    }

    // Отмечаем токен как использованный
    await this.tokenRepository.update(tokenEntity.id, { isUsed: true });
    return true;
  }

  // Валидация refresh токена
  async validateRefreshToken(token: string): Promise<User | null> {
    const tokenEntity = await this.tokenRepository.findOne({
      where: { 
        token, 
        type: TokenType.REFRESH,
        isActive: true,
        isUsed: false,
      },
      relations: ['user'],
    });

    if (!tokenEntity || tokenEntity.isExpired) {
      return null;
    }

    return tokenEntity.user;
  }

  // Валидация access токена
  async validateAccessToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch (error) {
      throw new UnauthorizedException('Неверный токен');
    }
  }

  // Инвалидация refresh токена
  async invalidateRefreshToken(token: string): Promise<void> {
    await this.tokenRepository.update(
      { token, type: TokenType.REFRESH },
      { isActive: false }
    );
  }

  // Очистка истекших токенов
  async cleanupExpiredTokens(): Promise<void> {
    const { LessThan } = await import('typeorm');
    await this.tokenRepository.delete({
      expiresAt: LessThan(new Date()),
    });
  }

  // Проверка существования токена
  async tokenExists(token: string): Promise<boolean> {
    const count = await this.tokenRepository.count({
      where: { token, isActive: true },
    });
    return count > 0;
  }
}
